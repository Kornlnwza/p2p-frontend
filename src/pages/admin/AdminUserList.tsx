import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  X,
  Search,
  Settings,
  Power,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useDebounce } from "../../hook/useDebounce";

interface User {
  user_id: number;
  username: string;
  department: string;
  role: string;
  is_active: boolean;
}

export default function AdminUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openConfirmDuplicateModal, setOpenConfirmDuplicateModal] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    userId: number | null;
  }>({
    isOpen: false,
    userId: null,
  });

  // 🌟 State ใหม่สำหรับควบคุม Pop-up ยืนยันการเปลี่ยนสถานะ
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    isSuspending: boolean;
  }>({
    isOpen: false,
    userId: null,
    isSuspending: true,
  });

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    department: "IT",
    role: "Requester",
  });

  const specialDepartments = ["admin", "Accounting", "Warehouse", "Purchasing"];
  const isSpecialDept = specialDepartments.includes(formData.department);

  const handleDepartmentChange = (dept: string) => {
    let newRole: string;
    switch (dept) {
      case "admin":
        newRole = "Admin";
        break;
      case "Accounting":
        newRole = "Finance";
        break;
      case "Warehouse":
        newRole = "Receiver";
        break;
      case "Purchasing":
        newRole = "Purchaser";
        break;
      default:
        newRole = formData.role === "Head" ? "Head" : "Requester";
    }
    setFormData({ ...formData, department: dept, role: newRole });
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // เริ่มโหลด

    try {
      await api.post("/users", formData);
      toast.success("สร้างผู้ใช้งานสำเร็จ!");
      setIsModalOpen(false);
      setFormData({
        username: "",
        password: "",
        department: "IT",
        role: "Requester",
      });
      fetchUsers();
    } catch (error: unknown) {
      // 🌟 ใส่ setIsLoading(false) ตรงนี้ด้วย เพื่อปลดล็อคปุ่มทันทีที่เกิด Error
      setIsLoading(false);

      if (error instanceof Error && "response" in error) {
        const err = error as {
          response?: { status?: number; data?: { message?: string } };
        };

        if (err.response?.status === 409) {
          setOpenConfirmDuplicateModal(true); // เปิด Modal แจ้งเตือน
        } else {
          toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
        }
      } else {
        toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
      }
    } finally {
      // โค้ดส่วนนี้ยังคงไว้เหมือนเดิมครับ (เป็น Safety net)
      setIsLoading(false);
    }
  };

  // 🌟 ฟังก์ชันเมื่อกดปุ่มใน Dropdown (จะเปิด Pop-up แทนการยิง API ทันที)
  const handleToggleClick = (userId: number, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      userId: userId,
      isSuspending: currentStatus, // ถ้า currentStatus เป็น true แสดงว่ากำลังจะกด "ระงับ"
    });
    setActiveDropdown(null); // ปิด Dropdown ฟันเฟือง
  };

  // 🌟 ฟังก์ชันยิง API จริงๆ (จะถูกเรียกเมื่อกดปุ่ม "ยืนยัน" ใน Pop-up)
  const confirmToggleStatus = async () => {
    if (!confirmModal.userId) return;

    // 🌟 1. Optimistic Update: เปลี่ยน state ในหน้าจอก่อนเลย
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.user_id === confirmModal.userId
          ? { ...user, is_active: !confirmModal.isSuspending }
          : user,
      ),
    );

    // ปิด Modal ทันที
    setConfirmModal({ isOpen: false, userId: null, isSuspending: true });

    // 🌟 2. ยิง API (ทำงานเบื้องหลัง)
    try {
      await api.put(`/users/${confirmModal.userId}/status`, {
        is_active: !confirmModal.isSuspending,
      });

      toast.success(
        confirmModal.isSuspending ? "ระงับบัญชีสำเร็จ" : "คืนสิทธิ์สำเร็จ",
      );

      // 🌟 3. (Optional) Fetch ข้อมูลใหม่เพื่อความชัวร์ (ถ้าข้อมูลเปลี่ยนจากคนอื่น)
      // fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");

      // ถ้า API พัง เราก็ Revert ค่ากลับมาเหมือนเดิม (กันเหนียว)
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  );

  const confirmResetPassword = async () => {
    if (!resetPasswordModal.userId) return;

    try {
      // เรียกใช้ API หลังบ้านที่เราเตรียมไว้
      await api.put(`/users/${resetPasswordModal.userId}/reset-password`);
      toast.success("รีเซ็ตรหัสผ่านเป็น 123456 เรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
    } finally {
      // ปิด Pop-up
      setResetPasswordModal({ isOpen: false, userId: null });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-rose-500" /> จัดการผู้ใช้งาน
          </h1>
          <p className="text-slate-500 mt-1">
            รายชื่อผู้ใช้งานและสิทธิ์การเข้าถึงระบบทั้งหมด
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ แผนก..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-sm font-medium"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <UserPlus size={20} />
            <span className="hidden sm:inline">เพิ่มผู้ใช้งาน</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-24">รหัส</th>
                <th className="p-4">ชื่อผู้ใช้งาน</th>
                <th className="p-4">แผนก</th>
                <th className="p-4 text-center">สิทธิ์</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-right pr-6 w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.user_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 pl-6 font-bold text-slate-400">
                    #{user.user_id}
                  </td>
                  <td className="p-4 font-bold text-slate-700">
                    {user.username}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.department === "admin"
                          ? "bg-rose-100 text-rose-700"
                          : user.department === "IT"
                            ? "bg-blue-100 text-blue-700"
                            : user.department === "Accounting"
                              ? "bg-amber-100 text-amber-700"
                              : user.department === "Warehouse"
                                ? "bg-emerald-100 text-emerald-700"
                                : user.department === "Purchasing"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.department.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-bold text-slate-500">
                      {user.role || "N/A"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-max mx-auto ${
                        user.is_active !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {user.is_active !== false ? "ใช้งานปกติ" : "ถูกระงับ"}
                    </span>
                  </td>

                  <td className="p-4 pr-6 text-right relative">
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === user.user_id ? null : user.user_id,
                        )
                      }
                      className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Settings size={20} />
                    </button>

                    {activeDropdown === user.user_id && (
                      <>
                        {/* 🌟 1. เพิ่ม Overlay ใสๆ ไว้ดักการคลิกพื้นที่ว่าง */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveDropdown(null)}
                        ></div>

                        {/* 🌟 2. เมนู Dropdown เดิมของคุณ (เปลี่ยน z-20 ให้สูงกว่า overlay) */}
                        <div className="absolute right-12 top-10 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-20 flex flex-col gap-1 min-w-[140px] animate-in slide-in-from-top-2 fade-in">
                          <button
                            onClick={() => {
                              setResetPasswordModal({
                                isOpen: true,
                                userId: user.user_id,
                              });
                              setActiveDropdown(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <KeyRound size={16} /> รีเซ็ตรหัส
                          </button>

                          <div className="h-px bg-slate-100 my-1"></div>

                          {user.is_active !== false ? (
                            <button
                              onClick={() =>
                                handleToggleClick(user.user_id, true)
                              }
                              className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors relative z-30" // เพิ่ม z-30 กันเหนียว
                            >
                              <Power size={16} /> ระงับบัญชี
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleToggleClick(user.user_id, false)
                              }
                              className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors relative z-30"
                            >
                              <CheckCircle2 size={16} /> คืนสิทธิ์
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    {searchTerm ? (
                      <div>
                        <Search
                          className="mx-auto text-slate-300 mb-3"
                          size={40}
                        />
                        ไม่พบผู้ใช้งานที่ชื่อหรือแผนกตรงกับ "{searchTerm}"
                      </div>
                    ) : (
                      "ยังไม่มีข้อมูลผู้ใช้งานในระบบ"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 Modal ยืนยันการระงับ/คืนสิทธิ์ */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmModal.isSuspending
                  ? "bg-rose-100 text-rose-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {confirmModal.isSuspending ? (
                <AlertTriangle size={32} />
              ) : (
                <CheckCircle2 size={32} />
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {confirmModal.isSuspending
                ? "ยืนยันการระงับบัญชี?"
                : "ยืนยันการคืนสิทธิ์?"}
            </h3>
            <p className="text-slate-500 text-sm mb-6 px-2">
              {confirmModal.isSuspending
                ? "บัญชีนี้จะไม่สามารถเข้าสู่ระบบและทำรายการใดๆ ได้อีก จนกว่าจะมีการคืนสิทธิ์"
                : "บัญชีนี้จะสามารถกลับมาเข้าสู่ระบบและใช้งานได้ตามปกติ"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal({ ...confirmModal, isOpen: false })
                }
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm ${
                  confirmModal.isSuspending
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal ยืนยันการรีเซ็ตรหัสผ่าน */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-100 text-blue-600">
              <KeyRound size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              ยืนยันการรีเซ็ตรหัสผ่าน?
            </h3>
            <p className="text-slate-500 text-sm mb-6 px-2">
              รหัสผ่านของผู้ใช้งานรายนี้จะถูกเปลี่ยนกลับไปเป็น
              <span className="font-bold text-slate-800 mx-1">123456</span>
              คุณแน่ใจหรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setResetPasswordModal({ isOpen: false, userId: null })
                }
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmResetPassword}
                className="flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm bg-blue-600 hover:bg-blue-700"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่มผู้ใช้งาน (โค้ดเหมือนเดิมทุกประการ) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                เพิ่มผู้ใช้งานใหม่
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                  placeholder="เช่น IT002"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  required
                  minLength={6} // 🌟 เพิ่มตรงนี้
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                  placeholder="กำหนดรหัสผ่านเบื้องต้น (ขั้นต่ำ 6 ตัวอักษร)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  แผนก (Department)
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all font-medium text-slate-700"
                >
                  <option value="IT">ไอที (IT)</option>
                  <option value="Electrical">ช่างไฟฟ้า (Electrical)</option>
                  <option value="HR">บุคคล (HR)</option>
                  <option value="General">ทั่วไป (General)</option>
                  <option value="Accounting">บัญชี/การเงิน (Finance)</option>
                  <option value="Warehouse">คลังสินค้า (Warehouse)</option>
                  <option value="Purchasing">จัดซื้อ (Purchasing)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>

              {!isSpecialDept ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    เลือกระดับสิทธิ์ในแผนก
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Requester"
                        checked={formData.role === "Requester"}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        พนักงานทั่วไป (ขอซื้อได้อย่างเดียว)
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Head"
                        checked={formData.role === "Head"}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        หัวหน้าแผนก (อนุมัติ PR ได้)
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    เลือกระดับสิทธิ์สำหรับแผนกที่ทำเอกสาร
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        // ตั้งชื่อ Role ตามแผนก เช่น Finance, Purchaser, Receiver
                        value={
                          formData.department === "Accounting"
                            ? "Finance"
                            : formData.department === "Purchasing"
                              ? "Purchaser"
                              : formData.department === "Warehouse"
                                ? "Receiver"
                                : "Admin"
                        }
                        checked={!formData.role.includes("Head")} // ถ้าไม่มีคำว่า Head ให้ถือว่าเป็นพนักงานทั่วไป
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        พนักงานเฉพาะทาง (ทำเอกสารได้อย่างเดียว)
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        // เติมคำว่า _Head ต่อท้าย เช่น Finance_Head, Purchaser_Head
                        value={
                          formData.department === "Accounting"
                            ? "Finance_Head"
                            : formData.department === "Purchasing"
                              ? "Purchaser_Head"
                              : formData.department === "Warehouse"
                                ? "Receiver_Head"
                                : "Admin"
                        }
                        checked={formData.role.includes("Head")} // ถ้ามีคำว่า Head แสดงว่าเป็นหัวหน้า
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        หัวหน้าแผนกเฉพาะทาง (ทำเอกสาร + อนุมัติ PR ได้)
                      </span>
                    </label>
                  </div>
                </div>
              )}
              {/* เพิ่ม Modal สำหรับแจ้งเตือนว่าข้อมูลซ้ำ */}
              {openConfirmDuplicateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
                    {/* ใส่เนื้อหาแจ้งเตือนตรงนี้ */}
                    <h3 className="text-xl font-bold text-rose-600 mb-2">
                      ข้อมูลซ้ำ!
                    </h3>
                    <p className="text-slate-600 mb-6">
                      มีผู้ใช้งานชื่อนี้อยู่ในระบบแล้ว
                    </p>
                    <button
                      onClick={() => setOpenConfirmDuplicateModal(false)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoading ? "กำลังบันทึก..." : "ยืนยันการเพิ่ม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
