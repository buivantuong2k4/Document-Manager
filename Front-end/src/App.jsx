import React, { useState, useEffect } from "react";
import axios from "axios";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// --- IMPORT COMPONENTS CŨ ---
import LoginPage from "./components/LoginPage";
import UploadModal from "./components/UploadModal";
import DocumentList from "./components/DocumentList";
import AdminUserManagement from "./components/AdminUserManagement";
import RAGInterface from "./components/RAGInterface";
import SignatureManager from "./components/SignatureManager";

// --- IMPORT COMPONENTS MỚI (Tạo ở bước sau) ---
import Dashboard from "./components/Dashboard";
import MainLayout from "./components/MainLayout";
import Er_HomePage from "./components/Er_HomePage";
import "./App.css";

const GOOGLE_CLIENT_ID =
  "486899962591-0siq66hrouukgast7itr9e04jgtom5if.apps.googleusercontent.com";

function App() {
  // --- STATE (Giữ nguyên logic của dự án chính) ---
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState("Checking...");
  const [isLoading, setIsLoading] = useState(true); // Thêm loading state để tránh flash login

  // --- EFFECT (Logic Auth chuẩn của dự án chính) ---
  useEffect(() => {
    const savedToken = localStorage.getItem("app_token");
    const savedUser = localStorage.getItem("user_info");

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Quan trọng: Set header cho axios để các request sau này đều có token
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }

    // Check server
    fetch(
      import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL + "/api/"
        : "http://localhost:5000/api/"
    )
      .then((res) => res.json())
      .then(() => setServerStatus("Online 🟢"))
      .catch(() => setServerStatus("Offline 🔴"))
      .finally(() => setIsLoading(false));
  }, []);

  // --- HANDLERS ---
  const handleLogin = (data) => {
    console.log("Login Success Data:", data);
    setUser(data.user);
    localStorage.setItem("app_token", data.token);
    localStorage.setItem("user_info", JSON.stringify(data.user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("app_token");
    localStorage.removeItem("user_info");
    delete axios.defaults.headers.common["Authorization"];
    window.location.href = "/login"; // Force reload về trang login
  };

  // --- PROTECTED ROUTE COMPONENT ---
  // Bảo vệ các route, nếu chưa login thì đá về /login
  const ProtectedRoute = () => {
    if (isLoading) return <div>Loading...</div>; // Hoặc spinner
    return user ? <Outlet /> : <Navigate to="/login" replace />;
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route
            path="/login"
            element={
              !user ? (
                <LoginPage onLoginSuccess={handleLogin} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* Protected Routes (Phải đăng nhập mới thấy) */}
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <MainLayout
                  user={user}
                  onLogout={handleLogout}
                  serverStatus={serverStatus}
                  onUploadClick={() => setIsModalOpen(true)}
                />
              }
            >
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/signature-manager" element={<SignatureManager />} />
              <Route path="/check-errors" element={<Er_HomePage />} />
              <Route
                path="/documents"
                element={<DocumentList refreshKey={refreshKey} user={user} />}
              />
              <Route path="/chat" element={<RAGInterface user={user} />} />

              {/* Route Admin - Kiểm tra role theo logic dự án chính (ADMIN) */}
              <Route
                path="/admin"
                element={
                  user?.role === "ADMIN" ? (
                    <AdminUserManagement />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Modal Upload (Global) */}
        {user && (
          <UploadModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUploadSuccess={() => setRefreshKey((prev) => prev + 1)}
            user={user}
          />
        )}
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
