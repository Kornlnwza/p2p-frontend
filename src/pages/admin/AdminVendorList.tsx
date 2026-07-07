import { useState, useEffect, useMemo } from "react";
import {
  Store,
  Plus,
  Search,
  Edit,
  Power,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useDebounce } from "../../hook/useDebounce";

interface Vendor {
  vendor_id: number;
  vendor_name: string;
  tax_id: string;
  contact_person: string;
  phone_number: string;
  email: string;
  address: string;
  is_active: boolean;
}

export default function AdminVendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // 🌟 Search & Debounce
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 🌟 ใช้แยกแยกการ เพิ่ม/แก้ไข
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    vendorId: number | null;
    isSuspending: boolean;
  }>({ isOpen: false, vendorId: null, isSuspending: true });

  const initialFormState = {
    vendor_id: 0,
    vendor_name: "",
    tax_id: "",
    contact_person: "",
    phone_number: "",
    email: "",
    address: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Data
  const fetchVendors = async () => {
    try {
      const response = await api.get("/vendors");
      setVendors(response.data);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลผู้ขายได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVendors();
  }, []);

  // Filter Data (ใช้ debouncedSearchTerm)
  const filteredVendors = useMemo(() => {
    if (!debouncedSearchTerm) return vendors;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendor_name.toLowerCase().includes(lowerSearch) ||
        v.tax_id.includes(lowerSearch) ||
        (v.contact_person &&
          v.contact_person.toLowerCase().includes(lowerSearch)),
    );
  }, [debouncedSearchTerm, vendors]);

  // Handle Form Submit (รองรับทั้ง Create และ Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/vendors/${formData.vendor_id}`, formData);
        toast.success("อัปเดตข้อมูลผู้ขายสำเร็จ!");
      } else {
        await api.post("/vendors", formData);
        toast.success("เพิ่มผู้ขายรายใหม่สำเร็จ!");
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (error: unknown) {
      setIsSubmitLoading(false);
      if (error instanceof Error && "response" in error) {
        const err = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (err.response?.status === 409) {
          setDuplicateModalOpen(true);
        } else {
          toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
        }
      } else {
        toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Handle Edit Click
  const openEditModal = (vendor: Vendor) => {
    setFormData(vendor);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Handle Add Click
  const openAddModal = () => {
    setFormData(initialFormState);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Toggle Status (Optimistic Update)
  const toggleVendorStatus = async () => {
    if (!confirmModal.vendorId) return;

    // 1. เปลี่ยนหน้าจอทันที
    setVendors((prev) =>
      prev.map((v) =>
        v.vendor_id === confirmModal.vendorId
          ? { ...v, is_active: !confirmModal.isSuspending }
          : v,
      ),
    );
    setConfirmModal({ isOpen: false, vendorId: null, isSuspending: true });

    // 2. ยิง API หลังบ้าน
    try {
      await api.put(`/vendors/${confirmModal.vendorId}/status`, {
        is_active: !confirmModal.isSuspending,
      });
      toast.success(
        confirmModal.isSuspending
          ? "ระงับผู้ขายสำเร็จ"
          : "เปิดใช้งานผู้ขายสำเร็จ",
      );
    } catch {
      toast.error("เปลี่ยนสถานะไม่สำเร็จ ดึงข้อมูลใหม่...");
      fetchVendors();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="text-blue-600" /> ทะเบียนผู้ขาย (Vendors)
          </h1>
          <p className="text-slate-500 mt-1">
            จัดการข้อมูลคู่ค้า ที่อยู่ติดต่อ และเลขประจำตัวผู้เสียภาษี
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-72">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อบริษัท, Tax ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow text-sm"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">เพิ่มผู้ขายใหม่</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6">ชื่อบริษัท / ผู้ขาย</th>
                <th className="p-4">เลขประจำตัวผู้เสียภาษี</th>
                <th className="p-4">ผู้ติดต่อ (Contact)</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-right pr-6">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-slate-400 animate-pulse"
                  >
                    กำลังโหลดข้อมูลผู้ขาย...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ขายในระบบ
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.vendor_id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-700">
                        {vendor.vendor_name}
                      </div>
                      {vendor.address && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 max-w-[200px] truncate">
                          <MapPin size={12} /> {vendor.address}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {vendor.tax_id || "-"}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">
                        {vendor.contact_person || "-"}
                      </div>
                      {vendor.phone_number && ( // 🌟 เปลี่ยนตรงนี้
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Phone size={12} /> {vendor.phone_number}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                          vendor.is_active !== false
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {vendor.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit size={18} />
                        </button>
                        {vendor.is_active !== false ? (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                vendorId: vendor.vendor_id,
                                isSuspending: true,
                              })
                            }
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ระงับการใช้งาน"
                          >
                            <Power size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                vendorId: vendor.vendor_id,
                                isSuspending: false,
                              })
                            }
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="เปิดใช้งาน"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Store className="text-blue-600" />
                {isEditMode ? "แก้ไขข้อมูลผู้ขาย" : "เพิ่มผู้ขายรายใหม่"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    ชื่อบริษัท / ผู้ขาย *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_name: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="เช่น JIB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    เลขประจำตัวผู้เสียภาษี (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_id: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="เลข 13 หลัก"
                    maxLength={13}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    ชื่อผู้ติดต่อ (Contact Person)
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_person: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="เช่น คุณสมชาย"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number} // เปลี่ยนเป็น phone_number ให้ตรงกับ DB
                    onChange={(e) => {
                      // กรองเอาเฉพาะตัวเลข 0-9
                      const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, phone_number: onlyNums });
                    }}
                    maxLength={10}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="08XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    ที่อยู่ (Address)
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={3}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 mt-8 border-t pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95"
                >
                  {isSubmitLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: แจ้งเตือนข้อมูลซ้ำ (Duplicate) */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-rose-600 mb-2">
              ข้อมูลผู้ขายซ้ำ!
            </h3>
            <p className="text-slate-600 mb-6">
              มีผู้ขายชื่อนี้ หรือ Tax ID นี้อยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง
            </p>
            <button
              onClick={() => setDuplicateModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Modal: ยืนยันระงับ/เปิดใช้งาน */}
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
                ? "ยืนยันการระงับผู้ขาย?"
                : "ยืนยันการเปิดใช้งาน?"}
            </h3>
            <p className="text-slate-500 text-sm mb-6 px-2">
              {confirmModal.isSuspending
                ? "หากระงับแล้ว จะไม่สามารถออกเอกสาร PO ใหม่ให้กับผู้ขายรายนี้ได้ชั่วคราว"
                : "ผู้ขายรายนี้จะสามารถกลับมารับงานและเปิด PO ได้ตามปกติ"}
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
                onClick={toggleVendorStatus}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 ${
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
    </div>
  );
}
