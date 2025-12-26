import React, { useEffect, useState } from "react";

export default function FileListDriveUI() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // state cho popup preview
  const [user, setUser] = useState(null);

  // Base URL from environment
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Get user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [user]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/list-file`);
      const data = await res.json();

      // Filter: Nếu không phải admin thì chỉ hiển thị file của user
      let filtered = data;
      if (user && user.role !== "ADMIN") {
        filtered = data.filter((f) => f.owner_email === user.email);
      }

      const filesWithResend = filtered.map((f) => ({
        ...f,
        showResendButton: f.status === "declined",
      }));

      setFiles(filesWithResend);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/upload-file`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Upload thành công!");
        fetchFiles();
      } else {
        alert("Upload thất bại");
      }
    } catch (err) {
      console.error(err);
      alert("Upload thất bại");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const resendFile = async (fileId) => {
    try {
      const res = await fetch(`${API_BASE}/api/resend-file/${fileId}`, {
        method: "POST",
      });
      if (res.ok) {
        alert("File đã được gửi lại!");
        fetchFiles();
      } else {
        alert("Gửi lại thất bại");
      }
    } catch (err) {
      console.error(err);
      alert("Gửi lại thất bại");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px",
        background: "#fdfdfd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        fontFamily: "system-ui",
      }}
    >
      {/* Header - Đã rút gọn, chỉ còn tiêu đề */}
      <h2
        style={{
          marginBottom: "20px",
          color: "#1f2937",
          fontWeight: 700,
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "10px",
        }}
      >
        Danh sách file mới nhất
      </h2>

      {/* Upload */}
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="fileUpload"
          style={{
            padding: "10px 20px",
            background: "#1976d2",
            color: "#fff",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </label>
        <input
          id="fileUpload"
          type="file"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>

      {/* Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
          padding: "12px 15px",
          borderBottom: "2px solid #d1d5db",
          background: "#f3f4f6",
          fontWeight: 600,
        }}
      >
        <div>Tên file</div>
        <div>Người gửi</div>
        <div>Ngày</div>
        <div>Kích thước</div>
        <div>Trạng thái</div>
        <div>Action</div>
      </div>

      {/* File rows */}
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            padding: "12px 15px",
            borderBottom: "1px solid #e5e7eb",
            cursor: "pointer",
          }}
          onClick={() => setPreviewFile(file)} // click row mở popup
        >
          <div>
            {file.file_name.length > 20
              ? file.file_name.slice(0, 20) + "..."
              : file.file_name}
          </div>
          <div>{file.owner_email}</div>
          <div>{new Date(file.upload_date).toISOString().split("T")[0]}</div>
          <div>{file.size}</div>
          <div>{file.status}</div>
          <div>
            {file.showResendButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resendFile(file.id);
                }} // stopPropagation tránh mở preview
                style={{
                  background: "#1976d2",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                Gửi lại / Ký sau
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Popup Preview */}
      {previewFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            style={{
              width: "80%",
              height: "90%",
              background: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()} // tránh click background
          >
            {/* Header popup */}
            <div
              style={{
                padding: "10px 15px",
                background: "#1976d2",
                color: "#fff",
                fontWeight: 600,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{previewFile.file_name}</span>
              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✖
              </button>
            </div>

            {/* PDF Viewer */}
            <iframe
              src={`${API_BASE}/api/preview-file/${previewFile.id}`}
              style={{ width: "100%", height: "100%" }}
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
