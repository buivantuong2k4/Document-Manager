// src/components/UploadModal.jsx
import React from "react";
import FileUpload from "./FileUpload"; // Import component upload cũ của bạn

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onUploadSuccess(); // Báo cho App biết để reload list
    // Tự đóng popup sau 1 giây
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Header của Modal */}
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0 }}>Upload Documents</h3>
          <button onClick={onClose} style={closeButtonStyle}>
            ✖
          </button>
        </div>

        {/* Nội dung form upload */}
        <div style={{ padding: "20px" }}>
          <FileUpload onUploadSuccess={handleSuccess} />
        </div>
      </div>
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
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(3px)",
};

const modalContentStyle = {
  backgroundColor: "white",
  borderRadius: "8px",
  width: "500px",
  maxWidth: "90%",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  overflow: "hidden",
  animation: "fadeIn 0.3s ease-out",
};

const modalHeaderStyle = {
  padding: "15px 20px",
  borderBottom: "1px solid #eee",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#f8f9fa",
};

const closeButtonStyle = {
  background: "none",
  border: "none",
  fontSize: "18px",
  cursor: "pointer",
  color: "#666",
};

export default UploadModal;
