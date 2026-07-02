export type Category = 'food' | 'kitchen' | 'snack' | 'drink' | 'etc';

export const CATEGORIES: { value: Category | 'all'; label: string; emoji: string }[] = [
  { value: 'all',     label: '전체',     emoji: '🛒' },
  { value: 'food',    label: '신선식품', emoji: '🥩' },
  { value: 'kitchen', label: '주방용품', emoji: '🍳' },
  { value: 'snack',   label: '간식',     emoji: '🍪' },
  { value: 'drink',   label: '음료',     emoji: '🧃' },
  { value: 'etc',     label: '기타',     emoji: '📦' },
];

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  content: string | null;
  helpful_count: number;
  seller_reply: string | null;
  seller_reply_at: string | null;
  updated_at: string | null;
  created_at: string;
  images?: string[] | null;
  profiles?: { nickname: string | null; avatar_url: string | null };
}

export interface Qna {
  id: string;
  product_id: string;
  user_id: string;
  seller_id: string | null;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null };
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: Category;
  images: string[];
  colors?: string[];
  color_stocks?: Record<string, number>;
  original_price?: number | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  weight?: string | null;
  origin?: string | null;
  storage_method?: string | null;
  expiry_info?: string | null;
  allergen_info?: string | null;
  delivery_type?: string | null;
  delivery_days?: number | null;
  is_overseas?: boolean | null;
  overseas_shipping_fee?: number | null;
  packaging_type?: string | null;
  sales_unit?: string | null;
  sellers?: { store_name: string; store_desc?: string | null };
  reviews?: { rating: number }[];
}

export interface Seller {
  id: string;
  store_name: string;
  store_desc: string | null;
  is_verified: boolean;
}
