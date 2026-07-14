// ==========================================
// 🌟 1. ข้อมูลระบบผู้ใช้งาน (Users)
// ==========================================
export interface UserData {
  user_id: number;
  username: string;
  role: string;
  department?: string;
}

// ==========================================
// 🌟 2. ข้อมูลระบบ PR (ใบขอซื้อ)
// ==========================================
export interface PRData {
  pr_no: string;
  pr_date: string;
  requester_id: number;
  department: string;
  total_amount: number;
  status: string;
  remark?: string;
}

export interface PRItem {
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface IncomingPRItem {
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
}

// ==========================================
// 🌟 3. ข้อมูลระบบ PO (ใบสั่งซื้อ)
// ==========================================
export interface POHeaderData {
  po_no: string;
  po_date: string;
  vendor_id: string;
  total_amount: number;
  status: string;
  cancel_reason?: string;
  cancelled_at?: string;
}

// ข้อมูลสินค้ารายการในใบ PO (ยุบรวม POItemData มาไว้ที่นี่)
export interface POItem {
  po_item_id?: number;
  product_code: string;
  description: string;
  ordered_qty: number;
  unit_price: number;
  line_total: number;
  pr_item_id: number;
  pr_no?: string;
}

export interface POData {
  po_no: string;
  items: POItem[];
}

// 🌟 แก้ไขชื่อที่ซ้ำ: เปลี่ยนจาก POItem เป็น POFormItem (สำหรับใช้หน้าฟอร์มสร้าง PO)
export interface POFormItem {
  item_code: string;
  item_desc: string;
  quantity: number;
  unit_price: number;
}

// ==========================================
// 🌟 4. ข้อมูลระบบ GR (ใบรับของ)
// ==========================================
export interface GRHeader {
  gr_no: string;
  gr_date: string;
  po_no: string;
  delivery_note_no?: string;
  receiver_id?: number;
  status: string;
}

export interface GRItem {
  product_code: string;
  description: string;
  ordered_qty: number;
  unit_price: number;
  received_qty: number;
}

export interface GRDetailItem {
  product_code: string;
  description: string;
  unit_price: number | string;
  received_qty: number;
}

// ==========================================
// 🌟 5. ข้อมูลระบบ AP (ใบตั้งหนี้)
// ==========================================
export interface APHeaderData {
  ap_no: string;
  ap_date: string;
  vendor_invoice_no: string;
  gr_no: string;
  total_amount: number;
  due_date: string;
  status: string;
}

export interface APItemData {
  product_code: string;
  description?: string;
  quantity?: number;
  amount: number;
}

// ==========================================
// 🌟 6. ข้อมูล Master Data (ผู้ขาย, หมวดหมู่, สินค้า)
// ==========================================
export interface Vendor {
  vendor_id: number | string;
  vendor_name: string;
}

export interface Category {
  cat_id: number;
  cat_name: string;
}

export interface SubCategory {
  sub_cat_id: number;
  cat_id: number;
  sub_cat_name: string;
}

export interface Product {
  product_code: string;
  description: string;
  sub_cat_id: number;
  unit_price: number;
}
