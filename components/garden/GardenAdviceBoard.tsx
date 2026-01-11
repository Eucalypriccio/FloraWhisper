'use client';
import { useGardenStore } from '@/store/useGardenStore';
import { Sparkles, AlertCircle, CheckCircle2, Sprout, CloudMoon, Leaf} from 'lucide-react';
import { useLocalWeather } from '@/hooks/useLocalWeather';
import { buildGardenWarnings } from '@/lib/garden.advice';

export default function GardenAdviceBoard() {
  const { plants } = useGardenStore();
  const weather = useLocalWeather();

  const { plantWarnings, envWarnings, hasPlants, isAllGood } = buildGardenWarnings(plants, weather);

  return (
    <div className="w-full mb-10 animate-fade-in">
      
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-flora-primary" size={20} />
        <h3 className="font-serif text-3xl text-flora-dark">Daily Garden Insights</h3>
      </div>

      <div className="group w-full bg-white/70 backdrop-blur-md rounded-4xl border border-white/60 p-6 md:p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
        
        {/* 情况 A: 没有植物 */}
        {!hasPlants && (
            <div className="flex flex-col items-center justify-center py-6 text-center text-flora-secondary">
                <div className="w-12 h-12 bg-flora-sprout/30 rounded-full flex items-center justify-center mb-3">
                    <Sprout size={24} />
                </div>
                <p>Your garden is waiting for its first seed.</p>
                <p className="text-sm opacity-60 mt-1">Click the button below to plant something new.</p>
            </div>
        )}

        {/* 情况 B: 有植物但没问题 */}
        {isAllGood && (
            <div className="flex items-center gap-4 text-flora-primary py-4">
                <CheckCircle2 size={32} />
                <div>
                    <h4 className="font-serif text-lg font-bold">All plants are thriving!</h4>
                    <p className="text-sm opacity-80">Great job keeping the harmony in your garden.</p>
                </div>
            </div>
        )}

        {/* 情况 C: 有建议/警告（分栏展示：植物状态 / 环境） */}
        {(plantWarnings.length > 0 || envWarnings.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plant */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-flora-dark">
                <Leaf size={18} className="text-flora-primary" />
                <h4 className="font-serif text-xl font-bold">Plant Status</h4>
              </div>

              {plantWarnings.length === 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/50">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-flora-dark/80 text-sm font-medium">Plants look stable. No urgent care actions detected.</span>
                </div>
              ) : (
                <>
                  {plantWarnings.map((text, i) => (
                    <div key={`p-${i}`} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                      <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-flora-dark/80 text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Environment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-flora-dark">
                <CloudMoon size={18} className="text-flora-primary" />
                <h4 className="font-serif text-xl font-bold">Environment</h4>
              </div>

              {envWarnings.length === 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/50">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-flora-dark/80 text-sm font-medium">Weather looks okay. No environmental alerts right now.</span>
                </div>
              ) : (
                <>
                  {envWarnings.map((text, i) => (
                    <div key={`e-${i}`} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                      <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-flora-dark/80 text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}