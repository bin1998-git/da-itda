'use client';

import { useState } from 'react';

interface Props {
  title: string;
  price: number;
}

export default function ShareButton({ title, price }: Props) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 구형 브라우저 fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareKakao = () => {
    const text = encodeURIComponent(`🛒 ${title}\n${price.toLocaleString('ko-KR')}원\n\n${url}`);
    window.open(
      `https://sharer.kakao.com/talk/friends/picker/link?app_key=&text=${text}&url=${encodeURIComponent(url)}`,
      '_blank',
      'width=500,height=600',
    );
  };

  const shareNative = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} - ${price.toLocaleString('ko-KR')}원`, url });
      } else {
        await copyUrl();
      }
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name;
      if (name !== 'AbortError' && name !== 'InvalidStateError') await copyUrl();
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 링크 복사 */}
      <button
        onClick={copyUrl}
        title="링크 복사"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 hover:border-amber-500/30 hover:text-amber-500 dark:hover:text-amber-400 transition text-xs font-medium"
      >
        {copied ? (
          <>
            <span className="text-emerald-400">✓</span>
            <span className="text-emerald-400">복사됨</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>링크 복사</span>
          </>
        )}
      </button>

      {/* 공유 (모바일: 기본 공유 시트, 데스크탑: 링크 복사) */}
      <button
        onClick={shareNative}
        disabled={isSharing}
        title="공유하기"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 hover:border-amber-500/30 hover:text-amber-500 dark:hover:text-amber-400 transition text-xs font-medium disabled:opacity-50"
      >
        <span>↗</span>
        <span>공유</span>
      </button>
    </div>
  );
}
