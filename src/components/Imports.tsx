/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowDownLeft, Plus, Search, FileText, Trash, Calendar, 
  ChevronRight, Sparkles, CheckCircle, Clock 
} from 'lucide-react';
import { ImportOrder, Product, Supplier } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface ImportsProps {
  imports: ImportOrder[];
  products: Product[];
  suppliers: Supplier[];
  user: any;
  onAddImport: (data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Imports({ imports, products, suppliers, user, onAddImport, onRefresh }: ImportsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [notes, setNotes] = useState('');
  
  // Current active line-items on invoice
  const [lines, setLines] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: products[0]?.id || '', quantity: 1, price: products[0]?.importPrice || 0 }
  ]);

  const handleAddLine = () => {
    setLines([...lines, { 
      productId: products[0]?.id || '', 
      quantity: 1, 
      price: products[0]?.importPrice || 0 
    }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, idx) => idx !== index));
    }
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    const updatedLines = [...lines];
    if (field === 'productId') {
      const prod = products.find(p => p.id === val);
      updatedLines[index] = {
        productId: val,
        quantity: updatedLines[index].quantity,
        price: prod ? prod.importPrice : 0
      };
    } else if (field === 'quantity') {
      updatedLines[index].quantity = Number(val);
    } else if (field === 'price') {
      updatedLines[index].price = Number(val);
    }
    setLines(updatedLines);
  };

  const calculateGrandTotal = () => {
    return lines.reduce((acc, l) => acc + (l.quantity * l.price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.length === 0) {
      alert('Vui lòng chọn nhà cung cấp và nhập ít nhất một dòng hàng!');
      return;
    }

    const payload = {
      supplierId,
      items: lines,
      notes
    };

    await onAddImport(payload);
    setIsFormOpen(false);
    setNotes('');
    setLines([{ productId: products[0]?.id || '', quantity: 1, price: products[0]?.importPrice || 0 }]);
  };

  return (
    <div className="space-y-6">
      
      {/* Top action layout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">LOGISTICS NHẬP KHO (INBOUND)</h2>
          <p className="text-slate-400 text-xs">Biên bản mua sắm vật liệu, bốc bổ sung kho từ nhà cung cấp phân bổ.</p>
        </div>
        
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'STOCKKEEPER' || user?.permissions?.add_imports) ? (
          <button
            id="btn-open-import-form"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Tạo phiếu nhập mới
          </button>
        ) : (
          <div className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium px-3 py-1.5 rounded-lg border border-dashed border-slate-200">
            * Chỉ xem danh mục (Thủ kho hoặc Quản lý được tạo đơn mới)
          </div>
        )}
      </div>

      {/* Interactive Multi-item input builder Drawer form */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-2xl shadow-xl overflow-hidden p-6 animate-slide-in">
          <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Soạn thảo phiếu nhập kho mới</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Đối tác / Nhà cung cấp</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Chi chú phiếu nhập</label>
                <input
                  type="text"
                  placeholder="Mẫu: Bổ sung màn hình dự án cao ốc quý II..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic line item builder */}
            <div className="space-y-3">
              <span className="block text-xs font-extrabold text-slate-500 uppercase">Dòng hàng hóa nhập ({lines.length})</span>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lines.map((line, idx) => {
                  const selProd = products.find(p => p.id === line.productId);
                  return (
                    <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                      
                      {/* Product Selector */}
                      <div className="flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock} {p.unit})</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-full md:w-32">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200">
                          <input
                            type="number"
                            min="1"
                            required
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-transparent text-center text-xs text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold pr-2">{selProd?.unit || 'Chiếc'}</span>
                        </div>
                      </div>

                      {/* Import Price Override */}
                      <div className="w-full md:w-44 flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Giá:</span>
                        <input
                          type="number"
                          required
                          value={line.price}
                          onChange={(e) => handleLineChange(idx, 'price', e.target.value)}
                          className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      {/* Row Total */}
                      <div className="w-full md:w-36 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-350 pr-2">
                        {((line.quantity || 0) * (line.price || 0)).toLocaleString('vi-VN')} đ
                      </div>

                      {/* Action Cancel */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>

                    </div>
                  );
                })}
              </div>

              {/* Add row controller */}
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                + Bổ sung thêm một thiết bị/sản phẩm mới
              </button>
            </div>

            {/* Sum and Drawer footer actions */}
            <div className="border-t border-slate-50 dark:border-slate-850 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-xs text-slate-400">TỔNG GIÁ TRỊ PHIẾU NHẬP</span>
                <p className="font-mono text-xl font-black text-rose-600 dark:text-rose-450 mt-0.5">
                  {formatCurrency(calculateGrandTotal())}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  Giao kho hàng & Hoàn thành
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Historic records timeline table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-850">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lịch sử bốc dỡ nhập hàng</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px] lg:min-w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 dark:bg-slate-950/25 dark:border-slate-850 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4 w-40 whitespace-nowrap">Thời gian</th>
                <th className="p-4 w-32 whitespace-nowrap">Mã phiếu</th>
                <th className="p-4 min-w-[200px] whitespace-nowrap">Nhà cung cấp</th>
                <th className="p-4 w-44 whitespace-nowrap">Số lượng sản phẩm</th>
                <th className="p-4 w-36 text-right whitespace-nowrap">Tổng thanh toán</th>
                <th className="p-4 min-w-[150px] whitespace-nowrap">Ghi chú</th>
                <th className="p-4 w-32 text-center whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm text-slate-705 dark:text-slate-300">
              {imports.length > 0 ? (
                imports.map((imp) => {
                  const sName = suppliers.find(s => s.id === imp.supplierId)?.name || 'Khác';
                  const totalQty = imp.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={imp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-4 w-40 whitespace-nowrap text-xs font-mono text-slate-400">
                        {formatDate(imp.date)}
                      </td>
                      <td className="p-4 w-32 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {imp.code}
                      </td>
                      <td className="p-4 min-w-[200px] font-semibold text-slate-800 dark:text-slate-202">
                        {sName}
                      </td>
                      <td className="p-4 w-44 whitespace-nowrap">{totalQty} đơn vị hàng</td>
                      <td className="p-4 w-36 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(imp.totalAmount)}
                      </td>
                      <td className="p-4 min-w-[150px] text-slate-400 truncate" title={imp.notes}>
                        {imp.notes || '—'}
                      </td>
                      <td className="p-4 w-32 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full font-bold uppercase">
                          <CheckCircle className="h-3 w-3" /> Đã nhập kho
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Calendar className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    Chưa có hoạt động nhập kho nào được lưu trữ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
