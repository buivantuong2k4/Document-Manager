
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { pool, s3 } = require('../config/clients');
const MailController = require('./MailController');
const classificationService = require('../services/classificationService');
const path = require('path');

// Normalize incoming filetype or filename to simple extensions n8n expects
const normalizeFileType = (filetype, storagePath, filename) => {
  const allowed = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']);

  // Try to derive from MIME like 'application/pdf' or 'application/vnd.openxmlformats-...'
  if (filetype && typeof filetype === 'string' && filetype.includes('/')) {
    const subtype = filetype.split('/')[1].split('+')[0].toLowerCase();
    const mimeMap = {
      'pdf': 'pdf',
      'msword': 'doc',
      'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'vnd.ms-excel': 'xls',
      'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'plain': 'txt',
      'text': 'txt',
      'octet-stream': 'txt'
    };
    if (mimeMap[subtype]) return mimeMap[subtype];
  }

  // If MIME didn't help, try file extension from filename or storagePath
  const candidate = (filename || storagePath || '').toLowerCase();
  const ext = path.extname(candidate).replace('.', '');
  if (ext && allowed.has(ext)) return ext;

  // If nothing matches, fallback to 'txt' so n8n receives a safe, processable type
  return 'txt';
};

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// 1. Request Upload
exports.requestUpload = async (req, res) => {
  console.log("Data received:", req.body);
  const { filename, filetype } = req.body;
  if (!filename || !filetype) return res.status(400).json({ error: 'Missing filename or filetype' });

  const documentId = uuidv4();
  const storagePath = `uploads/${documentId}-${filename}`;

  try {
    await pool.query(
      'INSERT INTO documentsfile (id, filename, storage_path, status, filetype) VALUES ($1, $2, $3, $4, $5)',
      [documentId, filename, storagePath, 'UPLOADING', filetype]
    );

    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storagePath,
      Expires: 60 * 5,
      ContentType: filetype,
    });

    res.json({ documentId, uploadUrl });
  } catch (error) {
    console.error('Error requesting upload:', error);
    res.status(500).json({ error: 'Failed to create pre-signed URL' });
  }
};

// 2. Upload Complete
exports.uploadComplete = async (req, res) => {
  const { documentId } = req.body;
  const { email, department } = req.user;
  if (!documentId) return res.status(400).json({ error: 'Missing documentId' });

  try {
    const dbResult = await pool.query(
      `UPDATE documentsfile SET status = 'PENDING', uploaded_by_email = $1, shared_department = $2 WHERE id = $3 RETURNING storage_path, filetype, filename`,
      [email, department, documentId]
    );

    if (dbResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    const { storage_path, filetype, filename } = dbResult.rows[0];
    const tempReadUrl_FromMinIO = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storage_path,
      Expires: 60 * 15,
    });

    const tempReadUrl_ForN8N = tempReadUrl_FromMinIO.replace(
      process.env.MINIO_ENDPOINT,
      process.env.PUBLIC_MINIO_URL
    );

    if (N8N_WEBHOOK_URL) {
      const normalizedType = normalizeFileType(filetype, storage_path, filename);
      await axios.post(N8N_WEBHOOK_URL, { document_id: documentId, temp_read_url: tempReadUrl_ForN8N, filetype: normalizedType });
    }

    res.json({ message: 'Upload complete, processing started.' });
  } catch (error) {
    console.error('Error completing upload:', error);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
};

// 3. Get List Documents
exports.getDocuments = async (req, res) => {
  try {
    const { email, role, department } = req.user;
    let query, params;

    if (role === 'ADMIN') {
      query = 'SELECT * FROM documentsfile ORDER BY created_at DESC';
      params = [];
    } else {
      query = `SELECT * FROM documentsfile WHERE uploaded_by_email = $1 OR shared_department = $2 ORDER BY created_at DESC`;
      params = [email, department];
    }

    const dbResult = await pool.query(query, params);
    res.json(dbResult.rows);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
};

// 4. View Document
exports.viewDocument = async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT storage_path, filename, filetype FROM documentsfile WHERE id = $1', [req.params.id]);
    if (dbResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    const { storage_path, filename, filetype } = dbResult.rows[0];
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: storage_path,
      Expires: 60 * 5,
      ResponseContentDisposition: `inline; filename="${filename}"`,
      ResponseContentType: filetype || 'application/pdf'
    });
    res.json({ viewUrl: url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate view link' });
  }
};

// 5. N8N Webhook Handler
exports.n8nWebhook = async (req, res) => {
  console.log("Webhook from n8n:", req.body);
  const { document_id, classification, gdpr_analysis } = req.body;
  if (!document_id) return res.status(400).json({ error: 'Missing document_id' });

  const io = req.app.get('socketio'); // Lấy socket từ app

  try {
    const docResult = await pool.query('SELECT * FROM documentsfile WHERE id = $1', [document_id]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    const oldKey = docResult.rows[0].storage_path;
    let targetFolder = 'others/';
    let autoShareDept = 'NONE';

    if (gdpr_analysis && gdpr_analysis.has_pii) {
        targetFolder = 'secure/restricted/';
        autoShareDept = 'NONE';
    } else if (classification) {
        const type = classification.toLowerCase();
        const cleanClass = type.replace(/\s+/g, '_');
        targetFolder = `departments/${cleanClass}/`;
        
        // Use classificationService to find matching department
        autoShareDept = await classificationService.findDepartmentByClassification(classification);
    }

    const newKey = targetFolder + oldKey.split('/').pop();

    if (!oldKey.startsWith(targetFolder)) {
        await s3.copyObject({
            Bucket: process.env.S3_BUCKET_NAME,
            CopySource: encodeURI(`/${process.env.S3_BUCKET_NAME}/${oldKey}`),
            Key: newKey
        }).promise();
        await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: oldKey }).promise();
    }

    const updateResult = await pool.query(
        `UPDATE documentsfile SET status = 'PROCESSED', classification = $1, gdpr_analysis = $2, storage_path = $3, shared_department = $4, processed_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
        [classification, gdpr_analysis, newKey, autoShareDept, document_id]
    );

    if (io) io.emit('document:processed', updateResult.rows[0]);

    // Prepare and send notification emails to department members (fire-and-forget)
    try {
      const docRow = updateResult.rows[0];
      const filename = docRow.filename || oldKey.split('/').pop();
      const filetype = docRow.filetype || 'application/pdf';

      // Generate a view link (signed URL) for the document valid for 1 hour
      const viewUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: newKey,
        Expires: 60 * 60,
        ResponseContentDisposition: `inline; filename="${filename}"`,
        ResponseContentType: filetype || 'application/pdf'
      });

      const subject = `Tài liệu mới được chia sẻ: ${filename}`;
      const text = `Tài liệu "${filename}" đã được phân loại là "${classification}" và được chia sẻ tới phòng ban ${autoShareDept}.\nXem tài liệu: ${viewUrl}`;
      const html = `<p>Tài liệu "<strong>${filename}</strong>" đã được phân loại là "<strong>${classification}</strong>" và được chia sẻ tới phòng ban <strong>${autoShareDept}</strong>.</p><p><a href=\"${viewUrl}\" target=\"_blank\">Click để xem tài liệu</a></p>`;

      if (autoShareDept && autoShareDept !== 'NONE') {
        if (autoShareDept === 'PUBLIC') {
          // send to all users
          MailController.sendToAll(pool, subject, text, html).catch(err => console.error('Mail send error:', err));
        } else {
          MailController.sendToDepartment(pool, autoShareDept, subject, text, html).catch(err => console.error('Mail send error:', err));
        }
      }
    } catch (mailErr) {
      console.error('Error preparing/sending notification emails:', mailErr);
    }

    res.json({ success: true, new_path: newKey, auto_shared_to: autoShareDept });

  } catch (error) {
    console.error('Error webhook:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
};

// 6. Share Document
exports.shareDocument = async (req, res) => {
    const { id } = req.params;
    const { target_department } = req.body;
    const { email, role } = req.user;

    try {
        const docCheck = await pool.query('SELECT * FROM documentsfile WHERE id = $1', [id]);
        if (docCheck.rows.length === 0) return res.status(404).json({ error: "Not found" });
        
        const doc = docCheck.rows[0];
        if (doc.uploaded_by_email !== email && role !== 'ADMIN') {
            return res.status(403).json({ error: "Không có quyền" });
        }

        await pool.query('UPDATE documentsfile SET shared_department = $1 WHERE id = $2', [target_department, id]);
        // Send notification emails to the target department (fire-and-forget)
        try {
          const filename = doc.filename || doc.storage_path.split('/').pop();
          const filetype = doc.filetype || 'application/pdf';
          const viewUrl = await s3.getSignedUrlPromise('getObject', {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: doc.storage_path,
            Expires: 60 * 60,
            ResponseContentDisposition: `inline; filename="${filename}"`,
            ResponseContentType: filetype
          });

          const subject = `Tài liệu được chia sẻ: ${filename}`;
          const text = `Tài liệu "${filename}" đã được chia sẻ tới phòng ban ${target_department}.\nXem tài liệu: ${viewUrl}`;
          const html = `<p>Tài liệu "<strong>${filename}</strong>" đã được chia sẻ tới phòng ban <strong>${target_department}</strong>.</p><p><a href=\"${viewUrl}\" target=\"_blank\">Click để xem tài liệu</a></p>`;

          if (target_department === 'PUBLIC') {
            MailController.sendToAll(pool, subject, text, html).catch(err => console.error('Mail send error:', err));
          } else if (target_department && target_department !== 'NONE') {
            MailController.sendToDepartment(pool, target_department, subject, text, html).catch(err => console.error('Mail send error:', err));
          }
        } catch (mailErr) {
          console.error('Error preparing/sending share emails:', mailErr);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
};

// 7. Delete Document
exports.deleteDocument = async (req, res) => {
    const { id } = req.params;
    const { email, role } = req.user;
    try {
        const docResult = await pool.query('SELECT * FROM documentsfile WHERE id = $1', [id]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: "Not found" });
        const doc = docResult.rows[0];

        if (role !== 'ADMIN' && doc.uploaded_by_email !== email) return res.status(403).json({ error: "Không có quyền" });

        await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: doc.storage_path }).promise();
        await pool.query('DELETE FROM documentsfile WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
};

// 8. Reclassify (Admin)
exports.reclassifyDocument = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Chỉ Admin" });
    const { id } = req.params;
    const { new_classification } = req.body;

    try {
        const docCheck = await pool.query('SELECT * FROM documentsfile WHERE id = $1', [id]);
        if (docCheck.rows.length === 0) return res.status(404).json({ error: "Not found" });
        
        const oldKey = docCheck.rows[0].storage_path;
        const type = new_classification.toLowerCase();
        let targetFolder = `departments/${type}/`;
        
        // Use classificationService to find matching department
        const newSharedDept = await classificationService.findDepartmentByClassification(new_classification);
        
        const newKey = targetFolder + oldKey.split('/').pop();

        if (newKey !== oldKey) {
             await s3.copyObject({
                Bucket: process.env.S3_BUCKET_NAME,
                CopySource: encodeURI(`/${process.env.S3_BUCKET_NAME}/${oldKey}`),
                Key: newKey
            }).promise();
            await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: oldKey }).promise();
        }

        await pool.query(
            'UPDATE documentsfile SET classification = $1, shared_department = $2, storage_path = $3 WHERE id = $4',
            [new_classification, newSharedDept, newKey, id]
        );
          // Send notification emails to the newSharedDept (fire-and-forget)
          try {
            const filename = docCheck.rows[0].filename || oldKey.split('/').pop();
            const filetype = docCheck.rows[0].filetype || 'application/pdf';
            const viewUrl = await s3.getSignedUrlPromise('getObject', {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: newKey,
              Expires: 60 * 60,
              ResponseContentDisposition: `inline; filename="${filename}"`,
              ResponseContentType: filetype
            });

            const subject = `Tài liệu đã được phân loại lại: ${filename}`;
            const text = `Tài liệu "${filename}" đã được phân loại lại thành "${new_classification}" và được chia sẻ tới phòng ban ${newSharedDept}.\nXem tài liệu: ${viewUrl}`;
            const html = `<p>Tài liệu "<strong>${filename}</strong>" đã được phân loại lại thành "<strong>${new_classification}</strong>" và được chia sẻ tới phòng ban <strong>${newSharedDept}</strong>.</p><p><a href=\"${viewUrl}\" target=\"_blank\">Click để xem tài liệu</a></p>`;

            if (newSharedDept === 'PUBLIC') {
              MailController.sendToAll(pool, subject, text, html).catch(err => console.error('Mail send error:', err));
            } else if (newSharedDept && newSharedDept !== 'NONE') {
              MailController.sendToDepartment(pool, newSharedDept, subject, text, html).catch(err => console.error('Mail send error:', err));
            }
          } catch (mailErr) {
            console.error('Error preparing/sending reclassify emails:', mailErr);
          }

          res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
};