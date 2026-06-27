'use client';

import { useState } from 'react';
import AddToCartButton from './AddToCartButton';

interface Props {
  productId: string;
  stock: number;
  colors: string[];
  colorStocks?: Record<string, number>;
}

export default function ColorSelectorCart({ productId, stock, colors, colorStocks }: Props) {
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(e.target.value);
    if (e.target.value) setError(false);
  };

  const handleColorError = () => {
    setError(true);
  };

  const effectiveStock = selected && colorStocks
    ? (colorStocks[selected] ?? stock)
    : stock;

  return (
    <div className="flex flex-col gap-4">
      {/* 색상 드롭다운 */}
      <div>
        <p className="text-stone-400 dark:text-white/30 text-xs mb-2">색상</p>
        <div className="relative">
          <select
            value={selected}
            onChange={handleChange}
            className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-medium transition-all duration-200 bg-white dark:bg-[#1a1a1a] appearance-none cursor-pointer outline-none ${
              error
                ? 'border-rose-500 text-stone-900 dark:text-white ring-2 ring-rose-500/30'
                : selected
                ? 'border-amber-500 text-stone-900 dark:text-white'
                : 'border-black/15 dark:border-white/15 text-stone-400 dark:text-white/40'
            } focus:border-amber-500`}
          >
            <option value="">색상을 선택하세요</option>
            {colors.map((color) => {
              const isSoldOut = colorStocks && (colorStocks[color] ?? -1) === 0;
              return (
                <option
                  key={color}
                  value={color}
                  disabled={isSoldOut}
                  style={isSoldOut ? { color: '#9ca3af' } : undefined}
                >
                  {color}{isSoldOut ? ' (품절)' : ''}
                </option>
              );
            })}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-white/40">
            ▾
          </span>
        </div>
        {/* 에러 메시지 */}
        {error && (
          <p className="mt-1.5 text-rose-500 text-xs font-semibold flex items-center gap-1">
            <span>!</span> 색상을 선택해주세요
          </p>
        )}
      </div>

      <AddToCartButton
        productId={productId}
        stock={effectiveStock}
        colors={colors}
        selectedColor={selected || null}
        onColorError={handleColorError}
      />
    </div>
  );
}
