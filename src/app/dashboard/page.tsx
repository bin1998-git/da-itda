'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Module {
  slug: string;
  label: string;
  is_active: boolean;
}

const moduleIcons: Record<string, string> = {
  commerce: '🛒',
  media: '🎬',
  community: '💬',
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [modules, setModules] = useState<Module[]>([]);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setUsername(data?.username ?? ''));

    supabase
      .from('modules')
      .select('*')
      .then(({ data }) => setModules(data ?? []));
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-black pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-1">
          안녕하세요, {username} 님 👋
        </h1>
        <p className="text-white/40 mb-12">다잇다 대시보드</p>

        <h2 className="text-sm font-semibold text-white/40 mb-4 uppercase tracking-widest">
          서비스 모듈
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.slug}
              className={`rounded-2xl border p-6 flex flex-col gap-3 transition
                ${mod.is_active
                  ? 'border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer'
                  : 'border-white/10 bg-white/[0.02] opacity-40 cursor-not-allowed'
                }`}
            >
              <span className="text-3xl">{moduleIcons[mod.slug]}</span>
              <div>
                <p className="text-white font-semibold">{mod.label}</p>
                <p className="text-white/40 text-sm">{mod.is_active ? '활성화됨' : '준비 중'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
