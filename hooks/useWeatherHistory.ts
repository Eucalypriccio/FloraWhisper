import { useEffect } from 'react';
import { useWeatherStore } from '@/store/useWeatherStore';

export interface DailyWeather {
  isoDate: string;
  date: string; // "Today" | "Mon" ...
  high: number;
  low: number;
}

export function useWeatherHistory() {
  const history = useWeatherStore((s) => s.history);
  const currentHumidity = useWeatherStore((s) => s.currentHumidity);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);
  const lastUpdatedAt = useWeatherStore((s) => s.lastUpdatedAt);
  const refresh = useWeatherStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    history: history as DailyWeather[],
    currentHumidity: currentHumidity ?? 0,
    loading,
    error,
    lastUpdatedAt,
    refresh,
  };
}