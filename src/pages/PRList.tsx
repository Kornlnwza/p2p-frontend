import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../hook/useAuth";
import { useReactToPrint } from "react-to-print";
import { useDebounce } from "../hook/useDebounce"; // 🌟 ดึง useDebounce มาใช้เหมือน PO
import AuditTimeline from "../components/AduitTimeline"; // 🌟 ดึง AuditTimeline มาใช้ใน Modal

interface PRItem {
  product_code?: string;
  description: string;
  quantity: number;
  unit_price?: number;
  estimated_price?: number;
}

interface PRData {
  pr_no: string;
  department: string;
  required_date: string;
  created_at?: string;
  attachment_url?: string;
  status: string;
  remark?: string;
  items?: PRItem[];
}

export default function PRListPage() {
  const { userRole } = useAuth();

  const [prList, setPrList] = useState<PRData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 ระบบค้นหาและตัวกรอง
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);
  const [statusFilter, setStatusFilter] = useState("All");

  // 🌟 ระบบ Pagination (เหมือนหน้า PO)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // State สำหรับ Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PRData | null>(null);

  // State สำหรับ Print
  const printRef = useRef<HTMLDivElement>(null);
  const [prToPrint, setPrToPrint] = useState<PRData | null>(null);
  const [currentPrintTime, setCurrentPrintTime] = useState("");

  const fetchPRs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/pr", {
        headers: { "Cache-Control": "no-cache" },
      });
      setPrList(response.data);
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "ไม่สามารถดึงข้อมูลรายการใบขอซื้อได้";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPRs();
  }, []);

  const handleUpdateStatus = async (pr_no: string, newStatus: string) => {
    const confirmMessage =
      newStatus === "Approved"
        ? `ยืนยันการอนุมัติ ${pr_no} ใช่หรือไม่?`
        : `ยืนยันการปฏิเสธ ${pr_no} ใช่หรือไม่?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/pr/${pr_no}/status`, { status: newStatus });
      toast.success(`อัปเดตสถานะเป็น ${newStatus} เรียบร้อยแล้ว`);
      fetchPRs();
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ";
      toast.error(errorMessage);
    }
  };

  const handlePrintTrigger = useReactToPrint({
    contentRef: printRef,
    documentTitle: prToPrint ? `PR_${prToPrint.pr_no}` : "PR_Document",
    onAfterPrint: () => setPrToPrint(null),
  });

  const handlePrintClick = async (pr: PRData) => {
    try {
      const response = await api.get(`/pr/${pr.pr_no}`);
      setPrToPrint({ ...pr, items: response.data });
      setCurrentPrintTime(new Date().toLocaleString("th-TH"));
      setTimeout(() => {
        handlePrintTrigger();
      }, 500);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลสำหรับปริ้นต์ได้");
    }
  };

  const handleViewDetail = async (pr: PRData) => {
    try {
      const response = await api.get(`/pr/${pr.pr_no}`);
      setSelectedPR({ ...pr, items: response.data });
      setIsViewModalOpen(true);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลรายละเอียดได้");
    }
  };

  // 🌟 ประมวลผลข้อมูล (ค้นหา + กรอง + จัดเรียง)
  // 🌟 ประมวลผลข้อมูล (ค้นหา + กรอง + จัดเรียง)
  const filteredList = useMemo(() => {
    let result = prList;
    if (statusFilter !== "All") {
      result = result.filter((pr) => pr.status === statusFilter);
    }
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (pr) =>
          pr.pr_no.toLowerCase().includes(lowerSearch) ||
          pr.department.toLowerCase().includes(lowerSearch),
      );
    }

    // ✅ โค้ดจัดเรียงใหม่ตามลำดับสถานะ
    return result.sort((a, b) => {
      // 1. กำหนดลำดับความสำคัญ (ค่าน้อย = อยู่บนสุด)
      const statusPriority: Record<string, number> = {
        pending: 1,
        approved: 2,
        "po created": 3,
        rejected: 4,
        cancelled: 5,
      };

      // ดึงค่า Priority ของสถานะนั้นๆ (ถ้าไม่มีในรายการให้ตกไปอยู่ล่างสุดคือ 99)
      const priorityA = statusPriority[a.status.toLowerCase()] || 99;
      const priorityB = statusPriority[b.status.toLowerCase()] || 99;

      // 2. ถ้า Priority ไม่เท่ากัน ให้เรียงตาม Priority ที่ตั้งไว้
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. ถ้าสถานะเหมือนกัน (เช่น Pending ทั้งคู่) ให้เรียงตามเลข PR จากใหม่ไปเก่า
      return b.pr_no.localeCompare(a.pr_no);
    });
  }, [debouncedSearchTerm, statusFilter, prList]);

  // 🌟 คำนวณหน้า Pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // 🌟 ตกแต่ง Status Badge ให้พรีเมียมเหมือนหน้า PO
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      case "approved":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      case "po created":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      case "rejected":
      case "cancelled":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-amber-500" /> รายการใบขอซื้อ (PR)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              จัดการรายการขอเบิกงบประมาณและสั่งซื้อสินค้าภายในบริษัท
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/pr/create"
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all text-sm"
            >
              + สร้างใบขอซื้อใหม่
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between hover:shadow-md transition-shadow duration-300">
          <div className="relative flex-1 w-full max-w-md">
            <Search
              className="absolute left-3.5 top-3 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ PR, แผนก..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <Filter size={16} />
              <span className="text-sm font-bold">สถานะ:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all min-w-[180px] cursor-pointer"
            >
              <option value="All">ทั้งหมด (All)</option>
              <option value="Pending">Pending (รออนุมัติ)</option>
              <option value="Approved">Approved (อนุมัติแล้ว)</option>
              <option value="Rejected">Rejected (ไม่อนุมัติ)</option>
              <option value="PO Created">PO Created (ออกใบสั่งซื้อแล้ว)</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-5 pl-6 font-bold">เลขที่ PR</th>
                  <th className="p-5 font-bold">แผนกที่ขอ</th>
                  <th className="p-5 font-bold">วันที่ต้องการใช้</th>
                  <th className="p-5 font-bold text-center">ไฟล์แนบ</th>
                  <th className="p-5 font-bold text-center">สถานะ</th>
                  <th className="p-5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                        <p className="font-medium">กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <PackageOpen size={40} className="text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500 text-base">
                          ไม่พบรายการใบขอซื้อในระบบ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((pr) => (
                    <tr
                      key={pr.pr_no}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="p-5 pl-6 font-bold text-amber-600">
                        {pr.pr_no}
                      </td>
                      <td className="p-5 text-slate-700 font-bold">
                        {pr.department}
                      </td>
                      <td className="p-5 text-slate-600 font-medium">
                        {pr.required_date
                          ? new Date(pr.required_date).toLocaleDateString(
                              "th-TH",
                            )
                          : "-"}
                      </td>
                      <td className="p-5 text-center">
                        {pr.attachment_url ? (
                          <a
                            href={`http://localhost:3000/${pr.attachment_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="ดูไฟล์เสนอราคา"
                          >
                            <Paperclip size={18} />
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {renderStatusBadge(pr.status)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(pr)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                            title="ดูรายละเอียด"
                          >
                            <Eye size={20} />
                          </button>

                          <button
                            onClick={() => handlePrintClick(pr)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                            title="พิมพ์ฟอร์มขอซื้อ"
                          >
                            <Printer size={20} />
                          </button>

                          {pr.status === "Pending" &&
                            (userRole === "Admin" || userRole === "Head") && (
                              <>
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(pr.pr_no, "Approved")
                                  }
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-95"
                                  title="อนุมัติเอกสาร"
                                >
                                  <CheckCircle size={20} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(pr.pr_no, "Rejected")
                                  }
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                                  title="ไม่อนุมัติ"
                                >
                                  <XCircle size={20} />
                                </button>
                              </>
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
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-t border-slate-200 bg-slate-50/50 gap-4">
              <div className="text-sm font-medium text-slate-500">
                แสดง{" "}
                <span className="font-bold text-slate-700">
                  {startIndex + 1}
                </span>{" "}
                ถึง{" "}
                <span className="font-bold text-slate-700">
                  {Math.min(startIndex + itemsPerPage, filteredList.length)}
                </span>{" "}
                จากทั้งหมด{" "}
                <span className="font-bold text-slate-700">
                  {filteredList.length}
                </span>{" "}
                รายการ
              </div>

              <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-slate-600">
                  หน้า {currentPage} จาก {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                  >
                    <ChevronLeft size={18} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                  >
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🔍 Modal ดูรายละเอียด PR */}
      {/* ============================================================ */}
      {isViewModalOpen && selectedPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Modal - อิงดีไซน์จาก POList */}
            <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-800 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-amber-400" size={20} />
                รายละเอียดใบขอซื้อ:{" "}
                <span className="text-amber-300 ml-1">{selectedPR.pr_no}</span>
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
              <div className="p-6 space-y-6">
                {/* ข้อมูลทั่วไป */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      แผนกที่ขอ
                    </p>
                    <p className="font-bold text-slate-800 mt-1">
                      {selectedPR.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      วันที่ต้องการใช้
                    </p>
                    <p className="font-bold text-slate-800 mt-1">
                      {selectedPR.required_date
                        ? new Date(selectedPR.required_date).toLocaleDateString(
                            "th-TH",
                          )
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      สถานะ
                    </p>
                    <div className="mt-1">
                      {renderStatusBadge(selectedPR.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      เอกสารอ้างอิง
                    </p>
                    <div className="mt-1">
                      {selectedPR.attachment_url ? (
                        <a
                          href={`http://localhost:3000/${selectedPR.attachment_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Paperclip size={14} /> ดูไฟล์แนบ
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          - ไม่มีไฟล์แนบ -
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      หมายเหตุ / เหตุผลการขอซื้อ (Remark)
                    </p>
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {selectedPR.remark || "-"}
                    </p>
                  </div>
                </div>

                {/* ตารางสินค้า */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-4 pl-6 w-16">ลำดับ</th>
                        <th className="p-4">รายละเอียดสินค้า</th>
                        <th className="p-4 text-center w-24">จำนวน</th>
                        <th className="p-4 text-right w-32">ราคา/หน่วย</th>
                        <th className="p-4 pr-6 text-right w-32">รวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPR.items && selectedPR.items.length > 0 ? (
                        selectedPR.items.map((item: PRItem, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-4 pl-6 text-center font-medium text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="p-4 font-bold text-slate-700">
                              {item.description}
                            </td>
                            <td className="p-4 text-center font-black text-slate-700 bg-slate-50/30">
                              {item.quantity}
                            </td>
                            <td className="p-4 text-right font-medium text-slate-600">
                              {Number(
                                item.unit_price || item.estimated_price || 0,
                              ).toLocaleString()}
                            </td>
                            <td className="p-4 pr-6 text-right font-black text-blue-700 bg-blue-50/30">
                              {(
                                Number(item.quantity) *
                                Number(
                                  item.unit_price || item.estimated_price || 0,
                                )
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-slate-400 font-medium"
                          >
                            ไม่มีข้อมูลรายการสินค้า
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* 🌟 Footer สรุปยอดรวม (ดึงดีไซน์จาก POList) */}
                    {selectedPR.items && selectedPR.items.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-right font-bold text-slate-500 uppercase tracking-wider"
                          >
                            ยอดรวมประเมินสุทธิ
                          </td>
                          <td className="p-4 pr-6 text-right font-black text-amber-600 text-xl tracking-tight">
                            {selectedPR.items
                              .reduce(
                                (sum, item) =>
                                  sum +
                                  Number(item.quantity) *
                                    Number(
                                      item.unit_price ||
                                        item.estimated_price ||
                                        0,
                                    ),
                                0,
                              )
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* 🌟 ประวัติการดำเนินการ (Audit Timeline) */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-amber-500" />{" "}
                    ประวัติการดำเนินการ (Audit Timeline)
                  </h3>
                  <AuditTimeline
                    tableName="pr_header"
                    recordId={selectedPR.pr_no}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer (ปุ่มปิด) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🖨️ กระดาษ A4 สำหรับปริ้นต์ (ซ่อนไว้เสมอ) */}
      {/* ============================================================ */}
      <div style={{ display: "none" }}>
        <div
          ref={printRef}
          className="p-10 bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto text-sm relative"
        >
          {prToPrint && (
            <>
              {/* 1. ส่วนหัวกระดาษ (Header) */}
              <div className="flex justify-between items-start pb-4 mb-6 border-b-2 border-slate-800">
                <div className="flex gap-4 items-center">
                  {/* กล่องใส่โลโก้บริษัท (เปลี่ยนเป็นแท็ก <img src="..." /> ได้) */}
                  <div className="w-16 h-16 bg-slate-100 border border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold tracking-widest rounded-md">
                    LOGO
                  </div>
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                      บริษัท ตัวอย่าง จำกัด (มหาชน)
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                      123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร
                      10000
                    </p>
                    <p className="text-xs text-slate-600">
                      โทร: 02-XXX-XXXX | เลขประจำตัวผู้เสียภาษี: 010XXXXXXXXXX
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase text-slate-900 tracking-wider">
                    Purchase Requisition
                  </h2>
                  <h3 className="text-lg font-bold text-slate-600">
                    ใบขออนุมัติสั่งซื้อ
                  </h3>
                </div>
              </div>

              {/* 2. ข้อมูลเอกสาร (Document Info) */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* ข้อมูลผู้ขอ */}
                <div className="border border-slate-800 rounded-sm p-3">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="font-bold w-28 pb-1.5 text-slate-700">
                          แผนกที่ขอเบิก:
                        </td>
                        <td className="pb-1.5 font-medium">
                          {prToPrint.department}
                        </td>
                      </tr>
                      <div className="mt-4 border border-slate-800 p-4 min-h-[80px]">
                        <p className="font-bold text-xs text-slate-800 underline mb-2 uppercase">
                          หมายเหตุ / เหตุผลการขอซื้อ (Remark):
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {prToPrint.remark || "-"}
                        </p>
                      </div>
                    </tbody>
                  </table>
                </div>

                {/* ข้อมูลเอกสาร */}
                <div className="border border-slate-800 rounded-sm p-3">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="font-bold w-28 pb-1.5 text-slate-700">
                          เลขที่เอกสาร (PR No):
                        </td>
                        <td className="pb-1.5 font-bold text-base">
                          {prToPrint.pr_no}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold pb-1.5 text-slate-700">
                          วันที่ขอซื้อ (Date):
                        </td>
                        <td className="pb-1.5">
                          {prToPrint.created_at
                            ? new Date(prToPrint.created_at).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                            : "ไม่ระบุ"}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold pb-1.5 text-slate-700">
                          วันที่ต้องการใช้:
                        </td>
                        <td className="pb-1.5 font-medium text-rose-600">
                          {prToPrint.required_date
                            ? new Date(
                                prToPrint.required_date,
                              ).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. ตารางรายการสินค้า (Item Table) */}
              <table className="w-full text-xs border-collapse border border-slate-800 mb-8">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-800 p-2 text-center w-12 font-bold">
                      ลำดับ
                      <br />
                      <span className="text-[10px] font-normal">No.</span>
                    </th>
                    <th className="border border-slate-800 p-2 text-center font-bold">
                      รายละเอียดสินค้า
                      <br />
                      <span className="text-[10px] font-normal">
                        Description
                      </span>
                    </th>
                    <th className="border border-slate-800 p-2 text-center w-20 font-bold">
                      จำนวน
                      <br />
                      <span className="text-[10px] font-normal">Q'TY</span>
                    </th>
                    <th className="border border-slate-800 p-2 text-center w-28 font-bold">
                      ราคาประเมิน/หน่วย
                      <br />
                      <span className="text-[10px] font-normal">
                        Unit Price
                      </span>
                    </th>
                    <th className="border border-slate-800 p-2 text-center w-32 font-bold">
                      จำนวนเงินรวม
                      <br />
                      <span className="text-[10px] font-normal">
                        Total Amount
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prToPrint.items && prToPrint.items.length > 0 ? (
                    prToPrint.items.map((item: PRItem, idx: number) => (
                      <tr key={idx}>
                        <td className="border-x border-slate-800 border-b p-2.5 text-center">
                          {idx + 1}
                        </td>
                        <td className="border-x border-slate-800 border-b  p-2.5 font-medium">
                          {item.description}
                        </td>
                        <td className="border-x border-slate-800 border-b p-2.5 text-center">
                          {item.quantity}
                        </td>
                        <td className="border-x border-slate-800 border-b p-2.5 text-right">
                          {Number(
                            item.estimated_price || item.unit_price || 0,
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="border-x border-slate-800 border-b p-2.5 text-right font-medium">
                          {(
                            Number(item.quantity) *
                            Number(item.estimated_price || item.unit_price || 0)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-slate-800 p-6 text-center text-slate-500"
                      >
                        ไม่มีข้อมูลรายการสินค้า
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td
                      colSpan={4}
                      className="border border-slate-800 p-2.5 text-right font-bold text-slate-800 uppercase"
                    >
                      รวมยอดเงินประเมินสุทธิ (Net Total)
                    </td>
                    <td className="border border-slate-800 p-2.5 text-right font-bold text-base">
                      {prToPrint.items
                        ? prToPrint.items
                            .reduce(
                              (sum, item) =>
                                sum +
                                Number(item.quantity) *
                                  Number(
                                    item.estimated_price ||
                                      item.unit_price ||
                                      0,
                                  ),
                              0,
                            )
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                        : "0.00"}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* 4. ส่วนลงนาม (Signatures) */}
              <div className="grid grid-cols-3 gap-6 mt-16 text-xs text-center">
                <div>
                  <div className="border-b border-slate-800 w-40 mx-auto mb-2 h-10"></div>
                  <p className="font-bold text-slate-800">
                    ผู้ขอเบิก (Requested By)
                  </p>
                  <p className="mt-1 text-slate-600">
                    วันที่: ______/______/______
                  </p>
                </div>
                <div>
                  <div className="border-b border-slate-800 w-40 mx-auto mb-2 h-10"></div>
                  <p className="font-bold text-slate-800">
                    ผู้ตรวจสอบ (Checked By)
                  </p>
                  <p className="mt-1 text-slate-600">
                    วันที่: ______/______/______
                  </p>
                </div>
                <div>
                  <div className="border-b border-slate-800 w-40 mx-auto mb-2 h-10"></div>
                  <p className="font-bold text-slate-800">
                    ผู้อนุมัติ (Approved By)
                  </p>
                  <p className="mt-1 text-slate-600">
                    วันที่: ______/______/______
                  </p>
                </div>
              </div>

              {/* Footer แจ้งเวลาพิมพ์ */}
              <div className="absolute bottom-10 left-10 right-10 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                เอกสารฉบับนี้พิมพ์จากระบบ P2P System เมื่อวันที่{" "}
                {currentPrintTime}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
