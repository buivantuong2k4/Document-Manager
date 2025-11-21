const { pool } = require('../config/clients');

exports.createUser = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Chỉ Admin" });
  const { email, full_name, department, role } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (email, full_name, department, role) VALUES ($1, $2, $3, $4)',
      [email, full_name, department, role || 'EMPLOYEE']
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Email đã tồn tại!" });
  }
};

exports.getUsers = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).send();
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
};