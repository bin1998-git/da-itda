'use client';

import { useEffect, useRef, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  children: React.ReactNode[];
}

export default function ProductDetailTabs({ tabs, children }: Props) {
  const [active, setActive] = useState(tabs[0].id);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // sticky 감지
  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    navRef.current?.parentElement?.insertBefore(sentinel, navRef.current);

    const observer = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting),
      { threshold: 1, rootMargin: '-72px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => { observer.disconnect(); sentinel.remove(); };
  }, []);

  const scrollTo = (idx: number) => {
    const el = sectionRefs.current[idx];
    if (!el) return;
    const offset = 120;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    setActive(tabs[idx].id);
  };

  // 스크롤 시 현재 탭 자동 업데이트
  useEffect(() => {
    const handler = () => {
      const offset = 140;
      for (let i = sectionRefs.current.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[i];
        if (el && el.getBoundingClientRect().top <= offset) {
          setActive(tabs[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [tabs]);

  return (
    <div>
      {/* ── Sticky 탭 네비게이션 ─────────────────────────────────────────── */}
      <div
        ref={navRef}
        className={`sticky top-[64px] z-30 transition-all duration-200 ${
          stuck
            ? 'bg-[#FAF8F5]/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md shadow-sm border-b border-black/8 dark:border-white/8'
            : 'bg-transparent'
        }`}
      >
        <div className="flex">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => scrollTo(idx)}
              className={`
                relative flex items-center gap-1.5 px-6 py-4 text-sm font-semibold transition-colors duration-150
                ${active === tab.id
                  ? 'text-stone-900 dark:text-white'
                  : 'text-stone-400 dark:text-white/35 hover:text-stone-600 dark:hover:text-white/60'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  active === tab.id
                    ? 'bg-amber-500 text-black'
                    : 'bg-black/8 dark:bg-white/10 text-stone-500 dark:text-white/40'
                }`}>
                  {tab.count}
                </span>
              )}
              {/* 활성 인디케이터 */}
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-200 ${
                active === tab.id ? 'bg-amber-500 opacity-100' : 'opacity-0'
              }`} />
            </button>
          ))}
        </div>
        <div className="h-px bg-black/8 dark:bg-white/8" />
      </div>

      {/* ── 탭 섹션 콘텐츠 ───────────────────────────────────────────────── */}
      {tabs.map((tab, idx) => (
        <div
          key={tab.id}
          ref={(el) => { sectionRefs.current[idx] = el; }}
          className="pt-10 pb-2"
        >
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">{tab.label}</h2>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-sm text-amber-500 font-semibold">{tab.count}</span>
            )}
            <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
          </div>
          {children[idx]}
        </div>
      ))}
    </div>
  );
}
