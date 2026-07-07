import { useState } from "react";
import type { UserData } from "../types"; // 🌟 เติมคำว่า type เข้าไปตรงนี้ครับ

export function useAuth() {
  const [currentUser] = useState<UserData | null>(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอ่านข้อมูล User:", error);
        return null;
      }
    }
    return null;
  });

  return {
    currentUser,
    userRole: currentUser?.role || "",
    department: currentUser?.department || "",
    isLoggedIn: !!currentUser,
  };
}
