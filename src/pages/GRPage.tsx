import { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ClipboardList,
  PackageCheck,
  FileText,
  AlertTriangle,
  XCircle,
} from "lucide-react";

import { useAuth } from "../hook/useAuth";
import type { POData, GRItem, POItem } from "../types";

export default function GRPager() {
  const { currentUser } = useAuth();

  const [deliveryNoteNo, setDeliveryNoteNo] = useState("");

  const navigate = useNavigate();
  const [poNo, setPoNo] = useState("");
  const [poDetails, setPoDetails] = useState<POData | null>(null);
  const [receivedItems, setReceivedItems] = useState<GRItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });

  const fetchPOForGR = async () => {
    if (!poNo) return toast.error("กรุณากรอกเลขที่ PO");
    setIsLoading(true);
    try {
      const res = await api.get(`/po/${poNo}?purpose=gr`); // 🌟 เติม ?purpose=gr เข้าไป

      const fetchedItems = Array.isArray(res.data)
        ? res.data
        : res.data.items || [];

      const headerPoNo = res.data.po_no || poNo;

      setPoDetails({ po_no: headerPoNo, items: fetchedItems });

      setReceivedItems(
        fetchedItems.map((i: POItem) => ({
          ...i,
          received_qty: i.ordered_qty,
        })),
      );
      toast.success("ดึงข้อมูล PO สำเร็จ");
    } catch (error) {
      // ดึงข้อความ Error จาก Backend
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage =
        err.response?.data?.message ||
        "ไม่พบเลข PO นี้ หรือรูปแบบข้อมูลไม่ถูกต้อง";

      // 🌟 2. สั่งเปิด Popup แจ้งเตือนแทนการใช้ Toast ธรรมดา
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });

      // ล้างข้อมูลตาราง
      setPoDetails(null);
      setReceivedItems([]);
      // ล้างช่องกรอกเลข PO เพื่อให้พร้อมกรอกใหม่
      setPoNo("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGR = async () => {
    if (!deliveryNoteNo.trim()) {
      toast.error("กรุณากรอกเลขที่ใบส่งของ (DO/Invoice) ก่อนบันทึก!");
      return;
    }

    const isOverReceived = receivedItems.some(
      (item) => item.received_qty > item.ordered_qty,
    );

    if (isOverReceived) {
      toast.error("ผิดพลาด: จำนวนรับต้องไม่เกินจำนวนที่สั่งซื้อ!");
      return;
    }

    const hasNegative = receivedItems.some((item) => item.received_qty < 0);
    if (hasNegative) {
      toast.error("ผิดพลาด: จำนวนรับสินค้าต้องไม่ต่ำกว่า 0!");
      return;
    }

    setIsLoading(true);
    try {
      const newGRNo = `GR-${Date.now()}`;
      const grData = {
        gr_no: newGRNo,
        gr_date: new Date().toISOString().split("T")[0],
        po_no: poDetails?.po_no || poNo,
        delivery_note_no: deliveryNoteNo, // ส่งไป Backend
        receiver_id: currentUser?.user_id || 0,
        items: receivedItems.map((item) => ({
          product_code: item.product_code,
          ordered_qty: item.ordered_qty,
          received_qty: item.received_qty,
        })),
      };

      const response = await api.post("/gr", grData);
      if (response.status === 201) {
        toast.success("บันทึกรับสินค้าเข้าคลังเรียบร้อย!");
        navigate("/gr/list");
      }
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg =
        err.response?.data?.message ||
        "บันทึกไม่สำเร็จ ลองตรวจสอบข้อมูลอีกครั้งครับ";

      toast.error(`ผิดพลาด: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemStatusLabel = (received: number, ordered: number) => {
    if (received > ordered)
      return {
        text: "เกินจำนวนสั่ง!",
        className: "text-red-600 font-bold animate-pulse",
      };
    if (received === ordered)
      return { text: "ครบถ้วน", className: "text-emerald-600 font-medium" };
    if (received === 0)
      return { text: "ไม่ได้รับของ", className: "text-slate-400" };
    return { text: "รับบางส่วน", className: "text-amber-600 font-medium" };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="text-blue-600" /> สร้างใบรับสินค้า (Goods
              Receipt - GR)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              บันทึกยอดรับสินค้าจริงเข้าคลังอ้างอิงตามใบสั่งซื้อ
            </p>
          </div>
        </div>

        {/* Search PO Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              ค้นหาใบสั่งซื้ออ้างอิง (PO No.)
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm transition"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="กรอกเลขที่ PO เช่น PO-2026-001"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex-1 w-full sm:max-w-xs">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              เลขที่ใบส่งของ (DO/Invoice){" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm transition"
              value={deliveryNoteNo}
              onChange={(e) => setDeliveryNoteNo(e.target.value)}
              placeholder="เช่น DO-12345"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition text-sm flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50"
              onClick={fetchPOForGR}
              disabled={isLoading}
            >
              ตรวจสอบข้อมูล
            </button>
            <Link
              to="/gr/list"
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-medium shadow-sm transition text-sm flex items-center gap-2 w-full sm:w-auto justify-center whitespace-nowrap"
            >
              <ClipboardList size={18} className="text-slate-500" />{" "}
              ประวัติการรับของ
            </Link>
          </div>
        </div>

        {/* ตารางสินค้าสำหรับรับเข้าคลัง */}
        {poDetails && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-50 border-b">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />{" "}
                ตรวจสอบรายการสินค้าในเอกสาร: {poDetails.po_no}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold w-1/6">รหัสสินค้า</th>
                    <th className="p-4 font-semibold">รายละเอียดสินค้า</th>
                    <th className="p-4 font-semibold text-right w-32">
                      จำนวนสั่ง
                    </th>
                    <th className="p-4 font-semibold text-right w-40">
                      จำนวนรับเข้าคลัง *
                    </th>
                    <th className="p-4 font-semibold text-center w-36">
                      สถานะตรวจรับ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {receivedItems.map((item, idx) => {
                    const status = getItemStatusLabel(
                      item.received_qty,
                      item.ordered_qty,
                    );
                    const isError = item.received_qty > item.ordered_qty;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4 font-mono font-medium text-blue-600">
                          {item.product_code}
                        </td>
                        <td
                          className="p-4 max-w-xs truncate"
                          title={item.description}
                        >
                          {item.description}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-600">
                          {item.ordered_qty.toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isError && (
                              <AlertTriangle
                                size={16}
                                className="text-red-500 animate-pulse"
                              />
                            )}
                            <input
                              type="number"
                              min="0"
                              className={`p-1.5 border rounded-lg text-right w-24 outline-none focus:ring-2 transition ${
                                isError
                                  ? "border-red-500 bg-red-50 focus:ring-red-100"
                                  : "border-slate-300 bg-white focus:ring-blue-100 focus:border-blue-500"
                              }`}
                              value={item.received_qty}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newItems = [...receivedItems];
                                newItems[idx].received_qty = val;
                                setReceivedItems(newItems);
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={status.className}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* บาร์กดบันทึกด้านล่างตาราง */}
            <div className="p-4 bg-slate-50 text-right border-t border-slate-200 flex justify-end">
              <button
                disabled={isLoading}
                onClick={handleSaveGR}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-semibold shadow-md
                  transition-all duration-200 ease-in-out active:scale-95 text-sm
                  ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 hover:shadow-lg"
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    กำลังบันทึกรับของ...
                  </>
                ) : (
                  "ยืนยันการรับสินค้าเข้าคลัง"
                )}
              </button>
            </div>
          </div>
        )}

        {/* 🌟 3. Popup Modal เมื่อเกิด Error แจ้งเตือนข้อผิดพลาด (เช่น รับของไปแล้ว) */}
        {errorModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-rose-100 text-rose-600">
                  <XCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  แจ้งเตือน
                </h3>
                <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                  {errorModal.message}
                </p>
                <button
                  onClick={() => setErrorModal({ isOpen: false, message: "" })}
                  className="w-full px-4 py-3 text-white rounded-xl font-bold transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                >
                  ค้นหาใหม่
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
