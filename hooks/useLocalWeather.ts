import { useEffect } from 'react';
import { useWeatherStore } from '@/store/useWeatherStore';

export function useLocalWeather() {
  const temp = useWeatherStore((s) => s.currentTemp);
  const humidity = useWeatherStore((s) => s.currentHumidity);
  const condition = useWeatherStore((s) => s.condition);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);
  const refresh = useWeatherStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    temp: temp ?? 0,
    humidity: humidity ?? 0,
    condition,
    loading,
    error,
  };
}