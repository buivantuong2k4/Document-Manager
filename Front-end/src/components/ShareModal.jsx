import React, { useState, useEffect } from "react";
import axios from "../api/axiosClient";

function ShareModal({ isOpen, doc, onClose, onShareSuccess }) {
  const [targetDept, setTargetDept] = useState("NONE");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch danh sách phòng ban
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get("/api/departments");
        if (Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách phòng ban:", error);
      }
    };
    fetchDepartments();
  }, []);

  // Reset giá trị mỗi khi mở modal cho file khác
  useEffect(() => {
    if (doc) {
      setTargetDept(doc.shared_department || "NONE");
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`/api/documents/${doc.id}/share`, {
        target_department: targetDept,
      });
      alert("✅ Đã cập nhật quyền chia sẻ!");
      onShareSuccess(); // Báo component cha reload list
      onClose();
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi: " + (error.response?.data?.error || "Không thể chia sẻ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ marginTop: 0 }}>🔗 Chia sẻ tài liệu</h3>
        <p style={{ color: "#666", fontSize: "14px" }}>
          File: <b>{doc.filename}</b>
        </p>

        <label
          style={{
            display: "block",
            marginBottom: "10px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Chọn phạm vi chia sẻ:
        </label>

        <select
          value={targetDept}
          onChange={(e) => setTargetDept(e.target.value)}
          style={selectStyle}
        >
          <option value="NONE">🔒 Riêng tư (Chỉ mình tôi)</option>
          <option value="PUBLIC">🌐 Công khai (Toàn công ty)</option>
          <option disabled>──────────</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button onClick={onClose} style={cancelBtnStyle}>
            Hủy
          </button>
          <button onClick={handleSave} style={saveBtnStyle} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContentStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "8px",
  width: "400px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
};

const selectStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  marginTop: "5px",
};

const saveBtnStyle = {
  padding: "8px 16px",
  background: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "600",
};

const cancelBtnStyle = {
  padding: "8px 16px",
  background: "#e2e6ea",
  color: "#333",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default ShareModal;
