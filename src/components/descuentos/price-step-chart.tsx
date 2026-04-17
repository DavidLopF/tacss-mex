'use client';

import { PriceTierItem } from '@/services/discounts';
import { formatCurrency } from '@/lib/utils';

interface PriceStepChartProps {
  basePrice: number;
  tiers: PriceTierItem[];
  defaultZoneId?: number;
}

const W = 380, H = 220, PAD_L = 54, PAD_R = 16, PAD_T = 16, PAD_B = 36;
const innerW = W - PAD_L - PAD_R;
const innerH = H - PAD_T - PAD_B;

function pctOff(base: number, price: number) {
  return base > 0 ? ((base - price) / base) * 100 : 0;
}

export function PriceStepChart({ basePrice, tiers, defaultZoneId = 1 }: PriceStepChartProps) {
  const showTiers = tiers.filter(t => t.priceZoneId === defaultZoneId || t.priceZoneId === null);
  const sorted = [...showTiers].sort((a, b) => a.minQty - b.minQty);

  if (sorted.length === 0) {
    return (
      <div
        style={{
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 20, display: 'flex', flexDirection: 'column', gap: 4,
          boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>Escalera de precios</div>
        <div style={{ fontSize: 11.5, color: '#6b7280' }}>Zona General · por cantidad</div>
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12.5, color: '#6b7280' }}>
          Agrega tiers para ver la escalera.
        </div>
      </div>
    );
  }

  const maxQty = Math.max(...sorted.map(t => t.minQty), 10) * 1.3;
  const minPrice = Math.min(...sorted.map(t => t.price));
  const maxPrice = Math.max(...sorted.map(t => t.price), basePrice);
  const priceRange = maxPrice - minPrice;
  const yPad = priceRange * 0.15 || maxPrice * 0.1;
  const yMin = Math.max(0, minPrice - yPad);
  const yMax = maxPrice + yPad;

  const xScale = (q: number) =>
    PAD_L + (Math.log10(Math.max(1, q)) / Math.log10(Math.max(2, maxQty))) * innerW;
  const yScale = (p: number) =>
    PAD_T + innerH - ((p - yMin) / (yMax - yMin)) * innerH;

  let pathD = '';
  const points: { x: number; y: number; tier: PriceTierItem }[] = [];

  const first = sorted[0];
  pathD = `M ${xScale(first.minQty)} ${yScale(first.price)}`;
  points.push({ x: xScale(first.minQty), y: yScale(first.price), tier: first });

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    const x = xScale(t.minQty);
    const yPrev = yScale(sorted[i - 1].price);
    const y = yScale(t.price);
    pathD += ` L ${x} ${yPrev} L ${x} ${y}`;
    points.push({ x, y, tier: t });
  }
  const lastX = PAD_L + innerW;
  const lastY = yScale(sorted[sorted.length - 1].price);
  pathD += ` L ${lastX} ${lastY}`;

  const yTicks = [yMin, yMin + (yMax - yMin) * 0.5, yMax].map(v => Math.round(v));

  return (
    <div
      style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: 20, boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>Escalera de precios</div>
          <div style={{ fontSize: 11.5, color: '#6b7280' }}>Zona General · por cantidad</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
          background: 'var(--primary-soft, #dbeafe)', color: 'var(--primary-color, #2563eb)',
          border: '1px solid transparent',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--primary-color, #2563eb)' }} />
          {sorted.length} {sorted.length === 1 ? 'nivel' : 'niveles'}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 12 }}>
        {/* Base price reference */}
        <line
          x1={PAD_L} x2={W - PAD_R}
          y1={yScale(basePrice)} y2={yScale(basePrice)}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"
        />
        <text x={W - PAD_R - 2} y={yScale(basePrice) - 4} fontSize="9.5" fill="#9ca3af" textAnchor="end">
          base
        </text>

        {/* Y ticks */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <text
              x={PAD_L - 6} y={yScale(v) + 3}
              fontSize="9.5" fill="#6b7280" textAnchor="end"
              fontFamily="var(--font-mono, monospace)"
            >
              ${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            </text>
            <line x1={PAD_L} x2={PAD_L - 3} y1={yScale(v)} y2={yScale(v)} stroke="#e5e7eb" strokeWidth="1" />
          </g>
        ))}

        {/* Axes */}
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + innerH} stroke="#e5e7eb" strokeWidth="1" />

        {/* X qty labels */}
        {sorted.map((t, i) => (
          <text
            key={i}
            x={xScale(t.minQty)} y={PAD_T + innerH + 14}
            fontSize="9.5" fill="#6b7280" textAnchor="middle"
            fontFamily="var(--font-mono, monospace)"
          >
            {t.minQty.toLocaleString('es-MX')}+
          </text>
        ))}
        <text x={W - PAD_R} y={PAD_T + innerH + 28} fontSize="9.5" fill="#9ca3af" textAnchor="end">
          cantidad
        </text>

        {/* Fill */}
        <path
          d={`${pathD} L ${W - PAD_R} ${PAD_T + innerH} L ${PAD_L} ${PAD_T + innerH} Z`}
          fill="var(--primary-color, #2563eb)"
          fillOpacity="0.08"
        />

        {/* Stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--primary-color, #2563eb)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Break points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="var(--primary-color, #2563eb)" strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r="2" fill="var(--primary-color, #2563eb)" />
            {p.tier.tierLabel && (
              <g>
                <rect
                  x={p.x + 8} y={p.y - 16}
                  width={p.tier.tierLabel.length * 5.5 + 10} height={16}
                  rx={4} fill="#111827"
                />
                <text x={p.x + 13} y={p.y - 4} fontSize="9.5" fill="white" fontWeight="600">
                  {p.tier.tierLabel}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((t, i) => {
          const pct = pctOff(basePrice, t.price);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--primary-color, #2563eb)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>
                  {t.minQty.toLocaleString('es-MX')}+ uds.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#1f2937' }}>
                  {formatCurrency(t.price)}
                </span>
                {pct > 0 && (
                  <span style={{ color: '#047857', fontVariantNumeric: 'tabular-nums', fontSize: 10.5 }}>
                    −{pct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
