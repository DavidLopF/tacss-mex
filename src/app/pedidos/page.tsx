'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Search, Grid3X3, List, LayoutGrid } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { OrdersBoard, OrdersTable, OrdersKanban, OrderDetailModal, CreateOrderModal } from '@/components/pedidos';
import { Pedido, EstadoPedido } from '@/types';
import {
  getOrders,
  OrderStatus,
  changeOrderStatus,
  OrderStatusCode,
  ORDER_STATUS_LABELS,
  canTransitionToStatus,
  createOrder,
  updateOrder,
  CreateOrderDto,
} from '@/services';
import { useToast, useCrossTabSync } from '@/lib/hooks';
import { PermissionGuard } from '@/components/layout';
import { useOrdersStore, useCfdiStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';

// Mapeo de estados del backend a estados del frontend
const mapEstadoBackendToFrontend = (statusCode: string): EstadoPedido => {
  const mapping: Record<string, EstadoPedido> = {
    'COTIZADO': 'cotizado',
    'TRANSMITIDO': 'transmitido',
    'EN_CURSO': 'en_curso',
    'ENVIADO': 'enviado',
    'CANCELADO': 'cancelado',
  };
  return mapping[statusCode] || 'cotizado';
};

// Mapeo de estados del frontend a códigos del backend
const mapEstadoFrontendToBackendCode = (estado: EstadoPedido): OrderStatusCode => {
  const mapping: Record<string, OrderStatusCode> = {
    'cotizado': OrderStatusCode.COTIZADO,
    'transmitido': OrderStatusCode.TRANSMITIDO,
    'en_curso': OrderStatusCode.EN_CURSO,
    'enviado': OrderStatusCode.ENVIADO,
    'cancelado': OrderStatusCode.CANCELADO,
    'pagado': OrderStatusCode.ENVIADO,
  };
  return mapping[estado] || OrderStatusCode.COTIZADO;
};

// Convertir respuesta del backend a estructura Pedido
const mapOrdersToPedidos = (orderStatuses: OrderStatus[]): Pedido[] => {
  const pedidos: Pedido[] = [];
  
  orderStatuses.forEach(status => {
    status.orders.forEach(order => {
      const pedido: Pedido = {
        id: String(order.id),
        numero: order.code,
        clienteId: String(order.client.id),
        clienteNombre: order.client.name,
        clienteEmail: '',
        clienteTelefono: '',
        estado: mapEstadoBackendToFrontend(status.statusCode),
        lineas: order.items.map(item => ({
          id: String(item.id),
          productoId: String(item.variantId),
          variacionId: String(item.variantId),
          productoNombre: item.description,
          variacionNombre: item.variant.variantName,
          cantidad: item.qty,
          precioUnitario: parseFloat(item.unitPrice),
          subtotal: parseFloat(item.lineTotal),
        })),
        subtotal: parseFloat(order.total),
        impuestos: 0,
        total: parseFloat(order.total),
        notas: '',
        transmitido: status.statusCode !== 'COTIZADO',
        usuarioId: '1',
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.createdAt),
      };
      pedidos.push(pedido);
    });
  });
  
  return pedidos;
};

export default function PedidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Data & UI state (single shallow subscription) ──
  const { pedidos, loading, searchTerm } = useOrdersStore(useShallow((s) => ({
    pedidos: s.pedidos,
    loading: s.loading,
    searchTerm: s.searchTerm,
  })));

  // ── Actions (stable references) ──
  const setPedidos = useOrdersStore((s) => s.setPedidos);
  const setLoading = useOrdersStore((s) => s.setLoading);
  const setSearchTerm = useOrdersStore((s) => s.setSearchTerm);
  const updatePedidoEstado = useOrdersStore((s) => s.updatePedidoEstado);

  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tabla' | 'cards' | 'kanban'>('tabla');
  const toast = useToast();
  const markAsBilled = useCfdiStore((s) => s.markAsBilled);

  /**
   * Navega a /facturacion con el contexto del pedido en la URL.
   * La página de facturación lee estos params y pre-rellena el formulario.
   * Marca el pedido como "en_proceso" inmediatamente para feedback visual.
   */
  const handleEmitirCFDI = useCallback((pedido: Pedido) => {
    const params = new URLSearchParams({
      saleId:    pedido.id,
      clientId:  pedido.clienteId,
      saleCode:  pedido.numero,
      // Serializa las líneas del pedido para pre-rellenar los conceptos
      items: JSON.stringify(
        pedido.lineas.map((l) => ({
          description: [l.productoNombre, l.variacionNombre].filter(Boolean).join(' — '),
          quantity:    l.cantidad,
          unitPrice:   l.precioUnitario,
        }))
      ),
    });
    
    // Marcar como "en proceso" de facturación
    markAsBilled(pedido.id);
    
    router.push(`/facturacion?${params.toString()}`);
  }, [router, markAsBilled]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const orderStatuses = await getOrders();
      const pedidosMapeados = mapOrdersToPedidos(orderStatuses);
      setPedidos(pedidosMapeados);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar pedidos desde el backend
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Cross-tab sync: recargar cuando otra pestaña muta pedidos ──
  useCrossTabSync('orders', () => {
    loadOrders();
  });

  // ── Auto-abrir pedido cuando viene ?order=ID desde el dashboard ──
  useEffect(() => {
    const orderId = searchParams.get('order');
    if (!orderId || loading || pedidos.length === 0) return;
    const pedido = pedidos.find((p) => p.id === orderId);
    if (pedido) {
      setSelectedOrder(pedido);
      setIsDetailModalOpen(true);
      // Limpiar el param de la URL sin recargar
      router.replace('/pedidos', { scroll: false });
    }
  }, [pedidos, loading, searchParams, router]);

  const handleOrderClick = (pedido: Pedido) => {
    setSelectedOrder(pedido);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

  const handleCreateOrder = async (dto: CreateOrderDto) => {
    try {
      await createOrder(dto);
      toast.success('Pedido creado exitosamente');
      await loadOrders();
      broadcastInvalidation(['orders', 'inventory']);
    } catch (error) {
      console.error('Error al crear pedido:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al crear el pedido'
      );
    }
  };

  const handleEditOrder = async (dto: CreateOrderDto) => {
    if (!editingOrder) return;
    try {
      await updateOrder(parseInt(editingOrder.id), dto);
      toast.success('Pedido actualizado exitosamente');
      setIsEditModalOpen(false);
      setEditingOrder(null);
      await loadOrders();
      broadcastInvalidation(['orders', 'inventory']);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar el pedido'
      );
    }
  };

  const handleOrderUpdate = async (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    try {
      const currentStatusCode = getStatusCodeFromEstado(pedido.estado);
      const newStatusCode = mapEstadoFrontendToBackendCode(nuevoEstado);

      const validation = canTransitionToStatus(currentStatusCode, newStatusCode);
      if (!validation.valid) {
        toast.error(validation.error || 'Transición no válida');
        return;
      }

      // Actualizar optimistamente en el store
      updatePedidoEstado(pedido.id, nuevoEstado);

      const userId = 1;
      await changeOrderStatus(parseInt(pedido.id), { newStatusCode, userId });

      toast.success(`Pedido movido a ${nuevoEstado.toUpperCase()}`);
      broadcastInvalidation(['orders', 'inventory']);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cambiar el estado del pedido'
      );
      // Revertir recargando desde el backend
      await loadOrders();
    }
  };

  // Obtener código de estado desde string
  const getStatusCodeFromEstado = (estado: string): string => {
    const mapping: Record<string, string> = {
      'cotizado': 'COTIZADO',
      'transmitido': 'TRANSMITIDO',
      'en_curso': 'EN_CURSO',
      'enviado': 'ENVIADO',
      'cancelado': 'CANCELADO',
    };
    return mapping[estado] || 'COTIZADO';
  };

  // Handler para cambiar estado usando la API (desde el menú)
  const handleStatusChange = async (orderId: string, newStatusCode: OrderStatusCode) => {
    try {
      const pedido = pedidos.find(p => p.id === orderId);
      if (!pedido) return;

      const nuevoEstado = mapEstadoBackendToFrontend(ORDER_STATUS_LABELS[newStatusCode]);

      // Actualizar optimistamente en el store
      updatePedidoEstado(orderId, nuevoEstado);

      const userId = 1;
      await changeOrderStatus(parseInt(orderId), { newStatusCode, userId });

      toast.success('Estado del pedido actualizado correctamente');
      broadcastInvalidation(['orders', 'inventory']);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cambiar el estado del pedido'
      );
      
      // Revertir el cambio en caso de error
      await loadOrders();
    }
  };

  const filteredPedidos = pedidos.filter(pedido => 
    pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const stats = {
    total: pedidos.length,
    cotizados: pedidos.filter(p => p.estado === 'cotizado').length,
    enProceso: pedidos.filter(p => ['transmitido', 'en_curso', 'enviado'].includes(p.estado)).length,
    enviados: pedidos.filter(p => p.estado === 'enviado').length,
    cancelados: pedidos.filter(p => p.estado === 'cancelado').length,
    totalVentas: pedidos
      .filter(p => p.estado === 'enviado')
      .reduce((sum, p) => sum + p.total, 0),
  };

  return (
    <PermissionGuard moduleCode="PEDIDOS">
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500">Gestión de pedidos</p>
        </div>
        
        <Button className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-blue-600 mb-1">Cotizados</p>
          <p className="text-2xl font-bold text-blue-600">{stats.cotizados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-orange-600 mb-1">En Proceso</p>
          <p className="text-2xl font-bold text-orange-600">{stats.enProceso}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-cyan-600 mb-1">Enviados</p>
          <p className="text-2xl font-bold text-cyan-600">{stats.enviados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-red-600 mb-1">Cancelados</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelados}</p>
        </Card>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative max-w-lg w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número de pedido o cliente..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Vista Selector */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('tabla')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'tabla'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista tabla"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'cards'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista cards"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'kanban'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders - Dynamic View */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
            <p className="text-sm text-gray-500">Cargando pedidos...</p>
          </div>
        </div>
      ) : viewMode === 'tabla' ? (
        <OrdersTable
          pedidos={filteredPedidos}
          onOrderClick={handleOrderClick}
          onOrderUpdate={handleOrderUpdate}
          onStatusChange={handleStatusChange}
          onEmitirCFDI={handleEmitirCFDI}
        />
      ) : viewMode === 'cards' ? (
        <OrdersBoard
          pedidos={filteredPedidos}
          onOrderClick={handleOrderClick}
          onOrderUpdate={handleOrderUpdate}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <OrdersKanban
          pedidos={filteredPedidos}
          onOrderClick={handleOrderClick}
          onOrderUpdate={handleOrderUpdate}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Modal de Detalle */}
      <OrderDetailModal
        pedido={selectedOrder}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onEdit={(pedido) => {
          setEditingOrder(pedido);
          setIsDetailModalOpen(false);
          setIsEditModalOpen(true);
        }}
        onEmitirCFDI={handleEmitirCFDI}
      />

      {/* Modal de Creación */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateOrder}
      />

      {/* Modal de Edición */}
      <CreateOrderModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleEditOrder}
        editPedido={editingOrder ?? undefined}
      />
    </main>
    </PermissionGuard>
  );
}