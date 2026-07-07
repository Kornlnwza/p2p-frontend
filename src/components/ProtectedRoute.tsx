import { Navigate, Outlet } from "react-router-dom";

// 🌟 1. ประกาศรับค่า allowedRoles (สิทธิ์ที่อนุญาตให้เข้าหน้านี้ได้)
interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("currentUser");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // 1. ถ้าไม่มี Token หรือยังไม่ได้ล็อกอิน -> เด้งไปหน้า Login
  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 🌟 2. ถ้าหน้านั้นมีการจำกัดสิทธิ์ และ Role ของ User ไม่อยู่ในรายชื่อที่อนุญาต
  if (
    allowedRoles &&
    (!currentUser.role || !allowedRoles.includes(currentUser.role))
  ) {
    return <Navigate to="/" replace />;
  }

  // 3. ถ้าล็อกอินแล้ว และสิทธิ์ถูกต้อง -> ให้แสดงผลหน้าเว็บได้ตามปกติ
  return <Outlet />;
}
