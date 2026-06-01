/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STOCKKEEPER' | 'SALES' | 'VIEWER';

export interface UserPermissions {
  view_products: boolean;
  add_products: boolean;
  edit_products: boolean;
  delete_products: boolean;
  view_imports: boolean;
  add_imports: boolean;
  view_exports: boolean;
  add_exports: boolean;
  approve_exports: boolean;
  view_customers: boolean;
  add_edit_customers: boolean;
  view_suppliers: boolean;
  add_edit_suppliers: boolean;
  view_employees: boolean;
  manage_employees: boolean;
  manage_settings: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  permissions?: UserPermissions;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  image: string;
  importPrice: number;
  exportPrice: number;
  unit: string;
  stock: number;
  minStock: number;
  description: string;
  supplierId: string;
  barcode: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
  deliveryAddress: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  managerId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface StockMove {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  date: string;
  operatorId: string;
  notes: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface ImportOrder {
  id: string;
  code: string;
  supplierId: string;
  date: string;
  creatorId: string;
  status: 'PENDING' | 'COMPLETED';
  items: OrderItem[];
  totalAmount: number;
  notes: string;
}

export interface ExportOrder {
  id: string;
  code: string;
  customerId: string;
  date: string;
  creatorId: string;
  status: 'PENDING' | 'SHIPPED' | 'CANCELLED';
  items: OrderItem[];
  totalAmount: number;
  notes: string;
}

export interface StocktakeItem {
  productId: string;
  expectedQty: number;
  actualQty: number;
  difference: number;
  reason: string;
}

export interface Stocktake {
  id: string;
  warehouseId: string;
  date: string;
  auditorId: string;
  status: 'DRAFT' | 'ADJUSTED';
  items: StocktakeItem[];
  notes: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  actionType: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PhotoReport {
  id: string;
  title: string;
  warehouseId: string;
  notes: string;
  imageUrl: string;
  date: string;
  creatorName: string;
}
