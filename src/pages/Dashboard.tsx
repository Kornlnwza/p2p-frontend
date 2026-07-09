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
import {
  TrendingUp,
  Clock,
  TrendingDown,
  Minus,
  AlertCircle,
  ShoppingCart,
  PackageX,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hook/useAuth"; // 🌟 ดึง useAuth มาใช้งาน

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
    expenseTrend: number;
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
  // 🌟 1. ใช้ Hook แทนการดึง localStorage ตรงๆ เพื่อความปลอดภัย
  const { userRole } = useAuth();

  const getDashboardView = () => {
    const role = userRole?.toLowerCase() || "";

    if (role === "admin") return "admin";
    if (
      role === "receiver" ||
      role === "warehouse" ||
      role === "receiver_head" ||
      role.includes("warehouse")
    )
      return "warehouse";
    if (role === "finance" || role === "finance_head") return "finance";
    return "head";
  };

  const activeRole = getDashboardView();

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 🌟 เพิ่ม State จัดการ Error

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/dashboard/summary");
        setDashboardData(response.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(
          "ไม่สามารถดึงข้อมูล Dashboard ได้ในขณะนี้ โปรดลองใหม่อีกครั้ง",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 🌟 จัดการหน้าจอ Error
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
          <AlertTriangle size={48} />
        </div>
        <p className="text-slate-600 font-medium text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  // 🌟 ตกแต่งหน้าจอ Loading ใหม่ให้ดู Modern
  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-500 font-bold tracking-wide animate-pulse">
          กำลังเตรียมข้อมูล Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* =========================================
          มุมมอง: ผู้บริหาร / จัดซื้อ (Head / Admin)
      ========================================= */}
      {(activeRole === "head" || activeRole === "admin") && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              ภาพรวมระบบจัดซื้อ (Overview)
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปการเบิกจ่ายและคำขอซื้อประจำเดือนนี้
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* กล่อง 1 */}
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="text-slate-500 font-bold mb-2">
                งบประมาณที่ใช้ไป (เดือนนี้)
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tight">
                {dashboardData.head.monthlyExpense.toLocaleString()}
                <span className="text-lg font-bold text-slate-400 ml-1">
                  THB
                </span>
              </div>
              {/*Real-time % งบประมาณ */}
              {dashboardData.head.expenseTrend > 0 ? (
                // กรณีใช้เงิน "เพิ่มขึ้น" (สีแดง)
                <div className="text-sm text-rose-500 font-bold mt-3 flex items-center gap-1.5 bg-rose-50 w-fit px-2.5 py-1 rounded-lg">
                  <TrendingUp size={16} /> +{dashboardData.head.expenseTrend}%
                  จากเดือนที่แล้ว
                </div>
              ) : dashboardData.head.expenseTrend < 0 ? (
                // กรณีใช้เงิน "ลดลง" (สีเขียว)
                <div className="text-sm text-emerald-500 font-bold mt-3 flex items-center gap-1.5 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                  <TrendingDown size={16} /> {dashboardData.head.expenseTrend}%
                  จากเดือนที่แล้ว
                </div>
              ) : (
                // กรณีใช้เงิน "เท่าเดิม" (สีเทา)
                <div className="text-sm text-slate-500 font-bold mt-3 flex items-center gap-1.5 bg-slate-100 w-fit px-2.5 py-1 rounded-lg">
                  <Minus size={16} /> 0% จากเดือนที่แล้ว
                </div>
              )}
            </div>

            {/* กล่อง 2 */}
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="text-slate-500 font-bold mb-2">
                  PR รออนุมัติ
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">
                  {dashboardData.head.pendingPR}
                  <span className="text-lg font-bold text-slate-400 ml-1">
                    รายการ
                  </span>
                </div>
              </div>
              <Link
                to="/pr/list"
                className="text-sm text-amber-600 font-bold mt-4 inline-flex items-center gap-1 hover:text-amber-700 group"
              >
                ไปที่หน้าอนุมัติ{" "}
                <span className="group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </Link>
            </div>

            {/* กล่อง 3 */}
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="text-slate-500 font-bold mb-2">
                PO ที่รับของแล้ว
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tight">
                {dashboardData.head.completedPO}
                <span className="text-lg font-bold text-slate-400 ml-1">
                  รายการ
                </span>
              </div>
              <div className="text-sm text-slate-500 font-medium mt-3 bg-slate-100 w-fit px-3 py-1 rounded-lg">
                ประเมินคุณภาพ Supplier ได้
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-slate-800 mb-6 text-lg">
              แนวโน้มค่าใช้จ่าย (6 เดือนล่าสุด)
            </h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.head.expenseChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} THB`,
                      "ยอดใช้จ่าย",
                    ]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <ShoppingCart className="text-blue-600" /> รายการ PO
                รอรับเข้าคลัง
              </h3>
              <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                {dashboardData.warehouse.incomingPOs.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-5 pl-6">เลขที่ PO</th>
                    <th className="p-5">บริษัทผู้ขาย (Vendor)</th>
                    <th className="p-5 text-center">จำนวนชิ้น</th>
                    <th className="p-5 text-center">ประมาณการจัดส่ง</th>
                    <th className="p-5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.warehouse.incomingPOs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <PackageX size={32} />
                          </div>
                          <p className="font-medium text-slate-500">
                            ไม่มีสินค้ารอรับเข้าคลังในขณะนี้
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dashboardData.warehouse.incomingPOs.map((po, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="p-5 pl-6 font-bold text-blue-600">
                          {po.po_no}
                        </td>
                        <td className="p-5 font-medium text-slate-700">
                          {po.vendor}
                        </td>
                        <td className="p-5 text-center font-bold text-slate-600">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg">
                            {po.items}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          {po.expected_days === 1 ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                              <Clock size={16} /> ส่งวันนี้
                            </span>
                          ) : (
                            <span className="text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                              อีก {po.expected_days} วัน
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          <Link
                            to={`/gr/create?po_no=${po.po_no}`}
                            className="bg-slate-800 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 inline-block"
                          >
                            เตรียมรับของ (GR)
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
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
            {/* กราฟสัดส่วน AP */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="font-bold text-slate-800 mb-2 text-lg text-center">
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
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#f59e0b" /> {/* Amber */}
                      <Cell fill="#10b981" /> {/* Emerald */}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} THB`,
                        "ยอดเงิน",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-xs font-bold text-amber-700 uppercase">
                      รอชำระ
                    </span>
                  </div>
                  <span className="text-sm font-black text-amber-600">
                    {(dashboardData.finance.pendingAPAmount / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="text-center bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">
                      ชำระแล้ว
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">
                    {(dashboardData.finance.paidAPAmount / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Alert Due Soon */}
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-8 rounded-2xl border border-rose-200 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <AlertCircle
                  className="absolute right-[-20px] top-[-20px] text-rose-200/50"
                  size={150}
                />
                <div className="relative z-10">
                  <div className="text-rose-700 font-bold mb-2 text-lg">
                    AP ที่ใกล้เลยกำหนดชำระ (Due soon)
                  </div>
                  <div className="text-5xl font-black text-rose-700 mb-6 tracking-tight">
                    {dashboardData.finance.dueSoonAPCount}{" "}
                    <span className="text-xl font-bold">รายการ</span>
                  </div>
                  <Link
                    to="/ap/list"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all inline-block shadow-md hover:shadow-lg active:scale-95"
                  >
                    ตรวจสอบและทำจ่าย &rarr;
                  </Link>
                </div>
              </div>

              {/* Cash Outflow */}
              <div className="bg-slate-800 p-8 rounded-2xl shadow-sm relative overflow-hidden text-white hover:shadow-md transition-shadow">
                <div className="relative z-10">
                  <div className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-sm">
                    Cash Outflow เดือนนี้ (คาดการณ์)
                  </div>
                  <div className="text-4xl font-black tracking-tight">
                    {(
                      dashboardData.finance.pendingAPAmount +
                      dashboardData.finance.paidAPAmount
                    ).toLocaleString()}
                    <span className="text-xl text-blue-400 font-bold ml-2">
                      THB
                    </span>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/20 rounded-tl-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
