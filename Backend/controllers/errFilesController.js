const { validate: isUUID } = require('uuid');
const axios = require('axios');
const db = require('../config/database');
const { checkDocumentError } = require('../services/errorCheck');

/**
 * GET /api/files
 * FE: lấy danh sách document
 */
exports.getFiles = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, filename, status, created_at
       FROM documentsfile
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/files/:id/status
 * FE: xem trạng thái + kết quả xử lý
 */
exports.getFileStatus = async (req, res) => {
  const { id } = req.params;

  if (!isUUID(id)) {
    return res.status(400).json({ error: 'Invalid document id format' });
  }

  try {
    const result = await db.query(
      `SELECT *
       FROM documentsfile
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];
    const checkResult = checkDocumentError(document);

    res.json({
      documentId: id,
      ...checkResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/files/:id/process
 * Backend: gửi document sang n8n để OCR
 */
exports.processFile = async (req, res) => {
  const { id } = req.params;

  if (!isUUID(id)) {
    return res.status(400).json({ error: 'Invalid document id format' });
  }

  try {
    // 1. Update trạng thái
    await db.query(
      `UPDATE documentsfile
       SET status = 'PROCESSING'
       WHERE id = $1`,
      [id]
    );

    // 2. Gọi n8n webhook
    await axios.post(process.env.N8N_OCR_WEBHOOK, {
      documentId: id
    });

    // 3. Trả về FE
    res.json({
      message: 'Document sent to n8n',
      status: 'PROCESSING'
    });
  } catch (err) {
    console.error('PROCESS ERROR:', err.message);
    console.error(err);
    res.status(500).json({
      error: 'Process failed',
      detail: err.message
    });
  }
};

/**
 * POST /api/files/:id/callback
 * n8n gọi về sau khi OCR xong
 */
exports.fileCallback = async (req, res) => {
  const { id } = req.params;
  const { ocr_status, ocr_text } = req.body;

  if (!isUUID(id)) {
    return res.status(400).json({ error: 'Invalid document id format' });
  }

  try {
    // ===== OCR FAILED =====
    if (ocr_status !== 'SUCCESS') {
      await db.query(
        `UPDATE documentsfile
         SET status = 'ERROR',
             classification = NULL,
             gdpr_analysis = 'OCR failed',
             processed_at = NOW()
         WHERE id = $1`,
        [id]
      );

      return res.json({ status: 'ERROR' });
    }

    // ===== OCR SUCCESS =====
    let classification = 'PUBLIC';
    let gdpr_analysis = 'No personal data';

    if (ocr_text && ocr_text.includes('CMND')) {
      classification = 'CONFIDENTIAL';
      gdpr_analysis = 'Contains personal data';
    }

    await db.query(
      `UPDATE documentsfile
       SET status = 'DONE',
           classification = $1,
           gdpr_analysis = $2,
           processed_at = NOW()
       WHERE id = $3`,
      [classification, gdpr_analysis, id]
    );

    return res.json({ status: 'DONE' });
  } catch (err) {
    console.error('CALLBACK ERROR:', err.message);
    console.error(err);
    return res.status(500).json({
      error: 'Callback failed',
      detail: err.message
    });
  }
};
