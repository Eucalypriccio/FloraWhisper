export type QwenMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export type QwenChatOptions = {
	messages: QwenMessage[];
	model?: string;
	apiKey?: string;
	baseUrl?: string;
	timeoutMs?: number;
};

type QwenResponse = {
	output?: {
		choices?: Array<{
			message?: {
				content?: string;
			};
		}>;
	};
	message?: string;
	code?: string;
	request_id?: string;
};

const DEFAULT_BASE_URL =
	'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export async function qwenChat(options: QwenChatOptions): Promise<string> {
	const apiKey = process.env.DASHSCOPE_API_KEY;
	if (!apiKey) throw new Error('Missing DASHSCOPE_API_KEY');

	const model = options.model ?? 'qwen3-max';
	const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
	const timeoutMs = options.timeoutMs ?? 25_000;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(baseUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				input: { messages: options.messages },
				parameters: { result_format: 'message' },
			}),
			signal: controller.signal,
		});

		const data = (await res.json()) as QwenResponse;
		if (!res.ok) {
			const detail = data?.message || data?.code || `HTTP ${res.status}`;
			throw new Error(`Qwen request failed: ${detail}`);
		}

		const content = data?.output?.choices?.[0]?.message?.content;
		if (!content || typeof content !== 'string') {
			throw new Error('Qwen response missing message content');
		}
		return content;
	} finally {
		clearTimeout(timeout);
	}
}

