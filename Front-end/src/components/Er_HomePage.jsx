import { useEffect, useState } from "react";
import { getFiles } from "../api/filesApi";

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getFiles()
      .then((data) => setFiles(data))
      .catch(() => setError("Error: Failed to fetch"));
  }, []);

  const getStatusStyle = (status) => {
    if (status === "DONE") return { color: "#2e7d32", background: "#e8f5e9" };
    if (status === "ERROR") return { color: "#c62828", background: "#fdecea" };
    return { color: "#ef6c00", background: "#fff3e0" };
  };

  const countByStatus = (status) =>
    files.filter((f) => f.status === status).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "24px",
        }}
      >
        {/* LEFT: Document List */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ marginBottom: "20px", color: "#263238" }}>
            📄 Document System
          </h1>

          {error && (
            <p style={{ color: "red", marginBottom: "16px" }}>{error}</p>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {files.map((file) => (
              <li
                key={file.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span style={{ fontWeight: "bold", color: "#37474f" }}>
                  {file.filename}
                </span>

                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    ...getStatusStyle(file.status),
                  }}
                >
                  {file.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: Summary Panel */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            height: "fit-content",
          }}
        >
          <h2 style={{ marginBottom: "16px", color: "#263238" }}>📊 Summary</h2>

          <p>
            <strong>Total files:</strong> {files.length}
          </p>
          <p style={{ color: "#2e7d32" }}>✔ DONE: {countByStatus("DONE")}</p>
          <p style={{ color: "#ef6c00" }}>
            ⏳ PROCESSING: {countByStatus("PROCESSING")}
          </p>
          <p style={{ color: "#c62828" }}>✖ ERROR: {countByStatus("ERROR")}</p>
        </div>
      </div>
    </div>
  );
}
