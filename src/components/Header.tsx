'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DarkModeToggle from '@/components/DarkModeToggle';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 shadow-lg bg-white/90 text-black dark:bg-zinc-900/95 dark:text-white border-b border-gray-200 dark:border-zinc-700 backdrop-blur-md">
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition">
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Link href="/" className="flex items-center space-x-2 text-xl font-extrabold tracking-tight text-green-600 dark:text-green-400">
            <Image src="/img/logo.png" alt="FC INFO SUPPORT 로고" width={28} height={28} className="drop-shadow-sm" />
            <span>FC INFO SUPPORT</span>
          </Link>
        </div>

        <div>
          <DarkModeToggle />
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="w-64 bg-white dark:bg-zinc-900 h-full text-zinc-800 dark:text-zinc-100 shadow-lg z-50 p-5 animate-slide-in">
            <button className="text-xl mb-6 hover:text-red-500 transition" onClick={() => setMenuOpen(false)}>✕ 닫기</button>
            <nav className="flex flex-col space-y-4">
              <Link href="/" className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setMenuOpen(false)}>🏠 홈</Link>
              <Link href="/bbs/pickrate" className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setMenuOpen(false)}>🎯 픽률 조회</Link>
              <Link href="/bbs/teamcolor" className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setMenuOpen(false)}>📊 팀컬러 조회</Link>
              <Link href="/bbs/efficiency" className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setMenuOpen(false)}>⚡ 효율 조회</Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
