/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Boxes, Send, CheckSquare, ClipboardList, AlertCircle, 
  MapPin, Plus, CheckCircle, RefreshCw, Layers 
} from 'lucide-react';
import { Warehouse, Product, StockMove, Stocktake } from '../types';
import { formatDate } from '../utils';

interface WarehousesProps {
  warehouses: Warehouse[];
  products: Product[];
  mutations: StockMove[];
  stocktakes: Stocktake[];
  user: any;
  onAddWarehouse: (data: any) => Promise<any>;
  onTransferStock: (data: any) => Promise<any>;
  onAuditStock: (data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Warehouses({
  warehouses, products, mutations, stocktakes, user,
  onAddWarehouse, onTransferStock, onAuditStock, onRefresh
}: WarehousesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'transfer' | 'audit' | 'logs'>('status');

  // Form schemas
  const [isNewWHOpen, setIsNewWHOpen] = useState(false);
  const [whName, setWhName] = useState('');
  const [whLoc, setWhLoc] = useState('');

  // Stock transfer states
  const [fromWhId, setFromWhId] = useState(warehouses[0]?.id || '');
  const [toWhId, setToWhId] = useState(warehouses[1]?.id || '');
  const [transProdId, setTransProdId] = useState(products[0]?.id || '');
  const [transQty, setTransQty] = useState(1);
  const [transNotes, setTransNotes] = useState('');
  const [transferError, setTransferError] = useState('');

  // Audit state
  const [auditWhId, setAuditWhId] = useState(warehouses[0]?.id || '');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditCounts, setAuditCounts] = useState<{ [productId: string]: number }>({});
  const [auditReasons, setAuditReasons] = useState<{ [productId: string]: string }>({});

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whLoc) return;
    await onAddWarehouse({ name: whName, location: whLoc, managerId: 'emp-1' });
    setIsNewWHOpen(false);
    setWhName('');
    setWhLoc('');
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');

    if (fromWhId === toWhId) {
      setTransferError('Kho bốc và kho nhận không thể trùng nhau!');
      return;
    }

    const selProd = products.find(p => p.id === transProdId);
    if (!selProd || selProd.stock < transQty) {
      setTransferError(`Sản phẩm "${selProd?.name}" không đủ số lượng tồn (${selProd?.stock} đơn vị) để vận chuyển chuyển tiếp.`);
      return;
    }

    await onTransferStock({
      fromWarehouseId: fromWhId,
      toWarehouseId: toWhId,
      productId: transProdId,
      quantity: transQty,
      notes: transNotes
    });

    setTransNotes('');
    setTransQty(1);
    alert('Điều chuyển hàng hóa liên tỉnh thành công!');
  };

  const initAuditMockLines = (whId: string) => {
    const counts: { [productId: string]: number } = {};
    const reasons: { [productId: string]: string } = {};
    products.forEach(p => {
      counts[p.id] = p.stock; // load expected initially
      reasons[p.id] = 'Số liệu khớp bốc kho';
    });
    setAuditCounts(counts);
    setAuditReasons(reasons);
    setAuditWhId(whId);
  };

  const handleAuditCountChange = (prodId: string, val: number) => {
    setAuditCounts({ ...auditCounts, [prodId]: Number(val) });
  };

  const handleAuditReasonChange = (prodId: string, val: string) => {
    setAuditReasons({ ...auditReasons, [prodId]: val });
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build check payload
    const auditItems = products.map(p => {
      const prevExpected = p.stock;
      const actQty = auditCounts[p.id] !== undefined ? auditCounts[p.id] : prevExpected;
      return {
        productId: p.id,
        actualQty: actQty,
        reason: auditReasons[p.id] || (actQty !== prevExpected ? 'Hao hụt kiểm toán định kỳ' : 'Số liệu cân khớp')
      };
    });

    await onAuditStock({
      warehouseId: auditWhId,
      items: auditItems,
      notes: auditNotes
    });

    setAuditNotes('');
    alert('Biên bản chỉnh lý kiểm kê kho đã nộp và cập nhật số liệu vật lý thành công!');
    setActiveSubTab('status');
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'status' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-550 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
          >
            <Boxes className="h-4 w-4" /> Bản Phân Phối Kho Bãi
          </button>
          
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => {
                  setActiveSubTab('transfer');
                  setTransferError('');
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'transfer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-550 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <Send className="h-4 w-4" /> Vận Chuyển Nội Bộ
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('audit');
                  initAuditMockLines(warehouses[0]?.id || '');
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-550 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <CheckSquare className="h-4 w-4" /> Kiểm Kê Định Kỳ
              </button>
            </>
          )}

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-550 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
          >
            <ClipboardList className="h-4 w-4" /> Nhật ký kiểm toán kho
          </button>
        </div>

        {activeSubTab === 'status' && user?.role === 'ADMIN' && (
          <button
            id="btn-add-warehouse"
            onClick={() => setIsNewWHOpen(!isNewWHOpen)}
            className="px-4 py-2 bg-blue-605 text-white hover:bg-blue-700 font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95"
          >
            + Xây chi nhánh kho mới
          </button>
        )}
      </div>

      {/* SUBTAB 1: Warehouses branch list status */}
      {activeSubTab === 'status' && (
        <div className="space-y-6">
          {isNewWHOpen && (
            <div className="bg-white dark:bg-slate-900 border border-blue-500/10 rounded-2xl p-5 shadow-lg max-w-md animate-slide-in">
              <span className="block text-xs font-bold text-slate-400 mb-3">XÂY DỰNG CHI NHÁNH MỚI</span>
              <form onSubmit={handleAddWarehouse} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold">Tên thương hiệu chi nhánh</label>
                  <input
                    type="text"
                    required
                    placeholder="Mẫu: Chi nhánh Đà Nẵng bến cảng..."
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm rounded-lg border border-slate-205 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Địa chỉ giao nhận vật lý</label>
                  <input
                    type="text"
                    required
                    placeholder="Địa chỉ số..."
                    value={whLoc}
                    onChange={(e) => setWhLoc(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm rounded-lg border border-slate-205 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setIsNewWHOpen(false)} className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg">Đóng</button>
                  <button type="submit" className="px-5 py-1.5 text-xs bg-blue-600 text-white rounded-lg">Xác nhận</button>
                </div>
              </form>
            </div>
          )}

          {/* Branch Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {warehouses.map(w => {
              const totalLines = products.length;
              const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);

              return (
                <div key={w.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:border-blue-500/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-450 rounded-xl">
                      <Layers className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2.5 py-0.5 rounded-full uppercase">
                      Hoạt Động
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-extrabold text-slate-950 dark:text-white text-base tracking-tight">{w.name}</h4>
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {w.location}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-slate-850 pt-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Số thiết bị</span>
                      <strong className="text-slate-900 dark:text-white text-sm">{totalLines} chủng loại</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Lượng hiện kho</span>
                      <strong className="text-slate-900 dark:text-white text-sm">{totalStockUnits.toLocaleString()} cái</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Stock transfer management */}
      {activeSubTab === 'transfer' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="max-w-xl space-y-4">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Vận chuyển chuyển kho vật tư liên tỉnh</h3>
              <p className="text-slate-400 text-xs">Phân cấp bốc dỡ hàng từ chi nhánh xuất bến đến bãi bến cảng phụ thuộc nội bộ.</p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 pt-1">
              {transferError && (
                <div className="p-3.5 bg-red-500/5 text-red-650 rounded-xl text-xs border border-red-500/10 font-bold">
                  {transferError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-505 font-bold uppercase">Kho gửi đi</label>
                  <select
                    value={fromWhId}
                    onChange={(e) => setFromWhId(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-505 font-bold uppercase">Kho tiếp nhận</label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-505 font-bold uppercase">Sản phẩm điều phối</label>
                <select
                  value={transProdId}
                  onChange={(e) => setTransProdId(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Lượng sẵn có: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-505 font-bold uppercase">Khối lượng dịch tinh (Số lượng)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transQty}
                    onChange={(e) => setTransQty(Number(e.target.value))}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-505 font-bold uppercase">Lý do vận hành</label>
                  <input
                    type="text"
                    placeholder="Mẫu: Bổ khuyết bão lụt, hỗ trợ..."
                    value={transNotes}
                    onChange={(e) => setTransNotes(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow cursor-pointer text-center"
              >
                Xác nhận dịch kho nạp xe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Stocktake physical audit balance */}
      {activeSubTab === 'audit' && (
        <form onSubmit={handleAuditSubmit} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-sm">Kiểm kho & Hiệu chỉnh hệ thống thực tế</h3>
            <p className="text-slate-400 text-xs">
              Các thủ kho tiến hành cập nhật số lượng thực đếm để hệ thống tự bù dư thừa hoặc ghi hao dôi mất mát.
            </p>
          </div>

          <div className="max-w-sm">
            <label className="text-xs text-slate-500 font-bold uppercase">Chi nhánh kiểm kho</label>
            <select
              value={auditWhId}
              onChange={(e) => {
                setAuditWhId(e.target.value);
                initAuditMockLines(e.target.value);
              }}
              className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <span className="block text-xs font-bold text-slate-450 uppercase">Kiểm đếm sản phẩm trong bến sách</span>
            
            <div className="space-y-2">
              {products.map(p => {
                const draftCount = auditCounts[p.id] !== undefined ? auditCounts[p.id] : p.stock;
                const expectation = p.stock;
                const delta = draftCount - expectation;

                return (
                  <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                    
                    <div className="md:col-span-4">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-slate-400 block pb-0.5">Sổ kho sẵn có</span>
                      <strong className="text-slate-850 font-bold text-sm block">{expectation} {p.unit}</strong>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-slate-405 block pb-0.5 font-bold text-blue-600">Thực đếm</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={draftCount}
                        onChange={(e) => handleAuditCountChange(p.id, Number(e.target.value))}
                        className="w-full p-1 text-center bg-white dark:bg-slate-900 text-slate-905 font-bold rounded border border-slate-205 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-slate-405 block pb-0.5">Lệch biệt</span>
                      <span className={`font-bold font-mono text-sm block ${delta === 0 ? 'text-slate-400' : delta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-slate-405 block pb-0.5">Lý do điều chỉnh</span>
                      <input
                        type="text"
                        placeholder="Mẫu: Trùng lặp, chuột cắn..."
                        value={auditReasons[p.id] || ''}
                        onChange={(e) => handleAuditReasonChange(p.id, e.target.value)}
                        className="w-full p-1 bg-white dark:bg-slate-900 text-slate-905 rounded border border-slate-205 focus:outline-none"
                      />
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold uppercase">Ghi chú biên bản kiểm kê</label>
            <input
              type="text"
              placeholder="Ghi chú tổng kết của kiểm toán viên..."
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('status')}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
            >Huỷ bỏ</button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow"
            >Đồng bộ dữ liệu kiểm định</button>
          </div>
        </form>
      )}

      {/* SUBTAB 4: Stock mutations & Stocktakes table logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lịch sử Chuyển kho / Di vận hàng hóa</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Ngày di động</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Kho gốc</th>
                    <th className="p-3">Kho đích bến</th>
                    <th className="p-3 text-right">Khối lượng</th>
                    <th className="p-3">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-705 dark:text-slate-300">
                  {mutations.length > 0 ? (
                    mutations.map(m => {
                      const pName = products.find(p => p.id === m.productId)?.name || 'Khác';
                      const fWh = warehouses.find(w => w.id === m.fromWarehouseId)?.name || 'Nguồn';
                      const tWh = warehouses.find(w => w.id === m.toWarehouseId)?.name || 'Đích';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/20">
                          <td className="p-3 text-slate-400 whitespace-nowrap">{formatDate(m.date)}</td>
                          <td className="p-3 font-bold text-slate-850 dark:text-white">{pName}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{fWh}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{tWh}</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{m.quantity}</td>
                          <td className="p-3 text-slate-400">{m.notes || '—'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Không có nhật ký bốc xếp chuyển kho.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Nhật ký Kiểm kê và Reconcilation</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Thời điểm</th>
                    <th className="p-3">Chi nhánh kiểm kho</th>
                    <th className="p-3">Tổng số mặt hàng đã kiểm</th>
                    <th className="p-3">Ghi chú kiểm soát</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-705 dark:text-slate-300">
                  {stocktakes.length > 0 ? (
                    stocktakes.map(s => {
                      const whName = warehouses.find(w => w.id === s.warehouseId)?.name || 'Kho';
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/20">
                          <td className="p-3 text-slate-400 whitespace-nowrap">{formatDate(s.date)}</td>
                          <td className="p-3 font-bold text-slate-850 dark:text-white">{whName}</td>
                          <td className="p-3 font-semibold">{s.items.length} mặt hàng</td>
                          <td className="p-3 text-slate-450">{s.notes || '—'}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                              <CheckCircle className="h-3 w-3" /> ĐÃ ĐỒNG BỘ
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">Chưa ghi nhận sự kiện kiểm tra vật lý nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
