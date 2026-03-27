'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Minus, X, Upload } from 'lucide-react';
import { Modal, Button, Card, CardContent, Select } from '@/src/components/ui';
import { Producto, ProductoVariacion } from '@/src/types';
import { getCategories, createProduct, CategoryDto, CreateProductDto } from '@/src/services/products';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onError?: (message: string) => void;
}

const variacionesTemplate = [
  { nombre: 'Talla', valores: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { nombre: 'Color', valores: ['Rojo', 'Azul', 'Verde', 'Negro', 'Blanco', 'Gris'] },
  { nombre: 'Talla Calzado', valores: ['22', '23', '24', '25', '26', '27', '28', '29', '30'] },
];

export function CreateProductModal({ isOpen, onClose, onSave, onError }: CreateProductModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState<number>(0);
  const [costo, setCosto] = useState<number>(0);
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [imagen, setImagen] = useState('');
  const [variaciones, setVariaciones] = useState<ProductoVariacion[]>([]);
  const [tipoVariacion, setTipoVariacion] = useState('');
  const [valorVariacion, setValorVariacion] = useState('');
  const [stockVariacion, setStockVariacion] = useState<number>(0);
  
  // Estados para categorías del backend
  const [categorias, setCategorias] = useState<CategoryDto[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cargar categorías cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadCategorias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const cats = await getCategories();
      setCategorias(cats);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      if (onError) {
        onError('No se pudieron cargar las categorías. Verifica que el servidor esté en ejecución.');
      }
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleReset = () => {
    setNombre('');
    setDescripcion('');
    setSku('');
    setPrecio(0);
    setCosto(0);
    setCategoriaId('');
    setImagen('');
    setVariaciones([]);
    setTipoVariacion('');
    setValorVariacion('');
    setStockVariacion(0);
    setSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAddVariacion = () => {
    if (!tipoVariacion || !valorVariacion) return;

    const newVariacion: ProductoVariacion = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: tipoVariacion,
      valor: valorVariacion,
      stock: stockVariacion,
    };

    setVariaciones([...variaciones, newVariacion]);
    setValorVariacion('');
    setStockVariacion(0);
  };

  const handleRemoveVariacion = (id: string) => {
    setVariaciones(variaciones.filter(v => v.id !== id));
  };

  const handleVariacionStockChange = (id: string, newStock: number) => {
    setVariaciones(variaciones.map(v =>
      v.id === id ? { ...v, stock: Math.max(0, newStock) } : v
    ));
  };

  const handleSubmit = async () => {
    if (!nombre || !sku || !categoriaId || variaciones.length === 0) {
      alert('Por favor complete todos los campos requeridos y agregue al menos una variación');
      return;
    }

    setSubmitting(true);

    try {
      // Preparar el DTO para el backend
      const createDto: CreateProductDto = {
        name: nombre,
        description: descripcion || undefined,
        sku,
        categoryId: Number(categoriaId),
        defaultPrice: precio,
        cost: costo || undefined,
        currency: 'MXN',
        image: imagen || undefined,
        variants: variaciones.map(v => ({
          variantName: `${v.nombre}: ${v.valor}`,
          stock: v.stock,
        })),
      };

      // Llamar al backend
      await createProduct(createDto);
      
      // Mapear la respuesta al formato del frontend para actualizar la UI
      const stockTotal = variaciones.reduce((sum, v) => sum + v.stock, 0);
      const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);

      const newProduct: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'> = {
        nombre,
        descripcion,
        sku,
        precio,
        costo,
        categoria: categoriaSeleccionada?.name || '',
        imageUrl: imagen || undefined,
        variaciones,
        stockTotal,
        activo: true,
      };

      onSave(newProduct);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error al crear producto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (onError) {
        onError(`Error al crear el producto: ${errorMessage}. Verifica que el servidor esté en ejecución.`);
      } else {
        alert('Error al crear el producto. Por favor intente nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stockTotal = variaciones.reduce((sum, v) => sum + v.stock, 0);
  const valoresDisponibles = variacionesTemplate.find(v => v.nombre === tipoVariacion)?.valores || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nuevo Producto"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Información Básica */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Camiseta Premium"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Ej: CAM-PREM-001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <Select 
                value={categoriaId} 
                onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingCategorias}
              >
                <option value="">
                  {loadingCategorias ? 'Cargando...' : 'Seleccione una categoría'}
                </option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Descripción del producto..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de Imagen
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <Upload className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {imagen && (
                <div className="mt-3 aspect-square rounded-lg overflow-hidden bg-gray-100 max-w-[200px]">
                  <Image
                    src={imagen}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Venta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={precio || ''}
                    onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={costo || ''}
                    onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {precio > 0 && costo > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Margen de Ganancia:</span>
                    <span className={`font-semibold ${precio > costo ? 'text-green-600' : 'text-red-600'}`}>
                      {((precio - costo) / precio * 100).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Variaciones */}
        <div className="border-t pt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Variaciones y Stock <span className="text-red-500">*</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Select
              value={tipoVariacion}
              onChange={(e) => {
                setTipoVariacion(e.target.value);
                setValorVariacion('');
              }}
            >
              <option value="">Tipo de variación</option>
              {variacionesTemplate.map((template) => (
                <option key={template.nombre} value={template.nombre}>
                  {template.nombre}
                </option>
              ))}
            </Select>

            {tipoVariacion ? (
              <Select
                value={valorVariacion}
                onChange={(e) => setValorVariacion(e.target.value)}
              >
                <option value="">Seleccione valor</option>
                {valoresDisponibles.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </Select>
            ) : (
              <input
                type="text"
                value={valorVariacion}
                onChange={(e) => setValorVariacion(e.target.value)}
                placeholder="Valor"
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
            )}

            <input
              type="number"
              value={stockVariacion || ''}
              onChange={(e) => setStockVariacion(parseInt(e.target.value) || 0)}
              placeholder="Stock"
              min="0"
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <Button
              onClick={handleAddVariacion}
              disabled={!tipoVariacion || !valorVariacion}
              className="flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </div>

          {variaciones.length > 0 ? (
            <div className="space-y-2">
              {variaciones.map((variacion) => (
                <Card key={variacion.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-900 text-sm">
                          {variacion.nombre}: {variacion.valor}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleVariacionStockChange(variacion.id, variacion.stock - 1)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            value={variacion.stock}
                            onChange={(e) => handleVariacionStockChange(variacion.id, parseInt(e.target.value) || 0)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                          <button
                            onClick={() => handleVariacionStockChange(variacion.id, variacion.stock + 1)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                        
                        <span className="text-sm text-gray-600 w-12 text-center">uds</span>
                        
                        <button
                          onClick={() => handleRemoveVariacion(variacion.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardContent className="p-3 bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Stock Total:</span>
                    <span className="text-xl font-bold text-purple-600">{stockTotal} unidades</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">No hay variaciones agregadas</p>
              <p className="text-xs text-gray-400 mt-1">Agregue al menos una variación para continuar</p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!nombre || !sku || !categoriaId || variaciones.length === 0 || submitting}
          >
            {submitting ? 'Creando...' : 'Crear Producto'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
