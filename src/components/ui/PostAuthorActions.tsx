'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function PostAuthorActions({ postId, authorId }: { postId: string; authorId: string }) {
  const user    = useAuthStore((s) => s.user);
  const router  = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user || user.id !== authorId) return null;

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('posts').delete().eq('id', postId);
    router.push('/community');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/community/write?id=${postId}`}
        className="text-stone-300 dark:text-white/20 text-xs hover:text-sky-400 transition"
      >
        수정
      </Link>
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="text-stone-300 dark:text-white/20 text-xs hover:text-rose-400 transition"
        >
          삭제
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-rose-400 text-xs">삭제할까요?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition disabled:opacity-40"
          >
            확인
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="text-xs text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
