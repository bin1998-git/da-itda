'use client';

import { useState } from 'react';
import AddToCartButton from './AddToCartButton';

interface Props {
  productId: string;
  stock: number;
  colors: string[];
}

export default function ColorSelectorCart({ productId, stock, colors }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* 색상 선택 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-stone-400 dark:text-white/30 text-xs">색상</p>
          {selected && (
            <span className="text-xs text-amber-400 font-medium">{selected}</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setSelected((prev) => prev === color ? null : color)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                selected === color
                  ? 'bg-amber-500 border-amber-500 text-black shadow-sm shadow-amber-500/30'
                  : 'bg-amber-500/8 border-amber-500/25 text-stone-600 dark:text-amber-200 hover:border-amber-500/50 hover:bg-amber-500/15'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <AddToCartButton
        productId={productId}
        stock={stock}
        colors={colors}
        selectedColor={selected}
      />
    </div>
  );
}
