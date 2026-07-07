import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCard, CheckCircle, ArrowLeft } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function PaymentPage() {
  // 🌟 ดึงข้อมูลคนล็อกอิน
  const userStr = localStorage.getItem("currentUser");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ดึงทั้ง ap_no และ amount ที่ส่งมาจากหน้า AP List
  const apNoFromUrl = searchParams.get("ap_no") || "";
  const amountFromUrl = searchParams.get("amount") || "";

  // States สำหรับฟอร์มจ่ายเงิน
  const [apNo, setApNo] = useState(apNoFromUrl);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // เอา amountFromUrl มาตั้งเป็นค่าเริ่มต้น
  const [paidAmount, setPaidAmount] = useState(amountFromUrl);
  const [slipImage, setSlipImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ถ้าเข้ามาแล้วไม่มี ap_no ให้แจ้งเตือนเบาๆ
  useEffect(() => {
    if (!apNoFromUrl) {
      toast("คุณสามารถกรอกเลขที่ AP เพื่อทำการจ่ายเงินได้", {
        icon: "ℹ️",
        id: "payment-info-toast", // ล็อก ID ไว้ไม่ให้มันเด้งซ้ำ
      });
    }
  }, [apNoFromUrl]);

  const handlePaymentSubmit = async () => {
    if (!apNo || !paidAmount) {
      toast.error("กรุณากรอกอ้างอิงเลขที่ AP และยอดเงินที่ชำระให้ครบถ้วน");
      return;
    }

    // 🌟 2. ป้องกันการกรอกยอดเงินติดลบ หรือ 0
    if (Number(paidAmount) <= 0) {
      toast.error("ยอดเงินที่ชำระต้องมีค่ามากกว่า 0");
      return;
    }

    setIsLoading(true);
    try {
      const paymentData = {
        payment_no: `PAY-${Date.now()}`, // สร้างเลขที่ใบเสร็จอัตโนมัติ
        payment_date: paymentDate,
        ap_no: apNo,
        payment_method: paymentMethod,
        paid_amount: Number(paidAmount),
        slip_image: slipImage || "-", // ถ้าไม่มีให้อนุโลมเป็นขีด
        paid_by: currentUser?.user_id || currentUser?.username, // 🌟 3. ส่ง User ID ของคนจ่ายเงินไปด้วย
      };

      const response = await api.post("/payment", paymentData);

      if (response.status === 201) {
        toast.success("บันทึกการชำระเงินสำเร็จ! 🎊", {
          duration: 4000,
        });
        navigate("/ap/list"); // จ่ายเสร็จ เด้งกลับไปหน้า AP List
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ปุ่มย้อนกลับ */}
      <button
        onClick={() => navigate("/ap/list")}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft size={20} /> กลับไปหน้ารายการตั้งหนี้
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-blue-600" /> บันทึกการชำระเงิน (Payment)
          </h1>
          <p className="text-slate-500 mt-1">
            ทำรายการจ่ายเงินให้ผู้ขาย และอัปเดตสถานะการตั้งหนี้
          </p>
        </div>
      </div>

      {/* ฟอร์มจ่ายเงิน */}
      <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              อ้างอิงเลขที่ตั้งหนี้ (AP No.){" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={apNo}
              onChange={(e) => setApNo(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="เช่น AP-178166..."
              readOnly={!!apNoFromUrl} // ถ้ามีเลขส่งมาให้ล็อกช่องไว้เลย
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              วันที่ชำระเงิน <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              ช่องทางการชำระเงิน
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Bank Transfer">
                โอนเงินผ่านธนาคาร (Bank Transfer)
              </option>
              <option value="Cheque">จ่ายเช็ค (Cheque)</option>
              <option value="Cash">เงินสด (Cash)</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              ยอดเงินที่ชำระ (บาท) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-bold text-slate-800"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              เลขที่อ้างอิงสลิป / เลขที่เช็ค
            </label>
            <input
              type="text"
              value={slipImage}
              onChange={(e) => setSlipImage(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกเลขอ้างอิงการโอนเงิน หรือเลขอ้างอิงเอกสาร..."
            />
          </div>
        </div>

        {/* ปุ่มยืนยัน */}
        <div className="flex justify-end pt-6 border-t border-slate-100">
          <button
            onClick={handlePaymentSubmit}
            disabled={isLoading}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg text-white font-bold shadow-md transition-all active:scale-95
              ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 hover:shadow-lg"}
            `}
          >
            {isLoading ? (
              "กำลังประมวลผล..."
            ) : (
              <>
                <CheckCircle size={20} /> ยืนยันการทำจ่าย
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
