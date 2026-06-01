/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Boxes, TrendingUp, AlertTriangle, ArrowDownLeft, 
  ArrowUpRight, DollarSign, RefreshCw, FileText, Activity, AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { formatCurrency, formatDate } from '../utils';

interface ClientStatsProps {
  stats: any;
  user: any;
  logs: any[];
  products?: any[];
  categories?: any[];
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ stats, user, logs, products = [], categories = [], onRefresh, onNavigate }: ClientStatsProps) {
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString('vi-VN'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-process categories and products to find stock levels and minimum stock levels per category
  const categoryStockData = categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    const totalStock = catProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalMinStock = catProducts.reduce((sum, p) => sum + (p.minStock || 0), 0);
    const lowStockCount = catProducts.filter(p => p.stock <= p.minStock).length;
    
    return {
      id: cat.id,
      name: cat.name,
      'Tồn Kho Thực Tế': totalStock,
      'Hạn Mức Tối Thiểu': totalMinStock,
      'Sản Phẩm Cảnh Báo': lowStockCount,
      totalCount: catProducts.length,
      products: catProducts.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit
      }))
    };
  });

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Auto-select first category once data populates
  useEffect(() => {
    if (categoryStockData.length > 0 && !selectedCatId) {
      setSelectedCatId(categoryStockData[0].id);
    }
  }, [categories, products]);

  const activeCategory = categoryStockData.find(c => c.id === selectedCatId) || categoryStockData[0];

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate coordinates for custom SVG chart
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 40;
  const points = stats.chartData || [];

  // Find max value in dataset to scale properly
  const values = points.flatMap((p: any) => [p.imports, p.exports]);
  const maxValue = Math.max(...values, 10000000); // minimum 10M for scale axis

  const getX = (index: number) => {
    if (points.length <= 1) return padding;
    return padding + (index * (chartWidth - padding * 2)) / (points.length - 1);
  };

  const getY = (val: number) => {
    return chartHeight - padding - (val * (chartHeight - padding * 2)) / maxValue;
  };

  // Build line paths
  let importPath = '';
  let exportPath = '';

  points.forEach((p: any, idx: number) => {
    const x = getX(idx);
    const yImp = getY(p.imports);
    const yExp = getY(p.exports);

    if (idx === 0) {
      importPath = `M ${x} ${yImp}`;
      exportPath = `M ${x} ${yExp}`;
    } else {
      importPath += ` L ${x} ${yImp}`;
      exportPath += ` L ${x} ${yExp}`;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header section with Greeting and Live Clock */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Chào mừng trở lại, {user?.fullName || 'Người dùng'}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hệ thống ERP của bạn đang hoạt động bình thường • Vai trò: <span className="font-semibold text-blue-600 dark:text-blue-400">
              {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN CẤP CAO' :
               user?.role === 'MANAGER' ? 'QUẢN LÝ CHI NHÁNH' :
               user?.role === 'STOCKKEEPER' ? 'THỦ KHO CHI NHÁNH' :
               user?.role === 'SALES' ? 'NHÂN VIÊN KINH DOANH' :
               user?.role === 'VIEWER' ? 'BAN GIÁM SÁT / CHỈ XEM' : user?.role || ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200">{timeStr}</div>
            <div className="text-xs text-slate-400">{formatDate(new Date().toISOString(), false)}</div>
          </div>
          <button 
            id="btn-refresh-dashboard"
            onClick={onRefresh}
            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Đồng bộ lại dữ liệu"
          >
            <RefreshCw className="h-5 w-5 animate-hover" />
          </button>
        </div>
      </div>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Total Warehouse Stock */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">Hiện hữu trong kho</span>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-450 rounded-xl">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              {stats.totalWarehouseStock?.toLocaleString('vi-VN')}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>Danh mục: {stats.totalProductsCount} loại hàng hoá</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Today's imports */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 transition-all shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">Nhập kho trong ngày</span>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-450 rounded-xl">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-950 dark:text-white truncate">
              {formatCurrency(stats.totalImportsTodayValue)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Tự động cộng dồn số lượng tồn kho
            </div>
          </div>
        </div>

        {/* KPI 3: Total Asset Value */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 transition-all shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">Tài sản kho (Giá trị định giá)</span>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-450 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-950 dark:text-white truncate">
              {formatCurrency(stats.inventoryAssetValuationVal)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer flex items-center gap-1 hover:underline" onClick={() => onNavigate('reports')}>
              <FileText className="h-3 w-3" /> Xem báo cáo tài chính ròng
            </div>
          </div>
        </div>

        {/* KPI 4: Historical Sales Revenue */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 dark:hover:border-amber-400/30 transition-all shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">Tổng doanh thu bốc xếp</span>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-450 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-950 dark:text-white truncate">
              {formatCurrency(stats.totalHistoricalRevenueVal)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Tính trên các đơn xuất có nhãn <span className="font-semibold text-emerald-600 dark:text-emerald-450">VẬN CHUYỂN</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Custom Chart vs Alerts/Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Dynamic Group Chart Vector Display */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Biểu đồ Biến động Kho vận (7 ngày qua)</h2>
              <span className="text-xs font-mono bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/50">Đơn vị: VNĐ</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">Sự trồi sụt giữa Tổng chi nhập kho vs Doanh số thực xuất kho ngày kế tiếp.</p>
          </div>

          <div className="mt-6 flex justify-center">
            {/* SVG Visual Renderer */}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-h-72 select-none">
              {/* horizontal guides */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3"/>
              <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3"/>
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#94a3b8" strokeWidth="1" opacity="0.5"/>

              {/* Chart Line Paths */}
              <path d={importPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
              <path d={exportPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

              {/* Data points */}
              {points.map((p: any, idx: number) => {
                const x = getX(idx);
                const yImp = getY(p.imports);
                const yExp = getY(p.exports);

                return (
                  <g key={idx}>
                    {/* Circle indicators */}
                    <circle cx={x} cy={yImp} r="4" fill="#2563eb" className="cursor-pointer hover:r-6 hover:fill-blue-700 transition-all" />
                    <circle cx={x} cy={yExp} r="4" fill="#10b981" className="cursor-pointer hover:r-6 hover:fill-emerald-700 transition-all" />
                    
                    {/* Tick labels */}
                    <text x={x} y={chartHeight - 15} textAnchor="middle" fill="#64748b" className="text-[10px] font-semibold">{p.label}</text>
                  </g>
                );
              })}

              {/* Y Axis helper values */}
              <text x={padding - 10} y={padding + 4} textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">{(maxValue / 1000000).toFixed(0)}M</text>
              <text x={padding - 10} y={chartHeight / 2 + 3} textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">{((maxValue / 2) / 1000000).toFixed(0)}M</text>
              <text x={padding - 10} y={chartHeight - padding + 3} textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">0M</text>
            </svg>
          </div>

          <div className="flex justify-center gap-6 mt-4 border-t border-slate-50 dark:border-slate-800 pt-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-350">
              <span className="h-3 w-3 rounded-full bg-blue-600"></span> Giao dịch nhập bổ sung
            </div>
            <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-350">
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span> Phê duyệt xuất giao hàng
            </div>
          </div>
        </div>

        {/* Right Side: Stock Warnings & Recent Activity Log */}
        <div className="space-y-6 lg:col-span-4">
          
          {/* Out of Stock Alert Pane */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-450 font-bold text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>CẢNH BÁO TỒN KHO THẤP ({stats.alertProducts?.length || 0})</span>
            </div>
            
            <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto">
              {stats.alertProducts && stats.alertProducts.length > 0 ? (
                stats.alertProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl border border-amber-500/10 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{p.name}</span>
                    <span className="text-xs font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded font-bold">
                      {p.stock} / {p.minStock} min
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">
                  Tuyệt vời! Tất cả sản phẩm đều đủ lượng tồn định mức.
                </div>
              )}
            </div>

            {user?.role !== 'VIEWER' && stats.alertProducts?.length > 0 && (
              <button 
                id="btn-nav-imports"
                onClick={() => onNavigate('imports')}
                className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Nhập kho bổ sung ngay
              </button>
            )}
          </div>

          {/* Audit Logs activities list */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-bold text-sm">
                  <Activity className="h-4 w-4" />
                  <span>SỰ KIỆN GẦN ĐÂY</span>
                </div>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <span className="text-[10px] font-bold text-slate-400">LOG TRUY VẾT</span>
                )}
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {logs && logs.length > 0 ? (
                  logs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{log.actionType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDate(log.timestamp)}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed break-words">{log.description}</p>
                      <div className="border-b border-dotted border-slate-100 dark:border-slate-850 pt-1"></div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 text-center py-6">
                    Không có nhật ký hoạt động gần đây.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Visualizing product stock levels by category widget (using Recharts) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Thống Kê Tồn Kho Theo Khung Danh Mục</h2>
            </div>
            <p className="text-xs text-slate-405 dark:text-slate-400">
              Trực quan hóa lượng tồn thực tế so với định mức an toàn tối thiểu. Click chọn từng cột danh mục để kiểm tra chi tiết danh sách sản phẩm.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <span className="h-3 w-3 rounded bg-blue-600"></span> Tồn Thực Tế
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <span className="h-3 w-3 rounded bg-slate-300 dark:bg-slate-700"></span> Định Mức Tối Thiểu
            </span>
          </div>
        </div>

        {categoryStockData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            Chưa có thông tin danh mục hoặc dữ liệu sản phẩm trong kho.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Recharts Bar Chart */}
            <div className="lg:col-span-7 space-y-2">
              <div className="h-[340px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryStockData}
                    margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        const clickedId = state.activePayload[0].payload.id;
                        setSelectedCatId(clickedId);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const pData = payload[0].payload;
                          const lowCount = pData['Sản Phẩm Cảnh Báo'];
                          return (
                            <div className="bg-white dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl space-y-2 min-w-[200px]">
                              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">{label}</span>
                              <div className="border-t border-slate-50 dark:border-slate-850 pt-2 space-y-1.5 text-xs text-left">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                  <span>Tồn Thực Tế:</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{payload[0].value?.toLocaleString('vi-VN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                  <span>Định Mức Tối Thiểu:</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{payload[1].value?.toLocaleString('vi-VN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-450 text-[10px]">
                                  <span>Số lượng mặt hàng:</span>
                                  <span className="font-bold font-mono">{pData.totalCount}</span>
                                </div>
                                {lowCount > 0 && (
                                  <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-black flex items-center gap-1.5 uppercase">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                    <span>{lowCount} mặt hàng dưới mức tối thiểu!</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="Tồn Kho Thực Tế" 
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    >
                      {categoryStockData.map((entry, index) => {
                        const hasAlert = entry['Sản Phẩm Cảnh Báo'] > 0;
                        const isSelected = entry.id === selectedCatId;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={hasAlert ? '#ef4444' : isSelected ? '#1d4ed8' : '#3b82f6'} 
                            fillOpacity={isSelected ? 1 : 0.8}
                          />
                        );
                      })}
                    </Bar>
                    <Bar 
                      dataKey="Hạn Mức Tối Thiểu" 
                      radius={[4, 4, 0, 0]}
                      fill="#94a3b8" 
                      fillOpacity={0.3}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-450 italic text-center">
                * Cột <span className="text-red-500 font-bold">Màu Đỏ</span> thể hiện danh mục đang có sản phẩm bị chạm/vượt ngưỡng tối thiểu. Chọn danh mục để xem chi tiết.
              </div>
            </div>

            {/* Right side: Selected Category Inspector Details */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800/85 p-5 flex flex-col justify-between">
              {activeCategory ? (
                <div className="space-y-4">
                  {/* Category Title & Quick Summary */}
                  <div className="flex items-start justify-between border-b border-slate-205 dark:border-slate-800/50 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
                        {activeCategory.name}
                      </h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">
                        Tổng số lượng: {activeCategory.totalCount} mặt hàng hiện hữu
                      </p>
                    </div>

                    {activeCategory['Sản Phẩm Cảnh Báo'] > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] bg-red-105 dark:bg-red-950/55 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-lg uppercase animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        {activeCategory['Sản Phẩm Cảnh Báo']} Cảnh báo
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-lg uppercase">
                        ✓ An toàn
                      </span>
                    )}
                  </div>

                  {/* List of Products in this Category */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-left">
                    {activeCategory.products.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-10 italic">
                        Không có sản phẩm nào thuộc danh mục này.
                      </div>
                    ) : (
                      activeCategory.products.map((p: any) => {
                        const isLow = p.stock <= p.minStock;
                        return (
                          <div 
                            key={p.id} 
                            className={`p-3 rounded-xl border transition-all text-xs flex justify-between items-center ${
                              isLow 
                                ? 'bg-red-500/5 dark:bg-red-500/10 border-red-205 dark:border-red-900/60' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[200px]">
                              <span className="font-bold text-slate-850 dark:text-slate-100 block truncate" title={p.name}>
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Mã: {p.code} • ĐVT: {p.unit}
                              </span>
                            </div>

                            <div className="text-right space-y-1 shrink-0">
                              <span className={`font-mono font-black text-xs block ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                Tồn: {p.stock}
                              </span>
                              <span className="text-[9px] font-medium text-slate-400 block font-mono">
                                ĐM tối thiểu: {p.minStock}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-12">
                  Vui lòng chọn 1 danh mục để xem chi tiết.
                </div>
              )}

              {/* Quick actions box */}
              {user?.role !== 'VIEWER' && activeCategory && activeCategory['Sản Phẩm Cảnh Báo'] > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-205 dark:border-slate-800/50">
                  <button
                    onClick={() => onNavigate('imports')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wide border-0"
                  >
                    <AlertCircle className="h-4 w-4" /> Báo cáo / Nhập kho khẩn cấp
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
