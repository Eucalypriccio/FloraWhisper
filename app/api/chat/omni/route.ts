import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { GAIA_OMNI_CHAT_SYSTEM_PROMPT } from '@/lib/llm/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OmniTextPart = { type: 'text'; text: string };
type OmniImagePart = { type: 'image_url'; image_url: { url: string } };
type OmniPart = OmniTextPart | OmniImagePart;

type OmniApiMessage = {
	role: 'user' | 'assistant' | 'system';
	content: OmniPart[];
};

type OmniChatResponse = {
	text: string;
	usage?: unknown;
};

const MAX_OMNI_MESSAGES = 12;
const MAX_TEXT_PART_CHARS = 1200;

function isLikelyPixiAvailableErrorMessage(stderr: string) {
	return (
		stderr.includes('ModuleNotFoundError') &&
		(stderr.includes("No module named 'openai'") ||
			stderr.includes('No module named \\\"openai\\\"'))
	);
}

function sanitizeMessages(raw: unknown): OmniApiMessage[] {
	if (!Array.isArray(raw)) return [];

	const msgs = raw
		.filter((m): m is { role: string; content: unknown } => !!m && typeof m === 'object')
		.map((m) => {
			const role = (m as { role?: unknown }).role;
			const content = (m as { content?: unknown }).content;
			if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
			if (!Array.isArray(content)) return null;

			const parts: OmniPart[] = content
				.map((p) => {
					if (!p || typeof p !== 'object') return null;
					const type = (p as { type?: unknown }).type;
					if (type === 'text') {
						const text = (p as { text?: unknown }).text;
						if (typeof text !== 'string') return null;
						const trimmed = text.length > MAX_TEXT_PART_CHARS ? `${text.slice(0, MAX_TEXT_PART_CHARS)}…` : text;
						return { type: 'text', text: trimmed };
					}
					if (type === 'image_url') {
						const url = (p as { image_url?: { url?: unknown } }).image_url?.url;
						if (typeof url !== 'string' || !url) return null;
						return { type: 'image_url', image_url: { url } };
					}
					return null;
				})
				.filter((x): x is OmniPart => x !== null);

			if (parts.length === 0) return null;
			return { role, content: parts } as OmniApiMessage;
		})
		.filter((x): x is OmniApiMessage => x !== null);

	return msgs.length > MAX_OMNI_MESSAGES ? msgs.slice(-MAX_OMNI_MESSAGES) : msgs;
}

function buildOmniMessagesWithSystem(history: OmniApiMessage[]): OmniApiMessage[] {
	const filtered = (history ?? []).filter((m) => m.role !== 'system');
	const clipped =
		filtered.length > MAX_OMNI_MESSAGES
			? filtered.slice(-MAX_OMNI_MESSAGES)
			: filtered;

	return [
		{ role: 'system', content: [{ type: 'text', text: GAIA_OMNI_CHAT_SYSTEM_PROMPT }] },
		...clipped,
	];
}

function runPythonOmniChat(args: {
	scriptPath: string;
	payload: { model?: string; base_url?: string; messages: OmniApiMessage[] };
}): Promise<OmniChatResponse> {
	return new Promise((resolve, reject) => {
		const scriptsDir = path.join(process.cwd(), 'scripts');
		const usePixi = (process.env.TTS_USE_PIXI ?? '1') !== '0';
		const pythonCmd = process.env.PYTHON ?? 'python';

		const argv = [args.scriptPath];

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
			if (code !== 0) {
				if (usePixi && isLikelyPixiAvailableErrorMessage(stderr)) {
					reject(
						new Error(
							`Python (pixi env) is missing openai.\n\nRun: cd scripts && pixi install\n\nOriginal stderr:\n${stderr || '(no stderr)'}\n${stdout || '(no stdout)'}`
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
				return;
			}

			const lines = stdout
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean);
			const last = lines[lines.length - 1] ?? '';
			try {
				const parsed = JSON.parse(last) as OmniChatResponse & { error?: string };
				if (parsed?.error) return reject(new Error(parsed.error));
				if (!parsed?.text || typeof parsed.text !== 'string') {
					return reject(new Error('Omni response missing text'));
				}
				return resolve({ text: parsed.text, usage: parsed.usage });
			} catch {
				return reject(new Error(`Failed to parse omni output.\n${stderr || ''}\n${stdout || ''}`));
			}
		});

		try {
			child.stdin.write(JSON.stringify(args.payload));
			child.stdin.end();
		} catch {
			// ignore
		}
	});
}

export async function POST(req: Request) {
	try {
		const body = (await req.json().catch(() => null)) as
			| { messages?: unknown; model?: unknown; base_url?: unknown }
			| null;

		const messages = sanitizeMessages(body?.messages);
		if (messages.length === 0) {
			return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
		}

		const messagesWithSystem = buildOmniMessagesWithSystem(messages);

		const model = typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : undefined;
		const base_url = typeof body?.base_url === 'string' && body.base_url.trim() ? body.base_url.trim() : undefined;

		const scriptPath = path.join(process.cwd(), 'scripts', 'qwen3_omni_chat_from_stdin.py');
		const out = await runPythonOmniChat({
			scriptPath,
			payload: { model, base_url, messages: messagesWithSystem },
		});

		return NextResponse.json(out);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
