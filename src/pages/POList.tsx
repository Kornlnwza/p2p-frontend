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
  PackageOpen,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useDebounce } from "../hook/useDebounce";
import AuditTimeline from "../components/AduitTimeline";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ดึง Type จากไฟล์ศูนย์รวมของเรา
import type { POHeaderData, POItem, Vendor } from "../types";
import { useAuth } from "../hook/useAuth";

export default function POListPage() {
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
      setRefreshTrigger((prev) => prev + 1);
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      case "Goods Received":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm text-xs font-bold uppercase tracking-wider">
            {status}
          </div>
        );
      case "Cancelled":
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PO Report");

    worksheet.columns = [
      { width: 18 }, // A: เลขที่ PO
      { width: 18 }, // B: วันที่สั่งซื้อ
      { width: 45 }, // C: บริษัทผู้ขาย
      { width: 25 }, // D: ยอดรวมสุทธิ
      { width: 20 }, // E: สถานะ
    ];

    worksheet.mergeCells("A1:E1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "รายงานสรุปรายการใบสั่งซื้อ (Purchase Order Report)";
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells("A2:E2");
    const dateCell = worksheet.getCell("A2");
    dateCell.value = `วันที่พิมพ์รายงาน: ${new Date().toLocaleDateString("th-TH")}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { vertical: "middle", horizontal: "center" };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "เลขที่ PO",
      "วันที่สั่งซื้อ",
      "บริษัทผู้ขาย",
      "ยอดรวมสุทธิ (บาท)",
      "สถานะ",
    ]);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    let totalSum = 0;
    filteredList.forEach((po) => {
      totalSum += Number(po.total_amount);
      const row = worksheet.addRow([
        po.po_no,
        new Date(po.po_date).toLocaleDateString("th-TH"),
        getVendorName(po.vendor_id),
        Number(po.total_amount),
        po.status,
      ]);

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = "#,##0.00";
      row.getCell(5).alignment = { horizontal: "center" };

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    const summaryRow = worksheet.addRow([
      "",
      "",
      "รวมยอดสั่งซื้อสุทธิ",
      totalSum,
      "",
    ]);
    summaryRow.getCell(3).font = { bold: true };
    summaryRow.getCell(3).alignment = { horizontal: "right" };
    summaryRow.getCell(4).font = { bold: true, color: { argb: "FFDC2626" } };
    summaryRow.getCell(4).numFmt = "#,##0.00";

    summaryRow.eachCell((cell, colNumber) => {
      if (colNumber === 3 || colNumber === 4) {
        cell.border = {
          top: { style: "double" },
          bottom: { style: "double" },
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `PO_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-blue-600" /> รายการใบสั่งซื้อ (PO)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ติดตามสถานะการสั่งซื้อเอกสารและการส่งมอบสินค้า
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 text-sm"
            >
              <FileSpreadsheet size={18} /> Export Excel
            </button>
            <Link
              to="/po/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 text-sm"
            >
              <Plus size={18} /> สร้างใบสั่งซื้อ
            </Link>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between hover:shadow-md transition-shadow duration-300">
          <div className="relative flex-1 w-full max-w-md">
            <Search
              className="absolute left-3.5 top-3 text-slate-400"
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
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
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
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-[180px] cursor-pointer"
            >
              <option value="All">ทั้งหมด (All)</option>
              <option value="Issued">Issued (รอรับของ)</option>
              <option value="Goods Received">Goods Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-5 pl-6 font-bold">เลขที่ PO</th>
                  <th className="p-5 font-bold">วันที่สั่งซื้อ</th>
                  {/* 🌟 เอาคอลัมน์ อ้างอิง PR ออกจากตรงนี้ */}
                  <th className="p-5 font-bold">บริษัทผู้ขาย</th>
                  <th className="p-5 font-bold text-right">ยอดรวมสุทธิ</th>
                  <th className="p-5 font-bold text-center">สถานะ</th>
                  <th className="p-5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                          ไม่พบรายการใบสั่งซื้อในระบบ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((po, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="p-5 pl-6 font-bold text-blue-600">
                        {po.po_no}
                      </td>
                      <td className="p-5 text-slate-600 font-medium">
                        {new Date(po.po_date).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">
                            {getVendorName(po.vendor_id)}
                          </span>
                          <span className="text-xs text-slate-400 mt-0.5">
                            รหัส: {po.vendor_id}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-right font-black text-slate-800">
                        {Number(po.total_amount).toLocaleString()}{" "}
                        <span className="text-xs text-slate-400 font-medium ml-1">
                          บาท
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        {renderStatusBadge(po.status)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(po.po_no)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                            title="ดูรายละเอียด"
                          >
                            <Eye size={20} />
                          </button>

                          {po.status === "Issued" &&
                            (userRole === "Admin" ||
                              userRole === "Purchaser") && (
                              <button
                                onClick={() => handleOpenCancelModal(po.po_no)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                                title="ยกเลิกคำสั่งซื้อ"
                              >
                                <XCircle size={20} />
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

        {/* 🌟 1. Modal ดูรายละเอียด (View Details) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200">
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
                      <div className="m-6 p-5 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm flex items-start gap-4">
                        <div className="p-2 bg-rose-100 rounded-full text-rose-600 mt-0.5">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h4 className="text-rose-800 font-bold text-lg mb-1">
                            เอกสารนี้ถูกยกเลิกแล้ว
                          </h4>
                          <div className="text-rose-700 text-sm space-y-1.5 mt-2">
                            <p>
                              <span className="font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded mr-2">
                                วันที่ยกเลิก:
                              </span>{" "}
                              {currentPO.cancelled_at
                                ? new Date(
                                    currentPO.cancelled_at,
                                  ).toLocaleString("th-TH")
                                : "ไม่ระบุเวลา"}
                            </p>
                            <p>
                              <span className="font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded mr-2">
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
                  <thead className="bg-slate-100/80 backdrop-blur-sm sticky top-0 shadow-sm text-xs uppercase tracking-wider text-slate-600 font-bold">
                    <tr>
                      {/* 🌟 1. เพิ่มหัวตาราง อ้างอิง PR ใน Modal */}
                      <th className="p-4 pl-6 border-b w-32">อ้างอิง PR</th>
                      <th className="p-4 border-b">รหัสสินค้า</th>
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
                          colSpan={6}
                          className="py-16 text-center text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="font-medium">
                              กำลังโหลดข้อมูลรายการสินค้า...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : poItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-16 text-center text-slate-400 font-medium"
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
                          {/* 🌟 2. แสดงเลข PR ที่ดึงมา */}
                          <td className="p-4 pl-6 text-slate-500 font-medium">
                            {item.pr_no || "-"}
                          </td>
                          <td className="p-4 text-slate-500 font-mono text-sm font-medium">
                            {item.product_code || "-"}
                          </td>
                          <td className="p-4 text-slate-800 font-bold">
                            {item.description || "-"}
                          </td>
                          <td className="p-4 text-center font-black text-slate-700 bg-slate-50/50">
                            {Number(item.ordered_qty).toLocaleString()}
                          </td>
                          <td className="p-4 text-right text-slate-600 font-medium">
                            {Number(item.unit_price).toLocaleString()}
                          </td>
                          <td className="p-4 pr-6 text-right font-black text-blue-700 bg-blue-50/30">
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
                          colSpan={5}
                          className="p-5 text-right font-bold text-slate-500 uppercase tracking-wider"
                        >
                          ยอดรวมสุทธิของเอกสารนี้
                        </td>
                        <td className="p-5 pr-6 text-right font-black text-rose-600 text-xl tracking-tight">
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
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-blue-500" />{" "}
                  ประวัติการดำเนินการ (Audit Timeline)
                </h3>
                <AuditTimeline tableName="po_header" recordId={selectedPONo} />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all shadow-sm"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Modal ยกเลิกใบสั่งซื้อ (Cancel PO) */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
              <div className="p-8">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">
                  ยกเลิกใบสั่งซื้อ
                </h2>
                <p className="text-slate-500 text-center mb-8">
                  คุณกำลังจะยกเลิกใบสั่งซื้อ <br />{" "}
                  <span className="font-black text-lg text-slate-800">
                    {poToCancel}
                  </span>
                </p>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    เหตุผลที่ยกเลิก (บังคับกรอก){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm font-medium resize-none h-32 bg-slate-50 focus:bg-white transition-all"
                    placeholder="เช่น Vendor แจ้งว่าสินค้าหมดสต๊อก หรือ จัดซื้อสั่งผิด..."
                  ></textarea>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsCancelModalOpen(false)}
                    className="flex-1 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={executeCancelPO}
                    disabled={!cancelReason.trim()}
                    className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
