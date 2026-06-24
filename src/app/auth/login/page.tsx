'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    else router.push('/dashboard');
    setLoading(false);
  };

  const handleSocial = async (provider: 'google' | 'kakao' | 'apple') => {
    setSocialLoading(provider);
    if (provider === 'kakao') {
      await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'profile_nickname profile_image',
          queryParams: { scope: 'profile_nickname profile_image' },
        },
      });
    } else {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">다잇다</h1>
          <p className="text-white/40 text-sm mt-1">Connect Everything</p>
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-3 rounded-xl bg-white/8 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40 transition"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-3 rounded-xl bg-white/8 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40 transition"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">또는</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 소셜 로그인 */}
        <div className="flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={() => handleSocial('google')}
            disabled={!!socialLoading}
            className="flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {socialLoading === 'google' ? '연결 중...' : 'Google로 계속하기'}
          </button>

          {/* Kakao */}
          <button
            onClick={() => handleSocial('kakao')}
            disabled={!!socialLoading}
            className="flex items-center justify-center gap-3 py-3 rounded-xl font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.38c0 2.07 1.371 3.888 3.447 4.941l-.879 3.282c-.078.291.264.522.51.348l3.879-2.574c.177.015.357.023.543.023 4.142 0 7.5-2.634 7.5-5.88C16.5 4.134 13.142 1.5 9 1.5z" fill="#191919"/>
            </svg>
            {socialLoading === 'kakao' ? '연결 중...' : '카카오로 계속하기'}
          </button>

          {/* Apple */}
          <button
            onClick={() => handleSocial('apple')}
            disabled={!!socialLoading}
            className="flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-medium hover:bg-white/10 transition disabled:opacity-50"
          >
            <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
              <path d="M13.173 9.545c-.022-2.132 1.746-3.163 1.826-3.214-1-1.447-2.545-1.645-3.09-1.664-1.31-.133-2.566.775-3.232.775-.667 0-1.682-.758-2.768-.737-1.413.02-2.72.824-3.447 2.087C.88 9.18 1.88 13.46 3.41 15.8c.762 1.095 1.663 2.32 2.845 2.277 1.147-.045 1.577-.735 2.961-.735 1.384 0 1.775.735 2.987.712 1.23-.02 2.008-1.112 2.762-2.212.875-1.265 1.232-2.495 1.25-2.558-.027-.012-2.398-.92-2.042-3.739zM11.07 3.147C11.679 2.4 12.09 1.373 11.97.333c-.877.037-1.943.583-2.576 1.315-.565.652-1.06 1.697-.928 2.697.983.077 1.991-.497 2.604-1.198z"/>
            </svg>
            {socialLoading === 'apple' ? '연결 중...' : 'Apple로 계속하기'}
          </button>
        </div>

        <p className="text-white/30 text-sm text-center mt-6">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-white hover:underline">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
