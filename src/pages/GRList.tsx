import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom"; // 🌟 1. เพิ่ม useNavigate
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  FileCheck,
  PackageOpen,
  Eye,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import { useDebounce } from "../hook/useDebounce";
import AuditTimeline from "../components/AduitTimeline";

import type { GRHeader, GRDetailItem } from "../types";
import { useAuth } from "../hook/useAuth";

export default function GRListPage() {
  const navigate = useNavigate();
  // 🌟 2. ใช้ Hook แทน localStorage
  const { userRole } = useAuth();

  const [grList, setGrList] = useState<GRHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);

  // States สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGRNo, setSelectedGRNo] = useState("");
  const [selectedItems, setSelectedItems] = useState<GRDetailItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  useEffect(() => {
    const fetchGRList = async () => {
      try {
        const res = await api.get("/gr", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        setGrList(res.data);
      } catch {
        toast.error("ไม่สามารถดึงข้อมูลใบรับของได้");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGRList();
  }, []);
  // Logic ค้นหาและกรองข้อมูล
  const filteredList = useMemo(() => {
    let result = grList;
    if (statusFilter !== "All")
      result = result.filter(
        (gr) => gr.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (gr) =>
          gr.gr_no.toLowerCase().includes(lowerSearch) ||
          gr.po_no.toLowerCase().includes(lowerSearch),
      );
    }
    return result.sort((a, b) => b.gr_no.localeCompare(a.gr_no));
  }, [debouncedSearchTerm, statusFilter, grList]);

  // Logic คำนวณตัดหน้า (Pagination)
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleViewDetails = async (gr_no: string) => {
    setSelectedGRNo(gr_no);
    setIsModalOpen(true);
    setIsItemsLoading(true); // 2. เริ่มโหลด
    setSelectedItems([]);

    try {
      const response = await api.get(`/gr/${gr_no}`);

      // 3. กันเคส Race Condition: เช็คว่า GR_No ที่โหลดมา ตรงกับที่กดล่าสุดไหม
      setSelectedGRNo((prev) => {
        if (prev !== gr_no) return prev; // ถ้าเปลี่ยนหน้าไปแล้ว ให้หยุดทำงาน
        setSelectedItems(response.data.items || []);
        return prev;
      });
    } catch {
      toast.error("ดึงข้อมูลรายละเอียดไม่สำเร็จ");
    } finally {
      setIsItemsLoading(false); // 4. เลิกโหลด
    }
  };

  // ป้ายสถานะ
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "invoiced":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 shadow-sm">
            <FileCheck size={14} className="text-purple-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "received":
      case "completed":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "cancelled":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 shadow-sm">
            <XCircle size={14} className="text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "pending":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <CheckCircle2 size={14} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-blue-600" /> รายการใบรับของ (GR
              List)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ตรวจสอบประวัติการรับสินค้าเข้าคลัง และนำเลข GR ไปตั้งหนี้
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 🌟 2. ถ้าเป็น Admin หรือ Receiver ถึงจะเห็นปุ่มสร้าง GR */}
            {(userRole === "Admin" || userRole === "Receiver") && (
              <Link
                to="/gr/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition text-sm"
              >
                <Plus size={18} /> รับสินค้าเข้าคลัง (สร้าง GR)
              </Link>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ GR, อ้างอิง PO..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <Filter size={16} />
              <span className="text-sm font-medium">สถานะ:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 min-w-[150px]"
            >
              <option value="All">ทั้งหมด (All)</option>
              <option value="Completed">Completed (เพิ่งรับของ)</option>
              <option value="Invoiced">Invoiced (ตั้งหนี้แล้ว)</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4 font-semibold">เลขที่ใบรับของ (GR)</th>
                  <th className="p-4 font-semibold">วันที่รับของ</th>
                  <th className="p-4 font-semibold">อ้างอิง PO</th>
                  <th className="p-4 font-semibold">ใบส่งของ (DO)</th>
                  <th className="p-4 font-semibold text-center">สถานะ</th>
                  <th className="p-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <PackageOpen
                        size={32}
                        className="mx-auto mb-3 opacity-20"
                      />
                      ไม่พบรายการใบรับสินค้าในระบบ
                    </td>
                  </tr>
                ) : (
                  currentItems.map((gr) => (
                    <tr
                      key={gr.gr_no}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      {/* 1. เลขที่ GR */}
                      <td className="p-4 font-bold text-blue-600">
                        {gr.gr_no}
                      </td>

                      {/* 2. วันที่รับของ */}
                      <td className="p-4 text-slate-600">
                        {new Date(gr.gr_date).toLocaleDateString("th-TH")}
                      </td>

                      {/* 3. อ้างอิง PO */}
                      <td className="p-4 font-medium text-slate-600">
                        {gr.po_no}
                      </td>

                      {/* 4. ใบส่งของ (DO) */}
                      <td className="p-4 text-slate-700 font-medium">
                        {gr.delivery_note_no || "-"}
                      </td>

                      {/* 5. สถานะ (เอา Badge มาวางตรงนี้) */}
                      <td className="p-4 text-center">
                        {renderStatusBadge(gr.status)}
                      </td>

                      {/* ป้ายจัดการ (ของเดิม) */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* 🌟 1. ปุ่มดูรายละเอียด (เพิ่มใหม่) */}
                          <button
                            onClick={() => handleViewDetails(gr.gr_no)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ดูรายละเอียดและประวัติ"
                          >
                            <Eye size={18} />
                          </button>

                          {/* 🌟 2. ปุ่มตั้งหนี้ หรือ ป้ายสถานะ (ของเดิมของคุณ) */}
                          {gr.status.toLowerCase() === "completed" ? (
                            userRole === "Admin" || userRole === "Finance" ? (
                              <button
                                onClick={() =>
                                  navigate(`/ap/create?gr_no=${gr.gr_no}`)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                title="นำใบรับของไปตั้งหนี้"
                              >
                                <FileCheck size={14} /> ตั้งหนี้ (AP)
                              </button>
                            ) : (
                              <span className="text-xs text-amber-500 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg cursor-default">
                                รอการตั้งหนี้
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg cursor-not-allowed">
                              ตั้งหนี้เรียบร้อย
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t bg-slate-50 gap-4">
              <div className="text-sm font-medium text-slate-500">
                แสดง {startIndex + 1} ถึง{" "}
                {Math.min(startIndex + itemsPerPage, filteredList.length)}{" "}
                จากทั้งหมด {filteredList.length} รายการ
              </div>

              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-slate-600">
                  หน้า {currentPage} จาก {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* 🌟 Modal ดูรายละเอียด GR และ Audit Timeline */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-800 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="text-blue-400" />
                  รายละเอียดใบรับของ:{" "}
                  <span className="text-blue-300 ml-1">{selectedGRNo}</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100/80 backdrop-blur-sm sticky top-0 shadow-sm text-xs uppercase tracking-wide text-slate-600 font-bold">
                    <tr>
                      <th className="p-4 pl-6 border-b">รหัสสินค้า</th>
                      <th className="p-4 border-b">รายละเอียด</th>
                      <th className="p-4 border-b text-center">ราคา/หน่วย</th>
                      <th className="p-4 pr-6 border-b text-center text-blue-600">
                        รับเข้าคลัง
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isItemsLoading ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center">
                          กำลังโหลดรายละเอียด...
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((item, index) => (
                        <tr
                          key={item.product_code || `row-${index}`}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-4 pl-6 text-slate-500 font-mono text-sm">
                            {item.product_code || "NON-CAT"}
                          </td>
                          <td className="p-4 text-slate-800 font-medium">
                            {item.description}
                          </td>
                          <td className="p-4 text-center text-slate-600">
                            {Number(item.unit_price).toLocaleString()}
                          </td>
                          <td className="p-4 pr-6 text-center font-bold text-blue-700 bg-blue-50/30">
                            {item.received_qty}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* 🌟 แปะ Audit Timeline ตรงนี้ */}
                <div className="p-6 border-t border-slate-200 bg-white">
                  <h3 className="font-bold text-slate-800 mb-4">
                    ประวัติการดำเนินการ (Audit Timeline)
                  </h3>
                  <AuditTimeline
                    tableName="gr_header"
                    recordId={selectedGRNo}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
