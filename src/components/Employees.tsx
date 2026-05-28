/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Plus, Phone, Mail, ToggleLeft, ToggleRight, Sparkles, UserCheck } from 'lucide-react';
import { Employee } from '../types';

interface EmployeesProps {
  employees: Employee[];
  user: any;
  onAddEmployee: (data: any) => Promise<any>;
  onUpdateEmployee: (id: string, data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Employees({ employees, user, onAddEmployee, onUpdateEmployee, onRefresh }: EmployeesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Thủ kho phụ');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;

    await onAddEmployee({ name, role, email, phone, status: 'ACTIVE' });
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
  };

  const handleToggleStatus = async (emp: Employee) => {
    if (user?.role !== 'ADMIN') {
      alert('Chỉ quản trị viên cấp cao mới có quyền thay đổi trạng thái nhân viên ERP!');
      return;
    }
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await onUpdateEmployee(emp.id, { status: newStatus });
    alert(`Đã đổi trạng thái sang: ${newStatus === 'ACTIVE' ? 'KÍCH HOẠT' : 'TẠM NGỪNG HỒ SƠ'}`);
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">NHÂN VIÊN & PHÂN QUYỀN HỆ THỐNG</h2>
          <p className="text-slate-400 text-xs">Danh bạ nhân sự, vị trí trách nhiệm bốc xếp điều hành kho vận ERP.</p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95"
          >
            + Tuyển nhân sự mới
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
        {employees.map(emp => {
          const isActive = emp.status === 'ACTIVE';

          return (
            <div key={emp.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 shadow-sm flex flex-col justify-between hover:border-blue-400/20 transition-all">
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 rounded-full object-cover bg-slate-100"
                  />
                  <div>
                    <h4 className="font-extrabold text-slate-950 dark:text-white text-sm flex items-center gap-1">
                      {emp.name}
                    </h4>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-505 px-2 py-0.5 rounded-full font-bold">
                      {emp.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-505 dark:text-slate-300 pt-2 border-t border-slate-50 dark:border-slate-850">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" /> {emp.email || 'Chưa cấu hình e-mail'}
                  </p>
                  <p className="flex items-center gap-2 font-mono">
                    <Phone className="h-4 w-4 text-slate-400" /> {emp.phone || 'Chưa cung cấp SĐT'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-50 dark:border-slate-850 pt-3 mt-4 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {isActive ? 'ĐANG KÍCH HOẠT' : 'ĐÃ TẠM PHONG TOẢ'}
                </span>

                {user?.role === 'ADMIN' ? (
                  <button
                    onClick={() => handleToggleStatus(emp)}
                    className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title={isActive ? 'Nhấp để tạm ngắt hoạt động' : 'Nhấp để kích hoạt lại hoạt động'}
                  >
                    {isActive ? (
                      <ToggleRight className="h-7 w-7 text-emerald-505" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-400" />
                    )}
                  </button>
                ) : (
                  <Shield className="h-4 w-4 text-slate-300" title="Chỉ Admin mới bốc thao tác này" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Employee modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-101 shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Thêm hồ sơ nhân viên mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-505 font-bold uppercase">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Mẫu: Hoàng Nhật Minh..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-505 font-bold uppercase">Chức vụ ERP</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                >
                  <option value="Thủ kho bến bãi">Thủ kho bến bãi</option>
                  <option value="Nhân viên xuất nhập hàng">Nhân viên xuất nhập hàng</option>
                  <option value="Hành chính lưu trữ">Hành chính lưu trữ</option>
                  <option value="Giám sát bốc xếp">Giám sát bốc xếp</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-505 font-bold uppercase">Hộp thư điện tử (Email)</label>
                <input
                  type="email"
                  placeholder="Email bưu cục..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-505 font-bold uppercase">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="Định dạng: 0988.xxx.xxx..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-905 dark:text-white rounded-lg border text-sm focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-501 bg-slate-100 rounded-lg text-xs font-bold">Đóng</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Lưu hồ sự</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
