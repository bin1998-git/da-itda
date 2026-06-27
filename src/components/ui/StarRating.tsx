'use client';

interface Props {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const SIZE = { sm: 12, md: 16, lg: 22 };

export default function StarRating({ rating, max = 5, size = 'md', interactive = false, onChange }: Props) {
  const px = SIZE[size];
  return (
    <div className="flex items-center gap-0.5" style={{ gap: px * 0.15 }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;
        const pct = partial ? Math.round((rating - Math.floor(rating)) * 100) : 0;
        const id = `grad-${size}-${i}`;
        return (
          <svg
            key={i}
            width={px}
            height={px}
            viewBox="0 0 20 20"
            onClick={() => interactive && onChange?.(i + 1)}
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''}
          >
            {partial && (
              <defs>
                <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={`${pct}%`} stopColor="#f59e0b" />
                  <stop offset={`${pct}%`} stopColor="#d1d5db" />
                </linearGradient>
              </defs>
            )}
            <path
              d="M10 1l2.6 5.3 5.9.9-4.3 4.2 1 5.8L10 14.3l-5.2 2.9 1-5.8L1.5 7.2l5.9-.9z"
              fill={filled ? '#f59e0b' : partial ? `url(#${id})` : '#d1d5db'}
            />
          </svg>
        );
      })}
    </div>
  );
}
