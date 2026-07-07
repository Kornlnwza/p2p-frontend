import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Plus,
  X,
  MoveRight,
  CheckSquare,
  Search,
  PackageOpen,
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

interface Product {
  product_code: string;
  product_name: string;
  standard_price: number;
  sub_cat_id: number;
  sub_category_name?: string;
}

export default function AdminProductList() {
  // ==========================================
  // 📌 States
  // ==========================================
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    productCode: "",
    productName: "",
  });

  // Modal เพิ่มสินค้า
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    standard_price: "",
    sub_cat_id: "",
  });

  // ระบบ Bulk Update (ย้ายหมวดหมู่หลายรายการ)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [targetSubCatId, setTargetSubCatId] = useState("");

  // 🌟 Modal ประวัติการแก้ไข (Audit Log)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // ==========================================
  // 📌 Functions
  // ==========================================
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error(error);
      toast.error("โหลดข้อมูลสินค้าหรือหมวดหมู่ไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // เพิ่มสินค้า
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/products", {
        ...formData,
        sub_cat_id: Number(formData.sub_cat_id),
      });
      toast.success("เพิ่มสินค้าสำเร็จ!");
      setIsModalOpen(false);
      setFormData({
        product_code: "",
        product_name: "",
        standard_price: "",
        sub_cat_id: "",
      });
      fetchData();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มสินค้า (รหัสอาจซ้ำ)");
    } finally {
      setIsLoading(false);
    }
  };

  // ลบสินค้า
  const executeDelete = async () => {
    setIsLoading(true);
    try {
      await api.delete(
        `/products/${encodeURIComponent(deleteModal.productCode)}`,
      );
      toast.success("ลบข้อมูลสำเร็จ!");
      setDeleteModal({ isOpen: false, productCode: "", productName: "" });
      fetchData();
    } catch (error: unknown) {
      if (error instanceof Error && "response" in error) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || "ลบข้อมูลไม่สำเร็จ");
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // กรองสินค้าตามคำค้นหา
  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sub_category_name &&
        p.sub_category_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // จัดการ Checkbox
  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.product_code));
    }
  };

  const handleSelectOne = (code: string) => {
    if (selectedProducts.includes(code)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== code));
    } else {
      setSelectedProducts([...selectedProducts, code]);
    }
  };

  // ย้ายหมวดหมู่ทีละหลายรายการ
  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubCatId) return toast.error("กรุณาเลือกหมวดหมู่ปลายทาง");

    setIsLoading(true);
    try {
      await api.put("/products/bulk-update-category", {
        product_codes: selectedProducts,
        new_sub_cat_id: Number(targetSubCatId),
      });
      toast.success(`ย้ายหมวดหมู่ ${selectedProducts.length} รายการสำเร็จ!`);
      setIsBulkModalOpen(false);
      setSelectedProducts([]);
      setTargetSubCatId("");
      fetchData();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการย้ายหมวดหมู่");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 📌 Render UI
  // ==========================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 🌟 Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Box className="text-blue-600" /> จัดการข้อมูลสินค้า
          </h1>
          <p className="text-slate-500 mt-1">
            เพิ่ม แก้ไข และย้ายหมวดหมู่สินค้าในระบบ
          </p>
        </div>

        <div className="flex flex-wrap w-full xl:w-auto gap-3">
          {/* ช่องค้นหา */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-medium"
            />
          </div>

          {selectedProducts.length > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-sm animate-in fade-in active:scale-95 whitespace-nowrap"
            >
              <MoveRight size={20} /> ย้ายหมวดหมู่ ({selectedProducts.length})
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus size={20} /> เพิ่มสินค้า
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <History size={20} /> ประวัติสินค้า
          </button>
        </div>
      </div>

      {/* 🌟 Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProducts.length === filteredProducts.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">รหัสสินค้า</th>
                <th className="p-4">ชื่อสินค้า</th>
                <th className="p-4">หมวดหมู่ปัจจุบัน</th>
                <th className="p-4 text-right">ราคามาตรฐาน</th>
                <th className="p-4 text-center pr-6">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr
                  key={p.product_code}
                  className={`hover:bg-slate-50 transition-colors ${selectedProducts.includes(p.product_code) ? "bg-blue-50/50" : ""}`}
                >
                  <td className="p-4 pl-6 text-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.product_code)}
                      onChange={() => handleSelectOne(p.product_code)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-mono font-bold text-blue-600">
                    {p.product_code}
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {p.product_name}
                  </td>
                  <td className="p-4">
                    {p.sub_category_name ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        {p.sub_category_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                        ยังไม่ระบุหมวดหมู่
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-600">
                    {Number(p.standard_price).toLocaleString()}
                  </td>
                  <td className="p-4 text-center pr-6">
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          productCode: p.product_code,
                          productName: p.product_name,
                        })
                      }
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ลบข้อมูล"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <PackageOpen
                      size={48}
                      className="mx-auto text-slate-300 mb-3"
                    />
                    <p className="font-medium text-slate-600">
                      {searchTerm
                        ? `ไม่พบสินค้าที่ชื่อหรือรหัสตรงกับ "${searchTerm}"`
                        : "ยังไม่มีข้อมูลสินค้าในระบบ"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* 📌 Modals */}
      {/* ========================================== */}

      {/* 1. Modal ย้ายหมวดหมู่ (Bulk Update) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-amber-500" /> ย้ายสินค้า{" "}
                {selectedProducts.length} ชิ้น
              </h2>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBulkUpdate} className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm text-amber-800 font-medium">
                กำลังดำเนินการย้ายหมวดหมู่ของสินค้าจำนวน{" "}
                <span className="font-bold text-amber-600 text-base">
                  {selectedProducts.length}
                </span>{" "}
                รายการ
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  เลือกหมวดหมู่ปลายทาง <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={targetSubCatId}
                  onChange={(e) => setTargetSubCatId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-slate-700 font-medium"
                >
                  <option value="" disabled>
                    -- กรุณาเลือกหมวดหมู่ย่อย --
                  </option>
                  {categories.map((main) => (
                    <optgroup key={main.main_cat_id} label={`📍 ${main.name}`}>
                      {main.sub_categories?.map((sub) => (
                        <option key={sub.sub_cat_id} value={sub.sub_cat_id}>
                          &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoading ? "กำลังย้าย..." : "ยืนยันการย้าย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal เพิ่มสินค้า */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                เพิ่มสินค้าใหม่
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  รหัสสินค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.product_code}
                  onChange={(e) =>
                    setFormData({ ...formData, product_code: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                  placeholder="เช่น IT-M-001"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ชื่อสินค้า/รายละเอียด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  placeholder="เช่น เมาส์ไร้สาย Logitech"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ราคามาตรฐาน (บาท) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.standard_price}
                  onChange={(e) =>
                    setFormData({ ...formData, standard_price: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  หมวดหมู่ย่อย <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.sub_cat_id}
                  onChange={(e) =>
                    setFormData({ ...formData, sub_cat_id: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-slate-700 font-medium"
                >
                  <option value="" disabled>
                    -- เลือกหมวดหมู่ย่อย --
                  </option>
                  {categories.map((main) => (
                    <optgroup key={main.main_cat_id} label={`📍 ${main.name}`}>
                      {main.sub_categories?.map((sub) => (
                        <option key={sub.sub_cat_id} value={sub.sub_cat_id}>
                          &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
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
                  {isLoading ? "กำลังบันทึก..." : "บันทึกสินค้า"}
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
              ยืนยันการลบข้อมูล?
            </h3>
            <p className="text-slate-500 text-sm mb-6 px-2">
              คุณต้องการลบสินค้า{" "}
              <span className="font-bold text-rose-600">
                {deleteModal.productName}
              </span>{" "}
              ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    productCode: "",
                    productName: "",
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

      {/* 🌟 4. Modal ประวัติการแก้ไข (Item History) */}
      <ItemHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        tableName="products"
        title="ประวัติการจัดการข้อมูลสินค้า"
      />
    </div>
  );
}
