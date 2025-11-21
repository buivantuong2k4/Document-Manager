import React, { useState, useRef } from "react";

// 1. Import axiosClient để gọi Backend (có Token)
import axiosClient from "../api/axiosClient";

// 2. Import axios gốc để gọi MinIO (KHÔNG Token)
// Đổi tên thành 'axiosOriginal' để tránh nhầm lẫn
import axiosOriginal from "axios";

function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  // ... (Các hàm handleDragOver, handleDrop, handleFileChange giữ nguyên) ...
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setStatus("Ready");
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setStatus("Ready");
    }
  };

  // --- XỬ LÝ UPLOAD (SỬA ĐOẠN NÀY) ---
  const handleSubmit = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // BƯỚC 1: GỌI BE "XIN LINK" -> Dùng axiosClient (Cần Token)
      setStatus("🚀 Đang kết nối server...");
      const response = await axiosClient.post(
        "/api/documents/request-upload", // Không cần http://localhost... vì đã config base
        {
          filename: file.name,
          filetype: file.type,
        }
      );

      const { documentId, uploadUrl } = response.data;

      // BƯỚC 2: UPLOAD LÊN MINIO -> Dùng axiosOriginal (KHÔNG ĐƯỢC CÓ TOKEN)
      setStatus("☁️ Đang tải file lên Cloud...");

      // QUAN TRỌNG: Xóa header Authorization nếu nó vô tình bị set global
      // Chỉ gửi đúng Content-Type khớp với lúc xin link
      await axiosOriginal.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
          Authorization: undefined, // <--- Mẹo: Ép buộc xóa Token ở request này
        },
      });

      // BƯỚC 3: BÁO CHO BE BIẾT -> Dùng axiosClient (Cần Token)
      setStatus("🤖 Đang kích hoạt AI phân tích...");
      await axiosClient.post("/api/documents/upload-complete", {
        documentId: documentId,
      });

      setStatus("✅ Thành công!");
      if (onUploadSuccess) onUploadSuccess();

      setTimeout(() => {
        setFile(null);
        setStatus("Idle");
        setIsLoading(false);
      }, 1500);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload thất bại. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  // --- RENDER (Giữ nguyên code UI cũ) ---
  return (
    <div style={containerStyle}>
      {!file ? (
        <div
          style={{
            ...dropZoneStyle,
            borderColor: isDragging ? "#007bff" : "#ccc",
            backgroundColor: isDragging ? "#f0f8ff" : "#fafafa",
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>☁️</div>
          <p style={{ margin: 0, fontWeight: "500", color: "#555" }}>
            Kéo thả file vào đây hoặc{" "}
            <span style={{ color: "#007bff", textDecoration: "underline" }}>
              Click để chọn
            </span>
          </p>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>
            Hỗ trợ PDF, DOCX, PNG, JPG
          </p>
        </div>
      ) : (
        <div style={fileSelectedStyle}>
          <div style={fileInfoStyle}>
            <div style={{ fontSize: "24px" }}>📄</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file.name}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isLoading && (
              <button onClick={() => setFile(null)} style={removeButtonStyle}>
                ✕
              </button>
            )}
          </div>

          {isLoading && (
            <div style={{ marginTop: "15px" }}>
              <div style={progressContainerStyle}>
                <div style={progressBarStyle}></div>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "#007bff",
                  textAlign: "center",
                  marginTop: "8px",
                }}
              >
                {status}
              </p>
            </div>
          )}

          {!isLoading && (
            <button onClick={handleSubmit} style={uploadButtonStyle}>
              Bắt đầu Upload
            </button>
          )}
          {error && (
            <p
              style={{
                color: "red",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "10px",
              }}
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- STYLES (Giữ nguyên style cũ) ---
const containerStyle = { width: "100%", margin: "0 auto" };
const dropZoneStyle = {
  border: "2px dashed #ccc",
  borderRadius: "10px",
  padding: "40px 20px",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
};
const fileSelectedStyle = {
  border: "1px solid #eee",
  borderRadius: "10px",
  padding: "20px",
  backgroundColor: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};
const fileInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
  backgroundColor: "#f8f9fa",
  padding: "10px",
  borderRadius: "8px",
};
const removeButtonStyle = {
  background: "none",
  border: "none",
  color: "#999",
  cursor: "pointer",
  fontSize: "16px",
  padding: "5px",
};
const uploadButtonStyle = {
  width: "100%",
  marginTop: "15px",
  padding: "10px",
  backgroundColor: "#238636",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background 0.2s",
};
const progressContainerStyle = {
  width: "100%",
  height: "6px",
  backgroundColor: "#eee",
  borderRadius: "3px",
  overflow: "hidden",
  marginTop: "10px",
};
const progressBarStyle = {
  height: "100%",
  width: "60%",
  backgroundColor: "#007bff",
  borderRadius: "3px",
  animation: "loading 1.5s infinite ease-in-out",
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes loading { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`;
document.head.appendChild(styleSheet);

export default FileUpload;
