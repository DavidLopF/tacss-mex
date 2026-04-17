'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const step = (n: number, title: string, children: React.ReactNode) => (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', color: 'white',
          fontSize: 11, fontWeight: 700, background: 'var(--primary-color, #2563eb)', flexShrink: 0,
        }}>
          {n}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </section>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(17,24,39,0.45)',
        animation: 'backdropIn 0.18s ease-out both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 640,
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(16,24,40,0.18)',
          animation: 'slideUp 0.22s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>
              Guía rápida
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1f2937' }}>
              Cómo funcionan los descuentos
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24, fontSize: 13.5, lineHeight: 1.6, color: '#1f2937' }}>
          {step(1, 'Tiers por variante', (
            <p style={{ color: '#4b5563', margin: 0 }}>
              Cada variante puede tener varios <strong>tiers</strong> (niveles de precio). Un tier define el precio unitario
              a partir de una <strong>cantidad mínima</strong>. Al crear un pedido, el sistema busca el tier más alto
              cuya cantidad mínima se cumpla y aplica ese precio.
            </p>
          ))}

          {step(2, 'Zonas de precio', (
            <>
              <p style={{ color: '#4b5563', margin: '0 0 12px' }}>
                Cada tier pertenece a una <strong>zona</strong> (General, Mayorista, Distribuidor, VIP…). El cliente
                resuelve su precio según la zona que tenga asignada; si no hay tier para esa zona, cae al de{' '}
                <strong>General</strong>.
              </p>
              <div style={{
                background: '#fafbf7', borderRadius: 8, padding: 12,
                fontSize: 12, color: '#4b5563', border: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#9ca3af', flexShrink: 0 }} />
                  <span><strong>General</strong> — zona default para cualquier cliente sin asignación.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--primary-color, #2563eb)', flexShrink: 0 }} />
                  <span><strong>Mayorista / Distribuidor / VIP</strong> — precios específicos para el segmento.</span>
                </div>
              </div>
            </>
          ))}

          {step(3, 'Ejemplo práctico', (
            <>
              <p style={{ color: '#4b5563', margin: '0 0 12px' }}>
                Variante <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>AC-PLT-6MM-1.2X2.4</code> con 3 tiers:
              </p>
              <div style={{ background: '#fafbf7', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 12 }}>
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Zona</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Cant. mín.</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['General', '1+', '$4,850'],
                      ['General', '10+', '$4,650'],
                      ['Mayorista', '25+', '$4,450'],
                    ].map(([zona, qty, price], i) => (
                      <tr key={i} style={{ borderBottom: i < 2 ? '1px solid #e5e7eb' : 'none' }}>
                        <td style={{ padding: '8px 12px' }}>{zona}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', color: '#4b5563', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>• Cliente General pide <strong>5 uds</strong> → paga <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>$4,850</code> c/u.</li>
                <li>• Cliente General pide <strong>12 uds</strong> → paga <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>$4,650</code> c/u.</li>
                <li>• Cliente Mayorista pide <strong>30 uds</strong> → paga <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>$4,450</code> c/u.</li>
              </ul>
            </>
          ))}

          {step(4, 'Buenas prácticas', (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>• Siempre incluye un tier base <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>1+</code> en zona General para asegurar precio por defecto.</li>
              <li>• Los tiers se ordenan automáticamente por cantidad mínima ascendente.</li>
              <li>• El precio debe bajar conforme sube la cantidad.</li>
              <li>• Si una variante no tiene tiers, se vende al precio base del producto.</li>
              <li>• Los tiers <strong>por variante</strong> tienen prioridad sobre los de categoría.</li>
            </ul>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end',
          background: '#fafbf7', position: 'sticky', bottom: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--primary-color, #2563eb)', color: 'white',
              border: 'none', borderRadius: 8, padding: '7px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
