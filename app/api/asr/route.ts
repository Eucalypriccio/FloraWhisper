import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // ASR 需要较长时间：录音 + 识别 + 网络延迟

type AsrResponse = {
	text: string;
};

function sanitizeTranscript(text: string): string {
	let t = (text ?? '').trim();
	// Strip wrapping quotes that sometimes appear in ASR output
	if (
		(t.startsWith('"') && t.endsWith('"')) ||
		(t.startsWith('“') && t.endsWith('”'))
	) {
		t = t.slice(1, -1).trim();
	}
	if (t === '录音结束' || t === '结束录音' || t === '停止录音') return '';
	return t;
}

function isLikelyPixiAvailableErrorMessage(stderr: string) {
	return (
		stderr.includes('ModuleNotFoundError') &&
		(stderr.includes("No module named 'dashscope'") ||
			stderr.includes('No module named "dashscope"'))
	);
}

function runPythonAsrFromBase64Pcm(args: {
	scriptPath: string;
	pcm16Base64: string;
	sampleRate: number;
	chunkMs?: number;
}): Promise<string> {
	return new Promise((resolve, reject) => {
		const scriptsDir = path.join(process.cwd(), 'scripts');
		const usePixi = (process.env.TTS_USE_PIXI ?? '1') !== '0';
		const pythonCmd = process.env.PYTHON ?? 'python';

		const argv = [
			args.scriptPath,
			'--sample-rate',
			String(args.sampleRate),
			'--chunk-ms',
			String(args.chunkMs ?? 100),
		];

		const child = usePixi
			? spawn('pixi', ['run', 'python', ...argv], {
				cwd: scriptsDir,
				env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
				stdio: ['pipe', 'pipe', 'pipe'],
				windowsHide: true,
			})
			: spawn(pythonCmd, argv, {
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
			if (code === 0) {
				const lines = stdout.trim().split('\n');
				const resultText = lines[lines.length - 1] || '';
				return resolve(resultText.trim());
			}

			if (usePixi && isLikelyPixiAvailableErrorMessage(stderr)) {
				reject(
					new Error(
						`Python (pixi env) is missing dependencies.\n\nRun: cd scripts && pixi install\n\nOriginal stderr:\n${stderr || '(no stderr)'}\n${stdout || '(no stdout)'}`
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

		// Write base64 PCM to stdin
		try {
			child.stdin.write(args.pcm16Base64);
			child.stdin.end();
		} catch {
			// If stdin fails, the process will likely exit; keep stderr for debugging.
		}
	});
}

export async function POST(req: Request) {
	try {
		const body = (await req.json().catch(() => null)) as
			| { duration?: unknown; pcm16Base64?: unknown; sampleRate?: unknown; chunkMs?: unknown }
			| null;

		const pcm16Base64 =
			typeof body?.pcm16Base64 === 'string' ? body.pcm16Base64 : null;
		const sampleRate =
			typeof body?.sampleRate === 'number' && Number.isFinite(body.sampleRate)
				? body.sampleRate
				: 16000;
		const chunkMs =
			typeof body?.chunkMs === 'number' && Number.isFinite(body.chunkMs)
				? body.chunkMs
				: 100;

		if (!pcm16Base64) {
			return NextResponse.json(
				{ error: 'Missing pcm16Base64 (browser-recorded audio required)' },
				{ status: 400 }
			);
		}

		const scriptPath = path.join(
			process.cwd(),
			'scripts',
			'qwen_asr_from_stdin.py'
		);
		const recognizedText = await runPythonAsrFromBase64Pcm({
			scriptPath,
			pcm16Base64,
			sampleRate,
			chunkMs,
		});

		const sanitized = sanitizeTranscript(recognizedText);
		// Server terminal logs (helpful for debugging ASR accuracy / empty results)
		console.log(
			`[ASR] Recognition completed: ${JSON.stringify(sanitized || '')}`
		);
		if (!sanitized) {
			console.log(
				`[ASR] (raw) ${JSON.stringify((recognizedText ?? '').trim())}`
			);
		}

		const response: AsrResponse = {
			text: sanitized,
		};

		return NextResponse.json(response);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
