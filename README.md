# 📂 RAG Chat & Document Management System

> **Hệ thống quản lý tài liệu thông minh** tích hợp Google OAuth, phân quyền theo phòng ban (RBAC), lưu trữ MinIO/S3 và xử lý tự động qua n8n.

## 🚀 Công nghệ sử dụng

- **Backend:** Node.js, Express, PostgreSQL, AWS-SDK.
- **Frontend:** React (Vite), Axios, Socket.io-client.
- **Infrastructure:** Docker Compose (PostgreSQL, MinIO).
- **Automation:** n8n (Webhook triggers).

---

## 🛠️ Yêu cầu cài đặt (Prerequisites)

1.  **Docker Desktop** (Bắt buộc để chạy Database & Storage).
2.  **Node.js** (v18 trở lên).
3.  **Ngrok** (Để public localhost cho n8n).
4.  **Google Cloud Console Project** (Lấy Client ID).

---

## ⚙️ Hướng dẫn Cài đặt & Cấu hình

### Bước 1: Khởi chạy Hạ tầng (Infrastructure)

Chúng ta sử dụng Docker để chạy PostgreSQL và MinIO mà không cần cài đặt thủ công.

1.  Tại thư mục gốc của dự án, mở terminal và chạy:
    ```bash
    docker-compose up -d
    ```
2.  Chờ khoảng 10-20 giây. Hệ thống sẽ tự động:
    - Khởi động PostgreSQL (Port 5432).
    - Khởi động MinIO (Port 9000 & 9001).
    - **Tự động tạo Bucket** tên là `ai-documents-local`.

> **Kiểm tra:** Truy cập `http://127.0.0.1:9001` (User: `minio-local-admin` / Pass: `minio-local-password`) để xem MinIO dashboard.

---

### Bước 2: Cấu hình Biến môi trường (.env)

#### 1. Backend Config (`/backend/.env`)

```env
# --- SERVER CONFIG ---
PORT=5000
NODE_ENV=development

# --- DATABASE ---
# Kết nối tới Docker PostgreSQL
DATABASE_URL="postgres://postgres:password@localhost:5432/ai_docs_db"

# --- AUTHENTICATION ---
GOOGLE_CLIENT_ID="your-google-client-id"
JWT_SECRET="your-jwt-secret"

# --- STORAGE (MinIO) ---
MINIO_ENDPOINT="[http://127.0.0.1:9000](http://127.0.0.1:9000)"
# ⚠️ QUAN TRỌNG: Link này thay đổi mỗi lần chạy Ngrok
PUBLIC_MINIO_URL="[https://xxxx-xxxx.ngrok-free.app](https://xxxx-xxxx.ngrok-free.app)"

AWS_ACCESS_KEY_ID="minio-local-admin"
AWS_SECRET_ACCESS_KEY="minio-local-password"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="ai-documents-local"

# --- AI & AUTOMATION ---
GEMINI_API_KEY="your-gemini-api-key"
N8N_WEBHOOK_URL="[https://hung1210.cloud/webhook/uploadfile](https://hung1210.cloud/webhook/uploadfile)"
```

#### 2. Frontend Config (`/frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
```

---

### Bước 3: Cài đặt Database Schema

Mặc dù Docker đã tạo Database, bạn cần tạo các bảng (Tables).

1.  Cài dependencies cho backend:
    ```bash
    cd backend && npm install
    ```
2.  Chạy script khởi tạo DB (nếu có) hoặc dùng Tool quản lý DB (DBeaver, pgAdmin):
    - Host: `localhost`
    - Port: `5432`
    - User: `postgres`
    - Pass: `password`
    - DB: `ai_docs_db`
    - => **Import file `backend/database.sql` vào.**

---

### Bước 4: Cấu hình Ngrok (Bắt buộc cho n8n)

Do n8n cần đọc file từ máy của bạn, bạn cần public cổng Backend và MinIO.

1.  Tạo file `ngrok.yml` (hoặc cấu hình trực tiếp):
    ```yaml
    version: 2
    authtoken: YOUR_AUTHTOKEN
    tunnels:
      backend:
        proto: http
        addr: 5000
      minio:
        proto: http
        addr: 9000
    ```
2.  Chạy Ngrok:
    ```bash
    ngrok start --all --config=ngrok.yml
    ```
3.  **Cập nhật URL:**
    - Copy link Ngrok của MinIO (cổng 9000) -> Dán vào `PUBLIC_MINIO_URL` trong `.env` Backend.
    - Copy link Ngrok của Backend (cổng 5000) -> Cập nhật vào Node **HTTPRequest2** trong luồng n8n.

---

### Bước 5: Chạy Ứng dụng

Mở 2 terminal riêng biệt:

**Terminal 1 (Backend):**

```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

Truy cập Web: `http://localhost:5173`

---

### 📝 Các lệnh Docker thường dùng

- **Tắt server (giữ lại dữ liệu):** `docker-compose stop`
- **Bật lại server:** `docker-compose start`
- **Xóa sạch (Mất hết dữ liệu DB & File):** `docker-compose down -v`
