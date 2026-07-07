import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
  }, []);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      return toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", {
        position: "bottom-right",
      });
    }

    try {
      // 🌟 1. ยิงข้อมูลไปตรวจสอบที่ Back-end
      const response = await api.post("/auth/login", {
        username: username,
        password: password,
      });

      if (response.status === 200) {
        toast.success(
          `เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับคุณ ${response.data.user.username}`,
          {
            position: "bottom-right",
          },
        );

        // 🌟 2. เก็บข้อมูลผู้ใช้ (กุญแจ) ลงในเครื่อง
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("currentUser", JSON.stringify(response.data.user));

        // 🌟 3. เด้งไปหน้า Dashboard
        navigate("/");
      }
    } catch (error: unknown) {
      // 1. ตรวจสอบก่อนว่าเป็น Error Object จริงไหม และมี response จาก API หรือไม่
      if (error instanceof Error && "response" in error) {
        // 2. ถ้าใช่ ให้แปลง type (cast) เพื่อให้ TypeScript อ่านค่าข้างในได้
        const err = error as { response?: { data?: { message?: string } } };

        // 3. แสดงข้อความจาก Backend (ถ้ามี) หรือแสดงข้อความ default
        toast.error(
          err.response?.data?.message || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง",
        );
      } else {
        // 4. กรณีที่เป็น error อื่นๆ (เช่น เน็ตหลุด)
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
    }
  };
  return (
    // 🌟 ปรับ Background ให้มีลูกเล่น Gradient หรูหราขึ้น
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      {/* 🌟 ปรับ Card ให้มีกรอบบางๆ และ Shadow ที่นุ่มขึ้น */}
      <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-10 mt-4">
          <div className="p-4 mb-5 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Procure-to-Pay (P2P)
          </h2>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            กรุณาเข้าสู่ระบบเพื่อจัดการเอกสารของคุณ
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700">
              รหัสพนักงาน
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <User className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-3 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 font-medium"
                placeholder="เช่น IT001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700">
              รหัสผ่าน
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 font-bold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
