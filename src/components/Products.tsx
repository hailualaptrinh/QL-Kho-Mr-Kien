/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Plus, Filter, FileSpreadsheet, Printer, 
  Trash2, Edit, Check, Eye, Package, Upload, ArrowUpDown 
} from 'lucide-react';
import { Product, Category, Supplier } from '../types';
import { formatCurrency, exportToCSV } from '../utils';
import CsvBulkImporter from './CsvBulkImporter';

interface ProductsProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  user: any;
  onAddProduct: (data: any) => Promise<any>;
  onUpdateProduct: (id: string, data: any) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onRefresh: () => void;
}

export default function Products({ 
  products, categories, suppliers, user, 
  onAddProduct, onUpdateProduct, onDeleteProduct, onRefresh 
}: ProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState<Product | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ id: string; name: string } | null>(null);

  // New product form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [importPrice, setImportPrice] = useState(0);
  const [exportPrice, setExportPrice] = useState(0);
  const [unit, setUnit] = useState('Chiếc');
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Handle local image file parsing (mocking server upload via safe client Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Tệp ảnh phải nhỏ hơn 2MB!');
        return;
      }
      setUploadError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PROD-${Date.now().toString().slice(-6)}`);
    setCategoryId(categories[0]?.id || '');
    setImportPrice(0);
    setExportPrice(0);
    setUnit('Chiếc');
    setStock(0);
    setMinStock(5);
    setDescription('');
    setSupplierId(suppliers[0]?.id || '');
    setBarcode(`8936${Math.floor(10000000 + Math.random() * 90000000)}`);
    setImageUrl('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setCategoryId(p.categoryId);
    setImportPrice(p.importPrice);
    setExportPrice(p.exportPrice);
    setUnit(p.unit);
    setStock(p.stock);
    setMinStock(p.minStock);
    setDescription(p.description);
    setSupplierId(p.supplierId || suppliers[0]?.id || '');
    setBarcode(p.barcode);
    setImageUrl(p.image);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, code, categoryId, importPrice, exportPrice,
      unit, stock, minStock, description, supplierId, barcode, image: imageUrl
    };

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, payload);
    } else {
      await onAddProduct(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmData({ id, name });
  };

  const executeDelete = async (id: string) => {
    try {
      await onDeleteProduct(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi bốc xéo.');
    }
  };

  const handleExportProductsToExcel = () => {
    const headers = ['Mã sản phẩm', 'Tên sản phẩm', 'Danh mục', 'Đơn vị', 'Giá nhập', 'Giá xuất', 'Tồn kho', 'Hạn mức tối thiểu', 'Nhà cung cấp', 'Mã vạch'];
    const data = filteredProducts.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Khác';
      const sup = suppliers.find(s => s.id === p.supplierId)?.name || 'Khác';
      return [
        p.code,
        p.name,
        cat,
        p.unit,
        p.importPrice,
        p.exportPrice,
        p.stock,
        p.minStock,
        sup,
        p.barcode
      ];
    });
    exportToCSV('Danh_sach_san_pham_MrKienERP', headers, data);
  };

  const handlePrintBarcodeSheet = (p: Product) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>IN MÃ VẠCH - ${p.code}</title>
          <style>
            body { font-family: monospace; display: flex; flex-wrap: wrap; justify-content: center; padding: 20px; }
            .barcode-card { border: 1px dashed #000; padding: 15px; margin: 10px; width: 220px; text-align: center; }
            .barcode-line { height: 40px; background: linear-gradient(90deg, 
              #000 0%, #000 5%, transparent 5%, transparent 8%, 
              #000 8%, #000 12%, transparent 12%, transparent 15%,
              #000 15%, #000 25%, transparent 25%, transparent 30%,
              #000 30%, #000 32%, transparent 32%, transparent 40%,
              #000 40%, #000 42%, transparent 42%, transparent 48%,
              #000 48%, #000 55%, transparent 55%, transparent 60%,
              #000 60%, #000 70%, transparent 70%, transparent 75%,
              #000 75%, #000 85%, transparent 85%, transparent 90%,
              #000 90%, #000 100%
            ); margin: 10px 0; }
          </style>
        </head>
        <body>
          ${Array(12).fill(0).map(() => `
            <div class="barcode-card">
              <strong style="font-size:12px;">MR KIÊN ERP</strong><br/>
              <span style="font-size:10px;">${p.name.slice(0, 24)}...</span>
              <div class="barcode-line"></div>
              <strong style="letter-spacing: 2px;">${p.barcode}</strong><br/>
              <span style="font-size:10px;">Giá: ${p.exportPrice.toLocaleString('vi-VN')} đ</span>
            </div>
          `).join('')}
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter & search core logics
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    let comparator = 0;
    if (sortBy === 'name') comparator = a.name.localeCompare(b.name);
    else if (sortBy === 'stock') comparator = a.stock - b.stock;
    else if (sortBy === 'price') comparator = a.exportPrice - b.exportPrice;
    return sortOrder === 'asc' ? comparator : -comparator;
  });

  const toggleSort = (field: 'name' | 'stock' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header and filters */}
      <div className="bg-white dark:bg-slate-900 duration-150 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            id="input-product-search"
            type="text"
            placeholder="Tìm nhanh theo tên, mã sản phẩm hoặc barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-805 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Dynamic filters and Excel export downloads */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-850">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              id="select-product-categories"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-600 dark:text-slate-300 font-bold focus:outline-none"
            >
              <option value="ALL">Tất cả danh mục ({products.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            id="btn-export-products"
            onClick={handleExportProductsToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.add_products) && (
            <>
              <button
                id="btn-import-products-csv"
                onClick={() => setShowBulkImport(true)}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Upload className="h-4 w-4" /> Nhập CSV hàng loạt
              </button>
              <button
                id="btn-add-product"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" /> Thêm sản phẩm
              </button>
            </>
          )}

        </div>
      </div>

      {/* Grid or table table products */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 dark:bg-slate-950/40 dark:border-slate-850 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4 w-20">Ảnh</th>
                <th className="p-4 cursor-pointer hover:text-slate-600 dark:hover:text-amber-450 select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">Sản phẩm <ArrowUpDown className="h-3.5 w-3.5" /></div>
                </th>
                <th className="p-4">Danh mục</th>
                <th className="p-4 text-right">Giá nhập</th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('price')}>
                  <div className="flex items-center justify-end gap-1">Giá xuất <ArrowUpDown className="h-3.5 w-3.5" /></div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center justify-end gap-1">Tồn kho <ArrowUpDown className="h-3.5 w-3.5" /></div>
                </th>
                <th className="p-4 text-center">Đơn vị</th>
                <th className="p-4 text-center">Mã vạch / QR</th>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.edit_products) && <th className="p-4 text-right w-24">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const cat = categories.find(c => c.id === p.categoryId)?.name || 'Khác';
                  const isLowStock = p.stock < p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-200 text-sm transition-colors">
                      <td className="p-4">
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{p.code}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1 rounded-full">
                          {cat}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-500 whitespace-nowrap">
                        {formatCurrency(p.importPrice)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(p.exportPrice)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-bold ${isLowStock ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                            {p.stock}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 font-bold px-1 rounded mt-0.5 animate-pulse">
                              Dưới định mức ({p.minStock})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-xs font-semibold text-slate-500">{p.unit}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-mono tracking-wider">{p.barcode}</span>
                          <button 
                            onClick={() => setIsBarcodeOpen(p)}
                            className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-500 dark:text-slate-300 hover:text-blue-600 rounded cursor-pointer"
                            title="Xếp chi tiết mã vạch"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.edit_products) && (
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa sản phẩm"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                              title="Xoá vĩnh viễn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.edit_products) ? 9 : 8} className="p-12 text-center text-slate-400">
                    <Package className="h-10 w-10 mx-auto opacity-20 mb-3" />
                     Không tìm thấy sản phẩm nào khớp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form editing modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-950 dark:text-white">
                {editingProduct ? 'Chỉnh sửa sản phẩm ERP' : 'Thêm mới hàng hoá'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mã sản phẩm</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mã vạch (Barcode)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tấm Thép phi 10 xây dựng..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Danh mục</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Đơn vị tính</label>
                  <input
                    type="text"
                    required
                    placeholder="Chai, Tấn, Chiếc, Bộ..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Nhà cung cấp gốc</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Hạn mức tồn kho thấp</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Giá nhập (VND)</label>
                  <input
                    type="number"
                    value={importPrice}
                    onChange={(e) => setImportPrice(Number(e.target.value))}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Giá xuất (VND)</label>
                  <input
                    type="number"
                    value={exportPrice}
                    onChange={(e) => setExportPrice(Number(e.target.value))}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Khởi tạo tồn</label>
                  <input
                    type="number"
                    value={stock}
                    disabled={!!editingProduct}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload image as file or text string URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>Ảnh sản phẩm (URL hoặc tải tệp)</span>
                  {uploadError && <span className="text-red-500 normal-case">{uploadError}</span>}
                </label>
                <div className="flex gap-2 items-center mt-1.5">
                  <input
                    type="text"
                    placeholder="URL ảnh hoặc Base64 tải từ nút bên cạnh..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                  <label className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:text-blue-500 text-slate-600 rounded-lg cursor-pointer flex items-center shadow-inner">
                    <Upload className="h-4 w-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Mô tả chi tiết</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 h-20 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl cursor-pointer"
                >Huỷ bỏ</button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow cursor-pointer hover:bg-blue-700"
                >{editingProduct ? 'Cập nhật lại' : 'Tạo mới'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Barcode & Label print preview overlay */}
      {isBarcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsBarcodeOpen(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold"
            >✕</button>

            <div className="text-center space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">In nhãn hàng hoá ERP</h3>
              <p className="text-slate-400 text-xs">{isBarcodeOpen.name}</p>
              
              <div className="border border-dashed border-slate-350 dark:border-slate-700 p-4 bg-white rounded-xl inline-block">
                <span className="text-[10px] text-slate-400 font-sans block tracking-widest font-semibold uppercase mb-1">MR KIÊN LOGISTICS</span>
                <div 
                  className="h-10 w-48 mx-auto" 
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #000 0%, #000 5%, transparent 5%, transparent 8%, #000 8%, #000 12%, transparent 12%, transparent 15%, #000 15%, #000 25%, transparent 25%, transparent 30%, #000 30%, #000 32%, transparent 32%, transparent 40%, #000 40%, #000 42%, transparent 42%, transparent 48%, #000 48%, #000 55%, transparent 55%, transparent 60%, #000 60%, #000 70%, transparent 70%, transparent 75%, #000 75%, #000 85%, transparent 85%, transparent 90%, #000 90%, #000 100%)',
                    backgroundSize: '100% 100%'
                  }}
                />
                <span className="font-mono text-sm tracking-widest font-bold text-slate-900 block mt-1.5">{isBarcodeOpen.barcode}</span>
              </div>

              <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                Sử dụng các nhãn in nhiệt mã vạch này để dán vào tủ phân kho.
              </div>

              <button
                onClick={() => handlePrintBarcodeSheet(isBarcodeOpen)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Bắt đầu in 12 tem dán
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkImport && (
        <CsvBulkImporter
          type="products"
          categories={categories}
          suppliers={suppliers}
          onAdd={onAddProduct}
          onClose={() => setShowBulkImport(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-xl font-bold">
                ⚠️
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Xác nhận xoá vĩnh viễn</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Bạn có chắc chắn muốn xoá vĩnh viễn sản phẩm <strong className="text-slate-900 dark:text-white">"{deleteConfirmData.name}"</strong> khỏi hệ thống ERP? Việc này không thể phục hồi dữ liệu.
              </p>
              
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmData(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = deleteConfirmData.id;
                    setDeleteConfirmData(null);
                    await executeDelete(id);
                  }}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Xác nhận xoá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
