'use client';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
// 引入 BookOpen, ChevronUp 图标
import { Sun, Droplets, Sprout, Thermometer, Maximize2, X, BookOpen, ChevronUp } from 'lucide-react';
import type { CareGuide } from '@/lib/garden.types';
import { Plant, SPECIES_DATA, getLightStatus, getWaterStatus, getFertilizerStatus, getTempStatus } from '@/lib/garden.types';
import { getPlantEmoji } from '@/lib/garden.helpers';
import Image from 'next/image';
import clsx from 'clsx';
import { useLocalWeather } from '@/hooks/useLocalWeather';
import { useGardenStore } from '@/store/useGardenStore';

interface Props {
  plant: Plant;
  onClick: () => void;
}

export default function PlantCardEnhanced({ plant, onClick }: Props) {
    const { updatePlant } = useGardenStore();
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [guidePlacement, setGuidePlacement] = useState<'top' | 'bottom'>('bottom');
    const [guideLayout, setGuideLayout] = useState<
        | {
                left: number;
                width: number;
                top?: number;
                bottom?: number;
                maxHeight: number;
            }
        | null
    >(null);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const guideRef = useRef<HTMLDivElement | null>(null);
  const weather = useLocalWeather();

    const makeGuideSignature = (input: { type: Plant['type']; formalName?: string }) => {
        const normalizedFormalName = (input.formalName ?? '').trim();
        return `${input.type}||${normalizedFormalName}`;
    };

    const currentGuideSignature = makeGuideSignature({ type: plant.type, formalName: plant.formalName });
    const storedGuideSignature = (plant.careGuideSignature ?? '').trim();
    const shouldModifyGuide = !!plant.careGuide && !!storedGuideSignature && storedGuideSignature !== currentGuideSignature;

    const [guideJob, setGuideJob] = useState<null | { mode: 'generate' | 'modify'; dots: number }>(null);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const requestGuide = async (mode: 'generate' | 'modify') => {
        const res = await fetch('/api/guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode,
                plant: {
                    name: plant.name,
                    formalName: plant.formalName,
                    type: plant.type,
                    meaning: plant.meaning,
                },
            }),
        });

        if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(err?.error || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { guide: CareGuide };
        return data.guide;
    };

    useEffect(() => {
        if (!guideJob) return;
        const timer = window.setInterval(() => {
            setGuideJob((prev) => {
                if (!prev) return prev;
                const nextDots = prev.dots >= 6 ? 3 : prev.dots + 1;
                return { ...prev, dots: nextDots };
            });
        }, 350);
        return () => window.clearInterval(timer);
    }, [guideJob]);

    const calcGuideLayout = (placement: 'top' | 'bottom', rect: DOMRect) => {
        const viewportPadding = 16;
        const offset = 8;

        const nav = document.querySelector('nav');
        const navBottom = nav instanceof HTMLElement ? nav.getBoundingClientRect().bottom : 0;
        const safeTop = Math.ceil(navBottom + 12);

        const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
        const left = Math.min(
            Math.max(rect.left, viewportPadding),
            window.innerWidth - viewportPadding - width
        );

        if (placement === 'bottom') {
            const desiredTop = rect.bottom + offset;
            const top = Math.max(desiredTop, safeTop);
            const available = Math.max(160, window.innerHeight - top - viewportPadding);
            const maxHeight = Math.min(Math.floor(window.innerHeight * 0.7), Math.floor(available));
            return { left, width, top, maxHeight };
        }

        const availableAbove = Math.max(0, rect.top - offset - safeTop);
        const available = Math.max(160, availableAbove);
        const maxHeight = Math.min(Math.floor(window.innerHeight * 0.7), Math.floor(available));
        return {
            left,
            width,
            bottom: window.innerHeight - rect.top + offset,
            maxHeight,
        };
    };

    useEffect(() => {
        if (!isGuideOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const targetNode = event.target as Node | null;
            if (!targetNode) return;

                        const clickedInsideCard = !!(cardRef.current && cardRef.current.contains(targetNode));
                        const clickedInsideGuide = !!(guideRef.current && guideRef.current.contains(targetNode));
                        if (!clickedInsideCard && !clickedInsideGuide) {
                            setIsGuideOpen(false);
                            setGuideLayout(null);
                        }
        };

        document.addEventListener('pointerdown', handlePointerDown, { capture: true });
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, { capture: true } as AddEventListenerOptions);
        };
    }, [isGuideOpen]);

    useEffect(() => {
        if (!isGuideOpen) return;

        const handleReflow = () => {
            const rect = cardRef.current?.getBoundingClientRect();
            if (!rect) return;
            setGuideLayout(calcGuideLayout(guidePlacement, rect));
        };
        window.addEventListener('resize', handleReflow);
        window.addEventListener('scroll', handleReflow, true);
        return () => {
            window.removeEventListener('resize', handleReflow);
            window.removeEventListener('scroll', handleReflow, true);
        };
    }, [isGuideOpen, guidePlacement]);

  // ... 状态计算逻辑不变 ...
  const lightStatus = getLightStatus(plant.type, plant.statusConfig.light);
  const waterStatus = getWaterStatus(plant.type, plant.statusConfig.soil);
  const fertStatus = getFertilizerStatus(plant.statusConfig.lastFertilized);
    const tempStatus = weather.loading ? '...' : getTempStatus(plant.type, weather.temp);

    const lightText =
        lightStatus === 'Ideal' ? '适宜' : lightStatus === 'Too Bright' ? '过强' : '不足';
    const waterText =
        waterStatus === 'Normal' ? '正常' : waterStatus === 'Overwatered' ? '过湿' : '偏干';
    const tempText =
        tempStatus === '...' ? '加载中' : tempStatus === 'Comfortable' ? '舒适' : tempStatus === 'High' ? '偏热' : '偏冷';
    const plantTypeText = SPECIES_DATA[plant.type]?.label ?? plant.type;
    const getStatusColor = (status: string) => {
        if (status === 'Ideal' || status === 'Normal' || status === 'Comfortable') {
            return 'text-flora-primary bg-flora-primary/10';
        }

        if (status === 'Too Bright' || status === 'Overwatered' || status === 'High') {
            return 'text-amber-600 bg-amber-50';
        }

        if (status === 'Too Dark' || status === 'Thirsty' || status === 'Low') {
            return 'text-sky-600 bg-sky-50';
        }

        return 'text-flora-secondary bg-white/40';
    };

    const openGuidePanel = () => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const minPanelSpace = 280;
        const shouldOpenBottom = spaceBelow >= minPanelSpace || spaceBelow >= spaceAbove;
        const placement: 'top' | 'bottom' = shouldOpenBottom ? 'bottom' : 'top';
        setGuidePlacement(placement);
        setGuideLayout(calcGuideLayout(placement, rect));
        setIsGuideOpen(true);
    };

    // 阻止冒泡的点击事件
    const handleGuideBarClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (guideJob) return;

        // 无指南：生成
        if (!plant.careGuide) {
            setGuideJob({ mode: 'generate', dots: 3 });
            void (async () => {
                try {
                    const minDelay = new Promise<void>((r) => window.setTimeout(r, 900));
                    const [nextGuide] = await Promise.all([requestGuide('generate'), minDelay]);
                    updatePlant(plant.id, {
                        careGuide: nextGuide,
                        careGuideSignature: currentGuideSignature,
                    });
                    if (!mountedRef.current) return;
                    setGuideJob(null);
                    openGuidePanel();
                } catch (err) {
                    console.error('Guide generation failed', err);
                    if (!mountedRef.current) return;
                    setGuideJob(null);
                }
            })();
            return;
        }

        // 有指南但档案变了：修改
        if (shouldModifyGuide) {
            setGuideJob({ mode: 'modify', dots: 3 });
            void (async () => {
                try {
                    const minDelay = new Promise<void>((r) => window.setTimeout(r, 900));
                    const [nextGuide] = await Promise.all([requestGuide('modify'), minDelay]);
                    updatePlant(plant.id, {
                        careGuide: nextGuide,
                        careGuideSignature: currentGuideSignature,
                    });
                    if (!mountedRef.current) return;
                    setGuideJob(null);
                    openGuidePanel();
                } catch (err) {
                    console.error('Guide modification failed', err);
                    if (!mountedRef.current) return;
                    setGuideJob(null);
                }
            })();
            return;
        }

        // 有指南且无需修改：正常展开/收起
        if (isGuideOpen) {
            setIsGuideOpen(false);
            setGuideLayout(null);
            return;
        }

        openGuidePanel();
    };

  return (
      <div ref={cardRef} className={clsx('group relative flex flex-col', isGuideOpen && 'z-50')}>
            <div className="bg-white/60 backdrop-blur-md rounded-4xl border border-white/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
        
                {/* 卡片主体区域 */}
                <div onClick={onClick}>
                        {/* 1. 顶部：信息与缩略图 */}
                        <div className="p-6 flex justify-between items-start cursor-pointer">
                            <div>
                                <div className="text-4xl mb-2">{getPlantEmoji(plant.type)}</div>
                                <h3 className="font-serif text-2xl font-bold text-flora-dark">{plant.name}</h3>
                                                                <p className="text-sm text-flora-secondary font-medium mt-1">
                                                                    {(plant.formalName ? `${plant.formalName} · ` : '')}{plantTypeText} · {plant.meaning}
                                                                </p>
                            </div>
                            {/* 缩略图 */}
                            <div 
                                className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform cursor-zoom-in"
                                onClick={(e) => { e.stopPropagation(); setIsImageExpanded(true); }}
                            >
                                    {plant.image ? (
                                            <Image src={plant.image} alt={plant.name} fill className="object-cover" />
                                    ) : (
                                            <div className="w-full h-full bg-flora-sprout/50 flex items-center justify-center text-flora-primary"><Maximize2 size={16}/></div>
                                    )}
                            </div>
                        </div>

                        {/* 2. 状态网格 */}
                        <div className="px-6 pb-6 grid grid-cols-2 gap-3 cursor-pointer">
                            <StatusItem icon={<Sun size={18}/>} label="Light" value={lightText} colorClass={getStatusColor(lightStatus)} />
                            <StatusItem icon={<Droplets size={18}/>} label="Water" value={waterText} colorClass={getStatusColor(waterStatus)} />
                            <StatusItem icon={<Sprout size={18}/>} label="Fertilizer" value={fertStatus === 'Good' ? '无需施肥' : '待施肥'} colorClass={fertStatus === 'Good' ? 'text-flora-primary bg-flora-primary/10' : 'text-amber-600 bg-amber-50'} />
                            <StatusItem icon={<Thermometer size={18}/>} label="Temp" value={tempText} colorClass={tempStatus === '...' ? 'text-flora-secondary bg-white/40' : getStatusColor(tempStatus)} />
                        </div>
                </div>

                {/* --- 长期养护指南栏（可选生成/修改，不撑开卡片高度） --- */}
                <div className="border-t border-flora-secondary/10 bg-white/40">
                    <button 
                        onClick={handleGuideBarClick}
                        disabled={!!guideJob}
                        className={clsx(
                            "w-full py-3 px-6 flex items-center justify-between transition-colors",
                            guideJob
                                ? "text-flora-secondary/70 cursor-not-allowed"
                                : "text-flora-secondary hover:text-flora-primary hover:bg-white/50"
                        )}
                    >
                        <div className={clsx(
                            "flex items-center gap-2 text-md font-bold tracking-wide font-serif",
                            (plant.careGuide ? "" : "")
                        )}>
                            <BookOpen size={16} />
                            {guideJob ? (
                                <span className="animate-pulse">
                                    {guideJob.mode === 'generate' ? '正在生成中' : '正在修改中'}{'.'.repeat(guideJob.dots)}
                                </span>
                            ) : !plant.careGuide ? (
                                <span>让 Gaia 帮你生成一份「{plant.name}」的长期养护指南</span>
                            ) : shouldModifyGuide ? (
                                <span>让 Gaia 帮你修改「{plant.name}」的长期养护指南</span>
                            ) : (
                                <span>Long-term Care Guide</span>
                            )}
                        </div>

                        {plant.careGuide && !guideJob && !shouldModifyGuide && (
                            <ChevronUp size={16} className={clsx("transition-transform duration-300", isGuideOpen ? "rotate-180" : "")} />
                        )}
                    </button>
                </div>
            </div>

            {/* --- Portal 指南面板：不受父级 overflow 裁剪 --- */}
            {plant.careGuide && isGuideOpen && guideLayout && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={guideRef}
                        className="fixed z-40"
                        style={{
                            left: guideLayout.left,
                            width: guideLayout.width,
                            top: guideLayout.top,
                            bottom: guideLayout.bottom,
                        }}
                    >
                        <div className="bg-[#FDFCF8] border border-flora-secondary/15 rounded-3xl shadow-xl overflow-hidden">
                            <div className="overflow-auto p-6 space-y-6 text-flora-dark" style={{ maxHeight: guideLayout.maxHeight }}>
                                <div>
                                    <h4 className="font-serif text-lg font-bold mb-3 border-b border-flora-secondary/20 pb-1">Core Essentials</h4>
                                    <div className="space-y-3 text-sm leading-relaxed">
                                        <GuideRow label="Light" text={plant.careGuide.core.light} />
                                        <GuideRow label="Water" text={plant.careGuide.core.water} />
                                        <GuideRow label="Soil" text={plant.careGuide.core.soil} />
                                        <GuideRow label="Temp" text={plant.careGuide.core.temp} />
                                        <GuideRow label="Fertilizer" text={plant.careGuide.core.fertilizer} />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-serif text-lg font-bold mb-3 border-b border-flora-secondary/20 pb-1">Seasonal Strategy</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <SeasonBox season="Spring" text={plant.careGuide.seasons.spring} bg="bg-green-50" />
                                        <SeasonBox season="Summer" text={plant.careGuide.seasons.summer} bg="bg-orange-50" />
                                        <SeasonBox season="Autumn" text={plant.careGuide.seasons.autumn} bg="bg-amber-50" />
                                        <SeasonBox season="Winter" text={plant.careGuide.seasons.winter} bg="bg-blue-50" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

      {/* 图片展开遮罩保持不变 */}
      {isImageExpanded && plant.image && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-10" onClick={(e) => { e.stopPropagation(); setIsImageExpanded(false); }}>
            <div className="relative w-full max-w-3xl aspect-4/3 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                <Image src={plant.image} alt={plant.name} fill className="object-contain" />
            </div>
            <button className="absolute top-10 right-10 text-white/80 hover:text-white"><X size={32}/></button>
        </div>
      )}
    </div>
  );
}

// 辅助组件：指南行
function GuideRow({ label, text }: { label: string, text: string }) {
    return (
        <div className="flex gap-2">
            <span className="font-bold text-flora-secondary w-20 shrink-0">{label}</span>
            <span className="opacity-90">{text}</span>
        </div>
    )
}

// 辅助组件：季节盒子
function SeasonBox({ season, text, bg }: { season: string, text: string, bg: string }) {
    return (
        <div className={clsx("p-3 rounded-xl", bg)}>
            <div className="text-xs font-bold uppercase opacity-60 mb-1">{season}</div>
            <div className="text-xs leading-relaxed">{text}</div>
        </div>
    )
}

// StatusItem 保持不变...
interface StatusItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  colorClass: string;
}

function StatusItem({ icon, label, value, colorClass }: StatusItemProps) {
    return (
        <div className={clsx("p-3 rounded-2xl flex items-center gap-3 transition-colors", colorClass)}>
            {icon}
            <div className="flex flex-col">
                <span className="text-[10px] uppercase opacity-60 font-bold">{label}</span>
                <span className="text-xs font-medium">{value}</span>
            </div>
        </div>
    )
}