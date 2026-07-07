import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// 1. Request Interceptor (ดักก่อนส่ง: แนบ Token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 🌟 2. Response Interceptor (ดักตอนรับกลับ: เช็ค Token หมดอายุ)
api.interceptors.response.use(
  (response) => {
    // ถ้า API ตอบกลับมาปกติ (200 OK) ให้ผ่านไป
    return response;
  },
  (error) => {
    // ถ้า Backend แจ้งว่า 401 (หมดอายุ/รหัสผิด) หรือ 403 (ไม่มีสิทธิ์)
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      // ลบกุญแจเก่าที่หมดอายุทิ้ง
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");

      // เด้งกลับไปหน้า Login (ยกเว้นว่าตอนนี้อยู่หน้า Login อยู่แล้วจะได้ไม่ loop)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
