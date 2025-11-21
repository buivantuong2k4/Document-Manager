require('dotenv').config();
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const { OAuth2Client } = require('google-auth-library');

// 1. Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. MinIO / S3
const s3 = new AWS.S3({
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  s3ForcePathStyle: true,
});

// 3. Google Auth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = { pool, s3, googleClient };