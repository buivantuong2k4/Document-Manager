const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/files-err`
  : 'http://localhost:5000/api/files-err';

export async function getFiles() {
  const res = await fetch(BASE_URL);

  if (!res.ok) {
    throw new Error('Failed to fetch');
  }

  return res.json();
}
