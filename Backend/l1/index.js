// index.js (trong thư mục /backend)
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// ... các import khác


const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // Thêm dòng này

// --- THÊM CÁC DÒNG NÀY (BẮT BUỘC) ---
const { OAuth2Client } = require('google-auth-library'); // 1. Import thư viện Google
const jwt = require('jsonwebtoken'); // 2. Import JWT để tạo token nội bộ

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const JWT_SECRET = process.env.JWT_SECRET || "secret_tam_thoi"; // Lấy secret từ env hoặc dùng tạm string

// 3. Khởi tạo biến 'client' (Đây là biến bị thiếu gây ra lỗi)
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
app.use(cors());
app.use(express.json());


// --- 1. CẤU HÌNH KẾT NỐI ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const s3 = new AWS.S3({
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  s3ForcePathStyle: true,
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// --- 2. CÁC API ENDPOINTS MỚI ---

/**
 * @api POST /api/documents/request-upload
 * BƯỚC 1: FE GỌI ĐỂ XIN "LINK" UPLOAD
 */
app.post('/api/documents/request-upload', async (req, res) => {
    // THÊM DÒNG NÀY ĐỂ DEBUG
  console.log("Data received from frontend:", req.body);
  const { filename, filetype } = req.body;
  if (!filename || !filetype) {
    return res.status(400).json({ error: 'Missing filename or filetype' });
  }

  const documentId = uuidv4(); // Tạo ID duy nhất cho tài liệu
  const storagePath = `uploads/${documentId}-${filename}`;

 try {
    // 1. CẬP NHẬT CÂU LỆNH INSERT
    await pool.query(
      'INSERT INTO documents (id, filename, storage_path, status, filetype) VALUES ($1, $2, $3, $4, $5)', // Thêm "filetype"
      [documentId, filename, storagePath, 'UPLOADING', filetype] // Thêm biến filetype
    );

    // 2. Tạo Pre-signed URL từ MinIO
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storagePath,
      Expires: 60 * 5, // Link có hiệu lực 5 phút
      ContentType: filetype,
    };
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    // 3. Trả về cho FE
    res.json({ documentId, uploadUrl });

  } catch (error) {
    console.error('Error requesting upload:', error);
    res.status(500).json({ error: 'Failed to create pre-signed URL' });
  }
});

// index.js (trong thư mục /backend)

// ... (API /request-upload giữ nguyên) ...

/**
 * @api POST /api/documents/upload-complete
 * BƯỚC 2: FE GỌI SAU KHI UPLOAD LÊN MINIO THÀNH CÔNG
 * (Phiên bản nâng cấp: Sửa link cho n8n qua ngrok)
 */
app.post('/api/documents/upload-complete', verifyToken, async (req, res) => {
  const { documentId } = req.body;
  const { email, department } = req.user; // Lấy email người đang upload
  if (!documentId) {
    return res.status(400).json({ error: 'Missing documentId' });
  }

try {
    // CẬP NHẬT SQL: Thêm uploaded_by_email và mặc định share cho phòng ban của họ
    const dbResult = await pool.query(
      `UPDATE documents 
       SET status = 'PENDING', 
           uploaded_by_email = $1, 
           shared_department = $2 
       WHERE id = $3 
       RETURNING storage_path, filetype`,
      [email, department, documentId]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found after upload' });
    }
    const storagePath = dbResult.rows[0].storage_path;
    const filetype = dbResult.rows[0].filetype; // <-- Lấy filetype từ DB

    // 2. TẠO LINK ĐỌC TẠM THỜI (Link này là link local)
    // Backend (chạy trên Host) dùng MINIO_ENDPOINT (http://127.0.0.1:9000)
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storagePath,
      Expires: 60 * 15, // Link có hiệu lực 15 phút
    };
    // tempReadUrl_FromMinIO sẽ là: "http://127.0.0.1:9000/..."
    const tempReadUrl_FromMinIO = await s3.getSignedUrlPromise('getObject', params);

    // 3. SỬA LINK CHO N8N (PHẦN QUAN TRỌNG)
    // Thay thế "http://127.0.0.1:9000" (từ .env)
    // bằng "https://...ngrok.io" (từ .env)
    const tempReadUrl_ForN8N = tempReadUrl_FromMinIO.replace(
      process.env.MINIO_ENDPOINT, // "http://127.0.0.1:9000"
      process.env.PUBLIC_MINIO_URL // "https://1bc610126262.ngrok-free.app" (ví dụ)
    );

    // 4. KÍCH HOẠT N8N WORKFLOW (Gửi link public đã sửa)
    if (N8N_WEBHOOK_URL) {
      await axios.post(N8N_WEBHOOK_URL, {
        document_id: documentId,
        temp_read_url: tempReadUrl_ForN8N, 
        filetype: filetype// <-- Gửi link ĐÃ SỬA
      });
    } else {
      console.warn('N8N_WEBHOOK_URL not set. Skipping n8n trigger.');
    }
    
    res.json({ message: 'Upload complete, processing started.' });

  } catch (error) {
    console.error('Error completing upload:', error);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

/**
 * @api GET /api/documents
 * LẤY TÀI LIỆU (CÓ PHÂN QUYỀN)
 */
// Thêm 'verifyToken' vào giữa
app.get('/api/documents', verifyToken, async (req, res) => {
  try {
    // Lấy thông tin người đang gọi API
    const { email, role, department } = req.user; 

    let query = '';
    let params = [];

    if (role === 'ADMIN') {
      // Admin: Xem hết
      query = 'SELECT * FROM documents ORDER BY created_at DESC';
    } else {
      // Nhân viên: Xem file của mình + file share cho phòng mình
      query = `
        SELECT * FROM documents 
        WHERE uploaded_by_email = $1 
           OR shared_department = $2
        ORDER BY created_at DESC
      `;
      params = [email, department];
    }

    const dbResult = await pool.query(query, params);
    res.json(dbResult.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
});

// index.js (trong thư mục /backend)

// ... (Giữ nguyên code cũ) ...

/**
 * @api POST /api/webhooks/n8n/update
 * BƯỚC 4: NHẬN KẾT QUẢ AI -> DI CHUYỂN FILE -> TỰ ĐỘNG SHARE
 */
app.post('/api/webhooks/n8n/update', async (req, res) => {
  console.log("Webhook received from n8n:", req.body);
  const { document_id, classification, gdpr_analysis } = req.body;

  if (!document_id) {
    return res.status(400).json({ error: 'Missing document_id' });
  }

  const io = req.app.get('socketio');

  try {
    // 1. Lấy thông tin file cũ
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [document_id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const currentDoc = docResult.rows[0];
    const oldKey = currentDoc.storage_path; 
    
    // 2. TÍNH TOÁN ĐƯỜNG DẪN MỚI & PHÒNG BAN ĐƯỢC SHARE
    let targetFolder = 'others/'; 
    let autoShareDept = 'NONE'; // Mặc định là Riêng tư

    if (gdpr_analysis && gdpr_analysis.has_pii) {
        // A. Nếu vi phạm GDPR -> Cách ly ngay
        targetFolder = 'secure/restricted/'; 
        autoShareDept = 'NONE'; // Không share cho ai cả (hoặc set là 'HR' nếu muốn)
        console.log(`⚠️ GDPR Alert: File ${document_id} bị khóa quyền truy cập.`);
    } 
    else if (classification) {
        // B. Nếu an toàn -> Phân loại
        const cleanClass = classification.toLowerCase().replace(/\s+/g, '_');
        targetFolder = `departments/${cleanClass}/`;

        // --- LOGIC TỰ ĐỘNG SHARE (MAPPING) ---
        const type = classification.toLowerCase();
        
        if (type.includes('Hoa_don') || type.includes('Bao_cao_thu_chi') || type.includes('bill') || type.includes('hoa_don')) {
            autoShareDept = 'SALES'; // Hóa đơn -> Phòng Kinh doanh/Kế toán
        } 
        else if (type.includes('Ho_so_nhan_su') || type.includes('cv') || type.includes('tuyen_dung')) {
            autoShareDept = 'HR';    // CV -> Phòng Nhân sự
        }
        else if (type.includes('contract') || type.includes('agreement') || type.includes('Hop_dong')) {
            autoShareDept = 'LEGAL'; // Hợp đồng -> Phòng Pháp chế (hoặc IT/HR tùy bạn chọn)
        }
        else if (type.includes('Tai_lieu') || type.includes('code') || type.includes('manual')) {
            autoShareDept = 'IT';    // Tài liệu kỹ thuật -> Phòng IT
        }
        else {
            autoShareDept = 'PUBLIC'; // Khác -> Công khai nội bộ
        }
    }

    const filename = oldKey.split('/').pop(); 
    const newKey = targetFolder + filename;

    // 3. THỰC HIỆN DI CHUYỂN FILE TRÊN MINIO
    if (!oldKey.startsWith(targetFolder)) {
        console.log(`Moving file from [${oldKey}] to [${newKey}]...`);
        
        await s3.copyObject({
            Bucket: process.env.S3_BUCKET_NAME,
            // EncodeURI để sửa lỗi tên file Tiếng Việt
            CopySource: encodeURI(`/${process.env.S3_BUCKET_NAME}/${oldKey}`),
            Key: newKey
        }).promise();

        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldKey
        }).promise();
    }

    // 4. CẬP NHẬT DATABASE (Thêm shared_department)
    const updateResult = await pool.query(
      `UPDATE documents 
       SET status = $1, 
           classification = $2, 
           gdpr_analysis = $3, 
           storage_path = $4, 
           shared_department = $5, 
           processed_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      ['PROCESSED', classification, gdpr_analysis, newKey, autoShareDept, document_id]
    );
    
    const updatedDoc = updateResult.rows[0];

    // 5. Báo Frontend
    if (io && updatedDoc) {
      io.emit('document:processed', updatedDoc);
    }
    
    res.json({ success: true, new_path: newKey, auto_shared_to: autoShareDept });

  } catch (error) {
    console.error('Error processing document update:', error);
    res.status(500).json({ error: 'Failed to process document update' });
  }
});
/**
 * @api GET /api/documents/:id/view
 * BƯỚC TIẾP THEO: Lấy link xem file (Pre-signed URL)
 */
app.get('/api/documents/:id/view', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Lấy đường dẫn file (storage_path) từ Database
    const dbResult = await pool.query(
      'SELECT storage_path, filename, filetype FROM documents WHERE id = $1',
      [id]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { storage_path, filename, filetype } = dbResult.rows[0];

    // 2. Tạo link tạm (Presigned URL) từ MinIO/S3
    // Link này chỉ tồn tại 5 phút
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storage_path,
      Expires: 60 * 5, // 5 phút
      ResponseContentDisposition: `inline; filename="${filename}"`, // "inline" để mở trên trình duyệt, "attachment" để tải về
      ResponseContentType: filetype || 'application/pdf'
    };

    const url = await s3.getSignedUrlPromise('getObject', params);

    // Lưu ý: Nếu bạn chạy local, url sẽ là http://localhost:9000/...
    // Đảm bảo trình duyệt của bạn truy cập được link này.
    res.json({ viewUrl: url });

  } catch (error) {
    console.error('Error generating view link:', error);
    res.status(500).json({ error: 'Failed to generate view link' });
  }
});





/**
 * @api POST /api/auth/google
 * Nhận Token từ Google -> Kiểm tra DB -> Trả về User
 */
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    // 1. Xác thực token với Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // 2. Kiểm tra xem Email này có trong DB (do Admin thêm) chưa?
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Email này chưa được cấp quyền truy cập. Vui lòng liên hệ Admin.' 
      });
    }

    let user = userResult.rows[0];

    // 3. (Tùy chọn) Cập nhật tên/avatar mới nhất từ Google
    await pool.query(
        'UPDATE users SET full_name = $1, avatar_url = $2 WHERE email = $3',
        [name, picture, email]
    );

    // 4. Tạo JWT Token của riêng hệ thống mình
   const appToken = jwt.sign(
      { email: user.email, role: user.role, department: user.department },
      JWT_SECRET, // <--- Đã sửa
      { expiresIn: '24h' }
    );

    // 5. Trả về cho Frontend
    res.json({
      token: appToken,
      user: {
        email: user.email,
        full_name: name,
        role: user.role,
        department: user.department,
        avatar: picture
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Xác thực thất bại" });
  }
});
// ADMIN
// Middleware kiểm tra xem có phải Admin không?
const verifyAdmin = (req, res, next) => {
  // verifyToken đã chạy trước đó và gán req.user
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: "Bạn không phải Admin!" });
  }
};

/**
 * @api POST /api/users
 * ADMIN THÊM NGƯỜI MỚI
 */
app.post('/api/users', verifyToken, async (req, res) => {
  // Kiểm tra quyền Admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Chỉ Admin mới được thêm người!" });
  }

  const { email, full_name, department, role } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (email, full_name, department, role) VALUES ($1, $2, $3, $4)',
      [email, full_name, department, role || 'EMPLOYEE']
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Email này đã tồn tại!" });
  }
});
/**
 * @api PUT /api/documents/:id/share
 * CHIA SẺ TÀI LIỆU CHO PHÒNG BAN KHÁC
 */
app.put('/api/documents/:id/share', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { target_department } = req.body; // Giá trị: 'HR', 'IT', 'SALES', 'PUBLIC', 'NONE'
  const { email, role } = req.user; // Người đang thực hiện thao tác

  try {
    // 1. Kiểm tra xem file này có tồn tại không?
    const docCheck = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: "File không tồn tại" });
    }
    
    const doc = docCheck.rows[0];

    // 2. Kiểm tra quyền: Chỉ Owner hoặc Admin mới được share
    // (Lưu ý: doc.uploaded_by_email phải khớp với email trong token)
    if (doc.uploaded_by_email !== email && role !== 'ADMIN') {
      return res.status(403).json({ error: "Bạn không có quyền chia sẻ file này (Chỉ chủ sở hữu mới được quyền)!" });
    }

    // 3. Cập nhật Database
    await pool.query(
      'UPDATE documents SET shared_department = $1 WHERE id = $2',
      [target_department, id]
    );

    res.json({ success: true, message: `Đã cập nhật quyền chia sẻ thành: ${target_department}` });

  } catch (error) {
    console.error("Share error:", error);
    res.status(500).json({ error: "Lỗi server khi chia sẻ" });
  }
});

/**
 * @api DELETE /api/documents/:id
 * XÓA TÀI LIỆU (DB + MINIO)
 */
app.delete('/api/documents/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { email, role } = req.user;

  try {
    // 1. Lấy thông tin file để biết đường dẫn MinIO
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: "File không tồn tại" });
    
    const doc = docResult.rows[0];

    // 2. Kiểm tra quyền: Chỉ Admin hoặc Chính chủ mới được xóa
    if (role !== 'ADMIN' && doc.uploaded_by_email !== email) {
      return res.status(403).json({ error: "Bạn không có quyền xóa file này!" });
    }

    // 3. Xóa file trên MinIO
    await s3.deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: doc.storage_path
    }).promise();

    // 4. Xóa record trong Database
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);

    res.json({ success: true, message: "Đã xóa tài liệu vĩnh viễn." });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Lỗi server khi xóa file" });
  }
});

/**
 * @api PUT /api/documents/:id/reclassify
 * ADMIN SỬA LẠI PHÂN LOẠI (NẾU AI SAI)
 */
/**
 * @api PUT /api/documents/:id/reclassify
 * ADMIN SỬA PHÂN LOẠI -> TỰ ĐỘNG SHARE -> TỰ ĐỘNG MOVE FILE
 */
app.put('/api/documents/:id/reclassify', verifyToken, async (req, res) => {
  // 1. Kiểm tra quyền Admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Chỉ Admin mới được quyền sửa phân loại!" });
  }

  const { id } = req.params;
  const { new_classification } = req.body; // Ví dụ: "Contract"

  if (!new_classification) {
    return res.status(400).json({ error: "Thiếu thông tin loại tài liệu mới" });
  }

  try {
    // 2. Lấy thông tin hiện tại để biết đường dẫn cũ (Old Key)
    const docCheck = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: "File không tồn tại" });
    }
    const currentDoc = docCheck.rows[0];
    const oldKey = currentDoc.storage_path;

    // 3. TÍNH TOÁN ĐƯỜNG DẪN MỚI & QUYỀN SHARE (Logic Auto-Routing)
    let newSharedDept = 'PUBLIC'; 
    let targetFolder = 'others/';
    const type = new_classification.toLowerCase();
 targetFolder = `departments/${type}/`;
    // Logic Mapping (Giống hệt bên Webhook)
    if (type.includes('Hoa_don') || type.includes('Bao_cao_thu_chi')) {
        newSharedDept = 'SALES';
       
    } 
    else if (type.includes('Ho_so_nhan_su') || type.includes('cv')) {
        newSharedDept = 'HR';
    }
    else if (type.includes('Hop_dong') || type.includes('agreement')) {
        newSharedDept = 'LEGAL';
       
    }
    else if (type.includes('Tai_lieu') || type.includes('code')) {
        newSharedDept = 'IT';
       
    }
    else if (type.includes('report')) {
        newSharedDept = 'PUBLIC';
        targetFolder = 'departments/report/';
    }
    else {
        newSharedDept = 'Khac';
       
    }

    // Giữ nguyên tên file gốc, chỉ đổi folder
    const filename = oldKey.split('/').pop(); 
    const newKey = targetFolder + filename;

    // 4. DI CHUYỂN FILE TRÊN MINIO (QUAN TRỌNG)
    // Chỉ di chuyển nếu đường dẫn mới khác đường dẫn cũ
    if (newKey !== oldKey) {
        console.log(`Admin moving file: [${oldKey}] -> [${newKey}]`);

        // a. Copy sang chỗ mới (Nhớ encodeURI để fix lỗi tiếng Việt)
        await s3.copyObject({
            Bucket: process.env.S3_BUCKET_NAME,
            CopySource: encodeURI(`/${process.env.S3_BUCKET_NAME}/${oldKey}`),
            Key: newKey
        }).promise();

        // b. Xóa ở chỗ cũ
        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldKey
        }).promise();
    }

    // 5. CẬP NHẬT DATABASE (Cập nhật cả storage_path)
    const result = await pool.query(
      `UPDATE documents 
       SET classification = $1, 
           shared_department = $2, 
           storage_path = $3 
       WHERE id = $4 
       RETURNING *`,
      [new_classification, newSharedDept, newKey, id]
    );

    res.json({ 
        success: true, 
        message: `Đã di chuyển file sang ${targetFolder} và cấp quyền cho ${newSharedDept}`,
        data: result.rows[0]
    });

  } catch (error) {
    console.error("Reclassify error:", error);
    res.status(500).json({ error: "Lỗi server khi cập nhật và di chuyển file" });
  }
});
/**
 * @api GET /api/users
 * LẤY DANH SÁCH USER
 */
app.get('/api/users', verifyToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).send();
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});


// --- 3. API ĐỂ KIỂM TRA (GIỮ NGUYÊN) ---
app.get('/api', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// --- 4. KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Backend server is listening on port ${PORT}`);
});