// services/driveService.js
const { drive } = require("../config/google");
const { Readable } = require("stream");
const axios = require("axios");
const pool = require("../config/database"); // PostgreSQL client
const { s3 } = require("../config/clients");

const BUCKET_NAME = process.env.BUCKET_NAME;
/**
 * Lấy danh sách file trong folder
 * @param {string} folderId 
 * @param {number} limit 
 */

/**
 * Tải file về dưới dạng buffer
 * @param {string} fileId 
 */
async function downloadFile(fileId) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}

/**
 * Upload PDF đã ký lên MinIO và lưu metadata vào PostgreSQL
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} ownerEmail
 */
async function uploadSignedPDFToMinio(buffer, fileName, ownerEmail) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "application/pdf",
      Metadata: {
        owner: ownerEmail || "unknown",
      },
    };

    const result = await s3.upload(params).promise();
    console.log("✅ File uploaded to MinIO:", result.Location);

    return result; // trả về thông tin file MinIO
  } catch (err) {
    console.error("❌ Error uploading file to MinIO:", err);
    throw err;
  }
}

/**
 * Kiểm tra file mới trong PostgreSQL (chưa gửi n8n), lấy từ MinIO và gửi sang n8n
 */
async function checkLatestFile() {
  try {
    // Lấy các file chưa gửi n8n
    const { rows: files } = await pool.query(
      `SELECT * FROM file_contract WHERE sent_to_n8n = false ORDER BY upload_date ASC`
    );

    if (!files.length) {
      console.log("⏳ Không có file mới để gửi n8n.");
      return;
    }
    const newFiles = files; // hoặc lọc thêm nếu muốn
    for (const f of files) {
      console.log("📥 File mới phát hiện:", f.file_name);

      // Lấy file từ MinIO
      const s3Object = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: f.minio_path,
      }).promise();

      const buffer = s3Object.Body; // Đây là Buffer
      const contentBase64 = buffer.toString("base64"); // Chuyển sang base64

      // Gửi file sang n8n
      await axios.post(process.env.N8N_WEBHOOK_URL1, {
        fileId: f.id,
        fileName: f.file_name,
        mimeType: "application/pdf",
        content: contentBase64, // gửi base64 chứ không phải object
        ownerEmail: f.owner_email
      });

      console.log("➡️ Đã gửi sang n8n:", f.file_name);

      await pool.query(`UPDATE file_contract SET sent_to_n8n = true WHERE id = $1`, [f.id]);
    }


  } catch (err) {
    console.error("❌ Error in checkLatestFile:", err);
  }
}

// Chạy ngay lần đầu
checkLatestFile();

// Chạy định kỳ mỗi 20 giây
setInterval(checkLatestFile, 20 * 1000);


module.exports = { uploadSignedPDFToMinio, downloadFile, checkLatestFile };
