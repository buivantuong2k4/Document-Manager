import React, { useState, useEffect } from "react";
// Import từ axiosClient (đã cấu hình token)
import axios from "../api/axiosClient";

function AdminUserManagement() {
  // Khởi tạo là mảng rỗng [] để tránh lỗi .map ban đầu
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    department: "",
  });
  const [message, setMessage] = useState("");

  // Load danh sách phòng ban
  const fetchDepartments = async () => {
    try {
      const res = await axios.get("/api/departments");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDepartments(res.data);
        // Set default department to first one
        setNewUser((prev) => ({ ...prev, department: res.data[0].name }));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách phòng ban:", error);
    }
  };

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
    fetchDepartments();
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

  // Xử lý xóa user (chỉ Admin)
  const handleDeleteUser = async (email) => {
    const ok = window.confirm(`Xác nhận xóa quyền của ${email}?`);
    if (!ok) return;
    try {
      await axios.delete(`/api/users/${encodeURIComponent(email)}`);
      setMessage("✅ Xóa thành công!");
      setTimeout(() => setMessage(""), 3000);
      fetchUsers();
    } catch (error) {
      setMessage(`❌ Lỗi: ${error.response?.data?.error || error.message}`);
    }
  };

  // State quản lý chỉnh sửa
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ department: "", full_name: "" });

  // Mở form chỉnh sửa
  const openEditModal = (user) => {
    setEditingUser(user.email);
    setEditForm({ department: user.department, full_name: user.full_name });
  };

  // Đóng form chỉnh sửa
  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ department: "", full_name: "" });
  };

  // Xử lý cập nhật user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${encodeURIComponent(editingUser)}`, {
        department: editForm.department,
        full_name: editForm.full_name,
      });
      setMessage("✅ Cập nhật thành công!");
      setTimeout(() => setMessage(""), 3000);
      closeEditModal();
      fetchUsers();
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
          <option value="">-- Chọn phòng ban --</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name}>
              {dept.name}
            </option>
          ))}
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
            <th style={thStyle}>Hành động</th>
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
                <td style={tdStyle}>
                  <button
                    onClick={() => openEditModal(u)}
                    style={editButtonStyle}
                    title={`Chỉnh sửa phòng ban của ${u.email}`}
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.email)}
                    style={deleteButtonStyle}
                    title={`Xóa quyền của ${u.email}`}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="5"
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
                Chưa có nhân viên nào trong danh sách.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* EDIT MODAL */}
      {editingUser && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h4>Chỉnh sửa nhân viên</h4>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "600",
                  }}
                >
                  Tên nhân viên:
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "600",
                  }}
                >
                  Phòng ban:
                </label>
                <select
                  value={editForm.department}
                  onChange={(e) =>
                    setEditForm({ ...editForm, department: e.target.value })
                  }
                  style={inputStyle}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={cancelButtonStyle}
                >
                  Hủy
                </button>
                <button type="submit" style={buttonStyle}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  maxWidth: "400px",
  width: "90%",
};
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
const deleteButtonStyle = {
  padding: "6px 10px",
  background: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "600",
  marginLeft: "5px",
};
const editButtonStyle = {
  padding: "6px 10px",
  background: "#28a745",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "600",
};
const cancelButtonStyle = {
  padding: "8px 16px",
  background: "#6c757d",
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
