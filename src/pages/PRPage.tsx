import { useState } from "react";
import { Save, FileText, Trash2, Plus } from "lucide-react"; // เพิ่ม Trash2, Plus กลับมา
import toast from "react-hot-toast";
import api from "../services/api";

export default function PRPage() {
  const [header, setHeader] = useState({
    pr_date: new Date().toISOString().split("T")[0],
    requester_id: "",
    department: "IT",
  });

  const [items, setItems] = useState([
    { item_code: "", item_desc: "", quantity: 1, unit_price: 0 },
  ]);

  const handleHeaderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setHeader({ ...header, [e.target.name]: e.target.value });
  };

  const handleItemChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [e.target.name]: e.target.value };
    setItems(newItems);
  };

  const addItemRow = () =>
    setItems([
      ...items,
      { item_code: "", item_desc: "", quantity: 1, unit_price: 0 },
    ]);
  const removeItemRow = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  // ฟังก์ชันคำนวณยอดรวมทั้งหมด (โชว์ให้ User เห็น)
  const calculateTotal = () => {
    return items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0,
    );
  };

  const handleSubmit = async () => {
    if (!header.requester_id) {
      toast.error("กรุณากรอกรหัสผู้ขอซื้อ");
      return;
    }

    const payload = {
      ...header,
      items: items.map((item) => ({
        product_code: item.item_code,
        description: item.item_desc,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    };

    try {
      const response = await api.post("/pr", payload);
      toast.success(`บันทึกสำเร็จ! เลขเอกสาร: ${response.data.pr_no}`);
      setHeader({ ...header, requester_id: "" });
      setItems([{ item_code: "", item_desc: "", quantity: 1, unit_price: 0 }]);
    } catch (error) {
      // ระบุโครงสร้าง (Type) ให้ ESLint สบายใจ แทนการใช้ any
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        "บันทึกไม่สำเร็จ: " +
          (err.response?.data?.message || "โปรดตรวจสอบข้อมูล"),
      );
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> สร้างใบขอซื้อ (PR)
          </h1>
        </div>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <Save size={20} /> ส่งคำขอ PR
        </button>
      </div>

      {/* --- ส่วน Header (เพิ่ม Labels แล้ว) --- */}
      <div className="p-6 mb-6 bg-white border border-slate-200 rounded-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-700 border-b pb-2">
          ข้อมูลผู้ขอซื้อ
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              เลขที่เอกสาร
            </label>
            <input
              disabled
              className="w-full p-2 border rounded bg-slate-100 text-slate-500"
              value={`PR-${header.department}-Auto`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              วันที่ขอซื้อ
            </label>
            <input
              disabled
              type="date"
              value={header.pr_date}
              className="w-full p-2 border rounded bg-slate-100 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              แผนก
            </label>
            <select
              name="department"
              value={header.department}
              onChange={handleHeaderChange}
              className="w-full p-2 border rounded bg-blue-50 focus:ring-2 focus:ring-blue-500"
            >
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Purchasing">Purchasing</option>
              <option value="Accounting">Accounting</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              รหัสพนักงาน *
            </label>
            <input
              name="requester_id"
              value={header.requester_id}
              onChange={handleHeaderChange}
              placeholder="เช่น 1"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* --- ส่วน Items (เพิ่มปุ่มถังขยะและสรุปยอด) --- */}
      <div className="p-6 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-slate-700">รายการสินค้า</h2>
          <button
            onClick={addItemRow}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-sm text-slate-600">
              <th className="p-3 font-medium">รหัสสินค้า</th>
              <th className="p-3 font-medium">ชื่อสินค้า / รายละเอียด</th>
              <th className="p-3 font-medium text-right">จำนวน</th>
              <th className="p-3 font-medium text-right">ราคา/หน่วย</th>
              <th className="p-3 w-12 text-center"></th>
              {/* คอลัมน์สำหรับปุ่มลบ */}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b group">
                <td className="p-2">
                  <input
                    name="item_code"
                    value={item.item_code}
                    onChange={(e) => handleItemChange(index, e)}
                    className="w-full border p-2 rounded focus:ring-1 focus:ring-blue-400"
                    placeholder="เช่น P001"
                  />
                </td>
                <td className="p-2">
                  <input
                    name="item_desc"
                    value={item.item_desc}
                    onChange={(e) => handleItemChange(index, e)}
                    className="w-full border p-2 rounded focus:ring-1 focus:ring-blue-400"
                    placeholder="ชื่อสินค้า..."
                  />
                </td>
                <td className="p-2">
                  <input
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, e)}
                    type="number"
                    min="1"
                    className="w-full border p-2 rounded text-right focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="p-2">
                  <input
                    name="unit_price"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, e)}
                    type="number"
                    min="0"
                    className="w-full border p-2 rounded text-right focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="p-2 text-center">
                  {/* ซ่อนปุ่มลบถ้ารายการมีแค่ 1 แถว */}
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItemRow(index)}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* สรุปยอดรวม */}
        <div className="mt-4 flex justify-end">
          <div className="bg-slate-50 p-4 rounded-lg border w-64">
            <div className="flex justify-between font-bold text-slate-800 text-lg">
              <span>ยอดรวมทั้งหมด:</span>
              <span>฿ {calculateTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
