/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { 
  INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SUPPLIERS, 
  INITIAL_CUSTOMERS, INITIAL_WAREHOUSES, INITIAL_EMPLOYEES, INITIAL_NOTIFICATIONS, 
  INITIAL_IMPORTS, INITIAL_EXPORTS, INITIAL_STOCKTAKES, INITIAL_MUTATIONS 
} from '../src/mockData';
import { 
  User, Category, Product, Supplier, Customer, Warehouse, 
  ImportOrder, ExportOrder, Employee, Stocktake, AppNotification, StockMove, AuditLog, ApiKey, PhotoReport, EmailSettings, ChatMessage 
} from '../src/types';

// Support custom environment paths or Render's persistent disk mounts dynamically
const getDbFilePath = (): string => {
  if (process.env.DB_FILE_PATH) {
    return process.env.DB_FILE_PATH;
  }
  
  // Standard fallback for Render persistent disks mounted at /data
  if (fs.existsSync('/data')) {
    try {
      fs.accessSync('/data', fs.constants.W_OK);
      return '/data/db.json';
    } catch (e) {
      console.warn('Directory /data exists but is not writable, using local working directory instead.');
    }
  }
  
  return path.join(process.cwd(), 'db.json');
};

const DB_FILE = getDbFilePath();

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
  photoReports: PhotoReport[];
  emailSettings?: EmailSettings;
  messages?: ChatMessage[];
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
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
  apiKeys: [],
  photoReports: [],
  messages: []
};

// Simple helper to hash strings using node:crypto (equivalent to bcrypt simulation)
export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', 'mrkien-salt-999').update(password).digest('hex');
}

// MongoDB Client State Management
let mongoClient: MongoClient | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

function cleanMongoUri(): string | null {
  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!rawUri) return null;
  let uri = rawUri.trim();
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    return uri;
  }
  console.warn(`[Database] MongoDB URI "${rawUri}" is invalid or a placeholder. Bypassing cloud database and using local local db.json storage.`);
  return null;
}

async function connectToMongo(): Promise<MongoClient | null> {
  const uri = cleanMongoUri();
  if (!uri) return null;
  if (mongoClient) return mongoClient;
  
  try {
    console.log('Connecting to MongoDB Atlas cloud database...');
    const client = new MongoClient(uri, {
      connectTimeoutMS: 8000,
      socketTimeoutMS: 30000,
    });
    await client.connect();
    mongoClient = client;
    console.log('Successfully connected to MongoDB Atlas on cloud!');
    return mongoClient;
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err);
    return null;
  }
}

export async function initDatabase() {
  const uri = cleanMongoUri();
  if (uri) {
    try {
      const client = await connectToMongo();
      if (client) {
        // Extract database name from connection string or fallback to "mrkien_erp"
        const dbName = uri.split('/').pop()?.split('?')[0] || 'mrkien_erp';
        const db = client.db(dbName);
        const col = db.collection<any>('system_state');
        const doc = await col.findOne({ _id: 'main' });
        
        if (doc) {
          const { _id, ...rest } = doc;
          dbState = { ...dbState, ...rest };
          console.log('====== MONGO DB CONFIG ======');
          console.log('👉 Loaded system database state from MongoDB Atlas cloud!');
          console.log('==============================');
          return;
        } else {
          console.log('No existing state found in MongoDB. Initializing initial database seeding...');
          seedDatabaseInternal();
          await col.updateOne({ _id: 'main' }, { $set: dbState }, { upsert: true });
          console.log('Successfully seeded database state directly to MongoDB Atlas cloud!');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to read from MongoDB Atlas. Falling back to local file path:', err);
    }
  }

  // File fallback
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbState = JSON.parse(data);
      if (!dbState.apiKeys) {
        dbState.apiKeys = [];
      }
      if (!dbState.photoReports) {
        dbState.photoReports = [];
      }
      if (!dbState.emailSettings) {
        dbState.emailSettings = { ...DEFAULT_EMAIL_SETTINGS };
      }
      if (!dbState.messages) {
        dbState.messages = [];
      }
      console.log('Database loaded successfully from local file:', DB_FILE);
    } catch (e) {
      console.error('Error reading db.json, re-initializing database:', e);
      seedDatabase();
    }
  } else {
    seedDatabase();
  }
}

function seedDatabaseInternal() {
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
    photoReports: [],
    emailSettings: { ...DEFAULT_EMAIL_SETTINGS },
    messages: [
      {
        id: 'msg-1',
        senderId: 'usr-2',
        senderName: 'Trần Quốc Bảo (Phụ tá Kho)',
        senderRole: 'MANAGER',
        content: 'Chào cả nhà, tôi vừa xếp xong vị trí pallet mới cho lô hàng nhập INW. Mọi người kiểm kê và cập nhật thẻ kho nhé!',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
      },
      {
        id: 'msg-2',
        senderId: 'usr-3',
        senderName: 'Nguyễn Thị Hương (Kế toán)',
        senderRole: 'STAFF',
        content: 'Chào anh Bảo, đơn xuất kho OUT-2026-9045 của đại lý đang ở trạng thái Chờ Duyệt. Nhờ quản trị viên xem xét số lượng tồn đủ để xuất hành không ạ.',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        linkedOrder: {
          orderId: 'exp-1',
          orderCode: 'OUT-2026-9045',
          orderType: 'EXPORT',
          status: 'PENDING',
          totalAmount: 18500000,
          notes: 'Đại lý HN yêu cầu xếp xe gấp trước 12h trưa',
          itemsCount: 2
        }
      }
    ],
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
}

function seedDatabase() {
  console.log('Seeding initial database...');
  seedDatabaseInternal();
  saveDatabase();
}

async function saveToMongoBackground() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      const client = await connectToMongo();
      if (client) {
        const uri = cleanMongoUri() || '';
        const dbName = uri.split('/').pop()?.split('?')[0] || 'mrkien_erp';
        const db = client.db(dbName);
        const col = db.collection<any>('system_state');
        
        // Deep clone state before writing to MongoDB to avoid concurrent memory read/write races
        const stateCopy = JSON.parse(JSON.stringify(dbState));
        await col.updateOne({ _id: 'main' }, { $set: stateCopy }, { upsert: true });
        console.log('☁️ Successfully backed up database state to MongoDB Atlas Cloud!');
      }
    } catch (err) {
      console.error('Failed to sync state to MongoDB Atlas in background:', err);
    } finally {
      saveTimeout = null;
    }
  }, 1000); // 1-second debounce delay to bundle rapid changes (like active audit logging)
}

export function saveDatabase() {
  // Always write locally to support local operation as a primary fast write-through cache
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local backup db.json:', e);
  }

  // Trigger background replication if MONGODB_URI/MONGO_URI is set and valid
  const uri = cleanMongoUri();
  if (uri) {
    saveToMongoBackground().catch(err => {
      console.error('Unhandled background MongoDB save error:', err);
    });
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
