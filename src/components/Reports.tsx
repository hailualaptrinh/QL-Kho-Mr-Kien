/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, ArrowDownLeft, ArrowUpRight, ShieldCheck, 
  Layers, ChevronRight, FileSpreadsheet, Printer 
} from 'lucide-react';
import { ImportOrder, ExportOrder, Product, Supplier, Customer } from '../types';
import { formatCurrency, formatDate, exportToCSV, printPDFReport } from '../utils';

interface ReportsProps {
  imports: ImportOrder[];
  exports: ExportOrder[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  user: any;
}

export default function Reports({ imports, exports, products, suppliers, customers, user }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<'imports' | 'exports' | 'stock'>('stock');

  // 1. INVENTORY STOCK ASSET VALUATION DATA WRAPPER
  const handleExportStockExcel = () => {
    const headers = ['Mã sản phẩm', 'Tên sản phẩm', 'Đơn giá mua', 'Đơn giá bán', 'Lượng tồn kho', 'Định mức tối thiểu', 'Giá trị tồn kho (Giá mua)'];
    const data = products.map(p => [
      p.code,
      p.name,
      p.importPrice,
      p.exportPrice,
      p.stock,
      p.minStock,
      p.stock * p.importPrice
    ]);
    exportToCSV('Bao_cao_ton_kho_MrKienERP', headers, data);
  };

  const handlePrintStockPDF = () => {
    const headers = ['Mã SP', 'Tên sản phẩm', 'Lượng tồn', 'Đơn vị', 'Giá mua', 'Giá bán', 'Trị giá tồn (VND)'];
    const rows = products.map(p => [
      p.code,
      p.name,
      p.stock,
      p.unit,
      p.importPrice.toLocaleString('vi-VN'),
      p.exportPrice.toLocaleString('vi-VN'),
      (p.stock * p.importPrice).toLocaleString('vi-VN')
    ]);

    const totalAssetVal = products.reduce((sum, p) => sum + (p.stock * p.importPrice), 0);
    const totalQty = products.reduce((sum, p) => sum + p.stock, 0);

    printPDFReport(
      'Báo cáo kiểm kê tài sản tồn kho',
      'Tổng hợp số lượng vật liệu lưu tại bãi bến và giá trị vốn hóa theo giá mua gốc.',
      headers,
      rows,
      [
        { label: 'Tổng số lượng vật tư', value: `${totalQty.toLocaleString()} đơn vị` },
        { label: 'Tổng giá trị vốn hoá tồn', value: formatCurrency(totalAssetVal) }
      ]
    );
  };

  // 2. INBOUND LOGISTICS IMPORTS REPORT WRAPPER
  const handleExportImportsExcel = () => {
    const headers = ['Mã phiếu nhập', 'Thời gian', 'Nhà cung cấp', 'Tổng mặt hàng', 'Phải chi (VND)', 'Ghi chú'];
    const data = imports.map(imp => {
      const sName = suppliers.find(s => s.id === imp.supplierId)?.name || 'Khác';
      return [
        imp.code,
        formatDate(imp.date),
        sName,
        imp.items.length,
        imp.totalAmount,
        imp.notes
      ];
    });
    exportToCSV('Bao_cao_nhap_kho_MrKienERP', headers, data);
  };

  const handlePrintImportsPDF = () => {
    const headers = ['Mã phiếu', 'Thời điểm nhập', 'Nhà cung cấp', 'Số mặt hàng', 'Thành tiền (VND)'];
    const rows = imports.map(imp => {
      const sName = suppliers.find(s => s.id === imp.supplierId)?.name || 'Khác';
      return [
        imp.code,
        formatDate(imp.date, false),
        sName,
        imp.items.length,
        imp.totalAmount.toLocaleString('vi-VN')
      ];
    });

    const totalImportsSpend = imports.reduce((sum, imp) => sum + imp.totalAmount, 0);

    printPDFReport(
      'Báo cáo tình hình nhập bổ sung kho',
      'Đăng kiểm kê khai khối lượng bốc xếp bổ khuyết hàng bến bãi theo định mức.',
      headers,
      rows,
      [
        { label: 'Xếp tổng cộng phiếu bốc', value: `${imports.length} phiếu` },
        { label: 'Tổng số tiền đã giải ngân', value: formatCurrency(totalImportsSpend) }
      ]
    );
  };

  // 3. OUTBOUND LOGISTICS REVENUE EXPORTS REPORT WRAPPER
  const handleExportExportsExcel = () => {
    const headers = ['Mã phiếu xuất', 'Thời gian', 'Khách hàng', 'Trạng thái bốc', 'Trị giá đơn (VND)', 'Chi chú'];
    const data = exports.map(exp => {
      const cName = customers.find(c => c.id === exp.customerId)?.name || 'Khác';
      return [
        exp.code,
        formatDate(exp.date),
        cName,
        exp.status === 'SHIPPED' ? 'Đã xuất kho' : exp.status === 'CANCELLED' ? 'Đã huỷ' : 'Đang chờ duyệt',
        exp.totalAmount,
        exp.notes
      ];
    });
    exportToCSV('Bao_cao_xuat_kho_doanh_thu_MrKienERP', headers, data);
  };

  const handlePrintExportsPDF = () => {
    const headers = ['Mã đơn bốc', 'Thời điểm bốc', 'Khách hàng nhận', 'Thành tiền (VND)', 'Trạng thái'];
    const rows = exports.map(exp => {
      const cName = customers.find(c => c.id === exp.customerId)?.name || 'Khác';
      return [
        exp.code,
        formatDate(exp.date, false),
        cName,
        exp.totalAmount.toLocaleString('vi-VN'),
        exp.status === 'SHIPPED' ? 'ĐÃ XUẤT' : exp.status === 'CANCELLED' ? 'ĐÃ HUỶ' : 'CHỜ DUYỆT'
      ];
    });

    const activeExportsSum = exports.filter(e => e.status === 'SHIPPED').reduce((sum, e) => sum + e.totalAmount, 0);

    printPDFReport(
      'Báo cáo doanh số xuất bốc hàng hóa',
      'Tổng hợp hóa đơn dòng tiền dịch chuyển bốc giao hàng ra cảng hải bến tàu ERP.',
      headers,
      rows,
      [
        { label: 'Tổng số đơn xuất sỉ', value: `${exports.length} đơn bốc` },
        { label: 'Doanh thu bốc xuất chính thức', value: formatCurrency(activeExportsSum) }
      ]
    );
  };

  // Calculations for total valuations
  const totalStockQty = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockAssets = products.reduce((sum, p) => sum + (p.stock * p.importPrice), 0);
  const totalRevenueVal = exports.filter(e => e.status === 'SHIPPED').reduce((sum, e) => sum + e.totalAmount, 0);
  const totalImportsVal = imports.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Tab selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-100 dark:border-slate-850">
          <button
            onClick={() => setActiveReport('stock')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'stock' ? 'bg-blue-600 text-white shadow' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500'}`}
          >
            Tồn Kho & Tài Sản
          </button>
          <button
            onClick={() => setActiveReport('imports')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'imports' ? 'bg-blue-600 text-white shadow' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500'}`}
          >
            Báo Cáo Nhập Kho
          </button>
          <button
            onClick={() => setActiveReport('exports')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'exports' ? 'bg-blue-600 text-white shadow' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500'}`}
          >
            Doanh Thu Xuất Kho
          </button>
        </div>

        {/* Master action buttons */}
        <div className="flex gap-2.5">
          <button
            id="btn-export-report-excel"
            onClick={activeReport === 'stock' ? handleExportStockExcel : activeReport === 'imports' ? handleExportImportsExcel : handleExportExportsExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/35 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-450 text-xs font-bold rounded-xl shadow-inner transition-transform active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> Xuất XLSX / Excel
          </button>
          <button
            id="btn-export-report-pdf"
            onClick={activeReport === 'stock' ? handlePrintStockPDF : activeReport === 'imports' ? handlePrintImportsPDF : handlePrintExportsPDF}
            className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-300/35 text-white text-xs font-bold rounded-xl shadow transition-transform active:scale-95 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Xuất bản PDF / In
          </button>
        </div>
      </div>

      {/* Overview Stats details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Định giá tài sản tồn</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5">{formatCurrency(totalStockAssets)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Chiếm dụng bối bãi: {totalStockQty.toLocaleString()} đơn vị</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Kim ngạch xuất bán</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5 text-emerald-600 dark:text-emerald-450">{formatCurrency(totalRevenueVal)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Doanh số thu về bốc dỡ</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Hệ số bốc nạp vốn đầu vào</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5 text-blue-600 dark:text-blue-400">{formatCurrency(totalImportsVal)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Tổng số vốn giải ngân mua sắm</span>
        </div>
      </div>

      {/* LIST OF TABLES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
        
        {activeReport === 'stock' && (
          /* Report catalog stock list */
          <div className="overflow-x-auto">
            <div className="p-4 bg-slate-50 border-b dark:bg-slate-950/20 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bảng biểu phân bổ tài sản dồi dào
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/20 border-b text-slate-400 font-bold uppercase">
                  <th className="p-4">Mã và Sản phẩm</th>
                  <th className="p-4 text-center">Đơn vị</th>
                  <th className="p-4 text-right">Lượng tồn</th>
                  <th className="p-4 text-right">Giá gốc mua (VND)</th>
                  <th className="p-4 text-right">Giá bán đề xuất (VND)</th>
                  <th className="p-4 text-right font-bold text-slate-900 dark:text-white">Tổng Trị Giá Vốn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-55/20 text-slate-705 dark:text-slate-300">
                    <td className="p-4 font-bold text-slate-850 dark:text-white">
                      {p.name}
                      <span className="block font-mono text-[10px] text-slate-400 font-normal">{p.code}</span>
                    </td>
                    <td className="p-4 text-center">{p.unit}</td>
                    <td className="p-4 text-right font-mono font-bold">{p.stock}</td>
                    <td className="p-4 text-right font-mono">{p.importPrice.toLocaleString()} đ</td>
                    <td className="p-4 text-right font-mono">{p.exportPrice.toLocaleString()} đ</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-950 dark:text-white">
                      {((p.stock || 0) * (p.importPrice || 0)).toLocaleString()} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'imports' && (
          <div className="overflow-x-auto animate-fade-in">
            <div className="p-4 bg-slate-50 border-b dark:bg-slate-950/20 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bảng biểu bốc dỡ nhập kho lưu bãi
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/20 border-b text-slate-400 font-bold uppercase">
                  <th className="p-4">Mã Phiếu</th>
                  <th className="p-4">Thời Gian Nhập</th>
                  <th className="p-4">Nhà Cung Cấp</th>
                  <th className="p-4 text-center">Các dòng vật tư</th>
                  <th className="p-4 text-right font-bold">Thành Tiền Giải Ngân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {imports.map(imp => {
                  const sup = suppliers.find(s => s.id === imp.supplierId);
                  return (
                    <tr key={imp.id} className="hover:bg-slate-55/20 text-slate-705 dark:text-slate-300">
                      <td className="p-4 font-bold font-mono text-slate-850 dark:text-white">{imp.code}</td>
                      <td className="p-4 text-slate-400">{formatDate(imp.date)}</td>
                      <td className="p-4 font-semibold">{sup?.name || 'Vintech'}</td>
                      <td className="p-4 text-center">{imp.items.length} loại hàng</td>
                      <td className="p-4 text-right font-mono font-bold text-slate-950 dark:text-white">{imp.totalAmount.toLocaleString()} đ</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'exports' && (
          <div className="overflow-x-auto animate-fade-in">
            <div className="p-4 bg-slate-50 border-b dark:bg-slate-950/20 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bảng biểu bốc xuất thu tiền khách hàng
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/20 border-b text-slate-400 font-bold uppercase">
                  <th className="p-4">Mã Đơn Bốc</th>
                  <th className="p-4">Thời Gian Bàn Giao</th>
                  <th className="p-4">Đối Tác Khách Nhận</th>
                  <th className="p-4 text-center">Trạng Thái Bốc Xếp</th>
                  <th className="p-4 text-right font-bold">Thành Tiền Thu Nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {exports.map(exp => {
                  const cust = customers.find(c => c.id === exp.customerId);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-55/20 text-slate-750 dark:text-slate-300">
                      <td className="p-4 font-bold font-mono text-slate-850 dark:text-white">{exp.code}</td>
                      <td className="p-4 text-slate-404">{formatDate(exp.date)}</td>
                      <td className="p-4 font-semibold">{cust?.name || 'Bách hóa Ta'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${exp.status === 'SHIPPED' ? 'bg-emerald-50 text-emerald-600' : exp.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {exp.status === 'SHIPPED' ? 'Đã xuất kho' : exp.status === 'CANCELLED' ? 'Đã hủy đơn' : 'Đang duyệt kiểm'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-950 dark:text-white">{exp.totalAmount.toLocaleString()} đ</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
