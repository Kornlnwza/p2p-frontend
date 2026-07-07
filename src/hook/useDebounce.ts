import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // ตั้งเวลาให้เปลี่ยนค่า debouncedValue เมื่อครบกำหนด
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // ถ้ามีการพิมพ์ใหม่เข้ามาก่อนหมดเวลา ให้ยกเลิก (Clear) อันเก่าทิ้ง
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // ทำงานใหม่ทุกครั้งที่ value เปลี่ยน

  return debouncedValue;
}
