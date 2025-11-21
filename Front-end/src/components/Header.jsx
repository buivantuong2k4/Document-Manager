import React from "react";

// Nhận thêm props 'currentView' và 'onNavigate'
function Header({
  serverStatus,
  onUploadClick,
  user,
  onLogout,
  currentView,
  onNavigate,
}) {
  return (
    <header style={headerStyle}>
      {/* 1. LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          cursor: "pointer",
        }}
        onClick={() => onNavigate("documents")} // Click logo về trang chủ
      >
        <div style={logoStyle}>🤖 AI Agent</div>
        <h1 style={{ fontSize: "18px", margin: 0, fontWeight: "500" }}>
          DocManager
        </h1>
        {/* Trạng thái Server */}
        <span style={{ fontSize: "12px", color: "#ccc" }}>
          Server: {serverStatus}
        </span>
      </div>

      {/* 2. MENU ĐIỀU HƯỚNG (NAVIGATION) - MỚI THÊM */}
      {user && (
        <nav style={navContainerStyle}>
          <button
            style={
              currentView === "documents" ? activeNavBtnStyle : navBtnStyle
            }
            onClick={() => onNavigate("documents")}
          >
            📂 Tài liệu
          </button>
          <button
            style={currentView === "chat" ? activeNavBtnStyle : navBtnStyle}
            onClick={() => onNavigate("chat")}
          >
            💬 Chat Bot
          </button>
        </nav>
      )}

      {/* 3. CÔNG CỤ & USER */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Trạng thái Server */}
        <span
          style={{
            fontSize: "12px",
            color: "#ccc",
            display: "none" /* Ẩn bớt cho gọn trên mobile */,
            "@media (min-width: 768px)": { display: "inline" },
          }}
        >
          {serverStatus}
        </span>

        {user && (
          <div style={userProfileStyle}>
            <img
              src={user.avatar || "https://via.placeholder.com/30"}
              alt="Avt"
              style={avatarStyle}
            />
            <div style={userInfoStyle}>
              <span style={{ fontSize: "13px", fontWeight: "bold" }}>
                {user.full_name}
              </span>
              <span style={{ fontSize: "10px", color: "#aaa" }}>
                {user.role}
              </span>
            </div>
            <button onClick={onLogout} style={logoutButtonStyle}>
              Exit
            </button>
          </div>
        )}

        <button onClick={onUploadClick} style={uploadButtonStyle}>
          ☁️ Upload
        </button>
      </div>
    </header>
  );
}

// --- STYLES ---
const headerStyle = {
  backgroundColor: "#24292e",
  color: "white",
  padding: "0 20px",
  height: "60px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const logoStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#58a6ff",
};

// Style cho Navigation
const navContainerStyle = {
  display: "flex",
  gap: "10px",
};

const navBtnStyle = {
  backgroundColor: "transparent",
  color: "#ccc",
  border: "none",
  padding: "8px 16px",
  fontSize: "15px",
  fontWeight: "500",
  cursor: "pointer",
  borderRadius: "6px",
  transition: "all 0.2s",
};

const activeNavBtnStyle = {
  ...navBtnStyle,
  backgroundColor: "#384047", // Màu nền khi active
  color: "#fff", // Màu chữ sáng hơn
  fontWeight: "bold",
  boxShadow: "inset 0 -2px 0 #58a6ff", // Gạch chân kiểu GitHub
};

const userProfileStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingRight: "15px",
  borderRight: "1px solid #444",
};

const userInfoStyle = {
  display: "flex",
  flexDirection: "column",
  marginRight: "10px",
  minWidth: "80px", // Giữ độ rộng cố định để không bị nhảy
};

const avatarStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  border: "1px solid #58a6ff",
};

const logoutButtonStyle = {
  backgroundColor: "transparent",
  color: "#ff7b72",
  border: "1px solid #ff7b72",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "bold",
};

const uploadButtonStyle = {
  backgroundColor: "#238636",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

export default Header;
