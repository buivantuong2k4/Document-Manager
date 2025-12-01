
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/auth');

const documentController = require('../controllers/documentController');
const chatController = require('../controllers/chatController');

// Import Controllers
const authController = require('../controllers/authController');
const docController = require('../controllers/docController');
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
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


// ==================== Document Routes (Protected) ====================

// Upload document (authenticated users)
router.post('/documents/upload', verifyToken, upload.single('file'), documentController.uploadDocument);

// Get all documents (user sees their own, admin sees all)
router.get('/documents', verifyToken, documentController.getDocuments);

// Get document by ID (with permission check)
router.get('/documents/:id', verifyToken, documentController.getDocumentById);

// Delete document (owner or admin only)
router.delete('/documents/:id', verifyToken, documentController.deleteDocument);

// Admin: Get all users with document stats
router.get('/admin/users-stats', verifyToken, documentController.getUsersWithStats);

// Admin: Get documents by user ID
router.get('/admin/users/:userId/documents', verifyToken, documentController.getDocumentsByUser);
// 
// 
// ==================== Chat Routes (Protected) ====================

// Send message (authenticated users, with permission check)
router.post('/chat/message', verifyToken, chatController.sendMessage);

// Get chat history (with permission check)
router.get('/chat/history/:documentId', verifyToken, chatController.getChatHistory);

// Clear chat history (with permission check)
router.delete('/chat/history/:documentId', verifyToken, chatController.clearChatHistory);

// Admin: Get chat history by user ID
router.get('/admin/users/:userId/chats', verifyToken, chatController.getChatHistoryByUser);


// 
router.post('/auth/google', authController.googleLogin);

// --- DOCUMENT ROUTES ---
// Upload Flow
router.post('/documents/request-upload', docController.requestUpload);
router.post('/documents/upload-complete', verifyToken, docController.uploadComplete);

// Webhook (N8N)
router.post('/webhooks/n8n/update', docController.n8nWebhook);

// Document Management
router.get('/documentsList', verifyToken, docController.getDocuments);
router.get('/documents/:id/view', docController.viewDocument);
router.put('/documents/:id/share', verifyToken, docController.shareDocument);
router.delete('/documentsfile/:id', verifyToken, docController.deleteDocument);
router.put('/documents/:id/reclassify', verifyToken, docController.reclassifyDocument);

// --- USER ROUTES (ADMIN) ---
router.post('/users', verifyToken, userController.createUser);
router.get('/users', verifyToken, userController.getUsers);
router.delete('/users/:email', verifyToken, userController.deleteUser);
router.put('/users/:email', verifyToken, userController.updateUser);

// --- DEPARTMENT ROUTES ---
router.get('/departments', departmentController.getDepartments);

// --- HEALTH CHECK ---
router.get('/', (req, res) => res.json({ message: 'Backend is running!' }));

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'RAG Chatbot API'
  });
});

module.exports = router;

