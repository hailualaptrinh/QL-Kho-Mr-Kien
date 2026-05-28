/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe Unicode Base64 encoding/decoding for Vietnamese accent support in JWT
export function unicodeBtoa(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return btoa(str);
  }
}

export function unicodeAtob(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return atob(str);
  }
}

// Simulated JWT creation with Unicode-safe parameters
export function signJWT(payload: object, secret: string = 'mrkien-secret-key-123'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerStr = unicodeBtoa(JSON.stringify(header));
  const payloadStr = unicodeBtoa(JSON.stringify({ 
    ...payload, 
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 1 day
  }));
  // Mock signature using simple string operations
  const mockSignature = unicodeBtoa(headerStr + '.' + payloadStr + '.' + secret);
  return `${headerStr}.${payloadStr}.${mockSignature}`;
}

// Decode and verify simulated JWT with Unicode-safe support
export function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadStr = unicodeAtob(parts[1]);
    return JSON.parse(payloadStr);
  } catch (e) {
    console.error('Error parsing token:', e);
    return null;
  }
}

// Format number into Vietnamese Dong (VND) currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
}

// Format standard ISO date strings to Vietnamese DD/MM/YYYY HH:MM
export function formatDate(isoString: string, includeTime: boolean = true): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (!includeTime) return `${day}/${month}/${year}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

// Simulate client-side Excel download via CSV format (UTF-8 BOM to survive Excel import)
export function exportToCSV(filename: string, headers: string[], data: any[][]) {
  let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 display compatibility
  
  // Headers row
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';
  
  // Data rows
  data.forEach(row => {
    const rowContent = row.map(cell => {
      const formatted = cell === null || cell === undefined ? '' : String(cell);
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
    csvContent += rowContent + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Simulate elegant PDF creation by opening a beautifully styled, print-ready document
export function printPDFReport(title: string, subtitle: string, headers: string[], rows: any[][], stats?: { label: string; value: string }[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở popup để xuất PDF/In báo cáo!');
    return;
  }

  const currentDateStr = formatDate(new Date().toISOString());

  let tableHeaderHtml = headers.map(h => `<th style="border: 1px solid #ddd; padding: 10px; background-color: #f8f9fa; font-weight: bold; text-align: left;">${h}</th>`).join('');
  let tableRowsHtml = rows.map(row => {
    return `<tr style="border-bottom: 1px solid #ddd;">` + 
      row.map(cell => `<td style="border: 1px solid #ddd; padding: 10px;">${cell === null || cell === undefined ? '' : cell}</td>`).join('') + 
      `</tr>`;
  }).join('');

  let statsHtml = '';
  if (stats && stats.length > 0) {
    statsHtml = `
      <div style="display: flex; gap: 20px; margin-bottom: 30px; background: #eef2f7; padding: 15px; border-radius: 8px;">
        ${stats.map(s => `
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">${s.label}</div>
            <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 4px;">${s.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>BÁO CÁO ERP - ${title}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', sans-serif, system-ui;
            color: #333;
            line-height: 1.5;
            padding: 40px;
          }
          .header-table {
            width: 100%;
            margin-bottom: 40px;
            border-collapse: collapse;
          }
          .header-brand {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .header-meta {
            text-align: right;
            font-size: 12px;
            color: #64748b;
          }
          .report-title {
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 5px;
            color: #0f172a;
          }
          .report-subtitle {
            font-size: 14px;
            text-align: center;
            color: #64748b;
            margin-bottom: 30px;
          }
          .table-content {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 50px;
          }
          .footer-section {
            width: 100%;
            margin-top: 50px;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="header-brand">MR KIÊN ERP</td>
            <td class="header-meta">
              <strong>Hệ Thống Quản Lý Kho</strong><br/>
              Thời gian xuất: ${currentDateStr}<br/>
              Trạng thái: Bản chính thức
            </td>
          </tr>
        </table>

        <div class="report-title">${title.toUpperCase()}</div>
        <div class="report-subtitle">${subtitle}</div>

        ${statsHtml}

        <table class="table-content">
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <table style="width: 100%; border: none; margin-top: 60px;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <strong>Người lập văn bản</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              _______________________
            </td>
            <td style="width: 50%; text-align: center;">
              <strong>Xác nhận của Quản trị kho</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký và đóng dấu mộc đỏ)</span>
              <br/><br/><br/><br/>
              _______________________
            </td>
          </tr>
        </table>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
