/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Boxes, TrendingUp, AlertTriangle, ArrowDownLeft, 
  ArrowUpRight, DollarSign, RefreshCw, FileText, Activity 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';

interface ClientStatsProps {
  stats: any;
  user: any;
  logs: any[];
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ stats, user, logs, onRefresh, onNavigate }: ClientStatsProps) {
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString('vi-VN'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
            Hệ thống ERP của bạn đang hoạt động bình thường • Vai trò: <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'KHÁCH HÀNG / CLIENT'}</span>
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

            {user?.role === 'ADMIN' && stats.alertProducts?.length > 0 && (
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
                {user?.role === 'ADMIN' && (
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
    </div>
  );
}
