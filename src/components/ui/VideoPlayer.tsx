'use client';

import { useRef, useState } from 'react';

export default function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="w-full h-full object-cover"
        playsInline
      />

      {/* 재생/일시정지 오버레이 */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={toggle}
      >
        {!playing && (
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="h-1 bg-white/20 rounded-full cursor-pointer"
          onClick={seek}
        >
          <div
            className="h-full bg-rose-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
