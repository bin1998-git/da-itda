'use client';

import Link from 'next/link';

interface Props {
  currentPage: number;
  totalPages: number;
  /** URL 기반 페이지네이션: 기본 경로 (예: "/market") */
  hrefBase?: string;
  /** URL 기반 페이지네이션: 추가 쿼리 파라미터 */
  extraParams?: Record<string, string>;
  /** 상태 기반 페이지네이션 (클라이언트 전용) */
  onPageChange?: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, hrefBase, extraParams, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams({ ...(extraParams ?? {}), page: String(page) });
    return `${hrefBase}?${params.toString()}`;
  };

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition';
  const active  = 'bg-amber-500 text-black';
  const normal  = 'text-white/40 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10';
  const arrow   = 'text-white/30 hover:text-white hover:bg-white/8 border border-white/8 disabled:opacity-20 disabled:cursor-not-allowed';

  const PageBtn = ({ page }: { page: number | '...' }) => {
    if (page === '...') return <span className="w-8 h-8 flex items-center justify-center text-white/20 text-sm">…</span>;
    const isActive = page === currentPage;
    if (onPageChange) {
      return <button onClick={() => onPageChange(page)} className={`${btnBase} ${isActive ? active : normal}`}>{page}</button>;
    }
    return <Link href={buildHref(page)} className={`${btnBase} ${isActive ? active : normal}`}>{page}</Link>;
  };

  const PrevNext = ({ dir }: { dir: 'prev' | 'next' }) => {
    const target = dir === 'prev' ? currentPage - 1 : currentPage + 1;
    const disabled = dir === 'prev' ? currentPage <= 1 : currentPage >= totalPages;
    const label = dir === 'prev' ? '←' : '→';
    if (onPageChange) {
      return <button onClick={() => !disabled && onPageChange(target)} disabled={disabled} className={`${btnBase} ${arrow}`}>{label}</button>;
    }
    if (disabled) return <span className={`${btnBase} ${arrow} opacity-20 cursor-not-allowed`}>{label}</span>;
    return <Link href={buildHref(target)} className={`${btnBase} ${arrow}`}>{label}</Link>;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-8">
      <PrevNext dir="prev" />
      {pages.map((p, i) => <PageBtn key={i} page={p} />)}
      <PrevNext dir="next" />
    </div>
  );
}
