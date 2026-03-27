import { Card, CardContent } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  sparklineData?: number[];
  trendLabel?: string;
}

function toSparklineData(source: number[] | undefined, value: string | number): { index: number; value: number }[] {
  if (source && source.length > 0) {
    return source.map((point, index) => ({ index, value: point }));
  }

  const fallback = Number(value);
  if (!Number.isFinite(fallback) || fallback <= 0) {
    return [
      { index: 0, value: 1 },
      { index: 1, value: 1.2 },
      { index: 2, value: 0.9 },
      { index: 3, value: 1.1 },
      { index: 4, value: 1.35 },
    ];
  }

  return [
    { index: 0, value: fallback * 0.54 },
    { index: 1, value: fallback * 0.62 },
    { index: 2, value: fallback * 0.58 },
    { index: 3, value: fallback * 0.73 },
    { index: 4, value: fallback * 0.81 },
  ];
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName,
  sparklineData,
  trendLabel,
}: StatCardProps) {
  const data = toSparklineData(sparklineData, value);
  const trendIsPositive = trend?.isPositive ?? true;
  const sparklineId = `spark-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <Card className={cn('group relative overflow-hidden border-gray-200/80 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.1)]', className)}>
      <CardContent className="relative p-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-85">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent-color)"
                strokeWidth={2}
                fill={`url(#${sparklineId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</p>
            <p className="text-[30px] font-semibold leading-none tracking-tight text-gray-900">{value}</p>
            {(trend || trendLabel) && (
              <div className="flex items-center gap-2 text-xs">
                {trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold',
                      trendIsPositive
                        ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-600/15'
                        : 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-600/15',
                    )}
                  >
                    {trendIsPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {trendIsPositive ? '+' : ''}{trend.value}%
                  </span>
                )}
                <span className="text-gray-500">{trendLabel || 'vs mes anterior'}</span>
              </div>
            )}
          </div>
          <div className={cn('rounded-2xl p-3.5 shadow-sm ring-1 ring-black/5', iconClassName || 'bg-primary/10')}>
            <Icon className={cn('h-[18px] w-[18px]', iconClassName ? 'text-current' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
