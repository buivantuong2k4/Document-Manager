// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  // Lấy token từ header "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Bạn chưa đăng nhập!" });
  }

  try {
    // Giải mã token bằng mã bí mật
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // Gán thông tin user vào biến req để dùng ở bước sau
    next(); // Cho phép đi tiếp
  } catch (err) {
    return res.status(403).json({ error: "Phiên đăng nhập hết hạn. Hãy F5 lại." });
  }
};

module.exports = verifyToken;