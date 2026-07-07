import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Receipt,
  ArrowLeft,
  FileText,
  CheckCircle,
} from "lucide-react";

import { useAuth } from "../hook/useAuth";
import type { GRItem, APItemData } from "../types";

const generateTempApNo = () => `AP-${Date.now()}`;
const getCurrentDate = () => new Date().toISOString().split("T")[0];

export default function APPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // อ่านค่า ?gr_no=... จาก URL (ถ้ามี) มาตั้งเป็นค่าเริ่มต้น
  const grNoFromUrl = searchParams.get("gr_no") || "";

  const [grNo, setGrNo] = useState(grNoFromUrl);
  const [grDetails, setGrDetails] = useState<{
    gr_no: string;
    po_no: string;
    delivery_note_no?: string;
    items: GRItem[];
  } | null>(null);

  // State สำหรับฟอร์ม AP
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [apItems, setApItems] = useState<APItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // ฟังก์ชันดึงข้อมูล
  const fetchGRForAP = useCallback(async (targetGrNo: string) => {
    if (!targetGrNo) return toast.error("กรุณากรอกเลขที่ใบรับของ (GR)");

    setIsFetching(true);
    try {
      const res = await api.get(`/gr/${targetGrNo}`);

      if (res.data.status === "Invoiced") {
        toast.error("ใบรับของ (GR) นี้ถูกตั้งหนี้ไปแล้ว ไม่สามารถทำซ้ำได้");
        return;
      }

      setGrDetails(res.data);

      // ดึงเลขที่คลังกรอกไว้ มาใส่ในช่อง Invoice ให้อัตโนมัติ!
      if (res.data.delivery_note_no) {
        setVendorInvoiceNo(res.data.delivery_note_no);
      }

      setApItems(
        res.data.items.map((i: GRItem) => ({
          product_code: i.product_code,
          amount: Number(i.received_qty) * Number(i.unit_price),
        })),
      );
      toast.success("ดึงข้อมูล GR สำเร็จ!");
    } catch {
      toast.error("ไม่พบข้อมูลใบรับของ (GR) นี้");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // ตัวสั่งการอัตโนมัติ: ถ้าเปิดหน้านี้มาแล้ว URL มีเลข GR ห้อยมาด้วย ให้ดึงข้อมูลทันที!
  useEffect(() => {
    if (grNoFromUrl) {
      // ใช้ setTimeout (0 มิลลิวินาที) เพื่อผลักคำสั่ง fetch ไปทำ "หลังฉาก"
      // ช่วยหลีกเลี่ยงการ setState ชนกับจังหวะ Render หน้าเว็บของ React
      const timer = setTimeout(() => {
        fetchGRForAP(grNoFromUrl);
      }, 0);

      return () => clearTimeout(timer); // คืนค่าทำความสะอาดเมื่อเปลี่ยนหน้า
    }
  }, [grNoFromUrl, fetchGRForAP]);

  // คำนวณยอดรวมทั้งหมด (Total Amount) อัตโนมัติ
  const totalAmount = apItems.reduce((sum, item) => sum + item.amount, 0);

  // ฟังก์ชันบันทึกใบแจ้งหนี้ (AP)
  const handleSaveAP = async () => {
    if (!vendorInvoiceNo || !dueDate) {
      toast.error("กรุณากรอก เลขที่ใบแจ้งหนี้ผู้ขาย และ วันครบกำหนดชำระ");
      return;
    }

    setIsLoading(true);
    try {
      const apData = {
        ap_no: generateTempApNo(),
        ap_date: getCurrentDate(),
        vendor_invoice_no: vendorInvoiceNo,
        gr_no: grDetails?.gr_no || grNo,
        total_amount: totalAmount,
        due_date: dueDate,
        items: apItems,
        created_by: currentUser?.user_id, // 🌟 3. บันทึกว่าใครเป็นคนทำรายการ
      };

      const response = await api.post("/ap", apData);

      if (response.status === 201) {
        toast.success("บันทึกรับใบแจ้งหนี้ (AP) เรียบร้อย!");
        navigate("/ap/list");
      }
    } catch {
      toast.error("บันทึกไม่สำเร็จ ลองตรวจสอบข้อมูลอีกครั้งครับ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        {/* 🌟 จุดที่ 1: เติมไอคอนที่หัวข้อหน้าเพจ */}
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> บันทึกรับตั้งหนี้ (AP Invoice)
        </h1>
        <Link
          to="/ap/list"
          className="text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
        >
          ดูรายการ AP ทั้งหมด
        </Link>
      </div>

      {/* ปุ่มย้อนกลับ */}
      <button
        onClick={() => navigate("/gr/list")}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft size={20} /> กลับไปหน้ารายการรับของ (GR List)
      </button>

      {/* 1. ส่วนค้นหาใบรับของ (GR) */}
      <div className="flex gap-2 mb-8 bg-white p-6 shadow-sm border border-slate-200 rounded-xl items-end">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ค้นหาใบรับของ (GR No.)
          </label>
          {/* 🌟 จุดที่ 2: เติมไอคอนแว่นขยายที่ช่องค้นหา GR */}
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              className="pl-10 border border-slate-300 p-2.5 rounded-lg w-full max-w-sm focus:ring-2 focus:ring-blue-100 outline-none"
              value={grNo}
              onChange={(e) => setGrNo(e.target.value)}
              placeholder="เช่น GR-1234..."
            />
          </div>
        </div>
        <button
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          onClick={() => fetchGRForAP(grNo)}
          disabled={isFetching}
        >
          {isFetching ? "กำลังค้นหา..." : "ค้นหาข้อมูล"}
        </button>
      </div>

      {/* 2. ส่วนฟอร์มกรอกข้อมูลใบแจ้งหนี้ (จะแสดงเมื่อเจอ GR) */}
      {grDetails && (
        <div className="bg-white p-8 shadow-sm border border-slate-200 rounded-xl animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 pb-8 border-b border-slate-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ใบรับของอ้างอิง
              </label>
              <input
                disabled
                className="border border-slate-200 p-2.5 rounded-lg w-full bg-slate-50 text-slate-500 font-medium"
                value={grDetails.gr_no}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ใบสั่งซื้ออ้างอิง
              </label>
              <input
                disabled
                className="border border-slate-200 p-2.5 rounded-lg w-full bg-slate-50 text-slate-500 font-medium"
                value={grDetails.po_no}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Invoice ผู้ขาย (Vendor)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                {/* ไอคอนประดับในช่องกรอก */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Receipt size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-slate-700 font-medium placeholder:font-normal"
                  value={vendorInvoiceNo}
                  // บังคับเปลี่ยนตัวอักษรเป็นพิมพ์ใหญ่ (Uppercase) อัตโนมัติทันทีที่พิมพ์
                  onChange={(e) =>
                    setVendorInvoiceNo(e.target.value.toUpperCase())
                  }
                  placeholder="เช่น INV-2026001"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                วันครบกำหนดชำระ
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                className="border border-slate-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-100 outline-none"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* 3. ตารางระบุยอดเงิน */}
          <h2 className="font-bold text-slate-800 mb-4 text-lg">
            รายการสินค้าที่เรียกเก็บ
          </h2>
          <div className="overflow-x-auto border border-slate-200 rounded-lg mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">รหัสสินค้า</th>
                  <th className="p-4 font-semibold">รายละเอียดสินค้า</th>
                  <th className="p-4 font-semibold text-right">จำนวน (GR)</th>
                  <th className="p-4 font-semibold text-right">
                    ราคา/หน่วย (PO)
                  </th>
                  <th className="p-4 font-semibold text-right">
                    ยอดเรียกเก็บ (บาท)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apItems.map((item, idx) => {
                  const grItem = grDetails.items.find(
                    (i) => i.product_code === item.product_code,
                  );

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 text-blue-600 font-mono font-medium">
                        {item.product_code}
                      </td>
                      <td className="p-4 text-gray-700">
                        {grItem?.description}
                      </td>
                      <td className="p-4 text-right text-gray-500 font-medium">
                        {grItem?.received_qty}
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {Number(grItem?.unit_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-4 text-right flex justify-end">
                        <input
                          type="number"
                          className="border border-slate-300 p-2 w-32 text-right rounded-lg font-bold text-blue-700 bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                          value={item.amount === 0 ? "" : item.amount}
                          min="0"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const newItems = [...apItems];
                            newItems[idx].amount = val;
                            setApItems(newItems);
                          }}
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* สรุปยอด และ ปุ่มบันทึก */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="text-lg mb-4 sm:mb-0">
              <span className="font-semibold text-slate-700 mr-2">
                ยอดรวมสุทธิทั้งสิ้น:{" "}
              </span>
              <span className="font-bold text-red-600 text-xl">
                {totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                บาท
              </span>
            </div>

            {/* 🌟 จุดที่ 3: เติมไอคอนที่ปุ่มยืนยันการตั้งหนี้ */}
            <button
              disabled={isLoading}
              className={`
                flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-white font-bold shadow-md transition-all active:scale-95
                ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 hover:shadow-lg"}
              `}
              onClick={handleSaveAP}
            >
              {isLoading ? (
                "กำลังบันทึก..."
              ) : (
                <>
                  <CheckCircle size={20} /> ยืนยันการตั้งหนี้
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
