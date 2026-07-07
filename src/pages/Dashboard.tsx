import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Clock, AlertCircle, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

interface IncomingPO {
  po_no: string;
  vendor: string;
  items: number;
  expected_days?: number;
  status: string;
}

interface ExpenseChartData {
  name: string;
  amount: number;
}

interface DashboardSummary {
  head: {
    monthlyExpense: number;
    pendingPR: number;
    completedPO: number;
    expenseChart: ExpenseChartData[];
  };
  warehouse: {
    incomingPOs: IncomingPO[];
  };
  finance: {
    pendingAPAmount: number;
    paidAPAmount: number;
    dueSoonAPCount: number;
  };
}

export default function Dashboard() {
  const userStr = localStorage.getItem("currentUser");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // แปลง Role ใน Database ให้ตรงกับมุมมองหน้าจอ
  const getDashboardView = () => {
    const role = currentUser?.role?.toLowerCase() || "";

    if (role === "admin") return "admin"; // แอดมิน

    if (role === "receiver" || role === "warehouse" || role === "receiver_head")
      return "warehouse"; // คลังสินค้า

    if (role === "finance" || role === "finance_head") return "finance"; // บัญชี

    return "head"; // นอกนั้น (Head, Purchaser, Requester) ให้เห็นภาพรวมงบประมาณ
  };

  const activeRole = getDashboardView();
  // 🌟 2. ใส่ Type ให้ State
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 🌟 3. เปลี่ยนมาใช้ api.get ตามมาตรฐานของโปรเจกต์
        const response = await api.get("/dashboard/summary");
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // สามารถดึง toast มาใช้แจ้งเตือนได้ด้วย
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 🌟 4. ดักหน้าจอ Loading ไว้ก่อนที่ข้อมูลจะมา
  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium">
          กำลังโหลดข้อมูล Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {(activeRole === "head" || activeRole === "admin") && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ภาพรวม</h1>
            <p className="text-slate-500 mt-1">
              สรุปการเบิกจ่ายและคำขอซื้อประจำเดือนนี้
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
              <div className="text-slate-500 font-bold mb-2">
                งบประมาณที่ใช้ไป (เดือนนี้)
              </div>
              <div className="text-3xl font-black text-slate-800">
                {dashboardData.head.monthlyExpense.toLocaleString()}
                <span className="text-lg font-medium text-slate-500">THB</span>
              </div>
              <div className="text-sm text-rose-500 font-medium mt-2 flex items-center gap-1">
                <TrendingUp size={16} /> +30% จากเดือนที่แล้ว
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
              <div className="text-slate-500 font-bold mb-2">PR รออนุมัติ</div>
              <div className="text-3xl font-black text-slate-800">
                {dashboardData.head.pendingPR}
                <span className="text-lg font-medium text-slate-500">
                  รายการ
                </span>
              </div>
              <Link
                to="/pr/list"
                className="text-sm text-blue-600 font-bold mt-2 inline-block hover:underline"
              >
                ไปที่หน้าอนุมัติ &rarr;
              </Link>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
              <div className="text-slate-500 font-bold mb-2">
                PO ที่รับของแล้ว
              </div>
              <div className="text-3xl font-black text-slate-800">
                {dashboardData.head.completedPO}
                <span className="text-lg font-medium text-slate-500">
                  รายการ
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-2">
                ประเมินคุณภาพ Supplier ได้
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 text-lg">
              แนวโน้มค่าใช้จ่าย (6 เดือนล่าสุด)
            </h3>
            <div className="w-full h-80 bg-white p-4 rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.head.expenseChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          มุมมอง: คลังสินค้า (Warehouse)
      ========================================= */}
      {(activeRole === "warehouse" || activeRole === "admin") && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              คลังสินค้า (Warehouse)
            </h1>
            <p className="text-slate-500 mt-1">
              รายการสินค้าที่กำลังมาส่ง และใบสั่งซื้อที่รอดำเนินการ
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <ShoppingCart className="text-blue-600" /> รายการ PO
                รอรับเข้าคลัง
              </h3>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                {dashboardData.warehouse.incomingPOs.length} รายการ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4 pl-6">เลขที่ PO</th>
                    <th className="p-4">บริษัทผู้ขาย (Vendor)</th>
                    <th className="p-4 text-center">จำนวนชิ้น</th>
                    <th className="p-4 text-center">ประมาณการจัดส่ง</th>
                    <th className="p-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.warehouse.incomingPOs.map((po, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4 pl-6 font-bold text-blue-600">
                        {po.po_no}
                      </td>
                      <td className="p-4 font-medium text-slate-700">
                        {po.vendor}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-600">
                        {po.items}
                      </td>
                      <td className="p-4 text-center">
                        {po.expected_days === 1 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                            <Clock size={14} /> วันนี้
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">
                            ในอีก {po.expected_days} วัน
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          to={`/gr/create?po_no=${po.po_no}`}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          เตรียมรับของ (GR)
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          มุมมอง: บัญชี (Finance)
      ========================================= */}
      {(activeRole === "finance" || activeRole === "admin") && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              แผนกบัญชีและการเงิน
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปยอดเจ้าหนี้และรายการรอชำระเงินของบริษัท
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-6 text-lg">
                สัดส่วนสถานะเอกสารตั้งหนี้ (AP)
              </h3>
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "รอชำระเงิน",
                          value: dashboardData.finance.pendingAPAmount,
                        },
                        {
                          name: "ชำระแล้ว",
                          value: dashboardData.finance.paidAPAmount,
                        },
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" /> {/* Amber */}
                      <Cell fill="#10b981" /> {/* Emerald */}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        `${Number(value).toLocaleString()} บาท`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="text-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs font-bold text-slate-500">
                    รอชำระ:{" "}
                    {(dashboardData.finance.pendingAPAmount / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs font-bold text-slate-500">
                    ชำระแล้ว:{" "}
                    {(dashboardData.finance.paidAPAmount / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 relative overflow-hidden">
                <AlertCircle
                  className="absolute right-4 top-4 text-rose-200"
                  size={64}
                />
                <div className="relative z-10">
                  <div className="text-rose-700 font-bold mb-2">
                    AP ที่ใกล้เลยกำหนดชำระ (Due soon)
                  </div>
                  <div className="text-4xl font-black text-rose-700 mb-4">
                    {dashboardData.finance.dueSoonAPCount}{" "}
                    <span className="text-lg font-medium">รายการ</span>
                  </div>
                  <Link
                    to="/ap/list"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-block shadow-sm"
                  >
                    ตรวจสอบและทำจ่าย
                  </Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-slate-500 font-bold mb-1">
                    Cash Outflow เดือนนี้ (คาดการณ์)
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {(
                      dashboardData.finance.pendingAPAmount +
                      dashboardData.finance.paidAPAmount
                    ).toLocaleString()}{" "}
                    <span className="text-base text-slate-500 font-medium">
                      THB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
