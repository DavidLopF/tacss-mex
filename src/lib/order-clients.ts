import { Pedido } from '@/types';

const toName = (value: string | undefined) => (value ?? '').trim();

export const getOrderClientNames = (pedido: Pedido): string[] => {
  const primaryName = toName(pedido.clienteNombre);
  const shareNames = (pedido.clientShares ?? [])
    .map((share) => toName(share.clientName))
    .filter((name) => name.length > 0);

  let names = shareNames.length > 0 ? shareNames : (primaryName ? [primaryName] : []);
  if (primaryName && !names.includes(primaryName)) {
    names = [primaryName, ...names];
  }

  const seen = new Set<string>();
  return names.filter((name) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
};

export const getOrderClientLabel = (pedido: Pedido, separator = ' - ') => {
  const names = getOrderClientNames(pedido);
  return names.length > 0 ? names.join(separator) : '—';
};

export const getOrderClientSearchText = (pedido: Pedido) =>
  getOrderClientNames(pedido).join(' ').toLowerCase();

export const getOrderClientCountLabel = (pedido: Pedido) => {
  const count = getOrderClientNames(pedido).length;
  if (count === 0) return 'Sin clientes';
  if (count === 1) return '1 cliente';
  return `${count} clientes`;
};
