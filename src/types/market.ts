export type Category = 'food' | 'kitchen' | 'snack' | 'drink';

export const CATEGORIES: { value: Category | 'all'; label: string; emoji: string }[] = [
  { value: 'all',     label: '전체',     emoji: '🛒' },
  { value: 'food',    label: '신선식품', emoji: '🥩' },
  { value: 'kitchen', label: '주방용품', emoji: '🍳' },
  { value: 'snack',   label: '간식',     emoji: '🍪' },
  { value: 'drink',   label: '음료',     emoji: '🧃' },
];

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: Category;
  images: string[];
  stock: number;
  is_active: boolean;
  created_at: string;
  sellers?: { store_name: string; store_desc?: string | null };
}

export interface Seller {
  id: string;
  store_name: string;
  store_desc: string | null;
  is_verified: boolean;
}
