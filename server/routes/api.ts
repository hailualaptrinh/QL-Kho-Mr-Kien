/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { getDb, saveDatabase, logActivity, addNotification } from '../db';
import { authMiddleware, roleMiddleware, checkPermission, AuthenticatedRequest } from '../middleware/auth';
import { signJWT } from '../../src/utils';
import { Product, ImportOrder, ExportOrder, Stocktake, Customer, Supplier, Employee, Warehouse, StockMove, ApiKey } from '../../src/types';

const router = Router();

// ==========================================
// 1. HEALTH AND UTILITIES
// ==========================================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// ==========================================
// 2. AUTHENTICATION (AUTHENTICATE & JWT)
// ==========================================
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu.' });
    return;
  }

  const db = getDb();
  
  // Custom 5 roles mapping per user's prompt
  const credentialsMap: Record<string, string> = {
    'admin': 'admin123',
    'manager': 'manager123',
    'kho1': 'kho123',
    'sales1': 'sales123',
    'viewer': 'view123'
  };

  const expectedPassword = credentialsMap[username];
  const isValidCredentials = expectedPassword && password === expectedPassword;

  let user = db.users.find(u => u.username === username || u.email === username);

  // Fallback / Auto-register five primary test profiles if they don't exist in existing data records
  if (!user && isValidCredentials) {
    const fallbackTemplate: Record<string, any> = {
      'admin': {
        id: 'usr-1',
        fullName: 'Hoàng Minh Cao (SUPER_ADMIN)',
        email: 'admin@mrkien-erp.com',
        phone: '0988.777.888',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        permissions: {
          view_products: true, add_products: true, edit_products: true, delete_products: true,
          view_imports: true, add_imports: true,
          view_exports: true, add_exports: true, approve_exports: true,
          view_customers: true, add_edit_customers: true,
          view_suppliers: true, add_edit_suppliers: true,
          view_employees: true, manage_employees: true,
          manage_settings: true
        }
      },
      'manager': {
        id: 'usr-2',
        fullName: 'Phạm Thanh Sơn (QUẢN LÝ KHO)',
        email: 'manager@mrkien-erp.com',
        phone: '0905.123.456',
        role: 'MANAGER',
        status: 'ACTIVE',
        permissions: {
          view_products: true, add_products: true, edit_products: true, delete_products: true,
          view_imports: true, add_imports: true,
          view_exports: true, add_exports: true, approve_exports: true,
          view_customers: true, add_edit_customers: true,
          view_suppliers: true, add_edit_suppliers: true,
          view_employees: true, manage_employees: true,
          manage_settings: false
        }
      },
      'kho1': {
        id: 'usr-3',
        fullName: 'Vũ Quốc Khánh (THỦ KHO)',
        email: 'kho1@mrkien-erp.com',
        phone: '0912.987.654',
        role: 'STOCKKEEPER',
        status: 'ACTIVE',
        permissions: {
          view_products: true, add_products: false, edit_products: false, delete_products: false,
          view_imports: true, add_imports: true,
          view_exports: true, add_exports: true, approve_exports: false,
          view_customers: false, add_edit_customers: false,
          view_suppliers: false, add_edit_suppliers: false,
          view_employees: false, manage_employees: false,
          manage_settings: false
        }
      },
      'sales1': {
        id: 'usr-4',
        fullName: 'Nguyễn Thuỳ Trang (NV BÁN HÀNG)',
        email: 'sales1@mrkien-erp.com',
        phone: '0988.444.555',
        role: 'SALES',
        status: 'ACTIVE',
        permissions: {
          view_products: true, add_products: false, edit_products: false, delete_products: false,
          view_imports: false, add_imports: false,
          view_exports: true, add_exports: true, approve_exports: false,
          view_customers: true, add_edit_customers: true,
          view_suppliers: false, add_edit_suppliers: false,
          view_employees: false, manage_employees: false,
          manage_settings: false
        }
      },
      'viewer': {
        id: 'usr-5',
        fullName: 'Lê Minh Tuấn (CHỈ XEM)',
        email: 'viewer@mrkien-erp.com',
        phone: '0977.333.444',
        role: 'VIEWER',
        status: 'ACTIVE',
        permissions: {
          view_products: true, add_products: false, edit_products: false, delete_products: false,
          view_imports: true, add_imports: false,
          view_exports: true, add_exports: false, approve_exports: false,
          view_customers: true, add_edit_customers: false,
          view_suppliers: true, add_edit_suppliers: false,
          view_employees: true, manage_employees: false,
          manage_settings: false
        }
      }
    };

    const template = fallbackTemplate[username];
    if (template) {
      user = {
        ...template,
        username,
        avatar: `https://images.unsplash.com/photo-${username === 'admin' ? '1472099645785-5658abf4ff4e' : username === 'manager' ? '1519085360753-af0119f7cbe7' : username === 'kho1' ? '1507003211169-0a1dd7228f2d' : username === 'sales1' ? '1494790108377-be9c29b29330' : '1500648767791-00dcc994a43e'}?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`
      } as any;
      db.users.push(user);
      saveDatabase();
    }
  }

  if (!isValidCredentials || !user) {
    res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    return;
  }

  if (user.status === 'INACTIVE') {
    res.status(403).json({ error: 'Tài khoản của bạn đã bị khoá bởi Quản trị viên.' });
    return;
  }

  // Generate safe token
  const token = signJWT({ id: user.id, username: user.username, role: user.role });

  logActivity(user.id, 'ĐĂNG NHẬP', `Tài khoản ${user.fullName} đăng nhập thành công.`);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      permissions: user.permissions
    }
  });
});

// Update profile / password
router.post('/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: 'Vui lòng điền mật khẩu cũ và mật khẩu mới.' });
    return;
  }

  logActivity(req.userId || 'system', 'ĐỔI MẬT KHẨU', `Người dùng đổi mật khẩu thành công.`);
  res.json({ message: 'Thay đổi mật khẩu thành công!' });
});

// Get current session user status
router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  res.json({ user });
});

// ==========================================
// 3. PRODUCTS AND CATEGORIES (CRUD + SEARCH)
// ==========================================
router.get('/products', (req, res) => {
  res.json(getDb().products);
});

router.post('/products', authMiddleware, checkPermission('add_products'), (req: AuthenticatedRequest, res) => {
  const productData: Partial<Product> = req.body;
  const db = getDb();

  if (!productData.name || !productData.categoryId || productData.importPrice === undefined || productData.exportPrice === undefined) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ các trường thông tin bắt buộc.' });
    return;
  }

  const code = productData.code || `PROD-${Date.now()}`;
  const barcode = productData.barcode || `893600${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
  
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    code,
    name: productData.name,
    categoryId: productData.categoryId,
    image: productData.image || 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80',
    importPrice: Number(productData.importPrice),
    exportPrice: Number(productData.exportPrice),
    unit: productData.unit || 'Chiếc',
    stock: Number(productData.stock || 0),
    minStock: Number(productData.minStock || 5),
    description: productData.description || '',
    supplierId: productData.supplierId || 'sup-3',
    barcode
  };

  db.products.push(newProduct);
  logActivity(req.userId || 'system', 'SẢN PHẨM', `Thêm mới sản phẩm "${newProduct.name}" (Mã: ${newProduct.code}).`);
  
  // If initial stock is low, warn
  if (newProduct.stock < newProduct.minStock) {
    addNotification({
      title: 'Tồn kho thấp',
      message: `Sản phẩm mới ${newProduct.name} có lượng tồn ban đầu (${newProduct.stock}) thấp hơn định mức tối thiểu (${newProduct.minStock}).`,
      type: 'warning'
    });
  }

  saveDatabase();
  res.status(201).json(newProduct);
});

router.put('/products/:id', authMiddleware, checkPermission('edit_products'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const db = getDb();

  const productIndex = db.products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    return;
  }

  const oldProduct = db.products[productIndex];
  const updatedProduct = {
    ...oldProduct,
    ...updateData,
    importPrice: Number(updateData.importPrice ?? oldProduct.importPrice),
    exportPrice: Number(updateData.exportPrice ?? oldProduct.exportPrice),
    stock: Number(updateData.stock ?? oldProduct.stock),
    minStock: Number(updateData.minStock ?? oldProduct.minStock)
  };

  db.products[productIndex] = updatedProduct;
  logActivity(req.userId || 'system', 'SẢN PHẨM', `Cập nhật thông tin sản phẩm "${updatedProduct.name}" (Mã: ${updatedProduct.code}).`);

  // Re-evaluate limits
  if (updatedProduct.stock < updatedProduct.minStock) {
    addNotification({
      title: 'Tồn kho thấp',
      message: `Sản phẩm ${updatedProduct.name} cảnh báo dưới định mức tối thiểu (${updatedProduct.stock}/${updatedProduct.minStock}).`,
      type: 'warning'
    });
  }

  saveDatabase();
  res.json(updatedProduct);
});

router.delete('/products/:id', authMiddleware, checkPermission('delete_products'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const db = getDb();

  const productIndex = db.products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    return;
  }

  const productName = db.products[productIndex].name;
  db.products.splice(productIndex, 1);
  logActivity(req.userId || 'system', 'SẢN PHẨM', `Xoá sản phẩm "${productName}" khỏi hệ thống.`);
  
  saveDatabase();
  res.json({ message: 'Đã xoá sản phẩm thành công!' });
});

router.get('/categories', (req, res) => {
  res.json(getDb().categories);
});

router.post('/categories', authMiddleware, checkPermission('add_products'), (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Vên danh mục không thể trống.' });
    return;
  }
  const db = getDb();
  const newCat = {
    id: `cat-${Date.now()}`,
    name,
    description: description || ''
  };
  db.categories.push(newCat);
  saveDatabase();
  res.status(201).json(newCat);
});

// ==========================================
// 4. IMPORTS (INBOUND LOGISTICS)
// ==========================================
router.get('/imports', (req, res) => {
  res.json(getDb().imports);
});

router.post('/imports', authMiddleware, checkPermission('add_imports'), (req: AuthenticatedRequest, res) => {
  const { supplierId, items, notes } = req.body;
  const db = getDb();

  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Thông tin phiếu nhập không đầy đủ. Yêu cầu ít nhất 1 sản phẩm.' });
    return;
  }

  let totalAmount = 0;
  const processedItems = items.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || (product ? product.importPrice : 0);
    totalAmount += quantity * price;

    if (product) {
      // Automatic update product stocks immediately when import order created
      product.stock += quantity;
    }

    return {
      productId: item.productId,
      quantity,
      price
    };
  });

  const code = `INW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newImport: ImportOrder = {
    id: `imp-${Date.now()}`,
    code,
    supplierId,
    date: new Date().toISOString(),
    creatorId: req.userId || 'usr-1',
    status: 'COMPLETED',
    items: processedItems,
    totalAmount,
    notes: notes || ''
  };

  db.imports.unshift(newImport);
  logActivity(req.userId || 'system', 'NHẬP KHO', `Tạo phiếu nhập kho thành công: ${code}. Tổng giá trị: ${totalAmount.toLocaleString('vi-VN')} VND.`);
  
  addNotification({
    title: 'Nhập kho mới',
    message: `Đơn nhập ${code} vừa được giao thành công bởi đối tác cung cấp. Kho được cập nhật dòng hàng hóa mới.`,
    type: 'success'
  });

  saveDatabase();
  res.status(201).json(newImport);
});

// ==========================================
// 5. EXPORTS (OUTBOUND LOGISTICS & CHECKS)
// ==========================================
router.get('/exports', (req, res) => {
  res.json(getDb().exports);
});

router.post('/exports', authMiddleware, checkPermission('add_exports'), (req: AuthenticatedRequest, res) => {
  const { customerId, items, notes } = req.body;
  const db = getDb();

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Thông tin phiếu xuất không đầy đủ. Hãy chọn Khách hàng và ít nhất 1 sản phẩm.' });
    return;
  }

  let totalAmount = 0;
  let stockCheckError = '';

  // Process items and verify stock availability
  const processedItems = items.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || (product ? product.exportPrice : 0);
    totalAmount += quantity * price;

    if (!product) {
      stockCheckError = `Sản phẩm ID "${item.productId}" không tồn tại trong danh mục hệ thống.`;
    } else if (product.stock < quantity) {
      stockCheckError = `Sản phẩm "${product.name}" trong tủ kệ chỉ còn tồn ${product.stock} ${product.unit}. Không đủ để xuất đơn số lượng ${quantity}!`;
    }

    return {
      productId: item.productId,
      quantity,
      price
    };
  });

  if (stockCheckError) {
    res.status(400).json({ error: stockCheckError });
    return;
  }

  const code = `OUT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // By default, CLIENT role adds orders in PENDING state; ADMIN approvals transition them to SHIPPED
  const defaultStatus = 'PENDING';

  const newExport: ExportOrder = {
    id: `exp-${Date.now()}`,
    code,
    customerId,
    date: new Date().toISOString(),
    creatorId: req.userId || 'usr-1',
    status: defaultStatus,
    items: processedItems,
    totalAmount,
    notes: notes || ''
  };

  db.exports.unshift(newExport);
  logActivity(req.userId || 'system', 'YÊU CẦU XUẤT KHO', `Tạo phiếu yêu cầu xuất kho: ${code}. Trạng thái: ĐANG CHỜ PHÊ DUYỆT. Trị giá: ${totalAmount.toLocaleString('vi-VN')} VND.`);
  
  addNotification({
    title: 'Yêu cầu xuất kho mới',
    message: `Đơn hàng xuất ${code} đang chờ phê duyệt duyệt kiểm hàng từ Quản trị viên chi nhánh.`,
    type: 'info'
  });

  saveDatabase();
  res.status(201).json(newExport);
});

// Admin approves shipping/exporting and triggers inventory decrements, or cancels orders
router.put('/exports/:id/status', authMiddleware, checkPermission('approve_exports'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'SHIPPED' or 'CANCELLED' or 'PENDING'
  const db = getDb();

  const orderIndex = db.exports.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy phiếu xuất kho.' });
    return;
  }

  const order = db.exports[orderIndex];

  if (order.status === status) {
    res.status(400).json({ error: 'Đơn hàng đã ở trạng thái này rồi.' });
    return;
  }

  // Handle Inventory Updates based on transition
  if (status === 'SHIPPED') {
    // Subtract stock
    let stockError = '';
    order.items.forEach(item => {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) return;
      if (product.stock < item.quantity) {
        stockError = `Sản phẩm "${product.name}" hiện không đủ tồn kho (${product.stock}/${item.quantity}) để phê duyệt xuất đơn này!`;
      }
    });

    if (stockError) {
      res.status(400).json({ error: stockError });
      return;
    }

    // Apply the inventory subtractions
    order.items.forEach(item => {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
        
        // Trigger alert if hits threshold
        if (product.stock < product.minStock) {
          addNotification({
            title: 'CẢNH BÁO TỒN KHO THẤP',
            message: `Sản phẩm "${product.name}" vừa tụt xuống tồn ${product.stock} (định mức tối thiểu: ${product.minStock}).`,
            type: 'warning'
          });
        }
      }
    });

    order.status = 'SHIPPED';
    logActivity(req.userId || 'system', 'XUẤT KHO THÀNH CÔNG', `Phê duyệt xuất kho đơn hàng ${order.code}. Hàng hóa đã rời cảng bốc dỡ.`);
    addNotification({
      title: 'Đơn bốc dỡ hoàn tất',
      message: `Đơn hàng xuất ${order.code} đã được vận chuyển xuất kho thành công.`,
      type: 'success'
    });

  } else if (status === 'CANCELLED') {
    // If transitioning from SHIPPED back to CANCELLED, return stock
    if (order.status === 'SHIPPED') {
      order.items.forEach(item => {
        const product = db.products.find(p => p.id === item.productId);
        if (product) {
          product.stock += item.quantity;
        }
      });
    }
    order.status = 'CANCELLED';
    logActivity(req.userId || 'system', 'HUỶ ĐƠN HÀNG XUẤT', `Huỷ bỏ đơn hàng xuất kho ${order.code}. Cập nhật lý do điều khiển.`);
  }

  saveDatabase();
  res.json(order);
});

// ==========================================
// 6. WAREHOUSES & MOVEMENT & STOCKTAKES
// ==========================================
router.get('/warehouses', (req, res) => {
  res.json(getDb().warehouses);
});

router.post('/warehouses', authMiddleware, checkPermission('add_products'), (req: AuthenticatedRequest, res) => {
  const { name, location, managerId } = req.body;
  if (!name || !location) {
    res.status(400).json({ error: 'Nhập tên kho và địa chỉ giao hợp lệ.' });
    return;
  }
  const db = getDb();
  const newWH: Warehouse = {
    id: `wh-${Date.now()}`,
    name,
    location,
    managerId: managerId || 'emp-1',
    status: 'ACTIVE'
  };
  db.warehouses.push(newWH);
  logActivity(req.userId || 'system', 'KHO HÀNG', `Thêm mới vị trí kho vận: ${name}.`);
  saveDatabase();
  res.status(201).json(newWH);
});

router.get('/mutations', authMiddleware, (req, res) => {
  res.json(getDb().mutations);
});

router.post('/warehouses/transfer', authMiddleware, checkPermission('add_imports'), (req: AuthenticatedRequest, res) => {
  const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = req.body;
  const db = getDb();

  const product = db.products.find(p => p.id === productId);
  const fromWh = db.warehouses.find(w => w.id === fromWarehouseId);
  const toWh = db.warehouses.find(w => w.id === toWarehouseId);

  if (!product || !fromWh || !toWh || !quantity || quantity <= 0) {
    res.status(400).json({ error: 'Sai lệch dữ liệu chuyển kho. Vui lòng xác định sản phẩm, nguồn và đích bốc dỡ.' });
    return;
  }

  if (product.stock < quantity) {
    res.status(400).json({ error: `Sản phẩm "${product.name}" trong kho trung tâm chỉ còn tồn ${product.stock} đơn vị, không đủ để chuyển đi ${quantity}.` });
    return;
  }

  const newMove: StockMove = {
    id: `mv-${Date.now()}`,
    fromWarehouseId,
    toWarehouseId,
    productId,
    quantity: Number(quantity),
    date: new Date().toISOString(),
    operatorId: req.userId || 'usr-1',
    notes: notes || ''
  };

  db.mutations.unshift(newMove);
  logActivity(req.userId || 'system', 'ĐIỀU ĐỘNG KHO', `Chuyển kho ${quantity}x "${product.name}" từ [${fromWh.name}] sang [${toWh.name}].`);
  addNotification({
    title: 'Chuyển kho hoàn thành',
    message: `Vận chuyển thành công ${quantity} sản phẩm "${product.name}" liên tỉnh nội bộ.`,
    type: 'success'
  });

  saveDatabase();
  res.status(201).json(newMove);
});

router.get('/stocktakes', authMiddleware, (req, res) => {
  res.json(getDb().stocktakes);
});

router.post('/warehouses/stocktake', authMiddleware, checkPermission('add_imports'), (req: AuthenticatedRequest, res) => {
  const { warehouseId, items, notes } = req.body;
  const db = getDb();

  if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Lịch biên bản kiểm kê trống. Vui lòng bổ sung danh sách vật liệu cần kiểm soát.' });
    return;
  }

  const activeWarehouse = db.warehouses.find(w => w.id === warehouseId);
  if (!activeWarehouse) {
    res.status(404).json({ error: 'Kho hàng không hợp lệ.' });
    return;
  }

  const stocktakeItems = items.map((item: any) => {
    const product = db.products.find(p => p.id === item.productId);
    const expectedQty = product ? product.stock : 0;
    const actualQty = Number(item.actualQty) ?? expectedQty;
    const difference = actualQty - expectedQty;
    
    // Auto adjust stock database values if auditor confirms adjustment
    if (product) {
      product.stock = actualQty;
    }

    return {
      productId: item.productId,
      expectedQty,
      actualQty,
      difference,
      reason: item.reason || (difference !== 0 ? 'Điều chỉnh sai lệch kiểm kê định kỳ' : 'Số liệu cân khớp')
    };
  });

  const newStocktake: Stocktake = {
    id: `st-${Date.now()}`,
    warehouseId,
    date: new Date().toISOString(),
    auditorId: req.userId || 'usr-1',
    status: 'ADJUSTED',
    items: stocktakeItems,
    notes: notes || ''
  };

  db.stocktakes.unshift(newStocktake);
  logActivity(req.userId || 'system', 'KIỂM KÊ KHO', `Lập biên tập viên kiểm kho tại [${activeWarehouse.name}]. Đã cập nhật số liệu vật lý.`);
  addNotification({
    title: 'Hệ thống cập nhật kiểm kê',
    message: `Kết quả biên bản kiểm kho [${activeWarehouse.name}] đã được đồng bộ hóa thành công.`,
    type: 'success'
  });

  saveDatabase();
  res.status(201).json(newStocktake);
});

// ==========================================
// 7. PARTNERS - CLIENTS & SUPPLIERS CRUD
// ==========================================
router.get('/customers', (req, res) => res.json(getDb().customers));
router.post('/customers', authMiddleware, checkPermission('add_edit_customers'), (req, res) => {
  const cust: Partial<Customer> = req.body;
  if (!cust.name) {
    res.status(400).json({ error: 'Tên đối tác không được trống.' });
    return;
  }
  const db = getDb();
  const newCust: Customer = {
    id: `cus-${Date.now()}`,
    name: cust.name,
    phone: cust.phone || '',
    email: cust.email || '',
    address: cust.address || '',
    company: cust.company || '',
    deliveryAddress: cust.deliveryAddress || cust.address || ''
  };
  db.customers.push(newCust);
  saveDatabase();
  res.status(201).json(newCust);
});

router.get('/suppliers', (req, res) => res.json(getDb().suppliers));
router.post('/suppliers', authMiddleware, checkPermission('add_edit_suppliers'), (req, res) => {
  const sup: Partial<Supplier> = req.body;
  if (!sup.name) {
    res.status(400).json({ error: 'Tên nhà cung cấp không thể trống.' });
    return;
  }
  const db = getDb();
  const newSup: Supplier = {
    id: `sup-${Date.now()}`,
    name: sup.name,
    phone: sup.phone || '',
    email: sup.email || '',
    address: sup.address || '',
    company: sup.company || ''
  };
  db.suppliers.push(newSup);
  saveDatabase();
  res.status(201).json(newSup);
});

// ==========================================
// 8. STAFF MANAGEMENT
// ==========================================
router.get('/employees', authMiddleware, (req, res) => {
  res.json(getDb().employees);
});

router.post('/employees', authMiddleware, checkPermission('manage_employees'), (req, res) => {
  const emp: Partial<Employee> = req.body;
  if (!emp.name || !emp.role) {
    res.status(400).json({ error: 'Vui lòng cung cấp Tên nhân sự và chức danh ERP.' });
    return;
  }
  const db = getDb();
  const newEmp: Employee = {
    id: `emp-${Date.now()}`,
    name: emp.name,
    role: emp.role,
    email: emp.email || '',
    phone: emp.phone || '',
    avatar: emp.avatar || `https://images.unsplash.com/photo-${Math.floor(1500000000000 + Math.random() * 100000000)}?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80`,
    status: emp.status || 'ACTIVE'
  };
  db.employees.push(newEmp);
  saveDatabase();
  res.status(201).json(newEmp);
});

router.put('/employees/:id', authMiddleware, checkPermission('manage_employees'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const db = getDb();

  const index = db.employees.findIndex(e => e.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy nhân sự.' });
    return;
  }

  const updated = {
    ...db.employees[index],
    ...updateData
  };
  db.employees[index] = updated;
  saveDatabase();
  res.json(updated);
});

// ==========================================
// 8.5. USER ACCOUNTS & PERMISSIONS MANAGEMENT
// ==========================================
router.get('/users', authMiddleware, (req, res) => {
  const db = getDb();
  // Ensure we don't return passwords if any exist
  const safeUsers = db.users.map((userObj) => {
    const u = { ...userObj } as any;
    if (!u.permissions) {
      u.permissions = { canAdd: false, canEdit: false, canDelete: false };
    }
    return u;
  });
  res.json(safeUsers);
});

router.put('/users/:id/permissions', authMiddleware, checkPermission('manage_employees'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { permissions, status, role } = req.body;
  const db = getDb();

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng.' });
    return;
  }

  const updatedUser = {
    ...db.users[userIndex],
  } as any;

  if (permissions !== undefined) {
    updatedUser.permissions = {
      view_products: !!permissions.view_products,
      add_products: !!permissions.add_products,
      edit_products: !!permissions.edit_products,
      delete_products: !!permissions.delete_products,
      view_imports: !!permissions.view_imports,
      add_imports: !!permissions.add_imports,
      view_exports: !!permissions.view_exports,
      add_exports: !!permissions.add_exports,
      approve_exports: !!permissions.approve_exports,
      view_customers: !!permissions.view_customers,
      add_edit_customers: !!permissions.add_edit_customers,
      view_suppliers: !!permissions.view_suppliers,
      add_edit_suppliers: !!permissions.add_edit_suppliers,
      view_employees: !!permissions.view_employees,
      manage_employees: !!permissions.manage_employees,
      manage_settings: !!permissions.manage_settings
    };
  }
  
  if (status !== undefined) {
    updatedUser.status = status;
  }

  if (role !== undefined) {
    const validRoles = ['SUPER_ADMIN', 'MANAGER', 'STOCKKEEPER', 'SALES', 'VIEWER', 'ADMIN', 'CLIENT'];
    if (validRoles.includes(role)) {
      updatedUser.role = role;
    }
  }

  db.users[userIndex] = updatedUser;
  logActivity(req.userId || 'system', 'PHÂN QUYỀN', `Cập nhật quyền hạn cho tài khoản "${updatedUser.fullName}".`);
  saveDatabase();

  res.json(updatedUser);
});

// ==========================================
// 9. BIÊU ĐỒ & BÁO CÁO THỐNG KÊ (AGGREGATED REPORTS)
// ==========================================
router.get('/reports/dashboard-stats', authMiddleware, (req, res) => {
  const db = getDb();
  
  // Total stats
  const totalProductsCount = db.products.length;
  const totalWarehouseStock = db.products.reduce((acc, p) => acc + p.stock, 0);
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayIso = todayStart.toISOString();

  // Filter imports today and exports today
  const importsToday = db.imports.filter(imp => imp.date >= todayIso);
  const exportsToday = db.exports.filter(exp => exp.date >= todayIso && exp.status === 'SHIPPED');

  const totalImportsTodayValue = importsToday.reduce((acc, imp) => acc + imp.totalAmount, 0);
  const totalExportsTodayValue = exportsToday.reduce((acc, exp) => acc + exp.totalAmount, 0);

  // Total warehouse pricing valuation
  const inventoryAssetValuationVal = db.products.reduce((acc, p) => acc + (p.stock * p.importPrice), 0);
  
  // Total historical revenue (calculated on shipped exports)
  const totalHistoricalRevenueVal = db.exports
    .filter(e => e.status === 'SHIPPED')
    .reduce((acc, e) => acc + e.totalAmount, 0);

  // Critical out of stock or low inventory alert counts
  const alertProducts = db.products.filter(p => p.stock < p.minStock).map(p => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    minStock: p.minStock
  }));

  // Historical timelines (last 7 days grouped chart preparation)
  const chartTimeline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    return d;
  }).reverse();

  const chartData = chartTimeline.map(date => {
    const dayStart = date.toISOString();
    const dayEnd = new Date(date.getTime() + 86400000).toISOString();

    const dayImports = db.imports
      .filter(imp => imp.date >= dayStart && imp.date < dayEnd)
      .reduce((sum, imp) => sum + imp.totalAmount, 0);

    const dayExports = db.exports
      .filter(exp => exp.date >= dayStart && exp.date < dayEnd && exp.status === 'SHIPPED')
      .reduce((sum, exp) => sum + exp.totalAmount, 0);

    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      imports: dayImports,
      exports: dayExports
    };
  });

  res.json({
    totalProductsCount,
    totalWarehouseStock,
    totalImportsTodayValue,
    totalExportsTodayValue,
    inventoryAssetValuationVal,
    totalHistoricalRevenueVal,
    alertProducts,
    chartData
  });
});

// ==========================================
// 10. SYSTEM NOTIFICATIONS
// ==========================================
router.get('/notifications', authMiddleware, (req, res) => {
  res.json(getDb().notifications);
});

router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const notification = db.notifications.find(n => n.id === id);
  if (notification) {
    notification.isRead = true;
    saveDatabase();
  }
  res.json({ success: true });
});

router.put('/notifications/mark-all', authMiddleware, (req, res) => {
  const db = getDb();
  db.notifications.forEach(n => { n.isRead = true; });
  saveDatabase();
  res.json({ success: true });
});

// Logs fetch for audit trails
router.get('/logs', authMiddleware, checkPermission('manage_settings'), (req, res) => {
  res.json(getDb().logs);
});

// ==========================================
// 11. API KEYS MANAGEMENT
// ==========================================
router.get('/apikeys', authMiddleware, checkPermission('manage_settings'), (req, res) => {
  res.json(getDb().apiKeys || []);
});

router.post('/apikeys', authMiddleware, checkPermission('manage_settings'), (req: AuthenticatedRequest, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Vui lòng cung cấp tên gợi nhớ cho API Key.' });
    return;
  }

  const db = getDb();
  if (!db.apiKeys) {
    db.apiKeys = [];
  }

  const randomHex = crypto.randomBytes(16).toString('hex');
  const apiKeyStr = `mrkien_api_${randomHex}`;

  const newKey: ApiKey = {
    id: `key-${Date.now()}`,
    name: name.trim(),
    key: apiKeyStr,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };

  db.apiKeys.unshift(newKey);
  saveDatabase();

  logActivity(req.userId || 'admin', 'THIẾT LẬP API', `Đã khởi tạo API Key kết nối mới: "${name.trim()}"`);

  res.status(201).json(newKey);
});

router.post('/apikeys/:id/toggle', authMiddleware, checkPermission('manage_settings'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.apiKeys) db.apiKeys = [];

  const foundKey = db.apiKeys.find(k => k.id === id);
  if (!foundKey) {
    res.status(404).json({ error: 'Không tìm thấy API Key yêu cầu.' });
    return;
  }

  foundKey.status = foundKey.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  saveDatabase();

  logActivity(
    req.userId || 'admin', 
    'THIẾT LẬP API', 
    `Đã thay đổi trạng thái API Key "${foundKey.name}" sang [${foundKey.status}]`
  );

  res.json(foundKey);
});

router.delete('/apikeys/:id', authMiddleware, checkPermission('manage_settings'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.apiKeys) db.apiKeys = [];

  const initialLength = db.apiKeys.length;
  const targetKey = db.apiKeys.find(k => k.id === id);
  db.apiKeys = db.apiKeys.filter(k => k.id !== id);

  if (db.apiKeys.length < initialLength) {
    saveDatabase();
    logActivity(req.userId || 'admin', 'THIẾT LẬP API', `Đã xoá/thu hồi API Key: "${targetKey?.name || id}"`);
    res.json({ success: true, message: 'Thu hồi API Key thành công.' });
  } else {
    res.status(404).json({ error: 'Không tìm thấy API Key yêu cầu.' });
  }
});

// ==========================================
// 12. WAREHOUSE PHOTO REPORTS (BÁO CÁO HÌNH ẢNH KHO)
// ==========================================
router.get('/photo-reports', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.photoReports) db.photoReports = [];
  res.json(db.photoReports);
});

router.post('/photo-reports', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.photoReports) db.photoReports = [];

  const { title, warehouseId, notes, imageUrl } = req.body;

  if (!title || !warehouseId || !imageUrl) {
    res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: Tiêu đề, kho bãi và hình ảnh (chụp từ điện thoại/máy ảnh).' });
    return;
  }

  const creator = db.users.find(u => u.id === req.userId);
  const creatorName = creator ? creator.fullName : 'Thành viên';

  const newReport = {
    id: `rep-${Date.now()}`,
    title,
    warehouseId,
    notes: notes || '',
    imageUrl,
    date: new Date().toISOString(),
    creatorName
  };

  db.photoReports.unshift(newReport);
  saveDatabase();

  logActivity(
    req.userId || 'admin',
    'BÁO CÁO HÌNH ẢNH KHO',
    `Đã gửi báo cáo hình ảnh kho: "${title}"`
  );

  res.status(201).json(newReport);
});

export default router;
