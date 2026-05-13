'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './help-modal.module.css';

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

  const step = (n: number, title: string, children: ReactNode) => (
    <section className={styles.step}>
      <div className={styles.stepHeader}>
        <span className={styles.stepBadge}>{n}</span>
        <h3 className={styles.stepTitle}>{title}</h3>
      </div>
      {children}
    </section>
  );

  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      className={styles.overlay}
      aria-label="Cerrar"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerLabel}>
              Guía rápida
            </div>
            <h2 className={styles.title} id="help-modal-title">
              Cómo funcionan los descuentos
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step(1, 'Tiers por variante', (
            <p className={styles.bodyText}>
              Cada variante puede tener varios <strong>tiers</strong> (niveles de precio). Un tier define el precio unitario
              a partir de una <strong>cantidad mínima</strong>. Al crear un pedido, el sistema busca el tier más alto
              cuya cantidad mínima se cumpla y aplica ese precio.
            </p>
          ))}

          {step(2, 'Zonas de precio', (
            <>
              <p className={styles.bodyTextSpaced}>
                Cada tier pertenece a una <strong>zona</strong> (General, Mayorista, Distribuidor, VIP…). El cliente
                resuelve su precio según la zona que tenga asignada; si no hay tier para esa zona, cae al de{' '}
                <strong>General</strong>.
              </p>
              <div className={styles.infoBox}>
                <div className={styles.infoRow}>
                  <span className={styles.dot} />
                  <span><strong>General</strong>: zona default para cualquier cliente sin asignación.</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.dotPrimary} />
                  <span><strong>Mayorista / Distribuidor / VIP</strong>: precios específicos para el segmento.</span>
                </div>
              </div>
            </>
          ))}

          {step(3, 'Ejemplo práctico', (
            <>
              <p className={styles.bodyTextSpaced}>
                Variante <code className={styles.inlineCode}>AC-PLT-6MM-1.2X2.4</code> con 3 tiers:
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeaderRow}>
                      <th className={styles.tableHeaderCell}>Zona</th>
                      <th className={styles.tableHeaderCellRight}>Cant. mín.</th>
                      <th className={styles.tableHeaderCellRight}>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['General', '1+', '$4,850'],
                      ['General', '10+', '$4,650'],
                      ['Mayorista', '25+', '$4,450'],
                    ].map(([zona, qty, price]) => (
                      <tr key={`${zona}-${qty}-${price}`} className={styles.tableRow}>
                        <td className={styles.tableCell}>{zona}</td>
                        <td className={`${styles.tableCellRight} ${styles.mono}`}>{qty}</td>
                        <td className={`${styles.tableCellRight} ${styles.mono}`}>{price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className={styles.list}>
                <li>• Cliente General pide <strong>5 uds</strong> → paga <code className={styles.inlineCode}>$4,850</code> c/u.</li>
                <li>• Cliente General pide <strong>12 uds</strong> → paga <code className={styles.inlineCode}>$4,650</code> c/u.</li>
                <li>• Cliente Mayorista pide <strong>30 uds</strong> → paga <code className={styles.inlineCode}>$4,450</code> c/u.</li>
              </ul>
            </>
          ))}

          {step(4, 'Buenas prácticas', (
            <ul className={styles.listWide}>
              <li>• Siempre incluye un tier base <code className={styles.inlineCode}>1+</code> en zona General para asegurar precio por defecto.</li>
              <li>• Los tiers se ordenan automáticamente por cantidad mínima ascendente.</li>
              <li>• El precio debe bajar conforme sube la cantidad.</li>
              <li>• Si una variante no tiene tiers, se vende al precio base del producto.</li>
              <li>• Los tiers <strong>por variante</strong> tienen prioridad sobre los de categoría.</li>
            </ul>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            onClick={onClose}
            type="button"
            className={styles.footerButton}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
