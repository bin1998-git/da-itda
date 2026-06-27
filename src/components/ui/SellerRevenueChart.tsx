'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

interface Item {
  price_at_time: number;
  quantity: number;
  order_created_at: string;
}

type Period = '7d' | '30d' | '3m';
type ChartType = 'area' | 'bar';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d',  label: '7일' },
  { value: '30d', label: '30일' },
  { value: '3m',  label: '3개월' },
];

function toKST(dateStr: string) {
  const d = new Date(dateStr);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000);
}

function dayKey(dateStr: string) {
  const d = toKST(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function monthKey(dateStr: string) {
  const d = toKST(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatLabel(key: string, period: Period) {
  if (period === '3m') {
    const [, m] = key.split('-');
    return `${parseInt(m)}월`;
  }
  const [, m, d] = key.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function buildData(items: Item[], period: Period) {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === '7d')  cutoff.setDate(now.getDate() - 6);
  if (period === '30d') cutoff.setDate(now.getDate() - 29);
  if (period === '3m')  cutoff.setMonth(now.getMonth() - 2);

  const map = new Map<string, number>();

  // 빈 버킷 미리 채우기
  if (period === '3m') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, 0);
    }
  } else {
    const days = period === '7d' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map.set(key, 0);
    }
  }

  items.forEach((item) => {
    const dt = new Date(item.order_created_at);
    if (dt < cutoff) return;
    const key = period === '3m' ? monthKey(item.order_created_at) : dayKey(item.order_created_at);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + item.price_at_time * item.quantity);
  });

  return Array.from(map.entries()).map(([key, revenue]) => ({
    key,
    label: formatLabel(key, period),
    revenue,
  }));
}

const fmt = (v: number) =>
  v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}만` : v.toLocaleString('ko-KR');

export default function SellerRevenueChart({ items }: { items: Item[] }) {
  const [period, setPeriod] = useState<Period>('30d');
  const [chartType, setChartType] = useState<ChartType>('area');

  const data = useMemo(() => buildData(items, period), [items, period]);
  const periodRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const nonZeroDays = data.filter((d) => d.revenue > 0).length;
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  const commonProps = {
    data,
    margin: { top: 8, right: 8, left: -16, bottom: 0 },
  };

  const axisProps = {
    dataKey: 'label' as const,
    tick: { fill: 'currentColor', fontSize: 10, opacity: 0.4 },
    axisLine: false,
    tickLine: false,
  };

  const yProps = {
    tick: { fill: 'currentColor', fontSize: 10, opacity: 0.4 },
    axisLine: false,
    tickLine: false,
    tickFormatter: fmt,
    width: 48,
  };

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-stone-500 dark:text-white/40 text-xs font-semibold">매출 그래프</p>
          <p className="text-stone-900 dark:text-white font-bold text-lg mt-0.5">
            {periodRevenue.toLocaleString('ko-KR')}원
          </p>
          <p className="text-stone-400 dark:text-white/30 text-[11px]">
            {PERIODS.find((p) => p.value === period)?.label} 누적 · 판매 {nonZeroDays}일
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* 기간 선택 */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  period === p.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-black/5 dark:bg-white/5 text-stone-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/8'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 차트 타입 */}
          <div className="flex gap-1">
            {([['area', '영역'], ['bar', '막대']] as [ChartType, string][]).map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  chartType === t
                    ? 'bg-black/10 dark:bg-white/10 text-stone-700 dark:text-white/70'
                    : 'bg-black/3 dark:bg-white/3 text-stone-400 dark:text-white/25 hover:bg-black/6 dark:hover:bg-white/6'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={180}>
        {chartType === 'area' ? (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
            <XAxis {...axisProps} interval={period === '30d' ? 4 : 0} />
            <YAxis {...yProps} domain={[0, maxRevenue * 1.15]} />
            <Tooltip
              formatter={(v) => [`${Number(v ?? 0).toLocaleString('ko-KR')}원`, '매출']}
              labelFormatter={(l) => l}
              contentStyle={{
                background: 'rgba(0,0,0,0.8)',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
            />
          </AreaChart>
        ) : (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
            <XAxis {...axisProps} interval={period === '30d' ? 4 : 0} />
            <YAxis {...yProps} domain={[0, maxRevenue * 1.15]} />
            <Tooltip
              formatter={(v) => [`${Number(v ?? 0).toLocaleString('ko-KR')}원`, '매출']}
              labelFormatter={(l) => l}
              contentStyle={{
                background: 'rgba(0,0,0,0.8)',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                color: '#fff',
              }}
            />
            <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
