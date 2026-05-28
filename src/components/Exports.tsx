/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowUpRight, Plus, Search, FileText, Trash, Users, CheckCircle, 
  XCircle, Clock, Ban, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { ExportOrder, Product, Customer } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface ExportsProps {
  exports: ExportOrder[];
  products: Product[];
  customers: Customer[];
  user: any;
  onAddExport: (data: any) => Promise<any>;
  onUpdateExportStatus: (id: string, status: 'SHIPPED' | 'CANCELLED') => Promise<any>;
  onRefresh: () => void;
}

export default function Exports({ 
  exports, products, customers, user, 
  onAddExport, onUpdateExportStatus, onRefresh 
}: ExportsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Active lines
  const [lines, setLines] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: products[0]?.id || '', quantity: 1, price: products[0]?.exportPrice || 0 }
  ]);

  const handleAddLine = () => {
    setLines([...lines, { 
      productId: products[0]?.id || '', 
      quantity: 1, 
      price: products[0]?.exportPrice || 0 
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
        price: prod ? prod.exportPrice : 0
      };
    } else if (field === 'quantity') {
      updatedLines[index].quantity = Number(val);
    } else if (field === 'price') {
      updatedLines[index].price = Number(val);
    }
    setLines(updatedLines);
    setFormError('');
  };

  const calculateGrandTotal = () => {
    return lines.reduce((acc, l) => acc + (l.quantity * l.price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerId || lines.length === 0) {
      setFormError('Hãy nhập đầy đủ thông tin bốc dỡ.');
      return;
    }

    // Verify stock levels before posting (fail-fast client mechanism)
    let stockError = '';
    lines.forEach(line => {
      const prod = products.find(p => p.id === line.productId);
      if (!prod) return;
      if (prod.stock < line.quantity) {
        stockError = `Hàng "${prod.name}" trong tủ chỉ còn tồn ${prod.stock} đơn vị. Thiết lập xuất hàng số lượng ${line.quantity} là vượt kiểm soát!`;
      }
    });

    if (stockError) {
      setFormError(stockError);
      return;
    }

    const payload = {
      customerId,
      items: lines,
      notes
    };

    try {
      await onAddExport(payload);
      setIsFormOpen(false);
      setNotes('');
      setLines([{ productId: products[0]?.id || '', quantity: 1, price: products[0]?.exportPrice || 0 }]);
    } catch (err: any) {
      setFormError(err.error || 'Lỗi bốc xuất kho.');
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Xác nhận xuất kho hàng này? Việc này sẽ ghi trừ số lượng sản phẩm trên kệ vĩnh viễn.')) {
      try {
        await onUpdateExportStatus(id, 'SHIPPED');
      } catch (err: any) {
        alert(err.message || 'Lỗi bốc bốc xếp.');
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Hủy bỏ đơn bốc dỡ/yêu cầu giao hàng này?')) {
      await onUpdateExportStatus(id, 'CANCELLED');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-0.5 rounded-full font-bold uppercase">
            <CheckCircle className="h-3 w-3" /> Đã xuất kho
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 border border-red-500/20 text-red-600 px-2.5 py-0.5 rounded-full font-bold uppercase">
            <XCircle className="h-3 w-3" /> Đã huỷ bỏ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-450 px-2.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
            <Clock className="h-3 w-3" /> Đang chờ duyệt
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Header section with buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">LOGISTICS XUẤT KHO (OUTBOUND)</h2>
          <p className="text-slate-400 text-xs">Biên bản bàn giao thiết bị, bốc dỡ chuyển hàng hoá tới đối tác tiêu dùng.</p>
        </div>

        <button
          id="btn-open-export-form"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Báo cáo yêu cầu và xuất kho
        </button>
      </div>

      {/* Outbound multi-item document compiler */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-blue-500/25 rounded-2xl shadow-xl overflow-hidden p-6 animate-slide-in">
          <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <ArrowUpRight className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Tạo văn bản xuất hàng bốc kho mới</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="flex items-center gap-2 p-3.5 bg-red-500/5 text-red-600 border border-red-500/15 rounded-xl text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Đối tác / Khách hàng nhận hàng</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Ghi chú bốc dỡ</label>
                <input
                  type="text"
                  placeholder="Mẫu: Xuất chuyển đợt hàng siêu thị, giao trước 17H..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Sub-components lines */}
            <div className="space-y-3">
              <span className="block text-xs font-extrabold text-slate-500 uppercase">Danh mục xuất ({lines.length})</span>
              
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
                            <option key={p.id} value={p.id}>{p.name} (Sẵn có: {p.stock} {p.unit})</option>
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

                      {/* Export Price Override */}
                      <div className="w-full md:w-44 flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 font-bold">GIÁ BÁN:</span>
                        <input
                          type="number"
                          required
                          value={line.price}
                          onChange={(e) => handleLineChange(idx, 'price', e.target.value)}
                          className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      {/* Total */}
                      <div className="w-full md:w-36 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-350 pr-2">
                        {((line.quantity || 0) * (line.price || 0)).toLocaleString('vi-VN')} đ
                      </div>

                      {/* Remove */}
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

              {/* Add line */}
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                + Xuất bốc bổ sung hàng kèn khác
              </button>
            </div>

            {/* Sum and Drawer footer actions */}
            <div className="border-t border-slate-50 dark:border-slate-850 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-xs text-slate-400">GIÁ TRỊ TỔNG ĐƠN HÀNG XUẤT KHO</span>
                <p className="font-mono text-xl font-black text-blue-605 dark:text-blue-400 mt-0.5">
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
                  className="px-6 py-2.5 bg-blue-605 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  Gửi yêu cầu xuất kho ({user?.role === 'ADMIN' ? 'Có thế tự duyệt ngay' : 'Đưa vào hàng hóa chờ duyệt'})
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Historic outward lists */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-slate-100 dark:border-slate-850">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sổ đăng bốc xuất vận chuyển hàng</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 dark:bg-slate-950/25 dark:border-slate-850 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4">Ngày yêu cầu</th>
                <th className="p-4">Mã phiếu bốc</th>
                <th className="p-4">Đối tác khách nhận</th>
                <th className="p-4">Loại hàng / Khối lượng</th>
                <th className="p-4 text-right">Tổng thanh toán</th>
                <th className="p-4">Mô tả và Ghi chú</th>
                <th className="p-4 text-center">Trạng thái</th>
                {user?.role === 'ADMIN' && <th className="p-4 text-right">Hành động duyệt</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm text-slate-705 dark:text-slate-300">
              {exports.length > 0 ? (
                exports.map((exp) => {
                  const custName = customers.find(c => c.id === exp.customerId)?.name || 'Khác';
                  const totalUnits = exp.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-4 whitespace-nowrap text-xs font-mono text-slate-405">
                        {formatDate(exp.date)}
                      </td>
                      <td className="p-4 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {exp.code}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-205">
                        {custName}
                      </td>
                      <td className="p-4">{totalUnits} đơn vị hàng hóa</td>
                      <td className="p-4 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(exp.totalAmount)}
                      </td>
                      <td className="p-4 text-slate-400 max-w-[160px] truncate" title={exp.notes}>
                        {exp.notes || '—'}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(exp.status)}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {exp.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(exp.id)}
                                  className="flex items-center gap-1 p-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer"
                                  title="Phê chuẩn xếp đơn bốc lên xe"
                                >
                                  Duyệt Xuất
                                </button>
                                <button
                                  onClick={() => handleCancel(exp.id)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Từ chối/Huỷ phiếu bốc"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {exp.status === 'SHIPPED' && (
                              <span className="text-[10px] font-bold text-emerald-650 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> HOÀN TẤT
                              </span>
                            )}
                            {exp.status === 'CANCELLED' && (
                              <span className="text-[10px] font-bold text-slate-400">ĐÃ HUỶ</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 8 : 7} className="p-12 text-center text-slate-405">
                    <FileText className="h-10 w-10 mx-auto opacity-20 mb-3" />
                     Chưa có đơn xuất hàng bốc kho nào trong cơ sở dữ liệu.
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
