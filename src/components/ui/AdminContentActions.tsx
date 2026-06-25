'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  contentType: 'post' | 'media' | 'product';
  contentId: string;
  redirectTo: string;
  /** 상품은 비공개 처리도 가능 */
  showToggleActive?: boolean;
  isActive?: boolean;
}

const TABLE: Record<string, string> = {
  post:    'posts',
  media:   'media_posts',
  product: 'products',
};

export default function AdminContentActions({
  contentType, contentId, redirectTo, showToggleActive, isActive,
}: Props) {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [confirm, setConfirm] = useState(false);
  const [active, setActive] = useState(isActive ?? true);

  if (!isAdmin) return null;

  const handleDelete = async () => {
    await supabase.from(TABLE[contentType]).delete().eq('id', contentId);
    router.push(redirectTo);
    router.refresh();
  };

  const handleToggleActive = async () => {
    await supabase.from('products').update({ is_active: !active }).eq('id', contentId);
    setActive((v) => !v);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 tracking-widest">
        ADMIN
      </span>

      {showToggleActive && (
        <button
          onClick={handleToggleActive}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            active
              ? 'border-white/10 text-white/40 hover:text-white hover:bg-white/6'
              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8'
          }`}
        >
          {active ? '비공개 처리' : '공개 처리'}
        </button>
      )}

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/20 text-rose-400/60 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/6 transition"
        >
          콘텐츠 삭제
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-rose-400 text-xs">정말 삭제할까요?</span>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-400 transition"
          >
            삭제
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:bg-white/5 transition"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
