import type { Metadata } from "next";
// 1. 修改这里：引入你想要的英文字体 (Cinzel) 和中文字体 (Noto_Serif_SC)
import { Cinzel, Noto_Serif_SC, Lato } from "next/font/google"; 
import "./globals.css";
import "./gaia-widget.css";
import BgmPlayer from "@/components/overlay/BgmPlayer";
import GaiaWidget from "@/components/avatar/GaiaWidget";

// 2. 配置英文字体 (装饰性标题)
const cinzel = Cinzel({ 
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-cinzel", // 定义 CSS 变量名
  display: "swap",
});

// 3. 配置中文字体 (优雅的宋体)
const notoserifSC = Noto_Serif_SC({
  subsets: ["latin"], // 注意：Next.js 会自动按需加载中文子集
  weight: ["700", "800", "900"], // 指定需要的字重，减少体积
  variable: "--font-noto-serif", // 定义 CSS 变量名
  display: "swap",
});

// 4. 配置正文/无衬线字体 (用于功能性文字)
const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FloraWhisper | 听见植物的低语",
  description: "A healing space for your digital garden.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      {/* 5. 将这三个变量全部注入到 body 的 className 中 */}
      <body className={`
        ${cinzel.variable} 
        ${notoserifSC.variable} 
        ${lato.variable} 
        bg-flora-bg text-flora-dark antialiased
      `}>
        <BgmPlayer src="/audios/Moss_Grotto.mp3" volume={0.25} />
        <GaiaWidget />
        {children}
      </body>
    </html>
  );
}