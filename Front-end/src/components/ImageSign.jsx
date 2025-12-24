import React, { useEffect, useState } from "react";
import axios from "axios";

export default function SignatureManagement() {
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", image: null });
  const [preview, setPreview] = useState(null);
  const [user, setUser] = useState(null);

  // Base URL
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const URL_MINIO = import.meta.env.VITE_URL_MINIO || "localhost:9000";

  useEffect(() => {
    // 🔍 Lấy user từ localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      // 🔍 Tự điền email
      setForm((prev) => ({
        ...prev,
        email: userData.email,
        full_name: userData.full_name || "",
      }));
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/image-signed-files`)
      .then((res) => res.json())
      .then((data) => {
        // 🔍 Filter: Nếu không phải admin thì chỉ hiển thị chữ ký của user
        let filtered = data;
        if (user && user.role !== "ADMIN") {
          filtered = data.filter((f) => f.email === user.email);
        }
        setFiles(filtered);
      })
      .catch((err) => {
        console.error("Lỗi load danh sách chữ ký:", err);
      });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // 🔒 Không cho sửa email nếu không phải admin
    if (name === "email" && user && user.role !== "ADMIN") {
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.email || !form.image) {
      alert("Vui lòng điền đủ thông tin và chọn ảnh!");
      return;
    }

    // Tạo FormData
    const formData = new FormData();
    formData.append("full_name", form.full_name);
    formData.append("email", form.email);
    formData.append("image", form.image);

    try {
      // Upload file lên backend
      const res = await axios.post(
        `${API_BASE}/api/upload-signature`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Backend trả về id thật
      const newFile = {
        id: res.data.id,
        full_name: form.full_name,
        email: form.email,
        preview_url: URL.createObjectURL(form.image),
      };

      // Logic cập nhật UI
      setFiles((prev) => {
        const idx = prev.findIndex((f) => f.email === form.email);
        if (idx === -1) {
          return [newFile, ...prev];
        } else {
          const clone = [...prev];
          clone[idx] = { ...clone[idx], ...newFile };
          return clone;
        }
      });

      // Reset form
      setForm({ full_name: "", email: "", image: null });
      setPreview(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Upload thất bại");
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
        fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Header đơn giản hóa */}
      <h2
        style={{
          marginBottom: "20px",
          color: "#1f2937",
          fontWeight: 700,
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "10px",
        }}
      >
        Danh sách chữ ký mẫu
      </h2>

      {/* Nút hiển thị form */}
      <button
        onClick={() => setShowForm((prev) => !prev)}
        style={{
          marginBottom: 20,
          padding: "10px 20px",
          borderRadius: 6,
          background: "#1976d2",
          color: "white",
          fontWeight: 500,
          cursor: "pointer",
          border: "none",
        }}
      >
        {showForm ? "Đóng form" : "Thêm / cập nhật chữ ký"}
      </button>

      {/* Form upload */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
            background: "#f3f4f6",
            padding: 20,
            borderRadius: 8,
          }}
        >
          <div>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>
              Họ & tên:
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              disabled={true}
              style={{
                display: "block",
                padding: "8px",
                borderRadius: 4,
                marginTop: 4,
                border: "1px solid #d1d5db",
                width: "200px",
                backgroundColor: "#f3f4f6",
                cursor: "not-allowed",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Email:</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={true}
              style={{
                display: "block",
                padding: "8px",
                borderRadius: 4,
                marginTop: 4,
                border: "1px solid #d1d5db",
                width: "200px",
                backgroundColor: "#f3f4f6",
                cursor: "not-allowed",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>
              Ảnh chữ ký:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "block", marginTop: 8 }}
            />
          </div>
          <div>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                background: "#15803d", // Màu xanh lá cho nút lưu
                color: "white",
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                height: "38px",
              }}
            >
              Lưu chữ ký
            </button>
          </div>
          {preview && (
            <div>
              <img
                src={preview}
                alt="preview"
                style={{
                  width: 100,
                  height: 50,
                  objectFit: "contain",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  backgroundColor: "white",
                }}
              />
            </div>
          )}
        </form>
      )}

      {/* Table */}
      <div
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 2fr 2fr 1fr",
            alignItems: "center",
            padding: "12px 15px",
            borderBottom: "2px solid #e5e7eb",
            background: "#f9fafb",
            fontWeight: 600,
            fontSize: "14px",
            color: "#374151",
            textTransform: "uppercase",
          }}
        >
          <div>STT</div>
          <div>Họ & tên</div>
          <div>Email</div>
          <div>Hình ảnh chữ ký</div>
        </div>

        {files.map((file, index) => (
          <div
            key={file.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 2fr 2fr 1fr",
              alignItems: "center",
              padding: "12px 15px",
              borderBottom: "1px solid #e5e7eb",
              background: "#ffffff",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            <div
              style={{ fontSize: "15px", color: "#111827", fontWeight: 500 }}
            >
              {index + 1}
            </div>
            <div
              style={{ fontSize: "15px", color: "#111827", fontWeight: 500 }}
            >
              {file.full_name}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              {file.email}
            </div>
            <img
              src={
                file.preview_url
                  ? file.preview_url
                  : `${API_BASE}/api/preview-image/${file.id}`
              }
              alt={file.full_name}
              style={{
                width: 80,
                height: 40,
                objectFit: "contain",
                border: "1px solid #eee",
                borderRadius: "4px",
                padding: "2px",
              }}
            />
          </div>
        ))}

        {files.length === 0 && (
          <div
            style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}
          >
            Chưa có chữ ký mẫu nào được tải lên.
          </div>
        )}
      </div>
    </div>
  );
}
