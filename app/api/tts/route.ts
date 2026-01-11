import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { qwenChat } from '@/lib/llm/qwenClient';
import {
	buildGaiaChatMessagesMultiTurn,
} from '@/lib/llm/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TtsResponse = {
	url: string;
	text: string;
	format: 'wav';
	sampleRate: 24000;
	channels: 1;
};

const MAX_HISTORY_MESSAGES = 24;

function isLikelyPixiAvailableErrorMessage(stderr: string) {
	return (
		stderr.includes('ModuleNotFoundError') &&
		(stderr.includes("No module named 'dashscope'") ||
			stderr.includes('No module named \\"dashscope\\"'))
	);
}

function runPythonToGenerateWav(args: {
	scriptPath: string;
	outputWavPath: string;
	textFilePath: string;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const scriptsDir = path.join(process.cwd(), 'scripts');
		const usePixi = (process.env.TTS_USE_PIXI ?? '1') !== '0';
		const pythonCmd = process.env.PYTHON ?? 'python';

		const child = usePixi
			? spawn(
					'pixi',
					[
						'run',
						'python',
						args.scriptPath,
						args.outputWavPath,
						args.textFilePath,
					],
					{
						cwd: scriptsDir,
						env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
						stdio: ['pipe', 'pipe', 'pipe'],
						windowsHide: true,
					}
				)
			: spawn(
					pythonCmd,
					[args.scriptPath, args.outputWavPath, args.textFilePath],
					{
					cwd: process.cwd(),
					env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
					stdio: ['pipe', 'pipe', 'pipe'],
					windowsHide: true,
				}
				);

		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (buf) => {
			stdout += buf.toString();
		});
		child.stderr.on('data', (buf) => {
			stderr += buf.toString();
		});

		child.on('error', (err) => {
			reject(
				new Error(
					usePixi
						? `Failed to start pixi. ${err.message}\n\nMake sure pixi is installed and on PATH.\nOr set TTS_USE_PIXI=0 to use plain python.\n${stderr}\n${stdout}`
						: `Failed to start python (${pythonCmd}). ${err.message}\n${stderr}\n${stdout}`
				)
			);
		});

		child.on('close', (code) => {
			if (code === 0) return resolve();

			if (usePixi && isLikelyPixiAvailableErrorMessage(stderr)) {
				reject(
					new Error(
						`Python (pixi env) is missing dashscope.\n\nRun: cd scripts && pixi install\n\nOriginal stderr:\n${stderr || '(no stderr)'}\n${stdout || '(no stdout)'}`
					)
				);
				return;
			}

			reject(
				new Error(
					usePixi
						? `pixi run python exited with code ${code}.\n${stderr || '(no stderr)'}\n${stdout || '(no stdout)'}`
						: `Python exited with code ${code}.\n${stderr || '(no stderr)'}\n${stdout || '(no stdout)'}`
				)
			);
		});
	});
}

/**
 * 清理超过指定时间的旧 WAV 文件（避免磁盘空间累积）
 * @param dirPath - 目录路径
 * @param maxAgeMs - 最大文件年龄（毫秒）
 */
async function cleanupOldFiles(dirPath: string, maxAgeMs: number) {
	try {
		const files = await fs.readdir(dirPath);
		const now = Date.now();

		for (const file of files) {
			if (!file.endsWith('.wav')) continue;

			const filePath = path.join(dirPath, file);
			const stat = await fs.stat(filePath).catch(() => null);
			if (!stat) continue;

			const age = now - stat.mtimeMs;
			if (age > maxAgeMs) {
				await fs.unlink(filePath).catch(() => undefined);
			}
		}
	} catch {
		// 清理失败不影响主流程
	}
}

export async function POST(req: Request) {
	try {
		const body = (await req.json().catch(() => null)) as
			| { text?: unknown; messages?: unknown }
			| null;

		const userText = typeof body?.text === 'string' ? body.text.trim() : '';
		if (!userText) {
			return NextResponse.json(
				{ error: 'Missing text' },
				{ status: 400 }
			);
		}

		// 解析消息历史（可选）
		const messagesHistoryRaw = Array.isArray(body?.messages)
			? body.messages
					.filter(
						(msg): msg is { role: 'user' | 'assistant'; text: string } =>
							msg &&
							typeof msg === 'object' &&
							(msg.role === 'user' || msg.role === 'assistant') &&
							typeof msg.text === 'string'
					)
					.map((msg) => ({
						role: msg.role,
						content: msg.text,
					}))
			: [];

		const messagesHistory =
			messagesHistoryRaw.length > MAX_HISTORY_MESSAGES
				? messagesHistoryRaw.slice(-MAX_HISTORY_MESSAGES)
				: messagesHistoryRaw;

		// 永远使用多轮构建函数（history 为空也可正常工作）
		const assistantText = await qwenChat({
			model: 'qwen3-max',
			messages: buildGaiaChatMessagesMultiTurn(messagesHistory, userText),
		});

		const id = crypto.randomUUID();

		// 使用系统临时目录存储中间文件，更安全
		const tempDir = path.join(os.tmpdir(), 'florawhisper-tts');
		await fs.mkdir(tempDir, { recursive: true });

		// WAV 文件仍然存储在 public/tts 供前端访问
		const publicTtsDir = path.join(process.cwd(), 'public', 'tts');
		await fs.mkdir(publicTtsDir, { recursive: true });

		// 定期清理超过 1 小时的旧 WAV 文件（避免磁盘累积）
		void cleanupOldFiles(publicTtsDir, 60 * 60 * 1000);

		const outputWavPath = path.join(publicTtsDir, `${id}.wav`);
		// 文本文件存储在系统临时目录，不暴露在 public 中
		const textFilePath = path.join(tempDir, `${id}.txt`);
		const scriptPath = path.join(
			process.cwd(),
			'scripts',
			'qwen_realtime_tts_to_wav.py'
		);

		await fs.writeFile(textFilePath, assistantText, 'utf8');
		try {
			await runPythonToGenerateWav({
				scriptPath,
				outputWavPath,
				textFilePath,
			});
		} finally {
			// Best-effort cleanup (avoid leaving conversation text on disk)
			await fs.unlink(textFilePath).catch(() => undefined);
		}

		const response: TtsResponse = {
			url: `/tts/${id}.wav`,
			text: assistantText,
			format: 'wav',
			sampleRate: 24000,
			channels: 1,
		};

		return NextResponse.json(response);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
