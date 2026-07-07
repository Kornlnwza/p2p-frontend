import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  Eye,
  Plus,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Undo2,
  Trash2,
} from "lucide-react";
import api from "../services/api";
import { useDebounce } from "../hook/useDebounce";
import AuditTimeline from "../components/AduitTimeline";

import type { PRData, PRItem } from "../types";
import { canApprovePR } from "../utils/permissions";
import { useAuth } from "../hook/useAuth";
export default function PRListPage() {
  // 🌟 2. เรียกใช้ Hook ดึงข้อมูล User (สั้นๆ บรรทัดเดียวจบ!)
  const { currentUser } = useAuth();

  const [prList, setPrList] = useState<PRData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);
  const [activeTab, setActiveTab] = useState<"tasks" | "my_pr" | "dept_pr">(
    "tasks",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<PRItem[]>([]);
  const [selectedPRNo, setSelectedPRNo] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "approve" | "reject" | "revoke" | null;
    prNo: string;
  }>({
    isOpen: false,
    action: null,
    prNo: "",
  });

  const openConfirmRevoke = (pr_no: string) => {
    setConfirmModal({ isOpen: true, action: "revoke", prNo: pr_no });
  };

  useEffect(() => {
    const fetchPRList = async () => {
      try {
        const response = await api.get("/pr", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        const filteredPRs = response.data.filter((pr: PRData) => {
          if (currentUser?.role === "Admin") return true;

          let isVisible = false;

          // 1. ทุกคนต้องเห็นเอกสารที่ตัวเองเป็นคนสร้าง
          if (pr.requester_id === currentUser?.user_id) {
            isVisible = true;
          }

          // 2. ถ้าเป็นหัวหน้า (คลุมทั้ง Head ธรรมดา และ Finance_Head, Purchaser_Head)
          // ให้เห็นเอกสารทั้งหมดในแผนกตัวเอง (เพื่อจะได้มองเห็นใบ Pending และกดอนุมัติได้)
          if (
            currentUser?.role?.includes("Head") &&
            pr.department === currentUser?.department
          ) {
            isVisible = true;
          }

          // 3. ถ้าเป็นฝ่ายจัดซื้อ (คลุมทั้ง Purchaser และ Purchaser_Head)
          // ให้เห็นใบ PR ที่ "อนุมัติแล้ว" จาก *ทุกแผนก* เพื่อนำไปเปิด PO ต่อ
          if (
            currentUser?.role?.includes("Purchaser") &&
            (pr.status.toLowerCase() === "approved" ||
              pr.status.toLowerCase() === "po created")
          ) {
            isVisible = true;
          }

          return isVisible;
        });

        filteredPRs.sort((a: PRData, b: PRData) => {
          const getStatusPriority = (status: string, role: string) => {
            const s = status.toLowerCase();
            if (role === "Head") {
              if (s === "pending") return 1;
              if (s === "approved") return 2;
              if (s === "po created") return 3;
              if (s === "rejected") return 4;
              return 5;
            }
            if (s === "approved") return 1;
            if (s === "pending") return 2;
            if (s === "rejected") return 3;
            if (s === "po created") return 4;
            return 5;
          };

          const userRole = currentUser?.role || "";
          const priorityA = getStatusPriority(a.status, userRole);
          const priorityB = getStatusPriority(b.status, userRole);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return b.pr_no.localeCompare(a.pr_no);
        });

        setPrList(filteredPRs);
      } catch (error) {
        console.error("ดึงข้อมูลไม่สำเร็จ:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPRList();
  }, [currentUser?.user_id, currentUser?.role, currentUser?.department]);

  const handleViewDetails = async (pr_no: string) => {
    setSelectedPRNo(pr_no);
    setIsModalOpen(true);
    setSelectedItems([]);

    try {
      const response = await api.get(`/pr/${pr_no}`);
      setSelectedItems(response.data);
    } catch (error) {
      console.error("ดึงข้อมูลรายละเอียดไม่สำเร็จ:", error);
    }
  };

  const openConfirmApprove = (pr_no: string) => {
    setConfirmModal({ isOpen: true, action: "approve", prNo: pr_no });
  };

  const openConfirmReject = (pr_no: string) => {
    setConfirmModal({ isOpen: true, action: "reject", prNo: pr_no });
  };

  const executeConfirmAction = async () => {
    const { action, prNo } = confirmModal;
    if (!action || !prNo) return;

    setIsActionLoading(true);
    try {
      // 🌟 แยกเงื่อนไขให้ชัดเจน: อนุมัติ = approved, ปฏิเสธ = rejected, ยกเลิก = pending (หรือ cancelled)
      let targetStatus = "pending";
      if (action === "approve") targetStatus = "approved";
      if (action === "reject") targetStatus = "rejected";
      if (action === "revoke") targetStatus = "cancelled"; // หรือจะเป็น "pending" ตามที่คุณต้องการ

      await api.put(`/pr/${prNo}/status`, {
        status: targetStatus,
        approved_by: currentUser?.username,
      });

      setPrList((prev) =>
        prev.map((pr) =>
          pr.pr_no === prNo ? { ...pr, status: targetStatus } : pr,
        ),
      );
    } catch (error) {
      console.error(`ทำรายการไม่สำเร็จ:`, error);
      alert("เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setIsActionLoading(false);
      setConfirmModal({ isOpen: false, action: null, prNo: "" });
    }
  };

  const pendingTasksCount = prList.filter(
    (pr) => pr.status.toLowerCase() === "approved",
  ).length;

  let baseList = prList;
  if (currentUser?.role?.includes("Purchaser")) {
    if (activeTab === "tasks") {
      baseList = prList.filter(
        (pr) =>
          pr.status.toLowerCase() === "approved" ||
          pr.status.toLowerCase() === "po created",
      );
    } else if (activeTab === "my_pr") {
      baseList = prList.filter(
        (pr) => pr.requester_id === currentUser?.user_id,
      );
    } else if (activeTab === "dept_pr") {
      // 🌟 เพิ่มแท็บใหม่: ให้แสดงเอกสารทั้งหมดของแผนกจัดซื้อ (เพื่อให้ Head เห็นและกดอนุมัติได้)
      baseList = prList.filter(
        (pr) => pr.department === currentUser?.department,
      );
    }
  }

  const filteredPRList = baseList.filter(
    (pr) =>
      pr.pr_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      pr.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      pr.status.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredPRList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredPRList.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "approved":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "po created":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm">
            <CheckCircle2 size={14} className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      case "rejected":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 shadow-sm">
            <XCircle size={14} className="text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <AlertCircle size={14} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" /> รายการใบขอซื้อ (PR List)
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                ผู้ใช้งาน: {currentUser?.department}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                Role: {currentUser?.role}
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาเลขที่, แผนก, สถานะ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-shadow bg-slate-50 hover:bg-white focus:bg-white"
              />
            </div>
            <Link
              to="/pr/create"
              className="flex items-center justify-center gap-2 px-6 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 w-full sm:w-auto font-semibold whitespace-nowrap"
            >
              <Plus size={18} /> สร้างใบขอซื้อ
            </Link>
          </div>
        </div>

        {currentUser?.role?.includes("Purchaser") && (
          <div className=" items-center gap-2 mb-4 bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === "tasks"
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              💼 งานจัดซื้อ (รอเปิด PO)
              {pendingTasksCount > 0 && (
                <span className="bg-rose-500 text-white text-[11px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("my_pr")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === "my_pr"
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              📝 ใบขอซื้อของฉัน
            </button>
            {/* 🌟 ปุมที่ 3 โชว์เฉพาะคนที่เป็น Head ของฝ่ายจัดซื้อ */}
            {currentUser?.role === "Purchaser_Head" && (
              <button
                onClick={() => setActiveTab("dept_pr")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === "dept_pr"
                    ? "bg-rose-50 text-rose-700 shadow-sm" // ใช้สีแดงอมชมพูแยกให้ชัดเจนว่าเป็นหน้าที่หัวหน้า
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                งานของแผนก (รออนุมัติ)
              </button>
            )}
          </div>
        )}

        {/* Table Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-4 pl-6 font-semibold">เลขที่เอกสาร</th>
                  <th className="p-4 font-semibold">วันที่</th>
                  <th className="p-4 font-semibold">แผนก</th>
                  <th className="p-4 font-semibold text-right">ยอดรวม (บาท)</th>
                  <th className="p-4 font-semibold text-center">สถานะ</th>
                  <th className="p-4 pr-6 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p>กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500">
                      <ShoppingBag
                        size={48}
                        className="mx-auto text-slate-300 mb-4"
                      />
                      <p className="text-lg font-medium text-slate-600">
                        ไม่พบรายการใบขอซื้อ
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        ลองเปลี่ยนคำค้นหา หรือสร้างใบขอซื้อใหม่
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((pr, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="p-4 pl-6 font-bold text-blue-600">
                        {pr.pr_no}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {new Date(pr.pr_date).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-4 text-slate-700 font-medium text-sm">
                        {pr.department}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-700">
                        {Number(pr.total_amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {renderStatusBadge(pr.status)}
                      </td>

                      <td className="p-4 pr-6">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(pr.pr_no)}
                            title="ดูรายละเอียด"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={18} />
                          </button>

                          {canApprovePR(currentUser, pr) &&
                            pr.status.toLowerCase() === "pending" && (
                              <div className="flex items-center gap-1 border-l-2 pl-2 ml-1 border-slate-100">
                                <button
                                  onClick={() => openConfirmApprove(pr.pr_no)}
                                  title="อนุมัติ"
                                  className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition-all active:scale-95"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  onClick={() => openConfirmReject(pr.pr_no)}
                                  title="ไม่อนุมัติ"
                                  className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-95"
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                            )}

                          {(currentUser?.role?.includes("Head") ||
                            currentUser?.role === "Admin") &&
                            pr.status.toLowerCase() === "approved" && (
                              <div className="flex items-center gap-1 border-l-2 pl-2 ml-1 border-slate-100">
                                <button
                                  onClick={() => openConfirmRevoke(pr.pr_no)}
                                  title="ยกเลิกการอนุมัติ (พบของในสต็อก)"
                                  className="p-2 text-amber-500 hover:text-white hover:bg-amber-500 rounded-lg transition-all active:scale-95"
                                >
                                  <Undo2 size={18} />
                                </button>
                              </div>
                            )}
                          {pr.requester_id === currentUser?.user_id &&
                            pr.status.toLowerCase() === "pending" && (
                              <div className="flex items-center gap-1 border-l-2 pl-2 ml-1 border-slate-100">
                                <button
                                  onClick={() => openConfirmReject(pr.pr_no)}
                                  title="ยกเลิกใบคำขอ"
                                  className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-95"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredPRList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-t border-slate-200 bg-slate-50/50 gap-4">
              <div className="text-sm font-medium text-slate-500">
                แสดง <span className="text-slate-800">{startIndex + 1}</span>{" "}
                ถึง{" "}
                <span className="text-slate-800">
                  {Math.min(startIndex + ITEMS_PER_PAGE, filteredPRList.length)}
                </span>{" "}
                จากทั้งหมด{" "}
                <span className="text-slate-800">{filteredPRList.length}</span>{" "}
                รายการ
              </div>

              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-slate-600">
                  หน้า {currentPage} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
              <div className="p-8 flex flex-col items-center text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${
                    confirmModal.action === "approve"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {confirmModal.action === "approve" ? (
                    <CheckCircle2 size={40} />
                  ) : (
                    <XCircle size={40} />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  ยืนยันการ
                  {confirmModal.action === "approve"
                    ? "อนุมัติ"
                    : confirmModal.action === "reject"
                      ? "ไม่อนุมัติ"
                      : "ยกเลิกเอกสาร"}
                </h3>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  คุณต้องการ
                  {confirmModal.action === "approve"
                    ? "อนุมัติ"
                    : confirmModal.action === "reject"
                      ? "ไม่อนุมัติ"
                      : "ยกเลิกเอกสาร"}
                  ใบขอซื้อ{" "}
                  <span className="font-bold text-slate-800">
                    {confirmModal.prNo}
                  </span>{" "}
                  ใช่หรือไม่?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() =>
                      setConfirmModal({ isOpen: false, action: null, prNo: "" })
                    }
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={executeConfirmAction}
                    disabled={isActionLoading}
                    className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-all active:scale-95 ${
                      isActionLoading
                        ? "bg-slate-400 cursor-not-allowed shadow-none"
                        : confirmModal.action === "approve"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30"
                          : "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30"
                    }`}
                  >
                    {isActionLoading ? "กำลังดำเนินการ..." : "ยืนยัน"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-800 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="text-blue-400" />
                  รายละเอียดใบขอซื้อ:{" "}
                  <span className="text-blue-300 ml-1">{selectedPRNo}</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100/80 backdrop-blur-sm sticky top-0 shadow-sm text-xs uppercase tracking-wide text-slate-600 font-bold">
                    <tr>
                      <th className="p-4 pl-6 border-b">รหัสสินค้า</th>
                      <th className="p-4 border-b">รายละเอียด</th>
                      <th className="p-4 border-b text-center">จำนวน</th>
                      <th className="p-4 border-b text-right">ราคา/หน่วย</th>
                      <th className="p-4 pr-6 border-b text-right">
                        รวม (บาท)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4 pl-6 text-slate-500 font-mono text-sm">
                          {item.product_code || "NON-CAT"}
                        </td>
                        <td className="p-4 text-slate-800 font-medium">
                          {item.description}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 bg-slate-50/50">
                          {item.quantity}
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {Number(item.unit_price).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 text-right font-bold text-blue-700 bg-blue-50/30">
                          {(item.quantity * item.unit_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const currentPR = prList.find((p) => p.pr_no === selectedPRNo);
                if (currentPR && currentPR.remark) {
                  return (
                    <div className="px-6 py-5 bg-amber-50/80 border-t border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          className="text-amber-500 mt-0.5"
                          size={20}
                        />
                        <div>
                          <div className="text-sm font-bold text-amber-800 mb-1">
                            หมายเหตุการขอซื้อ:
                          </div>
                          <div className="text-sm text-amber-700/90 leading-relaxed">
                            {currentPR.remark}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="p-6 border-t border-slate-200 bg-white">
                <h3 className="font-bold text-slate-800 mb-4">
                  ประวัติการดำเนินการ (Audit Timeline)
                </h3>
                <AuditTimeline tableName="pr_header" recordId={selectedPRNo} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
