'use client';
import Image from 'next/image'; // 1. 引入 Next.js 图片组件
import { Leaf } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';

export default function NatureBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      
      {/* --- 新增部分开始：本地背景图层 --- */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pics/background.png" // 你的图片路径 (在 public 文件夹下)
          alt="Nature Background"
          fill // 自动铺满父容器
          priority // 优先加载
          className="object-cover" // 保持比例裁剪填充
          quality={90}
        />
        
        {/* 关键魔法：添加一层“滤镜蒙版” */}
        {/* 这层蒙版确保图片不会太抢眼，并统一成网站的淡绿色调 */}
        <div className="absolute inset-0 bg-flora-bg/5 backdrop-blur-[2px]" />
        {/* 
           参数解释：
           bg-flora-bg/85: 使用品牌背景色，85% 不透明度 (数字越小，图片越清晰；数字越大，越朦胧)
           backdrop-blur-[2px]: 给图片加一点点模糊，让它更像背景
        */}
      </div>
      {/* --- 新增部分结束 --- */}

      {/* 粒子层：来自 Scene.tsx 的漂浮粒子效果，整合到背景中 */}
      <div className="absolute inset-0 z-10 opacity-80">
        <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.8} />
          <Sparkles
            count={100}
            scale={5}
            size={4}
            speed={0.4}
            opacity={0.7}
            color="#D6E4C6"
          />
        </Canvas>
      </div>

      {/* 原有的光晕 (稍微调高 z-index 确保浮在图片上) */}
      <div className="relative z-5">
          <div className="absolute top-0 left-0 w-125 h-125 bg-flora-sprout/40 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 mix-blend-overlay" />
          <div className="absolute bottom-0 right-0 w-150 h-150 bg-flora-secondary/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 mix-blend-multiply" />
      </div>

      {/* 原有的漂浮元素 (保持不变，增加 z-index) */}
      <div className="relative z-20">
        <Leaf 
          className="absolute top-1/4 left-10 text-flora-secondary/40 animate-float-slow" 
          size={48} 
          style={{ animationDelay: '0s' }}
        />
        <Leaf 
          className="absolute top-3/4 right-20 text-flora-primary/30 animate-float-slow rotate-45" 
          size={64} 
          style={{ animationDelay: '2s' }}
        />
      </div>
    </div>
  );
}