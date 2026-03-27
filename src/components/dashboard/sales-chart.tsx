'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui';
import { DashboardSalesChartDay } from '@/src/services/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';
import { cn } from '@/src/lib/utils';

interface SalesChartProps {
  data: DashboardSalesChartDay[];
}

/** "2026-02-25" → "25 Feb" */
function formatChartDate(dateStr: string): string {
  const [, , day] = dateStr.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthIdx = parseInt(dateStr.split('-')[1]) - 1;
  return `${parseInt(day)} ${months[monthIdx]}`;
}

export function SalesChart({ data }: SalesChartProps) {
  const [activeRange, setActiveRange] = useState<'7d' | '14d' | '30d'>('7d');

  const chartData = useMemo(() => {
    const base = data.map((d) => ({ ...d, fecha: formatChartDate(d.date) }));
    if (activeRange === '7d') return base.slice(-7);
    if (activeRange === '14d') return base.slice(-14);
    return base.slice(-30);
  }, [activeRange, data]);

  return (
    <Card className="col-span-full lg:col-span-8 overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Ventas Últimos 7 Días</CardTitle>
        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-gray-200/80 bg-[#f8faf5] p-1">
          {[
            { key: '7d', label: '7D' },
            { key: '14d', label: '14D' },
            { key: '30d', label: '30D' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveRange(item.key as '7d' | '14d' | '30d')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                activeRange === item.key
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 8" stroke="#E5E7EB" strokeOpacity={0.25} vertical={false} />
              <XAxis
                dataKey="fecha"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '14px',
                  boxShadow: '0 18px 32px rgba(15, 23, 42, 0.12)',
                }}
                formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--primary-color)"
                strokeWidth={2.4}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
