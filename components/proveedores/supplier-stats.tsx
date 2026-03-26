'use client';

import { Truck, TruckIcon, UserX, UserPlus, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/dashboard';
import { SupplierStatistics } from '@/services/suppliers';
import { formatCurrency } from '@/lib/utils';

interface SupplierStatsProps {
  statistics?: SupplierStatistics;
}

export function SupplierStats({ statistics }: SupplierStatsProps) {
  const totalSuppliers = statistics?.totalSuppliers ?? 0;
  const activeSuppliers = statistics?.activeSuppliers ?? 0;
  const inactiveSuppliers = statistics?.inactiveSuppliers ?? 0;
  const newSuppliersLastMonth = statistics?.newSuppliersLastMonth ?? 0;
  const totalPurchases = statistics?.totalPurchases ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="Total Proveedores"
        value={totalSuppliers}
        icon={Truck}
        iconClassName="bg-primary/10 text-primary"
      />
      <StatCard
        title="Proveedores Activos"
        value={activeSuppliers}
        icon={TruckIcon}
        iconClassName="bg-green-100 text-green-600"
      />
      <StatCard
        title="Proveedores Inactivos"
        value={inactiveSuppliers}
        icon={UserX}
        iconClassName="bg-red-100 text-red-600"
      />
      <StatCard
        title="Nuevos Último Mes"
        value={newSuppliersLastMonth}
        icon={UserPlus}
        iconClassName="bg-purple-100 text-purple-600"
      />
      <StatCard
        title="Total Compras"
        value={formatCurrency(totalPurchases)}
        icon={DollarSign}
        iconClassName="bg-emerald-100 text-emerald-600"
      />
    </div>
  );
}
