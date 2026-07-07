import { useState, useEffect } from "react";
import {
  History,
  Search,
  Eye,
  X,
  PlusCircle,
  Edit3,
  Trash2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Network,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api"; // ปรับ path ให้ตรงกับโปรเจกต์คุณ

type AuditData = Record<string, unknown> | null;

interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: AuditData;
  new_data: AuditData;
  changed_by_name: string;
  change_reason: string;
  created_at: string;
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 State ตัวจัดการโหมดสืบค้นและรีเซ็ต
  const [isTracing, setIsTracing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [filterTable, setFilterTable] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [activeTab, setActiveTab] = useState<"SYSTEM" | "SECURITY">("SYSTEM");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // 🌟 ดึงข้อมูลทั้งหมด (ผูกกับ refreshTrigger)
  useEffect(() => {
    const fetchAllLogs = async () => {
      setIsLoading(true);
      setIsTracing(false); // 🌟 ปิดโหมด Trace เสมอเมื่อรีเซ็ตหน้าใหม่
      try {
        const response = await api.get("/audit-logs");
        setLogs(response.data);
        setCurrentPage(1);
        setSearchTerm("");
        setFilterAction("ALL");
        setFilterTable("ALL");
      } catch (error) {
        console.error("Error fetching all logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLogs();
  }, [refreshTrigger]);

  // 🌟 ฟังก์ชันสืบค้นแบบเชื่อมโยงทั้งกระบวนการ (Deep Trace)
  const handleDeepTrace = async () => {
    if (!searchTerm.trim()) {
      toast.error("กรุณาพิมพ์เลขเอกสาร (เช่น PR-XXX) ก่อนกดค้นหาเชิงลึก");
      return;
    }

    setIsTracing(true); // 🌟 เปิดโหมด Trace
    setIsLoading(true);
    try {
      const response = await api.get(
        `/audit-logs/trace?doc_no=${searchTerm.trim()}`,
      );
      setLogs(response.data);
      setCurrentPage(1);

      if (response.data.length > 0) {
        toast.success(
          `พบประวัติที่เชื่อมโยงกันทั้งหมด ${response.data.length} รายการ`,
        );
      } else {
        toast.error("ไม่พบข้อมูลเอกสารที่เกี่ยวข้องกันในระบบ");
        setIsTracing(false); // ปิดโหมดเพราะไม่เจอ
      }
    } catch (error) {
      console.error("Trace error:", error);
      toast.error("เกิดข้อผิดพลาดในการสืบค้น");
      setIsTracing(false); // ปิดโหมดเพราะ Error
    } finally {
      setIsLoading(false);
      // ❌ นำ setIsTracing(false) ออกจากบรรทัดนี้ เพื่อให้ตารางรู้ว่ายังอยู่ในโหมดสืบค้น!
    }
  };

  const formatTableName = (tableName: string) => {
    if (tableName.includes("pr_")) return "ใบขอซื้อ (PR)";
    if (tableName.includes("po_")) return "ใบสั่งซื้อ (PO)";
    if (tableName.includes("gr_")) return "ใบรับของ (GR)";
    if (tableName.includes("ap_")) return "ใบตั้งหนี้ (AP)";
    if (tableName.includes("payment_")) return "เอกสารชำระเงิน (Payment)";
    if (tableName.includes("users")) return "ผู้ใช้งาน (Users)";
    return tableName.replace("_", " ").toUpperCase();
  };

  // 🌟 Logic การกรองข้อมูล
  const filteredLogs = logs.filter((log) => {
    const matchAction = filterAction === "ALL" || log.action === filterAction;
    const matchTable =
      filterTable === "ALL" || log.table_name.includes(filterTable);

    // แยกแท็บ: ถ้าเป็น SECURITY ให้เอาเฉพาะตาราง users, ถ้าเป็น SYSTEM ให้เอาตารางอื่นๆ
    const isUserLog = log.table_name.includes("users");
    const matchTab = activeTab === "SECURITY" ? isUserLog : !isUserLog;

    if (isTracing) {
      return matchAction && matchTable;
    }

    // 🌟🌟🌟 ปรับปรุงระบบค้นหาใหม่ให้ฉลาดขึ้น ตรงนี้ครับ! 🌟🌟🌟
    const searchLower = searchTerm.toLowerCase();

    // 1. ค้นหาจากรหัสเอกสาร / รหัส User
    const matchId = String(log.record_id).toLowerCase().includes(searchLower);

    // 2. ค้นหาผู้ทำรายการ (ถ้าไม่มีชื่อแอดมิน ให้แปลงเป็นคำว่า "system" เพื่อให้ค้นหาเจอ)
    const makerName = log.changed_by_name
      ? log.changed_by_name.toLowerCase()
      : "system";
    const matchMaker = makerName.includes(searchLower);

    // 3. ค้นหาจากชื่อระบบภาษาไทย (เช่น พิมพ์ "ผู้ใช้งาน" หรือ "ใบขอซื้อ" ก็เจอ)
    const tableNameFormatted = formatTableName(log.table_name).toLowerCase();
    const matchTableName = tableNameFormatted.includes(searchLower);

    // 4. 🌟 ไม้ตาย: ดำน้ำลงไปค้นหาในก้อนข้อมูลด้วย! (เช่น พิมพ์ชื่อ Username "IT002" ที่เพิ่งสร้าง ก็จะเจอทันที)
    const matchData =
      JSON.stringify(log.old_data || {})
        .toLowerCase()
        .includes(searchLower) ||
      JSON.stringify(log.new_data || {})
        .toLowerCase()
        .includes(searchLower);

    // ถ้าตรงกับเงื่อนไขใดเงื่อนไขหนึ่ง (รหัส OR ผู้ทำ OR ชื่อระบบ OR ข้อมูลข้างใน) ให้แสดงผลเลย
    const matchSearch = matchId || matchMaker || matchTableName || matchData;

    return matchSearch && matchAction && matchTable && matchTab;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredLogs.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col space-y-4">
        {/* 🌟 ส่วนที่ 1: หัวข้อ */}
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-blue-600" /> ประวัติการทำงานระบบ (Audit
              Log)
            </h1>
            <p className="text-slate-500 mt-1">
              ตรวจสอบการสร้าง แก้ไขเอกสาร และจัดการผู้ใช้งาน
            </p>
          </div>

          {/* 🌟 ปุ่มแท็บ */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-max">
            <button
              onClick={() => {
                setActiveTab("SYSTEM");
                setCurrentPage(1);
                setFilterTable("ALL"); // 🌟 เคลียร์ค่าตัวกรองตาราง
                setSearchTerm(""); // 🌟 เคลียร์คำค้นหา
              }}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "SYSTEM"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              📄 ประวัติเอกสาร (System Logs)
            </button>
            <button
              onClick={() => {
                setActiveTab("SECURITY");
                setCurrentPage(1);
                setFilterTable("ALL"); // 🌟 เคลียร์ค่าตัวกรองตารางป้องกันบั๊ก
                setSearchTerm(""); // 🌟 เคลียร์คำค้นหา
              }}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "SECURITY"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🛡️ ประวัติผู้ใช้งาน (Security Logs)
            </button>
          </div>
        </div>

        {/* 🌟 ส่วนที่ 2: แถบค้นหาและตัวกรอง */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder={
                activeTab === "SYSTEM"
                  ? "ค้นหาเลขเอกสาร..."
                  : "ค้นหาชื่อผู้ใช้งาน..."
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsTracing(false);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* ปุ่ม Deep Trace โชว์เฉพาะแท็บเอกสาร */}
          {activeTab === "SYSTEM" && (
            <button
              onClick={handleDeepTrace}
              disabled={isLoading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap active:scale-95 disabled:opacity-70"
            >
              <Network size={16} /> Deep Trace
            </button>
          )}

          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap active:scale-95"
          >
            <RefreshCw
              size={16}
              className={isLoading && !isTracing ? "animate-spin" : ""}
            />{" "}
            รีเซ็ต
          </button>

          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none"
          >
            <option value="ALL">ทุกการกระทำ</option>
            <option value="INSERT">สร้างใหม่ (INSERT)</option>
            <option value="UPDATE">แก้ไข (UPDATE)</option>
            {activeTab === "SYSTEM" ? (
              <option value="DELETE">ลบ/ยกเลิก (DELETE)</option>
            ) : null}
          </select>

          {/* ดรอปดาวน์เลือก Table โชว์เฉพาะแท็บเอกสาร */}
          {activeTab === "SYSTEM" && (
            <select
              value={filterTable}
              onChange={(e) => {
                setFilterTable(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none"
            >
              <option value="ALL">ทุกระบบ</option>
              <option value="pr_">ระบบ PR</option>
              <option value="po_">ระบบ PO</option>
              <option value="gr_">ระบบ GR</option>
              <option value="ap_">ระบบ AP</option>
              <option value="payment_">ระบบ Payment</option>
            </select>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* แถบแจ้งเตือนเมื่ออยู่ในโหมด Trace */}
        {isTracing && logs.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl mb-4 shadow-lg flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Network size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">อยู่ในโหมด Deep Trace</h4>
                <p className="text-xs opacity-90">
                  กำลังติดตามสายธารของเอกสาร: <b>{searchTerm}</b>
                </p>
              </div>
            </div>
            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold"
            >
              ออกจากโหมด Trace
            </button>
          </div>
        )}

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6">วัน-เวลา</th>
                <th className="p-4">ผู้ทำรายการ</th>
                <th className="p-4">ระบบ (Table)</th>
                <th className="p-4">เลขเอกสาร</th>
                <th className="p-4 text-center">Action</th>
                <th className="p-4 pr-6 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <RefreshCw
                      className="animate-spin mx-auto mb-3"
                      size={24}
                    />
                    กำลังประมวลผลข้อมูล...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    ไม่พบประวัติการทำงาน
                  </td>
                </tr>
              ) : (
                currentItems.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 pl-6 text-sm text-slate-600">
                      {new Date(log.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-700">
                      @{log.changed_by_name || "System"}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {formatTableName(log.table_name)}
                    </td>
                    <td className="p-4 text-sm font-bold text-blue-600">
                      {log.record_id}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-max
                        ${
                          log.action === "INSERT"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : log.action === "UPDATE"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-rose-50 text-rose-600 border border-rose-200"
                        }`}
                      >
                        {log.action === "INSERT" && <PlusCircle size={14} />}
                        {log.action === "UPDATE" && <Edit3 size={14} />}
                        {log.action === "DELETE" && <Trash2 size={14} />}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                        title="ดูข้อมูล"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200 bg-slate-50 gap-4">
            <span className="text-sm text-slate-500 font-medium">
              แสดง {startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, filteredLogs.length)}{" "}
              จากทั้งหมด {filteredLogs.length} รายการ
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 font-medium">
                หน้า {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal ดูข้อมูล */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white rounded-t-2xl">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History size={20} className="text-blue-400" />
                รายละเอียดการเปลี่ยนแปลง:{" "}
                <span className="text-blue-300">{selectedLog.record_id}</span>
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>{" "}
                    ข้อมูลเดิม (Old Data)
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto h-64 font-mono">
                    {selectedLog.old_data
                      ? JSON.stringify(selectedLog.old_data, null, 2)
                      : "ไม่มีข้อมูลเดิม (หรือเป็นรายการสร้างใหม่)"}
                  </pre>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                  <div className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full items-center justify-center shadow-md z-10">
                    <ArrowRight size={18} />
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                    ข้อมูลใหม่ (New Data)
                  </div>
                  <pre className="bg-slate-900 text-blue-400 p-4 rounded-lg text-xs overflow-x-auto h-64 font-mono">
                    {selectedLog.new_data
                      ? JSON.stringify(selectedLog.new_data, null, 2)
                      : "ไม่มีข้อมูลใหม่ (หรือเป็นรายการลบ)"}
                  </pre>
                </div>
              </div>
              {selectedLog.change_reason && (
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
                  <span className="font-bold">เหตุผลในการดำเนินการ: </span>
                  {selectedLog.change_reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
