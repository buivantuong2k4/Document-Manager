const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/files-er`
  : 'http://localhost:5000/api/files-er';

export async function getFileById(id) {
  const res = await fetch(`${BASE_URL}/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch');
  }

  return res.json();
}
