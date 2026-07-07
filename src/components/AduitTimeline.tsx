import { useState, useEffect } from "react";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";
import api from "../services/api";

type AuditLogData = Record<string, unknown> | null;

interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: AuditLogData;
  new_data: AuditLogData;
  changed_by_name: string;
  change_reason: string;
  created_at: string;
}

export default function AuditTimeline({
  tableName,
  recordId,
}: {
  tableName: string;
  recordId: string;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get<AuditLog[]>(
          `/audit-logs?table_name=${tableName}&record_id=${recordId}`,
        );
        setLogs(response.data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [tableName, recordId]);

  if (isLoading)
    return (
      <div className="text-center p-4 text-slate-500">กำลังโหลดประวัติ...</div>
    );
  if (logs.length === 0)
    return (
      <div className="text-center p-4 text-slate-400">ไม่มีประวัติการแก้ไข</div>
    );

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-4 mt-4">
      {logs.map((log) => (
        <div key={log.id} className="relative pl-6">
          {/* ไอคอนแสดงประเภท Action */}
          <div
            className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm
            ${
              log.action === "INSERT"
                ? "bg-emerald-500 text-white"
                : log.action === "UPDATE"
                  ? "bg-blue-500 text-white"
                  : "bg-rose-500 text-white"
            }`}
          >
            {log.action === "INSERT" && <Plus size={14} />}
            {log.action === "UPDATE" && <Edit size={14} />}
            {log.action === "DELETE" && <Trash2 size={14} />}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-slate-700">
                {log.action === "INSERT"
                  ? "สร้างเอกสาร"
                  : log.action === "UPDATE"
                    ? "อัปเดตข้อมูล"
                    : "ยกเลิก/ลบ"}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <Clock size={12} />
                {new Date(log.created_at).toLocaleString("th-TH")}
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-2">
              ดำเนินการโดย:{" "}
              <span className="font-bold text-blue-600">
                @{log.changed_by_name}
              </span>
            </div>

            {log.change_reason && (
              <div className="text-sm bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100">
                <span className="font-bold">เหตุผล: </span> {log.change_reason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
