/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { decodeJWT } from '../../src/utils';

// Extend Express Request type declarations
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: 'ADMIN' | 'CLIENT';
  username?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
