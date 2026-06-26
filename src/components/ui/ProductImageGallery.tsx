'use client';

import { useState, useEffect } from 'react';

interface Props {
  images: string[];
  title: string;
  categoryEmoji: string;
}

export default function ProductImageGallery({ images, title, categoryEmoji }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-gradient-to-br from-amber-500/10 to-orange-500/5 aspect-square flex items-center justify-center">
        <span className="text-9xl">{categoryEmoji}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden aspect-square relative">
      {/* 이미지 */}
      <img
        src={images[current]}
        alt={`${title} ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-500"
        key={current}
      />

      {/* 인디케이터 (2장 이상일 때만) */}
      {images.length > 1 && (
        <>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === current ? 'bg-white w-4' : 'bg-white/50 w-1.5'
                }`}
              />
            ))}
          </div>
          {/* 좌/우 버튼 */}
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
