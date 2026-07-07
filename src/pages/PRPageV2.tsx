import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { Trash2, Plus, ShoppingCart, FileText, Search } from "lucide-react"; // 🌟 1. นำเข้า Search icon
import { useDebounce } from "../hook/useDebounce";

// Interface สำหรับข้อมูล
interface SubCategory {
  sub_cat_id: number;
  main_cat_id: number;
  name: string;
}

interface Category {
  main_cat_id: number;
  name: string;
  sub_categories: SubCategory[];
}

interface Product {
  product_code: string;
  product_name: string;
  sub_cat_id: number | null;
  standard_price: number; // 🌟 เปลี่ยนให้ตรงกับชื่อคอลัมน์ใน DB
}

interface PRItem {
  product_code: string;
  product_name: string;
  qty: number;
  price: number;
}

export default function PRPageV2() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prItems, setPrItems] = useState<PRItem[]>([]);
  const [remark, setRemark] = useState("");
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 2. เพิ่ม State สำหรับเก็บคำค้นหาสินค้า
  const [searchTerm, setSearchTerm] = useState("");
  const debouncingSearchTerm = useDebounce(searchTerm, 450);

  // State สำหรับระบบ Free Text (สินค้านอกแคตตาล็อก)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [freeTextName, setFreeTextName] = useState("");
  const [freeTextQty, setFreeTextQty] = useState<number>(1);
  const [freeTextPrice, setFreeTextPrice] = useState<number | "">("");

  // 1. ดึงข้อมูลหมวดหมู่และสินค้า
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get("/categories"),
          api.get("/products"),
        ]);
        setCategories(catRes.data);
        setProducts(prodRes.data);
      } catch {
        toast.error("ไม่สามารถโหลดข้อมูลสินค้าได้");
      }
    };
    fetchData();
  }, []);

  // 3. ฟังก์ชันเพิ่มสินค้าจาก Catalog
  const addToPR = (product: Product) => {
    const isExist = prItems.find(
      (i) => i.product_code === product.product_code,
    );
    if (isExist) {
      setPrItems(
        prItems.map((i) =>
          i.product_code === product.product_code
            ? { ...i, qty: i.qty + 1 }
            : i,
        ),
      );
    } else {
      setPrItems([
        ...prItems,
        {
          product_code: product.product_code,
          product_name: product.product_name,
          qty: 1,
          price: product.standard_price, // 🌟 ดึงค่าจาก standard_price แทน
        },
      ]);
    }
    toast.success(`เพิ่ม ${product.product_name} แล้ว`);
  };

  // 4. ฟังก์ชันเพิ่มสินค้านอกระบบ (Free Text) ลงตะกร้า
  const handleAddFreeText = () => {
    if (!freeTextName.trim()) return toast.error("กรุณาระบุชื่อสินค้า");
    if (!freeTextPrice || Number(freeTextPrice) <= 0)
      return toast.error("กรุณาระบุราคาประเมินให้ถูกต้อง");
    if (freeTextQty <= 0) return toast.error("จำนวนต้องมากกว่า 0");

    setPrItems([
      ...prItems,
      {
        product_code: `NON-CAT-${Date.now()}`, // 🌟 เติม -${Date.now()} เข้าไป
        product_name: freeTextName,
        qty: freeTextQty,
        price: Number(freeTextPrice),
      },
    ]);

    toast.success(`เพิ่ม "${freeTextName}" ลงตะกร้าแล้ว`);

    // เคลียร์ฟอร์มและปิด Modal
    setFreeTextName("");
    setFreeTextQty(1);
    setFreeTextPrice("");
    setIsModalOpen(false);
  };

  // 🌟 ฟังก์ชันใหม่: สำหรับอัปเดตจำนวนสินค้าในตะกร้า
  const handleUpdateQty = (index: number, newQty: number) => {
    // ป้องกันไม่ให้พิมพ์เลขติดลบ หรือ 0 (ถ้าจะลบให้กดปุ่มถังขยะแทน)
    if (newQty < 1) return;

    const newItems = [...prItems];
    newItems[index].qty = newQty;
    setPrItems(newItems);
  };
  // 5. บันทึก PR ส่งไป Backend
  const handleSavePR = async () => {
    const userStr = localStorage.getItem("currentUser");
    const currentUser = userStr ? JSON.parse(userStr) : null;

    if (prItems.length === 0) return toast.error("ยังไม่มีรายการสินค้า");

    setIsLoading(true);
    try {
      const formattedItems = prItems.map((item) => ({
        product_code: item.product_code,
        description: item.product_name,
        quantity: item.qty,
        unit_price: item.price,
      }));

      const payload = {
        department: currentUser?.department || "IT",
        pr_date: new Date().toISOString().split("T")[0],
        requester_id: currentUser?.user_id,

        remark: remark.trim() === "" ? "-" : remark,

        items: formattedItems,
      };

      const response = await api.post("/pr", payload);

      toast.success(`บันทึกสำเร็จ! เลขที่: ${response.data.pr_no}`);

      // ล้างข้อมูลหลังบันทึกเสร็จ แล้วเด้งกลับไปหน้า PR List
      setPrItems([]);
      setRemark("");
      navigate("/pr/list");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">
          ขอซื้อสินค้า (PR) - ระบบเลือกผ่านหมวดหมู่
        </h1>
        <button
          onClick={() => navigate("/pr/list")}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95"
        >
          <FileText size={18} /> ดูรายการใบขอซื้อ (PR List)
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ฝั่งซ้าย: แสดงหมวดหมู่แบบ Grouped */}
        <div className="col-span-3 bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="font-semibold mb-3">หมวดหมู่สินค้า</h2>

          <button
            onClick={() => {
              setSelectedSubCatId(null);
              setSearchTerm("");
            }}
            className={`block w-full text-left p-2 rounded mb-4 text-sm font-bold border transition-colors ${
              selectedSubCatId === null
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            ดูสินค้าทั้งหมด
          </button>

          {/* 🌟 วนลูปจาก categories โดยตรง */}
          {categories?.map((main) => (
            <div key={main.main_cat_id} className="mb-4">
              <div className="font-bold text-blue-700 text-sm mb-1">
                {main.name} {/* 🌟 ใช้ main.name */}
              </div>

              {/* 🌟 วนลูปหมวดหมู่ย่อยจาก sub_categories */}
              {main.sub_categories?.map((sub) => (
                <button
                  key={sub.sub_cat_id}
                  onClick={() => {
                    setSelectedSubCatId(sub.sub_cat_id);
                    setSearchTerm("");
                  }}
                  className={`block w-full text-left p-2 rounded mb-1 text-sm transition-colors ${
                    selectedSubCatId === sub.sub_cat_id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "hover:bg-gray-100 text-slate-600"
                  }`}
                >
                  &gt; {sub.name} {/* 🌟 ใช้ sub.name */}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ฝั่งขวา: แสดงสินค้าที่กรองตามหมวดหมู่ หรือ แสดงกล่อง Empty State */}
        <div className="col-span-9">
          {/* 🌟 3. แถบ Action Bar ด้านบนสุดของฝั่งขวา */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap">
              <span className="bg-blue-50 text-blue-600 w-7 h-7 flex items-center justify-center rounded-lg text-sm">
                📦
              </span>
              {selectedSubCatId === null
                ? "รายการสินค้าทั้งหมด"
                : "สินค้าในหมวดหมู่ที่เลือก"}
            </h3>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* 🌟 ลบเงื่อนไข selectedSubCatId === null ออก เพื่อให้ช่องค้นหาแสดงตลอดเวลา */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-shadow"
                />
              </div>

              {/* ปุ่มระบุสินค้าเอง */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 text-sm whitespace-nowrap w-full sm:w-auto justify-center"
              >
                <Plus size={16} /> ระบุเอง (Free Text)
              </button>
            </div>
          </div>

          {/* ตาราง/การ์ดแสดงสินค้า */}
          {(() => {
            // 🌟 ปรับปรุง Logic การกรองสินค้าใหม่ทั้งหมดตรงนี้
            const filteredProducts = products.filter((p) => {
              // กรองสินค้านอกระบบออกไปก่อน
              if (p.product_code === "NON-CAT") return false;

              // 1. ตรวจสอบว่าตรงกับหมวดหมู่ที่เลือกไหม (ถ้าไม่ได้เลือกหมวดหมู่ ให้ถือว่าตรง = true)
              const matchCategory =
                selectedSubCatId === null ||
                Number(p.sub_cat_id) === Number(selectedSubCatId);

              // 2. ตรวจสอบว่าตรงกับคำค้นหาไหม (ถ้าไม่ได้พิมพ์ค้นหา ให้ถือว่าตรง = true)
              const matchSearch =
                debouncingSearchTerm.trim() === "" ||
                p.product_name
                  .toLowerCase()
                  .includes(debouncingSearchTerm.toLowerCase()) ||
                p.product_code
                  .toLowerCase()
                  .includes(debouncingSearchTerm.toLowerCase());

              // ต้องตรงทั้งหมวดหมู่ และ คำค้นหา จึงจะแสดงผล
              return matchCategory && matchSearch;
            });

            if (filteredProducts.length > 0) {
              return (
                <div className="grid grid-cols-3 gap-4">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.product_code}
                      className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <p className="font-bold text-xs text-gray-400 mb-1">
                        {p.product_code}
                      </p>
                      <h3
                        className="font-semibold text-md mb-2 line-clamp-2"
                        title={p.product_name}
                      >
                        {p.product_name}
                      </h3>

                      {/* 🌟 เพิ่มบรรทัดนี้เข้าไป เพื่อให้แสดงราคา */}
                      <p className="text-blue-600 font-bold text-sm mb-2">
                        ฿{Number(p.standard_price).toLocaleString()}
                      </p>

                      <button
                        onClick={() => addToPR(p)}
                        className="mt-3 bg-blue-600 text-white w-full py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-transform"
                      >
                        <Plus size={16} /> เลือกสินค้า
                      </button>
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-16 px-4 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">
                  ไม่พบสินค้าที่ค้นหา
                </h3>
                <p className="text-slate-500 mb-6 text-sm max-w-sm">
                  หากไม่มีสินค้าที่ต้องการในระบบ
                  คุณสามารถพิมพ์ระบุข้อมูลสินค้าเพื่อสั่งซื้อนอกแคตตาล็อกได้
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus size={18} /> ระบุสินค้าที่ต้องการเอง (Free Text)
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ตะกร้า PR */}
      <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="text-blue-600" />{" "}
          รายการสินค้าที่เลือกลงตะกร้า
        </h2>

        {/* 🌟 ตกแต่งตารางให้มี bg-slate-50 และขอบมน */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-4 font-semibold pl-6">รายการสินค้า</th>
                  <th className="p-4 font-semibold text-center w-32">จำนวน</th>
                  <th className="p-4 font-semibold text-right w-40">
                    ราคาประเมิน
                  </th>
                  <th className="p-4 font-semibold text-center w-20 pr-6">
                    ลบ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {prItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-slate-400"
                    >
                      <ShoppingCart
                        size={32}
                        className="mx-auto mb-2 opacity-20"
                      />
                      ยังไม่มีสินค้าในตะกร้า
                    </td>
                  </tr>
                ) : (
                  prItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-700">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.product_code === "NON-CAT"
                            ? "นอกแคตตาล็อก"
                            : item.product_code}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* ปุ่มลบจำนวน */}
                          <button
                            onClick={() => handleUpdateQty(idx, item.qty - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center font-bold transition-colors"
                          >
                            -
                          </button>

                          {/* ช่องพิมพ์ตัวเลข */}
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) handleUpdateQty(idx, val);
                            }}
                            className="w-16 py-1.5 text-center font-bold text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all no-spinners"
                          />

                          {/* ปุ่มบวกจำนวน */}
                          <button
                            onClick={() => handleUpdateQty(idx, item.qty + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-300 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right text-slate-600 font-medium">
                        {(item.price * item.qty).toLocaleString()}
                      </td>
                      <td className="p-4 text-center pr-6">
                        <button
                          onClick={() =>
                            setPrItems(prItems.filter((_, i) => i !== idx))
                          }
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* กล่องหมายเหตุ */}
        <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100">
          <label className="block text-sm font-bold text-amber-800 mb-2">
            เหตุผลในการขอซื้อ / หมายเหตุ (Remarks){" "}
          </label>
          <textarea
            className="w-full border border-amber-200/60 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
            rows={2}
            placeholder="ระบุเหตุผลการขอซื้อ เช่น สำหรับเตรียมเครื่องให้พนักงานใหม่แผนก IT..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          ></textarea>
        </div>

        {/* สรุปยอดและปุ่ม Submit */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-xl border border-slate-100 gap-4">
          <div className="text-lg font-medium text-slate-600 flex items-center gap-2">
            ยอดรวม:{" "}
            <span className="font-bold text-2xl text-blue-700">
              {prItems
                .reduce((sum, item) => sum + item.price * item.qty, 0)
                .toLocaleString()}
            </span>
            <span className="text-sm font-normal">บาท</span>
          </div>
          <button
            onClick={handleSavePR}
            disabled={isLoading || prItems.length === 0}
            className={`px-8 py-3.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              isLoading || prItems.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 active:scale-95"
            }`}
          >
            {isLoading ? "กำลังบันทึก..." : <>ส่งใบขอซื้อ (Submit PR)</>}
          </button>
        </div>
      </div>

      {/* Modal ป๊อปอัป สำหรับกรอกสินค้านอกระบบ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">
                ระบุสินค้านอกแคตตาล็อก
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  ชื่อสินค้า/รายละเอียด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={freeTextName}
                  onChange={(e) => setFreeTextName(e.target.value)}
                  placeholder="เช่น เก้าอี้เพื่อสุขภาพ สีดำ"
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={freeTextQty}
                    onChange={(e) => setFreeTextQty(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    ราคาประเมิน/หน่วย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={freeTextPrice}
                    onChange={(e) =>
                      setFreeTextPrice(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * ราคาประเมินคือราคาคร่าวๆ
                ฝ่ายจัดซื้อจะทำการหาราคาจริงในขั้นตอนออกใบสั่งซื้อ (PO)
              </p>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddFreeText}
                className="px-6 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-transform active:scale-95"
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
