const express = require("express");
const { drive } = require("../config/google");
const { sendSignEmail } = require("../services/emailService");
const { sendDeclineEmail } = require("../services/emailService");
const { sendEmail } = require("../services/emailService");
const { s3 } = require("../config/clients");
const pool = require("../config/database");
const axios = require("axios");

const { fileMapping } = require('../utils/fileMapping').default;
const { sendConfirmationToN8N } = require("../services/n8nService");
const { uploadSignedPDFToMinio } = require("../services/driveService");
const { sendSignedEmail } = require("../services/emailService");



function getPresignedUrl(key) {
  return s3.getSignedUrl('getObject', {
    Bucket: 'ai-documents-local',
    Key: key,
    Expires: 60 * 60 // 1 giờ
  });
}



exports.confirmSign = async (req, res) => {
  const { fileId, user, confirm } = req.query;

  // Trường hợp từ chối ký (confirm !== 'yes')
  if (confirm !== 'yes') {
    try {
      // Cập nhật trạng thái declined
      await pool.query(
        "UPDATE file_contract SET status = 'declined' WHERE id = $1",
        [fileId]
      );

      return res.json({
        message: 'Bạn đã hủy ký file.',
        fileId,
        showResendButton: true,
      });
    } catch (error) {
      console.error('Database Error:', error);
      return res.status(500).json({ message: 'Lỗi cơ sở dữ liệu' });
    }
  }

  // Trường hợp đồng ý ký
  const fileMeta = fileMapping[fileId];
  // if (!fileMeta) return res.status(404).send('<p>❌ File không tìm thấy.</p>');

  try {
    await sendConfirmationToN8N(fileMeta, user);
    res.send('<p>✅ Bạn đã xác nhận ký file thành công!</p>');
  } catch (err) {
    console.error('❌ Lỗi gửi dữ liệu đến n8n:', err.message);
    res.status(500).send('<p>❌ Lỗi gửi dữ liệu đến n8n.</p>');
  }
};


// --- 1. UPLOAD FILE DOCUMENT ---
exports.uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const rawFileName = req.file.originalname;
    const encodedFileName = encodeURIComponent(rawFileName);
    const folderPath = "SIGNCONTACTS/FILEUPLOAD/";
    const minioKey = folderPath + encodedFileName;

    console.log(`📤 Uploading file: ${rawFileName}`);

    // Upload lên MinIO/S3
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: minioKey,
      Body: req.file.buffer,
    };
    await s3.upload(params).promise();
    console.log(`✅ File uploaded to MinIO: ${minioKey}`);

    const utf8FileName = Buffer.from(rawFileName, "latin1").toString("utf-8");

    // Lưu DB
    const query = `
      INSERT INTO file_contract (file_name, minio_path, owner_email, size, upload_date, status, signer_name)
      VALUES ($1, $2, $3, $4, NOW(), $5, '')
      RETURNING *;
    `;
    const values = [
      utf8FileName,
      minioKey,
      req.body.owner_email || "tuongbv.22it@vku.udn.vn",
      req.file.size,
      "pending",
    ];

    console.log(`📊 Executing DB query with values:`, values);
    const result = await pool.query(query, values);
    console.log(`✅ DB query successful`);

    res.json({
      message: "File uploaded successfully",
      file: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    console.error("Error code:", err.code);
    console.error("Full error:", err);
    res.status(500).json({ error: "Failed to upload file", details: err.message });
  }
};

// --- 2. UPLOAD HÌNH ẢNH CHỮ KÝ ---
exports.uploadSignature = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const imageFile = req.file;

    if (!full_name || !email || !imageFile) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    const encodedFileName = encodeURIComponent(imageFile.originalname);
    const folderPath = "SIGNCONTACTS/SIGNER/";
    const minioKey = folderPath + encodedFileName;

    // Upload lên MinIO
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: minioKey,
      Body: imageFile.buffer,
      ContentType: imageFile.mimetype,
    };
    await s3.upload(params).promise();

    // 🔍 Kiểm tra xem người ký đã tồn tại chưa
    const existing = await pool.query(
      "SELECT id FROM image_sign WHERE email = $1",
      [email]
    );

    let dbResult;
    if (existing.rows.length > 0) {
      // ✏️ UPDATE nếu đã tồn tại
      const id = existing.rows[0].id;
      dbResult = await pool.query(
        `UPDATE image_sign
         SET file_name = $1, mime_type = $2, url = $3, size = $4, full_name = $5
         WHERE id = $6 RETURNING *;`,
        [imageFile.originalname, imageFile.mimetype, minioKey, imageFile.size, full_name, id]
      );
      res.json({ message: "Cập nhật chữ ký thành công", id: dbResult.rows[0].id });
    } else {
      // ➕ INSERT nếu chưa tồn tại
      dbResult = await pool.query(
        `INSERT INTO image_sign (file_name, mime_type, url, size, full_name, email)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *;`,
        [imageFile.originalname, imageFile.mimetype, minioKey, imageFile.size, full_name, email]
      );
      res.json({ message: "Tạo chữ ký mới thành công", id: dbResult.rows[0].id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- 3. GET LIST FILES ---
exports.getListFiles = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id, 
        f.file_name, 
        f.minio_path, 
        f.owner_email, 
        f.size, 
        f.upload_date, 
        f.status,
        json_agg(
          json_build_object(
            'full_name', s.signer_full_name,
            'email', s.signer_email
          )
        ) AS signers
      FROM file_contract f
      LEFT JOIN file_contract_signers s
        ON f.id = s.contract_id
      GROUP BY f.id
      ORDER BY f.upload_date DESC
      LIMIT 20;
    `;

    const result = await pool.query(query);

    const files = result.rows.map(f => ({
      ...f,
      showResendButton: f.status === 'declined'
    }));

    res.json(files);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files from PostgreSQL" });
  }
};

// --- 4. GET IMAGE SIGNED FILES ---
exports.getImageSignedFiles = async (req, res) => {
  try {
    const query = `
      SELECT id, file_name, full_name, email, url
      FROM image_sign ORDER BY created_at DESC LIMIT 20;
    `;
    const result = await pool.query(query);
    console.log("📋 getImageSignedFiles - Database records:", result.rows.length, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ getImageSignedFiles error:", err.message);
    res.status(500).json({ error: "Failed to fetch signatures" });
  }
};

// --- 5. PREVIEW IMAGE (STREAM) ---
exports.previewImage = async (req, res) => {
  const { id } = req.params;
  console.log(`🖼️ previewImage request - ID: ${id}`);
  try {
    const result = await pool.query("SELECT url, mime_type FROM image_sign WHERE id = $1", [id]);
    console.log(`   Database result:`, result.rows[0]);
    if (!result.rows[0]) {
      console.warn(`   ❌ No record found for id ${id}`);
      return res.status(404).json({ error: "File not found in database" });
    }

    const { url, mime_type } = result.rows[0];
    console.log(`   Fetching from MinIO: Bucket=${process.env.BUCKET_NAME}, Key=${url}`);
    
    const stream = s3.getObject({
      Bucket: process.env.BUCKET_NAME,
      Key: url,
    }).createReadStream();

    // Handle stream errors
    stream.on('error', (err) => {
      console.error("❌ Stream error:", err.code, err.message);
      if (err.code === 'NoSuchKey') {
        return res.status(404).json({ error: "File not found in MinIO", key: url });
      }
      res.status(500).json({ error: "Error streaming file" });
    });

    res.setHeader("Content-Type", mime_type || "image/png");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    stream.pipe(res);
  } catch (err) {
    console.error("❌ Preview image error:", err.message);
    res.status(500).json({ error: "Error fetching image" });
  }
};

// --- 6. PREVIEW FILE DOC (STREAM) ---
exports.previewFile = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await pool.query(
      "SELECT minio_path, file_name FROM file_contract WHERE id = $1",
      [id]
    );

    if (!file.rows[0]) return res.status(404).json({ error: "File not found in database" });

    const { minio_path, file_name } = file.rows[0];
    const safeFileName = encodeURIComponent(file_name);

    const s3Stream = s3.getObject({
      Bucket: process.env.BUCKET_NAME,
      Key: minio_path,
    }).createReadStream();

    // Handle stream errors
    s3Stream.on('error', (err) => {
      console.error("❌ Stream error:", err.code);
      if (err.code === 'NoSuchKey') {
        return res.status(404).json({ error: "File not found in MinIO", key: minio_path });
      }
      res.status(500).json({ error: "Error streaming file" });
    });

    // Set proper content type for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${safeFileName}`);
    s3Stream.pipe(res);
  } catch (err) {
    console.error("❌ Preview file error:", err.message);
    res.status(500).json({ error: "Error fetching file" });
  }
};

// --- 7. GET SIGNED FILES ---
exports.getSignedFiles = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id, 
        f.file_name, 
        f.minio_path, 
        f.owner_email, 
        f.size, 
        f.upload_date, 
        f.status,
        json_agg(
          json_build_object(
            'full_name', s.signer_full_name,
            'email', s.signer_email
          )
        ) AS signers
      FROM file_contract f
      LEFT JOIN file_contract_signers s
        ON f.id = s.contract_id
      WHERE f.status = 'signed'
      GROUP BY f.id
      ORDER BY f.upload_date DESC
      LIMIT 20;
    `;

    const result = await pool.query(query);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files from PostgreSQL" });
  }
};

// --- 8. SEND EMAIL REQUEST SIGN ---
exports.sendEmailRequest = async (req, res) => {
  try {
    let { fileName, content, annotations, fullName, fileId } = req.body;

    // Ép luôn thành mảng
    if (typeof fullName === "string") fullName = [fullName];

    const parsedAnnotations = JSON.parse(annotations);
    const signerList = [];

    // Gửi email từng người
    for (const person of fullName) {
      const { signature, email } = await sendSignEmail({
        fileName,
        contentBase64: content,
        fullName: person,
        fileId
      });

      signerList.push({
        fullName: person,
        email,
        signature, 
        annotations: parsedAnnotations.filter(a => a.full_name === person),
        confirmed: false
      });
    }

    // Không ghi đè — chỉ ghi 1 lần
    fileMapping[fileId] = {
      fileId,
      fileName,
      content,
      signerList
    };

    res.json({
      status: "ok",
      fileId,
      signerList
    });

  } catch (err) {
    console.error("❌ send-email error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// --- 9. SEND EMAIL NO SIGN (JUST APPROVE) ---
exports.sendEmailNoSigned = async (req, res) => {
  try {
    const { fileName, content, fullName, fileId } = req.body;
    if (!fileName || !content || !fullName || !fileId) {
      return res.status(400).json({ error: "Missing file data" });
    }

    const { signature, email } = await sendEmail({ fileName, contentBase64: content, fullName, fileId });

    await pool.query("UPDATE file_contract SET status = 'signed' WHERE id = $1", [fileId]);

    res.json({ status: "ok", fileName, fullName, signature, email, content });
  } catch (err) {
    console.error("❌ Error send-email:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// --- 10. RESEND FILE (TO N8N) ---
exports.resendFile = async (req, res) => {
  const fileId = req.params.id;

  try {
    // Lấy file trong DB
    const { rows } = await pool.query(
      `SELECT * FROM file_contract WHERE id = $1`,
      [fileId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy file." });
    }

    const f = rows[0];

    if (!f.minio_path) {
      return res.status(400).json({ message: "File chưa được lưu trong MinIO." });
    }

    // Lấy file từ MinIO
    try {
      const s3Object = await s3
        .getObject({
          Bucket: process.env.BUCKET_NAME,
          Key: f.minio_path,
        })
        .promise();

      const buffer = s3Object.Body;
      const base64 = buffer.toString("base64");

      // Gửi sang n8n
      await axios.post(process.env.N8N_WEBHOOK_URL1, {
        fileId: f.id,
        fileName: f.file_name,
        mimeType: "application/pdf",
        content: base64,
        ownerEmail: f.owner_email
      });

      // Cập nhật trạng thái
      await pool.query(
        `UPDATE file_contract SET sent_to_n8n = true WHERE id = $1`,
        [fileId]
      );

      res.json({ message: "Đã gửi file sang n8n thành công!" });
    } catch (s3Error) {
      if (s3Error.code === 'NoSuchKey') {
        console.error("❌ File không tồn tại trong MinIO:", f.minio_path);
        return res.status(404).json({ 
          message: "File không tồn tại trong MinIO. Hãy upload lại file.",
          minioPath: f.minio_path
        });
      }
      throw s3Error;
    }
  } catch (error) {
    console.error("❌ Lỗi resend file:", error.message);
    res.status(500).json({ message: "Lỗi khi gửi lại file." });
  }
};


// --- Helper: Get Presigned URL (để nội bộ trong controller) ---
function getPresignedUrl(key) {
  return s3.getSignedUrl('getObject', {
    Bucket: 'file-contract',
    Key: key,
    Expires: 60 * 60 // 1 giờ
  });
}


// --- 11. WEBHOOK: PROCESS SIGNED FILE (FROM N8N/EXTERNAL) ---
exports.processSignedWebhook = async (req, res) => {
  try {
    const { fileId, url, filename, emails, fullnames } = req.body;

    if (!fileId || !url || !filename || !emails || !fullnames) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // Tải PDF
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // Upload MinIO vào thư mục CONTRACTSIGNED
    const encodedFileName = encodeURIComponent(filename);
    const folderPath = "SIGNCONTACTS/CONTRACTSIGNED/";
    const minioKey = folderPath + encodedFileName;
    
    const result = await uploadSignedPDFToMinio(buffer, filename);
    // Override kết quả để lưu vào đúng folder
    const finalKey = minioKey;
    
    // Upload file signed vào folder CONTRACTSIGNED
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: finalKey,
      Body: buffer,
    };
    await s3.upload(params).promise();
    
    const fileLink = getPresignedUrl(finalKey);

    // Update file_contract
    await pool.query(
      `UPDATE file_contract
       SET status = 'signed', upload_date = NOW(), minio_path = $2
       WHERE id = $1`,
      [fileId, finalKey]
    );

    // LƯU NGƯỜI KÝ VÀO BẢNG file_contract_signers
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const fullname = fullnames[i];

      const exists = await pool.query(
        `SELECT id FROM file_contract_signers
         WHERE contract_id = $1 AND signer_email = $2`,
        [fileId, email]
      );

      if (exists.rows.length > 0) {
        await pool.query(
          `UPDATE file_contract_signers
           SET signer_full_name = $3
           WHERE contract_id = $1 AND signer_email = $2`,
          [fileId, email, fullname]
        );
      } else {
        await pool.query(
          `INSERT INTO file_contract_signers
            (contract_id, signer_full_name, signer_email)
           VALUES ($1, $2, $3)`,
          [fileId, fullname, email]
        );
      }
    }

    // Gửi email người ký
    for (const email of emails) {
      try {
        await sendSignedEmail(email, filename, fileLink);
      } catch (err) {
        console.error("Email failed:", err);
      }
    }

    return res.json({
      success: true,
      message: "Done!",
      fileId,
      emails,
      fullnames
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};


// Export tất cả functions để routes/index.js sử dụng
module.exports = exports;