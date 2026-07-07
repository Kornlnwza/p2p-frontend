// 1. สร้าง Type สำหรับผู้ใช้งาน (ดึงเฉพาะฟิลด์ที่ต้องใช้เช็คสิทธิ์)
interface AuthUser {
  username: string;
  role: string;
  department?: string;
}

// 2. สร้าง Type สำหรับข้อมูล PR
interface PRData {
  requester_name?: string; // หมายเหตุ: ถ้าใน Database ใช้ชื่ออื่น เช่น created_by_name ให้แก้ตรงนี้ให้ตรงกันนะครับ
  department?: string;
}

// 3. นำ Type มาใส่แทนคำว่า any
export const canApprovePR = (
  currentUser: AuthUser | null,
  pr: PRData | null,
): boolean => {
  // ป้องกัน Error กรณีข้อมูลถูกโหลดไม่ทัน
  if (!currentUser || !pr) return false;

  // กฎเหล็ก: ห้ามอนุมัติของตัวเอง
  if (currentUser.username === pr.requester_name) return false;

  // Admin อนุมัติได้หมด
  if (currentUser.role === "Admin") return true;

  // Head ทั่วไป อนุมัติแผนกตัวเอง
  if (currentUser.role === "Head" && currentUser.department === pr.department)
    return true;

  // Role พิเศษ ทำหน้าที่แทน Head ในแผนกตัวเอง
  if (currentUser.role === "Finance_Head" && pr.department === "Accounting")
    return true;
  if (currentUser.role === "Purchaser_Head" && pr.department === "Purchasing")
    return true;
  if (currentUser.role === "Receiver_Head" && pr.department === "Warehouse")
    return true;

  return false;
};
