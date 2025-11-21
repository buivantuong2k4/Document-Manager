const jwt = require('jsonwebtoken');
const { pool, googleClient } = require('../config/clients');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "secret_tam_thoi";

exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const { email, name, picture } = ticket.getPayload();

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'Email này chưa được cấp quyền truy cập.' });
    }

    let user = userResult.rows[0];
    // Update avatar/name mới nhất
    await pool.query('UPDATE users SET full_name = $1, avatar_url = $2 WHERE email = $3', [name, picture, email]);

    const appToken = jwt.sign(
      { email: user.email, role: user.role, department: user.department },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: appToken,
      user: { email: user.email, full_name: name, role: user.role, department: user.department, avatar: picture }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Xác thực thất bại" });
  }
};