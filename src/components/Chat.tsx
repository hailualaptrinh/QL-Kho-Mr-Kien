import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Link, FileText, Check, X, 
  AlertCircle, Loader2, Info, ArrowUpRight, ArrowDownLeft, 
  Shield, Clock, Search, User, ExternalLink, Calendar, HelpCircle 
} from 'lucide-react';
import { ImportOrder, ExportOrder, Product, User as AppUser, ChatMessage } from '../types';

interface ChatProps {
  products: Product[];
  imports: ImportOrder[];
  exports: ExportOrder[];
  user: AppUser | null;
  onRefresh: () => void;
}

export default function Chat({ products, imports, exports, user, onRefresh }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Order Linking Modal / Popover
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [selectedOrderType, setSelectedOrderType] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; code: string } | null>(null);

  // Detail Modal for previewing order items inside chat
  const [previewingOrder, setPreviewingOrder] = useState<{
    orderId: string;
    code: string;
    type: 'IMPORT' | 'EXPORT';
    notes?: string;
    items: { productName: string; quantity: number; price: number; unit: string }[];
    totalAmount: number;
    status: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Polling chat messages from server every 3 seconds
  useEffect(() => {
    let active = true;
    const fetchMessages = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch('/api/chat', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('mrkien_erp_token')}`
          }
        });
        if (!response.ok) throw new Error('Không thể tải tin nhắn.');
        const data = await response.json();
        if (active) {
          setMessages(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
        }
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedOrder) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mrkien_erp_token')}`
        },
        body: JSON.stringify({
          content: inputText.trim() || `[Liên kết đơn hàng ${selectedOrder?.code}]`,
          linkedOrderId: selectedOrder?.id || undefined,
          linkedOrderType: selectedOrder ? selectedOrderType : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gửi tin nhắn thất bại.');
      }

      const newMsg = await response.json();
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setSelectedOrder(null);
      setIsLinkModalOpen(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Immediate order approval action from within chat bubble
  const handleApproveOrder = async (orderId: string, orderType: 'IMPORT' | 'EXPORT', action: 'APPROVE' | 'CANCEL') => {
    const isConfirm = window.confirm(
      `Bạn có chắc chắn muốn ${action === 'APPROVE' ? 'PHÊ DUYỆT' : 'HỦY BỎ'} đơn hàng này trực tiếp trên khung chat?`
    );
    if (!isConfirm) return;

    try {
      const response = await fetch('/api/chat/approve-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mrkien_erp_token')}`
        },
        body: JSON.stringify({ orderId, orderType, action })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Quyết định xét duyệt đơn hàng thất bại.');
      }

      // Update client state instantly for messages
      const resData = await response.json();
      setMessages(prev => 
        prev.map(msg => {
          if (msg.linkedOrder && msg.linkedOrder.orderId === orderId) {
            return {
              ...msg,
              linkedOrder: {
                ...msg.linkedOrder,
                status: resData.status
              }
            };
          }
          return msg;
        })
      );

      // Trigger global inventory updates
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Open Pop-up showing items for specific linked order
  const handleOpenDetailPreview = (orderId: string, type: 'IMPORT' | 'EXPORT') => {
    if (type === 'EXPORT') {
      const order = exports.find(o => o.id === orderId);
      if (order) {
        const orderItems = order.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return {
            productName: prod ? prod.name : 'Sản phẩm không rõ',
            quantity: item.quantity,
            price: item.price,
            unit: prod ? prod.unit : 'cái'
          };
        });
        setPreviewingOrder({
          orderId,
          code: order.code,
          type: 'EXPORT',
          notes: order.notes,
          items: orderItems,
          totalAmount: order.totalAmount,
          status: order.status
        });
      }
    } else {
      const order = imports.find(o => o.id === orderId);
      if (order) {
        const orderItems = order.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return {
            productName: prod ? prod.name : 'Sản phẩm không rõ',
            quantity: item.quantity,
            price: item.price,
            unit: prod ? prod.unit : 'cái'
          };
        });
        setPreviewingOrder({
          orderId,
          code: order.code,
          type: 'IMPORT',
          notes: order.notes,
          items: orderItems,
          totalAmount: order.totalAmount,
          status: order.status
        });
      }
    }
  };

  // Filter linked order suggestions
  const getFilteredOrdersForLinking = () => {
    if (selectedOrderType === 'EXPORT') {
      return exports
        .filter(o => o.code.toLowerCase().includes(searchOrderQuery.toLowerCase()))
        .slice(0, 8);
    } else {
      return imports
        .filter(o => o.code.toLowerCase().includes(searchOrderQuery.toLowerCase()))
        .slice(0, 8);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] font-sans text-slate-800 dark:text-slate-200">
      
      {/* Upper header section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 p-4 rounded-t-2xl shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950/45 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase text-slate-850 dark:text-white flex items-center gap-1.5 tracking-tight">Kênh Liên Lạc & Duyệt Đơn Nội Bộ</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Giao tiếp trực tiếp giữa Thợ kho, Kế toán và Phê duyệt nhanh đơn hàng xuất/nhập.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active stats */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </div>
        </div>
      </div>

      {/* Main chat view space */}
      <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-950/20 border-x border-slate-101 dark:border-slate-800 p-4 space-y-4 overflow-y-auto relative">
        {loading ? (
          <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <span className="text-xs text-slate-400 font-medium">Báo động kênh chat nội bộ...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-center text-xs text-red-650">
            ❌ Gặp lỗi kết nối: {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs italic space-y-2">
            <HelpCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-bold">Hộp hội thoại đang yên tĩnh</p>
            <p className="text-[10px]">Chưa có tin nhắn thảo luận nào trong phân khu này.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const msgDate = new Date(msg.timestamp);

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* User Avatar */}
                <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-301 dark:border-slate-700 shrink-0 select-none">
                  {msg.senderAvatar ? (
                    <img 
                      src={msg.senderAvatar} 
                      alt={msg.senderName} 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                      {msg.senderName.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Message bubble core */}
                <div className="space-y-1">
                  {/* Sender identity banner */}
                  <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                    <span className="font-black text-slate-800 dark:text-slate-200">{msg.senderName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide ${
                      msg.senderRole === 'SUPER_ADMIN' 
                        ? 'bg-rose-50 dark:bg-rose-955/40 text-rose-650 border border-rose-150 dark:border-rose-900/40' 
                        : msg.senderRole === 'MANAGER'
                          ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-650 border border-amber-150 dark:border-amber-900/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {msg.senderRole === 'SUPER_ADMIN' ? 'ADMIN' : msg.senderRole === 'MANAGER' ? 'QUẢN LÝ' : 'THỦ KHO'}
                    </span>
                    <Clock className="h-2.5 w-2.5 text-slate-400" />
                    <span className="text-slate-400 font-mono">
                      {msgDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                    isMe 
                      ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 border-slate-101 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>

                  {/* LINKED ORDER DISPLAY PANEL CARD */}
                  {msg.linkedOrder && (
                    <div className={`p-4 rounded-2xl border flex flex-col gap-3 mt-1.5 ${
                      isMe 
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                    }`}>
                      
                      {/* Order info details */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {msg.linkedOrder.orderType === 'EXPORT' ? (
                              <ArrowUpRight className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                            <span className="font-black text-xs text-slate-850 dark:text-white font-mono">
                              {msg.linkedOrder.orderCode}
                            </span>
                            <span className={`text-[8px] font-black tracking-wider px-1 inline-block rounded uppercase ${
                              msg.linkedOrder.orderType === 'EXPORT' ? 'bg-blue-105 text-blue-700' : 'bg-emerald-105 text-emerald-700'
                            }`}>
                              {msg.linkedOrder.orderType === 'EXPORT' ? 'XUẤT KHO' : 'NHẬP KHO'}
                            </span>
                          </div>
                          
                          {/* Items and values */}
                          <div className="text-[10px] text-slate-400 font-medium">
                            {msg.linkedOrder.itemsCount} mặt hàng • Tổng tiền:{' '}
                            <span className="font-extrabold text-slate-600 dark:text-slate-350">
                              {msg.linkedOrder.totalAmount.toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                        </div>

                        {/* Status Label on Chat Card */}
                        <div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            msg.linkedOrder.status === 'SHIPPED' || msg.linkedOrder.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-450 border-emerald-100/50 dark:border-emerald-900/35'
                              : msg.linkedOrder.status === 'CANCELLED'
                                ? 'bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-450 border-red-100/50 dark:border-red-900/35'
                                : 'bg-amber-50 dark:bg-amber-950/25 text-amber-600 dark:text-amber-450 border-amber-100/50 dark:border-amber-900/35 animate-pulse'
                          }`}>
                            {msg.linkedOrder.status === 'SHIPPED' ? 'Đầu xuất kho' 
                              : msg.linkedOrder.status === 'COMPLETED' ? 'Đã Nhập kho' 
                              : msg.linkedOrder.status === 'CANCELLED' ? 'Đã Huỷ bỏ' 
                              : 'Chờ xét duyệt'}
                          </span>
                        </div>
                      </div>

                      {msg.linkedOrder.notes && (
                        <p className="text-[10px] bg-white dark:bg-slate-900 p-2 rounded-xl text-slate-450 italic border border-slate-100 dark:border-slate-800/80 leading-snug">
                          📝 {msg.linkedOrder.notes}
                        </p>
                      )}

                      {/* Interactive Buttons block */}
                      <div className="flex gap-2 font-bold justify-end items-center">
                        {/* Quick View Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetailPreview(msg.linkedOrder!.orderId, msg.linkedOrder!.orderType)}
                          className="px-2.5 py-1 text-[10px] transition rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          Xem Đơn ↗
                        </button>

                        {/* Admin Approvals - Only display action buttons if status is PENDING/DRAFT and user has structural supervisor power */}
                        {msg.linkedOrder.status === 'PENDING' && (
                          <>
                            {user?.permissions?.approve_exports || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' ? (
                              <div className="flex gap-1.5 scale-95 origin-right">
                                <button
                                  type="button"
                                  onClick={() => handleApproveOrder(msg.linkedOrder!.orderId, msg.linkedOrder!.orderType, 'APPROVE')}
                                  className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold flex items-center gap-1 cursor-pointer transition shadow"
                                >
                                  <Check className="h-3 w-3" />
                                  DUYỆT XUẤT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveOrder(msg.linkedOrder!.orderId, msg.linkedOrder!.orderType, 'CANCEL')}
                                  className="px-2.5 py-1 text-[10px] bg-red-650 hover:bg-red-700 text-white rounded font-extrabold flex items-center gap-1 cursor-pointer transition shadow"
                                >
                                  <X className="h-3 w-3" />
                                  HỦY ĐƠN
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 block italic leading-none flex items-center gap-1">
                                <Info className="h-2.5 w-2.5 inline text-amber-500" />
                                Quản lý mới được quyền Duyệt
                              </span>
                            )}
                          </>
                        )}
                        
                      </div>

                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Embedded selected link order flag bar under chat text area */}
      {selectedOrder && (
        <div className="bg-amber-50 dark:bg-amber-955/20 border-x border-t border-slate-101 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-bold leading-none shrink-0 text-slate-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-sm">📌</span>
            <span>
              Sẽ ghim liên kết: <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono font-extrabold text-blue-600 ml-1">{selectedOrder.code}</code> ({selectedOrderType})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            ✕ Gỡ bỏ ghim
          </button>
        </div>
      )}

      {/* Input controls form container */}
      <form 
        onSubmit={handleSendMessage} 
        className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 p-4 rounded-b-2xl shadow-md shrink-0 flex items-center gap-2"
      >
        {/* Toggle order linking popup */}
        <button
          type="button"
          onClick={() => {
            setIsLinkModalOpen(!isLinkModalOpen);
            setSearchOrderQuery('');
          }}
          className={`h-11 w-11 rounded-xl flex items-center justify-center transition border cursor-pointer shrink-0 ${
            isLinkModalOpen 
              ? 'bg-blue-100 dark:bg-blue-950 border-blue-400 text-blue-600' 
              : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-450 hover:text-blue-500 hover:border-blue-300'
          }`}
          title="Chọn đơn hàng ghim vào tin nhắn"
        >
          <Link className="h-4.5 w-4.5" />
        </button>

        {/* Text Area Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={selectedOrder ? "Nhập chú thích của bạn về đơn hàng này..." : "Nhập lời nhắc nhở hoặc thảo luận vật tư kho..."}
          className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-100"
          disabled={sending}
        />

        {/* Action submit button */}
        <button
          type="submit"
          disabled={sending || (!inputText.trim() && !selectedOrder)}
          className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Gửi đi</span>
            </>
          )}
        </button>
      </form>

      {/* POPUP PANEL: LINK ORDER SELECTOR (Renders inside absolute positioning dynamically) */}
      {isLinkModalOpen && (
        <div className="relative shrink-0">
          <div className="absolute bottom-16 left-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-[320px] md:w-[380px] p-4 shadow-xl z-30 space-y-3 font-sans animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-black uppercase text-slate-850 dark:text-white">Ghim liên kết đơn hàng</span>
              <button 
                type="button" 
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Type tabs (Imports vs Exports) */}
            <div className="grid grid-cols-2 gap-1 px-1 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg text-[10px] font-black">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderType('EXPORT');
                  setSelectedOrder(null);
                }}
                className={`py-1 rounded-md transition text-center cursor-pointer ${
                  selectedOrderType === 'EXPORT' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-455 dark:text-slate-400 hover:text-slate-500'
                }`}
              >
                Yêu Cầu Xuất Kho (OUT)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderType('IMPORT');
                  setSelectedOrder(null);
                }}
                className={`py-1 rounded-md transition text-center cursor-pointer ${
                  selectedOrderType === 'IMPORT' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-455 dark:text-slate-400 hover:text-slate-500'
                }`}
              >
                Phiếu Nhập Kho (INW)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập mã đơn hàng ví dụ: 2026..."
                value={searchOrderQuery}
                onChange={(e) => setSearchOrderQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-850 dark:text-slate-100"
              />
            </div>

            {/* Selection candidates */}
            <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 pr-1">
              {getFilteredOrdersForLinking().length === 0 ? (
                <div className="py-8 text-center text-slate-450 italic text-[11px]">
                  Không tìm thấy đơn hàng tương thích nào.
                </div>
              ) : (
                getFilteredOrdersForLinking().map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrder({ id: order.id, code: order.code });
                      setIsLinkModalOpen(false);
                    }}
                    className="w-full py-2 px-1 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium rounded-lg flex items-center justify-between gap-1.5 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-850 dark:text-white font-mono">{order.code}</p>
                      <p className="text-[9px] text-slate-400 truncate opacity-80">
                        {order.notes || 'Không có ghi chú thêm'}
                      </p>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                      order.status === 'PENDING' ? 'bg-amber-105 text-amber-700' : 'bg-emerald-105 text-emerald-700'
                    }`}>
                      {order.status === 'PENDING' ? 'Chờ duyệt' : 'Xong'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP DETAIL MODAL: VIEW FULL ORDER DETAILS AND ITEMS (PREVENTS LEAVING CHAT TO CHECK ITEMS) */}
      {previewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative p-6 space-y-4 font-sans">
            <button 
              onClick={() => setPreviewingOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              type="button"
            >✕</button>

            {/* Header info */}
            <div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-blue-600" />
                <h3 className="font-black text-slate-850 dark:text-white text-base font-mono">Chi Tiết Đơn Hàng: {previewingOrder.code}</h3>
              </div>
              <p className="text-[10px] text-slate-400">Xem danh sác mặt hàng đi kèm để phục vụ thẩm định phê duyệt.</p>
            </div>

            {/* Notes representation */}
            {previewingOrder.notes && (
              <div className="p-3 bg-blue-50/50 dark:bg-slate-950 border border-blue-100 dark:border-blue-900 text-xs rounded-xl space-y-0.5 leading-relaxed">
                <span className="font-bold text-[10px] text-slate-405 uppercase tracking-wide">Chỉ dẫn đặc trưng:</span>
                <p className="text-slate-700 dark:text-slate-300 italic">"{previewingOrder.notes}"</p>
              </div>
            )}

            {/* Table or flow of items */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Danh sách vật tư bốc dỡ:</span>
              <div className="max-h-[220px] overflow-y-auto border border-slate-101 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80">
                {previewingOrder.items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white truncate">{it.productName}</p>
                      <p className="text-[9px] text-slate-400 font-mono">Khấu hao: {it.price.toLocaleString('vi-VN')} VND / {it.unit}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-850 dark:text-white font-mono">{it.quantity} {it.unit}</p>
                      <p className="text-[9px] font-bold text-slate-400">{(it.quantity * it.price).toLocaleString('vi-VN')} VND</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total representation */}
            <div className="pt-3 border-t border-slate-101 dark:border-slate-800/80 flex items-center justify-between font-sans">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Trị giá kết toán:</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  {previewingOrder.totalAmount.toLocaleString('vi-VN')} VND
                </span>
              </div>

              {/* Status banner */}
              <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border ${
                previewingOrder.status === 'SHIPPED' || previewingOrder.status === 'COMPLETED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-450 border-emerald-100/50 dark:border-emerald-900/35'
                  : previewingOrder.status === 'CANCELLED'
                    ? 'bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-450 border-red-100/50 dark:border-red-900/35'
                    : 'bg-amber-50 dark:bg-amber-955/25 text-amber-600 border-amber-200 animate-pulse'
              }`}>
                Trạng thái: {previewingOrder.status === 'SHIPPED' ? 'Đã Xuất Kho' 
                  : previewingOrder.status === 'COMPLETED' ? 'Đã Nhập Kho' 
                  : previewingOrder.status === 'CANCELLED' ? 'Đã Huỷ' 
                  : 'Đang Chờ Duyệt'}
              </span>
            </div>

            {/* Double buttons inside modal */}
            {previewingOrder.status === 'PENDING' && (user?.permissions?.approve_exports || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApproveOrder(previewingOrder.orderId, previewingOrder.type, 'APPROVE');
                    setPreviewingOrder(null);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow active:scale-95 transition"
                >
                  <Check className="h-4 w-4" />
                  PHÊ DUYỆT ĐƠN HÀNG THÀNH CÔNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApproveOrder(previewingOrder.orderId, previewingOrder.type, 'CANCEL');
                    setPreviewingOrder(null);
                  }}
                  className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow active:scale-95 transition"
                >
                  <X className="h-4 w-4" />
                  HỦY BỎ ĐƠN HÀNG XUẤT
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
