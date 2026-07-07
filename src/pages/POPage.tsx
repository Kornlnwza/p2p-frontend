import { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Trash2,
  ArrowDownToLine,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hook/useAuth";
import type { POFormItem, IncomingPRItem, Vendor } from "../types";

export default function POPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    po_date: new Date().toISOString().split("T")[0],
    pr_no: "",
    vendor_id: "",
    buyer_id: currentUser?.username || "",
  });

  const [items, setItems] = useState<POFormItem[]>([
    { item_code: "", item_desc: "", quantity: 1, unit_price: 0 },
  ]);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isPrFetched, setIsPrFetched] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get("/vendors");
        setVendorList(res.data);
      } catch {
        toast.error("โหลดข้อมูล Vendor ไม่สำเร็จ");
      }
    };
    fetchVendors();
  }, []);

  const handleHeaderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setHeader({ ...header, [e.target.name]: e.target.value });
    if (e.target.name === "pr_no") {
      setIsPrFetched(false);
      setItems([{ item_code: "", item_desc: "", quantity: 1, unit_price: 0 }]);
    }
  };

  const handleItemChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [e.target.name]: e.target.value };
    setItems(newItems);
  };

  const handleFetchPRData = async () => {
    if (!header.pr_no) return toast.error("กรุณากรอกเลข PR");
    setIsFetching(true);

    try {
      const prListRes = await api.get("/pr");
      const targetPR = prListRes.data.find(
        (pr: { pr_no: string; status: string }) => pr.pr_no === header.pr_no,
      );

      if (!targetPR) {
        setIsPrFetched(false);
        return toast.error("ไม่พบข้อมูล PR เลขที่นี้ในระบบ");
      }

      if (targetPR.status.toLowerCase() !== "approved") {
        setIsPrFetched(false);
        setItems([
          { item_code: "", item_desc: "", quantity: 1, unit_price: 0 },
        ]);
        return toast.error(
          `ไม่อนุญาตให้ออก PO: ใบ PR นี้มีสถานะ "${targetPR.status}"`,
        );
      }

      const response = await api.get(`/pr/${header.pr_no}`);

      if (response.data.length === 0) {
        return toast.error("ไม่พบรายการสินค้าใน PR ใบนี้");
      }

      setItems(
        response.data.map((item: IncomingPRItem) => ({
          item_code: item.product_code,
          item_desc: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      );
      setIsPrFetched(true);
      toast.success("ดึงข้อมูล PR สำเร็จ พร้อมสร้าง PO");
    } catch {
      setIsPrFetched(false);
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล PR");
    } finally {
      setIsFetching(false);
    }
  };

  const executeRejectPR = async () => {
    if (!header.pr_no) return;
    setIsRejectModalOpen(false);
    try {
      await api.put(`/po/reject-pr/${header.pr_no}`);
      toast.success(`ปฏิเสธใบขอซื้อ ${header.pr_no} เรียบร้อยแล้ว`);
      navigate("/po/list");
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถปฏิเสธใบ PR ได้ กรุณาลองอีกครั้ง");
    }
  };

  const calculateGrandTotal = () =>
    items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0,
    );

  const addItemRow = () =>
    setItems([
      ...items,
      { item_code: "", item_desc: "", quantity: 1, unit_price: 0 },
    ]);

  const removeItemRow = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!header.pr_no || !header.vendor_id)
      return toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");

    if (!isPrFetched) {
      return toast.error("กรุณากดดึงข้อมูล PR ก่อนทำการบันทึก");
    }

    try {
      const formattedPayload = {
        po_date: header.po_date,
        pr_no: header.pr_no,
        vendor_id: Number(header.vendor_id),
        buyer_id: Number(currentUser?.user_id),
        items: items.map((item) => ({
          product_code: item.item_code,
          description: item.item_desc,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      };

      await api.post("/po", formattedPayload);
      toast.success("บันทึก PO สำเร็จ!");
      navigate("/po/list");
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Backend Error:", err.response?.data);
      toast.error(err.response?.data?.message || "บันทึกข้อมูลล้มเหลว");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="text-blue-600" /> สร้างใบสั่งซื้อ (PO)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ดึงข้อมูลใบขอซื้อมาตรวจสอบและออกใบสั่งซื้อ
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate("/po/list")}
              className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            {isPrFetched && (
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 hover:border-rose-300 active:scale-95 transition-all shadow-sm"
              >
                <XCircle size={18} /> ไม่อนุมัติ PR
              </button>
            )}

            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Save size={18} /> บันทึกใบสั่งซื้อ
            </button>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                อ้างอิง PR <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  name="pr_no"
                  value={header.pr_no}
                  onChange={handleHeaderChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all uppercase font-medium"
                  placeholder="เช่น PR-2026-001"
                />
                <button
                  onClick={handleFetchPRData}
                  disabled={isFetching}
                  className="px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                  title="ดึงข้อมูลรายการสินค้าจากใบ PR"
                >
                  <ArrowDownToLine size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                ผู้ขาย (VENDOR) <span className="text-rose-500">*</span>
              </label>
              <select
                name="vendor_id"
                value={header.vendor_id}
                onChange={handleHeaderChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium text-slate-700"
              >
                <option value="">-- เลือกผู้ขาย --</option>
                {vendorList.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                วันที่สั่งซื้อ
              </label>
              <input
                name="po_date"
                type="date"
                value={header.po_date}
                onChange={handleHeaderChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">รายการสินค้า</h3>
            <button
              onClick={addItemRow}
              className="text-sm bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={16} /> เพิ่มรายการ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 pl-6 w-1/6">รหัสสินค้า</th>
                  <th className="p-4">รายละเอียด</th>
                  <th className="p-4 text-right w-28">จำนวน</th>
                  <th className="p-4 text-right w-36">ราคา/หน่วย</th>
                  <th className="p-4 pr-6 text-right w-36">รวม (บาท)</th>
                  <th className="p-4 text-center w-16">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {items.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 pl-6">
                      <input
                        name="item_code"
                        value={item.item_code}
                        onChange={(e) => handleItemChange(index, e)}
                        readOnly={!!header.pr_no}
                        className={`w-full p-2.5 rounded-lg transition-all outline-none font-mono text-sm ${
                          header.pr_no
                            ? "bg-transparent text-slate-500 border-transparent font-medium"
                            : "bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        }`}
                        placeholder="รหัส"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        name="item_desc"
                        value={item.item_desc}
                        onChange={(e) => handleItemChange(index, e)}
                        readOnly={!!header.pr_no}
                        className={`w-full p-2.5 rounded-lg transition-all outline-none text-sm ${
                          header.pr_no
                            ? "bg-transparent text-slate-700 border-transparent font-medium"
                            : "bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        }`}
                        placeholder="รายละเอียดสินค้า"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-right bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        name="unit_price"
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-right bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium"
                      />
                    </td>
                    <td className="p-3 pr-6 text-right font-bold text-blue-700 bg-blue-50/30">
                      {(
                        Number(item.quantity) * Number(item.unit_price)
                      ).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => removeItemRow(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-slate-50 text-right border-t border-slate-200 flex items-center justify-end gap-4">
            <span className="text-slate-500 font-bold uppercase text-sm tracking-wider">
              ยอดรวมสุทธิ (Grand Total):
            </span>
            <div className="bg-blue-100 text-blue-700 px-6 py-2 rounded-xl font-bold text-2xl shadow-inner border border-blue-200">
              {calculateGrandTotal().toLocaleString()} บาท
            </div>
          </div>
        </div>

        {/* Modal แจ้งเตือนการปฏิเสธ */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle size={40} className="text-rose-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  ยืนยันการไม่อนุมัติ?
                </h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed px-2">
                  คุณกำลังจะปฏิเสธเอกสารหมายเลข{" "}
                  <span className="font-bold text-slate-700">
                    {header.pr_no}
                  </span>
                  <br />
                  การกระทำนี้จะไม่สามารถย้อนกลับได้
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setIsRejectModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={executeRejectPR}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md active:scale-95"
                  >
                    ไม่อนุมัติ
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
