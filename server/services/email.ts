/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';
import { getDb, saveDatabase, logActivity, addNotification } from '../db';

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

/**
 * Dynamically resolves or creates a transporter based on DB configurations.
 * If Ethereal test mail is selected but credentials are empty, auto-provisions one.
 */
export async function getMailTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string; previewUrl?: string }> {
  const db = getDb();
  let emailSettings = db.emailSettings;

  if (!emailSettings) {
    emailSettings = {
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: 'mrkien-erp-alerts@mrkien-erp.com',
      active: false,
      recipientOverride: 'manager@mrkien-erp.com',
      sendDailyAlerts: false
    };
    db.emailSettings = emailSettings;
    saveDatabase();
  }

  let host = emailSettings.host || 'smtp.ethereal.email';
  let port = Number(emailSettings.port) || 587;
  let secure = !!emailSettings.secure;
  let user = emailSettings.user || '';
  let pass = emailSettings.pass || '';
  let from = emailSettings.from || 'mrkien-erp-alerts@mrkien-erp.com';
  let previewUrl = '';

  // Auto-provision test account for ethereal if SMTP credentials are not filled in
  if (host === 'smtp.ethereal.email' && (!user || !pass)) {
    try {
      console.log('[Email Service] Configuring auto-provisioned Ethereal SMTP test account...');
      const testAccount = await nodemailer.createTestAccount();
      emailSettings.host = testAccount.smtp.host;
      emailSettings.port = testAccount.smtp.port;
      emailSettings.secure = testAccount.smtp.secure;
      emailSettings.user = testAccount.user;
      emailSettings.pass = testAccount.pass;
      emailSettings.from = `mrkien-alerts@ethereal.email`;
      
      // Update local variables
      host = testAccount.smtp.host;
      port = testAccount.smtp.port;
      secure = testAccount.smtp.secure;
      user = testAccount.user;
      pass = testAccount.pass;
      from = `mrkien-alerts@ethereal.email`;
      
      // Save newly created ethereal credentials so we don't regenerate on every API call
      db.emailSettings = emailSettings;
      saveDatabase();
      console.log('[Email Service] Ethereal credentials generated successfully:', testAccount.user);
    } catch (err) {
      console.error('[Email Service] Failed to create Ethereal test account:', err);
      throw new Error('Không thể tự động tạo tài khoản kiểm thử Ethereal: ' + (err as Error).message);
    }
  }

  const transportConfig: MailConfig = {
    host,
    port,
    secure,
  };

  if (user && pass) {
    transportConfig.auth = {
      user,
      pass
    };
  }

  const transporter = nodemailer.createTransport(transportConfig as any);
  return { transporter, from };
}

/**
 * Sends a generic HTML email
 */
export async function sendMail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    const { transporter, from } = await getMailTransporter();
    
    const mailOptions = {
      from: `"Mr Kiên ERP Cloud Alerts" <${from}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Service] Mail sent successfully. Message ID:', info.messageId);

    // If Ethereal mail was used, get test preview URL
    let previewUrl = '';
    if (from.includes('ethereal.email')) {
      previewUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log('[Email Service] Ethereal preview URL:', previewUrl);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };
  } catch (err) {
    console.error('[Email Service] Error sending email:', err);
    throw err;
  }
}

/**
 * Automatically triggers low stock inventory diagnostic scans and compiles/dispatches alerts
 */
export async function sendLowStockAlertEmail(forceSend = false): Promise<{ 
  sent: boolean; 
  productCount: number; 
  recipients: string[]; 
  previewUrl?: string; 
  error?: string;
}> {
  const db = getDb();
  const settings = db.emailSettings;

  // Verify settings
  if (!settings) {
    return { sent: false, productCount: 0, recipients: [], error: 'Cấu hình email không tồn tại trong CSDL.' };
  }

  if (!settings.active && !forceSend) {
    console.log('[Email Service] Alarm system is disabled. Skipping scanning checks.');
    return { sent: false, productCount: 0, recipients: [] };
  }

  // Scan products under threshold level
  const lowStockProducts = db.products.filter(p => p.stock <= p.minStock);
  if (lowStockProducts.length === 0) {
    console.log('[Email Service] No low-stock products discovered. Skipping alert dispatch.');
    
    // Auto-update last scan timestamp anyway to prevent endless scans
    settings.lastAlertSentAt = new Date().toISOString();
    db.emailSettings = settings;
    saveDatabase();

    return { sent: false, productCount: 0, recipients: [] };
  }

  // Figure out recipient list
  const recipients: string[] = [];
  
  if (settings.recipientOverride && settings.recipientOverride.trim() !== '') {
    // Add override address directly
    const list = settings.recipientOverride.split(',').map(e => e.trim()).filter(e => e !== '');
    recipients.push(...list);
  } else {
    // Collect from administrators and managers
    const managers = db.users.filter(u => (u.role === 'MANAGER' || u.role === 'SUPER_ADMIN') && u.status === 'ACTIVE' && u.email);
    managers.forEach(m => {
      if (!recipients.includes(m.email)) {
        recipients.push(m.email);
      }
    });
  }

  if (recipients.length === 0) {
    console.warn('[Email Service] No manager emails or custom recipient targets specified. Unable to notify.');
    return { sent: false, productCount: lowStockProducts.length, recipients: [], error: 'Không tìm thấy địa chỉ người nhận. Vui lòng thiết lập hộp thư đích.' };
  }

  // Compile stunning CSS-inlined premium responsive HTML newsletter
  const tableRows = lowStockProducts.map((p, index) => {
    const category = db.categories.find(c => c.id === p.categoryId)?.name || 'Chưa phân loại';
    const ratio = p.stock === 0 ? 0 : Math.ceil((p.stock / p.minStock) * 100);
    let ratioColor = '#2563eb'; // Blue
    if (p.stock === 0) ratioColor = '#dc2626'; // Bright Red
    else if (p.stock <= p.minStock / 2) ratioColor = '#ea580c'; // Dark Orange

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-size: 13px; text-align: center; color: #64748b; font-weight: bold;">${index + 1}</td>
        <td style="padding: 12px 10px; text-align: left;">
          <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${p.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Mã: <code style="font-family: monospace; background: #e2e8f0; padding: 2px 4px; border-radius: 4px; font-size: 11px; color: #334155;">${p.code}</code> | Danh mục: <b>${category}</b></div>
        </td>
        <td style="padding: 12px 10px; text-align: center; font-weight: 800; font-family: monospace; font-size: 14px; color: ${p.stock === 0 ? '#dc2626' : '#ea580c'}">
          ${p.stock} ${p.unit}
        </td>
        <td style="padding: 12px 10px; text-align: center; font-weight: bold; font-family: monospace; font-size: 13px; color: #64748b;">
          ${p.minStock} ${p.unit}
        </td>
        <td style="padding: 12px 10px; text-align: center;">
          <div style="background-color: #f1f5f9; border-radius: 9999px; width: 100%; height: 8px; overflow: hidden; margin-bottom: 4px;">
            <div style="background-color: ${ratioColor}; height: 8px; border-radius: 9999px; width: ${Math.min(ratio, 100)}%;"></div>
          </div>
          <span style="font-size: 10px; font-weight: 800; color: ${ratioColor}; font-family: monospace;">Tồn ${ratio}% hạn định</span>
        </td>
      </tr>
    `;
  }).join('');

  const emailSubject = `⚠️ Cảnh Báo Tồn Kho Thấp: ${lowStockProducts.length} Mặt Hàng Cần Nhập Thêm (Mr Kiên ERP)`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo tồn kho yếu</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 10px; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        
        <!-- Premium Header Banner -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 30px; text-align: left; color: #ffffff;">
          <span style="background-color: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #f87171; padding: 4px 10px; border-radius: 8px; display: inline-block; margin-bottom: 12px; font-family: monospace;">
            ⚠️ EMERGENCY INVENTORY ALARM
          </span>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; tracking: -0.025em; line-height: 1.2;">QUẢN LÝ KHO MR KIÊN: BÁO CÁO CẬP NHẬT TỒN KHO THẤP</h1>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #bfdbfe; opacity: 0.9;">Báo cáo tự động phân loại các sản phẩm chạm hoặc thấp hơn định mức tối thiểu.</p>
        </div>

        <!-- Alert Summary Box -->
        <div style="padding: 24px 30px; background-color: #fef2f2; border-bottom: 1px solid #fee2e2; border-left: 4px solid #ef4444;">
          <div style="font-size: 13px; color: #991b1b; line-height: 1.5;">
            Trạng thái phân tích kho lúc <b>${new Date().toLocaleString('vi-VN')} (Giờ máy chủ)</b> ghi nhận hệ thống có <b>${lowStockProducts.length} loại sản phẩm</b> đã cạn kiệt hoặc dưới biên số an toàn. Đề xuất ban quản lý phê duyệt kế hoạch nhập kho/giao bốc mới để không làm gián đoạn chuỗi cung ứng ERP bán hàng.
          </div>
        </div>

        <!-- Body Table list -->
        <div style="padding: 30px;">
          <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            CHI TIẾT MẶT HÀNG BỊ CẢNH BÁO
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #475569; width: 40px; text-align: center;">STT</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #475569;">Sản phẩm / Quy chuẩn</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #475569; text-align: center; width: 90px;">Tồn Hiện tại</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #475569; text-align: center; width: 90px;">Định Mức Tối Thiểu</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #475569; text-align: center; width: 140px;">Biểu Đồ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Actions -->
          <div style="margin-top: 36px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://ai.studio/build'}" target="_blank" style="background-color: #2563eb; color: #ffffff; font-weight: bold; border-radius: 12px; font-size: 13px; text-transform: uppercase; padding: 14px 28px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
              Bàn điều phối kho • Đăng nhập ERP
            </a>
          </div>
        </div>

        <!-- Footer Info -->
        <div style="padding: 24px 30px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.6;">
          🔔 Bạn nhận được email này vì bạn là Thành viên Quản trị hoặc Quản lý cấp cao của <b>Mr Kiên Warehouse ERP</b>.<br>
          Để cấu hình hoặc dừng các email cảnh báo tự động này, quản trị viên có thể truy cập hệ thống mục <b>Báo Cáo & Cài đặt Email</b> bất cứ lúc nào.<br>
          <div style="margin-top: 12px; font-family: monospace; color: #cbd5e1; font-size: 10px;">ID Hệ thống: mrkien-warehouse-automation-v1</div>
        </div>

      </div>
    </body>
    </html>
  `;

  // Send the email to all active recipients
  let previewSendUrl = '';
  let finalError = '';

  try {
    const combinedEmailString = recipients.join(', ');
    const res = await sendMail(combinedEmailString, emailSubject, emailHtml);
    previewSendUrl = res.previewUrl || '';
    
    // Log Activity & Create application notifications
    logActivity(
      'system', 
      'EMAIL CỬA NGÕ', 
      `Hệ thống tự động gửi báo cáo tồn kho yếu thành công đến ${recipients.length} hòm thư quản lý.`
    );
    
    addNotification({
      title: 'Đã gửi báo cáo email',
      message: `Báo cáo tồn kho thấp (${lowStockProducts.length} mặt hàng) được tự động phát thành công đến các hòm thư quản lý cấp cao.`,
      type: 'success'
    });

  } catch (err) {
    console.error('[Email Service] Failed alerting administrators via SMTP:', err);
    finalError = (err as Error).message;
    
    logActivity('system', 'LỖI EMAIL', `Thất bại khi gửi email cảnh báo tự động. Chi tiết lỗi: ${finalError}`);
    addNotification({
      title: 'Email cảnh báo thất bại',
      message: `Hệ thống không thể kết nối tới máy chủ SMTP hoặc bị từ chối địa chỉ. Chi tiết: ${finalError}`,
      type: 'error'
    });
  }

  // Update timestamps
  settings.lastAlertSentAt = new Date().toISOString();
  db.emailSettings = settings;
  saveDatabase();

  return {
    sent: !finalError,
    productCount: lowStockProducts.length,
    recipients,
    previewUrl: previewSendUrl,
    error: finalError || undefined
  };
}

/**
 * Quick Test Trigger sending credentials test mail
 */
export async function sendTestEmailToRecipient(targetEmail: string): Promise<{ 
  success: boolean; 
  previewUrl?: string; 
  messageId?: string; 
  error?: string; 
}> {
  try {
    const testSubject = `🧪 Kiểm thử Kết nối Cổng SMTP Mr Kiên ERP: Thành công!`;
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Kiểm Thử SMTP</title>
      </head>
      <body style="font-family: sans-serif; background-color: #f8fafc; padding: 40px 10px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="font-size: 36px; margin-bottom: 20px;">🎉</div>
          <h2 style="color: #0f172a; margin-top: 0;">KẾT NỐI SMTP THÀNH CÔNG!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; text-align: left;">
            Xin chào! Đây là một email kiểm thử được tạo tự động bởi <b>Mr Kiên Inventory Warehouse ERP</b>. Nếu bạn nhận được thư này, điều đó chứng tỏ cấu hình SMTP trong hệ thống của bạn hoạt động vô cùng xuất sắc!
          </p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: monospace; font-size: 12px; text-align: left; color: #475569;">
            <b>Thời gian gửi:</b> ${new Date().toLocaleString('vi-VN')}<br>
            <b>Mục đích:</b> Kiểm tra độ trễ và xác thực luồng email<br>
            <b>Trình kích hoạt:</b> Nodemailer Service Engine
          </div>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 30px;">
            Vui lòng quản lý thông tin bảo vệ SMTP credentials thật cẩn thận và tránh chia sẻ mật khẩu tài khoản trực tuyến.
          </p>
        </div>
      </body>
      </html>
    `;

    const res = await sendMail(targetEmail, testSubject, testHtml);
    return {
      success: true,
      previewUrl: res.previewUrl,
      messageId: res.messageId
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message
    };
  }
}
