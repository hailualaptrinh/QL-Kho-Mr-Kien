/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, ArrowDownLeft, ArrowUpRight, ShieldCheck, 
  Layers, ChevronRight, FileSpreadsheet, Printer,
  Camera, Upload, Plus, Trash2, Eye, Loader2, RefreshCw, X, Clock, FileImage, ClipboardCheck
} from 'lucide-react';
import { ImportOrder, ExportOrder, Product, Supplier, Customer, Warehouse, PhotoReport } from '../types';
import { formatCurrency, formatDate, exportToCSV, printPDFReport } from '../utils';

interface ReportsProps {
  imports: ImportOrder[];
  exports: ExportOrder[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  warehouses?: Warehouse[];
  user: any;
}

export default function Reports({ imports, exports, products, suppliers, customers, warehouses = [], user }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<'imports' | 'exports' | 'stock' | 'photos'>('stock');
  const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  
  // New Report Form states
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportWarehouseId, setReportWarehouseId] = useState<string>('');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen view modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<PhotoReport | null>(null);

  // Image Helper: Compress and downscale uploaded or snapped photos
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Optimal resolution for mobile & web
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to lightweight jpeg
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

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
        exp.status === 'SHIPPED' ? 'ĐA XUẤT' : exp.status === 'CANCELLED' ? 'ĐÃ HUỶ' : 'CHỜ DUYỆT'
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

  // 4. SYNC PHOTO REPORTS FROM SERVER
  const fetchPhotoReports = async () => {
    setLoadingPhotos(true);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/photo-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotoReports(data);
      }
    } catch (err) {
      console.error('Failed to load storage photo reports', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'photos') {
      fetchPhotoReports();
    }
  }, [activeReport]);

  // Clean stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Camera capture workflows
  const handleStartCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera (environment facing) for warehouse reporting
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setIsCameraActive(true);
      }
    } catch (err) {
      alert('Không khởi động được camera trực tiếp của trình duyệt. Vui lòng cho phép quyền truy cập camera trong trình duyệt hoặc sử dụng nút "Chọn ảnh / Chụp ảnh trên điện thoại"!');
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        compressImage(dataUrl).then((compressed) => {
          setImagePreview(compressed);
          handleStopCamera();
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        compressImage(base64Str).then((compressed) => {
          setImagePreview(compressed);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle) {
      alert('Vui lòng nhập tiêu đề báo cáo!');
      return;
    }
    if (!reportWarehouseId) {
      alert('Vui lòng chọn kho bãi phát sinh sự kiện!');
      return;
    }
    if (!imagePreview) {
      alert('Vui lòng chụp ảnh hoặc tải hình ảnh kho hàng lên trước!');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const response = await fetch('/api/photo-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: reportTitle,
          warehouseId: reportWarehouseId,
          notes: reportNotes,
          imageUrl: imagePreview
        })
      });

      if (response.ok) {
        setReportTitle('');
        setReportWarehouseId('');
        setReportNotes('');
        setImagePreview(null);
        setShowAddForm(false);
        fetchPhotoReports();
      } else {
        const err = await response.json();
        alert(err.error || 'Lỗi bốc tải hình ảnh lên server.');
      }
    } catch (e) {
      alert('Không kết nối được server của bạn.');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="flex flex-wrap bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-101 dark:border-slate-850 gap-1">
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
          <button
            onClick={() => setActiveReport('photos')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'photos' ? 'bg-blue-600 text-white shadow font-extrabold flex items-center gap-1.5' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500 flex items-center gap-1.5'}`}
          >
            <Camera className="h-3.5 w-3.5" /> Báo Cáo Hình Ảnh Kho
          </button>
        </div>

        {/* Master action buttons (Hidden during Photo report tab) */}
        {activeReport !== 'photos' && (
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
        )}

        {activeReport === 'photos' && (
          <div className="flex gap-2">
            <button
              onClick={fetchPhotoReports}
              className="p-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              title="Đồng bộ danh sách"
            >
              <RefreshCw className={`h-4 w-4 ${loadingPhotos ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="btn-add-photo-report"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setImagePreview(null);
                handleStopCamera();
              }}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-transform active:scale-95 cursor-pointer"
            >
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddForm ? 'Đóng Trình Khai Báo' : 'Gửi Báo Cáo Chụp Ảnh'}
            </button>
          </div>
        )}
      </div>

      {/* Overview Stats details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Định giá tài sản tồn</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5">{formatCurrency(totalStockAssets)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Chiếm dụng bối bãi: {totalStockQty.toLocaleString()} đơn vị</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Kim ngạch xuất bán</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5 text-emerald-600 dark:text-emerald-450">{formatCurrency(totalRevenueVal)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Doanh số thu về bốc dỡ</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">Hệ số bốc nạp vốn đầu vào</span>
          <strong className="text-slate-900 dark:text-white text-lg font-mono font-black block mt-0.5 text-blue-600 dark:text-blue-400">{formatCurrency(totalImportsVal)}</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Tổng số vốn giải ngân mua sắm</span>
        </div>
      </div>

      {/* photo submission form */}
      {activeReport === 'photos' && showAddForm && (
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl animate-slide-in space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-1.5 text-blue-400">
                <Camera className="h-4.5 w-4.5" /> KHAI BÁO ẢNH CHỤP THỰC TẾ KHO HÀNG
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Sử dụng camera điện thoại hoặc ảnh thư viện để lưu giữ bằng chứng vật liệu tại bãi bến.</p>
            </div>
            <button 
              onClick={() => {
                setShowAddForm(false);
                handleStopCamera();
              }} 
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left form details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tiêu Đề Ảnh Báo Cáo *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Nứt gãy palet gỗ bãi A, Đỗ bãi thép cuộn..."
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white uppercase focus:outline-none placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kho Bãi Phát Sinh Sự Bản *</label>
                <select
                  required
                  value={reportWarehouseId}
                  onChange={(e) => setReportWarehouseId(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="" className="text-slate-600">Chọn kho bãi kiểm chứng...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} - {w.location}</option>
                  ))}
                  {warehouses.length === 0 && (
                    <>
                      <option value="wh-15">Kho Bãi Trung Tâm Cảng</option>
                      <option value="wh-16">Bãi Sắt Thép Hải Phòng</option>
                      <option value="wh-17">Kho Đông Lạnh Miền Bắc</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mô Tả / Ghi Chú Phụ Lục</label>
                <textarea
                  rows={3}
                  placeholder="Khai báo chi tiết thực trạng (vụn vỡ, hao mòn, rỉ rét, thừa thiếu)..."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none placeholder-slate-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>ĐANG LƯU HÌNH ẢNH TRÊN SERVER...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      <span>NỘP BÁO CÁO HÌNH ẢNH LÊN SERVER</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right photo capture controls */}
            <div className="flex flex-col gap-3 justify-center items-center border border-dashed border-slate-800 rounded-2xl bg-slate-950 p-4 relative min-h-[250px]">
              
              {/* Actual live camera viewfinder inside container */}
              {isCameraActive ? (
                <div className="w-full h-full flex flex-col justify-between items-center gap-3">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-850">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white font-mono text-[9px] font-bold tracking-widest rounded uppercase flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span> Live Camera
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      📸 Chụp Ngay
                    </button>
                    <button
                      type="button"
                      onClick={handleStopCamera}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Huỷ bỏ
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                /* Picture Preview Frame and action controls */
                <div className="w-full flex flex-col justify-between items-center gap-3 animate-fade-in">
                  <div className="relative max-h-[200px] w-full rounded-xl overflow-hidden bg-black border border-slate-850 flex items-center justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Captured warehouse report" 
                      className="max-h-[200px] rounded-xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      title="Xoá hình này"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-bold text-center">✓ Đã tối ưu nén ảnh JPEG thành công để nạp nhanh lên máy chủ!</p>
                  
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" /> Chụp Lại
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenFileDialog}
                      className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Đổi Ảnh Khác
                    </button>
                  </div>
                </div>
              ) : (
                /* Dormant capture/choose initial frame layout */
                <div className="text-center p-6 space-y-4">
                  <div className="h-12 w-12 bg-blue-900/40 rounded-full flex items-center justify-center text-blue-400 mx-auto border border-blue-800">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Chưa cắm tải hình ảnh bốc bãi</h4>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">Cho phép chụp ảnh camera trực tiếp trên màn hình, hoặc nhấn nút chụp điện thoại/máy ảnh của bạn.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    {/* Native phone camera triggering input */}
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment" /* Select back camera natively on Android/iOS phones */
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      onClick={handleOpenFileDialog}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> CHỤP/TẢI ẢNH ĐIỆN THOẠI
                    </button>

                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" /> BẬT CAMERA TRỰC TIẾP
                    </button>
                  </div>
                </div>
              )}

            </div>
          </form>
        </div>
      )}

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

        {/* 4. PHOTO REPORTS FEED SECTION */}
        {activeReport === 'photos' && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/25 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">KHOẢNH KHẮC/ẢNH CHỤP TỒN BÃI GẦN ĐÂY</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Hiển thị lịch sử các hình ảnh vật tư, lỗi hỏng pallet hoặc hiện trạng kho do nhân viên hiện trường nộp lên.</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-lg">Tổng cộng: {photoReports.length} ảnh</span>
            </div>

            {loadingPhotos && (
              <div className="flex flex-col items-center justify-center p-12 space-y-2">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="text-xs text-slate-500 font-bold uppercase animate-pulse">ĐANG THU THẬP BÁO CÁO TỪ SERVER CHI NHÁNH...</span>
              </div>
            )}

            {!loadingPhotos && photoReports.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                <FileImage className="h-10 w-10 text-slate-300" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Chưa có báo cáo hình ảnh nào</h5>
                  <p className="text-[10px] text-slate-450 mt-1 max-w-sm">Hãy chụp ảnh hoặc tải lên chứng từ sự cố hoặc vật liệu để tạo bằng chứng số bốc bãi trực quan.</p>
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm hover:bg-blue-750 transition"
                >
                  <Plus className="h-4 w-4" /> Bắt đầu chụp ảnh
                </button>
              </div>
            )}

            {/* Photo Cards Grid */}
            {!loadingPhotos && photoReports.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {photoReports.map(rep => {
                  const whName = warehouses.find(w => w.id === rep.warehouseId)?.name || 'Kho kiểm chứng';
                  return (
                    <div 
                      key={rep.id} 
                      className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
                    >
                      {/* Image Thumbnail with zoom trigger */}
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-zoom-in" onClick={() => { setSelectedImage(rep.imageUrl); setSelectedReport(rep); }}>
                        <img 
                          src={rep.imageUrl} 
                          alt={rep.title} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <span className="p-2 bg-white/20 backdrop-blur rounded-full text-white font-bold text-[10px] uppercase flex items-center gap-1 tracking-wider shadow">
                            <Eye className="h-3.5 w-3.5" /> Xem Chi Tiết
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-600/90 backdrop-blur text-white text-[9px] font-bold rounded">
                          {whName}
                        </div>
                      </div>

                      {/* Content panel */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <h5 className="font-extrabold text-slate-850 dark:text-white uppercase text-xs line-clamp-1 tracking-tight" title={rep.title}>
                            {rep.title}
                          </h5>
                          {rep.notes && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 italic" title={rep.notes}>
                              "{rep.notes}"
                            </p>
                          )}
                        </div>

                        {/* Metadata block */}
                        <div className="pt-2 border-t border-slate-50 dark:border-slate-850/50 flex flex-col gap-1 text-[9px] text-slate-400 font-mono">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{formatDate(rep.date)}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-slate-500">
                            <span>👤 Người gửi: </span>
                            <span className="text-slate-700 dark:text-slate-350">{rep.creatorName}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Image Zoom Modal */}
      {selectedImage && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
          <div 
            className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden max-w-2xl w-full flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()} // Stop bubbling
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-extrabold uppercase text-blue-400 tracking-wider">
                  {selectedReport.title}
                </h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Báo cáo lúc: {formatDate(selectedReport.date)} • Người gửi: {selectedReport.creatorName}</p>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-1 px-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 font-bold text-xs"
              >
                QUAY LẠI ✕
              </button>
            </div>

            {/* Enlarged Image */}
            <div className="bg-slate-950 p-1 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src={selectedImage} 
                alt="Enlargement" 
                className="max-h-[70vh] max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Notes footer */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-xs">
              <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wide block mb-1">MÔ TẢ CHI TIẾT HIỆN TRƯỜNG</span>
              <p className="text-slate-300 italic">
                {selectedReport.notes ? `"${selectedReport.notes}"` : 'Thành viên báo cáo không lập ghi chú chữ viết kèm theo hình này.'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
