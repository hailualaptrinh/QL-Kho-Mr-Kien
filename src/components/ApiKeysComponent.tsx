import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Trash, Copy, Check, ExternalLink, 
  Terminal, ShieldCheck, AlertCircle, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { ApiKey } from '../types';
import { formatDate } from '../utils';

interface ApiKeysComponentProps {
  user: any;
  onRefresh: () => void;
}

export default function ApiKeysComponent({ user, onRefresh }: ApiKeysComponentProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [selectedSnippet, setSelectedSnippet] = useState<'curl' | 'node' | 'python'>('curl');

  const token = localStorage.getItem('mrkien_erp_token');

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apikeys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newKeyName })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Lỗi khi tạo API Key.');
      } else {
        setSuccessMessage(`Đã khởi tạo thành công API Key "${data.name}"!`);
        setNewKeyName('');
        // Append or reload
        setKeys([data, ...keys]);
        onRefresh(); // refresh system logs/notifications
      }
    } catch (e) {
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleKey = async (id: string) => {
    try {
      const res = await fetch(`/api/apikeys/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setKeys(keys.map(k => k.id === id ? updated : k));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle API key status:', err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn thu hồi (xoá hoàn toàn) API Key này? Các ứng dụng bên ngoài đang dùng key này sẽ ngay lập tức bị từ chối truy cập.')) {
      return;
    }

    try {
      const res = await fetch(`/api/apikeys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeyIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getActiveKeyString = () => {
    const activeKey = keys.find(k => k.status === 'ACTIVE');
    return activeKey ? activeKey.key : 'YOUR_API_KEY_HERE';
  };

  const snippets = {
    curl: `curl -X GET "https://mrkien-erp.com/api/products" \\
  -H "x-api-key: ${getActiveKeyString()}"`,
    node: `// Kết nối thông qua Node.js Fetch API
fetch("https://mrkien-erp.com/api/products", {
  method: "GET",
  headers: {
    "x-api-key": "${getActiveKeyString()}",
    "Content-Type": "application/json"
  }
})
  .then(res => res.json())
  .then(data => console.log("Danh sách sản phẩm:", data))
  .catch(err => console.error("Lỗi kết nối:", err));`,
    python: `# Kết nối sử dụng thư viện Requests trong Python
import requests

url = "https://mrkien-erp.com/api/products"
headers = {
    "x-api-key": "${getActiveKeyString()}"
}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    products = response.json()
    print(f"Đã tải {len(products)} sản phẩm từ ERP.")
else:
    print("Yêu cầu bị từ chối:", response.status_code)`
  };

  // Only permit Admins to configure API keys
  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quyền Truy Cập Bị Hạn Chế</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
          Chỉ có Quản Trị Viên (ADMIN) mới có quyền tạo mới, thu hồi hoặc thay đổi các cấu hình khóa API kết nối hệ thống. Vui lòng liên hệ với ban quản lý Mr Kiên ERP để được hỗ trợ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Banner top header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 rounded-3xl p-6.5 text-white border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-3xl -z-10 rounded-full"></div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight">Cổng Kết Nối API & Trợ lý AI</h1>
        <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Tích hợp tự động hóa, liên kết kho bãi với hệ thống POS bán lẻ, Excel đồng bộ ngoài, hoặc phần mềm vận chuyển thông qua cổng bảo mật API Key RESTful.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* API Key management section */}
        <div className="lg:col-span-12 space-y-8">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              Quản lý Khóa API Hệ Thống
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Khởi tạo các mã truy cập để cấp riêng cho bên thứ ba hoặc các tập lệnh tự động hóa nội bộ.
            </p>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 text-red-500 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Creation Form */}
            <form onSubmit={handleCreateKey} className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  maxLength={50}
                  required
                  placeholder="Nhập tên gợi nhớ (ví dụ: Đồng bộ Excel, POS App...)" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 px-4 text-xs rounded-2xl border border-slate-205 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || !newKeyName.trim()}
                className="p-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo Khóa API</span>
              </button>
            </form>

            {/* Current Keys List */}
            <div className="mt-6">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                  <span>Đang tải danh sách API Keys...</span>
                </div>
              ) : keys.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  Chưa có API key nào được thiết lập. Hãy điền mô tả phía trên để tạo khóa kết nối đầu tiên.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-b dark:border-slate-850">
                        <th className="p-4 text-slate-800 dark:text-slate-300">Tên Gợi Nhớ</th>
                        <th className="p-4 text-slate-800 dark:text-slate-300">Khóa (API Key Token)</th>
                        <th className="p-4 text-slate-800 dark:text-slate-300">Ngày Tạo</th>
                        <th className="p-4 text-slate-800 dark:text-slate-300 text-center">Trạng Thái</th>
                        <th className="p-4 text-slate-800 dark:text-slate-300 text-right">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-855">
                      {keys.map(k => (
                        <tr key={k.id} className="hover:bg-slate-50/20">
                          <td className="p-4 font-bold text-slate-900 dark:text-white select-text">
                            {k.name}
                          </td>
                          <td className="p-4 font-mono select-all">
                            <div className="flex items-center gap-2">
                              {visibleKeyIds[k.id] ? (
                                <span className="text-slate-700 dark:text-slate-300 font-bold tracking-tight bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                  {k.key}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded select-none">
                                  {k.key.substring(0, 15)}••••••••••••••••
                                </span>
                              )}
                              
                              <button 
                                onClick={() => toggleVisibility(k.id)} 
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                                title={visibleKeyIds[k.id] ? "Ẩn bớt kí tự" : "Xem toàn bộ mã Key"}
                              >
                                {visibleKeyIds[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>

                              <button 
                                onClick={() => handleCopy(k.key, k.id)}
                                className={`p-1 pl-1.5 pr-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${copiedId === k.id ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'}`}
                                title="Sao chép vào khay nhớ tạm"
                              >
                                {copiedId === k.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedId === k.id ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-slate-500">
                            {formatDate(k.createdAt)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleKey(k.id)}
                              className={`p-1 px-3 rounded-full text-[10px] font-bold select-none cursor-pointer border ${k.status === 'ACTIVE' 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-500/10 border-slate-500/30 text-slate-500'}`}
                            >
                              ● {k.status === 'ACTIVE' ? 'ĐANG HOẠT ĐỘNG' : 'TẠM KHÓA'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => handleDeleteKey(k.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Thu hồi khóa vĩnh viễn"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Code Playgrounds */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="h-5 w-5 text-blue-500" />
              Cách Thức Kết Nối & Tập Lệnh Mẫu
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Sử dụng các đoạn mã lệnh dưới đây để gửi truy vấn trực tiếp đến dữ liệu kho hàng hóa Mr Kiên ERP.
            </p>

            {/* Snippet selectors */}
            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => setSelectedSnippet('curl')} 
                className={`p-1.5 px-3.5 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border transition-all ${selectedSnippet === 'curl' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-150 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350'}`}
              >
                📊 cURL Shell
              </button>
              <button 
                onClick={() => setSelectedSnippet('node')} 
                className={`p-1.5 px-3.5 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border transition-all ${selectedSnippet === 'node' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-150 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350'}`}
              >
                📦 NodeJS Fetch
              </button>
              <button 
                onClick={() => setSelectedSnippet('python')} 
                className={`p-1.5 px-3.5 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border transition-all ${selectedSnippet === 'python' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-150 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350'}`}
              >
                🐍 Python Requests
              </button>
            </div>

            {/* Code Box container */}
            <div className="relative mt-4">
              <pre className="bg-slate-950 text-slate-100 p-5 rounded-2xl text-xs font-mono select-all text-left overflow-x-auto whitespace-pre leading-relaxed border border-slate-850">
                {snippets[selectedSnippet]}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(snippets[selectedSnippet]);
                  alert('Đã sao chép đoạn mã code mẫu!');
                }}
                className="absolute top-3.5 right-3.5 p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code</span>
              </button>
            </div>

            <div className="mt-5 p-4 py-3 bg-blue-50/10 border border-blue-500/10 text-slate-500 dark:text-slate-400 text-xs rounded-2xl flex items-start gap-3">
              <span className="text-base text-blue-500 pt-0.5 font-sans">💡</span>
              <p className="leading-relaxed font-sans">
                <strong>Hỗ trợ kết nối API endpoints đa dạng:</strong> Bên cạnh <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-red-500 shadow-sm font-semibold">/api/products</code> (Quản lý mặt hàng), bạn có thể truy xuất dữ liệu từ <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-blue-500">/api/warehouses</code> (Phân khu kho bãi), <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-emerald-500">/api/imports</code> (Nhập kho), <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-purple-500">/api/exports</code> (Xuất kho) hay <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/logs</code> (Nhật ký hoạt động hệ thống).
              </p>
            </div>
          </div>

          {/* Gemini API Key Instructions as required by Server API design */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              Thiết lập Trợ Lý AI (Gemini Developer API Key)
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Phần mềm của bạn hỗ trợ trực tiếp module xử lý thông minh Google Gemini AI server-side để dự báo sản lượng tồn kho và phân tích thị trường.
            </p>

            <div className="mt-5 p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex flex-col md:flex-row gap-5">
              <div className="shrink-0 flex items-center justify-center h-12 w-12 bg-amber-500/10 rounded-full text-2xl">
                🤖
              </div>
              <div className="text-xs space-y-2 leading-relaxed">
                <span className="text-slate-900 dark:text-white font-bold block text-sm">Làm cách nào để nhập Gemini API Key?</span>
                <p className="text-slate-500 dark:text-slate-400">
                  Google AI Studio không cung cấp ô nhập thô API Key trực quan trên trang ứng dụng để bảo vệ tính an toàn và bảo mật mật mã của bạn. Vui lòng làm theo hướng dẫn sau:
                </p>
                <ol className="list-decimal pl-5 text-slate-500 dark:text-slate-400 space-y-1.5 font-medium">
                  <li>Truy cập vào dịch vụ hoặc thiết lập cấu hình của cổng phát triển <strong>Google AI Studio Secrets</strong> (hoặc thông qua Settings panel trong trình biên soạn).</li>
                  <li>Tạo một khóa bí mật (Secret Name) có tên là: <code className="font-bold font-mono text-amber-600 bg-amber-500/10 px-1 rounded select-all">GEMINI_API_KEY</code></li>
                  <li>Dán mã khóa API do Google AI Studio cung cấp vào mục giá trị (Value) tương ứng, sau đó chọn Lưu.</li>
                  <li>Khởi động lại máy chủ ảo hoặc tải lại ứng dụng để Trợ lý AI tự động nhận khối xử lý thông minh!</li>
                </ol>
                
                <div className="pt-2">
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-450 font-bold hover:underline"
                  >
                    Lấy khóa Gemini API Key miễn phí tại Google AI Studio
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
