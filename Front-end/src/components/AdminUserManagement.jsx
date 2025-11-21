import React, { useState, useEffect } from "react";
// Import từ axiosClient (đã cấu hình token)
import axios from "../api/axiosClient";

function AdminUserManagement() {
  // Khởi tạo là mảng rỗng [] để tránh lỗi .map ban đầu
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    department: "SALES",
  });
  const [message, setMessage] = useState("");

  // Load danh sách nhân viên
  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");

      // --- SỬA: KIỂM TRA DỮ LIỆU TRẢ VỀ ---
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        console.error("API không trả về mảng:", res.data);
        setUsers([]); // Fallback về mảng rỗng nếu API lỗi
      }
    } catch (error) {
      console.error("Lỗi tải user:", error);
      setUsers([]); // Nếu lỗi mạng, set về rỗng
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Xử lý thêm mới
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/users", newUser);
      setMessage("✅ Thêm thành công!");
      setNewUser({ email: "", full_name: "", department: "SALES" });
      fetchUsers(); // Reload list
    } catch (error) {
      setMessage(`❌ Lỗi: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#fff",
        marginTop: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
        👤 Quản lý Nhân sự (Admin Panel)
      </h3>

      {/* FORM THÊM */}
      <form
        onSubmit={handleAddUser}
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="email"
          placeholder="Email nhân viên (Gmail)"
          required
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Tên nhân viên"
          required
          value={newUser.full_name}
          onChange={(e) =>
            setNewUser({ ...newUser, full_name: e.target.value })
          }
          style={inputStyle}
        />
        <select
          value={newUser.department}
          onChange={(e) =>
            setNewUser({ ...newUser, department: e.target.value })
          }
          style={inputStyle}
        >
          <option value="SALES">Sales</option>
          <option value="HR">Nhân sự (HR)</option>
          <option value="IT">IT</option>
          <option value="LEGAL">Pháp chế</option>
        </select>
        <button type="submit" style={buttonStyle}>
          + Thêm quyền
        </button>
      </form>

      {message && (
        <p style={{ color: message.includes("✅") ? "green" : "red" }}>
          {message}
        </p>
      )}

      {/* DANH SÁCH - SỬA ĐOẠN NÀY ĐỂ KHÔNG BỊ LỖI MAP */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}
      >
        <thead>
          <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Tên</th>
            <th style={thStyle}>Phòng ban</th>
            <th style={thStyle}>Vai trò</th>
          </tr>
        </thead>
        <tbody>
          {/* Kiểm tra users có phải mảng và có dữ liệu không trước khi map */}
          {Array.isArray(users) && users.length > 0 ? (
            users.map((u) => (
              <tr key={u.email} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.full_name}</td>
                <td style={tdStyle}>
                  <span style={deptBadgeStyle}>{u.department}</span>
                </td>
                <td style={tdStyle}>{u.role}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="4"
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
                Chưa có nhân viên nào trong danh sách.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- STYLES ---
const inputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  flex: 1,
};
const buttonStyle = {
  padding: "8px 16px",
  background: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
};
const thStyle = {
  padding: "12px",
  borderBottom: "2px solid #dee2e6",
  color: "#495057",
};
const tdStyle = { padding: "12px", verticalAlign: "middle" };
const deptBadgeStyle = {
  background: "#e9ecef",
  padding: "4px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "500",
};

export default AdminUserManagement;
