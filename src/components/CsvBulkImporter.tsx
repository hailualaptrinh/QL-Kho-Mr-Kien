import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Columns, Play, CheckCircle, AlertTriangle, 
  X, FileSpreadsheet, Loader2, RefreshCw, FileText, ArrowRight, Download
} from 'lucide-react';
import { parseCSV } from '../utils/csvParser';

interface CsvBulkImporterProps {
  type: 'products' | 'customers';
  categories?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
  onAdd: (data: any) => Promise<any>;
  onClose: () => void;
  onSuccess: () => void;
}

interface TargetField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number';
  defaultValue: any;
  autoMatchKeywords: string[];
}

export default function CsvBulkImporter({
  type,
  categories = [],
  suppliers = [],
  onAdd,
  onClose,
  onSuccess
}: CsvBulkImporterProps) {
  // Drag and drop states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  
  // Mapping state: maps targetFieldKey -> selectedCSVHeader
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Option fields
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [defaultSupplier, setDefaultSupplier] = useState<string>('');

  // Execution states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; success: number; failed: number }>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0
  });
  const [errorLog, setErrorLog] = useState<{ row: number; data: string; error: string }[]>([]);
  const [importCompleted, setImportCompleted] = useState<boolean>(false);

  // Field configurations
  const productFields: TargetField[] = [
    { key: 'name', label: 'Tên Sản Phẩm', required: true, type: 'string', defaultValue: '', autoMatchKeywords: ['tên', 'ten', 'name', 'tên sản phẩm', 'title', 'sản phẩm', 'san pham'] },
    { key: 'code', label: 'Mã Sản Phẩm', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['mã', 'ma', 'code', 'mã sản phẩm', 'sku'] },
    { key: 'importPrice', label: 'Giá Nhập (VNĐ)', required: false, type: 'number', defaultValue: 0, autoMatchKeywords: ['giá nhập', 'import', 'giá mua', 'gianhap', 'importprice'] },
    { key: 'exportPrice', label: 'Giá Xuất (VNĐ)', required: false, type: 'number', defaultValue: 0, autoMatchKeywords: ['giá xuất', 'export', 'giá bán', 'giaxuat', 'exportprice'] },
    { key: 'unit', label: 'Đơn Vị Tính', required: false, type: 'string', defaultValue: 'Cái', autoMatchKeywords: ['đơn vị', 'donvi', 'unit'] },
    { key: 'stock', label: 'Tồn Kho Ban Đầu', required: false, type: 'number', defaultValue: 0, autoMatchKeywords: ['tồn', 'kho', 'stock', 'số lượng', 'soluong', 'tồn kho'] },
    { key: 'minStock', label: 'Tồn Tối Thiểu', required: false, type: 'number', defaultValue: 5, autoMatchKeywords: ['tồn tối thiểu', 'min', 'minstock'] },
    { key: 'barcode', label: 'Mã Vạch / Barcode', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['barcode', 'mã vạch', 'mavach'] },
    { key: 'description', label: 'Mô Tả Sản Phẩm', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['mô tả', 'mota', 'description'] }
  ];

  const customerFields: TargetField[] = [
    { key: 'name', label: 'Họ và Tên', required: true, type: 'string', defaultValue: '', autoMatchKeywords: ['tên', 'ten', 'name', 'khách hàng', 'khachhang', 'họ tên', 'hoten'] },
    { key: 'phone', label: 'Số Điện Thoại', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['điện thoại', 'phone', 'sđt', 'sdt', 'tel'] },
    { key: 'email', label: 'Địa Chỉ Thư (Email)', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['email', 'thư', 'mail'] },
    { key: 'address', label: 'Địa Chỉ Thường Trú', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['địa chỉ', 'address', 'diachi'] },
    { key: 'company', label: 'Tên Doanh Nghiệp', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['công ty', 'company', 'congty', 'doanh nghiep'] },
    { key: 'deliveryAddress', label: 'Địa Chỉ Giao Nhận', required: false, type: 'string', defaultValue: '', autoMatchKeywords: ['giao hàng', 'nhận hàng', 'delivery', 'deliveryaddress'] }
  ];

  const targetFields = type === 'products' ? productFields : customerFields;

  // Set default optional categories
  useEffect(() => {
    if (type === 'products') {
      if (categories.length > 0) setDefaultCategory(categories[0].id);
      if (suppliers.length > 0) setDefaultSupplier(suppliers[0].id);
    }
  }, [categories, suppliers, type]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle manual selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Extract CSV logic
  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Vui lòng chỉ tải lên tệp định dạng .csv');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        alert('Tệp CSV trống hoặc không đúng định dạng.');
        return;
      }

      const headers = parsed[0].map(h => h.trim());
      const rows = parsed.slice(1);

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Smart auto matching!
      const initialMappings: Record<string, string> = {};
      targetFields.forEach(field => {
        // Attempt to find automatic match
        const matchedHeader = headers.find(header => {
          const lowerHeader = header.toLowerCase();
          return field.autoMatchKeywords.some(keyword => {
            return lowerHeader.includes(keyword) || keyword.includes(lowerHeader);
          });
        });
        if (matchedHeader) {
          initialMappings[field.key] = matchedHeader;
        } else {
          initialMappings[field.key] = ''; // none empty
        }
      });
      setMappings(initialMappings);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleMappingChange = (key: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Custom Sample templates
  const downloadTemplate = () => {
    let headers: string[] = [];
    let sampleRow: string[] = [];
    
    if (type === 'products') {
      headers = ['Tên Sản Phẩm', 'Mã Sản Phẩm', 'Giá Nhập', 'Giá Xuất', 'Đơn Vị Tính', 'Tồn Kho Ban Đầu', 'Tồn Tối Thiểu', 'Barcode/Mã Vạch', 'Mô Tả'];
      sampleRow = ['Xi măng Hà Tiên PCB40', 'XM-HT-PCB40', '85000', '95000', 'Bao', '100', '10', '8935022001122', 'Xi măng chất lượng cao bến bãi đòn xe dốc'];
    } else {
      headers = ['Họ Tên Khách', 'Số Điện Thoại', 'Địa Chỉ Email', 'Địa Chỉ Thường Trú', 'Tên Doanh Nghiệp', 'Địa Chỉ Giao Hàng'];
      sampleRow = ['Nguyễn Văn Kiên', '0912345678', 'kienwork@gmail.com', 'Cảng Cát Lái, Quận 2, TPHCM', 'Công Ty Thép Kiên Phát', 'Kho bãi bốc xếp số 3 cảng thủy'];
    }

    const csvContent = "\uFEFF" + [headers.join(','), sampleRow.map(v => `"${v}"`).join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mau_nhap_lieu_${type === 'products' ? 'san_pham' : 'khach_hang'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start the bulk process!
  const handleStartImport = async () => {
    // Validate required fields mapping
    const missingFields = targetFields
      .filter(f => f.required && !mappings[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      alert(`Vui lòng bản đồ các cột cột thiết yếu sau: ${missingFields.join(', ')}`);
      return;
    }

    setIsProcessing(true);
    setImportCompleted(false);
    setErrorLog([]);
    setProgress({ current: 0, total: csvRows.length, success: 0, failed: 0 });

    const localErrors: typeof errorLog = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < csvRows.length; i++) {
      const csvRow = csvRows[i];
      const payload: Record<string, any> = {};

      try {
        // Build payload
        targetFields.forEach(field => {
          const mappedHeader = mappings[field.key];
          if (mappedHeader) {
            const columnIndex = csvHeaders.indexOf(mappedHeader);
            if (columnIndex !== -1) {
              const strVal = (csvRow[columnIndex] || '').trim();
              if (field.type === 'number') {
                const parsedNum = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                payload[field.key] = isNaN(parsedNum) ? field.defaultValue : parsedNum;
              } else {
                payload[field.key] = strVal;
              }
            } else {
              payload[field.key] = field.defaultValue;
            }
          } else {
            payload[field.key] = field.defaultValue;
          }
        });

        // Inject Default Relations for Products
        if (type === 'products') {
          payload.categoryId = defaultCategory;
          payload.supplierId = defaultSupplier;
          if (!payload.image) {
            payload.image = '';
          }
          // Default code generation if empty
          if (!payload.code) {
            payload.code = 'PRD-' + Math.floor(1000 + Math.random() * 9000);
          }
        }

        // Essential validation
        if (!payload.name) {
          throw new Error('Dữ liệu cột tên bắt buộc bị trống.');
        }

        // Call the parent add callback
        await onAdd(payload);
        successCount++;
      } catch (err: any) {
        console.error(`Row ${i + 1} import failed:`, err);
        failedCount++;
        localErrors.push({
          row: i + 1,
          data: csvRow.slice(0, 3).join(' | ') + (csvRow.length > 3 ? '...' : ''),
          error: err.error || err.message || 'Mã lỗi bất định trong database.'
        });
      }

      setProgress({
        current: i + 1,
        total: csvRows.length,
        success: successCount,
        failed: failedCount
      });
    }

    setErrorLog(localErrors);
    setIsProcessing(false);
    setImportCompleted(true);
    onSuccess(); // refresh parent state
  };

  const handleReset = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings({});
    setImportCompleted(false);
    setErrorLog([]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-105 dark:bg-blue-900/35 text-blue-600 rounded-xl">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-450 uppercase tracking-wider">Hệ Thống Phụng Sự Mass-Data</h4>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">
                Nhập liệu hàng loạt {type === 'products' ? 'Sản Phẩm' : 'Khách Hàng'} bằng CSV
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="h-4 w-4 text-slate-450" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left">
          
          {/* STEP 1: Upload or drag drop file */}
          {!file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">HƯỚNG DẪN ĐỊNH DẠNG TỆP CSV:</span>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Tải CSV Cột Mẫu
                </button>
              </div>

              {/* Drag drop slot */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-205 hover:border-blue-400 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-full text-blue-600 animate-bounce">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Kéo thả tệp CSV của bạn vào đây
                  </p>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Hoặc click để duyệt tìm tệp tin từ thiết bị cục bộ (Yêu cầu file .csv mã hoá UTF-8)
                  </p>
                </div>
              </div>

              {/* Friendly hints */}
              <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/40 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <strong>⚠️ Lưu ý về các trường thông tin:</strong>
                <p>• Dữ liệu kiểu số (ví dụ Giá Nhập, Giá Xuất, Tồn Kho) sẽ tự động bóc tách các ký tự tiền tệ đặc biệt hoặc khoảng trống để quy thành số chuẩn.</p>
                <p>• Tên sản phẩm/Họ tên khách là các trường bắt buộc cần có. Bạn sẽ lựa chọn khớp nối để hệ thống tự động bóc tách cho an toàn.</p>
              </div>
            </div>
          )}

          {/* STEP 2: File is loaded - show configuration & mappings */}
          {file && !importCompleted && !isProcessing && (
            <div className="space-y-6">
              
              {/* File detail status */}
              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/35 text-emerald-600 rounded-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate max-w-sm" title={file.name}>
                      {file.name}
                    </h5>
                    <p className="text-[10px] text-slate-450">
                      Dung lượng: {(file.size / 1024).toFixed(1)} KB | Tổng số dòng bóc được: <strong>{csvRows.length} hàng</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-transform active:scale-95 cursor-pointer"
                >
                  Thay đổi File
                </button>
              </div>

              {/* Default setup for products relations */}
              {type === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/35">
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider">Danh mục mặc định</label>
                    <select
                      value={defaultCategory}
                      onChange={(e) => setDefaultCategory(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs rounded-lg text-slate-800 dark:text-white"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <span className="text-[9px] text-slate-450 block italic">Nếu trong CSV không chỉ định hoặc muốn dồn toàn bộ vào 1 danh mục</span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider">Nhà cung cấp dồn mặc định</label>
                    <select
                      value={defaultSupplier}
                      onChange={(e) => setDefaultSupplier(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs rounded-lg text-slate-800 dark:text-white"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <span className="text-[9px] text-slate-450 block italic">Nhà cung cấp sở hữu hoặc bảo lãnh nguồn gốc ban đầu sản phẩm</span>
                  </div>
                </div>
              )}

              {/* Columns Matching grid panel */}
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-black text-xs uppercase tracking-tight">
                  <Columns className="h-4 w-4 text-blue-500" />
                  <span>Bản đồ hóa liên kết các cột dữ liệu</span>
                </div>
                <div className="text-[10px] text-slate-450 leading-relaxed italic">
                  Hệ thống thực hiện so khớp thông minh tự động. Vui lòng kiểm tra kỹ hoặc điều chỉnh các cột đích với cột tương ứng trong tệp CSV của bạn.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/40 dark:bg-slate-950/20">
                  {targetFields.map(field => {
                    const isMatched = !!mappings[field.key];
                    return (
                      <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-red-500 font-extrabold" title="Trường này bắt buộc">*</span>}
                          </span>
                          <span className="text-[9px] text-slate-450 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded uppercase font-mono">
                            {field.key} • {field.type === 'number' ? 'Kiểu Số' : 'Chuỗi Chữ'}
                          </span>
                        </div>

                        <div className="sm:max-w-[200px] w-full">
                          <select
                            value={mappings[field.key] || ''}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className={`w-full bg-white dark:bg-slate-900 border p-2 text-xs rounded-lg font-medium focus:outline-none focus:border-blue-500 ${
                              field.required && !mappings[field.key] 
                                ? 'border-red-400 bg-red-50/10' 
                                : isMatched 
                                ? 'border-emerald-400 text-emerald-700 dark:text-emerald-450 font-bold bg-emerald-500/5' 
                                : 'border-slate-205 dark:border-slate-800 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            <option value="">-- Bỏ qua hoặc Mặc định --</option>
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight block">Xem trước 3 ghi nhận khớp mẫu</span>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-black tracking-wider">
                        <th className="p-2.5 w-12 text-center">STT</th>
                        {targetFields.map(f => (
                          <th key={f.key} className="p-2.5">
                            {f.label} ({mappings[f.key] ? 'Đã khớp' : 'Để trống'})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                      {csvRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="p-2.5 text-center font-mono text-slate-450">{idx + 1}</td>
                          {targetFields.map(field => {
                            const mappedHeader = mappings[field.key];
                            const columnIndex = csvHeaders.indexOf(mappedHeader);
                            const val = columnIndex !== -1 ? row[columnIndex] : null;
                            return (
                              <td key={field.key} className="p-2.5 font-mono text-xs">
                                {val !== null && val !== undefined ? (
                                  <span className="font-semibold">{val}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Mặc định ({String(field.defaultValue)})</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: Running Import state */}
          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              
              <div className="space-y-2 text-center max-w-sm w-full">
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-2.5 py-1 rounded-full font-black uppercase">
                  ĐANG GỬI MASS DATA LÊN SERVER...
                </span>
                <p className="text-xs text-slate-650 dark:text-slate-350">
                  Vui lòng không đóng cửa số này khi hệ thống xử lý bóc dữ liệu.
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-150"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-450 font-mono mt-1 flex justify-between">
                  <span>Tiến độ: {progress.current} / {progress.total} dòng</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
              </div>

              {/* Quick statistics */}
              <div className="grid grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-855 text-center w-full max-w-md">
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-black">Xử lý thành công</p>
                  <p className="text-base font-black text-emerald-600 font-mono">{progress.success}</p>
                </div>
                <div className="border-x border-slate-205 dark:border-slate-800">
                  <p className="text-[10px] text-slate-450 uppercase font-black">Ghi nhận lỗi</p>
                  <p className="text-base font-black text-red-600 font-mono">{progress.failed}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-black">Hàng còn lại</p>
                  <p className="text-base font-black text-blue-600 font-mono">{progress.total - progress.current}</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Import finished report details */}
          {importCompleted && (
            <div className="space-y-6">
              
              {/* Success Banner */}
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-800 text-center rounded-2xl space-y-3 flex flex-col items-center">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600 rounded-full">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase">NHẬP LIỆU MASS DATA HOÀN TẤT</h4>
                  <p className="text-xs text-slate-650 dark:text-slate-350">
                    Bản ghi từ tệp CSV của bạn đã được chuyển tải thành công vào cơ sở dữ liệu server Render của bạn.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center mt-2 max-w-sm w-full font-mono">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-450 block font-sans">THÀNH CÔNG ĐỒNG BỘ</span>
                    <span className="text-lg font-black text-emerald-600 block">{progress.success}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-450 block font-sans">LỖI THẤT BẠI</span>
                    <span className="text-lg font-black text-red-600 block">{progress.failed}</span>
                  </div>
                </div>
              </div>

              {/* Erros details list if failures happened */}
              {errorLog.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-red-600 uppercase">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Nhật ký ghi nhận xử lý lỗi ({errorLog.length})</span>
                  </div>
                  <div className="border border-red-100 dark:border-red-900/40 rounded-xl overflow-hidden text-xs max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30 text-[10px] font-bold text-red-700 dark:text-red-400">
                          <th className="p-2.5 w-16 text-center">Dòng</th>
                          <th className="p-2.5 w-1/3">Dữ Liệu Khớp Thô</th>
                          <th className="p-2.5">Chi Tiết Thông Báo Lỗi từ DB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100/50 dark:divide-red-900/20 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {errorLog.map((err, idx) => (
                          <tr key={idx} className="hover:bg-red-500/5">
                            <td className="p-2 text-center text-red-500 font-bold">{err.row}</td>
                            <td className="p-2 select-all text-slate-500 break-all">{err.data}</td>
                            <td className="p-2 text-red-600 dark:text-red-400 font-bold break-words">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-between items-center">
          <div>
            {file && !importCompleted && !isProcessing && (
              <span className="text-[10px] text-slate-450 font-bold italic">
                Sẽ nạp hàng loạt {csvRows.length} dòng
              </span>
            )}
            {importCompleted && (
              <span className="text-[10px] text-emerald-600 font-bold">
                ✓ Thiết lập cơ sở dữ liệu đã làm mới snappily
              </span>
            )}
          </div>
          
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer hover:bg-slate-50"
            >
              đóng cửa sổ
            </button>
            
            {file && !importCompleted && !isProcessing && (
              <button
                onClick={handleStartImport}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition duration-200 cursor-pointer active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Tiến Hành Nhập Liệu
              </button>
            )}

            {importCompleted && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition duration-200 cursor-pointer active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Nhập thêm File mới
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
