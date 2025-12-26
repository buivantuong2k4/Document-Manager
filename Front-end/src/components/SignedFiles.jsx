import React, { useEffect, useState } from "react";

export default function SignedFilesUI() {
  const [files, setFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [user, setUser] = useState(null);

  // Get user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }
  }, []);

  // Load file đã ký
  useEffect(() => {
    fetch("http://localhost:5000/api/signed-files")
      .then((res) => res.json())
      .then((data) => {
        // Filter: Nếu không phải admin thì chỉ hiển thị file của user
        let filtered = data;
        if (user && user.role !== "ADMIN") {
          filtered = data.filter((f) => f.owner_email === user.email);
        }
        setFiles(filtered);
      })
      .catch((err) => console.error("Lỗi tải file đã ký:", err));
  }, [user]);

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
      {/* Header đơn giản */}
      <h2
        style={{
          marginBottom: "20px",
          color: "#1f2937",
          fontWeight: 700,
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "10px",
        }}
      >
        Tài liệu đã ký
      </h2>

      {/* Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          padding: "12px 15px",
          borderBottom: "2px solid #d1d5db",
          background: "#f3f4f6",
          fontWeight: 600,
          color: "#374151",
        }}
      >
        <div>Tên file</div>
        <div>Người gửi</div>
        <div>Ngày</div>
        <div>Kích thước</div>
        <div>Trạng thái</div>
      </div>

      {/* File rows */}
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "12px 15px",
            borderBottom: "1px solid #e5e7eb",
            cursor: "pointer",
            transition: "background 0.2s",
            background: "#fff",
          }}
          onClick={() => setPreviewFile(file)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "#111827",
              fontWeight: 500,
            }}
            title={file.file_name}
          >
            {file.file_name.length > 30
              ? file.file_name.slice(0, 30) + "..."
              : file.file_name}
          </div>
          <div style={{ color: "#6b7280" }}>{file.owner_email}</div>
          <div style={{ color: "#6b7280" }}>
            {new Date(file.upload_date).toISOString().split("T")[0]}
          </div>
          <div style={{ color: "#6b7280" }}>{file.size}</div>
          <div>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#166534",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {file.status}
            </span>
          </div>
        </div>
      ))}

      {files.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
          Chưa có tài liệu nào đã ký.
        </div>
      )}

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
            onClick={(e) => e.stopPropagation()}
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
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✖
              </button>
            </div>

            {/* PDF Viewer */}
            <iframe
              src={`http://localhost:5000/api/preview-file/${previewFile.id}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
