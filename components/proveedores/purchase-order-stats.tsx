'use client';

import { ShoppingCart, DollarSign, FileText, Send, Package } from 'lucide-react';
import { StatCard } from '@/components/dashboard';
import { PurchaseOrderStatistics } from '@/services/suppliers';
import { formatCurrency } from '@/lib/utils';

interface PurchaseOrderStatsProps {
  statistics?: PurchaseOrderStatistics;
}

export function PurchaseOrderStats({ statistics }: PurchaseOrderStatsProps) {
  const totalOrders = statistics?.totalOrders ?? 0;
  const draftOrders = statistics?.draftOrders ?? 0;
  const sentOrders = statistics?.sentOrders ?? 0;
  const receivedOrders = statistics?.receivedOrders ?? 0;
  const totalSpent = statistics?.totalSpent ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="Total Órdenes"
        value={totalOrders}
        icon={ShoppingCart}
        iconClassName="bg-primary/10 text-primary"
      />
      <StatCard
        title="Borradores"
        value={draftOrders}
        icon={FileText}
        iconClassName="bg-gray-100 text-gray-600"
      />
      <StatCard
        title="Enviadas"
        value={sentOrders}
        icon={Send}
        iconClassName="bg-blue-100 text-blue-600"
      />
      <StatCard
        title="Recibidas"
        value={receivedOrders}
        icon={Package}
        iconClassName="bg-green-100 text-green-600"
      />
      <StatCard
        title="Total Comprado"
        value={formatCurrency(totalSpent)}
        icon={DollarSign}
        iconClassName="bg-emerald-100 text-emerald-600"
      />
    </div>
  );
}
