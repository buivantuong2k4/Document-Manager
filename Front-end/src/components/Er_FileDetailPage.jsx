import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getFileById } from "../api/documentsApi";

export default function FileDetailPage() {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFileById(id)
      .then((data) => setFile(data))
      .catch(() => setError("Failed to load file"));
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!file) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>File Detail</h2>
      <p>
        <strong>ID:</strong> {file.id}
      </p>
      <p>
        <strong>Filename:</strong> {file.filename}
      </p>
      <p>
        <strong>Status:</strong> {file.status}
      </p>
      <p>
        <strong>Created:</strong> {file.created_at}
      </p>
    </div>
  );
}
