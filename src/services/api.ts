import axios from "axios";
import toast from "react-hot-toast"; // 🌟 1. เพิ่มบรรทัดนี้ เพื่อให้รู้จักคำว่า toast

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

// 🌟 2. Response Interceptor (ใช้ตัวนี้ตัวเดียวเท่านั้น ลบตัวเก่าทิ้งไปเลย)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚨 กรณีที่ 1: Token เสีย หรือ หมดอายุ (401) -> เตะออกไปหน้า Login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser"); // เช็คลบทั้ง currentUser
      localStorage.removeItem("user"); // และ user กันเหนียว

      // เด้งกลับไปหน้า Login (ยกเว้นว่าตอนนี้อยู่หน้า Login อยู่แล้ว)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // 🌟 กรณีที่ 2: ผิดกฎบริษัท หรือ ไม่มีสิทธิ์ (403) -> แจ้งเตือนแล้วรีเฟรช
    else if (error.response?.status === 403) {
      // ดึงข้อความ Error จากที่ Backend ส่งมา (เช่น "ไม่อนุญาตให้อนุมัติของตนเอง")
      const errorMessage =
        error.response.data?.message || "คุณไม่มีสิทธิ์ทำรายการนี้";

      // แสดงกล่องข้อความสีแดง
      toast.error(errorMessage);

      // หน่วงเวลา 1.5 วินาทีเพื่อให้ User อ่านข้อความทัน ก่อนที่จะรีเฟรชหน้าต่าง
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    return Promise.reject(error);
  },
);

export default api;
