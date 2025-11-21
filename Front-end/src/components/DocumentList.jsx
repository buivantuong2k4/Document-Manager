import React, { useState, useEffect } from "react";
// QUAN TRỌNG: Import axiosClient để có Token (đặt tên biến là axios cho gọn)
import axios from "../api/axiosClient";

// Import các Modal
import FilePreviewModal from "./FilePreviewModal";
import ShareModal from "./ShareModal";
import EditModal from "./EditModal";

function DocumentList({ refreshKey, user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // State cho Tabs
  const [activeTab, setActiveTab] = useState("MY_FILES"); // 'MY_FILES' | 'SHARED' | 'ALL'

  // State cho Modals
  const [previewData, setPreviewData] = useState(null); // { url, filename }
  const [shareDoc, setShareDoc] = useState(null); // Document object để share
  const [editDoc, setEditDoc] = useState(null); // <--- BẠN ĐANG THIẾU DÒNG NÀY

  // --- 1. HÀM FORMAT NGÀY GIỜ (VN) ---
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- 2. LẤY DỮ LIỆU ---
  const fetchDocuments = async () => {
    try {
      // Gọi axiosClient -> Tự động có Token -> Backend tự lọc danh sách theo quyền
      const response = await axios.get("/api/documentsList");

      if (Array.isArray(response.data)) {
        setDocuments(response.data);
        setError(null);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
      if (documents.length === 0) setError("Không tải được dữ liệu.");
    } finally {
      if (loading) setLoading(false);
    }
  };
  // Thêm hàm này vào trong DocumentList
  const handleDelete = async (doc) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn file "${doc.filename}" không?`
      )
    )
      return;

    try {
      await axios.delete(`/api/documentsfile/${doc.id}`);
      alert("Đã xóa thành công!");
      // Gọi lại hàm fetchDocuments để cập nhật danh sách
      // (Lưu ý: Cần đưa fetchDocuments ra ngoài useEffect hoặc gọi thông qua prop refreshKey)
      // Cách đơn giản nhất ở đây: Reload trang hoặc chờ 5s polling tự cập nhật
    } catch (error) {
      alert("Lỗi xóa file: " + (error.response?.data?.error || error.message));
    }
  };

  // Polling dữ liệu mỗi 5s
  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  // --- 3. XỬ LÝ FILTER & TABS ---
  // A. Phân loại theo User
  const myFiles = documents.filter(
    (doc) => doc.uploaded_by_email === user.email
  );
  const sharedFiles = documents.filter(
    (doc) => doc.uploaded_by_email !== user.email
  );

  // B. Chọn danh sách hiển thị theo Tab
  let currentList = [];
  if (activeTab === "MY_FILES") currentList = myFiles;
  else if (activeTab === "SHARED") currentList = sharedFiles;
  else currentList = documents; // Tab ALL (Cho Admin)

  // C. Lọc theo ô tìm kiếm
  const filteredDocuments = currentList.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const filename = doc.filename ? doc.filename.toLowerCase() : "";
    const uploader = doc.uploaded_by_email
      ? doc.uploaded_by_email.toLowerCase()
      : "";
    const type = doc.classification ? doc.classification.toLowerCase() : "";
    return (
      filename.includes(term) || uploader.includes(term) || type.includes(term)
    );
  });

  // --- 4. XỬ LÝ HÀNH ĐỘNG ---
  const handleView = async (id, filename) => {
    try {
      const res = await axios.get(`/api/documents/${id}/view`);
      if (res.data.viewUrl) {
        setPreviewData({ url: res.data.viewUrl, filename });
      }
    } catch (e) {
      alert("Lỗi mở file.");
    }
  };

  // --- 5. THỐNG KÊ DASHBOARD ---
  const stats = {
    total: documents.length,
    myTotal: myFiles.length,
    sharedTotal: sharedFiles.length,
    gdprWarning: documents.filter(
      (d) => d.gdpr_analysis && d.gdpr_analysis.has_pii
    ).length,
  };

  // --- RENDER UI ---
  if (loading && documents.length === 0)
    return <p style={{ textAlign: "center", padding: 20 }}>⏳ Đang tải...</p>;
  if (error)
    return (
      <p style={{ textAlign: "center", color: "red", padding: 20 }}>
        ⚠️ {error}
      </p>
    );

  return (
    <div style={containerStyle}>
      {/* === DASHBOARD MINI === */}
      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: "#666" }}>Tổng tài liệu</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#007bff" }}>
            {stats.myTotal}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>Của tôi</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#dc3545" }}>
            {stats.gdprWarning}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>Cảnh báo GDPR</div>
        </div>
      </div>

      {/* === TABS & SEARCH === */}
      <div style={toolbarStyle}>
        <div style={{ display: "flex", gap: 15 }}>
          <button
            style={activeTab === "MY_FILES" ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab("MY_FILES")}
          >
            Của tôi ({stats.myTotal})
          </button>
          <button
            style={activeTab === "SHARED" ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab("SHARED")}
          >
            Được chia sẻ ({stats.sharedTotal})
          </button>
          {user.role === "ADMIN" && (
            <button
              style={activeTab === "ALL" ? activeTabStyle : tabStyle}
              onClick={() => setActiveTab("ALL")}
            >
              Tất cả (Admin)
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="🔍 Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      {/* === BẢNG DỮ LIỆU === */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "#f8f9fa",
                borderBottom: "2px solid #dee2e6",
              }}
            >
              <th style={headerStyle}>Tên file</th>
              <th style={headerStyle}>Người đăng</th>
              <th style={headerStyle}>Phòng ban</th>
              <th style={headerStyle}>Ngày tải</th>
              <th style={headerStyle}>Phân loại</th>
              <th style={headerStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: "1px solid #eee" }}>
                  {/* Tên file */}
                  <td style={cellStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>📄</span>
                      <span
                        onClick={() => handleView(doc.id, doc.filename)}
                        style={linkStyle}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </div>
                  </td>

                  {/* Người đăng */}
                  <td style={cellStyle}>
                    {doc.uploaded_by_email === user.email ? (
                      <span style={{ fontWeight: "bold", color: "#238636" }}>
                        Tôi
                      </span>
                    ) : (
                      <span style={{ fontSize: 13 }}>
                        {doc.uploaded_by_email}
                      </span>
                    )}
                  </td>

                  {/* Phòng ban (Share) */}
                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        background:
                          doc.shared_department === "NONE" ? "#eee" : "#cff4fc",
                        color:
                          doc.shared_department === "NONE" ? "#666" : "#055160",
                      }}
                    >
                      {doc.shared_department === "NONE"
                        ? "🔒 Riêng tư"
                        : doc.shared_department}
                    </span>
                  </td>

                  {/* Ngày tải */}
                  <td style={cellStyle}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {formatDate(doc.created_at)}
                    </span>
                  </td>

                  {/* Phân loại & GDPR */}
                  <td style={cellStyle}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>
                        {doc.classification || "..."}
                      </span>
                      {doc.gdpr_analysis?.has_pii && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "red",
                            fontWeight: "bold",
                          }}
                        >
                          ⚠️ PII Detected
                        </span>
                      )}
                    </div>
                  </td>

                  {/* CỘT HÀNH ĐỘNG TRONG BẢNG */}
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {/* Nút Xem */}
                      <button
                        onClick={() => handleView(doc.id, doc.filename)}
                        style={buttonStyle}
                        title="Xem"
                      >
                        👁️
                      </button>

                      {/* Nút Share (Owner + Admin) */}
                      {(user.role === "ADMIN" ||
                        doc.uploaded_by_email === user.email) && (
                        <button
                          onClick={() => setShareDoc(doc)}
                          style={{
                            ...buttonStyle,
                            color: "#007bff",
                            borderColor: "#007bff",
                          }}
                          title="Chia sẻ"
                        >
                          🔗
                        </button>
                      )}

                      {/* --- NÚT SỬA (CHỈ ADMIN MỚI ĐƯỢC SỬA AI) --- */}
                      {user.role === "ADMIN" && (
                        <button
                          onClick={() => setEditDoc(doc)}
                          style={{
                            ...buttonStyle,
                            color: "#e0a800",
                            borderColor: "#e0a800",
                          }}
                          title="Sửa phân loại (Correct AI)"
                        >
                          ✏️
                        </button>
                      )}

                      {/* Nút Xóa */}
                      {(user.role === "ADMIN" ||
                        doc.uploaded_by_email === user.email) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          style={{
                            ...buttonStyle,
                            color: "red",
                            borderColor: "red",
                          }}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>

                  {/* ... */}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#999",
                  }}
                >
                  Danh sách trống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}
      <FilePreviewModal
        url={previewData?.url}
        filename={previewData?.filename}
        onClose={() => setPreviewData(null)}
      />
      <ShareModal
        isOpen={!!shareDoc}
        doc={shareDoc}
        onClose={() => setShareDoc(null)}
        onShareSuccess={fetchDocuments}
      />
      {/* Component EditModal mới */}
      <EditModal
        isOpen={!!editDoc}
        doc={editDoc}
        onClose={() => setEditDoc(null)}
        onSuccess={fetchDocuments} // Reload list sau khi sửa xong
      />
    </div>
  );
}

// --- CSS STYLES ---
const containerStyle = {
  padding: "20px",
  background: "#fff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};
const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  borderBottom: "1px solid #eee",
  paddingBottom: "10px",
};
const tabStyle = {
  background: "none",
  border: "none",
  padding: "10px 15px",
  cursor: "pointer",
  fontSize: "14px",
  color: "#666",
  borderBottom: "2px solid transparent",
};
const activeTabStyle = {
  ...tabStyle,
  color: "#007bff",
  borderBottom: "2px solid #007bff",
  fontWeight: "bold",
};
const searchInputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  width: "200px",
};
const headerStyle = {
  padding: "12px",
  textAlign: "left",
  background: "#f8f9fa",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#555",
  textTransform: "uppercase",
};
const cellStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  verticalAlign: "middle",
};
const linkStyle = {
  color: "#007bff",
  fontWeight: "500",
  cursor: "pointer",
  textDecoration: "none",
  display: "block",
  maxWidth: "200px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const buttonStyle = {
  padding: "5px 10px",
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "4px",
  cursor: "pointer",
};
const cardStyle = {
  flex: 1,
  padding: 15,
  background: "#f8f9fa",
  borderRadius: 8,
  textAlign: "center",
  border: "1px solid #eee",
};

export default DocumentList;
