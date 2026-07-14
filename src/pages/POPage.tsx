import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Save,
  CheckSquare,
  Square,
  Building2,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hook/useAuth";

interface BackendItem {
  item_id: number;
  pr_no: string;
  department: string;
  description: string;
  quantity: number;
  estimated_price: number;
  unit_price?: number;
  vendor_id: number | null;
}

interface PendingItem extends BackendItem {
  actual_price: number; // สำหรับให้จัดซื้อพิมพ์ราคาที่ต่อรองได้
}

interface Vendor {
  vendor_id: string;
  vendor_name: string;
}

export default function POPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // 🌟 ตอนนี้เราจะดึงมาใช้งานแล้ว จะไม่ Error ครับ

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // เก็บ ID ของสินค้าที่ถูกติ๊กเลือก
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  // เก็บ Vendor ที่เราจะออกใบ PO ให้ (เลือกจาก Dropdown ด้านล่าง)
  const [targetVendorId, setTargetVendorId] = useState<string>("");

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // ดึงข้อมูลสินค้าที่รอสั่งซื้อ และ รายชื่อ Vendor จาก Backend
    const fetchData = async () => {
      try {
        const [itemsRes, vendorsRes] = await Promise.all([
          api.get("/pr/pending-items"),
          api.get("/vendors"),
        ]);

        // 🌟 2. ใช้ BackendItem แทน any
        const itemsWithPrice = itemsRes.data.map(
          (item: BackendItem): PendingItem => ({
            ...item,
            actual_price: item.estimated_price || item.unit_price || 0,
          }),
        );

        setPendingItems(itemsWithPrice);
        setVendorList(vendorsRes.data);
      } catch {
        toast.error("ไม่สามารถดึงข้อมูลสินค้าที่รอสั่งซื้อได้");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ฟังก์ชันจัดการการติ๊กเลือกสินค้า
  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  // ฟังก์ชันจัดหมวดหมู่สินค้าอัตโนมัติ (Group by Vendor)
  const groupedItems = pendingItems.reduce(
    (acc, item) => {
      const key = item.vendor_id ? String(item.vendor_id) : "unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, PendingItem[]>,
  );

  // ฟังก์ชันอัปเดตราคาที่จัดซื้อกรอกเข้ามาใหม่
  const handlePriceChange = (itemId: number, newPrice: string) => {
    setPendingItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId
          ? { ...item, actual_price: Number(newPrice) }
          : item,
      ),
    );
  };

  // ฟังก์ชันส่งข้อมูลไปสร้าง PO
  const handleCreatePO = async () => {
    if (selectedItemIds.length === 0)
      return toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
    if (!targetVendorId)
      return toast.error("กรุณาเลือกผู้ขาย (Vendor) ที่ด้านล่าง");

    const selectedItemsData = pendingItems.filter((item) =>
      selectedItemIds.includes(item.item_id),
    );

    const payload = {
      vendor_id: Number(targetVendorId),
      buyer_id: currentUser?.username,
      po_date: new Date().toISOString().split("T")[0],
      items: selectedItemsData.map((item) => ({
        pr_item_id: item.item_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.actual_price,
      })),
    };

    setIsCreating(true);
    console.log("vendor_id ที่ได้รับ:", targetVendorId, typeof targetVendorId);
    try {
      const res = await api.post("/po", payload);
      toast.success(`สร้างใบสั่งซื้อสำเร็จ! เลขที่: ${res.data.po_no}`);
      navigate("/po/list");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 pb-32 min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <ShoppingCart className="text-blue-600" size={28} />
              ตะกร้าสินค้า (PO Item Pool)
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              เลือกรายการสินค้าที่ผ่านการอนุมัติแล้ว
              เพื่อนำมาจัดกลุ่มออกใบสั่งซื้อ
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-700">
              ไม่มีรายการสินค้าที่รอสั่งซื้อ
            </h3>
            <p className="text-slate-500 mt-2">
              รายการที่ผ่านการอนุมัติและยังไม่ออกใบ PO จะแสดงที่นี่
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedItems).map(([vendorIdKey, items]) => {
              const vendorName =
                vendorIdKey === "unassigned"
                  ? "⚠️ รอกำหนดผู้ขาย (Unassigned)"
                  : vendorList.find((v) => String(v.vendor_id) === vendorIdKey)
                      ?.vendor_name || `Vendor ID: ${vendorIdKey}`;

              const isUnassigned = vendorIdKey === "unassigned";

              return (
                <div
                  key={vendorIdKey}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* หัวกล่อง */}
                  <div
                    className={`p-4 flex justify-between items-center border-b ${isUnassigned ? "bg-orange-50 border-orange-100" : "bg-slate-800 border-slate-800"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2
                        className={
                          isUnassigned ? "text-orange-500" : "text-slate-300"
                        }
                        size={20}
                      />
                      <h2
                        className={`font-bold text-lg ${isUnassigned ? "text-orange-800" : "text-white"}`}
                      >
                        {vendorName}
                      </h2>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold ${isUnassigned ? "bg-orange-200 text-orange-800" : "bg-slate-700 text-slate-300"}`}
                    >
                      {items.length} รายการ
                    </span>
                  </div>

                  {/* ตารางสินค้า */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-3 w-16 text-center">เลือก</th>
                          <th className="p-3 w-32">อ้างอิง PR</th>
                          <th className="p-3 w-32">แผนก</th>
                          <th className="p-3">รายการสินค้า</th>
                          <th className="p-3 text-center w-24">จำนวน</th>
                          <th className="p-3 text-right w-32">ราคาประเมิน</th>
                          <th className="p-3 text-right w-40 text-blue-700">
                            ราคาซื้อจริง (แก้ไขได้)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => {
                          const isSelected = selectedItemIds.includes(
                            item.item_id,
                          );
                          return (
                            <tr
                              key={item.item_id}
                              className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50/40" : ""}`}
                            >
                              <td
                                className="p-3 text-center cursor-pointer"
                                onClick={() =>
                                  toggleItemSelection(item.item_id)
                                }
                              >
                                {isSelected ? (
                                  <CheckSquare
                                    className="text-blue-600 inline"
                                    size={22}
                                  />
                                ) : (
                                  <Square
                                    className="text-slate-300 inline hover:text-blue-400"
                                    size={22}
                                  />
                                )}
                              </td>
                              <td className="p-3 font-medium text-slate-600">
                                {item.pr_no}
                              </td>
                              <td className="p-3 text-slate-500">
                                {item.department}
                              </td>
                              <td className="p-3 font-bold text-slate-800">
                                {item.description}
                              </td>
                              <td className="p-3 text-center font-medium">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right text-slate-500">
                                ฿
                                {Number(
                                  item.estimated_price || 0,
                                ).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={item.actual_price}
                                  onChange={(e) =>
                                    handlePriceChange(
                                      item.item_id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-right p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-blue-700 font-bold bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* แถบเมนูด้านล่าง (Sticky Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between xl:pl-64">
          <div className="flex items-center gap-6">
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold border border-blue-100">
              เลือกแล้ว:{" "}
              <span className="text-xl mx-1">{selectedItemIds.length}</span>{" "}
              รายการ
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700">
                ออกใบสั่งซื้อ (PO) ให้กับ:
              </label>
              <select
                value={targetVendorId}
                onChange={(e) => setTargetVendorId(e.target.value)}
                className="p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-w-[280px] font-medium bg-slate-50"
              >
                <option value="" disabled>
                  -- เลือกบริษัทผู้ขาย (Vendor) --
                </option>
                {vendorList.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreatePO}
            disabled={
              selectedItemIds.length === 0 || !targetVendorId || isCreating
            }
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Save size={20} />
            {isCreating ? "กำลังบันทึก..." : "สร้างใบสั่งซื้อ (Create PO)"}
          </button>
        </div>
      </div>
    </div>
  );
}
