import { useState } from "react";
import { X, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number; // รับ userId มาจาก Layout
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  userId,
}: Props) {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword)
      return toast.error("รหัสผ่านใหม่ไม่ตรงกัน");

    setIsLoading(true);
    try {
      await api.post("/auth/change-password", {
        user_id: userId,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");
      onClose();
    } catch {
      toast.error("รหัสผ่านเดิมไม่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <KeyRound size={20} /> เปลี่ยนรหัสผ่าน
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="รหัสผ่านเดิม"
            className="w-full p-3 border rounded-xl"
            onChange={(e) =>
              setFormData({ ...formData, oldPassword: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="รหัสผ่านใหม่"
            className="w-full p-3 border rounded-xl"
            onChange={(e) =>
              setFormData({ ...formData, newPassword: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่านใหม่"
            className="w-full p-3 border rounded-xl"
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
          >
            บันทึก
          </button>
        </form>
      </div>
    </div>
  );
}
