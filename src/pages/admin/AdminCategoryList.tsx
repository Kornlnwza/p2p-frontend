import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  X,
  Tag,
  Trash2,
  AlertTriangle,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import ItemHistoryModal from "../../components/ItemHistoryModal";

// ==========================================
// 📌 Interfaces
// ==========================================
interface SubCategory {
  sub_cat_id: number;
  main_cat_id: number;
  name: string;
}

interface Category {
  main_cat_id: number;
  name: string;
  sub_categories: SubCategory[];
}

export default function AdminCategoryList() {
  // ==========================================
  // 📌 States
  // ==========================================
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // States สำหรับปุ่ม Dropdown และประวัติ
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMainHistoryOpen, setIsMainHistoryOpen] = useState(false);
  const [isSubHistoryOpen, setIsSubHistoryOpen] = useState(false);

  // States สำหรับ Modal เพิ่มหมวดหมู่หลัก
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [mainName, setMainName] = useState("");

  // States สำหรับ Modal เพิ่มหมวดหมู่ย่อย
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [selectedMainCatId, setSelectedMainCatId] = useState<number | "">("");

  // State สำหรับ Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "main" | "sub";
    id: number;
    name: string;
  }>({
    isOpen: false,
    type: "main",
    id: 0,
    name: "",
  });

  // ==========================================
  // 📌 Functions
  // ==========================================
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถดึงข้อมูลหมวดหมู่ได้");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  // สร้างหมวดหมู่หลัก
  const handleCreateMain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/categories/main", { name: mainName });
      toast.success("เพิ่มหมวดหมู่หลักสำเร็จ!");
      setIsMainModalOpen(false);
      setMainName("");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการสร้างหมวดหมู่หลัก");
    } finally {
      setIsLoading(false);
    }
  };

  // สร้างหมวดหมู่ย่อย
  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMainCatId) {
      return toast.error("กรุณาเลือกหมวดหมู่หลัก");
    }

    setIsLoading(true);
    try {
      await api.post("/categories/sub", {
        main_cat_id: selectedMainCatId,
        name: subName,
      });
      toast.success("เพิ่มหมวดหมู่ย่อยสำเร็จ!");
      setIsSubModalOpen(false);
      setSubName("");
      setSelectedMainCatId("");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการสร้างหมวดหมู่ย่อย");
    } finally {
      setIsLoading(false);
    }
  };

  // ลบหมวดหมู่
  const executeDelete = async () => {
    setIsLoading(true);
    try {
      if (deleteModal.type === "main") {
        await api.delete(`/categories/main/${deleteModal.id}`);
      } else {
        await api.delete(`/categories/sub/${deleteModal.id}`);
      }

      toast.success("ลบหมวดหมู่สำเร็จ!");
      setDeleteModal({ isOpen: false, type: "main", id: 0, name: "" });
      fetchCategories();
    } catch (error: unknown) {
      if (error instanceof Error && "response" in error) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(
          err.response?.data?.message ||
            "ไม่สามารถลบได้ (อาจมีข้อมูลอ้างอิงอยู่)",
        );
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 📌 Render UI
  // ==========================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 🌟 Header & ปุ่มเครื่องมือ */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-rose-500" /> จัดการหมวดหมู่สินค้า
          </h1>
          <p className="text-slate-500 mt-1">
            เพิ่ม/แก้ไข และลบ หมวดหมู่หลักและหมวดหมู่ย่อย
          </p>
        </div>

        <div className="flex flex-wrap w-full xl:w-auto gap-3">
          <button
            onClick={() => setIsMainModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} /> หมวดหมู่หลัก
          </button>

          <button
            onClick={() => setIsSubModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} /> หมวดหมู่ย่อย
          </button>

          {/* ปุ่ม Dropdown สำหรับดูประวัติ */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <History size={20} /> ดูประวัติการแก้ไข
            </button>

            {/* เมนู Dropdown */}
            {isDropdownOpen && (
              <>
                {/* Overlay พื้นหลังใสคลิกเพื่อปิด */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsDropdownOpen(false)}
                ></div>

                <div className="absolute right-0 top-14 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-40 min-w-[200px] w-full sm:w-auto animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsMainHistoryOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                  >
                    ประวัติหมวดหมู่หลัก
                  </button>
                  <button
                    onClick={() => {
                      setIsSubHistoryOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                  >
                    ประวัติหมวดหมู่ย่อย
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 รายการหมวดหมู่ (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((main) => (
          <div
            key={main.main_cat_id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* หัวข้อหมวดหมู่หลัก */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center group/main">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-lg">
                  {main.name}
                </h2>
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border shadow-sm">
                  ID: {main.main_cat_id}
                </span>
              </div>
              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: true,
                    type: "main",
                    id: main.main_cat_id,
                    name: main.name,
                  })
                }
                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover/main:opacity-100"
                title="ลบหมวดหมู่หลัก"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* ป้ายหมวดหมู่ย่อย */}
            <div className="p-5">
              {main.sub_categories && main.sub_categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {main.sub_categories.map((sub) => (
                    <span
                      key={sub.sub_cat_id}
                      className="inline-flex items-center gap-1.5 pl-3 pr-8 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-sm font-medium border border-rose-100 relative group/sub"
                    >
                      <Tag size={14} /> {sub.name}
                      <button
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            type: "sub",
                            id: sub.sub_cat_id,
                            name: sub.name,
                          })
                        }
                        className="absolute right-1.5 p-1 text-rose-300 hover:text-rose-600 rounded transition-all opacity-0 group-hover/sub:opacity-100"
                        title="ลบหมวดหมู่ย่อย"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  ยังไม่มีหมวดหมู่ย่อย
                </p>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <Layers size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              ยังไม่มีข้อมูลหมวดหมู่ในระบบ
            </p>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 📌 Modals */}
      {/* ========================================== */}

      {/* 1. Modal เพิ่มหมวดหมู่หลัก */}
      {isMainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                เพิ่มหมวดหมู่หลัก (Main)
              </h2>
              <button
                onClick={() => setIsMainModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateMain} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ชื่อหมวดหมู่หลัก
                </label>
                <input
                  type="text"
                  required
                  value={mainName}
                  onChange={(e) => setMainName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  placeholder="เช่น อุปกรณ์ไอที"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMainModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal เพิ่มหมวดหมู่ย่อย */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                เพิ่มหมวดหมู่ย่อย (Sub)
              </h2>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateSub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  เลือกหมวดหมู่หลัก <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedMainCatId}
                  onChange={(e) => setSelectedMainCatId(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                >
                  <option value="" disabled>
                    -- กรุณาเลือก --
                  </option>
                  {categories.map((main) => (
                    <option key={main.main_cat_id} value={main.main_cat_id}>
                      {main.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ชื่อหมวดหมู่ย่อย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  placeholder="เช่น เมาส์และคีย์บอร์ด"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal ยืนยันการลบ */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              ยืนยันการลบหมวดหมู่{deleteModal.type === "main" ? "หลัก" : "ย่อย"}
              ?
            </h3>
            <p className="text-slate-500 text-sm mb-6 px-2">
              คุณต้องการลบหมวดหมู่{" "}
              <span className="font-bold text-rose-600">
                {deleteModal.name}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    type: "main",
                    id: 0,
                    name: "",
                  })
                }
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modals ประวัติการแก้ไข (Item History) */}
      <ItemHistoryModal
        isOpen={isMainHistoryOpen}
        onClose={() => setIsMainHistoryOpen(false)}
        tableName="main_category"
        title="ประวัติการแก้ไขหมวดหมู่หลัก"
      />
      <ItemHistoryModal
        isOpen={isSubHistoryOpen}
        onClose={() => setIsSubHistoryOpen(false)}
        tableName="sub_category"
        title="ประวัติการแก้ไขหมวดหมู่ย่อย"
      />
    </div>
  );
}
