'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type Tab = 'overview' | 'profile' | 'posts' | 'media' | 'likes';
type LikesSubTab = 'media' | 'posts';

interface Post {
  id: string; title: string; category: string;
  views: number; created_at: string;
  like_count: number; comment_count: number;
}
interface MediaPost {
  id: string; title: string; thumbnail_url: string | null;
  views: number; tags: string[]; created_at: string; like_count: number;
}
interface LikedMedia {
  post_id: string;
  media: { id: string; title: string; thumbnail_url: string | null; created_at: string } | null;
}
interface LikedPost {
  post_id: string;
  post: { id: string; title: string; category: string; created_at: string } | null;
}

const CAT: Record<string, { label: string; cls: string }> = {
  question: { label: '질문',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  recipe:   { label: '레시피', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  review:   { label: '후기',   cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  general:  { label: '자유',   cls: 'bg-white/8 text-white/45 border-white/10' },
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'profile',  label: '프로필 수정' },
  { id: 'posts',    label: '내 게시글' },
  { id: 'media',    label: '내 영상' },
  { id: 'likes',    label: '찜 목록' },
];

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [tab, setTab] = useState<Tab>('overview');
  const [likesSubTab, setLikesSubTab] = useState<LikesSubTab>('media');
  const [tabLoading, setTabLoading] = useState(false);

  // profile
  const [profile, setProfile] = useState({ full_name: '', username: '', avatar_url: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSeller, setIsSeller] = useState(false);

  // stats
  const [stats, setStats] = useState({ posts: 0, media: 0, likes: 0, cart: 0 });

  // overview previews
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaPost[]>([]);

  // tab data
  const [myPosts,    setMyPosts]    = useState<Post[]>([]);
  const [myMedia,    setMyMedia]    = useState<MediaPost[]>([]);
  const [likedMedia, setLikedMedia] = useState<LikedMedia[]>([]);
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);

  // auth guard
  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  // helpers to enrich post with counts
  const enrichPosts = useCallback(async (rows: Omit<Post, 'like_count' | 'comment_count'>[]): Promise<Post[]> => {
    return Promise.all(rows.map(async (p) => {
      const [{ count: lk }, { count: cm }] = await Promise.all([
        supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
      ]);
      return { ...p, like_count: lk ?? 0, comment_count: cm ?? 0 };
    }));
  }, []);

  const enrichMedia = useCallback(async (rows: Omit<MediaPost, 'like_count'>[]): Promise<MediaPost[]> => {
    return Promise.all(rows.map(async (m) => {
      const { count } = await supabase.from('media_likes').select('*', { count: 'exact', head: true }).eq('post_id', m.id);
      return { ...m, like_count: count ?? 0 };
    }));
  }, []);

  // initial load: profile + stats + overview previews
  useEffect(() => {
    if (!user) return;

    supabase.from('profiles').select('full_name, username, avatar_url, phone').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile({
          full_name:  data.full_name  || user.user_metadata?.full_name || '',
          username:   data.username   || '',
          avatar_url: data.avatar_url || user.user_metadata?.avatar_url || '',
          phone:      data.phone      || '',
        });
      });

    supabase.from('sellers').select('id').eq('id', user.id).maybeSingle()
      .then(({ data }) => setIsSeller(!!data));

    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('media_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('media_likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([p, m, pl, ml, c]) =>
      setStats({ posts: p.count ?? 0, media: m.count ?? 0, likes: (pl.count ?? 0) + (ml.count ?? 0), cart: c.count ?? 0 })
    );

    // overview previews (3개씩)
    supabase.from('posts').select('id, title, category, views, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(3)
      .then(async ({ data }) => {
        if (data) setRecentPosts(await enrichPosts(data));
      });

    supabase.from('media_posts').select('id, title, thumbnail_url, views, tags, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(3)
      .then(async ({ data }) => {
        if (data) setRecentMedia(await enrichMedia(data));
      });
  }, [user, enrichPosts, enrichMedia]);

  // tab data load
  useEffect(() => {
    if (!user) return;

    if (tab === 'posts') {
      setTabLoading(true);
      supabase.from('posts').select('id, title, category, views, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(100)
        .then(async ({ data }) => {
          if (data) setMyPosts(await enrichPosts(data));
          setTabLoading(false);
        });
    }

    if (tab === 'media') {
      setTabLoading(true);
      supabase.from('media_posts').select('id, title, thumbnail_url, views, tags, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(100)
        .then(async ({ data }) => {
          if (data) setMyMedia(await enrichMedia(data));
          setTabLoading(false);
        });
    }

    if (tab === 'likes') {
      setTabLoading(true);
      Promise.all([
        supabase.from('media_likes').select('post_id, media_posts(id, title, thumbnail_url, created_at)')
          .eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('post_likes').select('post_id, posts(id, title, category, created_at)')
          .eq('user_id', user.id).order('created_at', { ascending: false }),
      ]).then(([ml, pl]) => {
        if (ml.data) setLikedMedia(ml.data.map((d: any) => ({ post_id: d.post_id, media: d.media_posts })));
        if (pl.data) setLikedPosts(pl.data.map((d: any) => ({ post_id: d.post_id, post: d.posts })));
        setTabLoading(false);
      });
    }
  }, [tab, user, enrichPosts, enrichMedia]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase.from('profiles').update({
      full_name:  profile.full_name,
      username:   profile.username,
      avatar_url: profile.avatar_url,
      phone:      profile.phone,
    }).eq('id', user.id);
    setSaveMsg(error
      ? { ok: false, text: '저장 실패: ' + error.message }
      : { ok: true,  text: '저장됐습니다.' }
    );
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id);
    setMyPosts((prev) => prev.filter((p) => p.id !== id));
    setRecentPosts((prev) => prev.filter((p) => p.id !== id));
    setStats((s) => ({ ...s, posts: Math.max(0, s.posts - 1) }));
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '회원';
  const avatarSrc   = profile.avatar_url || user.user_metadata?.avatar_url || '';

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-[60px]">

      {/* ── 프로필 헤더 ── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-24 bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-8 relative flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* 아바타 */}
          {avatarSrc ? (
            <img src={avatarSrc} alt="프로필" referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-2xl shadow-lg shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          {/* 이름·이메일 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {profile.username && <span className="text-white/35 text-sm">@{profile.username}</span>}
              {isSeller && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">판매자</span>
              )}
            </div>
            <p className="text-white/40 text-sm mt-0.5 truncate">{user.email}</p>
            <p className="text-white/25 text-xs mt-1">가입일: {fmt(user.created_at ?? new Date().toISOString())}</p>
          </div>

          {/* 스탯 배지 */}
          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            {[
              { label: '게시글', value: stats.posts },
              { label: '영상',   value: stats.media },
              { label: '찜',     value: stats.likes },
              { label: '장바구니', value: stats.cart },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-white/30 text-[11px] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 탭 네비 ── */}
      <div className="border-b border-white/[0.06] sticky top-[60px] z-20 bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 flex overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id ? 'text-amber-400 border-amber-400' : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ────────────── 개요 탭 ────────────── */}
        {tab === 'overview' && (
          <div className="space-y-10">

            {/* 빠른 이동 */}
            <div>
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-4">빠른 이동</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '식품 마켓',  href: '/market',    icon: '🛒', c: 'hover:border-amber-500/40' },
                  { label: '푸드 미디어', href: '/media',    icon: '🎬', c: 'hover:border-rose-500/40' },
                  { label: '커뮤니티',   href: '/community', icon: '💬', c: 'hover:border-emerald-500/40' },
                  { label: '장바구니',   href: '/cart',      icon: '🛍️', c: 'hover:border-violet-500/40' },
                ].map(({ label, href, icon, c }) => (
                  <Link key={label} href={href}
                    className={`flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/3 transition ${c}`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-white/55 text-sm font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 최근 게시글 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">최근 게시글</p>
                <button onClick={() => setTab('posts')} className="text-amber-400/60 text-xs hover:text-amber-400 transition">전체 보기 →</button>
              </div>
              {recentPosts.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-white/2 p-8 text-center">
                  <p className="text-white/30 text-sm">아직 작성한 게시글이 없습니다.</p>
                  <Link href="/community/write" className="mt-2 inline-block text-amber-400/60 hover:text-amber-400 text-xs transition">첫 글 작성하기 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentPosts.map((p) => {
                    const cat = CAT[p.category] ?? CAT.general;
                    return (
                      <Link key={p.id} href={`/community/${p.id}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2 hover:bg-white/4 transition group"
                      >
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                        <span className="text-white/65 text-sm flex-1 truncate group-hover:text-white transition">{p.title}</span>
                        <span className="text-white/25 text-xs shrink-0 hidden sm:block">
                          💬{p.comment_count} · ❤️{p.like_count}
                        </span>
                        <span className="text-white/20 text-xs shrink-0">{fmt(p.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 최근 영상 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">최근 업로드 영상</p>
                <button onClick={() => setTab('media')} className="text-rose-400/60 text-xs hover:text-rose-400 transition">전체 보기 →</button>
              </div>
              {recentMedia.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-white/2 p-8 text-center">
                  <p className="text-white/30 text-sm">아직 업로드한 영상이 없습니다.</p>
                  <Link href="/media/upload" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">첫 영상 올리기 →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recentMedia.map((m) => (
                    <Link key={m.id} href={`/media/${m.id}`}
                      className="rounded-xl border border-white/6 bg-white/2 overflow-hidden hover:border-white/15 transition"
                    >
                      <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
                        {m.thumbnail_url
                          ? <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                          : <span className="text-4xl">🎬</span>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-white/65 text-sm truncate">{m.title}</p>
                        <p className="text-white/30 text-xs mt-1">👁 {m.views} · ❤️ {m.like_count}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 판매자 센터 CTA */}
            {isSeller ? (
              <Link href="/market/sell"
                className="flex items-center gap-4 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/8 transition"
              >
                <span className="text-3xl">🏪</span>
                <div>
                  <p className="text-amber-400 font-semibold text-sm">판매자 센터</p>
                  <p className="text-white/40 text-xs mt-0.5">내 상품 관리 및 새 상품 등록</p>
                </div>
                <span className="ml-auto text-amber-400/50 text-sm">→</span>
              </Link>
            ) : (
              <Link href="/market/sell"
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/2 hover:bg-white/4 transition"
              >
                <span className="text-3xl">🏪</span>
                <div>
                  <p className="text-white/60 font-semibold text-sm">판매자 등록</p>
                  <p className="text-white/30 text-xs mt-0.5">내 상품을 직접 판매해보세요.</p>
                </div>
                <span className="ml-auto text-white/25 text-sm">→</span>
              </Link>
            )}
          </div>
        )}

        {/* ────────────── 프로필 수정 탭 ────────────── */}
        {tab === 'profile' && (
          <div className="max-w-md space-y-6">
            <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">프로필 수정</p>

            {/* 아바타 미리보기 */}
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="미리보기" referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-16 h-16 rounded-2xl object-cover border border-white/15 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-2xl shrink-0">
                  {(profile.full_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white/50 text-sm font-medium">프로필 사진</p>
                <p className="text-white/25 text-xs mt-0.5">URL 입력 시 실시간 미리보기</p>
              </div>
            </div>

            {/* 폼 필드 */}
            {([
              { key: 'full_name',  label: '이름',               placeholder: '홍길동',                 type: 'text' },
              { key: 'username',   label: '닉네임',              placeholder: 'gildong_hong',           type: 'text' },
              { key: 'avatar_url', label: '프로필 사진 URL',     placeholder: 'https://example.com/...', type: 'url'  },
              { key: 'phone',      label: '전화번호',             placeholder: '010-0000-0000',          type: 'tel'  },
            ] as { key: keyof typeof profile; label: string; placeholder: string; type: string }[]).map(({ key, label, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-2">
                <label className="text-white/45 text-sm">{label}</label>
                <input
                  type={type}
                  value={profile[key]}
                  onChange={(e) => { setProfile((p) => ({ ...p, [key]: e.target.value })); setSaveMsg(null); }}
                  placeholder={placeholder}
                  className="px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-amber-500/50 transition text-sm"
                />
              </div>
            ))}

            {/* 이메일 (읽기 전용) */}
            <div className="flex flex-col gap-2">
              <label className="text-white/45 text-sm">이메일</label>
              <input type="email" value={user.email ?? ''} disabled
                className="px-4 py-3 rounded-xl bg-white/3 text-white/30 border border-white/6 text-sm cursor-not-allowed" />
              <p className="text-white/20 text-xs px-1">이메일은 변경할 수 없습니다.</p>
            </div>

            {saveMsg && (
              <p className={`text-sm ${saveMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{saveMsg.text}</p>
            )}

            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        )}

        {/* ────────────── 내 게시글 탭 ────────────── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">내 게시글 ({stats.posts})</p>
              <Link href="/community/write"
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/8 transition"
              >
                + 새 글 작성
              </Link>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="rounded-xl border border-white/6 bg-white/2 p-12 text-center">
                <p className="text-white/30 text-sm">작성한 게시글이 없습니다.</p>
                <Link href="/community/write" className="mt-2 inline-block text-amber-400/60 hover:text-amber-400 text-xs transition">첫 글 작성하기 →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myPosts.map((p) => {
                  const cat = CAT[p.category] ?? CAT.general;
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2 group">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                      <Link href={`/community/${p.id}`} className="flex-1 min-w-0">
                        <p className="text-white/65 text-sm truncate group-hover:text-white transition">{p.title}</p>
                        <p className="text-white/25 text-xs mt-0.5">
                          👁 {p.views} · ❤️ {p.like_count} · 💬 {p.comment_count} · {fmt(p.created_at)}
                        </p>
                      </Link>
                      <button onClick={() => deletePost(p.id)}
                        className="text-white/15 hover:text-rose-400 transition text-xs shrink-0 px-2 py-1 rounded hover:bg-rose-500/8"
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────── 내 영상 탭 ────────────── */}
        {tab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">내 영상 ({stats.media})</p>
              <Link href="/media/upload"
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/8 transition"
              >
                + 영상 올리기
              </Link>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              </div>
            ) : myMedia.length === 0 ? (
              <div className="rounded-xl border border-white/6 bg-white/2 p-12 text-center">
                <p className="text-white/30 text-sm">업로드한 영상이 없습니다.</p>
                <Link href="/media/upload" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">첫 영상 올리기 →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myMedia.map((m) => (
                  <Link key={m.id} href={`/media/${m.id}`}
                    className="rounded-xl border border-white/6 bg-white/2 overflow-hidden hover:border-white/15 transition group"
                  >
                    <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
                      {m.thumbnail_url
                        ? <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        : <span className="text-4xl">🎬</span>
                      }
                    </div>
                    <div className="p-4">
                      <p className="text-white/65 text-sm font-medium truncate">{m.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-white/30 text-xs">
                        <span>👁 {m.views}</span>
                        <span>❤️ {m.like_count}</span>
                        <span className="ml-auto">{fmt(m.created_at)}</span>
                      </div>
                      {m.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] text-white/25 bg-white/5 rounded-full px-2 py-0.5">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ────────────── 찜 목록 탭 ────────────── */}
        {tab === 'likes' && (
          <div className="space-y-5">
            <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">찜 목록</p>

            {/* 서브탭 */}
            <div className="flex gap-2">
              {([['media', '영상 찜'], ['posts', '게시글 찜']] as [LikesSubTab, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setLikesSubTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    likesSubTab === id
                      ? 'bg-white/8 border-white/15 text-white'
                      : 'border-transparent text-white/35 hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : likesSubTab === 'media' ? (
              likedMedia.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-white/2 p-12 text-center">
                  <p className="text-white/30 text-sm">좋아요한 영상이 없습니다.</p>
                  <Link href="/media" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">영상 둘러보기 →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likedMedia.filter((d) => d.media).map(({ post_id, media }) => (
                    <Link key={post_id} href={`/media/${media!.id}`}
                      className="rounded-xl border border-white/6 bg-white/2 overflow-hidden hover:border-white/15 transition group"
                    >
                      <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
                        {media!.thumbnail_url
                          ? <img src={media!.thumbnail_url} alt={media!.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          : <span className="text-4xl">🎬</span>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-white/65 text-sm truncate">{media!.title}</p>
                        <p className="text-white/25 text-xs mt-1">{fmt(media!.created_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              likedPosts.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-white/2 p-12 text-center">
                  <p className="text-white/30 text-sm">좋아요한 게시글이 없습니다.</p>
                  <Link href="/community" className="mt-2 inline-block text-emerald-400/60 hover:text-emerald-400 text-xs transition">커뮤니티 둘러보기 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {likedPosts.filter((d) => d.post).map(({ post_id, post }) => {
                    const cat = CAT[post!.category] ?? CAT.general;
                    return (
                      <Link key={post_id} href={`/community/${post!.id}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2 hover:bg-white/4 transition group"
                      >
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                        <span className="text-white/65 text-sm flex-1 truncate group-hover:text-white transition">{post!.title}</span>
                        <span className="text-white/20 text-xs shrink-0">{fmt(post!.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

      </div>
    </main>
  );
}
