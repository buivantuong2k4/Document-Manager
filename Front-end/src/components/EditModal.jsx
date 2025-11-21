import React, { useState, useEffect } from "react";
import axios from "../api/axiosClient";

function EditModal({ isOpen, doc, onClose, onSuccess }) {
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Khi mở modal, điền sẵn loại hiện tại của file
  useEffect(() => {
    if (doc) {
      setCategory(doc.classification || "Others");
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      // Gọi API sửa phân loại (Code Backend mình đã đưa ở câu trước)
      await axios.put(`/api/documents/${doc.id}/reclassify`, {
        new_classification: category,
      });

      alert("✅ Đã sửa phân loại thành công!");
      onSuccess(); // Reload lại danh sách
      onClose();
    } catch (error) {
      alert("❌ Lỗi: " + (error.response?.data?.error || "Không thể cập nhật"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>✏️ Sửa phân loại tài liệu</h3>
        <p style={{ fontSize: "13px", color: "#666" }}>
          File: <b>{doc.filename}</b>
        </p>

        <label
          style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}
        >
          Loại tài liệu thực tế:
        </label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={selectStyle}
        >
          <option value="Hoa_don">🧾 Invoice (Hóa đơn)</option>
          <option value="Hop_dong">⚖️ Contract (Hợp đồng)</option>
          <option value="Ho_so_nhan_su">👤 Resume/CV (Hồ sơ)</option>
          <option value="Tai_lieu">💻 Technical (Kỹ thuật/Code)</option>
          <option value="Bao_cao_thu_chi">📊 Report (Báo cáo)</option>
          <option value="Khac">📁 Others (Khác)</option>
        </select>

        <div style={infoBoxStyle}>
          <small>
            ⚠️ <b>Lưu ý:</b> Khi thay đổi loại, hệ thống sẽ tự động cập nhật lại
            quyền chia sẻ (Shared Department).
          </small>
        </div>

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
const modalStyle = {
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
};
const saveBtnStyle = {
  padding: "8px 16px",
  background: "#28a745",
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
const infoBoxStyle = {
  marginTop: "15px",
  padding: "10px",
  background: "#fff3cd",
  borderRadius: "4px",
  color: "#856404",
  fontSize: "12px",
};

export default EditModal;
