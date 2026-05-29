/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Boxes, ArrowDownLeft, ArrowUpRight, Layers, Users, Shield, 
  Settings, LogOut, Bell, Sun, Moon, Key, Check, Info, AlertOctagon, 
  Menu, X, Lock, RefreshCw, Activity 
} from 'lucide-react';
import { decodeJWT, formatCurrency, formatDate, signJWT } from './utils';
import { 
  INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_SUPPLIERS, INITIAL_CUSTOMERS, 
  INITIAL_PRODUCTS, INITIAL_WAREHOUSES, INITIAL_EMPLOYEES, INITIAL_NOTIFICATIONS,
  INITIAL_IMPORTS, INITIAL_EXPORTS, INITIAL_STOCKTAKES, INITIAL_MUTATIONS
} from './mockData';

// Sub components
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Imports from './components/Imports';
import Exports from './components/Exports';
import Warehouses from './components/Warehouses';
import Customers from './components/Customers';
import Employees from './components/Employees';
import Reports from './components/Reports';
import ApiKeysComponent from './components/ApiKeysComponent';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('mrkien_erp_token'));
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('mrkien_dark_mode') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Static Offline Mode Detection for Serverless Platforms like GitHub Pages
  const [isStaticMode, setIsStaticMode] = useState<boolean>(() => {
    const forced = localStorage.getItem('mrkien_static_mode');
    if (forced !== null) return forced === 'true';
    return window.location.hostname.includes('github.io');
  });

  const getLocalDB = (key: string, defaultValue: any) => {
    const val = localStorage.getItem(`mrkien_db_${key}`);
    if (val === null) {
      localStorage.setItem(`mrkien_db_${key}`, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(val);
    } catch {
      return defaultValue;
    }
  };

  const setLocalDB = (key: string, value: any) => {
    localStorage.setItem(`mrkien_db_${key}`, JSON.stringify(value));
  };

  const addLocalLog = (actionType: string, description: string) => {
    const list = getLocalDB('logs', []);
    list.unshift({
      id: `log-${Date.now()}`,
      userId: user?.id || 'admin',
      username: user?.username || 'admin',
      actionType,
      description,
      timestamp: new Date().toISOString()
    });
    setLocalDB('logs', list);
  };

  const handleLocalPost = (endpoint: string, payload: any) => {
    if (endpoint.startsWith('/api/products')) {
      const newProduct = { ...payload, id: `prod-${Date.now()}` };
      const list = getLocalDB('products', INITIAL_PRODUCTS);
      list.unshift(newProduct);
      setLocalDB('products', list);
      addLocalLog('THIẾT LẬP KHO', `Đã thêm mới sản phẩm: "${payload.name}" (${payload.code})`);
      setTimeout(() => fetchAllStates(), 10);
      return newProduct;
    }
    if (endpoint.startsWith('/api/imports')) {
      const newImport = { ...payload, id: `imp-${Date.now()}`, createdAt: new Date().toISOString() };
      const list = getLocalDB('imports', INITIAL_IMPORTS);
      list.unshift(newImport);
      setLocalDB('imports', list);
      
      const prods = getLocalDB('products', INITIAL_PRODUCTS);
      payload.items.forEach((item: any) => {
        const p = prods.find((prod: any) => prod.id === item.productId);
        if (p) p.stock += item.quantity;
      });
      setLocalDB('products', prods);
      
      addLocalLog('NHẬP KHO', `Đã nhập nhập kho đơn hàng mã [${payload.code}] trị giá ${formatCurrency(payload.totalAmount)}`);
      setTimeout(() => fetchAllStates(), 10);
      return newImport;
    }
    if (endpoint.startsWith('/api/exports')) {
      const newExport = { ...payload, id: `exp-${Date.now()}`, createdAt: new Date().toISOString() };
      const list = getLocalDB('exports', INITIAL_EXPORTS);
      list.unshift(newExport);
      setLocalDB('exports', list);
      
      const prods = getLocalDB('products', INITIAL_PRODUCTS);
      payload.items.forEach((item: any) => {
        const p = prods.find((prod: any) => prod.id === item.productId);
        if (p) p.stock = Math.max(0, p.stock - item.quantity);
      });
      setLocalDB('products', prods);
      
      addLocalLog('XUẤT KHO', `Đã xuất kho đơn hàng mã [${payload.code}] trị giá ${formatCurrency(payload.totalAmount || 0)}`);
      setTimeout(() => fetchAllStates(), 10);
      return newExport;
    }
    if (endpoint.startsWith('/api/stocktakes')) {
      const newSt = { ...payload, id: `st-${Date.now()}`, createdAt: new Date().toISOString() };
      const list = getLocalDB('stocktakes', INITIAL_STOCKTAKES);
      list.unshift(newSt);
      setLocalDB('stocktakes', list);
      
      const prods = getLocalDB('products', INITIAL_PRODUCTS);
      payload.items.forEach((item: any) => {
        const p = prods.find((prod: any) => prod.id === item.productId);
        if (p) p.stock = item.actualQuantity;
      });
      setLocalDB('products', prods);
      
      addLocalLog('KIỂM KHO', `Đã thực hiện kiểm kê kho đối soát khớp số tồn thực tế`);
      setTimeout(() => fetchAllStates(), 10);
      return newSt;
    }
    if (endpoint.startsWith('/api/apikeys')) {
      if (endpoint.endsWith('/toggle')) {
        const id = endpoint.split('/')[3];
        const list = getLocalDB('apikeys', []);
        const found = list.find((k: any) => k.id === id);
        if (found) {
          found.status = found.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          setLocalDB('apikeys', list);
          addLocalLog('THIẾT LẬP API', `Đã đổi trạng thái API key "${found.name}" thành [${found.status}]`);
        }
        setTimeout(() => fetchAllStates(), 10);
        return found;
      } else {
        const newKey = {
          id: `key-${Date.now()}`,
          name: payload.name,
          key: `mrkien_api_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
          createdAt: new Date().toISOString(),
          status: 'ACTIVE'
        };
        const list = getLocalDB('apikeys', []);
        list.unshift(newKey);
        setLocalDB('apikeys', list);
        addLocalLog('THIẾT LẬP API', `Đã khởi tạo khóa kết nối API mới "${payload.name}"`);
        setTimeout(() => fetchAllStates(), 10);
        return newKey;
      }
    }
    if (endpoint.startsWith('/api/customers')) {
      const item = { ...payload, id: `cus-${Date.now()}` };
      const list = getLocalDB('customers', INITIAL_CUSTOMERS);
      list.unshift(item);
      setLocalDB('customers', list);
      addLocalLog('ĐỐI TÁC', `Thêm mới khách hàng: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return item;
    }
    if (endpoint.startsWith('/api/suppliers')) {
      const item = { ...payload, id: `sup-${Date.now()}` };
      const list = getLocalDB('suppliers', INITIAL_SUPPLIERS);
      list.unshift(item);
      setLocalDB('suppliers', list);
      addLocalLog('ĐỐI TÁC', `Thêm mới nhà cung cấp: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return item;
    }
    if (endpoint.startsWith('/api/employees')) {
      const item = { ...payload, id: `emp-${Date.now()}` };
      const list = getLocalDB('employees', INITIAL_EMPLOYEES);
      list.unshift(item);
      setLocalDB('employees', list);
      addLocalLog('NHÂN SỰ', `Thêm nhân sự mới: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return item;
    }
    if (endpoint.startsWith('/api/warehouses')) {
      const item = { ...payload, id: `wh-${Date.now()}` };
      const list = getLocalDB('warehouses', INITIAL_WAREHOUSES);
      list.unshift(item);
      setLocalDB('warehouses', list);
      addLocalLog('THIẾT LẬP KHO', `Mở phân khu kho mới: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return item;
    }
    return payload;
  };

  const handleLocalPut = (endpoint: string, payload: any) => {
    if (endpoint.startsWith('/api/products/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('products', INITIAL_PRODUCTS);
      const updatedList = list.map((p: any) => p.id === id ? { ...p, ...payload } : p);
      setLocalDB('products', updatedList);
      addLocalLog('THIẾT LẬP KHO', `Đã cập nhật chi tiết sản phẩm: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { id, ...payload };
    }
    if (endpoint.startsWith('/api/customers/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('customers', INITIAL_CUSTOMERS);
      const updatedList = list.map((p: any) => p.id === id ? { ...p, ...payload } : p);
      setLocalDB('customers', updatedList);
      addLocalLog('ĐỐI TÁC', `Đã cập nhật thông tin khách hàng: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { id, ...payload };
    }
    if (endpoint.startsWith('/api/suppliers/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('suppliers', INITIAL_SUPPLIERS);
      const updatedList = list.map((p: any) => p.id === id ? { ...p, ...payload } : p);
      setLocalDB('suppliers', updatedList);
      addLocalLog('ĐỐI TÁC', `Đã cập nhật nhà cung cấp: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { id, ...payload };
    }
    if (endpoint.startsWith('/api/employees/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('employees', INITIAL_EMPLOYEES);
      const updatedList = list.map((p: any) => p.id === id ? { ...p, ...payload } : p);
      setLocalDB('employees', updatedList);
      addLocalLog('NHÂN SỰ', `Cập nhật thông tin nhân viên: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { id, ...payload };
    }
    if (endpoint.startsWith('/api/warehouses/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('warehouses', INITIAL_WAREHOUSES);
      const updatedList = list.map((p: any) => p.id === id ? { ...p, ...payload } : p);
      setLocalDB('warehouses', updatedList);
      addLocalLog('THIẾT LẬP KHO', `Cập nhật thông tin phân khu kho: "${payload.name}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { id, ...payload };
    }
    return payload;
  };

  const handleLocalDelete = (endpoint: string) => {
    if (endpoint.startsWith('/api/products/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('products', INITIAL_PRODUCTS);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('products', list.filter((p: any) => p.id !== id));
      addLocalLog('THIẾT LẬP KHO', `Đã xoá sản phẩm: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    if (endpoint.startsWith('/api/apikeys/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('apikeys', []);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('apikeys', list.filter((p: any) => p.id !== id));
      addLocalLog('THIẾT LẬP API', `Đã thu hồi API key: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    if (endpoint.startsWith('/api/customers/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('customers', INITIAL_CUSTOMERS);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('customers', list.filter((p: any) => p.id !== id));
      addLocalLog('ĐỐI TÁC', `Xoá khách hàng: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    if (endpoint.startsWith('/api/suppliers/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('suppliers', INITIAL_SUPPLIERS);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('suppliers', list.filter((p: any) => p.id !== id));
      addLocalLog('ĐỐI TÁC', `Xoá nhà cung cấp: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    if (endpoint.startsWith('/api/employees/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('employees', INITIAL_EMPLOYEES);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('employees', list.filter((p: any) => p.id !== id));
      addLocalLog('NHÂN SỰ', `Cho nghỉ việc nhân viên: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    if (endpoint.startsWith('/api/warehouses/')) {
      const id = endpoint.split('/')[3];
      const list = getLocalDB('warehouses', INITIAL_WAREHOUSES);
      const target = list.find((p: any) => p.id === id);
      setLocalDB('warehouses', list.filter((p: any) => p.id !== id));
      addLocalLog('THIẾT LẬP KHO', `Đóng cửa phân kho: "${target?.name || id}"`);
      setTimeout(() => fetchAllStates(), 10);
      return { success: true };
    }
    return { success: true };
  };

  // Core ERP states fetched from backend API
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [exports, setExports] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [stocktakes, setStocktakes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  // Authentication form states
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // UI state for password modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Auto-decode JWT on startup or token changes
  useEffect(() => {
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser({ id: decoded.id, username: decoded.username, role: decoded.role, fullName: decoded.id === 'usr-1' ? 'Mr. Cao Kiên (ADMIN)' : 'Nhân viên Xuất nhập hàng (CLIENT)' });
        localStorage.setItem('mrkien_erp_token', token);
      } else {
        handleLogout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  // Sync dark mode HTML classes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mrkien_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mrkien_dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Load backend states
  const fetchAllStates = async () => {
    if (!token) return;

    if (isStaticMode) {
      const loadedProducts = getLocalDB('products', INITIAL_PRODUCTS);
      const loadedCategories = getLocalDB('categories', INITIAL_CATEGORIES);
      const loadedSuppliers = getLocalDB('suppliers', INITIAL_SUPPLIERS);
      const loadedCustomers = getLocalDB('customers', INITIAL_CUSTOMERS);
      const loadedEmployees = getLocalDB('employees', INITIAL_EMPLOYEES);
      const loadedImports = getLocalDB('imports', INITIAL_IMPORTS);
      const loadedExports = getLocalDB('exports', INITIAL_EXPORTS);
      const loadedMutations = getLocalDB('mutations', INITIAL_MUTATIONS);
      const loadedStocktakes = getLocalDB('stocktakes', INITIAL_STOCKTAKES);
      const loadedLogs = getLocalDB('logs', []);
      const loadedNotifs = getLocalDB('notifications', INITIAL_NOTIFICATIONS);
      const loadedWarehouses = getLocalDB('warehouses', INITIAL_WAREHOUSES);

      // Recalculate dashboard-stats dynamically
      const totalImportVal = loadedImports.reduce((acc: number, item: any) => acc + (item.totalAmount || 0), 0);
      const totalExportVal = loadedExports.reduce((acc: number, item: any) => acc + (item.totalAmount || 0), 0);
      const totalStockItems = loadedProducts.reduce((acc: number, item: any) => acc + (item.stock || 0), 0);
      const lowStockAlerts = loadedProducts.filter((p: any) => p.stock <= p.minStock).length;

      const mockStats = {
        totalProducts: loadedProducts.length,
        totalStock: totalStockItems,
        lowStockItems: lowStockAlerts,
        totalImports: loadedImports.length,
        totalExports: loadedExports.length,
        totalImportValue: totalImportVal,
        totalExportValue: totalExportVal,
        monthlyStats: [
          { month: 'T1', nhap: 120000000, xuat: 150000000 },
          { month: 'T2', nhap: 90000000, xuat: 110000000 },
          { month: 'T3', nhap: 210000000, xuat: 280000000 },
          { month: 'T4', nhap: 170000000, xuat: 230000000 },
          { month: 'T5', nhap: totalImportVal > 0 ? totalImportVal : 340000000, xuat: totalExportVal > 0 ? totalExportVal : 410000000 }
        ]
      };

      setStats(mockStats);
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setSuppliers(loadedSuppliers);
      setCustomers(loadedCustomers);
      setEmployees(loadedEmployees);
      setImports(loadedImports);
      setExports(loadedExports);
      setMutations(loadedMutations);
      setStocktakes(loadedStocktakes);
      setLogs(loadedLogs);
      setNotifications(loadedNotifs);
      setWarehouses(loadedWarehouses);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Parallelize fetches to keep responses extremely snappy
      const [
        statsRes, prodRes, catRes, supRes, cusRes, 
        empRes, impRes, expRes, mutRes, stRes, logRes, notifRes, whRes
      ] = await Promise.all([
        fetch('/api/reports/dashboard-stats', { headers }).then(r => r.json()),
        fetch('/api/products', { headers }).then(r => r.json()),
        fetch('/api/categories', { headers }).then(r => r.json()),
        fetch('/api/suppliers', { headers }).then(r => r.json()),
        fetch('/api/customers', { headers }).then(r => r.json()),
        fetch('/api/employees', { headers }).then(r => r.json()),
        fetch('/api/imports', { headers }).then(r => r.json()),
        fetch('/api/exports', { headers }).then(r => r.json()),
        fetch('/api/mutations', { headers }).then(r => r.json()),
        fetch('/api/stocktakes', { headers }).then(r => r.json()),
        fetch('/api/logs', { headers }).then(r => r.json()),
        fetch('/api/notifications', { headers }).then(r => r.json()),
        fetch('/api/warehouses', { headers }).then(r => r.json())
      ]);

      setStats(statsRes);
      setProducts(prodRes || []);
      setCategories(catRes || []);
      setSuppliers(supRes || []);
      setCustomers(cusRes || []);
      setEmployees(empRes || []);
      setImports(impRes || []);
      setExports(expRes || []);
      setMutations(mutRes || []);
      setStocktakes(stRes || []);
      setLogs(logRes || []);
      setNotifications(notifRes || []);
      setWarehouses(whRes || []);

    } catch (e) {
      console.error('Failed to sync ERP parameters:', e);
    }
  };

  // Trigger reloading of API when tab or token changes
  useEffect(() => {
    if (token) {
      fetchAllStates();
    }
  }, [token, activeTab]);

  // 1-CLICK PRESENTS TO SPEED UP TESTING FOR CLIENTS
  const handleQuickLogin = (role: 'ADMIN' | 'CLIENT') => {
    setLoginError('');
    if (role === 'ADMIN') {
      setLoginUsername('admin');
      setLoginPassword('admin123');
    } else {
      setLoginUsername('client');
      setLoginPassword('password');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    if (isStaticMode) {
      setTimeout(() => {
        if (
          (loginUsername === 'admin' && loginPassword === 'admin123') || 
          (loginUsername === 'client' && loginPassword === 'password')
        ) {
          const role = loginUsername === 'admin' ? 'ADMIN' : 'CLIENT';
          const tokenPayload = { id: loginUsername === 'admin' ? 'usr-1' : 'usr-2', username: loginUsername, role, exp: Math.floor(Date.now() / 1000) + 86400 };
          const mockToken = signJWT(tokenPayload);
          setToken(mockToken);
          setUser({
            id: tokenPayload.id,
            username: loginUsername,
            role,
            fullName: loginUsername === 'admin' ? 'Mr. Cao Kiên (ADMIN)' : 'Nhân viên Xuất nhập hàng (CLIENT)'
          });
          setActiveTab('dashboard');
        } else {
          setLoginError('Tài khoản hoặc mật khẩu không chính xác.');
        }
        setLoginLoading(false);
      }, 300);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Đăng nhập không thành công.');
      } else {
        setToken(data.token);
        setUser(data.user);
        setActiveTab('dashboard');
      }
    } catch (err) {
      setLoginError('Không thể kết nối đến máy chủ API.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mrkien_erp_token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  // POST payloads triggered inside components
  const makePostCall = async (endpoint: string, payload: any) => {
    if (isStaticMode) {
      return handleLocalPost(endpoint, payload);
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      fetchAllStates(); // Trigger total sync
      return data;
    } catch (err: any) {
      console.error(`Post error on ${endpoint}:`, err);
      throw err;
    }
  };

  const makePutCall = async (endpoint: string, payload: any) => {
    if (isStaticMode) {
      return handleLocalPut(endpoint, payload);
    }
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      fetchAllStates();
      return data;
    } catch (err: any) {
      console.error(`Put error on ${endpoint}:`, err);
      throw err;
    }
  };

  const makeDeleteCall = async (endpoint: string) => {
    if (isStaticMode) {
      return handleLocalDelete(endpoint);
    }
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      fetchAllStates();
      return data;
    } catch (err) {
      console.error(`Delete error on ${endpoint}:`, err);
      throw err;
    }
  };

  // Sub helpers passed to children props
  const handleAddProduct = (payload: any) => makePostCall('/api/products', payload);
  const handleUpdateProduct = (id: string, payload: any) => makePutCall(`/api/products/${id}`, payload);
  const handleDeleteProduct = (id: string) => makeDeleteCall(`/api/products/${id}`);
  
  const handleAddImport = (payload: any) => makePostCall('/api/imports', payload);
  const handleAddExport = (payload: any) => makePostCall('/api/exports', payload);
  const handleUpdateExportStatus = (id: string, status: 'SHIPPED' | 'CANCELLED') => makePutCall(`/api/exports/${id}/status`, { status });
  
  const handleAddWarehouse = (payload: any) => makePostCall('/api/warehouses', payload);
  const handleTransferStock = (payload: any) => makePostCall('/api/warehouses/transfer', payload);
  const handleAuditStock = (payload: any) => makePostCall('/api/warehouses/stocktake', payload);

  const handleAddCustomer = (payload: any) => makePostCall('/api/customers', payload);
  const handleAddSupplier = (payload: any) => makePostCall('/api/suppliers', payload);

  const handleAddEmployee = (payload: any) => makePostCall('/api/employees', payload);
  const handleUpdateEmployee = (id: string, payload: any) => makePutCall(`/api/employees/${id}`, payload);

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAllStates();
    } catch (e) {
      console.error('Error clearing notifications', e);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    try {
      await makePostCall('/api/auth/change-password', { oldPassword, newPassword });
      alert('Đã thay đổi mật khẩu đăng nhập của bạn thành công!');
      setIsPassModalOpen(false);
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      alert('Thay đổi mật khẩu lỗi. Xin vui lòng thử lại.');
    }
  };

  // RENDER DUAL VIEWS: Authenticated vs Unauthenticated (Login Screen)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
        
        {/* Background blobs decor */}
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-blue-600/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-emerald-600/10 blur-3xl rounded-full"></div>

        <div className="w-full max-w-sm bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-7 z-10 animate-slide-in">
          
          <div className="text-center mb-6">
            <h2 className="text-[26x] font-black text-white tracking-tight">MR KIÊN ERP</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold block">Hệ Thống Quản Lý Kho Tiêu Chuẩn</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-540/20 text-red-400 text-xs rounded-xl font-bold space-y-2">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
                {loginError.includes('Không thể kết nối') && (
                  <div className="pt-2 border-t border-red-500/10 text-[10.5px] font-normal leading-relaxed text-slate-300">
                    Phát hiện máy chủ API Node.js không khả dụng (phổ biến khi chạy trên môi trường tĩnh như GitHub Pages). Hãy nhấp nút bên dưới để chuyển sang <strong>Chế độ Ngoại tuyến (Static Storage)</strong> để có thể đăng nhập & trải nghiệm toàn bộ tính năng 100%:
                    <button
                      type="button" 
                      onClick={() => {
                        setIsStaticMode(true);
                        localStorage.setItem('mrkien_static_mode', 'true');
                        setLoginError('');
                      }}
                      className="w-full mt-2 cursor-pointer p-2 text-xs font-bold text-center border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-white rounded-lg transition-colors"
                    >
                      ⚡ Chuyển sang Chế độ Ngoại tuyến (Static Demo)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên đăng nhập / Email</label>
              <div className="relative mt-1.5 rounded-xl bg-slate-900 border border-slate-800 focus-within:border-blue-500 transition-colors">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">👤</span>
                <input 
                  id="input-login-username"
                  type="text"
                  required
                  placeholder="admin hoặc client..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-transparent p-2.5 pl-9 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Mật khẩu</span>
                <span onClick={() => alert('Mật khẩu mẫu Quản trị viên: admin123 • Khách hàng: password')} className="text-blue-450 hover:underline cursor-pointer">Quên mật khẩu?</span>
              </label>
              <div className="relative mt-1.5 rounded-xl bg-slate-900 border border-slate-800 focus-within:border-blue-500 transition-colors">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔒</span>
                <input 
                  id="input-login-password"
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent p-2.5 pl-9 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <button 
              id="btn-login"
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md mt-1 cursor-pointer"
            >
              {loginLoading ? 'Đang truy xuất phân quyền...' : 'Đăng nhập vào hệ thống'}
            </button>
          </form>

          {/* Preset quick buttons as requested */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="block text-[10px] text-slate-450 font-extrabold uppercase text-center mb-3">TÀI KHOẢN TRẢI NGHIỆM NHANH</span>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                id="btn-quick-admin"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2 py-2.5 bg-slate-900 hover:bg-blue-900/30 text-white text-xs font-bold rounded-xl border border-slate-800 hover:border-blue-500/20 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>💼 Quản trị viên</span>
                <span className="text-[9px] text-slate-500 font-mono">admin / admin123</span>
              </button>

              <button 
                id="btn-quick-client"
                onClick={() => handleQuickLogin('CLIENT')}
                className="p-2 py-2.5 bg-slate-900 hover:bg-emerald-900/30 text-white text-xs font-bold rounded-xl border border-slate-800 hover:border-emerald-500/20 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>👷 Khách hàng</span>
                <span className="text-[9px] text-slate-500 font-mono">client / password</span>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-[10px] text-slate-500">Được phân phối chính thức • Mr Kiên ERP © 2026</p>
          </div>

        </div>
      </div>
    );
  }

  // Active count for unread alerts
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 flex transition-colors duration-150">
      
      {/* 1. SIDE NAVIGATION BAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} shrink-0 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between p-4.5 transition-all duration-300 hidden md:flex`}>
        <div className="space-y-6">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md animate-bounce ring-4 ring-blue-900/40">
              K
            </div>
            {isSidebarOpen && (
              <div>
                <span className="text-white font-extrabold text-sm block tracking-wide">MR KIÊN ERP</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-widest block uppercase">- Warehouse System -</span>
                {isStaticMode && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold tracking-wider uppercase">Offline Demo</span>
                )}
              </div>
            )}
          </div>

          {/* Main system route links */}
          <nav className="space-y-1">
            
            <button
              id="sidebar-nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Thống kê Dashboard</span>}
            </button>

            <button
              id="sidebar-nav-products"
              onClick={() => setActiveTab('products')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'products' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Boxes className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Danh Mục Sản Phẩm</span>}
            </button>

            <button
              id="sidebar-nav-imports"
              onClick={() => setActiveTab('imports')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'imports' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-500" />
              {isSidebarOpen && <span>Nhập Kho (Inbound)</span>}
            </button>

            <button
              id="sidebar-nav-exports"
              onClick={() => setActiveTab('exports')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'exports' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <ArrowUpRight className="h-4.5 w-4.5 text-blue-400" />
              {isSidebarOpen && <span>Xuất Kho (Outbound)</span>}
            </button>

            <button
              id="sidebar-nav-warehouses"
              onClick={() => setActiveTab('warehouses')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'warehouses' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Layers className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Phân Khu Kho Bãi</span>}
            </button>

            <button
              id="sidebar-nav-partners"
              onClick={() => setActiveTab('partners')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'partners' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Đối Tác & CRM</span>}
            </button>

            <button
              id="sidebar-nav-employees"
              onClick={() => setActiveTab('employees')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'employees' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Shield className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Nhân Sự Quản Lý</span>}
            </button>

            <button
              id="sidebar-nav-reports"
              onClick={() => setActiveTab('reports')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'reports' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Settings className="h-4.5 w-4.5" />
              {isSidebarOpen && <span>Báo Cáo Tài Chính</span>}
            </button>

            <button
              id="sidebar-nav-apikeys"
              onClick={() => setActiveTab('apikeys')}
              className={`w-full p-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-3 cursor-pointer ${activeTab === 'apikeys' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Key className="h-4.5 w-4.5 text-amber-500" />
              {isSidebarOpen && <span>Cổng Kết Nối & API Key</span>}
            </button>

          </nav>
        </div>

        {/* Sidebar Footer (Profile / Change status) */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          {isSidebarOpen && (
            <div className="px-2">
              <p className="text-white font-bold text-xs truncate">{user?.fullName}</p>
              <span className="text-[10px] text-slate-500 font-mono lowercase">{user?.email}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              id="btn-sidebar-pass"
              onClick={() => setIsPassModalOpen(true)}
              className="p-2.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all flex-1 flex justify-center cursor-pointer"
              title="Thay đổi mật khẩu đăng nhập"
            >
              <Key className="h-4 w-4" />
            </button>
            <button
              id="btn-sidebar-logout"
              onClick={handleLogout}
              className="p-2.5 hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 rounded-lg transition-all flex-1 flex justify-center cursor-pointer"
              title="Đăng xuất khỏi tài khoản"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE CONTENT AND PANEL */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* TOP COMPONENT INTERFACE NAVBAR */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between sticky top-0 z-40 px-6 transition-colors">
          <div className="flex items-center gap-4">
            {/* Sidebar trigger on desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 glass hover:bg-slate-105 rounded text-slate-500 cursor-pointer hidden md:block"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Mobile Title */}
            <div className="md:hidden">
              <span className="font-extrabold text-slate-900 dark:text-white text-base">MR KIÊN ERP</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const toggledState = !isStaticMode;
                  setIsStaticMode(toggledState);
                  localStorage.setItem('mrkien_static_mode', toggledState ? 'true' : 'false');
                  setTimeout(() => window.location.reload(), 150);
                }}
                className={`text-[10px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 ${
                  isStaticMode 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25' 
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
                title="Bấm để chuyển đổi giữa kết nối Live API và Chế độ Lưu trữ Ngoại tuyến"
              >
                <Activity className={`h-3 w-3 ${isStaticMode ? 'animate-pulse text-amber-500' : 'text-emerald-500'}`} />
                <span>Ngoại tuyến: {isStaticMode ? 'ĐANG BẬT (Demo)' : 'TẮT (Live API)'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Dark mode switch */}
            <button
              id="btn-toggle-dark"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-850 rounded-xl text-slate-600 dark:text-slate-3 bg-opacity-70 text-sm hover:bg-blue-50 transition-all cursor-pointer"
              title={isDarkMode ? 'Đổi sang Giao diện sáng' : 'Đổi sang Giao diện tối'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notification Pane bells */}
            <div className="relative">
              <button
                id="btn-notification-bell"
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-850 rounded-xl text-slate-600 dark:text-slate-3 bg-opacity-70 text-sm hover:bg-blue-50 transition-all cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
                )}
              </button>

              {/* Alerts dropdown dropdown menu */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl w-80 overflow-hidden z-50 animate-slide-in">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">THÀNH PHẦN THÔNG BÁO ({unreadCount} Mới)</span>
                    <button onClick={handleMarkNotificationsRead} className="text-blue-600 hover:underline">Đánh dấu tất cả</button>
                  </div>
                  <div className="divide-y max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-slate-50/50 text-xs text-left cursor-pointer space-y-1 ${n.isRead ? 'opacity-60' : 'bg-blue-50/10'}`}>
                          <div className="flex items-center gap-1.5 font-bold">
                            {n.type === 'warning' ? <AlertOctagon className="h-3.5 w-3.5 text-amber-500" /> : <Info className="h-3.5 w-3.5 text-blue-500" />}
                            <span className="text-slate-900 dark:text-white">{n.title}</span>
                          </div>
                          <p className="text-slate-550 leading-relaxed dark:text-slate-300">{n.message}</p>
                          <span className="text-[9px] text-slate-400 block pt-0.5">{formatDate(n.timestamp)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">Không có thông báo hệ thống.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile trigger */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline">{user?.fullName}</span>
              <span className="text-[9px] bg-blue-50/20 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase">{user?.role}</span>
            </div>

          </div>
        </header>

        {/* 3. DYNAMIC WORKSPACE COMPONENT PANEL FOR CURRENT VIEWED SUB-TAB */}
        <main className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto animate-fade-in pb-16">
          {activeTab === 'dashboard' && (
            <Dashboard 
              stats={stats} 
              user={user} 
              logs={logs} 
              onRefresh={fetchAllStates} 
              onNavigate={(tab) => setActiveTab(tab)} 
            />
          )}

          {activeTab === 'products' && (
            <Products
              products={products}
              categories={categories}
              suppliers={suppliers}
              user={user}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'imports' && (
            <Imports
              imports={imports}
              products={products}
              suppliers={suppliers}
              user={user}
              onAddImport={handleAddImport}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'exports' && (
            <Exports
              exports={exports}
              products={products}
              customers={customers}
              user={user}
              onAddExport={handleAddExport}
              onUpdateExportStatus={handleUpdateExportStatus}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'warehouses' && (
            <Warehouses
              warehouses={warehouses}
              products={products}
              mutations={mutations}
              stocktakes={stocktakes}
              user={user}
              onAddWarehouse={handleAddWarehouse}
              onTransferStock={handleTransferStock}
              onAuditStock={handleAuditStock}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'partners' && (
            <Customers
              customers={customers}
              suppliers={suppliers}
              user={user}
              onAddCustomer={handleAddCustomer}
              onAddSupplier={handleAddSupplier}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'employees' && (
            <Employees
              employees={employees}
              user={user}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onRefresh={fetchAllStates}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              imports={imports}
              exports={exports}
              products={products}
              suppliers={suppliers}
              customers={customers}
              user={user}
            />
          )}

          {activeTab === 'apikeys' && (
            <ApiKeysComponent
              user={user}
              onRefresh={fetchAllStates}
            />
          )}
        </main>

        {/* MOBILE WORKSPACE CONTROLS DOCK (Strictly responsive for touchscreen mobile size) */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex justify-around p-2 text-[9px] text-slate-400 font-bold md:hidden">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}>
            <span>📊</span>
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'products' ? 'text-blue-500' : 'text-slate-400'}`}>
            <span>📦</span>
            <span>Sản phẩm</span>
          </button>
          <button onClick={() => setActiveTab('imports')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'imports' ? 'text-blue-500' : 'text-slate-400'}`}>
            <span>📥</span>
            <span>Nhập</span>
          </button>
          <button onClick={() => setActiveTab('exports')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'exports' ? 'text-blue-500' : 'text-slate-400'}`}>
            <span>📤</span>
            <span>Xuất</span>
          </button>
          <button onClick={() => setActiveTab('warehouses')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'warehouses' ? 'text-blue-500' : 'text-slate-400'}`}>
            <span>🏢</span>
            <span>Kho bãi</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 text-rose-500">
            <span>🚪</span>
            <span>Thoát</span>
          </button>
        </footer>

      </div>

      {/* CHANGE PASSWORD MODEL POPUP */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsPassModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold"
            >✕</button>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <h3 className="font-bold text-slate-950 dark:text-white text-base">Thay đổi mật khẩu ERP</h3>
              
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu cũ..."
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm rounded border"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm rounded border"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setIsPassModalOpen(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Đóng</button>
                <button type="submit" className="px-5 py-2 text-xs bg-blue-600 text-white rounded-lg font-bold shadow-md">Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
