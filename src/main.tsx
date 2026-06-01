import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Tắt và bỏ qua các cảnh báo kết nối WebSocket HMR lành tính do môi trường proxy của AI Studio không bật HMR
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (reason.message && (
        reason.message.toLowerCase().includes('websocket') || 
        reason.message.toLowerCase().includes('failed to connect')
      )) ||
      String(reason).toLowerCase().includes('websocket') ||
      String(reason).toLowerCase().includes('failed to connect')
    )) {
      event.preventDefault(); // Chặn lan truyền và tạo bảng thông báo lỗi
      console.warn('[Môi trường Dev] Đã chặn cảnh báo kết nối WebSocket HMR thành công.');
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message;
    if (msg && (
      msg.toLowerCase().includes('websocket') ||
      msg.toLowerCase().includes('failed to connect') ||
      msg.toLowerCase().includes('connection closed')
    )) {
      event.preventDefault(); // Ngăn hiển thị màn hình đỏ lỗi
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

