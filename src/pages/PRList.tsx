import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Paperclip,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../hook/useAuth";
import { useReactToPrint } from "react-to-print";

// 🌟 1. สร้าง Interface เพื่อหลีกเลี่ยงการใช้ 'any' (แก้ Error: Unexpected any)
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
  // 🌟 2. ลบ currentUser ออก (แก้ Error: 'currentUser' is assigned a value but never used)
  const { userRole } = useAuth();

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PRData | null>(null);

  // 🌟 3. เปลี่ยน any เป็น PRData (แก้ Error: Unexpected any)
  const [prList, setPrList] = useState<PRData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const printRef = useRef<HTMLDivElement>(null);
  const [prToPrint, setPrToPrint] = useState<PRData | null>(null);

  // 🌟 4. สร้าง State เก็บเวลา เพื่อหลีกเลี่ยง Date.now() ใน JSX (แก้ Error: Impure function)
  const [currentPrintTime, setCurrentPrintTime] = useState("");

  const fetchPRs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/pr");
      setPrList(response.data);
    } catch (error: unknown) {
      // 🌟 5. ลบตัวแปร error ออกถ้าไม่ได้ใช้ (แก้ Error: 'error' is defined but never used)
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
      // ดึงข้อความ Error ที่ Backend ส่งมาโชว์ (เช่น "ผิดกฎบริษัท: ...")
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

      // 🌟 แก้ไข: response.data คือ Array ของรายการสินค้าเลย ไม่ต้อง .items
      setPrToPrint({ ...pr, items: response.data });

      setCurrentPrintTime(new Date().toLocaleString("th-TH"));

      setTimeout(() => {
        handlePrintTrigger();
      }, 500);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลสำหรับปริ้นต์ได้");
    }
  };

  const filteredList = prList.filter((pr) => {
    const matchSearch =
      pr.pr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || pr.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const renderStatusBadge = (status: string) => {
    // 🌟 6. เปลี่ยน any เป็น Record<string, string>
    const styles: Record<string, string> = {
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Rejected: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${styles[status] || "bg-slate-50 text-slate-700"}`}
      >
        {status}
      </span>
    );
  };

  const handleViewDetail = async (pr: PRData) => {
    try {
      // ดึงรายการสินค้าจาก API เหมือนตอน Print
      const response = await api.get(`/pr/${pr.pr_no}`);
      setSelectedPR({ ...pr, items: response.data });
      setIsViewModalOpen(true);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลรายละเอียดได้");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-amber-500" /> รายการใบขอซื้อ (PR)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              จัดการรายการขอเบิกงบประมาณและสั่งซื้อสินค้าภายในบริษัท
            </p>
          </div>
          <Link
            to="/pr/create"
            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-sm"
          >
            + สร้างใบขอซื้อใหม่
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3.5 top-3 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ PR, แผนก..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 bg-slate-50">
            <Filter size={16} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer py-2.5"
            >
              <option value="All">ทุกสถานะ</option>
              <option value="Pending">Pending (รออนุมัติ)</option>
              <option value="Approved">Approved (อนุมัติแล้ว)</option>
              <option value="Rejected">Rejected (ไม่อนุมัติ)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-5 pl-6">เลขที่ PR</th>
                <th className="p-5">แผนกที่ขอ</th>
                <th className="p-5">วันที่ต้องการใช้</th>
                <th className="p-5 text-center">ไฟล์แนบ</th>
                <th className="p-5 text-center">สถานะ</th>
                <th className="p-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    ไม่พบรายการใบขอซื้อ
                  </td>
                </tr>
              ) : (
                filteredList.map((pr) => (
                  <tr
                    key={pr.pr_no}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="p-5 pl-6 font-bold text-amber-600">
                      {pr.pr_no}
                    </td>
                    <td className="p-5 font-bold text-slate-700">
                      {pr.department}
                    </td>
                    <td className="p-5 text-slate-600 font-medium">
                      {pr.required_date
                        ? new Date(pr.required_date).toLocaleDateString("th-TH")
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
                        {/* 1. ปุ่มดูรายละเอียด */}
                        <button
                          onClick={() => handleViewDetail(pr)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={18} />
                        </button>

                        {/* 2. ปุ่ม Print PDF */}
                        <button
                          onClick={() => handlePrintClick(pr)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                          title="พิมพ์ฟอร์มขอซื้อ"
                        >
                          <Printer size={18} />
                        </button>

                        {/* 3. ปุ่ม อนุมัติ/ไม่อนุมัติ (แสดงเฉพาะแอดมินหรือหัวหน้า และสถานะต้องเป็น Pending) */}
                        {pr.status === "Pending" &&
                          (userRole === "Admin" || userRole === "Head") && (
                            <>
                              <div className="w-px h-6 bg-slate-200 mx-1"></div>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(pr.pr_no, "Approved")
                                }
                                className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all shadow-sm"
                                title="อนุมัติเอกสาร"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(pr.pr_no, "Rejected")
                                }
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm"
                                title="ไม่อนุมัติ"
                              >
                                <XCircle size={18} />
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
      </div>

      {/* ============================================================ */}
      {/* 🖨️ กระดาษ A4 สำหรับปริ้นต์ */}
      {/* ============================================================ */}
      <div style={{ display: "none" }}>
        <div
          ref={printRef}
          className="p-12 bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto"
        >
          {prToPrint && (
            <>
              <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">
                    Purchase Requisition
                  </h1>
                  <h2 className="text-xl font-bold text-gray-600">
                    ใบขออนุมัติสั่งซื้อ
                  </h2>
                </div>
                <div className="text-right text-sm space-y-1">
                  <p>
                    <span className="font-bold">เลขที่เอกสาร (PR No):</span>{" "}
                    {prToPrint.pr_no}
                  </p>
                  <p>
                    <span className="font-bold">วันที่ขอซื้อ (Date):</span>{" "}
                    {prToPrint.created_at
                      ? new Date(prToPrint.created_at).toLocaleDateString(
                          "th-TH",
                        )
                      : "ไม่ระบุ"}
                  </p>
                  <p>
                    <span className="font-bold">วันที่ต้องการใช้:</span>{" "}
                    {prToPrint.required_date
                      ? new Date(prToPrint.required_date).toLocaleDateString(
                          "th-TH",
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mb-8 flex justify-between">
                <div className="bg-gray-50 p-4 border border-gray-200 w-[48%]">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    แผนกที่ขอเบิก (Department)
                  </p>
                  <p className="font-bold text-lg">{prToPrint.department}</p>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200 w-[48%]">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    เหตุผลการขอซื้อ (Remark)
                  </p>
                  <p className="font-medium text-sm">
                    {prToPrint.remark || "-"}
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-12">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="p-3 text-sm font-bold border border-black text-center w-16">
                      ลำดับ
                    </th>
                    <th className="p-3 text-sm font-bold border border-black">
                      รายละเอียดสินค้า (Description)
                    </th>
                    <th className="p-3 text-sm font-bold border border-black text-center w-24">
                      จำนวน
                    </th>
                    <th className="p-3 text-sm font-bold border border-black text-right w-32">
                      ราคาประเมิน/หน่วย
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prToPrint.items && prToPrint.items.length > 0 ? (
                    // 🌟 7. ใส่ Type PRItem ตรงนี้ (แก้ Error: Unexpected any)
                    prToPrint.items.map((item: PRItem, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3 border border-gray-300 text-center">
                          {idx + 1}
                        </td>
                        <td className="p-3 border border-gray-300 font-bold">
                          {item.description}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {item.quantity}
                        </td>
                        <td className="p-3 border border-gray-300 text-right">
                          {Number(item.estimated_price || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 border border-gray-300 text-center"
                      >
                        ไม่มีข้อมูลรายการสินค้า
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-auto grid grid-cols-2 gap-12 pt-12">
                <div className="text-center">
                  <div className="border-b border-black w-48 mx-auto mb-2"></div>
                  <p className="font-bold text-sm">
                    (________________________________)
                  </p>
                  <p className="font-bold text-sm">ผู้ขอซื้อ (Requester)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    วันที่: ______/______/______
                  </p>
                </div>
                <div className="text-center">
                  <div className="border-b border-black w-48 mx-auto mb-2"></div>
                  <p className="font-bold text-sm">
                    (________________________________)
                  </p>
                  <p className="font-bold text-sm">
                    ผู้อนุมัติ (Authorized Signature)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    วันที่: ______/______/______
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mt-16 pb-4 border-t border-gray-200 pt-4">
                เอกสารฉบับนี้สร้างขึ้นโดยระบบ P2P System เมื่อวันที่{" "}
                {currentPrintTime}
              </p>
            </>
          )}
        </div>
        {/* ============================================================ */}
        {/* 🔍 Modal ดูรายละเอียด PR */}
        {/* ============================================================ */}
        {isViewModalOpen && selectedPR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header Modal */}
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    รายละเอียดใบขอซื้อ
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    เลขที่เอกสาร:{" "}
                    <span className="font-bold text-amber-600">
                      {selectedPR.pr_no}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* ข้อมูลทั่วไป */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      แผนกที่ขอ
                    </p>
                    <p className="font-bold text-slate-800 mt-1">
                      {selectedPR.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
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
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      สถานะ
                    </p>
                    <div className="mt-1">
                      {renderStatusBadge(selectedPR.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      เอกสารอ้างอิง
                    </p>
                    <div className="mt-1">
                      {selectedPR.attachment_url ? (
                        <a
                          href={`http://localhost:3000/${selectedPR.attachment_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Paperclip size={16} /> ดูไฟล์แนบ
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          - ไม่มีไฟล์แนบ -
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 mt-2 pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      เหตุผลการขอซื้อ
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      {selectedPR.remark || "-"}
                    </p>
                  </div>
                </div>

                {/* ตารางสินค้า */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-amber-500" />{" "}
                    รายการสินค้าที่ต้องการ
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-3 pl-4 font-bold w-16">ลำดับ</th>
                          <th className="p-3 font-bold">รายละเอียดสินค้า</th>
                          <th className="p-3 font-bold text-center w-24">
                            จำนวน
                          </th>
                          <th className="p-3 font-bold text-right w-32">
                            ราคา/หน่วย
                          </th>
                          <th className="p-3 pr-4 font-bold text-right w-32">
                            รวม (บาท)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPR.items && selectedPR.items.length > 0 ? (
                          selectedPR.items.map((item: PRItem, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 pl-4 text-center">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-bold">
                                {item.description}
                              </td>
                              <td className="p-3 text-center">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right">
                                {Number(
                                  item.unit_price || item.estimated_price || 0,
                                ).toLocaleString()}
                              </td>
                              <td className="p-3 pr-4 text-right font-bold text-blue-600">
                                {(
                                  Number(item.quantity) *
                                  Number(
                                    item.unit_price ||
                                      item.estimated_price ||
                                      0,
                                  )
                                ).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-6 text-center text-slate-500"
                            >
                              ไม่มีข้อมูลรายการสินค้า
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
