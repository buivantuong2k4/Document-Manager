import React, { useState, useEffect } from "react";
import axios from "axios";
import { GoogleOAuthProvider } from "@react-oauth/google";

// --- IMPORT CÁC COMPONENT ---
import Header from "./components/Header";
import UploadModal from "./components/UploadModal";
import DocumentList from "./components/DocumentList";
import LoginPage from "./components/LoginPage";
import AdminUserManagement from "./components/AdminUserManagement";
import RAGInterface from "./components/RAGInterface";
import "./App.css";

const GOOGLE_CLIENT_ID =
  "486899962591-0siq66hrouukgast7itr9e04jgtom5if.apps.googleusercontent.com";

function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState("Checking...");

  // State mới: Quản lý màn hình đang xem ('documents' hoặc 'chat')
  const [currentView, setCurrentView] = useState("documents");

  // --- EFFECT ---
  useEffect(() => {
    const savedToken = localStorage.getItem("app_token");
    const savedUser = localStorage.getItem("user_info");

    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }

    fetch("http://localhost:5000/api/")
      .then((res) => res.json())
      .then(() => setServerStatus("Online 🟢"))
      .catch(() => setServerStatus("Offline 🔴"));
  }, []);

  // --- HANDLERS ---
  const handleLogin = (data) => {
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
  };

  // --- RENDER ---
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {!user ? (
        <LoginPage onLoginSuccess={handleLogin} />
      ) : (
        <div style={appContainerStyle}>
          {/* Header: Truyền thêm props điều hướng */}
          <Header
            serverStatus={serverStatus}
            onUploadClick={() => setIsModalOpen(true)}
            user={user}
            onLogout={handleLogout}
            currentView={currentView} // View hiện tại
            onNavigate={setCurrentView} // Hàm đổi view
          />

          <main style={mainStyle}>
            {/* LOGIC HIỂN THỊ THEO TAB */}

            {currentView === "documents" && (
              <div className="fade-in">
                {/* Tab 1: Quản lý tài liệu & Admin */}
                <section>
                  <DocumentList refreshKey={refreshKey} user={user} />
                </section>

                {user.role === "ADMIN" && (
                  <section
                    style={{
                      marginTop: "40px",
                      borderTop: "2px dashed #ddd",
                      paddingTop: "30px",
                    }}
                  >
                    <AdminUserManagement />
                  </section>
                )}
              </div>
            )}

            {currentView === "chat" && (
              <div className="fade-in">
                {/* Tab 2: Chat Bot */}

                <RAGInterface user={user} />
              </div>
            )}
          </main>

          <UploadModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUploadSuccess={() => setRefreshKey((old) => old + 1)}
            user={user}
          />
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

// --- STYLES ---
const appContainerStyle = {
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  backgroundColor: "#f4f6f8",
  boxSizing: "border-box",
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
  overflowX: "hidden",
};

const mainStyle = {
  flex: 1,
  padding: "30px",
  maxWidth: "1200px",
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

export default App;
