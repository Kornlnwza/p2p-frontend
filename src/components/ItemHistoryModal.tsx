import { useState, useEffect } from "react";
import { X, Search, Clock, User } from "lucide-react";
import api from "../services/api"; // ปรับ path ให้ตรงกับที่เก็บ api service ของคุณ

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  title: string;
}

interface AuditLog {
  log_id: number;
  action: string;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  changed_by_name: string | null;
  created_at: string;
}

export default function ItemHistoryModal({
  isOpen,
  onClose,
  tableName,
  title,
}: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      const fetchLogs = async () => {
        setIsLoading(true);
        try {
          const res = await api.get(`/audit-logs?table_name=${tableName}`);
          setLogs(res.data);
        } catch (error) {
          console.error("Fetch logs error:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [isOpen, tableName]);

  // ฟิลเตอร์ข้อมูลแบบ Real-time
  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.changed_by_name || "System")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.new_data)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-rose-500" /> {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาประวัติการแก้ไข..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-slate-500 py-10">
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              ไม่พบประวัติการแก้ไข
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
              >
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <User size={14} /> {log.changed_by_name || "System"}
                  </span>
                  <span className="text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm font-medium text-rose-600 mb-2">
                  Action: {log.action}
                </div>
                <pre className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(log.new_data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
