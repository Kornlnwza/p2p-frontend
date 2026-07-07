import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  PackageCheck,
  CreditCard,
  LogOut,
  Bell,
  Menu,
  Users,
  Layers,
  Store,
  Box,
  ChevronDown, // ไอคอนลูกศรสำหรับ Dropdown
  KeyRound, // ไอคอนกุญแจสำหรับเปลี่ยนรหัส
  History,
} from "lucide-react";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 🌟 State สำหรับเปิด/ปิด Dropdown มุมขวาบน
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("currentUser");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.department?.toLowerCase() === "admin";
  const role = currentUser?.role;
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  const getDepartmentName = (dept: string) => {
    switch (dept?.toLowerCase()) {
      case "admin":
        return "ผู้ดูแลระบบ (Admin)";
      case "it":
        return "เทคโนโลยีสารสนเทศ (IT)";
      case "warehouse":
        return "คลังสินค้า (Warehouse)";
      case "finance":
        return "บัญชี/การเงิน (Finance)";
      case "purchasing":
        return "จัดซื้อ (Purchasing)";
      default:
        return dept || "พนักงานทั่วไป";
    }
  };

  const menuItems = [
    { path: "/", name: "Dashboard", icon: LayoutDashboard },
    {
      path: "/pr/list",
      name: "PR (ขอซื้อ)",
      icon: FileText,
      allowedRoles: [
        "Requester",
        "Head",
        "Purchaser",
        "Receiver",
        "Finance",
        "Admin",
        "Purchaser_Head",
        "Receiver_Head",
        "Finance_Head",
      ],
    },
    {
      path: "/po/list",
      name: "PO (สั่งซื้อ)",
      icon: ShoppingCart,
      allowedRoles: ["Purchaser", "Admin", "Purchaser_Head"],
    },
    {
      path: "/gr/list",
      name: "GR (รับของ)",
      icon: PackageCheck,
      allowedRoles: ["Receiver", "Finance", "Admin", "Receiver_Head"],
    },
    {
      path: "/ap/list",
      name: "AP (ตั้งหนี้)",
      icon: CreditCard,
      allowedRoles: ["Finance", "Admin", "Finance_Head"],
    },
  ];

  const adminMenuItems = [
    { path: "/admin/users", name: "จัดการผู้ใช้งาน", icon: Users },
    { path: "/admin/categories", name: "จัดการหมวดหมู่", icon: Layers },
    { path: "/admin/vendors", name: "จัดการผู้ขาย", icon: Store },
    { path: "/admin/products", name: "จัดการสินค้า", icon: Box },
    { path: "/admin/logs", name: "ประวัติระบบ (Audit Log)", icon: History },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  // 🌟 ฟังก์ชัน: ถ้าเปิด Dropdown ไว้ แล้วเอาเมาส์ไปคลิกที่อื่น ให้มันปิดอัตโนมัติ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-white transition-all duration-300 flex-col shadow-2xl z-20 hidden md:flex`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0">
          <h1
            className={`font-black text-xl tracking-tight text-white transition-all ${!isSidebarOpen && "hidden"}`}
          >
            <span className="text-blue-500">P2P</span> System
          </h1>
          {!isSidebarOpen && (
            <span className="font-black text-blue-500 text-xl">P2P</span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.allowedRoles && !item.allowedRoles.includes(role)) {
              return null;
            }
            const isActive =
              location.pathname === item.path ||
              (location.pathname.startsWith(item.path.split("/")[1]) &&
                item.path !== "/");

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-white" : ""} />
                <span className={`font-medium ${!isSidebarOpen && "hidden"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div
                className={`mt-6 mb-2 px-3 text-xs font-black text-slate-500 uppercase tracking-wider ${!isSidebarOpen && "hidden"}`}
              >
                ส่วนผู้ดูแลระบบ (Master Data)
              </div>
              {adminMenuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon
                      size={20}
                      className={isActive ? "text-white" : ""}
                    />
                    <span
                      className={`font-medium ${!isSidebarOpen && "hidden"}`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        {/* 🌟 ปุ่ม Logout ตรงนี้ถูกลบออกไปแล้ว */}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 relative">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:text-slate-800 hidden md:block"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {/* 🌟 ส่วน Profile และ Dropdown ขวาบน */}
            <div className="relative" ref={dropdownRef}>
              {/* ปุ่มกดเปิด Dropdown */}
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 uppercase">
                  {currentUser?.username?.substring(0, 2) || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-slate-700 leading-tight">
                    {currentUser?.username || "ไม่ระบุชื่อ"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {getDepartmentName(currentUser?.department)}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* เมนู Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2">
                  {/* แสดงชื่อสำหรับหน้าจอมือถือ */}
                  <div className="px-4 py-3 border-b border-slate-100 mb-2 sm:hidden">
                    <p className="text-sm font-bold text-slate-700">
                      {currentUser?.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getDepartmentName(currentUser?.department)}
                    </p>
                  </div>

                  {/* 🌟 ปุ่มเปลี่ยนรหัสผ่าน (เดี๋ยวเราค่อยสร้าง Modal ไว้หน้าบ้าน) */}
                  <button
                    onClick={() => {
                      setIsChangePassOpen(true); // เปิด Modal
                      setIsProfileOpen(false); // ปิด Dropdown เมนูหลัก
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                  >
                    <KeyRound size={18} /> เปลี่ยนรหัสผ่าน
                  </button>

                  <div className="h-px bg-slate-100 my-2"></div>

                  {/* 🌟 ปุ่ม Logout ย้ายมาอยู่นี่แล้ว */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors font-semibold"
                  >
                    <LogOut size={18} /> ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* พื้นที่แสดงผล */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 relative">
          <Outlet />
        </main>
      </div>
      {/* Modal เปลี่ยนรหัสผ่าน */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <KeyRound size={20} /> เปลี่ยนรหัสผ่าน
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const oldPass = (form[0] as HTMLInputElement).value;
                const newPass = (form[1] as HTMLInputElement).value;

                try {
                  // ยิง API ที่เราทำไว้ใน authController.ts
                  await api.post("/auth/change-password", {
                    user_id: currentUser.userId,
                    oldPassword: oldPass,
                    newPassword: newPass,
                  });
                  toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");
                  setIsChangePassOpen(false);
                } catch (err: unknown) {
                  // 🌟 ทำการ Cast type ให้ปลอดภัยตามมาตรฐาน TypeScript
                  const error = err as {
                    response?: { data?: { message?: string } };
                  };
                  toast.error(
                    error.response?.data?.message || "เปลี่ยนรหัสไม่สำเร็จ",
                  );
                }
              }}
              className="space-y-4"
            >
              <input
                type="password"
                placeholder="รหัสผ่านเดิม"
                className="w-full p-3 border border-slate-200 rounded-xl"
                required
              />
              <input
                type="password"
                placeholder="รหัสผ่านใหม่"
                className="w-full p-3 border border-slate-200 rounded-xl"
                required
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePassOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
