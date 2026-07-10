import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../hook/useAuth";

// กำหนด Type สำหรับรายการสินค้าใน PR
interface PRItemInput {
  description: string;
  quantity: number;
  estimated_price: number;
}

export default function PRPageV2() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. State ข้อมูลทั่วไป
  const { department } = useAuth();
  const [requiredDate, setRequiredDate] = useState("");
  const [remark, setRemark] = useState("");

  // pr type
  const [prType, setPrType] = useState("Requirement");
  const [otherType, setOtherType] = useState("");

  // 2. State รายการสินค้า (เริ่มต้นมี 1 แถวว่างๆ)
  const [items, setItems] = useState<PRItemInput[]>([
    { description: "", quantity: 1, estimated_price: 0 },
  ]);

  // 3. State ไฟล์แนบ (ใบเสนอราคา)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [file, setFile] = useState<File | null>(null);

  // --- ฟังก์ชันจัดการรายการสินค้า (Items) ---
  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, estimated_price: 0 }]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    if (items.length === 1) {
      toast.error("ต้องมีสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  const handleItemChange = (
    index: number,
    field: keyof PRItemInput,
    value: string | number,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // --- ฟังก์ชันจัดการไฟล์แนบ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]; // ใช้ optional chaining ให้กระชับ

    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 5MB");
      e.target.value = ""; // เคลียร์ค่า input ให้เลือกใหม่ได้
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("รองรับเฉพาะไฟล์ PDF, JPG และ PNG เท่านั้น");
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- ฟังก์ชันบันทึกข้อมูล (Submit) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate เบื้องต้น
    if (!department || !requiredDate || !remark) {
      toast.error("กรุณากรอกข้อมูลทั่วไปให้ครบถ้วน");
      return;
    }
    const hasEmptyItems = items.some((i) => !i.description || i.quantity <= 0);
    if (hasEmptyItems) {
      toast.error("กรุณากรอกรายละเอียดและจำนวนสินค้าให้ถูกต้อง");
      return;
    }

    setIsSubmitting(true);

    try {
      // 🌟 ใช้ FormData เพื่อให้สามารถส่งไฟล์ไปพร้อมกับ Text ได้
      const formData = new FormData();
      formData.append("department", department);
      formData.append("required_date", requiredDate);
      formData.append("remark", remark);

      formData.append("pr_type", prType);

      // ส่ง items ไปในรูปแบบ JSON String
      formData.append("items", JSON.stringify(items));

      if (file) {
        formData.append("file", file); // 🌟 ตรงนี้คือคีย์หลักที่ Backend รอรับอยู่
      }

      // ยิง API (สมมติว่าเป็น Endpoint: POST /pr)
      await api.post("/pr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("สร้างใบขอซื้อสำเร็จ! (สถานะ: รอดำเนินการ)");
      navigate("/pr/list"); // ส่งกลับไปหน้ารวม
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "เกิดข้อผิดพลาดในการสร้างใบขอซื้อ",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // คำนวณยอดรวมประเมิน
  const totalEstimatedAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.estimated_price,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/pr/list"
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-amber-500" /> สร้างใบขอซื้อ (PR)
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                กรอกรายละเอียดเพื่อขออนุมัติการสั่งซื้อสินค้า
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: ข้อมูลทั่วไป */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
              ข้อมูลทั่วไป
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  แผนกที่ขอเบิก (Department)
                </label>
                <input
                  type="text"
                  value={department} // 🌟 2. จุดนี้สำคัญมาก! ต้องเอาตัวแปรมาใส่ใน value
                  readOnly
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * ดึงข้อมูลแผนกอัตโนมัติจากโปรไฟล์ของคุณ
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  วันที่ต้องการใช้สินค้า{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                "เสนอซื้อ / Requirement",
                "สินค้าตัวอย่าง / Sample or test",
                "เสนอซ่อม / Maintenance",
                "เพื่อสำรอง / Spare",
                "จัดจ้างผู้รับเหมา / Contractor",
              ].map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer"
                >
                  <input
                    type="radio"
                    name="prType"
                    value={type}
                    checked={prType === type}
                    onChange={(e) => setPrType(e.target.value)}
                  />
                  <span>{type}</span>
                </label>
              ))}
              <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="prType"
                  value="อื่นๆ / Other"
                  checked={prType === "อื่นๆ / Other"}
                  onChange={() => setPrType("อื่นๆ / Other")}
                />
                <span>อื่นๆ / Other</span>
              </label>
            </div>

            {prType === "อื่นๆ / Other" && (
              <input
                type="text"
                value={otherType} // 🌟 นำตัวแปรมาผูกกับ value
                onChange={(e) => setOtherType(e.target.value)} // 🌟 นำฟังก์ชันมาผูก
                placeholder="โปรดระบุรายละเอียด..."
                className="border p-2 rounded"
              />
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                เหตุผลความจำเป็นในการสั่งซื้อ{" "}
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="ระบุเหตุผล เช่น เพื่อใช้ในโปรเจกต์ X หรือ ทดแทนอุปกรณ์ที่ชำรุด..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 2: รายการสินค้า */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                รายการสินค้าที่ต้องการ
              </h2>
              <span className="text-sm text-slate-500 font-medium">
                รวมประเมิน:{" "}
                <span className="text-lg font-black text-blue-600 ml-1">
                  {totalEstimatedAmount.toLocaleString()}
                </span>{" "}
                บาท
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-slate-500 font-bold bg-slate-50/50">
                  <tr>
                    <th className="p-3 pl-4 rounded-tl-lg w-16">ลำดับ</th>
                    <th className="p-3 w-1/2">
                      รายละเอียดสินค้า / สเปค{" "}
                      <span className="text-rose-500">*</span>
                    </th>
                    <th className="p-3 text-center">
                      จำนวน <span className="text-rose-500">*</span>
                    </th>
                    <th className="p-3 text-right">ราคาประเมิน/หน่วย</th>
                    <th className="p-3 text-center rounded-tr-lg w-16">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3 pl-4 font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="เช่น คอมพิวเตอร์โน๊ตบุ๊ค Core i7"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm text-center"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={item.estimated_price}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "estimated_price",
                              Number(e.target.value),
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm text-right"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 text-sm font-bold text-blue-600 flex items-center gap-1.5 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={16} /> เพิ่มรายการสินค้า
            </button>
          </div>

          {/* Section 3: อัปโหลดไฟล์ (เอกสารอ้างอิง) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                เอกสารแนบ (ใบเสนอราคา)
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                แนบไฟล์ใบเสนอราคาจากร้านค้า หรือรูปภาพสเปคอ้างอิง
                เพื่อประกอบการตัดสินใจ
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 bg-slate-50"}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf, image/jpeg, image/png"
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white rounded-full shadow-sm text-blue-500 mb-2">
                    <UploadCloud size={28} />
                  </div>
                  <p className="text-slate-600 font-medium">
                    คลิกเพื่ออัปโหลดไฟล์ หรือลากไฟล์มาวางที่นี่
                  </p>
                  <p className="text-xs text-slate-400">
                    รองรับ PDF, JPG, PNG (ขนาดไม่เกิน 5MB)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                  >
                    เลือกไฟล์
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-200 shadow-sm max-w-md mx-auto">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="text-blue-500 shrink-0" size={24} />
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                หากไม่มีใบเสนอราคาในขณะนี้ สามารถข้ามไปก่อนได้
                และให้จัดซื้อเป็นผู้หาเปรียบเทียบราคาในภายหลัง
              </p>
            </div>
          </div>

          {/* ปุ่ม Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/pr/list")}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>{" "}
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={20} /> บันทึกใบขอซื้อ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
