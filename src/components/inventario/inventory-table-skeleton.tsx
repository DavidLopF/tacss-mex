import { Card } from '@/components/ui';

interface InventoryTableSkeletonProps {
  rows?: number;
}

export function InventoryTableSkeleton({ rows = 10 }: InventoryTableSkeletonProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Producto
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                SKU
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Categoría
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Stock
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Precio
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Estado
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
