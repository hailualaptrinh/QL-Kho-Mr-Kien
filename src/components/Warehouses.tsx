/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Boxes, Send, CheckSquare, ClipboardList, AlertCircle, 
  MapPin, Plus, CheckCircle, RefreshCw, Layers,
  Truck, Navigation, Compass, Radio, Activity, Map, Route, ChevronRight, User, Smartphone, Calendar
} from 'lucide-react';
import { Warehouse, Product, StockMove, Stocktake, DeliveryOrder } from '../types';
import { formatDate } from '../utils';
import GoogleDeliveryMap from './GoogleDeliveryMap';


interface WarehousesProps {
  warehouses: Warehouse[];
  products: Product[];
  mutations: StockMove[];
  deliveries?: DeliveryOrder[];
  stocktakes: Stocktake[];
  user: any;
  onAddWarehouse: (data: any) => Promise<any>;
  onTransferStock: (data: any) => Promise<any>;
  onAddDelivery?: (data: any) => Promise<any>;
  onUpdateDelivery?: (id: string, data: any) => Promise<any>;
  onAuditStock: (data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Warehouses({
  warehouses, products, mutations, deliveries = [], stocktakes, user,
  onAddWarehouse, onTransferStock, onAddDelivery, onUpdateDelivery, onAuditStock, onRefresh
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

  // GPS Delivery tracking states
  const [enableGPS, setEnableGPS] = useState(true);
  const [driverName, setDriverName] = useState('Nguyễn Văn Tải');
  const [driverPhone, setDriverPhone] = useState('0912.445.667');
  const [vehiclePlate, setVehiclePlate] = useState('29C-884.22');
  const [vehicleType, setVehicleType] = useState('Suzuki Pro 750kg');
  const [selectedDlvId, setSelectedDlvId] = useState<string | null>(null);

  // Prefill selectedDlvId on load
  useEffect(() => {
    if (deliveries.length > 0 && !selectedDlvId) {
      setSelectedDlvId(deliveries[0].id);
    }
  }, [deliveries]);

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

    if (enableGPS && onAddDelivery) {
      await onAddDelivery({
        driverName,
        driverPhone,
        vehiclePlate,
        vehicleType,
        fromWarehouseId: fromWhId,
        toWarehouseId: toWhId,
        productId: transProdId,
        quantity: transQty,
        notes: transNotes
      });
    }

    setTransNotes('');
    setTransQty(1);
    onRefresh();
    alert('Điều chuyển hàng hóa liên tỉnh và khởi tạo đơn giám sát GPS thành công!');
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
          
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'STOCKKEEPER') && (
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

        {activeSubTab === 'status' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button
            id="btn-add-warehouse"
            onClick={() => setIsNewWHOpen(!isNewWHOpen)}
            style={{ backgroundColor: '#1212ec' }}
            className="px-4 py-2 text-white hover:bg-blue-700 font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95"
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
      {activeSubTab === 'transfer' && (() => {
        const DRIVER_TEMPLATES = [
          { name: 'Nguyễn Văn Tải', phone: '0912.445.667', plate: '29C-884.22', type: 'Suzuki Pro 750kg' },
          { name: 'Phạm Quốc Xe', phone: '0978.555.222', plate: '51D-993.45', type: 'Xe tải Hino 5 Tấn' },
          { name: 'Trần Bình An', phone: '0933.111.999', plate: '30F-122.34', type: 'Thaco Towner 990kg' }
        ];

        const ROAD_POINTS = [
          { id: 'wh-1', x: 70, y: 100, label: 'Kho Hà Nội' },
          { id: 'wh-2', x: 190, y: 70, label: 'Lộ trình Hải Phòng' },
          { id: 'wh-mid1', x: 310, y: 115, label: 'Trạm Tiếp Vận Vinh' },
          { id: 'wh-mid2', x: 430, y: 95, label: 'Trạm Đèo Hải Vân' },
          { id: 'wh-mid3', x: 540, y: 110, label: 'Trạm Nha Trang' },
          { id: 'wh-3', x: 650, y: 120, label: 'Kho Sài Gòn' }
        ];

        const getWarehousePoint = (whId: string, isFrom: boolean) => {
          if (whId === 'wh-1') return ROAD_POINTS[0];
          if (whId === 'wh-2') return ROAD_POINTS[1];
          if (whId === 'wh-3') return ROAD_POINTS[5];
          return isFrom ? ROAD_POINTS[2] : ROAD_POINTS[4];
        };

        const handlePrefillDriver = (idxStr: string) => {
          if (idxStr === '') return;
          const selected = DRIVER_TEMPLATES[Number(idxStr)];
          setDriverName(selected.name);
          setDriverPhone(selected.phone);
          setVehiclePlate(selected.plate);
          setVehicleType(selected.type);
        };

        const activeDlv = deliveries.find(d => d.id === selectedDlvId) || deliveries[0];

        // Interpolate truck position
        let truckX = 360;
        let truckY = 100;
        let fromWhName = 'Kho Gửi';
        let toWhName = 'Kho Nhận';

        if (activeDlv) {
          const startPt = getWarehousePoint(activeDlv.fromWarehouseId, true);
          const endPt = getWarehousePoint(activeDlv.toWarehouseId, false);
          fromWhName = warehouses.find(w => w.id === activeDlv.fromWarehouseId)?.name || 'Kho Gửi';
          toWhName = warehouses.find(w => w.id === activeDlv.toWarehouseId)?.name || 'Kho Nhận';
          const progressDec = (activeDlv.routeProgress || 0) / 100;
          truckX = startPt.x + (endPt.x - startPt.x) * progressDec;
          truckY = startPt.y + (endPt.y - startPt.y) * progressDec;
        }

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: FORM (lg:col-span-4) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <span className="p-1 px-2.5 bg-blue-500/5 text-blue-600 rounded-lg text-[10px] font-extrabold uppercase tracking-widest block w-fit mb-1.5">Bộ phận điều độ bến bãi</span>
                <h3 className="font-bold text-slate-950 dark:text-white text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-600" /> Vận chuyển & Điều phối vật tư
                </h3>
                <p className="text-slate-400 text-[11px] mt-1">Phân cấp bốc dỡ hàng từ chi nhánh xuất bến đến bãi bến nội bộ kèm giám sát GPS thời gian thực.</p>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4 pt-1">
                {transferError && (
                  <div className="p-3 bg-red-500/5 text-red-650 rounded-xl text-xs border border-red-500/10 font-bold">
                    {transferError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Kho gửi đi</label>
                    <select
                      value={fromWhId}
                      onChange={(e) => setFromWhId(e.target.value)}
                      className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Kho tiếp nhận</label>
                    <select
                      value={toWhId}
                      onChange={(e) => setToWhId(e.target.value)}
                      className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sản phẩm điều phối</label>
                  <select
                    value={transProdId}
                    onChange={(e) => setTransProdId(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Tồn kho: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Khối lượng (Số lượng)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={transQty}
                      onChange={(e) => setTransQty(Number(e.target.value))}
                      className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lý do điều chuyển</label>
                    <input
                      type="text"
                      placeholder="Ghi chú điều chuyển"
                      value={transNotes}
                      onChange={(e) => setTransNotes(e.target.value)}
                      className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* INTERACTIVE TRACKING OPTION */}
                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={enableGPS}
                        onChange={(e) => setEnableGPS(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Giao hàng kèm Giám sát GPS hạm đội</span>
                    </label>
                  </div>

                  {enableGPS && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-450 font-bold uppercase">Mẫu tài xế & Xe</label>
                        <select
                          onChange={(e) => handlePrefillDriver(e.target.value)}
                          defaultValue=""
                          className="w-full mt-1 p-1 px-2 bg-white dark:bg-slate-900 text-slate-850 dark:text-white text-[11px] rounded border border-slate-200 dark:border-slate-850 focus:outline-none"
                        >
                          <option value="">-- Chọn tài xế để điền nhanh --</option>
                          {DRIVER_TEMPLATES.map((dr, idx) => (
                            <option key={idx} value={idx}>{dr.name} - BKS: {dr.plate}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-450 font-bold uppercase">Tài xế</label>
                          <input 
                            type="text"
                            required={enableGPS}
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="w-full mt-1 p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] rounded border border-slate-200 dark:border-slate-850 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 font-bold uppercase">SĐT tài xế</label>
                          <input 
                            type="text"
                            required={enableGPS}
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            className="w-full mt-1 p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] rounded border border-slate-200 dark:border-slate-850 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-450 font-bold uppercase">Biển số xe</label>
                          <input 
                            type="text"
                            required={enableGPS}
                            placeholder="Chữ/Số kiểm soát"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value)}
                            className="w-full mt-1 p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] rounded border border-slate-200 dark:border-slate-850 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 font-bold uppercase">Loại xe vận tải</label>
                          <input 
                            type="text"
                            required={enableGPS}
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            className="w-full mt-1 p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] rounded border border-slate-200 dark:border-slate-850 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <Truck className="h-4 w-4" /> Xác nhận bốc hàng & Khởi động GPS
                </button>
              </form>
            </div>

            {/* COLUMN 2: ACTIVE REPAIR AND GPS MONITORING (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* FLEET LIST */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Danh sách đơn hàng vận tải nội điện</h4>
                    <p className="text-[11px] text-slate-400">Chọn hoặc nhấp để bật định vị lộ trình vệ tinh GPS trực tiếp.</p>
                  </div>
                  <button 
                    onClick={onRefresh}
                    className="p-1 px-2 text-[10px] font-bold border rounded bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3" /> Đồng bộ
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <Compass className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-spin-slow" />
                    Chưa có đơn hàng điều chuyển GPS nào vận hành.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto">
                    {deliveries.map(dlv => {
                      const fromName = warehouses.find(w => w.id === dlv.fromWarehouseId)?.name || 'Hà Nội';
                      const toName = warehouses.find(w => w.id === dlv.toWarehouseId)?.name || 'TP. HCM';
                      const prodName = products.find(p => p.id === dlv.productId)?.name || 'Thiết bị';
                      const isSelected = selectedDlvId === dlv.id;

                      return (
                        <div 
                          key={dlv.id} 
                          onClick={() => setSelectedDlvId(dlv.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${isSelected ? 'border-blue-500 bg-blue-50/5 dark:bg-blue-500/5 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 bg-white dark:bg-slate-900'}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-blue-605 dark:text-blue-400 font-extrabold">{dlv.code}</span>
                                <span className="text-[10px] font-mono text-slate-400">({formatDate(dlv.date)})</span>
                              </div>
                              <span className="text-slate-400 text-[10px] block mt-0.5 truncate max-w-[180px]">{prodName} x{dlv.quantity}</span>
                            </div>

                            <span className={`p-1 px-1.5 rounded text-[9px] font-bold ${dlv.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : dlv.status === 'SHIPPING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : dlv.status === 'DELAYED' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                              {dlv.status === 'COMPLETED' ? 'Đã hoàn tất' : dlv.status === 'SHIPPING' ? 'Đang giao' : dlv.status === 'DELAYED' ? 'Tạm dừng xe' : 'Chờ bốc'}
                            </span>
                          </div>

                          <div className="my-1.5 flex items-center gap-1.5 font-bold text-[10px]">
                            <span className="text-slate-500 block truncate max-w-[90px]">{fromName}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-800 dark:text-slate-200 block truncate max-w-[90px]">{toName}</span>
                          </div>

                          <div className="border-t border-slate-100 dark:border-slate-850 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="block truncate">Tài xế: <strong className="text-slate-700 dark:text-slate-300">{dlv.driverName}</strong></span>
                            <span className="font-mono text-blue-500 font-bold">{dlv.routeProgress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE MAP TRACKER AND GPS ACTIONS */}
              {activeDlv && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-extrabold flex items-center gap-1">
                          <Activity className="h-3 w-3 animate-pulse" /> GPS TRỰC TUYẾN
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                          Bản đồ lộ trình đơn xe: <span className="text-blue-500 font-mono font-extrabold">{activeDlv.code}</span>
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Giám sát xe khách hành trình từ {fromWhName} đến {toWhName}.</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={async () => {
                          if (onUpdateDelivery) {
                            await onUpdateDelivery(activeDlv.id, { 
                              routeProgress: 100, 
                              status: 'COMPLETED',
                              currentLocationName: 'Đã cập bến nhận hàng an toàn'
                            });
                            onRefresh();
                          }
                        }}
                        className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                      >
                        Cập bến (100%)
                      </button>
                    </div>
                  </div>

                  {/* VISUAL COMPONENT */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3.5">
                    
                    {/* Live indicators */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">Ý chí tài xế</span>
                        <strong className="text-slate-800 dark:text-slate-200 mt-0.5 block flex items-center gap-1 font-bold">
                          <User className="h-3.5 w-3.5 text-blue-500" /> {activeDlv.driverName}
                        </strong>
                        <span className="text-[10px] text-slate-400 block font-mono">{activeDlv.driverPhone}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">Kiểm soát xe</span>
                        <strong className="text-slate-800 dark:text-slate-200 mt-0.5 block flex items-center gap-1 font-bold">
                          <Truck className="h-3.5 w-3.5 text-amber-500" /> {activeDlv.vehiclePlate}
                        </strong>
                        <span className="text-[10px] text-slate-400 block truncate">{activeDlv.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">Định vị GPS</span>
                        <strong className="text-slate-800 dark:text-slate-200 mt-0.5 block text-[11px] truncate font-bold font-mono text-red-500">
                          <MapPin className="h-3 w-3 inline mr-0.5" /> 
                          {activeDlv.latitude.toFixed(4)}, {activeDlv.longitude.toFixed(4)}
                        </strong>
                        <span className="text-[10px] text-slate-405 block truncate max-w-[140px]">{activeDlv.currentLocationName || 'Đang cập lộ trình'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">Hành trình tuyến đầu</span>
                        <strong className="text-slate-800 dark:text-slate-200 mt-0.5 block text-xs font-bold font-mono text-blue-500 flex items-center justify-between">
                          <span>{activeDlv.routeProgress}% Hoàn tất</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${activeDlv.gpsStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                        </strong>
                        <span className="text-[10px] text-slate-400 block font-mono">Tín hiệu: {activeDlv.gpsStatus === 'ACTIVE' ? 'KẾT NỐI MẠNH' : 'NGOẠI TUYẾN'}</span>
                      </div>
                    </div>

                    {/* LIVE MAP TRACKER */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 align-middle">
                          <Radio className="h-3.5 w-3.5 text-emerald-450 animate-pulse" />
                          <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold uppercase select-none">
                            {activeDlv.gpsStatus === 'ACTIVE' ? 'ĐÀI KIỂM SOÁT VỆ TINH LỘ TRÌNH QUỐC LỘ Bắc - Nam' : 'HỆ THỐNG MẤT TỚI VỆ TINH TRUYỀN PHÁT'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative w-full mb-2 overflow-hidden">
                        <GoogleDeliveryMap 
                          activeDlv={activeDlv} 
                          warehouses={warehouses} 
                          onCoordUpdate={async (lat, lng) => {
                            if (onUpdateDelivery && (Math.abs(activeDlv.latitude - lat) > 0.005 || Math.abs(activeDlv.longitude - lng) > 0.005)) {
                              await onUpdateDelivery(activeDlv.id, { latitude: lat, longitude: lng });
                            }
                          }}
                        />
                      </div>

                      {/* Progress slider bar control inside real time */}
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Navigation className="h-3.5 w-3.5 text-blue-500 animate-spin-slow" />
                            <span>Mô phỏng di chuyển hành trình xe (Kéo thanh trượt):</span>
                          </span>
                          <span className="font-mono text-blue-500 font-bold">{activeDlv.routeProgress}%</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={activeDlv.routeProgress}
                            onChange={async (e) => {
                              const prog = Number(e.target.value);
                              let dlvStatus: 'PENDING' | 'SHIPPING' | 'COMPLETED' | 'DELAYED' = 'SHIPPING';
                              if (prog === 0) dlvStatus = 'PENDING';
                              else if (prog === 100) dlvStatus = 'COMPLETED';
                              
                              if (onUpdateDelivery) {
                                await onUpdateDelivery(activeDlv.id, { 
                                  routeProgress: prog,
                                  status: dlvStatus,
                                  currentLocationName: prog === 100 ? 'Đã bốc dỡ bàn giao thành công' : prog === 0 ? 'Tại bãi bốc nguồn' : `QL1A, phân đoạn tiến trình ${prog}%`
                                });
                                onRefresh();
                              }
                            }}
                            className="w-full sm:flex-1 accent-blue-600 cursor-pointer"
                          />

                          <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                if (onUpdateDelivery) {
                                  await onUpdateDelivery(activeDlv.id, { gpsStatus: activeDlv.gpsStatus === 'ACTIVE' ? 'SIGNAL_LOST' : 'ACTIVE' });
                                  onRefresh();
                                }
                              }}
                              className={`p-1 px-2 rounded text-[10px] font-bold ${activeDlv.gpsStatus === 'ACTIVE' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' : 'bg-green-500/15 text-green-500 border border-green-500/20'}`}
                            >
                              {activeDlv.gpsStatus === 'ACTIVE' ? 'Mất sóng GPS' : 'Cấp lại GPS'}
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (onUpdateDelivery) {
                                  await onUpdateDelivery(activeDlv.id, { status: activeDlv.status === 'DELAYED' ? 'SHIPPING' : 'DELAYED' });
                                  onRefresh();
                                }
                              }}
                              className={`p-1 px-2 rounded text-[10px] font-bold ${activeDlv.status === 'DELAYED' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/15 text-red-500 border border-red-500/20'}`}
                            >
                              {activeDlv.status === 'DELAYED' ? 'Khắc phục xe' : 'Hỏng xe/Sự cố'}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        );
      })()}

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
              <table className="w-full text-left border-collapse text-xs min-w-[850px] lg:min-w-full">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3 w-40 whitespace-nowrap">Ngày di động</th>
                    <th className="p-3 min-w-[180px] whitespace-nowrap">Sản phẩm</th>
                    <th className="p-3 w-36 whitespace-nowrap">Kho gốc</th>
                    <th className="p-3 w-36 whitespace-nowrap">Kho đích bến</th>
                    <th className="p-3 text-right w-32 whitespace-nowrap">Khối lượng</th>
                    <th className="p-3 min-w-[150px] whitespace-nowrap">Lý do</th>
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
                           <td className="p-3 w-40 text-slate-400 whitespace-nowrap">{formatDate(m.date)}</td>
                           <td className="p-3 min-w-[180px] font-bold text-slate-850 dark:text-white">{pName}</td>
                           <td className="p-3 w-36 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fWh}</td>
                           <td className="p-3 w-36 text-slate-600 dark:text-slate-400 whitespace-nowrap">{tWh}</td>
                           <td className="p-3 text-right w-32 font-bold text-slate-900 dark:text-white whitespace-nowrap">{m.quantity}</td>
                           <td className="p-3 min-w-[150px] text-slate-400">{m.notes || '—'}</td>
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
              <table className="w-full text-left border-collapse text-xs min-w-[850px] lg:min-w-full">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3 w-40 whitespace-nowrap">Thời điểm</th>
                    <th className="p-3 min-w-[200px] whitespace-nowrap">Chi nhánh kiểm kho</th>
                    <th className="p-3 w-52 whitespace-nowrap">Tổng số mặt hàng đã kiểm</th>
                    <th className="p-3 min-w-[150px] whitespace-nowrap">Ghi chú kiểm soát</th>
                    <th className="p-3 w-36 text-center whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-705 dark:text-slate-300">
                  {stocktakes.length > 0 ? (
                    stocktakes.map(s => {
                      const whName = warehouses.find(w => w.id === s.warehouseId)?.name || 'Kho';
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/20">
                          <td className="p-3 w-40 text-slate-400 whitespace-nowrap">{formatDate(s.date)}</td>
                          <td className="p-3 min-w-[200px] font-bold text-slate-850 dark:text-white">{whName}</td>
                          <td className="p-3 w-52 font-semibold whitespace-nowrap">{s.items.length} mặt hàng</td>
                          <td className="p-3 min-w-[150px] text-slate-450">{s.notes || '—'}</td>
                          <td className="p-3 w-36 text-center whitespace-nowrap">
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
