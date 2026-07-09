import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { UserData } from "../types";

export function useAuth() {
  const [currentUser] = useState<UserData | null>(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decodedUser = jwtDecode<UserData & { exp?: number }>(token);

        if (decodedUser.exp && decodedUser.exp * 1000 < Date.now()) {
          console.warn(
            "⚠️ Token หมดอายุแล้ว ระบบจะล้างข้อมูลและบังคับล็อกเอาต์",
          );
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          return null; // บังคับให้เป็นสถานะยังไม่ได้ล็อกอิน
        }

        return decodedUser;
      } catch (error) {
        console.error("Token ไม่ถูกต้องหรือถูกปลอมแปลง:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
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
