export type UserRole = 'admin' | 'vendedor';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductoVariacion {
  id: string;
  nombre: string;
  valor: string;
  stock: number;
  precio?: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  sku: string;
  precio: number;
  costo: number;
  categoria: string;
  imageUrl?: string;
  variaciones: ProductoVariacion[];
  stockTotal: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TipoMovimiento = 'reserva' | 'venta' | 'cancelacion' | 'ajuste' | 'entrada';

export interface MovimientoInventario {
  id: string;
  productoId: string;
  variacionId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  pedidoId?: string;
  usuarioId: string;
  notas?: string;
  createdAt: Date;
}

export type EstadoPedido = 'cotizado' | 'transmitido' | 'en_curso' | 'enviado' | 'cancelado' | 'pagado';

export interface PedidoLinea {
  id: string;
  productoId: string;
  variacionId: string;
  productoNombre: string;
  variacionNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  estado: EstadoPedido;
  lineas: PedidoLinea[];
  subtotal: number;
  impuestos: number;
  total: number;
  notas?: string;
  transmitido?: boolean; // Flag para saber si ya fue transmitido
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  notas?: string;
  activo: boolean;
  totalPedidos: number;
  totalGastado: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistorialPrecioCliente {
  id: string;
  productoId: string;
  clienteId: string;
  precio: number;
  cantidad: number;
  pedidoId: string;
  pedidoNumero: string;
  fecha: Date;
}

export interface DashboardStats {
  totalProductos: number;
  productosStockBajo: number;
  totalPedidos: number;
  pedidosPendientes: number;
  pedidosHoy: number;
  totalClientes: number;
  clientesNuevosMes: number;
  ventasMes: number;
  ventasHoy: number;
}

export interface VentasPorDia {
  fecha: string;
  total: number;
  pedidos: number;
}

export interface TopProducto {
  id: string;
  nombre: string;
  vendidos: number;
  ingresos: number;
}

export interface PedidoReciente {
  id: string;
  numero: string;
  clienteNombre: string;
  total: number;
  estado: EstadoPedido;
  fecha: Date;
}
