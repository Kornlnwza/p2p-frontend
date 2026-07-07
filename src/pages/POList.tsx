import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  Eye,
  Filter,
  FileSpreadsheet,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useDebounce } from "../hook/useDebounce";
import AuditTimeline from "../components/AduitTimeline";

// 🌟 1. ดึง Type จากไฟล์ศูนย์รวมของเรา
import type { POHeaderData, POItem, Vendor } from "../types";
import { useAuth } from "../hook/useAuth";

export default function POListPage() {
  // 🌟 2. ใช้ Hook แทน localStorage
  const { userRole } = useAuth();

  const [poList, setPoList] = useState<POHeaderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const debouncedSearchTerm = useDebounce(searchTerm, 450);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPONo, setSelectedPONo] = useState("");
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [poToCancel, setPoToCancel] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const handleOpenCancelModal = (po_no: string) => {
    setPoToCancel(po_no);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const executeCancelPO = async () => {
    if (!cancelReason.trim()) return;
    try {
      await api.put(`/po/${poToCancel}/cancel`, { reason: cancelReason });
      toast.success(`ยกเลิกใบสั่งซื้อ ${poToCancel} สำเร็จ`);
      setIsCancelModalOpen(false);
      setCancelReason("");
      setRefreshTrigger((prev) => prev + 1); // สั่งโหลดใหม่
    } catch {
      toast.error("ไม่สามารถยกเลิกใบสั่งซื้อได้");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [poResponse, vendorResponse] = await Promise.all([
          api.get("/po", { headers: { "Cache-Control": "no-cache" } }),
          api.get("/vendors"),
        ]);
        setPoList(poResponse.data);
        setVendorList(vendorResponse.data);
      } catch {
        toast.error("ไม่สามารถดึงข้อมูลรายการได้");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const getVendorName = useCallback(
    (id: string | number) => {
      const vendor = vendorList.find((v) => String(v.vendor_id) === String(id));
      return vendor ? vendor.vendor_name : `ไม่ทราบชื่อ (${id})`;
    },
    [vendorList],
  );

  const filteredList = useMemo(() => {
    let result = poList;
    if (statusFilter !== "All") {
      result = result.filter((po) => po.status === statusFilter);
    }
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (po) =>
          po.po_no.toLowerCase().includes(lowerSearch) ||
          po.pr_no.toLowerCase().includes(lowerSearch) ||
          getVendorName(po.vendor_id).toLowerCase().includes(lowerSearch),
      );
    }
    return result.sort((a, b) => b.po_no.localeCompare(a.po_no));
  }, [debouncedSearchTerm, statusFilter, poList, getVendorName]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Issued":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shadow-sm text-xs font-bold uppercase">
            {status}
          </div>
        );
      case "Goods Received":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm text-xs font-bold uppercase">
            {status}
          </div>
        );
      case "Cancelled":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 shadow-sm text-xs font-bold uppercase">
            {status}
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-sm text-xs font-bold uppercase">
            {status}
          </div>
        );
    }
  };

  const handleViewDetails = async (po_no: string) => {
    setSelectedPONo(po_no);
    setIsModalOpen(true);
    setIsItemsLoading(true);
    try {
      const response = await api.get(`/po/${po_no}`);
      setPoItems(response.data);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
      setPoItems([]);
    } finally {
      setIsItemsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="text-blue-600" /> รายการใบสั่งซื้อ (PO)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ติดตามสถานะการสั่งซื้อเอกสารและการส่งมอบสินค้า
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="bg-white border border-slate-300 text-slate-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2 cursor-not-allowed opacity-60 shadow-sm text-sm"
              title="ฟีเจอร์นี้จะเปิดใช้งานในอนาคต"
            >
              <FileSpreadsheet size={18} /> Export Excel
            </button>
            <Link
              to="/po/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition text-sm"
            >
              <Plus size={18} /> สร้างใบสั่งซื้อ
            </Link>
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
              placeholder="ค้นหาเลขที่ PO, อ้างอิง PR, ผู้ขาย..."
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
              <option value="Issued">Issued (รอรับของ)</option>
              <option value="Goods Received">
                Goods Received (คลังรับของแล้ว)
              </option>
              <option value="Cancelled">Cancelled (ยกเลิกคำสั่งซื้อ)</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-4 font-semibold">เลขที่ PO</th>
                  <th className="p-4 font-semibold">วันที่สั่งซื้อ</th>
                  <th className="p-4 font-semibold">อ้างอิง PR</th>
                  <th className="p-4 font-semibold">บริษัทผู้ขาย</th>
                  <th className="p-4 font-semibold text-right">ยอดรวมสุทธิ</th>
                  <th className="p-4 font-semibold text-center">สถานะ</th>
                  <th className="p-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <FileText size={32} className="mx-auto mb-3 opacity-20" />
                      ไม่พบรายการใบสั่งซื้อในระบบ
                    </td>
                  </tr>
                ) : (
                  currentItems.map((po, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4 font-bold text-blue-600">
                        {po.po_no}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(po.po_date).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-4 text-slate-600">{po.pr_no}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">
                            {getVendorName(po.vendor_id)}
                          </span>
                          <span className="text-xs text-slate-400 mt-0.5">
                            รหัส: {po.vendor_id}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {Number(po.total_amount).toLocaleString()} บาท
                      </td>
                      <td className="p-4 text-center">
                        {renderStatusBadge(po.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(po.po_no)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye size={18} />
                          </button>

                          {po.status === "Issued" &&
                            (userRole === "Admin" ||
                              userRole === "Purchaser") && (
                              <button
                                onClick={() => handleOpenCancelModal(po.po_no)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="ยกเลิกคำสั่งซื้อ"
                              >
                                <XCircle size={18} />
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

          {/* Pagination Controls */}
          {filteredList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-t border-slate-200 bg-slate-50 gap-4">
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
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🌟 1. Modal ดูรายละเอียด (View Details) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-800 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="text-blue-400" size={20} />
                  รายละเอียดใบสั่งซื้อ:{" "}
                  <span className="text-blue-300 ml-1">{selectedPONo}</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
                {(() => {
                  const currentPO = poList.find(
                    (p) => p.po_no === selectedPONo,
                  );
                  if (currentPO && currentPO.status === "Cancelled") {
                    return (
                      <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-sm flex items-start gap-4">
                        <div className="p-2 bg-rose-100 rounded-full text-rose-600 mt-1">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h4 className="text-rose-800 font-bold text-base mb-1">
                            เอกสารนี้ถูกยกเลิกแล้ว
                          </h4>
                          <div className="text-rose-700 text-sm space-y-1">
                            <p>
                              <span className="font-semibold text-rose-900">
                                วันที่ยกเลิก:
                              </span>{" "}
                              {currentPO.cancelled_at
                                ? new Date(
                                    currentPO.cancelled_at,
                                  ).toLocaleString("th-TH")
                                : "ไม่ระบุเวลา"}
                            </p>
                            <p>
                              <span className="font-semibold text-rose-900">
                                เหตุผล:
                              </span>{" "}
                              {currentPO.cancel_reason || "ไม่มีการระบุเหตุผล"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100/80 backdrop-blur-sm sticky top-0 shadow-sm text-xs uppercase tracking-wide text-slate-600 font-bold">
                    <tr>
                      <th className="p-4 pl-6 border-b">รหัสสินค้า</th>
                      <th className="p-4 border-b">รายละเอียด</th>
                      <th className="p-4 border-b text-center">จำนวน</th>
                      <th className="p-4 border-b text-right">ราคา/หน่วย</th>
                      <th className="p-4 pr-6 border-b text-right">
                        ราคารวม (บาท)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isItemsLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400 animate-pulse"
                        >
                          กำลังโหลดข้อมูลรายการสินค้า...
                        </td>
                      </tr>
                    ) : poItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400"
                        >
                          ไม่พบรายการสินค้าในเอกสารนี้
                        </td>
                      </tr>
                    ) : (
                      poItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-4 pl-6 text-slate-500 font-mono text-sm">
                            {item.product_code}
                          </td>
                          <td className="p-4 text-slate-800 font-medium">
                            {item.description || "-"}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 bg-slate-50/50">
                            {Number(item.ordered_qty).toLocaleString()}
                          </td>
                          <td className="p-4 text-right text-slate-600">
                            {Number(item.unit_price).toLocaleString()}
                          </td>
                          <td className="p-4 pr-6 text-right font-bold text-blue-700 bg-blue-50/30">
                            {Number(item.line_total).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!isItemsLoading && poItems.length > 0 && (
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider"
                        >
                          ยอดรวมสุทธิของเอกสารนี้
                        </td>
                        <td className="p-4 pr-6 text-right font-bold text-red-600 text-lg">
                          {poItems
                            .reduce(
                              (sum, item) => sum + Number(item.line_total),
                              0,
                            )
                            .toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="p-6 border-t border-slate-200 bg-white">
                <h3 className="font-bold text-slate-800 mb-4">
                  ประวัติการดำเนินการ (Audit Timeline)
                </h3>
                <AuditTimeline tableName="po_header" recordId={selectedPONo} />
              </div>

              {/* แถบ Action Bar ด้านล่าง */}
              <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all shadow-sm"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Modal ยกเลิกใบสั่งซื้อ (Cancel PO) */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <XCircle className="text-rose-600" /> ยกเลิกใบสั่งซื้อ
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  คุณกำลังจะยกเลิกใบสั่งซื้อหมายเลข{" "}
                  <span className="font-bold text-slate-700">{poToCancel}</span>
                </p>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    เหตุผลที่ยกเลิก (บังคับกรอก) *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm resize-none h-28 bg-slate-50 focus:bg-white transition-all"
                    placeholder="เช่น Vendor แจ้งว่าสินค้าหมดสต๊อก หรือ จัดซื้อสั่งผิด..."
                  ></textarea>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsCancelModalOpen(false)}
                    className="flex-1 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    onClick={executeCancelPO}
                    disabled={!cancelReason.trim()}
                    className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md hover:shadow-lg hover:shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    ยืนยันการยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
