'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function SignupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [form, setForm] = useState({
    fullName: '', birthDate: '', email: '', phone: '', password: '', passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard');
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = key === 'phone' ? formatPhone(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

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
          {[
            { key: 'fullName', placeholder: '이름', type: 'text' },
            { key: 'email', placeholder: '이메일', type: 'email' },
            { key: 'phone', placeholder: '전화번호 (010-0000-0000)', type: 'tel' },
            { key: 'password', placeholder: '비밀번호 (6자 이상)', type: 'password' },
            { key: 'passwordConfirm', placeholder: '비밀번호 확인', type: 'password' },
          ].map(({ key, placeholder, type }) => (
            <input
              key={key}
              type={type}
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={set(key)}
              required
              className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/40"
            />
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-white/40 text-xs px-1">생년월일</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={set('birthDate')}
              required
              className="px-4 py-3 rounded-xl bg-white/10 text-white border border-white/10 focus:outline-none focus:border-white/40 [color-scheme:dark]"
            />
          </div>
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
          <Link href="/auth/login" className="text-white hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
