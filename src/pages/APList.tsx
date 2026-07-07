import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Eye,
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useDebounce } from "../hook/useDebounce";
// 🌟 1. นำเข้า AuditTimeline (อิงจากชื่อไฟล์เดิมของคุณ)
import AuditTimeline from "../components/AduitTimeline";

import type { APHeaderData, APItemData } from "../types";
import { useAuth } from "../hook/useAuth"; // 🌟 2. ดึง Hook มาใช้

export default function APListPage() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [apList, setApList] = useState<APHeaderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  // 🌟 เปลี่ยนค่าเริ่มต้นให้โชว์หน้า "รอชำระเงิน" ก่อนเสมอ
  const [statusFilter, setStatusFilter] = useState("Pending");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAP, setSelectedAP] = useState<APHeaderData | null>(null);
  const [apItems, setApItems] = useState<APItemData[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const fetchAPList = async () => {
      try {
        const response = await api.get("/ap", {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        setApList(response.data);
      } catch {
        toast.error("ไม่สามารถดึงข้อมูลรายการตั้งหนี้ได้");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAPList();
  }, []);

  // 🌟 คำนวณจำนวนบิลที่รอจ่าย เพื่อเอาไปโชว์ในวงกลมสีแดง
  const pendingCount = apList.filter((ap) => ap.status === "Pending").length;

  const filteredList = useMemo(() => {
    let result = apList;
    if (statusFilter !== "All")
      result = result.filter((ap) => ap.status === statusFilter);
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (ap) =>
          ap.ap_no.toLowerCase().includes(lowerSearch) ||
          ap.vendor_invoice_no.toLowerCase().includes(lowerSearch) ||
          ap.gr_no.toLowerCase().includes(lowerSearch),
      );
    }
    return result.sort((a, b) => b.ap_no.localeCompare(a.ap_no));
  }, [debouncedSearchTerm, statusFilter, apList]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              รอชำระเงิน
            </span>
          </div>
        );
      case "Paid":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              ชำระแล้ว
            </span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <AlertCircle size={14} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
        );
    }
  };

  const handleViewDetails = async (ap: APHeaderData) => {
    setSelectedAP(ap);
    setIsModalOpen(true);
    setIsItemsLoading(true);
    try {
      const response = await api.get(`/ap/${ap.ap_no}`);
      setApItems(response.data);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลรายละเอียดรายการได้");
      setApItems([]);
    } finally {
      setIsItemsLoading(false);
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "Paid") return false;
    return (
      new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-blue-600" /> รายการตั้งหนี้ (AP List)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ตรวจสอบวันครบกำหนดชำระเงิน และทำรายการจ่ายเงินให้ผู้ขาย
            </p>
          </div>
          <Link
            to="/ap/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition text-sm"
          >
            <Plus size={18} /> บันทึกตั้งหนี้ใหม่
          </Link>
        </div>

        {/* 🌟 เปลี่ยน Filter เป็นรูปแบบ Tabs เหมือนในรูปที่คุณส่งมา */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
          {/* ส่วน Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl w-full xl:w-auto overflow-x-auto">
            <button
              onClick={() => {
                setStatusFilter("Pending");
                setCurrentPage(1);
              }}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                statusFilter === "Pending"
                  ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Clock size={16} /> รอชำระเงิน
              {/* วงกลมแจ้งเตือนสีแดง */}
              {pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setStatusFilter("Paid");
                setCurrentPage(1);
              }}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                statusFilter === "Paid"
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <CheckCircle2 size={16} /> ประวัติชำระแล้ว
            </button>

            <button
              onClick={() => {
                setStatusFilter("All");
                setCurrentPage(1);
              }}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                statusFilter === "All"
                  ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              รายการทั้งหมด
            </button>
          </div>

          {/* ส่วนค้นหา */}
          <div className="relative w-full xl:max-w-md">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ AP, Invoice ผู้ขาย..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow text-sm bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4 font-semibold">เลขที่ AP</th>
                  <th className="p-4 font-semibold">Invoice ผู้ขาย</th>
                  <th className="p-4 font-semibold">อ้างอิง GR</th>
                  <th className="p-4 font-semibold">ครบกำหนด</th>
                  <th className="p-4 font-semibold text-right">ยอดเงิน</th>
                  <th className="p-4 font-semibold text-center">สถานะ</th>
                  <th className="p-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400 font-medium animate-pulse"
                    >
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400"
                    >
                      ไม่พบรายการตั้งหนี้
                    </td>
                  </tr>
                ) : (
                  currentItems.map((ap, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-blue-600">
                        {ap.ap_no}
                      </td>
                      <td className="p-4 font-medium">
                        {ap.vendor_invoice_no}
                      </td>
                      <td className="p-4 text-slate-500">{ap.gr_no}</td>
                      <td className="p-4">
                        <span
                          className={
                            isOverdue(ap.due_date, ap.status)
                              ? "text-red-600 font-bold"
                              : ""
                          }
                        >
                          {new Date(ap.due_date).toLocaleDateString("th-TH")}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold">
                        {Number(ap.total_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-4 text-center">
                        {renderStatusBadge(ap.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(ap)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={18} />
                          </button>
                          {ap.status === "Pending" &&
                            (userRole === "Finance" ||
                              userRole === "Admin") && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/payment?ap_no=${ap.ap_no}&amount=${ap.total_amount}`,
                                  )
                                }
                                className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold"
                              >
                                <CreditCard size={12} /> จ่ายเงิน
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
          {/* Pagination */}
          {filteredList.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t bg-slate-50 text-sm text-slate-500">
              <span>
                แสดง {startIndex + 1} -{" "}
                {Math.min(startIndex + itemsPerPage, filteredList.length)} จาก{" "}
                {filteredList.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal ดูรายละเอียด */}
        {isModalOpen && selectedAP && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-800 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={20} className="text-blue-400" />{" "}
                  รายละเอียดใบตั้งหนี้: {selectedAP.ap_no}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setApItems([]);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-700 hover:bg-rose-500 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
                <div className="p-6">
                  <div className="bg-white p-5 rounded-2xl border shadow-sm mb-6 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        Invoice
                      </p>
                      <p className="font-bold text-slate-700">
                        {selectedAP.vendor_invoice_no}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        Ref GR
                      </p>
                      <p className="font-bold text-blue-600">
                        {selectedAP.gr_no}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        วันที่
                      </p>
                      <p className="font-medium text-slate-700">
                        {new Date(selectedAP.ap_date).toLocaleDateString(
                          "th-TH",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        กำหนดชำระ
                      </p>
                      <p
                        className={`font-bold ${isOverdue(selectedAP.due_date, selectedAP.status) ? "text-red-600" : "text-slate-700"}`}
                      >
                        {new Date(selectedAP.due_date).toLocaleDateString(
                          "th-TH",
                        )}
                      </p>
                    </div>
                  </div>
                  <table className="w-full bg-white border rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-4">รหัสสินค้า</th>
                        <th className="p-4">รายละเอียด</th>
                        <th className="p-4 text-center">จำนวน</th>
                        <th className="p-4 text-right">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {isItemsLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-12 text-center text-slate-500 font-medium animate-pulse"
                          >
                            กำลังโหลดข้อมูลรายการ...
                          </td>
                        </tr>
                      ) : apItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-12 text-center text-slate-400"
                          >
                            ไม่พบรายละเอียดในเอกสารนี้
                          </td>
                        </tr>
                      ) : (
                        apItems.map((item, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 font-mono text-blue-600">
                              {item.product_code}
                            </td>
                            <td className="p-4">{item.description || "-"}</td>
                            <td className="p-4 text-center">
                              {item.quantity
                                ? Number(item.quantity).toLocaleString()
                                : "-"}
                            </td>
                            <td className="p-4 text-right font-bold text-blue-700">
                              {Number(item.amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* 🌟 2. แปะ Audit Timeline ด้านล่างตาราง */}
                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-blue-500" />
                      ประวัติการดำเนินการ (Audit Timeline)
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <AuditTimeline
                        tableName="ap_header"
                        recordId={selectedAP.ap_no}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t bg-white flex justify-end">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setApItems([]);
                  }}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
