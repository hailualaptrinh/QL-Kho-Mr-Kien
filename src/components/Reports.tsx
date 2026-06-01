/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, ArrowDownLeft, ArrowUpRight, ShieldCheck, 
  Layers, ChevronRight, FileSpreadsheet, Printer,
  Camera, Upload, Plus, Trash2, Eye, Loader2, RefreshCw, X, Clock, FileImage, ClipboardCheck,
  Cloud, Database, LogOut, CheckCircle, AlertTriangle, Mail, Send
} from 'lucide-react';
import { ImportOrder, ExportOrder, Product, Supplier, Customer, Warehouse, PhotoReport } from '../types';
import { formatCurrency, formatDate, exportToCSV, printPDFReport } from '../utils';
import { 
  initGoogleOAuth, googleSignIn, googleSignOut, 
  uploadBackupToDrive, listBackupsFromDrive, downloadBackupFromDrive, deleteFileFromDrive 
} from '../utils/gdriveAuth';
import { User } from 'firebase/auth';

interface ReportsProps {
  imports: ImportOrder[];
  exports: ExportOrder[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  warehouses?: Warehouse[];
  user: any;
  onRefresh?: () => void;
}

export default function Reports({ imports, exports, products, suppliers, customers, warehouses = [], user, onRefresh }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<'imports' | 'exports' | 'stock' | 'photos' | 'gdrive' | 'email'>('stock');
  const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  
  // Google Drive integrations states
  const [gdriveUser, setGdriveUser] = useState<User | null>(null);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [gdriveActionLoading, setGdriveActionLoading] = useState<boolean>(false);
  const [gdriveMessage, setGdriveMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [backupNameInput, setBackupNameInput] = useState<string>('');
  const [gdriveAutoSync, setGdriveAutoSync] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('mrkien_gdrive_autosync') === 'true';
  });
  
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

  // Email alerts states & functions
  const [emailSettings, setEmailSettings] = useState<any>({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: 'mrkien-erp-alerts@mrkien-erp.com',
    active: false,
    recipientOverride: 'manager@mrkien-erp.com',
    sendDailyAlerts: false,
    lastAlertSentAt: ''
  });
  const [loadingEmailSettings, setLoadingEmailSettings] = useState<boolean>(false);
  const [savingEmailSettings, setSavingEmailSettings] = useState<boolean>(false);
  const [triggeringAlerts, setTriggeringAlerts] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<{ text: string, type: 'success' | 'error' | 'info', url?: string } | null>(null);

  const fetchEmailSettings = async () => {
    setLoadingEmailSettings(true);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/settings/email', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch email configurations', err);
    } finally {
      setLoadingEmailSettings(false);
    }
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmailSettings(true);
    setEmailMessage(null);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(emailSettings)
      });
      const data = await res.json();
      if (res.ok) {
        setEmailSettings(data);
        setEmailMessage({
          text: 'Cấu hình cổng SMTP và điều lệ cảnh báo email tồn kho đã được lưu lại hệ thống thành công.',
          type: 'success'
        });
        if (onRefresh) onRefresh();
      } else {
        setEmailMessage({
          text: data.error || 'Cập nhật cấu hình thất bại.',
          type: 'error'
        });
      }
    } catch (err) {
      setEmailMessage({
        text: 'Có lỗi xảy ra khi truyền dữ liệu tới máy chủ.',
        type: 'error'
      });
    } finally {
      setSavingEmailSettings(false);
    }
  };

  const handleTriggerEmailAlerts = async () => {
    setTriggeringAlerts(true);
    setEmailMessage(null);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/notifications/trigger-email-alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.sent) {
          setEmailMessage({
            text: `Đã phát thành công báo cáo tồn kho yếu tới: ${data.recipients.join(', ')} (${data.productCount} sản phẩm dưới định mức).`,
            type: 'success',
            url: data.previewUrl
          });
        } else {
          setEmailMessage({
            text: data.error || 'Không tìm thấy sản phẩm nào chạm hoặc thấp hơn định mức tồn kho an toàn tối thiểu, hoặc cảnh báo email chưa được kích hoạt.',
            type: 'info'
          });
        }
        if (onRefresh) onRefresh();
      } else {
        setEmailMessage({
          text: data.error || 'Không thể kích hoạt kết nối cảnh báo kho tự động.',
          type: 'error'
        });
      }
    } catch (err) {
      setEmailMessage({
        text: 'Lỗi đường truyền kết nối hoặc thiết lập SMTP chưa hoàn hảo.',
        type: 'error'
      });
    } finally {
      setTriggeringAlerts(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      setEmailMessage({ text: 'Vui lòng điền địa chỉ email hòm thư nhận thử nghiệm.', type: 'error' });
      return;
    }
    setSendingTest(true);
    setEmailMessage(null);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetEmail: testRecipient })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage({
          text: `Đã gửi thử nghiệm SMTP kết nối thành công tới ${testRecipient}! Nhấp xem hòm thư ảo bên dưới nếu bạn đang dùng Ethereal để mở xem chi tiết email vừa gửi.`,
          type: 'success',
          url: data.previewUrl
        });
      } else {
        setEmailMessage({
          text: data.error || 'Gửi test SMTP lỗi. Vui lòng rà soát lại thông số cổng Server Host hoặc mật khẩu.',
          type: 'error'
        });
      }
    } catch (err) {
      setEmailMessage({
        text: 'Lỗi kết nối cổng SMTP hoặc máy chủ phản hồi chậm.',
        type: 'error'
      });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'email') {
      fetchEmailSettings();
    }
  }, [activeReport]);

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

  // ==========================================
  // 5. GOOGLE DRIVE BACKUP & RESTORE WORKING ACTIONS
  // ==========================================
  
  // Listen to Google OAuth state
  useEffect(() => {
    const unsubscribe = initGoogleOAuth(
      (user, token) => {
        setGdriveUser(user);
        setGdriveToken(token);
        setGdriveMessage({ text: `Đã kết nối tài khoản Google: ${user.email}`, type: 'success' });
      },
      () => {
        setGdriveUser(null);
        setGdriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setGdriveActionLoading(true);
    setGdriveMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGdriveUser(result.user);
        setGdriveToken(result.accessToken);
        setGdriveMessage({ text: `Kết nối thành công! Đã cấp quyền truy cập Google Drive.`, type: 'success' });
        fetchBackups(result.accessToken);
      }
    } catch (e: any) {
      setGdriveMessage({ text: `Lỗi kết nối tài khoản Google: ${e.message || e}`, type: 'error' });
    } finally {
      setGdriveActionLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGdriveUser(null);
      setGdriveToken(null);
      setBackupsList([]);
      setGdriveMessage({ text: 'Đã hủy kết nối Google Drive thành công.', type: 'info' });
    } catch (e: any) {
      setGdriveMessage({ text: `Lỗi đăng xuất: ${e.message || e}`, type: 'error' });
    }
  };

  const toggleAutoSync = () => {
    const newValue = !gdriveAutoSync;
    setGdriveAutoSync(newValue);
    localStorage.setItem('mrkien_gdrive_autosync', String(newValue));
    setGdriveMessage({
      text: newValue 
        ? 'Đã bật Tự Động Sao Lưu! Bản sao lưu "mrkien_erp_backup_autosync.json" sẽ được cập nhật âm thầm lên Google Drive của bạn khi có sự thay đổi dữ liệu.' 
        : 'Đã tắt Tự động Sao Lưu.',
      type: 'info'
    });
  };

  const prevLengthsRef = useRef({
    products: products.length,
    imports: imports.length,
    exports: exports.length
  });

  useEffect(() => {
    if (!gdriveToken || !gdriveAutoSync) return;

    const currentProducts = products.length;
    const currentImports = imports.length;
    const currentExports = exports.length;

    const hasChanged = 
      currentProducts !== prevLengthsRef.current.products ||
      currentImports !== prevLengthsRef.current.imports ||
      currentExports !== prevLengthsRef.current.exports;

    if (hasChanged) {
      prevLengthsRef.current = {
        products: currentProducts,
        imports: currentImports,
        exports: currentExports
      };

      const runTriggeredBackup = async () => {
        try {
          console.log('[Auto-Sync] Initiating automatic Google Drive cloud backup sync...');
          const token = localStorage.getItem('mrkien_erp_token');
          const res = await fetch('/api/backup/export', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) return;
          const backupPayload = await res.json();
          
          const filename = 'mrkien_erp_backup_autosync.json';
          
          // Try to remove old autosync files so that they don't leak space
          try {
            const list = await listBackupsFromDrive(gdriveToken);
            const duplicates = list.filter(f => f.name === filename);
            for (const dup of duplicates) {
              await deleteFileFromDrive(gdriveToken, dup.id);
            }
          } catch (e) {
            console.warn('Silent duplicate cleanup failure:', e);
          }

          await uploadBackupToDrive(gdriveToken, backupPayload, filename);
          console.log('[Auto-Sync] Successfully synced database backup payload to Google Drive!');
          setGdriveMessage({ text: 'Hệ thống vừa âm thầm tự động đồng bộ một bản sao lưu mới "mrkien_erp_backup_autosync.json" lên Google Drive của bạn!', type: 'success' });
          fetchBackups(gdriveToken);
        } catch (err) {
          console.error('Failed to run triggered background Google Drive backup:', err);
        }
      };

      const timer = setTimeout(() => {
        runTriggeredBackup();
      }, 3500); // 3.5 seconds debounce to ensure heavy batch writes are completed

      return () => clearTimeout(timer);
    }
  }, [products.length, imports.length, exports.length, gdriveToken, gdriveAutoSync]);

  const fetchBackups = async (token = gdriveToken) => {
    if (!token) return;
    setLoadingBackups(true);
    try {
      const list = await listBackupsFromDrive(token);
      setBackupsList(list);
    } catch (e: any) {
      setGdriveMessage({ text: `Không tải được danh sách sao lưu từ Drive: ${e.message || e}`, type: 'error' });
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'gdrive' && gdriveToken) {
      fetchBackups();
    }
  }, [activeReport, gdriveToken]);

  const handleUploadBackup = async () => {
    if (!gdriveToken) {
      setGdriveMessage({ text: 'Vui lòng kết nối Google Drive trước!', type: 'error' });
      return;
    }
    setGdriveActionLoading(true);
    setGdriveMessage(null);
    try {
      const token = localStorage.getItem('mrkien_erp_token');
      const res = await fetch('/api/backup/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Không lấy được dữ liệu xuất kho từ máy chủ.');
      const backupPayload = await res.json();

      let filename = `mrkien_erp_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      if (backupNameInput.trim()) {
        const suffix = backupNameInput.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
        filename = `mrkien_erp_backup_${suffix}.json`;
      }

      const result = await uploadBackupToDrive(gdriveToken, backupPayload, filename);
      setGdriveMessage({ text: `Tạo bản sao lưu "${filename}" & đồng bộ lên Google Drive của bạn thành công dồi dào!`, type: 'success' });
      setBackupNameInput('');
      fetchBackups();
    } catch (e: any) {
      setGdriveMessage({ text: `Lỗi tải bản sao lưu: ${e.message || e}`, type: 'error' });
    } finally {
      setGdriveActionLoading(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, fileName: string) => {
    if (!gdriveToken) return;
    const confirmRestore = window.confirm(
      `CẢNH BÁO BẢO MẬT QUAN TRỌNG:\nBạn có chắc chắn muốn KHÔI PHỤC dồi dào toàn bộ hệ thống Quản lý kho Mr Kiên ERP từ file "${fileName}" không?\n\nToàn bộ dữ liệu hiện tại trong hệ thống (Sản phẩm, Khách hàng, Đơn bốc xếp, Báo cáo bến bãi) sẽ bị ghi đè hoàn toàn bằng dữ liệu của file sao lưu này!`
    );
    if (!confirmRestore) return;

    setGdriveActionLoading(true);
    setGdriveMessage(null);
    try {
      const googleBackupObj = await downloadBackupFromDrive(gdriveToken, fileId);
      
      const token = localStorage.getItem('mrkien_erp_token');
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: googleBackupObj.data || googleBackupObj })
      });

      if (response.ok) {
        setGdriveMessage({ text: `Khôi phục dữ liệu ERP thành công! Đang đồng bộ và cập nhật lại giao diện ứng dụng...`, type: 'success' });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Server phản đối tệp sao lưu này.');
      }
    } catch (e: any) {
      setGdriveMessage({ text: `Có lỗi xảy ra khi khôi phục dữ liệu: ${e.message || e}`, type: 'error' });
    } finally {
      setGdriveActionLoading(false);
    }
  };

  const handleDeleteBackup = async (fileId: string) => {
    if (!gdriveToken) return;
    const confirmDelete = window.confirm('Bạn muốn xóa bản sao lưu này trên Google Drive của bạn?');
    if (!confirmDelete) return;

    setGdriveActionLoading(true);
    setGdriveMessage(null);
    try {
      await deleteFileFromDrive(gdriveToken, fileId);
      setGdriveMessage({ text: 'Đã xoá thành công bản sao lưu khỏi Drive cá nhân.', type: 'info' });
      fetchBackups();
    } catch (e: any) {
      setGdriveMessage({ text: `Lỗi khi xoá tệp: ${e.message || e}`, type: 'error' });
    } finally {
      setGdriveActionLoading(false);
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
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
          <button
            onClick={() => setActiveReport('gdrive')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'gdrive' ? 'bg-blue-600 text-white shadow font-extrabold flex items-center gap-1.5' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500 flex items-center gap-1.5'}`}
          >
            <Cloud className="h-3.5 w-3.5" /> Đồng Bộ Google Drive
          </button>
          <button
            onClick={() => setActiveReport('email')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeReport === 'email' ? 'bg-blue-600 text-white shadow font-extrabold flex items-center gap-1.5' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500 flex items-center gap-1.5'}`}
          >
            <Mail className="h-3.5 w-3.5" /> Cảnh Báo Email & SMTP
          </button>
        </div>

        {/* Master action buttons (Hidden during Photo report, Google Drive & Email tab) */}
        {activeReport !== 'photos' && activeReport !== 'gdrive' && activeReport !== 'email' && (
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
                  className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm hover:bg-blue-750 transition pointer-events-auto cursor-pointer"
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

        {/* 5. GOOGLE DRIVE BACKUP & RESTORE PANEL */}
        {activeReport === 'gdrive' && (
          <div className="p-5 space-y-6 animate-fade-in text-left">
            {/* Header info */}
            <div className="bg-slate-50 dark:bg-slate-950/25 p-4 rounded-2xl border border-slate-101 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/35 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase tracking-wider rounded-lg">CÔNG CỤ CLOUD SYNC</span>
                <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Sao lưu Cloud & Phục hồi hệ thống</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Đóng gói cơ sở dữ liệu kho bãi ERP, đơn bốc xếp xuất nhập và đồng bộ trực tiếp lên tài khoản cá nhân Google Drive của bạn hoàn toàn bảo mật.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {gdriveUser ? (
                  <button
                    onClick={handleGoogleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-55 dark:bg-red-950/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Ngắt kết nối Google
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    disabled={gdriveActionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {gdriveActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 fill-current">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    )}
                    Kết nối Google Drive
                  </button>
                )}
              </div>
            </div>

            {/* Notifications panel */}
            {gdriveMessage && (
              <div className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2.5 ${
                gdriveMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-450' 
                  : gdriveMessage.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400'
                  : 'bg-blue-50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-405'
              }`}>
                {gdriveMessage.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : gdriveMessage.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <Cloud className="h-4 w-4 shrink-0 text-blue-500" />
                )}
                <span>{gdriveMessage.text}</span>
              </div>
            )}

            {/* Main Drive Hub */}
            {!gdriveUser ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl space-y-4">
                <Cloud className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-pulse" />
                <div className="space-y-1.5 max-w-sm">
                  <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">CHƯA LIÊN KẾT GOOGLE CLOUD</h5>
                  <p className="text-[11px] text-slate-450 leading-relaxed">
                    Vui lòng nhấn nút "Kết nối Google Drive" phía trên để cấp quyền lưu trữ các tệp sao lưu dữ liệu kho ERP cá nhân của bạn trực tiếp vào tài khoản Drive một cách vô cùng an toàn và bảo mật cao.
                  </p>
                </div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={gdriveActionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-3.5 w-3.5 fill-current">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  Đăng nhập & Uỷ quyền Drive
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* Back up controller column */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-1">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <Database className="h-4 w-4 text-blue-500" />
                    <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase">Tạo bản sao lưu mới</h5>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÃ TÊN CHÚ THÍCH (TÙY CHỌN)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: dong_so_cuoi_ky"
                        value={backupNameInput}
                        onChange={(e) => setBackupNameInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                      />
                      <span className="text-[9px] text-slate-400 block italic leading-tight">
                        Tên tệp sẽ được lưu dưới dạng: <code className="text-blue-500 font-mono">mrkien_erp_backup_[tên_nhập].json</code>.
                      </span>
                    </div>

                    <button
                      onClick={handleUploadBackup}
                      disabled={gdriveActionLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      {gdriveActionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Cloud className="h-3.5 w-3.5" />
                      )}
                      Đóng gói & Đẩy lên Cloud Drive
                    </button>
                  </div>

                  {/* Toggle Auto Sync to Google Drive */}
                  <div className="p-3 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100/60 dark:border-blue-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-in dark:text-slate-200 uppercase tracking-tight">Tự động Cloud Sync</span>
                      <button
                        onClick={toggleAutoSync}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${gdriveAutoSync ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        style={{ outline: 'none' }}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${gdriveAutoSync ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500/90 dark:text-slate-400 leading-tight">
                      Khi bật, hệ thống tự động cập nhật bản sao lưu <code className="text-blue-600 dark:text-blue-400 font-semibold">mrkien_erp_backup_autosync.json</code> lên Google Drive ngay khi có phát sinh giao dịch xuất, nhập kho hoặc bốc xếp vật tư bến bãi.
                    </p>
                  </div>

                  {/* Connected Profile summary card */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl flex items-center gap-3">
                    {gdriveUser.photoURL ? (
                      <img src={gdriveUser.photoURL} alt="Google avatar" className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs uppercase">
                        {gdriveUser.displayName?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{gdriveUser.displayName}</p>
                      <p className="text-[9px] text-slate-400 truncate">{gdriveUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Backups history List column */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-emerald-500" />
                        <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-tight">Bản sao lưu trên Drive của bạn</h5>
                      </div>
                      
                      <button
                        onClick={() => fetchBackups()}
                        disabled={loadingBackups}
                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer text-slate-700 dark:text-slate-200"
                        title="Tải lại danh sách"
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingBackups ? 'animate-spin' : ''}`} /> Tải lại danh sách
                      </button>
                    </div>

                    {loadingBackups && (
                      <div className="flex flex-col items-center justify-center py-16 space-y-2">
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase animate-pulse">ĐANG DUYỆT TỆP TRÊN GOOGLE DRIVE...</span>
                      </div>
                    )}

                    {!loadingBackups && backupsList.length === 0 && (
                      <div className="text-center py-12 text-slate-400 flex flex-col items-center space-y-2">
                        <Cloud className="h-8 w-8 text-slate-305 dark:text-slate-700" />
                        <p className="text-[11px] font-bold">Không tìm thấy tệp sao lưu ERP nào trên Drive.</p>
                        <p className="text-[9px] text-slate-400">Hãy nhấn nút "Tạo bản sao lưu mới" bên cạnh để thực hiện sao lưu đầu tiên của bạn.</p>
                      </div>
                    )}

                    {!loadingBackups && backupsList.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                              <th className="py-2.5">TÊN FILE</th>
                              <th className="py-2.5">THỜI ĐIỂM SAO LƯU</th>
                              <th className="py-2.5 text-right font-mono text-[9px]">DUNG LƯỢNG</th>
                              <th className="py-2.5 text-right">THAO TÁC KHÔI PHỤC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-[11px]">
                            {backupsList.map((file) => {
                              const fileSizeKB = file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Có sẵn';
                              return (
                                <tr key={file.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                                  <td className="py-2.5 font-bold font-mono text-slate-800 dark:text-slate-200 break-all select-all pr-2 max-w-[200px]" title={file.name}>
                                    {file.name}
                                  </td>
                                  <td className="py-2.5 text-slate-500 font-mono text-[10px]">
                                    {formatDate(file.createdTime)}
                                  </td>
                                  <td className="py-2.5 text-slate-650 dark:text-slate-400 font-mono text-right text-[10px]">
                                    {fileSizeKB}
                                  </td>
                                  <td className="py-2.5 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                                    <button
                                      onClick={() => handleRestoreBackup(file.id, file.name)}
                                      disabled={gdriveActionLoading}
                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                                      title="Ghi đè database ERP cục bộ bằng dữ liệu từ bản sao lưu này"
                                    >
                                      Khôi phục ↺
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBackup(file.id)}
                                      disabled={gdriveActionLoading}
                                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400 text-[10px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                                      title="Xóa tệp ngoài"
                                    >
                                      Xoá ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Comprehensive Bento Cloud Sync Guide */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Card 1: Google Drive Recovery info */}
                    <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed relative overflow-hidden space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold uppercase">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        <span>Đồng bộ Google Drive</span>
                      </div>
                      <p className="text-slate-650 dark:text-slate-350">
                        • <strong>Khôi phục nhanh:</strong> Chỉ cần chọn bản sao lưu mong muốn và click nút <strong>Khôi phục</strong>. Toàn bộ hệ thống sẽ đồng bộ và cập nhật giao diện ứng dụng lập tức mà không cần tải lại trang.
                      </p>
                      <p className="text-slate-650 dark:text-slate-350">
                        • <strong>Tự động Cloud Sync:</strong> Khi được bật, hệ thống sẽ tự động cập nhật bản sao lưu đám mây mới nhất <code className="bg-slate-100 dark:bg-slate-950 px-1 text-blue-505 font-mono text-[9px] rounded">mrkien_erp_backup_autosync.json</code> sau mỗi 3.5 giây khi có thay đổi bốc bãi, vật tư, giúp bạn hoàn toàn an tâm.
                      </p>
                    </div>

                    {/* Card 2: Render configuration info */}
                    <div className="bg-blue-55/10 dark:bg-blue-955/5 p-4 rounded-xl border border-blue-100/40 dark:border-blue-900/30 text-[11px] leading-relaxed space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold uppercase">
                        <Database className="h-4 w-4 text-emerald-500" />
                        <span>Bảo vệ dữ liệu gốc trên Render</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-350 leading-normal">
                        Mặc định máy chủ đám mây Render sẽ làm mới và reset file <code className="font-mono text-[9px] bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded">db.json</code> khi deploy hoặc sleep. Hãy chọn <strong>1 trong 2 giải pháp</strong> sau để dữ liệu được bảo vệ vĩnh viễn:
                      </p>
                      <div className="space-y-1.5 bg-white/75 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900/600">
                        <p className="text-slate-700 dark:text-slate-300">
                          🎯 <strong>Cách A (Miễn phí - Nên dùng nhất):</strong> Tạo một database <strong>MongoDB Atlas Cloud</strong> miễn phí, lấy chuỗi url kết nối, rồi thêm vào cài đặt Environment Variables trên Render Dashboard với tên biến: <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded text-blue-600 font-mono text-[9px]">MONGODB_URI</code>. Hệ thống sẽ tự kết nối và đồng bộ.
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                          💾 <strong>Cách B (Gắn ổ đĩa cứng Render Disk):</strong> Trong cài đặt Render Web Service, hãy thêm một <strong>Disk 1GB</strong>, mount tại thư mục <code className="text-emerald-600 font-mono text-[9px]">/data</code> và tạo biến môi trường <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded text-blue-600 font-mono text-[9px]">DB_FILE_PATH=/data/db.json</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* EMAIL SMTP CONFIG & LOW STOCK NOTIFICATION CENTER */}
            {activeReport === 'email' && (
              <div className="space-y-6">
                
                {/* Intro Banner */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-101 dark:border-slate-850 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Cổng Kiểm Soát Email Cảnh Báo Tồn Kho</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                      Thiết lập cấu hình cổng máy chủ SMTP (Gmail, Outlook hoặc Mail ảo Ethereal) để tự động hóa việc phát hành thư điện tử khẩn tới ban giám đốc khi vật tư, hàng hóa có dấu hiệu cạn kiệt dưới định mức an toàn.
                    </p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                    <span className="text-slate-400 uppercase font-bold">Hạn chế:</span>
                    {user?.role !== 'SUPER_ADMIN' ? (
                      <span className="text-amber-600">Chỉ Xem (Chỉ Admin cấu hình)</span>
                    ) : (
                      <span className="text-emerald-600">Toàn quyền cấu hình</span>
                    )}
                  </div>
                </div>

                {/* Email Messages Portal / Log outputs */}
                {emailMessage && (
                  <div className={`p-4 rounded-xl text-xs leading-relaxed transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    emailMessage.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-450' 
                      : emailMessage.type === 'error'
                        ? 'bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/60 text-red-800 dark:text-red-450'
                        : 'bg-blue-50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/60 text-blue-800 dark:text-blue-450'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <div className="text-base mt-0.5">
                        {emailMessage.type === 'success' ? '✅' : emailMessage.type === 'error' ? '❌' : 'ℹ️'}
                      </div>
                      <div>
                        <p className="font-bold">{emailMessage.type === 'success' ? 'Thành công!' : emailMessage.type === 'error' ? 'Có lỗi phát sinh' : 'Lưu ý'}</p>
                        <p className="opacity-90">{emailMessage.text}</p>
                      </div>
                    </div>
                    {emailMessage.url && (
                      <a 
                        href={emailMessage.url} 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-801 hover:bg-slate-50 text-[10px] font-extrabold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer text-center"
                      >
                        📬 Mở xem email ảo (Ethereal Link) ↗
                      </a>
                    )}
                  </div>
                )}

                {/* Form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left panel edit configuration form */}
                  <form onSubmit={handleSaveEmailSettings} className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Cài đặt Tài khoản Máy chủ SMTP</h5>
                    </div>

                    {loadingEmailSettings ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-xs text-slate-400 font-medium font-sans">Đang tải cấu hình máy chủ...</span>
                      </div>
                    ) : (
                      <div className="space-y-4 font-sans">
                        
                        {/* Activations Switches */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Alert Master Enable Switch */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-705 dark:text-slate-200 uppercase tracking-tight">Kích hoạt Thư báo</span>
                              <button
                                type="button"
                                disabled={user?.role !== 'SUPER_ADMIN'}
                                onClick={() => setEmailSettings({ ...emailSettings, active: !emailSettings.active })}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailSettings.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                style={{ outline: 'none' }}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailSettings.active ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight">
                              Cho phép gửi thư điện tử báo cáo vật tư khi đạt ngưỡng cảnh báo.
                            </p>
                          </div>

                          {/* Daily Schedule Cron Switch */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-705 dark:text-slate-200 uppercase tracking-tight">Quét Tự Động Hàng Ngày</span>
                              <button
                                type="button"
                                disabled={user?.role !== 'SUPER_ADMIN'}
                                onClick={() => setEmailSettings({ ...emailSettings, sendDailyAlerts: !emailSettings.sendDailyAlerts })}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailSettings.sendDailyAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                style={{ outline: 'none' }}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailSettings.sendDailyAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight">
                              Máy chủ tự quét và gửi báo cáo tổng hợp duy nhất mỗi 1 ngày (24 giờ).
                            </p>
                          </div>

                        </div>

                        {/* SMTP Server & Port */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÁY CHỦ SMTP OUTGOING HOST</label>
                            <input
                              type="text"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              placeholder="Ví dụ: smtp.gmail.com"
                              value={emailSettings.host || ''}
                              onChange={(e) => setEmailSettings({ ...emailSettings, host: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CỔNG PORT</label>
                            <input
                              type="number"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              placeholder="587"
                              value={emailSettings.port || 587}
                              onChange={(e) => setEmailSettings({ ...emailSettings, port: parseInt(e.target.value) || 587 })}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                              required
                            />
                          </div>
                        </div>

                        {/* SSL Secure & Sender */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
                          
                          <div className="flex items-center gap-2 md:mt-4">
                            <input
                              type="checkbox"
                              id="smtp-secure-checkbox"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              checked={!!emailSettings.secure}
                              onChange={(e) => setEmailSettings({ ...emailSettings, secure: e.target.checked })}
                              className="h-4 w-4 text-blue-600 rounded bg-slate-50 border-slate-300 focus:ring-blue-500"
                            />
                            <label htmlFor="smtp-secure-checkbox" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer">SỬ DỤNG SSL/TLS (CỔNG KÍN 465)</label>
                          </div>

                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ĐỊA CHỈ EMAIL GỬI ĐI (FROM ADDRESS)</label>
                            <input
                              type="email"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              placeholder="mrkien-erp-alerts@company.com"
                              value={emailSettings.from || ''}
                              onChange={(e) => setEmailSettings({ ...emailSettings, from: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                              required
                            />
                          </div>

                        </div>

                        {/* User credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">TÊN ĐĂNG NHẬP (USERNAME/LOGIN USER)</label>
                            <input
                              type="text"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              placeholder="tai_khoan_gui_tin@mrkien-erp.com"
                              value={emailSettings.user || ''}
                              onChange={(e) => setEmailSettings({ ...emailSettings, user: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MẬT KHẨU HOẶC APP PASSWORD</label>
                            <input
                              type="password"
                              disabled={user?.role !== 'SUPER_ADMIN'}
                              placeholder="••••••••••••••••"
                              value={emailSettings.pass || ''}
                              onChange={(e) => setEmailSettings({ ...emailSettings, pass: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        {/* Target Recipient Overrides */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">DANH SÁCH EMAIL NHẬN THƯ KHẨN (NGĂN CÁCH BẰNG DẤU PHẨY)</label>
                          <input
                            type="text"
                            disabled={user?.role !== 'SUPER_ADMIN'}
                            placeholder="manager@mrkien-erp.com, director@mrkien-erp.com"
                            value={emailSettings.recipientOverride || ''}
                            onChange={(e) => setEmailSettings({ ...emailSettings, recipientOverride: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                          />
                          <span className="text-[9px] text-slate-400 block italic leading-tight">
                            Bỏ trống để mặc định tự động tìm thu nạp tất cả các email thành viên có vai trò <strong>MANAGER (QUẢN LÝ)</strong> hoặc <strong>SUPER_ADMIN</strong> đang kích hoạt trên hệ thống.
                          </span>
                        </div>

                        {/* Submit settings button */}
                        {user?.role === 'SUPER_ADMIN' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="submit"
                              disabled={savingEmailSettings}
                              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                            >
                              {savingEmailSettings ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ClipboardCheck className="h-4 w-4" />
                              )}
                              Lưu Cấu Hình Mật Khẩu
                            </button>
                          </div>
                        )}

                        {/* Quick Tip for Ethereal */}
                        <div className="p-3 bg-amber-50/40 dark:bg-amber-955/5 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-[10px] text-slate-550 dark:text-slate-400 space-y-1 leading-normal">
                          <p className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            💡 Mẹo nhỏ cho môi trường Sandbox (Ethereal Email):
                          </p>
                          <p>
                            Nếu bạn không muốn liên kết Gmail/SMTP gốc, hãy để trống ô <strong>Tên đăng nhập & Mật khẩu bản thể</strong> đồng thời đặt địa chỉ máy chủ mặc định là <code className="bg-white dark:bg-slate-950 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono text-[9px]">smtp.ethereal.email</code>.
                          </p>
                          <p>
                            Hệ thống <strong>sẽ tự động tạo mới</strong> một hòm thư kiểm thử an toàn miễn phí tức thì và trả ra đường link xem thư trực tiếp tuyệt đẹp!
                          </p>
                        </div>

                      </div>
                    )}
                  </form>

                  {/* Right Column: Dynamic Diagnosis, Testing and Low-stock inventory preview */}
                  <div className="space-y-6">
                    
                    {/* Diagnostic Actions */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="pb-3 border-b border-slate-101 dark:border-slate-800/80 flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-amber-500" />
                        <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Phòng Thử Nghiệm SMTP</h5>
                      </div>

                      <div className="space-y-4 font-sans">
                        
                        {/* Send Test Email Card */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ĐỊA CHỈ NHẬN EMAIL TEST KIỂM THỬ</label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder="nhan_vien_test@mrkien-erp.com"
                              value={testRecipient}
                              onChange={(e) => setTestRecipient(e.target.value)}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-850 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={handleSendTestEmail}
                              disabled={sendingTest}
                              className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                            >
                              {sendingTest ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Gửi test
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3" />

                        {/* Trigger Manual Scan broadcast */}
                        <div className="space-y-2">
                          <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Phát động quét hệ thống và gửi khẩn</h6>
                          <button
                            type="button"
                            onClick={handleTriggerEmailAlerts}
                            disabled={triggeringAlerts}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow active:scale-95 transition cursor-pointer disabled:opacity-50 font-extrabold"
                          >
                            {triggeringAlerts ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-white" />
                            )}
                            BẮT QUÉT & PHÁT THƯ NGAY
                          </button>
                          <span className="text-[9px] text-slate-400 block text-center italic leading-tight">
                            Yêu cầu máy chủ quét kiểm kê tức khắc tất cả các mặt hàng chạm ngưỡng nguy hiểm, đóng tệp email HTML gửi tới các hòm thư quản lý.
                          </span>
                        </div>

                        {/* Display Timestamp and stats info */}
                        <div className="bg-slate-50 dark:bg-slate-950/20 rounded-xl p-3 border border-slate-150 dark:border-slate-850 text-[10px] space-y-1">
                          <p className="text-slate-450 uppercase tracking-wide font-extrabold">Lịch sử tự động gần nhất: </p>
                          <p className="font-extrabold font-mono text-slate-700 dark:text-slate-200">
                            {emailSettings.lastAlertSentAt ? new Date(emailSettings.lastAlertSentAt).toLocaleString('vi-VN') : 'Chưa thu nhận lịch sử quét'}
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* Quick list of items failing minimum stock limits right now */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="pb-2 border-b border-slate-101 dark:border-slate-800/80 flex justify-between items-center">
                        <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Danh Sách Báo Động Mặt Hàng Yếu</h5>
                        <span className="px-2 py-0.5 text-[9px] font-black bg-red-50 dark:bg-red-955/50 border border-red-150 dark:border-red-900/40 text-red-650 rounded-full">
                          {products.filter(p => p.stock <= p.minStock).length} Loại
                        </span>
                      </div>

                      <div className="max-h-[250px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800/50 text-xs font-sans">
                        {products.filter(p => p.stock <= p.minStock).length === 0 ? (
                          <div className="py-6 text-center text-slate-400 italic">
                            Không có sản phẩm nào chạm định mức tồn tối thiểu. Hệ thống an toàn tuyệt đối!
                          </div>
                        ) : (
                          products.filter(p => p.stock <= p.minStock).map(p => {
                            const ratio = p.stock === 0 ? 0 : Math.ceil((p.stock / p.minStock) * 100);
                            return (
                              <div key={p.id} className="py-2.5 flex items-center justify-between gap-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{p.code} • Phải trữ: {p.minStock}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-black text-slate-850 dark:text-white font-mono">{p.stock} {p.unit}</p>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                    p.stock === 0 ? 'bg-red-50 dark:bg-red-950/20 text-red-650' : 'bg-orange-50 dark:bg-orange-950/20 text-orange-655'
                                  }`}>
                                    Tồn {ratio}%
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                </div>

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
