'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          roadAddress: string;
          jibunAddress: string;
          zonecode: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

interface Props {
  value: string;
  onChange: (address: string, zonecode: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export default function AddressInput({ value, onChange, placeholder, inputClassName }: Props) {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || document.querySelector('script[src*="postcode.v2.js"]')) {
      loaded.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    loaded.current = true;
  }, []);

  const openSearch = () => {
    if (typeof window === 'undefined' || !window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        onChange(data.roadAddress, data.zonecode);
      },
    }).open();
  };

  const base = inputClassName ?? 'w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition';

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        readOnly
        onClick={openSearch}
        placeholder={placeholder ?? '주소 검색 버튼을 클릭하세요'}
        className={`${base} cursor-pointer`}
      />
      <button
        type="button"
        onClick={openSearch}
        className="shrink-0 px-3 py-2.5 rounded-xl bg-black/8 dark:bg-white/8 border border-black/12 dark:border-white/12 text-stone-500 dark:text-white/55 text-xs font-medium hover:bg-black/14 dark:hover:bg-white/14 hover:text-stone-900 dark:hover:text-white transition whitespace-nowrap"
      >
        주소 검색
      </button>
    </div>
  );
}
