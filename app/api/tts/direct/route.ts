import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DirectTtsResponse = {
	url: string;
	text: string;
	format: 'wav';
	sampleRate: 24000;
	channels: 1;
};

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
			: spawn(pythonCmd, [args.scriptPath, args.outputWavPath, args.textFilePath], {
					cwd: process.cwd(),
					env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
					stdio: ['pipe', 'pipe', 'pipe'],
					windowsHide: true,
			  });

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
		// ignore
	}
}

export async function POST(req: Request) {
	try {
		const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
		const text = typeof body?.text === 'string' ? body.text.trim() : '';
		if (!text) {
			return NextResponse.json({ error: 'Missing text' }, { status: 400 });
		}

		const id = crypto.randomUUID();
		const tempDir = path.join(os.tmpdir(), 'florawhisper-tts');
		await fs.mkdir(tempDir, { recursive: true });

		const publicTtsDir = path.join(process.cwd(), 'public', 'tts');
		await fs.mkdir(publicTtsDir, { recursive: true });
		void cleanupOldFiles(publicTtsDir, 60 * 60 * 1000);

		const outputWavPath = path.join(publicTtsDir, `${id}.wav`);
		const textFilePath = path.join(tempDir, `${id}.txt`);
		const scriptPath = path.join(process.cwd(), 'scripts', 'qwen_realtime_tts_to_wav.py');

		await fs.writeFile(textFilePath, text, 'utf8');
		try {
			await runPythonToGenerateWav({ scriptPath, outputWavPath, textFilePath });
		} finally {
			await fs.unlink(textFilePath).catch(() => undefined);
		}

		const response: DirectTtsResponse = {
			url: `/tts/${id}.wav`,
			text,
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
