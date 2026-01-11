import { NextResponse } from 'next/server';
import type { CareGuide, PlantType } from '@/lib/garden.types';
import { qwenChat } from '@/lib/llm/qwenClient';
import {
	buildGenerateGuideMessages,
	type GuideMode,
	type GuidePlantInput,
} from '@/lib/llm/prompts';

type GuideRequestBody = {
	mode: GuideMode;
	plant: GuidePlantInput;
	model?: string;
};

function extractJsonObject(text: string): unknown {
	const trimmed = text.trim();
	if (!trimmed) return null;

	// Fast path: pure JSON
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		// ignore
	}

	// Try fenced code block: ```json ... ```
	const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	if (fenceMatch?.[1]) {
		const fenced = fenceMatch[1].trim();
		try {
			return JSON.parse(fenced) as unknown;
		} catch {
			// ignore
		}
	}

	// Fallback: extract from first { to last }
	const first = trimmed.indexOf('{');
	const last = trimmed.lastIndexOf('}');
	if (first >= 0 && last > first) {
		const slice = trimmed.slice(first, last + 1);
		try {
			return JSON.parse(slice) as unknown;
		} catch {
			return null;
		}
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isCareGuide(value: unknown): value is CareGuide {
	if (!isRecord(value)) return false;
	const core = value.core;
	const seasons = value.seasons;
	if (!isRecord(core) || !isRecord(seasons)) return false;

	const coreKeys: Array<keyof CareGuide['core']> = ['light', 'water', 'soil', 'temp', 'fertilizer'];
	for (const key of coreKeys) {
		if (!isString(core[key])) return false;
	}

	const seasonKeys: Array<keyof CareGuide['seasons']> = ['spring', 'summer', 'autumn', 'winter'];
	for (const key of seasonKeys) {
		if (!isString(seasons[key])) return false;
	}

	// Reject extra top-level keys if any exist
	const topKeys = Object.keys(value);
	if (topKeys.length !== 2 || !topKeys.includes('core') || !topKeys.includes('seasons')) return false;

	return true;
}

function normalizePlant(input: GuidePlantInput): GuidePlantInput {
	return {
		name: (input.name ?? '').toString(),
		formalName: (input.formalName ?? '').toString(),
		type: input.type as PlantType,
		meaning: (input.meaning ?? '').toString(),
	};
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as GuideRequestBody;
		if (!body || (body.mode !== 'generate' && body.mode !== 'modify')) {
			return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
		}
		if (!body.plant || typeof body.plant !== 'object') {
			return NextResponse.json({ error: 'Missing plant' }, { status: 400 });
		}

		const plant = normalizePlant(body.plant);
		if (!plant.name.trim()) {
			return NextResponse.json({ error: 'Plant name is required' }, { status: 400 });
		}
		if (!plant.type) {
			return NextResponse.json({ error: 'Plant type is required' }, { status: 400 });
		}


		// 统一逻辑：无论 generate 还是 modify，都使用“生成指南”的 prompt 与流程。
		const messages = buildGenerateGuideMessages(plant);

		const text = await qwenChat({ messages, model: body.model });
		const parsed = extractJsonObject(text);
		if (!isCareGuide(parsed)) {
			return NextResponse.json(
				{ error: 'LLM output is not a valid CareGuide JSON', raw: text },
				{ status: 502 }
			);
		}

		return NextResponse.json({ guide: parsed });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

