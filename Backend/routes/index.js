const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Import Middlewares ---
const verifyToken = require('../middleware/auth');

// --- Import Controllers ---
const authController = require('../controllers/authController');
const documentController = require('../controllers/documentController'); // Quản lý tài liệu chung
const docController = require('../controllers/docController');           // Quản lý luồng upload/n8n
const chatController = require('../controllers/chatController');
const userController = require('../controllers/userController');
const signController = require('../controllers/signController');
const departmentController = require('../controllers/departmentController');

// ==========================================
// 1. CẤU HÌNH UPLOAD (MULTER)
// ==========================================

// --- Cấu hình 1: Disk Storage (Lưu vào ổ cứng - Dùng cho Document) ---
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, CSV, and TXT files are allowed.'));
    }
  }
});

// --- Cấu hình 2: Memory Storage (Lưu vào RAM - Dùng cho Sign/Signature) ---
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });


// ==========================================
// 2. HEALTH CHECK & AUTH ROUTES
// ==========================================

router.get('/', (req, res) => res.json({ message: 'Backend is running!' }));
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'RAG Chatbot API'
  });
});

router.post('/auth/google', authController.googleLogin);


// ==========================================
// 3. DOCUMENT ROUTES (Quản lý file)
// ==========================================

// --- Document Controller (Sử dụng uploadDisk) ---
// Upload document (authenticated users)
router.post('/documents/upload', verifyToken, uploadDisk.single('file'), documentController.uploadDocument);

// Get all documents (user sees their own, admin sees all)
router.get('/documents', verifyToken, documentController.getDocuments);

// Get document by ID
router.get('/documents/:id', verifyToken, documentController.getDocumentById);

// Delete document
router.delete('/documents/:id', verifyToken, documentController.deleteDocument);

// Admin stats
router.get('/admin/users-stats', verifyToken, documentController.getUsersWithStats);
router.get('/admin/users/:userId/documents', verifyToken, documentController.getDocumentsByUser);


// --- Doc Controller (Luồng upload workflow/N8N) ---
router.post('/documents/request-upload', docController.requestUpload);
router.post('/documents/upload-complete', verifyToken, docController.uploadComplete);

// Webhook (N8N)
router.post('/webhooks/n8n/update', docController.n8nWebhook);

// Document Views/Actions
router.get('/documentsList', verifyToken, docController.getDocuments);
router.get('/documents/:id/view', docController.viewDocument);
router.put('/documents/:id/share', verifyToken, docController.shareDocument);
router.delete('/documentsfile/:id', verifyToken, docController.deleteDocument);
router.put('/documents/:id/reclassify', verifyToken, docController.reclassifyDocument);


// ==========================================
// 4. CHAT ROUTES
// ==========================================

router.post('/chat/message', verifyToken, chatController.sendMessage);
router.get('/chat/history/:documentId', verifyToken, chatController.getChatHistory);
router.delete('/chat/history/:documentId', verifyToken, chatController.clearChatHistory);
router.get('/admin/users/:userId/chats', verifyToken, chatController.getChatHistoryByUser);


// ==========================================
// 5. USER & DEPARTMENT ROUTES
// ==========================================

// --- User Routes (Admin) ---
router.post('/users', verifyToken, userController.createUser);
router.get('/users', verifyToken, userController.getUsers);
router.delete('/users/:email', verifyToken, userController.deleteUser);
router.put('/users/:email', verifyToken, userController.updateUser);

// --- Department Routes ---
router.get('/departments', departmentController.getDepartments);


// ==========================================
// 6. SIGN ROUTES (Chữ ký điện tử)
// ==========================================
// Sử dụng uploadMemory vì signController thường xử lý buffer trực tiếp

// --- Upload Routes ---
router.post("/upload-file", uploadMemory.single("file"), signController.uploadFile);
router.post("/upload-signature", uploadMemory.single("image"), signController.uploadSignature);

// --- Confirmation & Webhook ---
router.get('/confirm-sign', signController.confirmSign);
router.post('/signed', signController.processSignedWebhook);

// --- List/View Routes ---
router.get("/list-file", signController.getListFiles);
router.get("/image-signed-files", signController.getImageSignedFiles);
router.get("/signed-files/", signController.getSignedFiles);

// --- Preview Routes (Streaming) ---
router.get("/preview-image/:id", signController.previewImage);
router.get("/preview-file/:id", signController.previewFile);

// --- Email/Action Routes ---
router.post("/send-email", signController.sendEmailRequest);
router.post("/send-email-no-signed", signController.sendEmailNoSigned);
router.post("/resend-file/:id", signController.resendFile);


module.exports = router;