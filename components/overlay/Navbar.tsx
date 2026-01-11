'use client';
import Link from 'next/link';
import { Rose } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 1. 引入 usePathname
import clsx from 'clsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname(); // 2. 获取当前路径

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Start', href: '#start' },
    { name: 'About', href: '#about' },
    { name: 'Gaia', href: '#gaia' },
    { name: 'More', href: '#more' },
    { name: 'Dev', href: '#dev' },
  ];

  return (
    <nav className={clsx(
      "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-4",
      scrolled ? "bg-white/70 backdrop-blur-md shadow-sm" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-start">
        <Link href="/" className="flex items-center gap-2 text-flora-primary cursor-pointer hover:scale-105 transition-transform">
          <Rose size={28} />
          <span className="font-serif text-2xl font-bold tracking-wide">FloraWhisper</span>
        </Link>

        <div className="flex gap-8 ml-10">
          {navLinks.map((link) => {
            // 3. 修复逻辑：如果不在主页，则在锚点前加 /
            const activeHref = pathname === '/' ? link.href : `/${link.href}`;
            
            return (
              <Link 
                key={link.name} 
                href={activeHref}
                className="relative group font-sans text-flora-dark/80 hover:text-flora-primary transition-colors text-md font-medium uppercase tracking-wider"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-flora-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}