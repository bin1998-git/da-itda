'use client';

import { useEffect, useState, useCallback } from 'react';

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AddressInput from '@/components/ui/AddressInput';
import Pagination from '@/components/ui/Pagination';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';
import SellerRevenueChart from '@/components/ui/SellerRevenueChart';

const POSTS_PER_PAGE = 10;
const MEDIA_PER_PAGE = 10;

type Tab = 'overview' | 'profile' | 'posts' | 'media' | 'likes' | 'wishlist' | 'chat' | 'seller';
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
interface WishlistProduct {
  product_id: string;
  products: { id: string; title: string; price: number; images: string[]; category: string } | null;
}
interface ChatRoomItem {
  id: string;
  name: string;
  category: string | null;
  creator_id: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

const CAT: Record<string, { label: string; cls: string }> = {
  question: { label: '질문',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  recipe:   { label: '레시피', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  review:   { label: '후기',   cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  general:  { label: '자유',   cls: 'bg-black/8 dark:bg-white/8 text-stone-500 dark:text-white/45 border-black/10 dark:border-white/10' },
};

interface SellerOrder {
  order_id: string;
  status: string;
  created_at: string;
  buyer_name: string | null;
  items: { title: string; quantity: number; selected_color: string | null }[];
}

const STATUS_OPTIONS = [
  { value: 'preparing', label: '배송준비' },
  { value: 'shipping',  label: '배송중' },
  { value: 'delivered', label: '배송완료' },
];

const TABS: { id: Tab; label: string; sellerOnly?: boolean }[] = [
  { id: 'overview',  label: '개요' },
  { id: 'profile',   label: '프로필 수정' },
  { id: 'posts',     label: '내 게시글' },
  { id: 'media',     label: '내 영상' },
  { id: 'likes',     label: '찜 목록' },
  { id: 'wishlist',  label: '위시리스트' },
  { id: 'chat',      label: '채팅방' },
  { id: 'seller',    label: '판매 정산', sellerOnly: true },
];

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [tab, setTab] = useState<Tab>('overview');
  const [likesSubTab, setLikesSubTab] = useState<LikesSubTab>('media');
  const [tabLoading, setTabLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);

  // profile
  const [profile, setProfile] = useState({ full_name: '', username: '', avatar_url: '', phone: '', address: '', address_detail: '' });
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
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [myChatRooms, setMyChatRooms] = useState<ChatRoomItem[]>([]);
  const [createdChatRooms, setCreatedChatRooms] = useState<ChatRoomItem[]>([]);
  const [chatSubTab, setChatSubTab] = useState<'joined' | 'created'>('joined');

  // seller dashboard
  interface SellerOrderItem {
    product_id: string;
    selected_color: string | null;
    quantity: number;
    price_at_time: number;
    product_title: string;
    product_image: string | null;
    order_status: string;
    order_created_at: string;
  }
  const [sellerItems, setSellerItems] = useState<SellerOrderItem[]>([]);
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([]);
  const [orderStatusUpdating, setOrderStatusUpdating] = useState<string | null>(null);

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

    supabase.from('profiles').select('full_name, username, avatar_url, phone, address, address_detail').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile({
          full_name:      data.full_name      || user.user_metadata?.full_name || '',
          username:       data.username       || '',
          avatar_url:     data.avatar_url     || user.user_metadata?.avatar_url || '',
          phone:          data.phone          || '',
          address:        data.address        || '',
          address_detail: data.address_detail || '',
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

    if (tab === 'wishlist') {
      setTabLoading(true);
      supabase.from('product_likes')
        .select('product_id, products(id, title, price, images, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setWishlist(data.map((d: any) => ({ product_id: d.product_id, products: d.products })));
          setTabLoading(false);
        });
    }

    if (tab === 'chat') {
      if (!user) return;
      setTabLoading(true);

      const joinedPromise = supabase
        .from('chat_room_members')
        .select('room_id, chat_rooms(id, name, category, creator_id)')
        .eq('user_id', user.id)
        .then(async ({ data }) => {
          const rooms = (data ?? []).map((d: any) => d.chat_rooms).filter(Boolean) as {
            id: string; name: string; category: string | null; creator_id: string | null;
          }[];
          const roomIds = rooms.map((r) => r.id);
          const { data: msgs } = roomIds.length > 0
            ? await supabase
                .from('chat_room_messages')
                .select('room_id, content, created_at')
                .in('room_id', roomIds)
                .order('created_at', { ascending: false })
                .limit(roomIds.length * 3)
            : { data: [] };
          const lastMap: Record<string, { content: string; created_at: string }> = {};
          (msgs ?? []).forEach((m: any) => { if (!lastMap[m.room_id]) lastMap[m.room_id] = m; });
          setMyChatRooms(rooms.map((r) => ({
            ...r,
            lastMessage: lastMap[r.id]?.content ?? null,
            lastMessageAt: lastMap[r.id]?.created_at ?? null,
          })));
        });

      const createdPromise = supabase
        .from('chat_rooms')
        .select('id, name, category, creator_id')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .then(async ({ data }) => {
          const rooms = data ?? [];
          const roomIds = rooms.map((r) => r.id);
          const { data: msgs } = roomIds.length > 0
            ? await supabase
                .from('chat_room_messages')
                .select('room_id, content, created_at')
                .in('room_id', roomIds)
                .order('created_at', { ascending: false })
                .limit(roomIds.length * 3)
            : { data: [] };
          const lastMap: Record<string, { content: string; created_at: string }> = {};
          (msgs ?? []).forEach((m: any) => { if (!lastMap[m.room_id]) lastMap[m.room_id] = m; });
          setCreatedChatRooms(rooms.map((r) => ({
            ...r,
            lastMessage: lastMap[r.id]?.content ?? null,
            lastMessageAt: lastMap[r.id]?.created_at ?? null,
          })));
        });

      Promise.all([joinedPromise, createdPromise]).finally(() => setTabLoading(false));
    }

    if (tab === 'seller') {
      setTabLoading(true);
      // 상품별 집계용
      supabase
        .from('order_items')
        .select('product_id, selected_color, quantity, price_at_time, products!inner(title, images, seller_id), orders(status, created_at)')
        .eq('products.seller_id', user.id)
        .then(({ data }) => {
          const rows = (data ?? []) as any[];
          setSellerItems(rows.map((r) => ({
            product_id:       r.product_id,
            selected_color:   r.selected_color ?? null,
            quantity:         r.quantity,
            price_at_time:    r.price_at_time,
            product_title:    r.products?.title ?? '',
            product_image:    r.products?.images?.[0] ?? null,
            order_status:     r.orders?.status ?? '',
            order_created_at: r.orders?.created_at ?? '',
          })));
        });

      // 주문별 관리용
      supabase.from('order_items')
        .select('order_id, title, quantity, selected_color, products!inner(seller_id), orders!inner(id, status, created_at, shipping_name)')
        .eq('products.seller_id', user.id)
        .neq('orders.status', 'cancelled')
        .then(({ data }) => {
          const rows = (data ?? []) as any[];
          const orderMap: Record<string, SellerOrder> = {};
          rows.forEach((r) => {
            const oid = r.order_id;
            if (!orderMap[oid]) {
              orderMap[oid] = {
                order_id:   oid,
                status:     r.orders?.status ?? '',
                created_at: r.orders?.created_at ?? '',
                buyer_name: r.orders?.shipping_name ?? null,
                items: [],
              };
            }
            orderMap[oid].items.push({
              title:          r.title,
              quantity:       r.quantity,
              selected_color: r.selected_color ?? null,
            });
          });
          setSellerOrders(Object.values(orderMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setTabLoading(false);
        });
    }
  }, [tab, user, enrichPosts, enrichMedia]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase.from('profiles').update({
      full_name:      profile.full_name,
      username:       profile.username,
      avatar_url:     profile.avatar_url,
      phone:          profile.phone,
      address:        profile.address || null,
      address_detail: profile.address_detail || null,
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
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '회원';
  const avatarSrc   = profile.avatar_url || user.user_metadata?.avatar_url || '';

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-[60px]">

      {/* ── 프로필 헤더 ── */}
      <div className="relative border-b border-black/5 dark:border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-24 bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-8 relative flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* 아바타 */}
          {avatarSrc ? (
            <img src={avatarSrc} alt="프로필" referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border border-black/10 dark:border-white/10 shadow-lg shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-2xl shadow-lg shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          {/* 이름·이메일 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-stone-900 dark:text-white">{displayName}</h1>
              {profile.username && <span className="text-stone-400 dark:text-white/35 text-sm">@{profile.username}</span>}
              {isSeller && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">판매자</span>
              )}
            </div>
            <p className="text-stone-400 dark:text-white/40 text-sm mt-0.5 truncate">{user.email}</p>
            <p className="text-stone-400 dark:text-white/25 text-xs mt-1">가입일: {fmt(user.created_at ?? new Date().toISOString())}</p>
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
                <p className="text-stone-900 dark:text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-stone-400 dark:text-white/30 text-[11px] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 탭 네비 ── */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06] sticky top-[60px] z-20 bg-[#EDE8E2]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 flex overflow-x-auto no-scrollbar">
          {TABS.filter(({ id, sellerOnly }) => {
            if (sellerOnly && !isSeller) return false;
            if (isAdmin && (id === 'likes' || id === 'wishlist')) return false;
            return true;
          }).map(({ id, label }) => (
            <button key={id} onClick={() => { setTab(id); setPostsPage(1); setMediaPage(1); }}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id ? 'text-amber-400 border-amber-400' : 'text-stone-400 dark:text-white/40 border-transparent hover:text-stone-700 dark:hover:text-white/70'
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
              <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-4">빠른 이동</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '식품 마켓',  href: '/market',    icon: '🛒', c: 'hover:border-amber-500/40', adminOnly: false },
                  { label: '푸드 미디어', href: '/media',    icon: '🎬', c: 'hover:border-rose-500/40', adminOnly: false },
                  { label: '커뮤니티',   href: '/community', icon: '💬', c: 'hover:border-emerald-500/40', adminOnly: false },
                  { label: '장바구니',   href: '/cart',      icon: '🛍️', c: 'hover:border-violet-500/40', adminOnly: false },
                  { label: '주문 내역',  href: '/orders',    icon: '📦', c: 'hover:border-blue-500/40', adminOnly: false },
                  { label: '위시리스트', href: '#',          icon: '❤️', c: 'hover:border-rose-500/40', onClick: () => setTab('wishlist'), adminOnly: false },
                  { label: '내 채팅방',  href: '#',          icon: '🗨️', c: 'hover:border-emerald-500/40', onClick: () => { setTab('chat'); setChatSubTab('joined'); }, adminOnly: false },
                ].filter(({ label }) => !isAdmin || (label !== '장바구니' && label !== '주문 내역' && label !== '위시리스트'))
                .map(({ label, href, icon, c, onClick }) => (
                  <Link key={label} href={href}
                    onClick={onClick}
                    className={`flex items-center gap-3 p-4 rounded-xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 transition ${c}`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-stone-500 dark:text-white/55 text-sm font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 최근 게시글 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">최근 게시글</p>
                <button onClick={() => setTab('posts')} className="text-amber-400/60 text-xs hover:text-amber-400 transition">전체 보기 →</button>
              </div>
              {recentPosts.length === 0 ? (
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-8 text-center">
                  <p className="text-stone-400 dark:text-white/30 text-sm">아직 작성한 게시글이 없습니다.</p>
                  <Link href="/community/write" className="mt-2 inline-block text-amber-400/60 hover:text-amber-400 text-xs transition">첫 글 작성하기 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentPosts.map((p) => {
                    const cat = CAT[p.category] ?? CAT.general;
                    return (
                      <Link key={p.id} href={`/community/${p.id}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition group"
                      >
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                        <span className="text-stone-600 dark:text-white/65 text-sm flex-1 truncate group-hover:text-stone-900 dark:group-hover:text-white transition">{p.title}</span>
                        <span className="text-stone-400 dark:text-white/25 text-xs shrink-0 hidden sm:block">
                          💬{p.comment_count} · ❤️{p.like_count}
                        </span>
                        <span className="text-stone-300 dark:text-white/20 text-xs shrink-0">{fmt(p.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 최근 영상 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">최근 업로드 영상</p>
                <button onClick={() => setTab('media')} className="text-rose-400/60 text-xs hover:text-rose-400 transition">전체 보기 →</button>
              </div>
              {recentMedia.length === 0 ? (
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-8 text-center">
                  <p className="text-stone-400 dark:text-white/30 text-sm">아직 업로드한 영상이 없습니다.</p>
                  <Link href="/media/upload" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">첫 영상 올리기 →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recentMedia.map((m) => (
                    <Link key={m.id} href={`/media/${m.id}`}
                      className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition"
                    >
                      <div className="aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                        {m.thumbnail_url
                          ? <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                          : <span className="text-4xl">🎬</span>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-stone-600 dark:text-white/65 text-sm truncate">{m.title}</p>
                        <p className="text-stone-400 dark:text-white/30 text-xs mt-1">👁 {m.views} · ❤️ {m.like_count}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 판매자 센터 CTA */}
            {isSeller ? (
              <div className="flex gap-3">
                <Link href="/market/manage"
                  className="flex-1 flex items-center gap-4 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/8 transition"
                >
                  <span className="text-3xl">🏪</span>
                  <div>
                    <p className="text-amber-400 font-semibold text-sm">내 상품 관리</p>
                    <p className="text-stone-400 dark:text-white/40 text-xs mt-0.5">상품 수정·삭제·공개 관리</p>
                  </div>
                  <span className="ml-auto text-amber-400/50 text-sm">→</span>
                </Link>
                <Link href="/market/sell"
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition text-sm text-stone-500 dark:text-white/50 hover:text-stone-900 dark:hover:text-white whitespace-nowrap"
                >
                  + 새 상품
                </Link>
              </div>
            ) : (
              <Link href="/market/sell"
                className="flex items-center gap-4 p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition"
              >
                <span className="text-3xl">🏪</span>
                <div>
                  <p className="text-stone-600 dark:text-white/60 font-semibold text-sm">판매자 등록</p>
                  <p className="text-stone-400 dark:text-white/30 text-xs mt-0.5">내 상품을 직접 판매해보세요.</p>
                </div>
                <span className="ml-auto text-stone-400 dark:text-white/25 text-sm">→</span>
              </Link>
            )}
          </div>
        )}

        {/* ────────────── 프로필 수정 탭 ────────────── */}
        {tab === 'profile' && (
          <div className="max-w-md space-y-6">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">프로필 수정</p>

            {/* 아바타 미리보기 */}
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="미리보기" referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-16 h-16 rounded-2xl object-cover border border-black/15 dark:border-white/15 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-2xl shrink-0">
                  {(profile.full_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-stone-500 dark:text-white/50 text-sm font-medium">프로필 사진</p>
                <p className="text-stone-400 dark:text-white/25 text-xs mt-0.5">URL 입력 시 실시간 미리보기</p>
              </div>
            </div>

            {/* 폼 필드 */}
            {([
              { key: 'full_name',  label: '이름',           placeholder: '홍길동',                  type: 'text' },
              { key: 'username',   label: '닉네임',          placeholder: 'gildong_hong',            type: 'text' },
              { key: 'avatar_url', label: '프로필 사진 URL', placeholder: 'https://example.com/...', type: 'url'  },
              { key: 'phone',      label: '전화번호',         placeholder: '010-0000-0000',           type: 'tel'  },
            ] as { key: keyof typeof profile; label: string; placeholder: string; type: string }[]).map(({ key, label, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-2">
                <label className="text-stone-500 dark:text-white/45 text-sm">{label}</label>
                <input
                  type={type}
                  value={profile[key]}
                  onChange={(e) => { const val = key === 'phone' ? formatPhone(e.target.value) : e.target.value; setProfile((p) => ({ ...p, [key]: val })); setSaveMsg(null); }}
                  placeholder={placeholder}
                  className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 border border-black/10 dark:border-white/10 focus:outline-none focus:border-amber-500/50 transition text-sm"
                />
              </div>
            ))}

            {/* 주소 (카카오 우편번호 검색) */}
            <div className="flex flex-col gap-2">
              <label className="text-stone-500 dark:text-white/45 text-sm">기본 주소</label>
              <AddressInput
                value={profile.address}
                onChange={(addr) => { setProfile((p) => ({ ...p, address: addr })); setSaveMsg(null); }}
                placeholder="주소 검색 버튼을 클릭하세요"
                inputClassName="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 border border-black/10 dark:border-white/10 focus:outline-none focus:border-amber-500/50 transition text-sm cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-stone-500 dark:text-white/45 text-sm">상세 주소</label>
              <input
                type="text"
                value={profile.address_detail}
                onChange={(e) => { setProfile((p) => ({ ...p, address_detail: e.target.value })); setSaveMsg(null); }}
                placeholder="101동 202호"
                className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 border border-black/10 dark:border-white/10 focus:outline-none focus:border-amber-500/50 transition text-sm"
              />
            </div>

            {/* 이메일 (읽기 전용) */}
            <div className="flex flex-col gap-2">
              <label className="text-stone-500 dark:text-white/45 text-sm">이메일</label>
              <input type="email" value={user.email ?? ''} disabled
                className="px-4 py-3 rounded-xl bg-black/3 dark:bg-white/3 text-stone-400 dark:text-white/30 border border-black/6 dark:border-white/6 text-sm cursor-not-allowed" />
              <p className="text-stone-300 dark:text-white/20 text-xs px-1">이메일은 변경할 수 없습니다.</p>
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
              <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">내 게시글 ({stats.posts})</p>
              <Link href="/community/write"
                className="text-xs px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/45 hover:text-stone-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition"
              >
                + 새 글 작성
              </Link>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                <p className="text-stone-400 dark:text-white/30 text-sm">작성한 게시글이 없습니다.</p>
                <Link href="/community/write" className="mt-2 inline-block text-amber-400/60 hover:text-amber-400 text-xs transition">첫 글 작성하기 →</Link>
              </div>
            ) : (() => {
              const totalPostsPages = Math.ceil(myPosts.length / POSTS_PER_PAGE);
              const pagedPosts = myPosts.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
              return (
                <>
                  <div className="flex flex-col gap-2">
                    {pagedPosts.map((p) => {
                      const cat = CAT[p.category] ?? CAT.general;
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] group">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                          <Link href={`/community/${p.id}`} className="flex-1 min-w-0">
                            <p className="text-stone-600 dark:text-white/65 text-sm truncate group-hover:text-stone-900 dark:group-hover:text-white transition">{p.title}</p>
                            <p className="text-stone-400 dark:text-white/25 text-xs mt-0.5">
                              👁 {p.views} · ❤️ {p.like_count} · 💬 {p.comment_count} · {fmt(p.created_at)}
                            </p>
                          </Link>
                          <button onClick={() => deletePost(p.id)}
                            className="text-stone-300 dark:text-white/15 hover:text-rose-400 transition text-xs shrink-0 px-2 py-1 rounded hover:bg-rose-500/8"
                          >
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination currentPage={postsPage} totalPages={totalPostsPages} onPageChange={setPostsPage} />
                </>
              );
            })()}
          </div>
        )}

        {/* ────────────── 내 영상 탭 ────────────── */}
        {tab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">내 영상 ({stats.media})</p>
              <Link href="/media/upload"
                className="text-xs px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/45 hover:text-stone-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition"
              >
                + 영상 올리기
              </Link>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              </div>
            ) : myMedia.length === 0 ? (
              <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                <p className="text-stone-400 dark:text-white/30 text-sm">업로드한 영상이 없습니다.</p>
                <Link href="/media/upload" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">첫 영상 올리기 →</Link>
              </div>
            ) : (() => {
              const totalMediaPages = Math.ceil(myMedia.length / MEDIA_PER_PAGE);
              const pagedMedia = myMedia.slice((mediaPage - 1) * MEDIA_PER_PAGE, mediaPage * MEDIA_PER_PAGE);
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pagedMedia.map((m) => (
                      <Link key={m.id} href={`/media/${m.id}`}
                        className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition group"
                      >
                        <div className="aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                          {m.thumbnail_url
                            ? <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            : <span className="text-4xl">🎬</span>
                          }
                        </div>
                        <div className="p-4">
                          <p className="text-stone-600 dark:text-white/65 text-sm font-medium truncate">{m.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-stone-400 dark:text-white/30 text-xs">
                            <span>👁 {m.views}</span>
                            <span>❤️ {m.like_count}</span>
                            <span className="ml-auto">{fmt(m.created_at)}</span>
                          </div>
                          {m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {m.tags.slice(0, 3).map((t) => (
                                <span key={t} className="text-[10px] text-stone-400 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">#{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Pagination currentPage={mediaPage} totalPages={totalMediaPages} onPageChange={setMediaPage} />
                </>
              );
            })()}
          </div>
        )}

        {/* ────────────── 찜 목록 탭 ────────────── */}
        {tab === 'likes' && (
          <div className="space-y-5">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">찜 목록</p>

            {/* 서브탭 */}
            <div className="flex gap-2">
              {([['media', '영상 찜'], ['posts', '게시글 찜']] as [LikesSubTab, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setLikesSubTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    likesSubTab === id
                      ? 'bg-black/8 dark:bg-white/8 border-black/15 dark:border-white/15 text-stone-900 dark:text-white'
                      : 'border-transparent text-stone-400 dark:text-white/35 hover:text-stone-600 dark:hover:text-white/60'
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
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                  <p className="text-stone-400 dark:text-white/30 text-sm">좋아요한 영상이 없습니다.</p>
                  <Link href="/media" className="mt-2 inline-block text-rose-400/60 hover:text-rose-400 text-xs transition">영상 둘러보기 →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likedMedia.filter((d) => d.media).map(({ post_id, media }) => (
                    <Link key={post_id} href={`/media/${media!.id}`}
                      className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition group"
                    >
                      <div className="aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                        {media!.thumbnail_url
                          ? <img src={media!.thumbnail_url} alt={media!.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          : <span className="text-4xl">🎬</span>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-stone-600 dark:text-white/65 text-sm truncate">{media!.title}</p>
                        <p className="text-stone-400 dark:text-white/25 text-xs mt-1">{fmt(media!.created_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              likedPosts.length === 0 ? (
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                  <p className="text-stone-400 dark:text-white/30 text-sm">좋아요한 게시글이 없습니다.</p>
                  <Link href="/community" className="mt-2 inline-block text-emerald-400/60 hover:text-emerald-400 text-xs transition">커뮤니티 둘러보기 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {likedPosts.filter((d) => d.post).map(({ post_id, post }) => {
                    const cat = CAT[post!.category] ?? CAT.general;
                    return (
                      <Link key={post_id} href={`/community/${post!.id}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition group"
                      >
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.cls}`}>{cat.label}</span>
                        <span className="text-stone-600 dark:text-white/65 text-sm flex-1 truncate group-hover:text-stone-900 dark:group-hover:text-white transition">{post!.title}</span>
                        <span className="text-stone-300 dark:text-white/20 text-xs shrink-0">{fmt(post!.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ────────────── 위시리스트 탭 ────────────── */}
        {tab === 'wishlist' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">위시리스트 (찜한 상품)</p>
              <Link href="/market"
                className="text-xs px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/45 hover:text-stone-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition"
              >
                마켓 보러가기
              </Link>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              </div>
            ) : wishlist.length === 0 ? (
              <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                <p className="text-stone-400 dark:text-white/30 text-sm">찜한 상품이 없습니다.</p>
                <Link href="/market" className="mt-2 inline-block text-amber-400/60 hover:text-amber-400 text-xs transition">마켓 구경하기 →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.filter((w) => w.products).map(({ product_id, products }) => (
                  <Link key={product_id} href={`/market/${products!.id}`}
                    className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition group"
                  >
                    <div className="aspect-square bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                      {products!.images?.[0]
                        ? <img src={products!.images[0]} alt={products!.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        : <span className="text-4xl">📦</span>
                      }
                    </div>
                    <div className="p-4">
                      <p className="text-stone-600 dark:text-white/65 text-sm font-medium truncate">{products!.title}</p>
                      <p className="text-amber-400 font-bold text-sm mt-1">{products!.price.toLocaleString('ko-KR')}원</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ────────────── 채팅방 탭 ────────────── */}
        {tab === 'chat' && (
          <div className="space-y-5">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">채팅방</p>

            {/* 서브탭 */}
            <div className="flex gap-2">
              {([['joined', '참여한 방'], ['created', '내가 만든 방']] as ['joined' | 'created', string][]).map(([id, label]) => (
                <button key={id} onClick={() => setChatSubTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    chatSubTab === id
                      ? 'bg-black/8 dark:bg-white/8 border-black/15 dark:border-white/15 text-stone-900 dark:text-white'
                      : 'border-transparent text-stone-400 dark:text-white/35 hover:text-stone-600 dark:hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (() => {
              const list = chatSubTab === 'joined' ? myChatRooms : createdChatRooms;
              if (list.length === 0) return (
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
                  <p className="text-stone-400 dark:text-white/30 text-sm">
                    {chatSubTab === 'joined' ? '참여한 채팅방이 없습니다.' : '만든 채팅방이 없습니다.'}
                  </p>
                  <Link href="/chat" className="mt-2 inline-block text-emerald-400/60 hover:text-emerald-400 text-xs transition">채팅 허브 가기 →</Link>
                </div>
              );
              return (
                <div className="flex flex-col gap-2">
                  {list.map((room) => (
                    <Link key={room.id} href={`/chat/room/${room.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0">
                        {room.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-stone-700 dark:text-white/70 text-sm font-semibold truncate">{room.name}</p>
                          {room.category && (() => {
                            const catInfo = COMMUNITY_CATEGORY_MAP[room.category];
                            return catInfo ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-stone-500 dark:text-white/40 shrink-0">
                                {catInfo.emoji} {catInfo.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-stone-400 dark:text-white/30 text-xs truncate mt-0.5">
                          {room.lastMessage ?? '아직 메시지가 없습니다'}
                        </p>
                      </div>
                      <span className="text-stone-300 dark:text-white/20 text-sm group-hover:translate-x-0.5 transition-transform">›</span>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ────────────── 판매 정산 탭 ────────────── */}
        {tab === 'seller' && (() => {
          const active = sellerItems.filter((i) => i.order_status !== 'cancelled');
          const totalRevenue = active.reduce((s, i) => s + i.price_at_time * i.quantity, 0);
          const totalQty     = active.reduce((s, i) => s + i.quantity, 0);

          const byProduct: Record<string, { title: string; image: string | null; revenue: number; qty: number; colors: Record<string, number> }> = {};
          active.forEach((i) => {
            if (!byProduct[i.product_id]) {
              byProduct[i.product_id] = { title: i.product_title, image: i.product_image, revenue: 0, qty: 0, colors: {} };
            }
            byProduct[i.product_id].revenue += i.price_at_time * i.quantity;
            byProduct[i.product_id].qty     += i.quantity;
            if (i.selected_color) {
              byProduct[i.product_id].colors[i.selected_color] = (byProduct[i.product_id].colors[i.selected_color] ?? 0) + i.quantity;
            }
          });
          const productList = Object.entries(byProduct).sort((a, b) => b[1].revenue - a[1].revenue);

          const updateOrderStatus = async (orderId: string, status: string) => {
            setOrderStatusUpdating(orderId);
            await supabase.from('orders').update({ status }).eq('id', orderId);
            setSellerOrders((prev) => prev.map((o) => o.order_id === orderId ? { ...o, status } : o));
            setOrderStatusUpdating(null);
          };

          return (
            <div className="space-y-6">
              <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">판매 정산 현황</p>

              {/* 요약 카드 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '총 수익', value: `${totalRevenue.toLocaleString('ko-KR')}원`, icon: '💰' },
                  { label: '총 판매량', value: `${totalQty}개`, icon: '📦' },
                  { label: '판매 상품 수', value: `${productList.length}종`, icon: '🏷️' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 text-center">
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="text-stone-900 dark:text-white font-bold text-sm">{value}</p>
                    <p className="text-stone-400 dark:text-white/30 text-[11px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* 매출 그래프 */}
              <SellerRevenueChart items={active} />

              {/* 주문 관리 */}
              {sellerOrders.length > 0 && (
                <div className="space-y-3">
                  <p className="text-stone-500 dark:text-white/40 text-xs font-semibold">주문 관리</p>
                  {sellerOrders.map((order) => (
                    <div key={order.order_id} className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-black/6 dark:border-white/6">
                        <div>
                          <p className="text-stone-900 dark:text-white text-sm font-semibold">
                            {order.buyer_name ?? '구매자'} 주문
                          </p>
                          <p className="text-stone-400 dark:text-white/30 text-[11px] mt-0.5 font-mono">#{order.order_id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-stone-400 dark:text-white/30 text-[11px]">{fmt(order.created_at)}</p>
                        </div>
                        <select
                          value={order.status}
                          disabled={orderStatusUpdating === order.order_id}
                          onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                          className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-700 dark:text-white/70 text-sm focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-stone-500 dark:text-white/45">
                            <span>{item.title}</span>
                            {item.selected_color && (
                              <span className="text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">{item.selected_color}</span>
                            )}
                            <span className="text-stone-400 dark:text-white/30">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 상품별 판매 현황 */}
              {productList.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="text-stone-400 dark:text-white/30 text-sm">아직 판매 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-stone-500 dark:text-white/40 text-xs font-semibold">상품별 판매 현황</p>
                  {productList.map(([pid, info]) => {
                    const colorEntries = Object.entries(info.colors).sort((a, b) => b[1] - a[1]);
                    return (
                      <div key={pid} className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                            {info.image ? <img src={info.image} alt={info.title} className="w-full h-full object-cover" /> : '📦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-stone-900 dark:text-white text-sm font-semibold truncate">{info.title}</p>
                            <p className="text-stone-400 dark:text-white/30 text-xs mt-0.5">{info.qty}개 판매</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-amber-400 font-bold text-sm">{info.revenue.toLocaleString('ko-KR')}원</p>
                            <p className="text-stone-400 dark:text-white/30 text-[11px] mt-0.5">
                              {totalRevenue > 0 ? Math.round((info.revenue / totalRevenue) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                        {colorEntries.length > 0 && (
                          <div className="border-t border-black/6 dark:border-white/6 px-4 py-3 flex flex-wrap gap-2">
                            {colorEntries.map(([color, qty]) => (
                              <span key={color} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-medium">
                                <span>{color}</span><span className="text-amber-400/60">·</span><span>{qty}개</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </main>
  );
}
