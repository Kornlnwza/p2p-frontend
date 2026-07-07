// 1. ปรับ Type ให้รองรับ user_id
export interface AuthUser {
  user_id: number; // 🌟 ใช้ ID เพื่อความแม่นยำ 100%
  username: string;
  role: string;
  department?: string;
}

// 2. ปรับ Type ให้ตรงกับข้อมูลจริงของ PR
export interface PRData {
  pr_no?: string;
  requester_id?: number; // 🌟 ใช้ ID ตรงกับ Backend
  department?: string;
  status?: string; // 🌟 ต้องมี status เอาไว้เช็ค
}

export const canApprovePR = (currentUser: AuthUser, pr: PRData): boolean => {
  if (!currentUser || !pr) return false;

  // 1. เช็คสถานะ (เน้นความปลอดภัย)
  if (pr.status?.toLowerCase() !== "pending") return false;

  // 2. ห้ามอนุมัติของตัวเอง
  if (currentUser.user_id === pr.requester_id) return false;

  // 3. Admin ทำได้ทุกอย่าง
  if (currentUser.role === "Admin" || currentUser.role === "Manager")
    return true;

  // 4. กฎสำหรับ Head (ปรับปรุงให้รองรับ case-insensitive และป้องกัน undefined)
  if (currentUser.role === "Head") {
    const userDept = currentUser.department?.toLowerCase() || "";
    const prDept = pr.department?.toLowerCase() || "";

    // ถ้าแผนกตรงกัน
    return userDept === prDept;
  }

  // 5. กรณีมี Role เฉพาะเจาะจงที่ระบุไว้ก่อนหน้า
  if (
    currentUser.role === "Finance_Head" &&
    pr.department?.toLowerCase() === "accounting"
  )
    return true;
  if (
    currentUser.role === "Purchaser_Head" &&
    pr.department?.toLowerCase() === "purchasing"
  )
    return true;

  return false;
};
