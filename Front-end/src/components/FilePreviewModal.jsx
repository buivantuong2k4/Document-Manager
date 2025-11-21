import React from "react";

function FilePreviewModal({ url, filename, onClose }) {
  if (!url) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "80%",
            }}
          >
            👁️ {filename}
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>
            ✖ Đóng
          </button>
        </div>

        {/* Body: Dùng iframe để hiển thị PDF/Image */}
        <div style={bodyStyle}>
          <iframe
            src={url}
            title="Preview"
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
          />
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
  backgroundColor: "rgba(0,0,0,0.85)",
  zIndex: 9999,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(4px)",
};

const modalStyle = {
  width: "80%",
  height: "90%",
  backgroundColor: "#fff",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
};

const headerStyle = {
  padding: "15px 20px",
  borderBottom: "1px solid #ddd",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px 8px 0 0",
};

const bodyStyle = {
  flex: 1,
  backgroundColor: "#525659",
  overflow: "hidden",
  borderRadius: "0 0 8px 8px",
};

const closeBtnStyle = {
  background: "#dc3545",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default FilePreviewModal;
