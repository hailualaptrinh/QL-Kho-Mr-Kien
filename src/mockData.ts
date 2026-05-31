/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Category, Product, Supplier, Customer, 
  Warehouse, ImportOrder, ExportOrder, Employee, Stocktake, AppNotification, StockMove 
} from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    fullName: 'Hoàng Minh Cao (SUPER_ADMIN)',
    email: 'admin@mrkien-erp.com',
    phone: '0988.777.888',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    permissions: {
      view_products: true,
      add_products: true,
      edit_products: true,
      delete_products: true,
      view_imports: true,
      add_imports: true,
      view_exports: true,
      add_exports: true,
      approve_exports: true,
      view_customers: true,
      add_edit_customers: true,
      view_suppliers: true,
      add_edit_suppliers: true,
      view_employees: true,
      manage_employees: true,
      manage_settings: true
    }
  },
  {
    id: 'usr-2',
    username: 'manager',
    fullName: 'Phạm Thanh Sơn (QUẢN LÝ KHO)',
    email: 'manager@mrkien-erp.com',
    phone: '0905.123.456',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: {
      view_products: true,
      add_products: true,
      edit_products: true,
      delete_products: true,
      view_imports: true,
      add_imports: true,
      view_exports: true,
      add_exports: true,
      approve_exports: true,
      view_customers: true,
      add_edit_customers: true,
      view_suppliers: true,
      add_edit_suppliers: true,
      view_employees: true,
      manage_employees: true,
      manage_settings: false
    }
  },
  {
    id: 'usr-3',
    username: 'kho1',
    fullName: 'Vũ Quốc Khánh (THỦ KHO)',
    email: 'kho1@mrkien-erp.com',
    phone: '0912.987.654',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'STOCKKEEPER',
    status: 'ACTIVE',
    permissions: {
      view_products: true,
      add_products: false,
      edit_products: false,
      delete_products: false,
      view_imports: true,
      add_imports: true,
      view_exports: true,
      add_exports: true,
      approve_exports: false,
      view_customers: false,
      add_edit_customers: false,
      view_suppliers: false,
      add_edit_suppliers: false,
      view_employees: false,
      manage_employees: false,
      manage_settings: false
    }
  },
  {
    id: 'usr-4',
    username: 'sales1',
    fullName: 'Nguyễn Thuỳ Trang (NV BÁN HÀNG)',
    email: 'sales1@mrkien-erp.com',
    phone: '0988.444.555',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'SALES',
    status: 'ACTIVE',
    permissions: {
      view_products: true,
      add_products: false,
      edit_products: false,
      delete_products: false,
      view_imports: false,
      add_imports: false,
      view_exports: true,
      add_exports: true,
      approve_exports: false,
      view_customers: true,
      add_edit_customers: true,
      view_suppliers: false,
      add_edit_suppliers: false,
      view_employees: false,
      manage_employees: false,
      manage_settings: false
    }
  },
  {
    id: 'usr-5',
    username: 'viewer',
    fullName: 'Lê Minh Tuấn (CHỈ XEM)',
    email: 'viewer@mrkien-erp.com',
    phone: '0977.333.444',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'VIEWER',
    status: 'ACTIVE',
    permissions: {
      view_products: true,
      add_products: false,
      edit_products: false,
      delete_products: false,
      view_imports: true,
      add_imports: false,
      view_exports: true,
      add_exports: false,
      approve_exports: false,
      view_customers: true,
      add_edit_customers: false,
      view_suppliers: true,
      add_edit_suppliers: false,
      view_employees: true,
      manage_employees: false,
      manage_settings: false
    }
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Thiết bị điện tử', description: 'Điện thoại, máy tính, bảng mạch và linh kiện' },
  { id: 'cat-2', name: 'Gia dụng & Tiện ích', description: 'Đồ dùng nhà bếp, thiết bị gia đình' },
  { id: 'cat-3', name: 'Vật liệu xây dựng', description: 'Xi măng, gạch, thép cuộn cao cấp' },
  { id: 'cat-4', name: 'Thực phẩm khô', description: 'Các sản phẩm đóng hộp, đóng chai' }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Tổng kho Công nghệ Vintech',
    phone: '024.3322.1100',
    email: 'contact@vintech.com.vn',
    address: 'Lô B2 Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
    company: 'Công ty Cổ phần Đầu tư Công nghệ Vintech'
  },
  {
    id: 'sup-2',
    name: 'Tập đoàn Thép Việt Nhật',
    phone: '028.9988.7766',
    email: 'info@vietnhatsteel.com',
    address: 'Đường số 4, KCN Biên Hòa 2, Đồng Nai',
    company: 'Công ty Liên doanh Thép Việt Nhật VJS'
  },
  {
    id: 'sup-3',
    name: 'Nhà phân phối Hàng Tiêu Dùng An Phát',
    phone: '1900.5656',
    email: 'sales@anphatgroup.vn',
    address: '77 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh',
    company: 'Tập đoàn Thương mại Dịch vụ An Phát'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cus-1',
    name: 'Siêu thị Điện Máy Xanh',
    phone: '1800.1061',
    email: 'lienhe@dienmayxanh.com',
    address: '128 Trần Quang Khải, Quận 1, TP. Hồ Chí Minh',
    company: 'Công ty CP Đầu tư Thế Giới Di Động',
    deliveryAddress: 'Kho Tổng Điện Máy Xanh, Đường 4A, KCN Vĩnh Lộc, Bình Chánh, TP. HCM'
  },
  {
    id: 'cus-2',
    name: 'Đại lý Vật liệu Miền Bắc Minh Quân',
    phone: '0977.223.344',
    email: 'minhquanbuilder@outlook.com',
    address: 'Khu dân cư số 5, Phường Gia Cẩm, Việt Trì, Phú Thọ',
    company: 'Hộ kinh doanh VLXD Minh Quân Phú Thọ',
    deliveryAddress: 'Cửa hàng Minh Quân, Đại lộ Hùng Vương, Việt Trì, Phú Thọ'
  },
  {
    id: 'cus-3',
    name: 'Chuỗi cửa hàng Bách Hóa Ta',
    phone: '0981.445.566',
    email: 'bachhoata@gmail.com',
    address: '22 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
    company: 'Công ty TNHH Bán lẻ Tiêu dùng Bách Hóa Ta',
    deliveryAddress: 'Tổng kho Bách Hóa Ta, KCN Quang Minh, Mê Linh, Hà Nội'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'PROD-ELECTRONIC-001',
    name: 'Màn hình Dell UltraSharp 27" U2723QE',
    categoryId: 'cat-1',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    importPrice: 11500000,
    exportPrice: 14200000,
    unit: 'Chiếc',
    stock: 85,
    minStock: 20,
    description: 'Màn hình IPS Black cao cấp, độ phân giải 4K chuyên dụng đồ họa và dựng phim.',
    supplierId: 'sup-1',
    barcode: '8936001002012'
  },
  {
    id: 'prod-2',
    code: 'PROD-ELECTRONIC-002',
    name: 'Router Wifi 6 ASUS RT-AX82U',
    categoryId: 'cat-1',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
    importPrice: 3200000,
    exportPrice: 4100000,
    unit: 'Bộ',
    stock: 12,
    minStock: 15,
    description: 'Router chuẩn Wifi 6 băng tần kép AX5400, tích hợp đèn Aura RGB cực ngầu, giảm lag tối đa.',
    supplierId: 'sup-1',
    barcode: '8936001002029'
  },
  {
    id: 'prod-3',
    code: 'PROD-BUILDING-001',
    name: 'Thép phi 10 Việt Nhật (Cuộn)',
    categoryId: 'cat-3',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
    importPrice: 15800000,
    exportPrice: 17800000,
    unit: 'Tấn',
    stock: 24,
    minStock: 10,
    description: 'Thép cuộn chất lượng cao, cường độ chịu tải tiêu chuẩn công trình trọng điểm.',
    supplierId: 'sup-2',
    barcode: '8936001003019'
  },
  {
    id: 'prod-4',
    code: 'PROD-GIA_DUNG-001',
    name: 'Máy pha Cafe Philips EP2220/10',
    categoryId: 'cat-2',
    image: 'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?auto=format&fit=crop&w=600&q=80',
    importPrice: 9100000,
    exportPrice: 11900000,
    unit: 'Chiếc',
    stock: 6,
    minStock: 10,
    description: 'Máy pha cafe tự động chiết xuất hạt, có vòi sữa đánh bọt cappuccino sánh mịn màng.',
    supplierId: 'sup-3',
    barcode: '8936001004016'
  },
  {
    id: 'prod-5',
    code: 'PROD-FOOD-001',
    name: 'Nước tương Maggi Đậu nành Thanh dịu 700ml',
    categoryId: 'cat-4',
    image: 'https://images.unsplash.com/photo-1614275037920-eed20d1396b2?auto=format&fit=crop&w=600&q=80',
    importPrice: 24000,
    exportPrice: 32000,
    unit: 'Chai',
    stock: 1450,
    minStock: 200,
    description: 'Nước tương lên men tự nhiên, giàu dinh dưỡng, hậu ngọt mộc mạc thơm ngon.',
    supplierId: 'sup-3',
    barcode: '8936001005013'
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'Kho Trung tâm Hà Nội', location: 'Cụm Công nghiệp Từ Liêm, HN', managerId: 'emp-1', status: 'ACTIVE' },
  { id: 'wh-2', name: 'Chi nhánh Hải Phòng (Cảng)', location: 'Số 1 Ngô Quyền, Máy Tơ, Hải Phòng', managerId: 'emp-2', status: 'ACTIVE' },
  { id: 'wh-3', name: 'Chi nhánh Quận 9, TP. HCM', location: 'Xa lộ Hà Nội, Hiệp Phú, TP. HCM', managerId: 'emp-3', status: 'ACTIVE' }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Đặng Quốc Khánh', role: 'Thủ kho trưởng', email: 'quockhanh@mrkien-erp.com', phone: '0933.111.222', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', status: 'ACTIVE' },
  { id: 'emp-2', name: 'Vũ Minh Tuấn', role: 'Phó phòng Logistics', email: 'minhtuan@mrkien-erp.com', phone: '0977.333.444', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', status: 'ACTIVE' },
  { id: 'emp-3', name: 'Lê Thuỳ Trang', role: 'Kế toán kho', email: 'thuytrang@mrkien-erp.com', phone: '0988.444.555', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', status: 'ACTIVE' }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'nt-1',
    title: 'Cảnh báo tồn kho thấp',
    message: 'Sản phẩm "Router Wifi 6 ASUS RT-AX82U" số lượng chỉ còn 12 chiếc (mức tối thiểu là 15). Hãy xem xét nhập thêm sản phẩm này.',
    timestamp: '2026-05-28T10:30:00Z',
    type: 'warning',
    isRead: false
  },
  {
    id: 'nt-2',
    title: 'Đơn xuất kho chờ phê duyệt',
    message: 'Khách hàng "Siêu thị Điện Máy Xanh" vừa đặt một phiếu yêu cầu xin xuất 10 chiếc Dell UltraSharp 27" U2723QE.',
    timestamp: '2026-05-28T14:15:00Z',
    type: 'info',
    isRead: false
  },
  {
    id: 'nt-3',
    title: 'Nhập kho thành công',
    message: 'Đơn nhập kho INW-2026-001 bao gồm 1000 chai Maggi đã được hoàn tất từ Nhà phân phối An Phát.',
    timestamp: '2026-05-28T08:00:00Z',
    type: 'success',
    isRead: true
  }
];

export const INITIAL_IMPORTS: ImportOrder[] = [
  {
    id: 'imp-1',
    code: 'INW-2026-001',
    supplierId: 'sup-3',
    date: '2026-05-26T08:00:00Z',
    creatorId: 'usr-1',
    status: 'COMPLETED',
    items: [
      { productId: 'prod-5', quantity: 1000, price: 24000 }
    ],
    totalAmount: 24000000,
    notes: 'Nhập bổ sung lượng hàng gia vị Maggi cho chiến dịch khuyến mãi quý 2.'
  },
  {
    id: 'imp-2',
    code: 'INW-2026-002',
    supplierId: 'sup-1',
    date: '2026-05-27T10:15:00Z',
    creatorId: 'usr-1',
    status: 'COMPLETED',
    items: [
      { productId: 'prod-1', quantity: 30, price: 11500000 },
      { productId: 'prod-2', quantity: 20, price: 3200000 }
    ],
    totalAmount: 409000000,
    notes: 'Nhập mới hàng Dell UltraSharp và Router Asus phục vụ đối tác dự án.'
  }
];

export const INITIAL_EXPORTS: ExportOrder[] = [
  {
    id: 'exp-1',
    code: 'OUT-2026-001',
    customerId: 'cus-1',
    date: '2026-05-27T15:30:00Z',
    creatorId: 'usr-2',
    status: 'SHIPPED',
    items: [
      { productId: 'prod-1', quantity: 15, price: 14200000 },
      { productId: 'prod-5', quantity: 200, price: 3200000 } // Total 15 * 14.2M + 200 * 32k = 213M + 6.4M = 219.4M
    ],
    totalAmount: 219400000,
    notes: 'Xuất chuyển hàng điện máy & gia vị đợt 1 tới siêu thị.'
  },
  {
    id: 'exp-2',
    code: 'OUT-2026-002',
    customerId: 'cus-2',
    date: '2026-05-28T09:20:00Z',
    creatorId: 'usr-3',
    status: 'PENDING',
    items: [
      { productId: 'prod-3', quantity: 5, price: 17800000 }
    ],
    totalAmount: 89000000,
    notes: 'Phiếu yêu cầu xuất thép cuộn phi 10 bàn giao tại cửa hàng Việt Trì.'
  }
];

export const INITIAL_STOCKTAKES: Stocktake[] = [
  {
    id: 'st-1',
    warehouseId: 'wh-1',
    date: '2026-05-25T17:00:00Z',
    auditorId: 'emp-1',
    status: 'ADJUSTED',
    items: [
      { productId: 'prod-1', expectedQty: 85, actualQty: 85, difference: 0, reason: 'Chính xác hoàn toàn' },
      { productId: 'prod-2', expectedQty: 10, actualQty: 12, difference: 2, reason: 'Dư thừa do đếm sót đơn ngày 24' }
    ],
    notes: 'Kiểm toán kho định kỳ hàng tháng trung sơn Dell và Asus - Đã điều chỉnh sai số khớp sổ sách.'
  }
];

export const INITIAL_MUTATIONS: StockMove[] = [
  {
    id: 'mv-1',
    fromWarehouseId: 'wh-1',
    toWarehouseId: 'wh-2',
    productId: 'prod-2',
    quantity: 10,
    date: '2026-05-26T11:00:00Z',
    operatorId: 'usr-1',
    notes: 'Điều động xuất kho bổ sung Router ASUS phòng hờ bão tại khu vực Cảng Hải Phòng.'
  }
];
