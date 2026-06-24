'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/10">
      <Link href="/" className="text-white font-bold text-xl tracking-tight">
        다잇다
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-white/50 text-sm">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full border border-white/20 text-white text-sm hover:bg-white/10 transition"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-white/70 text-sm hover:text-white transition">
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition"
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
