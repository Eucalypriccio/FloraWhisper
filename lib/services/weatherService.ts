export type DailyWeather = {
	isoDate: string;
	date: string;
	high: number;
	low: number;
};

export type WeatherSnapshot = {
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
	history: DailyWeather[];
	updatedAt: number;
};

export async function fetchWeather(params?: { lat?: number; lon?: number; force?: boolean }): Promise<WeatherSnapshot> {
	const url = new URL('/api/weather', window.location.origin);
	if (typeof params?.lat === 'number') url.searchParams.set('lat', String(params.lat));
	if (typeof params?.lon === 'number') url.searchParams.set('lon', String(params.lon));
	if (params?.force) url.searchParams.set('force', '1');

	const res = await fetch(url.toString(), { cache: 'no-store' });
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(text || `Weather API failed: ${res.status}`);
	}

	return (await res.json()) as WeatherSnapshot;
}

