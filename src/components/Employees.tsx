/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Plus, Phone, Mail, ToggleLeft, ToggleRight, Sparkles, UserCheck, Check, Lock, Unlock, Eye, RefreshCw } from 'lucide-react';
import { Employee } from '../types';

interface EmployeesProps {
  employees: Employee[];
  user: any;
  usersList?: any[];
  onAddEmployee: (data: any) => Promise<any>;
  onUpdateEmployee: (id: string, data: any) => Promise<any>;
  onUpdateUserPermissions?: (id: string, data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function Employees({ 
  employees, user, usersList = [], onAddEmployee, onUpdateEmployee, onUpdateUserPermissions, onRefresh 
}: EmployeesProps) {
  const canManageEmp = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || !!user?.permissions?.manage_employees;
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'permissions'>('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Thủ kho phụ');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

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
    if (!canManageEmp) {
      alert('Chỉ quản trị viên hoặc Quản lý kho mới có quyền thay đổi trạng thái nhân viên ERP!');
      return;
    }
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await onUpdateEmployee(emp.id, { status: newStatus });
    alert(`Đã đổi trạng thái sang: ${newStatus === 'ACTIVE' ? 'KÍCH HOẠT' : 'TẠM NGỪNG HỒ SƠ'}`);
  };

  const handleUserPermissionToggle = async (userId: string, permissionKey: string, currentValue: boolean) => {
    if (!canManageEmp) {
      alert('Chỉ quản trị viên hoặc Quản lý kho mới có quyền cập nhật phân quyền hệ thống!');
      return;
    }

    const targetUser = usersList.find(u => u.id === userId);
    if (!targetUser) return;

    const currentPermissions = targetUser.permissions || { canAdd: false, canEdit: false, canDelete: false };
    const updatedPermissions = {
      ...currentPermissions,
      [permissionKey]: !currentValue
    };

    setUpdatingUserId(userId);
    try {
      if (onUpdateUserPermissions) {
        await onUpdateUserPermissions(userId, { permissions: updatedPermissions });
        onRefresh();
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật phân quyền:', err);
      alert('Cập nhật phân quyền thất bại!');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    if (!canManageEmp) {
      alert('Chỉ quản trị viên hoặc Quản lý kho mới có quyền nâng cấp vai trò tài khoản!');
      return;
    }

    setUpdatingUserId(userId);
    try {
      if (onUpdateUserPermissions) {
        await onUpdateUserPermissions(userId, { role: newRole });
        onRefresh();
      }
    } catch (err) {
      console.error('Lỗi khi đổi vai trò:', err);
      alert('Cập nhật vai trò thất bại!');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: string) => {
    if (!canManageEmp) {
      alert('Chỉ quản trị viên hoặc Quản lý kho mới có quyền tắt/mở an ninh tài khoản!');
      return;
    }

    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUpdatingUserId(userId);
    try {
      if (onUpdateUserPermissions) {
        await onUpdateUserPermissions(userId, { status: newStatus });
        onRefresh();
      }
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái:', err);
      alert('Thay đổi trạng thái thất bại!');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="h-5.5 w-5.5 text-blue-500" />
            NHÂN SỰ & PHÂN QUYỀN HỆ THỐNG
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Quản lý hồ sơ nhân viên kho và phân quyền hành động Thêm - Sửa - Xóa cho thành viên.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'employees' && canManageEmp && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all"
            >
              + Tuyển nhân sự mới
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-2.5 border dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-slate-501"
            title="Làm mới trạng thái từ Cloud"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modern Subtabs switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pb-px">
        <button
          onClick={() => setActiveSubTab('employees')}
          className={`px-5 py-2.5 border-b-2 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
            activeSubTab === 'employees'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <span>Danh bạ nhân viên</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">{employees.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`px-5 py-2.5 border-b-2 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
            activeSubTab === 'permissions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <span>Cấp quyền thành viên</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full">{usersList.length || 3}</span>
        </button>
      </div>

      {activeSubTab === 'employees' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
          {employees.map(emp => {
            const isActive = emp.status === 'ACTIVE';

            return (
              <div key={emp.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-101 dark:border-slate-800/60 shadow-sm flex flex-col justify-between hover:border-blue-400/20 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-full object-cover bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-950 dark:text-white text-sm flex items-center gap-1">
                        {emp.name}
                      </h4>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        {emp.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-300 pt-2 border-t border-slate-50 dark:border-slate-850">
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

                  {canManageEmp ? (
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title={isActive ? 'Nhấp để tạm ngắt hoạt động' : 'Nhấp để kích hoạt lại hoạt động'}
                    >
                      {isActive ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <Shield className="h-4 w-4 text-slate-300" title="Chỉ Quản trị/Quản lý mới có quyền thao tác" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ACC & DYNAMIC PERMISSIONS PANEL UI */
        <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Danh sách tài khoản vận hành Cloud</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Đặt quyền năng thêm mới, sửa đổi hoặc xóa hoàn toàn định mức dữ liệu trên ERP.</p>
            </div>
            {updatingUserId && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                Đang lưu trữ thay đổi...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px] md:min-w-full">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-850/40 text-slate-400 font-bold border-b dark:border-slate-800/60">
                  <th className="p-4">Tài khoản & Hồ sơ</th>
                  <th className="p-4">Vai trò (Role)</th>
                  <th className="p-4 text-center">Tải lên / Thêm (ADD)</th>
                  <th className="p-4 text-center">Chỉnh sửa (EDIT)</th>
                  <th className="p-4 text-center">Xóa bỏ (DELETE)</th>
                  <th className="p-4">An ninh tài khoản</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Đang tải danh sách tài khoản từ máy chủ hoặc không có tài khoản khả dụng...
                    </td>
                  </tr>
                ) : (
                  usersList.map(item => {
                    const isAdmin = item.role === 'ADMIN';
                    const isActive = item.status === 'ACTIVE';
                    const perms = item.permissions || { canAdd: false, canEdit: false, canDelete: false };

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80'}
                              alt={item.fullName}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-full object-cover bg-slate-100 border border-slate-200"
                            />
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white">{item.fullName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-slate-400 text-[10px]">@{item.username}</span>
                                <span className="text-[10px] text-slate-500 truncate max-w-40">{item.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          {canManageEmp ? (
                            <select
                              value={item.role}
                              onChange={(e) => handleUserRoleChange(item.id, e.target.value)}
                              className="p-1 px-2 bg-slate-100 dark:bg-slate-800 rounded border border-transparent font-bold text-[11px] focus:outline-none dark:text-white cursor-pointer"
                              disabled={updatingUserId === item.id}
                            >
                              <option value="SUPER_ADMIN">👑 SUPER_ADMIN</option>
                              <option value="MANAGER">📦 MANAGER (Quản lý)</option>
                              <option value="STOCKKEEPER">🔑 STOCKKEEPER (Thủ kho)</option>
                              <option value="SALES">💼 SALES (Bán hàng)</option>
                              <option value="VIEWER">👁️ VIEWER (Chỉ xem)</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="CLIENT">CLIENT</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              (item.role === 'SUPER_ADMIN' || item.role === 'ADMIN') ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              item.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              item.role === 'STOCKKEEPER' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              item.role === 'SALES' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-slate-500/10 text-slate-550 border border-slate-500/20'
                            }`}>
                              {item.role}
                            </span>
                          )}
                        </td>

                        {/* ADD permission checkbox */}
                        <td className="p-4 text-center">
                          {isAdmin ? (
                            <span className="text-emerald-505 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <Unlock className="h-3.5 w-3.5" /> Thống trị
                            </span>
                          ) : (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!perms.canAdd}
                                onChange={() => handleUserPermissionToggle(item.id, 'canAdd', !!perms.canAdd)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer disabled:opacity-50"
                                disabled={updatingUserId === item.id || !canManageEmp}
                              />
                            </label>
                          )}
                        </td>

                        {/* EDIT permission checkbox */}
                        <td className="p-4 text-center">
                          {isAdmin ? (
                            <span className="text-emerald-555 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <Unlock className="h-3.5 w-3.5" /> Thống trị
                            </span>
                          ) : (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!perms.canEdit}
                                onChange={() => handleUserPermissionToggle(item.id, 'canEdit', !!perms.canEdit)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer"
                                disabled={updatingUserId === item.id || !canManageEmp}
                              />
                            </label>
                          )}
                        </td>

                        {/* DELETE permission checkbox */}
                        <td className="p-4 text-center">
                          {isAdmin ? (
                            <span className="text-emerald-555 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <Unlock className="h-3.5 w-3.5" /> Thống trị
                            </span>
                          ) : (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!perms.canDelete}
                                onChange={() => handleUserPermissionToggle(item.id, 'canDelete', !!perms.canDelete)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer"
                                disabled={updatingUserId === item.id || !canManageEmp}
                              />
                            </label>
                          )}
                        </td>

                        {/* ACTIVE STATUS TOGGLE */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {canManageEmp ? (
                              <button
                                onClick={() => handleUserStatusToggle(item.id, item.status)}
                                className={`text-xs font-bold px-2 px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center gap-1 ${
                                  isActive 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20' 
                                    : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20'
                                }`}
                                disabled={updatingUserId === item.id || item.id === user?.id}
                                title={item.id === user?.id ? "Không thể tự khóa tài khoản của chính mình!" : "Nhấp để bật/khóa tài khoản"}
                              >
                                {isActive ? (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span>Hoạt Động</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    <span>Đã Khoá</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                                {isActive ? 'ĐANG KÍCH HOẠT' : 'TẠM KHOÁ'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-101 dark:border-slate-800 shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Tuyển nhân sự mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Mẫu: Hoàng Nhật Minh..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 text-slate-905 dark:text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">Chức vụ ERP</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 text-slate-905 dark:text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Thủ kho bến bãi">Thủ kho bến bãi</option>
                  <option value="Nhân viên xuất nhập hàng">Nhân viên xuất nhập hàng</option>
                  <option value="Hành chính lưu trữ">Hành chính lưu trữ</option>
                  <option value="Giám sát bốc xếp">Giám sát bốc xếp</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">Hộp thư điện tử (Email)</label>
                <input
                  type="email"
                  placeholder="Email bưu cục..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 text-slate-905 dark:text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="Định dạng: 0988.xxx.xxx..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1.5 p-2 px-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 text-slate-905 dark:text-white rounded-lg text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-501 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold cursor-pointer">Đóng</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700">Lưu hồ sơ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
