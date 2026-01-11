'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wind,
  Droplets,
  Mic,
  Volume2,
  Brain,
  Image as ImageIcon,
  BookOpenCheck,
  Sunrise,
  TrendingUp,
  CloudRain,
  Notebook,
} from 'lucide-react';
import Navbar from '@/components/overlay/Navbar';
import NatureBackground from '@/components/overlay/NatureBackground';
import { useGardenStore } from '@/store/useGardenStore';
import Image from 'next/image';

export default function Home() {
  const plantsCount = useGardenStore((s) => s.plants.length);

  const gaiaCapabilities = [
    {
      key: 'guide',
      title: 'Long-term Care Guide',
      note: '把长期养护变成可坚持的路线',
      detail: '阶段目标、关键节点与复查频率一目了然。',
      Icon: BookOpenCheck,
      iconWrapClassName: 'bg-flora-primary/10 text-flora-primary',
      tag: '长期',
    },
    {
      key: 'voice',
      title: 'Voice Chat',
      note: '说出来就能聊，也能听得见',
      detail: '语音识别输入 + 语音播报输出，更贴近真实场景。',
      Icon: Mic,
      iconWrapClassName: 'bg-orange-500/10 text-orange-500',
      tag: '语音',
    },
    {
      key: 'memory',
      title: 'Multi-turn Memory',
      note: '对话不断线，建议会持续修正',
      detail: '围绕同一株植物追问、归纳与更新计划。',
      Icon: Brain,
      iconWrapClassName: 'bg-sky-500/10 text-sky-600',
      tag: '多轮',
    },
    {
      key: 'omni',
      title: 'Image Clinic',
      note: '一张照片，快速定位问题线索',
      detail: '叶片/枝干图像辅助判断：缺水、晒伤、病斑等。',
      Icon: ImageIcon,
      iconWrapClassName: 'bg-flora-dark/10 text-flora-dark',
      tag: '图片',
    },
  ] as const;

  const dialogueDemos = [
    {
      tags: ['支持语音交互', '支持上传图片'],
      user: '叶尖发黄、微微发干，是缺水还是光照太强？',
      gaia:
        '可以先看两点：叶尖是不是有点脆、土壤摸上去会不会太干？如果叶尖干脆而叶片整体偏卷，多半是缺水或空气太干；若叶面出现晒斑、靠窗侧更严重，则是日照过强。你可以拍一张叶片近照，我来结合纹理与变色区域给更你准确的判断~',
    },
    {
      tags: ['支持语音交互'],
      user: '我总是忘记浇水，应该多久浇一次？',
      gaia:
        '最好的方法不是 “几天一次” 呦。我来教你用三个信号决定：土表 2–3cm 干湿、盆重变化、叶片挺立程度。按 “见干见湿” 建立浇水习惯，再根据天气与季节适当调整，这样更不容易导致烂根呢~',
    },
    {
      tags: ['支持语音交互'],
      user: '今天适合开窗通风吗？会不会把植物冻到？',
      gaia:
        '温度差和风向是关键呢。若室外温度明显更低，可以短时间通风并把植物离开窗口直吹区域；对怕冷的品种，优先选择中午气温较高时通风，能兼顾空气流动与安全~',
    },
  ] as const;

  const [demoIndex, setDemoIndex] = useState(0);
  const activeDemo = dialogueDemos[Math.min(demoIndex, dialogueDemos.length - 1)];
  const totalDemos = dialogueDemos.length;

  const nextLevel = Math.max(5, Math.ceil((plantsCount + 1) / 5) * 5);
  const progressPercent = Math.min(100, Math.round((plantsCount / nextLevel) * 100));

  return (
    <main className="relative w-full overflow-x-hidden">
      <NatureBackground />
      <Navbar />

      <section id="home" className="relative w-full min-h-screen flex flex-col items-center justify-center pt-24 pb-12">
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8 px-4">
          <h1 className="font-serif text-9xl md:text-9xl leading-none text-flora-primary drop-shadow-sm animate-fade-in">
            FloraWhisper
          </h1>
          <p className="text-flora-dark/80 text-2xl font-light tracking-wide leading-relaxed font-serif max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            一个让科技智能与植物相遇的数字栖居地，<br />
            倾听生长的静默
          </p>
          <div className="pt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link 
              href="/garden"
              className="group inline-flex items-center gap-3 px-10 py-4 bg-flora-primary text-white rounded-full text-lg font-serif transition-all duration-300 hover:bg-flora-dark hover:scale-105 shadow-xl hover:shadow-flora-primary/40"
            >
              <span>Enter Your Garden</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        <a href="#start" className="absolute bottom-10 animate-bounce text-flora-secondary/60 hover:text-flora-primary cursor-pointer transition-colors">
          <ChevronDown size={32} />
        </a>
      </section>

      <section
        id="start"
        className="relative w-full py-20 md:py-24 bg-white/25 backdrop-blur-sm border-y border-white/40"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base mb-3 block">
              What You’ll Get
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-flora-dark mb-5">A Gentle Way to Grow</h2>
            <p className="text-flora-dark/60 font-serif text-lg md:text-xl leading-relaxed">
              用更轻盈的方式，把植物养护变成可持续的日常： <br />
              时常有陪伴、时常有方法、时常有进步
            </p>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-4xl bg-flora-sprout/30 backdrop-blur-md border border-white/60 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-flora-primary/10 text-flora-primary flex items-center justify-center mb-6">
                <Wind size={24} />
              </div>
              <h3 className="font-serif text-2xl text-flora-dark mb-3">Calm Companion</h3>
              <p className="text-flora-dark/60 font-serif text-lg leading-relaxed">
                通过语音对话与自然氛围，引导你在忙碌间隙放慢呼吸，获得被理解的陪伴感
              </p>
            </div>

            <div className="rounded-4xl bg-white/60 backdrop-blur-md border border-white/60 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
                <Sunrise size={24} />
              </div>
              <h3 className="font-serif text-2xl text-flora-dark mb-3">Scientific Care</h3>
              <p className="text-flora-dark/60 font-serif text-lg leading-relaxed">
                结合植物特性与天气环境，给出针对性的养护建议与提醒
              </p>
            </div>

            <div className="rounded-4xl bg-flora-sprout/30 backdrop-blur-md border border-white/40 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-6">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-serif text-2xl text-flora-dark mb-3">Visible Progress</h3>
              <p className="text-flora-dark/60 font-serif text-lg leading-relaxed">
                每一次浇水、施肥与学习，都能在可视化花园的长期曲线里看见变化
              </p>
            </div>
          </div>

          {/* 3-step onboarding */}
          <div className="mt-10 md:mt-14 rounded-[2.5rem] bg-white/55 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
            <div className="px-8 md:px-10 py-8 md:py-10">
              <div className="flex items-baseline justify-between gap-6 flex-wrap">
                <div>
                  <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base block">
                    Get Started in 3 Steps
                  </span>
                  <h3 className="font-serif text-2xl md:text-3xl text-flora-dark mt-2">From Zero to Confident</h3>
                </div>
                <Link
                  href="/garden"
                  className="group inline-flex items-center gap-2 px-5 py-3 rounded-full bg-flora-dark text-white font-serif text-base shadow-md hover:shadow-xl hover:scale-[1.02] transition"
                >
                  <span>Start Now</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-3xl bg-white/70 border border-white/70 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-flora-primary/10 text-flora-primary flex items-center justify-center font-sans font-bold">
                      1
                    </div>
                    <div className="font-serif text-xl text-flora-dark">Add new plant</div>
                  </div>
                  <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                    创建你的第一株植物档案：<br />
                    品种、状态与照养目标一目了然
                  </p>
                </div>

                <div className="rounded-3xl bg-white/70 border border-white/70 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-flora-primary/10 text-flora-primary flex items-center justify-center font-sans font-bold">
                      2
                    </div>
                    <div className="font-serif text-xl text-flora-dark">Ask Gaia</div>
                  </div>
                  <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                    自由的交互方式：<br />
                    用文字或语音提问，需要时也可上传照片，帮助 Gaia 判断更准确
                  </p>
                </div>

                <div className="rounded-3xl bg-white/70 border border-white/70 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-flora-primary/10 text-flora-primary flex items-center justify-center font-sans font-bold">
                      3
                    </div>
                    <div className="font-serif text-xl text-flora-dark">Get an action plan</div>
                  </div>
                  <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                    获得清晰的步骤：<br />
                    今天需要做什么，之后需要做什么
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Audience */}
          <div className="mt-10 md:mt-14">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
              <div>
                <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base block">
                  Who It’s For
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-flora-dark mt-2">Made for Real Life</h3>
              </div>
              <p className="text-flora-dark/60 font-serif text-base md:text-lg max-w-xl">
                只要你愿意开始照顾一株植物
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-4xl bg-white/55 backdrop-blur-md border border-white/60 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="font-serif text-xl text-flora-dark mb-2">Beginners</div>
                <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                  给充满热情的新手一条明确的路线：<br />
                  少走弯路，把每次呵护都变成可视化的进步
                </p>
              </div>

              <div className="rounded-4xl bg-white/55 backdrop-blur-md border border-white/60 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="font-serif text-xl text-flora-dark mb-2">Busy Professionals</div>
                <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                  适合快节奏的生活：<br />
                  简明提醒当下最重要的一步，把照顾植物融入日程
                </p>
              </div>

              <div className="rounded-4xl bg-white/55 backdrop-blur-md border border-white/60 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="font-serif text-xl text-flora-dark mb-2">Ritual Lovers</div>
                <p className="text-flora-dark/60 font-serif text-base leading-relaxed">
                  给喜欢仪式感的人的一份礼物：<br />
                  在虚拟花园里记录、回顾、庆祝每一次微小的成长
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 2: About (关于) --- */}
      <section id="about" className="relative w-full py-24 md:py-32 bg-white/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* 左侧：文字故事 */}
          <div className="space-y-8 order-2 md:order-1">
            <div className="space-y-2">
              <span className="text-flora-primary font-bold tracking-widest uppercase text-sm">Our Philosophy</span>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-flora-dark leading-tight">
                Restoring the Connection with Nature
              </h2>
            </div>
            <div className="space-y-6 text-flora-dark/70 text-xl font-serif leading-relaxed">
              <p>
                通过数字人技术与植物智慧引擎，<br /> 
                FloraWhisper 将传统植物养护转变为沉浸式、人性化的交互体验
              </p>
              <p>
                我们以拟人化智能助手 Gaia (Green Artificial Intelligence Assistant)为核心，<br />
                结合可视化虚拟花园与个性化养护方案，<br />
                解决新手缺乏经验、难以坚持的痛点，让植物养护成为生活中的自然乐趣与知识旅程
              </p>
            </div>
          </div>

          {/* 右侧：装饰图片框 - 移除固定高度，改用宽高比 */}
          <div className="relative order-1 md:order-2">
            <div className="aspect-4/5 w-full max-w-md mx-auto bg-flora-sprout/20 rounded-t-full rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white/50 relative group">
                <Image
                  src="/pics/sprout.png"
                  alt="Sprout"
                  fill
                  priority={false}
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                {/* 如果没有图片，用渐变兜底 */}
                <div className="absolute inset-0 bg-linear-to-b from-flora-secondary/10 to-flora-primary/20"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 bg-linear-to-t from-black/20 to-transparent">
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl text-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <p className="font-serif italic text-flora-dark text-lg">&quot;Nature does not hurry, <br /> yet everything is accomplished.&quot;</p>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 2.5: Gaia (能力展示) --- */}
      <section id="gaia" className="relative w-full py-24 px-6 md:px-12 bg-white/15">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 text-center max-w-3xl mx-auto">
            <span className="text-flora-primary font-bold tracking-widest uppercase text-lg mb-3 block">Meet Gaia</span>
            <h2 className="font-serif text-4xl md:text-6xl text-flora-dark mb-6">A Companion That Understands</h2>
            <p className="text-flora-dark/60 font-serif text-lg md:text-xl leading-relaxed">
              不只是回答问题，而是理解你的担忧，落实你的需求
            </p>
          </div>

          {/* Capability matrix */}
          <div className="rounded-[2.5rem] bg-white/55 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
            <div className="px-8 md:px-10 py-8 md:py-10">
              <div className="flex items-baseline justify-between gap-6 flex-wrap">
                <div>
                  <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base block">
                    What Gaia Can Do
                  </span>
                  <h3 className="font-serif text-2xl md:text-3xl text-flora-dark mt-2">Capabilities at a Glance</h3>
                </div>
                <p className="text-flora-dark/60 font-serif text-base md:text-lg max-w-xl">
                  探索 Gaia 的多维能力
                </p>
              </div>

              {/* Mobile: concise list (circle icon + copy) */}
              <div className="mt-8 grid grid-cols-1 gap-4 md:hidden">
                {gaiaCapabilities.map((c) => {
                  const Icon = c.Icon;
                  return (
                    <div key={c.key} className="rounded-4xl bg-white/70 border border-white/70 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-14 h-14 rounded-full ${c.iconWrapClassName} flex items-center justify-center shrink-0`}
                        >
                          <Icon size={24} />
                        </div>
                        <div>
                          <div className="font-serif text-lg text-flora-dark">{c.title}</div>
                          <p className="text-flora-dark/60 font-serif text-base leading-relaxed mt-1">{c.note}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: compact 4-corner layout + center circle */}
              <div className="hidden md:block mt-8">
                <div className="mx-auto w-full max-w-5xl">
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-10 lg:gap-12 items-start">
                      {/* Top Left */}
                      {(() => {
                        const c = gaiaCapabilities[0];
                        const Icon = c.Icon;
                        return (
                          <div className="h-fit rounded-4xl bg-white/70 border border-white/70 p-5 lg:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-full ${c.iconWrapClassName} flex items-center justify-center shrink-0`}>
                                <Icon size={22} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-serif text-lg text-flora-dark">{c.title}</div>
                                  <span className="px-2.5 py-1 rounded-full bg-flora-primary/10 text-flora-primary text-xs font-sans">
                                    {c.tag}
                                  </span>
                                </div>
                                <p className="text-flora-dark/60 font-serif text-sm lg:text-base leading-relaxed mt-1.5">
                                  {c.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Top Right */}
                      {(() => {
                        const c = gaiaCapabilities[1];
                        const Icon = c.Icon;
                        return (
                          <div className="h-fit rounded-4xl bg-white/70 border border-white/70 p-5 lg:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-start gap-4 flex-row-reverse text-right">
                              <div className={`w-12 h-12 rounded-full ${c.iconWrapClassName} flex items-center justify-center shrink-0`}>
                                <Icon size={22} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-sans">
                                    {c.tag}
                                  </span>
                                  <div className="font-serif text-lg text-flora-dark">{c.title}</div>
                                </div>
                                <p className="text-flora-dark/60 font-serif text-sm lg:text-base leading-relaxed mt-1.5">
                                  {c.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bottom Left */}
                      {(() => {
                        const c = gaiaCapabilities[2];
                        const Icon = c.Icon;
                        return (
                          <div className="h-fit rounded-4xl bg-white/70 border border-white/70 p-5 lg:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-full ${c.iconWrapClassName} flex items-center justify-center shrink-0`}>
                                <Icon size={22} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  
                                  <div className="font-serif text-lg text-flora-dark">{c.title}</div>
                                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 text-xs font-sans">
                                    {c.tag}
                                  </span>
                                </div>
                                <p className="text-flora-dark/60 font-serif text-sm lg:text-base leading-relaxed mt-1.5">
                                  {c.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bottom Right */}
                      {(() => {
                        const c = gaiaCapabilities[3];
                        const Icon = c.Icon;
                        return (
                          <div className="h-fit rounded-4xl bg-white/70 border border-white/70 p-5 lg:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-start gap-4 flex-row-reverse text-right">
                              <div className={`w-12 h-12 rounded-full ${c.iconWrapClassName} flex items-center justify-center shrink-0`}>
                                <Icon size={22} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-full bg-flora-dark/10 text-flora-dark text-xs font-sans">
                                    {c.tag}
                                  </span>
                                  <div className="font-serif text-lg text-flora-dark">{c.title}</div>
                                </div>
                                <p className="text-flora-dark/60 font-serif text-sm lg:text-base leading-relaxed mt-1.5">
                                  {c.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Center circle overlay */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative w-64 lg:w-72 aspect-square rounded-full bg-flora-dark text-white shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent" />
                        <div className="relative h-full p-7 flex flex-col items-center justify-center text-center">
                          
                          <div className="font-serif text-2xl mt-2">Plan · Speak · See</div>
                          <p className="text-white/70 font-serif text-sm leading-relaxed mt-3 max-w-[22ch]">
                            一个更好坚持的养护闭环：<br />
                            理解问题 → 生成计划 → 执行与复盘
                          </p>
                          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-sans">
                              支持语音对话
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-sans">
                              支持上传图片
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-sans">
                              支持多轮对话
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Dialogue carousel */}
          <div className="mt-10 md:mt-14">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
              <div>
                <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base block">
                  Dialogue Examples
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-flora-dark mt-2">Real Questions, Real Guidance</h3>
              </div>
              <p className="text-flora-dark/60 font-serif text-base md:text-lg max-w-xl">
                展示 3 组典型场景：如何提问、Gaia 会如何把建议拆成可执行的步骤
              </p>
            </div>

            <div className="rounded-[2.5rem] bg-white/55 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
              <div className="px-8 md:px-10 py-8 md:py-10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeDemo.tags.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full bg-flora-primary/10 text-flora-primary text-sm font-sans"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous demo"
                      onClick={() => setDemoIndex((i) => (i - 1 + totalDemos) % totalDemos)}
                      className="w-10 h-10 rounded-full bg-white/70 border border-white/70 text-flora-dark flex items-center justify-center hover:bg-white transition"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next demo"
                      onClick={() => setDemoIndex((i) => (i + 1) % totalDemos)}
                      className="w-10 h-10 rounded-full bg-white/70 border border-white/70 text-flora-dark flex items-center justify-center hover:bg-white transition"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <div className="rounded-4xl bg-white/70 border border-white/70 p-6 md:p-7">
                    <div className="flex items-center gap-2 text-flora-dark/70 font-sans text-sm mb-3">
                      <span className="w-2 h-2 rounded-full bg-flora-primary/60" />
                      <span>You</span>
                      <span className="text-flora-dark/40">·</span>
                      <span className="text-flora-dark/50">User</span>
                    </div>
                    <p className="text-flora-dark font-serif text-lg leading-relaxed">{activeDemo.user}</p>
                  </div>

                  <div className="rounded-4xl bg-flora-dark text-white p-6 md:p-7 shadow-sm">
                    <div className="flex items-center gap-2 text-white/80 font-sans text-sm mb-3">
                      <span className="w-2 h-2 rounded-full bg-white/70" />
                      <span>Gaia</span>
                      <span className="text-white/40">·</span>
                      <span className="inline-flex items-center gap-2">
                        <Volume2 size={16} />
                        <span className="text-white/70">Assistant</span>
                      </span>
                    </div>
                    <p className="text-white/80 font-serif text-lg leading-relaxed">{activeDemo.gaia}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2">
                  {dialogueDemos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Select demo ${idx + 1}`}
                      onClick={() => setDemoIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === demoIndex ? 'w-10 bg-flora-primary/70' : 'w-2.5 bg-flora-dark/15 hover:bg-flora-dark/25'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Multimodal showcase */}
          <div className="mt-10 md:mt-14">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
              <div>
                <span className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base block">
                  Multimodal Snapshot
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-flora-dark mt-2">See the Answer Structure</h3>
              </div>
              <p className="text-flora-dark/60 font-serif text-base md:text-lg max-w-xl">
                展示“图片问诊”的交流方式：诊断要点、建议步骤和注意事项清晰分区
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-[2.5rem] bg-white/55 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="p-6 md:p-8">
                  <div className="relative aspect-4/3 rounded-4xl overflow-hidden bg-white/70 border border-white/70">
                    <Image
                      src="/svg/leaf-issue.svg"
                      alt="Leaf issue example"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-5 text-flora-dark/60 font-serif text-base leading-relaxed">
                    示例：叶尖发黄 / 轻微干枯（仅用于展示多模态交流场景）
                  </div>
                </div>
              </div>

              <div className="rounded-[2.5rem] bg-white/55 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="p-6 md:p-8">
                  <div className="rounded-4xl bg-white/70 border border-white/70 p-6 md:p-7">
                    <div className="font-serif text-xl text-flora-dark mb-3">Diagnosis Highlights</div>
                    <ul className="text-flora-dark/60 font-serif text-base leading-relaxed space-y-2">
                      <li>叶尖干黄更像水分波动和空气偏干的组合信号</li>
                      <li>若伴随晒斑或靠窗侧更严重，有可能是日照过强</li>
                    </ul>

                    <div className="mt-6 font-serif text-xl text-flora-dark mb-3">Action Steps</div>
                    <ul className="text-flora-dark/60 font-serif text-base leading-relaxed space-y-2">
                      <li>先检查土表浅层的干湿程度，按“见干见湿”浇水</li>
                      <li>把植物移离直晒位置 30 至 60cm，观察 3 到 5 天变化</li>
                      <li>若室内偏干，优先提升空气湿度</li>
                    </ul>

                    <div className="mt-6 font-serif text-xl text-flora-dark mb-3">Notes</div>
                    <ul className="text-flora-dark/60 font-serif text-base leading-relaxed space-y-2">
                      <li>避免“少量多次”浅浇水，容易导致根系缺氧</li>
                      <li>新叶恢复比旧叶更重要，重点观察新叶状态</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="more" className="relative w-full py-24 px-6 md:px-12 bg-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-flora-primary font-bold tracking-widest uppercase text-lg mb-3 block">More</span>
            <h2 className="font-serif text-4xl md:text-6xl text-flora-dark mb-6">The Digital Ecology</h2>
            <p className="text-flora-dark/60 font-serif text-xl">数据、计划与日常习惯，汇成可持续的养护体验</p>
          </div>
          
          {/* Bento Grid 容器 - 移除固定高度，改用 min-h 和 auto-rows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
            
            {/* 1. 大卡片 (Core Feature) */}
            <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-[2.5rem] bg-flora-dark text-white p-8 md:p-12 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 min-h-100">
              <div className="relative z-10 max-w-lg">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/10">
                  <CloudRain size={28} />
                </div>
                <h3 className="font-serif text-4xl md:text-5xl mb-6">Weather Station</h3>
                <p className="text-white/70 leading-relaxed text-xl font-serif">
                  把天气变成真正可用的养护信号：<br />
                  同步本地天气与趋势，记录历史变化，并在你手动刷新时获取最新数据，帮助你判断是否需要通风、补水或调整摆放位置
                </p>
              </div>
              
              <div className="mt-8 flex items-center gap-4 text-sm font-medium text-flora-primary font-sans">
                  <span>View Weather Trends</span>
                  <div className="w-8 h-px bg-flora-primary"></div>
              </div>

              {/* 装饰性大圆 */}
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-flora-primary rounded-full blur-[100px] opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" />
            </div>

            {/* 2. 中卡片 - Smart Care */}
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-center hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl group">
              <div className="w-12 h-12 rounded-full bg-flora-primary/10 text-flora-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Notebook size={24} />
              </div>
              <h3 className="font-serif text-3xl text-flora-dark mb-3">Care Board</h3>
              <p className="text-flora-dark/60 leading-relaxed font-serif text-lg">
                把分散的建议收进一张看板：<br />
                关键注意事项与天气风险提示清晰呈现
              </p>
            </div>

            {/* 3. 中卡片 - Collection Status */}
            <div className="bg-flora-sprout/30 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-center items-center text-center hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl">
              <div className="relative mb-6">
                 <Droplets className="text-flora-primary" size={40} />
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                 </span>
              </div>
              
              <div className="text-5xl font-serif font-bold text-flora-dark mb-2">{plantsCount}</div>
              <div className="text-xs uppercase tracking-widest text-flora-dark/60 mb-6 font-sans">Plants Collected</div>
              
              <div className="w-full bg-white/40 rounded-full h-3 overflow-hidden">
                <div className="bg-flora-primary h-full rounded-full shadow-sm" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-2 text-xs text-flora-dark/50 self-end font-sans">Next Level: {nextLevel}</div>
            </div>

          </div>
        </div>
      </section>

      {/* --- Footer: Developer Info (开发者信息) --- */}
      <footer id="dev" className="relative w-full px-6 md:px-12 py-14 bg-white/20 backdrop-blur-sm border-t border-white/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-flora-primary font-bold tracking-widest uppercase text-sm md:text-base">Developed By</div>
              <div className="mt-2 font-serif text-2xl text-flora-dark">Eucalypriccio</div>
              <p className="mt-2 text-flora-dark/60 font-serif text-base leading-relaxed">
                Hope you can find peacefulness in this website :)
              </p>
            </div>

            <div className="rounded-4xl bg-white/60 backdrop-blur-md border border-white/60 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-flora-dark/70 font-sans text-xs tracking-widest uppercase">GitHub Repository</div>
              <a
                href="https://github.com/Eucalypriccio/FloraWhisper"
                target="_blank"
                rel="noreferrer"
                className="mt-2 block font-serif text-lg text-flora-dark hover:text-flora-primary transition-colors break-all"
              >
                FloraWhisper
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/40 text-center text-flora-dark/45 font-sans text-xs tracking-widest uppercase">
            FloraWhisper · {new Date().getFullYear()}
          </div>
        </div>
      </footer>

    </main>
  );
}