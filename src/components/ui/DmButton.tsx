'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DmButton({ targetUserId }: { targetUserId: string }) {
  const user   = useAuthStore((s) => s.user);
  const router = useRouter();

  if (!user || user.id === targetUserId) return null;

  return (
    <button
      onClick={() => router.push(`/chat/dm/${targetUserId}`)}
      className="text-stone-400 dark:text-white/30 text-xs hover:text-emerald-500 transition flex items-center gap-1"
      title="DM 보내기"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      DM
    </button>
  );
}
