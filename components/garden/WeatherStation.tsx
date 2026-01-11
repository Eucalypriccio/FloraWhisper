'use client';
import { useEffect, useRef, useState } from 'react';
import { useWeatherHistory } from '@/hooks/useWeatherHistory';
import { Droplets, RefreshCw, ThermometerSun } from 'lucide-react';

export default function WeatherStation() {
  const { history, currentHumidity, loading, error, lastUpdatedAt, refresh } = useWeatherHistory();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setChartSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isInitialLoading = loading && history.length === 0;
  if (isInitialLoading) {
    return <div className="w-full h-64 bg-white/40 backdrop-blur-md rounded-4xl animate-pulse mb-8" />;
  }

  const handleManualRefresh = () => {
    void refresh({ force: true });
  };

  const updatedLabel =
    typeof lastUpdatedAt === 'number'
      ? new Date(lastUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : null;

  if (error) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-md rounded-4xl border border-white/50 shadow-sm p-8 mb-10">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-serif text-xl text-flora-dark">Weather</h3>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-white/60 text-flora-dark text-sm hover:bg-white transition disabled:opacity-60"
            title="点击获取最新天气情况"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            点击获取最新天气情况
          </button>
        </div>
        <p className="mt-2 text-sm text-flora-secondary">Failed to load weather data.</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-md rounded-4xl border border-white/50 shadow-sm p-8 mb-10">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-serif text-xl text-flora-dark">Weather</h3>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-white/60 text-flora-dark text-sm hover:bg-white transition disabled:opacity-60"
            title="点击获取最新天气情况"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            点击获取最新天气情况
          </button>
        </div>
        <p className="mt-2 text-sm text-flora-secondary">No weather data available.</p>
      </div>
    );
  }

  // --- 图表计算逻辑 ---
  // 目标：铺满整个宽度且不变形。
  // 做法：把 SVG 的 viewBox 设为容器的真实像素宽高，此时 preserveAspectRatio="none" 不会产生拉伸变形（几乎 1:1 绘制）。
  const viewBoxWidth = chartSize.width || 600;
  const viewBoxHeight = chartSize.height || 220;
  const plotTop = 26;
  const plotBottom = 26;
  const plotHeight = Math.max(1, viewBoxHeight - plotTop - plotBottom);
  const plotFloorY = plotTop + plotHeight;

  const paddingX = 20;
  
  // 找出最大最小值以确定 Y 轴比例
  const allTemps = history.flatMap((d) => [d.high, d.low]);
  const maxTemp = Math.max(...allTemps) + 2; //留点余地
  const minTemp = Math.min(...allTemps) - 2;
  const range = maxTemp - minTemp;

  // 坐标映射函数
  const safeRange = range === 0 ? 1 : range;
  const getY = (temp: number) => {
    const t = (temp - minTemp) / safeRange;
    return plotTop + (1 - t) * plotHeight;
  };
  const getX = (index: number) => {
    const n = Math.max(1, history.length);
    // Place points at the center of each day column.
    const innerW = Math.max(1, viewBoxWidth - paddingX * 2);
    return paddingX + ((index + 0.5) / n) * innerW;
  };

  const highPointsArr = history.map((d, i) => ({ x: getX(i), y: getY(d.high) }));
  const lowPointsArr = history.map((d, i) => ({ x: getX(i), y: getY(d.low) }));

  const linePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    return `M ${points[0]!.x} ${points[0]!.y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  };

  const areaPath = (points: Array<{ x: number; y: number }>, floorY: number) => {
    if (points.length === 0) return '';
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const line = linePath(points);
    return `${line} L ${last.x} ${floorY} L ${first.x} ${floorY} Z`;
  };

  const highLine = linePath(highPointsArr);
  const lowLine = linePath(lowPointsArr);
  const highArea = areaPath(highPointsArr, plotFloorY);
  const lowArea = areaPath(lowPointsArr, plotFloorY);

  const formatMonthDay = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };


  const columnsStyle = { gridTemplateColumns: `repeat(${history.length}, minmax(0, 1fr))` } as const;

  return (
    <div className="group w-full bg-white/60 backdrop-blur-md rounded-4xl border border-white/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-500 p-8 mb-10 flex flex-col md:flex-row gap-8">
      {/* 左侧：温度曲线图 */}
      <div className="flex-1 relative">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
            <ThermometerSun size={20} />
            </div>
            <h3 className="font-serif text-xl text-flora-dark">Temperature Trend (7 Days)</h3>
          </div>

          <div className="flex items-center gap-3">
            {updatedLabel && (
              <span className="text-xs text-flora-secondary/70">Updated {updatedLabel}</span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-white/60 text-flora-dark text-sm hover:bg-white transition disabled:opacity-60"
              title="点击获取最新天气情况"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              点击获取最新天气情况
            </button>
          </div>
        </div>

        {/* Chart + X axis */}
        <div className="w-full">
          {/* SVG Chart Container (fixed height for measurement) */}
          <div ref={chartRef} className="relative h-56 w-full">
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              preserveAspectRatio="none"
            >
            <defs>
              <linearGradient id="tempHighFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="tempLowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 1. 网格线 (可选) */}
            <line x1={paddingX} y1={plotTop} x2={viewBoxWidth - paddingX} y2={plotTop} stroke="#000" strokeOpacity="0.08" strokeDasharray="2" vectorEffect="non-scaling-stroke" />
            <line x1={paddingX} y1={plotFloorY} x2={viewBoxWidth - paddingX} y2={plotFloorY} stroke="#000" strokeOpacity="0.12" strokeDasharray="2" vectorEffect="non-scaling-stroke" />

            {/* 面积填充 */}
            <path d={highArea} fill="url(#tempHighFill)" />
            <path d={lowArea} fill="url(#tempLowFill)" />

            {/* 2. 最高温曲线 (橙色) */}
            <path
              d={highLine}
              fill="none"
              stroke="#EA580C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* 最高温点 */}
            {history.map((d, i) => (
              <g key={`h-${d.isoDate}`}>
                <circle
                  cx={getX(i)}
                  cy={getY(d.high)}
                  r="3"
                  fill="white"
                  stroke="#EA580C"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={getX(i)}
                  y={getY(d.high) - 14}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#EA580C"
                  fontWeight="bold"
                >
                  {d.high}°
                </text>
              </g>
            ))}

            {/* 3. 最低温曲线 (蓝色) */}
            <path
              d={lowLine}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
             {/* 最低温点 */}
            {history.map((d, i) => (
              <g key={`l-${d.isoDate}`}>
                <circle
                  cx={getX(i)}
                  cy={getY(d.low)}
                  r="3"
                  fill="white"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={getX(i)}
                  y={getY(d.low) + 22}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#3B82F6"
                  fontWeight="bold"
                >
                  {d.low}°
                </text>
              </g>
            ))}
          </svg>

          </div>

          {/* X轴：星期 + 日期（与 paddingX 对齐） */}
          <div className="mt-2 px-5 overflow-hidden">
            <div className="grid" style={columnsStyle}>
              {history.map((d) => (
                <div key={`${d.isoDate}-w`} className="text-center text-xs text-flora-secondary/70 font-semibold">
                  {d.date}
                </div>
              ))}
            </div>
            <div className="grid mt-0.5" style={columnsStyle}>
              {history.map((d) => (
                <div key={`${d.isoDate}-d`} className="text-center text-[11px] text-flora-secondary/50 font-medium">
                  {formatMonthDay(d.isoDate)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 分割线 */}
      <div className="hidden md:block w-px bg-flora-secondary/20 my-2" />

      {/* 右侧：湿度仪表盘 */}
      <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-4 self-start md:self-center">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                <Droplets size={20} />
            </div>
            <h3 className="font-serif text-2xl text-flora-dark">Humidity</h3>
        </div>

          <div className="relative w-40 h-40">
           {/* 湿度圆环 SVG */}
           <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
             <defs>
              <linearGradient id="humidityGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#60A5FA" />
              </linearGradient>
             </defs>
             {/* 背景圆环 */}
             <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8" />
             {/* 进度圆环 */}
             <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
               stroke="url(#humidityGradient)" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${currentHumidity * 2.83} 283`} // 2 * PI * 45 ≈ 283
                className="transition-all duration-1000 ease-out"
             />
           </svg>
           {/* 中间文字 */}
           <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-serif font-bold text-flora-dark">{currentHumidity}%</span>
              <span className="text-xs text-flora-secondary uppercase tracking-widest mt-1">Current</span>
           </div>
        </div>
        
        <p className="mt-4 text-md text-center text-flora-secondary">
            {currentHumidity < 40 ? "空气较干燥，建议为植物们加湿" : "当前湿度水平理想"}
        </p>
      </div>

    </div>
  );
}