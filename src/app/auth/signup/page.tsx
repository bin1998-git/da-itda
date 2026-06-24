'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    birthDate: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').update({
        full_name: form.fullName,
        birth_date: form.birthDate,
        phone: form.phone,
        username: form.fullName,
      }).eq('id', data.user.id);
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-white mb-2">이메일을 확인하세요</h2>
          <p className="text-white/50">{form.email} 로 인증 메일을 보냈습니다.</p>
          <Link href="/auth/login" className="mt-6 inline-block text-white/60 hover:text-white text-sm underline">
            로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">회원가입</h1>
        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="이름"
            value={form.fullName}
            onChange={set('fullName')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
          />
          <input
            type="date"
            placeholder="생년월일"
            value={form.birthDate}
            onChange={set('birthDate')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40 [color-scheme:dark]"
          />
          <input
            type="email"
            placeholder="이메일"
            value={form.email}
            onChange={set('email')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
          />
          <input
            type="tel"
            placeholder="전화번호 (010-0000-0000)"
            value={form.phone}
            onChange={set('phone')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={form.password}
            onChange={set('password')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={form.passwordConfirm}
            onChange={set('passwordConfirm')}
            required
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50"
          >
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>
        <p className="text-white/40 text-sm text-center mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-white hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
