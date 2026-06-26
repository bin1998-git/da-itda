export type PostCategory =
  | 'recipe' | 'ingredient' | 'kitchenware'
  | 'restaurant' | 'tip' | 'question' | 'general';

export interface CommunityCategory {
  value: PostCategory;
  label: string;
  color: string;       // Tailwind class string
  emoji: string;
  subcategories?: string[];
}

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  {
    value: 'recipe',
    label: '레시피',
    color: 'text-amber-500 bg-amber-500/10',
    emoji: '🍳',
    subcategories: ['한식', '양식', '일식', '중식', '디저트·베이킹'],
  },
  {
    value: 'ingredient',
    label: '재료·식품',
    color: 'text-green-500 bg-green-500/10',
    emoji: '🥦',
    subcategories: ['채소·과일', '육류·해산물', '유제품', '가공식품', '조미료'],
  },
  {
    value: 'kitchenware',
    label: '주방용품',
    color: 'text-indigo-500 bg-indigo-500/10',
    emoji: '🔪',
    subcategories: ['조리도구', '냄비·팬', '식기', '보관용품', '소형가전'],
  },
  {
    value: 'restaurant',
    label: '맛집',
    color: 'text-rose-500 bg-rose-500/10',
    emoji: '🗺️',
    subcategories: ['서울', '경기·인천', '지방', '해외'],
  },
  {
    value: 'tip',
    label: '꿀팁',
    color: 'text-yellow-500 bg-yellow-500/10',
    emoji: '💡',
    subcategories: ['보관법', '손질법', '절약팁', '플레이팅'],
  },
  {
    value: 'question',
    label: '질문',
    color: 'text-sky-500 bg-sky-500/10',
    emoji: '❓',
  },
  {
    value: 'general',
    label: '자유',
    color: 'text-stone-500 bg-stone-500/10',
    emoji: '💬',
  },
];

export const COMMUNITY_CATEGORY_MAP: Record<string, CommunityCategory> =
  Object.fromEntries(COMMUNITY_CATEGORIES.map((c) => [c.value, c]));
