import type { PlantType } from '@/lib/garden.types';

export type GuideMode = 'generate' | 'modify';

export type GuidePlantInput = {
	name: string;
	formalName?: string;
	type: PlantType;
	meaning?: string;
};

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

const CARE_GUIDE_SCHEMA_TEXT = `You MUST output a single JSON object with EXACTLY this shape:
{
  "core": {
    "light": string,
    "water": string,
    "soil": string,
    "temp": string,
    "fertilizer": string
  },
  "seasons": {
    "spring": string,
    "summer": string,
    "autumn": string,
    "winter": string
  }
}
Rules:
- Output JSON ONLY. No markdown, no code fences, no extra keys.
- All values MUST be Chinese strings.
- When referencing the plant, use the display name format: 「<name>」.
- Each field should be 1–2 sentences, actionable, and consistent with the given plant type/species.
`;

function buildSystemPrompt(): string {
	return [
		'You are a botanical care assistant.',
		'You write long-term plant care guidance for a personal garden app.',
		CARE_GUIDE_SCHEMA_TEXT,
	].join('\n');
}

function plantContextText(plant: GuidePlantInput): string {
	const name = plant.name?.trim() || '未命名植物';
	const displayName = `「${name}」`;
	const formalName = (plant.formalName ?? '').trim();
	const meaning = (plant.meaning ?? '').trim();
	return [
		`Plant displayName: ${displayName}`,
		`Plant type: ${plant.type}`,
		formalName ? `Formal name: ${formalName}` : 'Formal name: (empty)',
		meaning ? `Meaning: ${meaning}` : 'Meaning: (empty)',
	].join('\n');
}

export function buildGenerateGuideMessages(plant: GuidePlantInput): Message[] {
	return [
		{ role: 'system', content: buildSystemPrompt() },
		{
			role: 'user',
			content: [
				'Generate a brand-new long-term care guide for the following plant.',
				plantContextText(plant),
				'Output JSON ONLY.',
			].join('\n\n'),
		},
	];
}

export const GAIA_CHAT_SYSTEM_PROMPT = [
	'你是 Gaia（盖娅），一位温柔、专业的 “植物管家”。',
	'你在 FloraWhisper 应用中与用户进行日常对话，回答植物养护、园艺、天气与情绪陪伴相关问题。',
	'',
	'输出要求：',
	'- 只输出纯文本（中文），不要 markdown，不要代码块，不要列表符号，不要多余的引号。',
	'- 简洁明了：优先给 1–3 句话的直接建议；需要澄清时，最多追问 1 个关键问题。',
	'- 语气自然、有陪伴感，但不夸张。',
].join('\n');

export const GAIA_OMNI_CHAT_SYSTEM_PROMPT = [
	'你是 Gaia（盖娅），一位温柔、专业的 “植物管家”。',
	'你在 FloraWhisper 应用中与用户进行多模态对话：用户可能同时提供图片与文字。',
	'你需要结合图片信息与文字问题，给出贴合场景的植物养护、园艺、天气与情绪陪伴建议。',
	'',
	'输出要求：',
	'- 只输出纯文本（中文）。不要 markdown，不要代码块，不要列表符号，不要多余的引号。',
	'- 简洁明了：优先给 1–3 句话的直接建议；需要澄清时，最多追问 1 个关键问题。',
	'- 如果图片信息不足以确定结论，要明确说明不确定，并提出 1 个最关键的补充问题。',
	'- 语气自然、有陪伴感，但不夸张。',
].join('\n');

/**
 * 构建 Gaia 聊天消息数组（多轮对话）
 * @param history - 之前的对话历史 (user/assistant 角色)
 * @param userText - 用户当前输入
 * @returns 完整的消息数组，包含 system 提示词 + 历史 + 新用户消息
 */
export function buildGaiaChatMessagesMultiTurn(
	history: Message[],
	userText: string
): Message[] {
	// 过滤掉历史中的 system 消息，避免重复
	const filteredHistory = (history ?? []).filter(
		(msg) => msg.role !== 'system'
	);

	return [
		{ role: 'system', content: GAIA_CHAT_SYSTEM_PROMPT },
		...filteredHistory,
		{
			role: 'user',
			content: (userText ?? '').trim() || '你好，Gaia。',
		},
	];
}

