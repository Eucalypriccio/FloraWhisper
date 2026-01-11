import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchWeather, type DailyWeather } from '@/lib/services/weatherService';

type Location = { lat: number; lon: number };

interface WeatherState {
	location: Location | null;
	history: DailyWeather[];
	currentTemp: number | null;
	currentHumidity: number | null;
	condition: string;
	loading: boolean;
	error: string | null;
	lastUpdatedAt: number | null;
	setLocation: (location: Location) => void;
	refresh: (opts?: { force?: boolean }) => Promise<void>;
}

const DEFAULT_LOCATION: Location = {
	lat: 30.52,
	lon: 114.36,
};

async function getBrowserLocation(timeoutMs = 8000): Promise<Location | null> {
	if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;

	return await new Promise((resolve) => {
		let settled = false;
		const timer = window.setTimeout(() => {
			if (settled) return;
			settled = true;
			resolve(null);
		}, timeoutMs);

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timer);
				resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
			},
			() => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timer);
				resolve(null);
			},
			{ enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: timeoutMs }
		);
	});
}

let inFlight: Promise<void> | null = null;

const FRESH_MS = 24 * 60 * 60 * 1000;

export const useWeatherStore = create<WeatherState>()(
	persist(
		(set, get) => ({
	location: null,
	history: [],
	currentTemp: null,
	currentHumidity: null,
	condition: 'Unknown',
	loading: false,
	error: null,
	lastUpdatedAt: null,

	setLocation: (location) => set({ location }),

	refresh: async (opts) => {
		const state = get();
		const now = Date.now();
		const isFresh = state.lastUpdatedAt != null && now - state.lastUpdatedAt < FRESH_MS;
		const hasData =
			state.history.length > 0 && state.currentTemp != null && state.currentHumidity != null;
		if (!opts?.force && (state.loading || (isFresh && hasData))) return;
		if (inFlight) return inFlight;

		inFlight = (async () => {
			set({ loading: true, error: null });

			let location = get().location;
			if (!location) {
				const browserLoc = await getBrowserLocation();
				location = browserLoc ?? DEFAULT_LOCATION;
				set({ location });
			}

			try {
				const snapshot = await fetchWeather({ ...location, force: !!opts?.force });
				set({
					history: snapshot.history,
					currentTemp: snapshot.current.temp,
					currentHumidity: snapshot.current.humidity,
					condition: snapshot.current.condition,
					lastUpdatedAt: snapshot.updatedAt,
					loading: false,
					error: null,
				});
			} catch (e) {
				const message = e instanceof Error ? e.message : 'Failed to load weather';
				set({ loading: false, error: message });
			}
		})();

		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	},
		}),
		{
			name: 'flora-weather-storage',
			version: 1,
			migrate: (persisted: unknown) => {
				if (!persisted || typeof persisted !== 'object') return persisted;
				const persistedObj = persisted as Record<string, unknown>;
				const stateRaw = persistedObj.state;
				if (!stateRaw || typeof stateRaw !== 'object') return persisted;
				const stateObj = stateRaw as Record<string, unknown>;
				const { city, country, ...rest } = stateObj;
				void city;
				void country;
				return { ...persistedObj, state: rest };
			},
			partialize: (s) => ({
				location: s.location,
				history: s.history,
				currentTemp: s.currentTemp,
				currentHumidity: s.currentHumidity,
				condition: s.condition,
				lastUpdatedAt: s.lastUpdatedAt,
			}),
		}
	)
);

