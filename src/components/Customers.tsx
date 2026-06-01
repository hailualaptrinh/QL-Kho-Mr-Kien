/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Truck, Plus, Search, Building, Phone, Mail, MapPin, Upload } from 'lucide-react';
import { Customer, Supplier } from '../types';
import CsvBulkImporter from './CsvBulkImporter';

interface CustomersProps {
  customers: Customer[];
  suppliers: Supplier[];
  user: any;
  onAddCustomer: (data: any) => Promise<any>;
  onAddSupplier: (data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Customers({ customers, suppliers, user, onAddCustomer, onAddSupplier, onRefresh }: CustomersProps) {
  const [partnerType, setPartnerType] = useState<'customers' | 'suppliers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Form parameters
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const handleOpenModal = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCompany('');
    setDeliveryAddress('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (partnerType === 'customers') {
      await onAddCustomer({ name, phone, email, address, company, deliveryAddress });
    } else {
      await onAddSupplier({ name, phone, email, address, company });
    }
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(c => {
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.phone.includes(searchQuery);
  });

  const filteredSuppliers = suppliers.filter(s => {
    return s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.phone.includes(searchQuery);
  });

  return (
    <div className="space-y-6">

      {/* Selector tab header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-101 p-4 rounded-2xl shadow-sm">
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-100 dark:border-slate-850">
          <button
            onClick={() => {
              setPartnerType('customers');
              setSearchQuery('');
            }}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${partnerType === 'customers' ? 'bg-blue-600 text-white shadow' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500'}`}
          >
            Khách Hàng ({customers.length})
          </button>
          <button
            onClick={() => {
              setPartnerType('suppliers');
              setSearchQuery('');
            }}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${partnerType === 'suppliers' ? 'bg-blue-600 text-white shadow' : 'text-slate-550 dark:text-slate-300 hover:text-blue-500'}`}
          >
            Nhà Cung Cấp ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đối tác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs rounded-xl focus:outline-none border border-slate-200"
            />
          </div>

          {partnerType === 'customers' && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer active:scale-95"
            >
              <Upload className="h-4 w-4" /> Nhập CSV hàng loạt
            </button>
          )}

          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer active:scale-95"
          >
            + {partnerType === 'customers' ? 'Thêm khách hàng' : 'Thêm nhà cung cấp'}
          </button>
        </div>
      </div>

      {partnerType === 'customers' ? (
        /* Customers View list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
          {filteredCustomers.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-850 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-950 dark:text-white text-base tracking-tight">{c.name}</h4>
                  <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <Building className="h-3.5 w-3.5" /> {c.company || 'Doanh Nghiệp Tư Nhân'}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-650 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> 
                  <span className="font-mono">{c.phone || 'Chưa cung cấp'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {c.email || 'Chưa cung cấp'}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" /> {c.address || 'Hà Nội, Việt Nam'}
                </p>
                {c.deliveryAddress && (
                  <p className="flex items-start gap-2 border-t border-slate-50/60 dark:border-slate-850/60 pt-2 text-[11px] text-blue-600 dark:text-blue-400">
                    <Truck className="h-3.5 w-3.5 shrink-0 mt-0.5" /> 
                    <span><strong>Giao hàng tại:</strong> {c.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Suppliers View list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
          {filteredSuppliers.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-850 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-950 dark:text-white text-base tracking-tight">{s.name}</h4>
                  <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <Building className="h-3.5 w-3.5" /> {s.company || 'Tổng công ty nguồn hàng'}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                  <Truck className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-650 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> 
                  <span className="font-mono">{s.phone || 'Chưa cung cấp'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {s.email || 'Chưa cung cấp'}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" /> {s.address || 'Hải Phòng / Hà Minh, VN'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Partner Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-101 shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {partnerType === 'customers' ? 'Thêm hồ sơ khách hàng mới' : 'Thêm nhà cung cấp mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-extrabold text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Tên đối tác / Thương chủ đại diện</label>
                <input
                  type="text"
                  required
                  placeholder="Mẫu: Bùi Quang Tuấn..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Doanh nghiệp / Công ty</label>
                <input
                  type="text"
                  placeholder="Mẫu: Công ty CP Bán lẻ Tự Trọng..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="Số ĐT..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Địa chỉ Email</label>
                  <input
                    type="email"
                    placeholder="Email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Hóa đơn địa chỉ trụ sở</label>
                <input
                  type="text"
                  placeholder="Địa chỉ xuất hóa đơn..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                />
              </div>

              {partnerType === 'customers' && (
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Địa điểm bốc giao hàng (Mặc định)</label>
                  <input
                    type="text"
                    placeholder="Để trống nếu trùng với địa chỉ trụ sở..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 bg-slate-100 rounded-lg text-xs font-bold">Thoát</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkImport && (
        <CsvBulkImporter
          type="customers"
          onAdd={onAddCustomer}
          onClose={() => setShowBulkImport(false)}
          onSuccess={onRefresh}
        />
      )}

    </div>
  );
}
