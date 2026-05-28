/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SUPPLIERS, 
  INITIAL_CUSTOMERS, INITIAL_WAREHOUSES, INITIAL_EMPLOYEES, INITIAL_NOTIFICATIONS, 
  INITIAL_IMPORTS, INITIAL_EXPORTS, INITIAL_STOCKTAKES, INITIAL_MUTATIONS 
} from '../src/mockData';
import { 
  User, Category, Product, Supplier, Customer, Warehouse, 
  ImportOrder, ExportOrder, Employee, Stocktake, AppNotification, StockMove, AuditLog, ApiKey 
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  warehouses: Warehouse[];
  employees: Employee[];
  notifications: AppNotification[];
  imports: ImportOrder[];
  exports: ExportOrder[];
  stocktakes: Stocktake[];
  mutations: StockMove[];
  logs: AuditLog[];
  apiKeys: ApiKey[];
}

let dbState: DatabaseSchema = {
  users: [],
  categories: [],
  products: [],
  suppliers: [],
  customers: [],
  warehouses: [],
  employees: [],
  notifications: [],
  imports: [],
  exports: [],
  stocktakes: [],
  mutations: [],
  logs: [],
  apiKeys: []
};

// Simple helper to hash strings using node:crypto (equivalent to bcrypt simulation)
export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', 'mrkien-salt-999').update(password).digest('hex');
}

export function initDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbState = JSON.parse(data);
      if (!dbState.apiKeys) {
        dbState.apiKeys = [];
      }
      console.log('Database loaded successfully from file:', DB_FILE);
    } catch (e) {
      console.error('Error reading db.json, re-initializing database:', e);
      seedDatabase();
    }
  } else {
    seedDatabase();
  }
}

function seedDatabase() {
  console.log('Seeding initial database...');
  dbState = {
    users: [...INITIAL_USERS],
    categories: [...INITIAL_CATEGORIES],
    products: [...INITIAL_PRODUCTS],
    suppliers: [...INITIAL_SUPPLIERS],
    customers: [...INITIAL_CUSTOMERS],
    warehouses: [...INITIAL_WAREHOUSES],
    employees: [...INITIAL_EMPLOYEES],
    notifications: [...INITIAL_NOTIFICATIONS],
    imports: [...INITIAL_IMPORTS],
    exports: [...INITIAL_EXPORTS],
    stocktakes: [...INITIAL_STOCKTAKES],
    mutations: [...INITIAL_MUTATIONS],
    apiKeys: [],
    logs: [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        userId: 'usr-1',
        actionType: 'HỆ THỐNG',
        description: 'Khởi tạo cơ sở dữ liệu Mr Kiên ERP.'
      }
    ]
  };
  saveDatabase();
}

export function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write db.json:', e);
  }
}

export function getDb(): DatabaseSchema {
  return dbState;
}

export function logActivity(userId: string, actionType: string, description: string) {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    actionType,
    description
  };
  dbState.logs.unshift(newLog);
  // Keep logs to max 100 entries to optimize file size
  if (dbState.logs.length > 100) {
    dbState.logs = dbState.logs.slice(0, 100);
  }
  
  // Push real-time notification if needed
  if (actionType.includes('CẢNH BÁO') || actionType.includes('LỖI')) {
    addNotification({
      title: actionType,
      message: description,
      type: 'warning'
    });
  }
  
  saveDatabase();
}

export function addNotification(params: { title: string; message: string; type: 'info' | 'warning' | 'success' | 'error' }) {
  const newNotif: AppNotification = {
    id: `nt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: params.title,
    message: params.message,
    timestamp: new Date().toISOString(),
    type: params.type,
    isRead: false
  };
  dbState.notifications.unshift(newNotif);
  if (dbState.notifications.length > 50) {
    dbState.notifications = dbState.notifications.slice(0, 50);
  }
  saveDatabase();
}
