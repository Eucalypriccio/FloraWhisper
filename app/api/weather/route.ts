import { NextResponse } from 'next/server';

type WeatherResponse = {
	location: {
		lat: number;
		lon: number;
		timezone: string;
	};
	current: {
		temp: number;
		humidity: number;
		condition: string;
		time: string;
	};
	history: Array<{
		isoDate: string;
		date: string; // "Today" | "Mon" ...
		high: number;
		low: number;
	}>;
	updatedAt: number;
};

const DEFAULT_LOCATION = {
	// Wuhan (HUST nearby) as a safe fallback.
	lat: 30.52,
	lon: 114.36,
};

function toNumberOrNull(value: string | null): number | null {
	if (!value) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function getWeekdayLabel(isoDate: string, isToday: boolean) {
	if (isToday) return 'Today';
	// Avoid UTC parsing surprises for YYYY-MM-DD.
	const d = new Date(`${isoDate}T00:00:00`);
	return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function weatherCodeToCondition(code: number | null): string {
	if (code == null) return 'Unknown';
	// Open-Meteo weather codes: https://open-meteo.com/en/docs
	if (code === 0) return 'Clear';
	if (code === 1 || code === 2) return 'Partly Cloudy';
	if (code === 3) return 'Cloudy';
	if (code === 45 || code === 48) return 'Fog';
	if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return 'Rain';
	if (code >= 71 && code <= 77) return 'Snow';
	if (code >= 80 && code <= 82) return 'Rain Showers';
	if (code >= 95) return 'Thunderstorm';
	return 'Unknown';
}

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const lat = toNumberOrNull(searchParams.get('lat')) ?? DEFAULT_LOCATION.lat;
		const lon = toNumberOrNull(searchParams.get('lon')) ?? DEFAULT_LOCATION.lon;
		const force = searchParams.get('force') === '1';

		const url = new URL('https://api.open-meteo.com/v1/forecast');
		url.searchParams.set('latitude', String(lat));
		url.searchParams.set('longitude', String(lon));
		url.searchParams.set('timezone', 'auto');
		url.searchParams.set('forecast_days', '7');
		url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code');
		url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');


		const res = await fetch(
			url.toString(),
			force
				? {
					// Manual refresh should bypass server cache.
					cache: 'no-store',
				}
				: {
					// Cache on the server to avoid spamming the upstream.
					next: { revalidate: 86400 },
				}
		);

		if (!res.ok) {
			return NextResponse.json(
				{ error: `Upstream weather API failed: ${res.status}` },
				{ status: 502 }
			);
		}

		const data = (await res.json()) as {
			timezone?: string;
			latitude?: number;
			longitude?: number;
			current?: {
				time?: string;
				temperature_2m?: number;
				relative_humidity_2m?: number;
				weather_code?: number;
			};
			daily?: {
				time?: string[];
				temperature_2m_max?: number[];
				temperature_2m_min?: number[];
			};
		};

		const timezone = data.timezone ?? 'auto';
		const dailyTimes = data.daily?.time ?? [];
		const highs = data.daily?.temperature_2m_max ?? [];
		const lows = data.daily?.temperature_2m_min ?? [];

		const history = dailyTimes.slice(0, 7).map((isoDate, i) => ({
			isoDate,
			date: getWeekdayLabel(isoDate, i === 0),
			high: Math.round(highs[i] ?? 0),
			low: Math.round(lows[i] ?? 0),
		}));

		const currentTemp = data.current?.temperature_2m;
		const currentHumidity = data.current?.relative_humidity_2m;
		const condition = weatherCodeToCondition(data.current?.weather_code ?? null);

		if (currentTemp == null || currentHumidity == null || history.length === 0) {
			return NextResponse.json(
				{ error: 'Weather API returned incomplete data' },
				{ status: 502 }
			);
		}

		const payload: WeatherResponse = {
			location: {
				lat: Number.isFinite(data.latitude ?? NaN) ? (data.latitude as number) : lat,
				lon: Number.isFinite(data.longitude ?? NaN) ? (data.longitude as number) : lon,
				timezone,
			},
			current: {
				temp: Math.round(currentTemp),
				humidity: Math.round(currentHumidity),
				condition,
				time: data.current?.time ?? '',
			},
			// Open-Meteo daily arrays are chronological from today.
			history,
			updatedAt: Date.now(),
		};

		return NextResponse.json(payload);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

