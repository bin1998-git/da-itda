'use client';

import { useEffect } from 'react';

const KEY = 'da_itda_recent';
const MAX = 10;

export function saveRecentProduct(id: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const next = [id, ...prev.filter((v) => v !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentProductIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    saveRecentProduct(productId);
  }, [productId]);

  return null;
}
