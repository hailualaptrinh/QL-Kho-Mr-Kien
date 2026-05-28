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
  userRole?: 'ADMIN' | 'CLIENT';
  username?: string;
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
      req.userRole = 'ADMIN'; // API Keys are granted Admin permissions
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

export function roleMiddleware(allowedRoles: ('ADMIN' | 'CLIENT')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền quản trị.' });
      return;
    }
    next();
  };
}
