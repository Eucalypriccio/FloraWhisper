'use client';
import Image from 'next/image';

export default function GardenBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-50">
      
      {/* 1. 核心背景层 (z-0) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pics/garden_bg.png"
          alt="Garden Background"
          fill
          priority
          className="object-cover"
          // 如果你的 next.config.ts 没配置 quality，请删除下面这行
          quality={90} 
        />
        {/* 遮罩：为了让装饰物看清，遮罩稍微加深一点点 */}
        <div className="absolute inset-0 bg-flora-bg/40 backdrop-blur-[2px]" />
      </div>

      {/* 2. 氛围层 (z-10) - 增强可见度 */}
      <div className="relative z-10 w-full h-full">
          {/* 左上角光晕：加亮，使用叠加模式 */}
          <div className="absolute top-0 left-0 w-150 h-150 bg-flora-sprout/30 rounded-full blur-[100px] -translate-x-1/3 -translate-y-1/3 mix-blend-screen" />
          
          {/* 右下角光晕：加深，使用主色 */}
          <div className="absolute bottom-0 right-0 w-125 h-125 bg-flora-primary/10 rounded-full blur-[80px] translate-x-1/3 translate-y-1/3 mix-blend-multiply" />
      </div>

    </div>
  );
}