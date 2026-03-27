import { Users, UserCheck, UserX, UserPlus, DollarSign } from 'lucide-react';
import { StatCard } from '@/src/components/dashboard';
import { ClientStatistics } from '@/src/services/clients';
import { formatCurrency } from '@/src/lib/utils';

interface ClientStatsProps {
  statistics?: ClientStatistics;
}

export function ClientStats({ statistics }: ClientStatsProps) {
  const totalClients = statistics?.totalClients ?? 0;
  const activeClients = statistics?.activeClients ?? 0;
  const inactiveClients = statistics?.inactiveClients ?? 0;
  const newClientsLastMonth = statistics?.newClientsLastMonth ?? 0;
  const totalIncome = statistics?.totalIncome ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="Total Clientes"
        value={totalClients}
        icon={Users}
        iconClassName="bg-primary/10 text-primary"
      />
      <StatCard
        title="Clientes Activos"
        value={activeClients}
        icon={UserCheck}
        iconClassName="bg-green-100 text-green-600"
      />
      <StatCard
        title="Clientes Inactivos"
        value={inactiveClients}
        icon={UserX}
        iconClassName="bg-red-100 text-red-600"
      />
      <StatCard
        title="Nuevos Último Mes"
        value={newClientsLastMonth}
        icon={UserPlus}
        iconClassName="bg-purple-100 text-purple-600"
      />
      <StatCard
        title="Ingresos Totales"
        value={formatCurrency(totalIncome)}
        icon={DollarSign}
        iconClassName="bg-emerald-100 text-emerald-600"
      />
    </div>
  );
}
