const { sheets, oauth2Client } = require('../config/google');

const { s3 } = require("../config/clients");
const pool = require("../config/database");

async function getSignatureAndEmail(fullName) {
  try {
    // 1. Lấy dữ liệu từ PostgreSQL
    const res = await pool.query(
      "SELECT email, url, file_name, mime_type FROM image_sign WHERE full_name = $1 ORDER BY created_at DESC LIMIT 1",
      [fullName]
    );

    if (res.rows.length === 0) {
      return { signature: '', email: '' };
    }

    const row = res.rows[0];

    // 2. Lấy file từ MinIO dưới dạng Buffer
    const fileObj = await s3.getObject({
      Bucket: process.env.BUCKET_NAME,
      Key: row.url
    }).promise();

    // 3. Chuyển Buffer sang Base64
    const signatureBase64 = `data:${row.mime_type};base64,${fileObj.Body.toString('base64')}`;

    return {
      signature: signatureBase64,
      email: row.email
    };
  } catch (err) {
    console.error("Error fetching signature:", err);
    return { signature: '', email: '' };
  }
}

module.exports = { getSignatureAndEmail };
