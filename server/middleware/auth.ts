/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { decodeJWT } from '../../src/utils';
import { getDb, saveDatabase } from '../db';

// Extend Express Request type declarations
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  username?: string;
}

export function getUserPermissions(user: any): any {
  if (user.permissions && Object.keys(user.permissions).length > 0) {
    return user.permissions;
  }

  const role = user.role;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return {
      view_products: true, add_products: true, edit_products: true, delete_products: true,
      view_imports: true, add_imports: true,
      view_exports: true, add_exports: true, approve_exports: true,
      view_customers: true, add_edit_customers: true,
      view_suppliers: true, add_edit_suppliers: true,
      view_employees: true, manage_employees: true,
      manage_settings: true
    };
  }
  if (role === 'MANAGER') {
    return {
      view_products: true, add_products: true, edit_products: true, delete_products: true,
      view_imports: true, add_imports: true,
      view_exports: true, add_exports: true, approve_exports: true,
      view_customers: true, add_edit_customers: true,
      view_suppliers: true, add_edit_suppliers: true,
      view_employees: true, manage_employees: true,
      manage_settings: false
    };
  }
  if (role === 'STOCKKEEPER') {
    return {
      view_products: true, add_products: false, edit_products: false, delete_products: false,
      view_imports: true, add_imports: true,
      view_exports: true, add_exports: true, approve_exports: false,
      view_customers: false, add_edit_customers: false,
      view_suppliers: false, add_edit_suppliers: false,
      view_employees: false, manage_employees: false,
      manage_settings: false
    };
  }
  if (role === 'SALES') {
    return {
      view_products: true, add_products: false, edit_products: false, delete_products: false,
      view_imports: false, add_imports: false,
      view_exports: true, add_exports: true, approve_exports: false,
      view_customers: true, add_edit_customers: true,
      view_suppliers: false, add_edit_suppliers: false,
      view_employees: false, manage_employees: false,
      manage_settings: false
    };
  }
  
  // VIEWER
  return {
    view_products: true, add_products: false, edit_products: false, delete_products: false,
    view_imports: true, add_imports: false,
    view_exports: true, add_exports: false, approve_exports: false,
    view_customers: true, add_edit_customers: false,
    view_suppliers: true, add_edit_suppliers: false,
    view_employees: true, manage_employees: false,
    manage_settings: false
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Check if custom API key is supplied via header or query
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.query.apikey;
  if (apiKey && typeof apiKey === 'string') {
    const db = getDb();
    const foundKey = db.apiKeys?.find(k => k.key === apiKey && k.status === 'ACTIVE');
    if (foundKey) {
      // Setup mock authenticated context
      req.userId = 'api-key-caller';
      req.userRole = 'SUPER_ADMIN'; // API Keys are granted Super Admin permissions
      req.username = `api:${foundKey.name}`;

      // Update last active audit state
      foundKey.lastUsedAt = new Date().toISOString();
      saveDatabase();

      next();
      return;
    }
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Xác thực không hợp lệ. Vui lòng đăng nhập lại.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = decodeJWT(token);

  if (!payload || !payload.id) {
    res.status(401).json({ error: 'Phiên làm việc đã hết hạn hoặc chữ ký token không đúng.' });
    return;
  }

  // Set values to request object
  req.userId = payload.id;
  req.userRole = payload.role;
  req.username = payload.username;
  
  next();
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền quản trị.' });
      return;
    }

    const effectiveRoles = [...allowedRoles];
    if (allowedRoles.includes('ADMIN')) {
      effectiveRoles.push('SUPER_ADMIN', 'ADMIN', 'MANAGER');
    }

    if (effectiveRoles.includes(req.userRole)) {
      next();
      return;
    }

    res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này. Thao tác yêu cầu quyền quản trị cao cấp hoặc quyền quản lý kho.' });
  };
}

export function checkPermission(permissionName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Xác thực không hợp lệ.' });
      return;
    }
    
    // SUPER_ADMIN (or legacy ADMIN) always has all privileges
    if (req.userRole === 'SUPER_ADMIN' || req.userRole === 'ADMIN') {
      next();
      return;
    }

    const db = getDb();
    const user = db.users.find(u => u.id === req.userId);
    if (!user) {
      res.status(403).json({ error: 'Không tìm thấy thông tin tài khoản người dùng.' });
      return;
    }

    const perms = getUserPermissions(user);

    if (perms[permissionName]) {
      next();
      return;
    }

    res.status(403).json({ 
      error: `Bạn không có quyền thực hiện thao tác này (${permissionName}). Vui lòng liên hệ Quản trị viên.` 
    });
  };
}
