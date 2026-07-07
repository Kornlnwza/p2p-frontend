import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// --- Import Components & Pages ---
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import PRListPage from "./pages/PRList";
import PRPageV2 from "./pages/PRPageV2";
import POListPage from "./pages/POList";
import POPage from "./pages/POPage";
import GRListPage from "./pages/GRList";
import GRPage from "./pages/GRPage";
import APListPage from "./pages/APList";
import APPage from "./pages/APPage";
import PaymentPage from "./pages/PaymentPage";
import AdminUserList from "./pages/admin/AdminUserList";
import AdminCategoryList from "./pages/admin/AdminCategoryList";
import AdminProductList from "./pages/admin/AdminProductList";
import AdminVendorList from "./pages/admin/AdminVendorList";
import AdminAuditLog from "./pages/admin/AdminAduitLog";
function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 1. โซนที่ต้องล็อกอินก่อน (User ทั่วไปเข้าได้) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pr/list" element={<PRListPage />} />
            <Route path="/pr/create" element={<PRPageV2 />} />

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "Purchaser", "Purchaser_Head"]}
                />
              }
            >
              <Route path="/po/list" element={<POListPage />} />
              <Route path="/po/create" element={<POPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "Admin",
                    "Receiver",
                    "Finance",
                    "Receiver_Head",
                    "Finance_Head",
                    "Purchaser_Head",
                  ]}
                />
              }
            >
              <Route path="/gr/list" element={<GRListPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "Receiver", "Receiver_Head"]}
                />
              }
            >
              <Route path="/gr/create" element={<GRPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "Finance", "Finance_Head"]}
                />
              }
            >
              <Route path="/ap/list" element={<APListPage />} />
              <Route path="/ap/create" element={<APPage />} />
              <Route path="/payment" element={<PaymentPage />} />
            </Route>

            {/* 2. โซน Admin (ต้องล็อกอิน + ต้องมี Role เป็น Admin เท่านั้น) */}
            <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
              <Route path="/admin/users" element={<AdminUserList />} />
              <Route path="/admin/categories" element={<AdminCategoryList />} />
              <Route path="/admin/products" element={<AdminProductList />} />
              <Route path="/admin/vendors" element={<AdminVendorList />} />
              <Route path="/admin/logs" element={<AdminAuditLog />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
