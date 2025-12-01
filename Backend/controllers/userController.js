const { pool } = require('../config/clients');

exports.createUser = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Chỉ Admin" });
  const { email, full_name, department, role } = req.body;
  try {
    // Get department_id from department name
    let department_id = null;
    if (department) {
      const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      if (deptResult.rows.length === 0) {
        return res.status(400).json({ error: "Phòng ban không tồn tại" });
      }
      department_id = deptResult.rows[0].id;
    }

    await pool.query(
      'INSERT INTO users (email, full_name, department_id, role) VALUES ($1, $2, $3, $4)',
      [email, full_name, department_id, role || 'EMPLOYEE']
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Email đã tồn tại!" });
  }
};

exports.getUsers = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).send();
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.created_at, d.name as department, u.department_id
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ORDER BY u.email`
  );
  res.json(result.rows);
};

exports.deleteUser = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Chỉ Admin" });
  const { email } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE email = $1 RETURNING *', [email]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.updateUser = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Chỉ Admin" });
  const { email } = req.params;
  const { department, full_name, role } = req.body;
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (department) {
      const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      if (deptResult.rows.length === 0) {
        return res.status(400).json({ error: "Phòng ban không tồn tại" });
      }
      const department_id = deptResult.rows[0].id;
      updates.push(`department_id = $${paramCount++}`);
      values.push(department_id);
    }
    if (full_name) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu để cập nhật' });
    }
    
    values.push(email);
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE email = $${paramCount}`;
    const updateResult = await pool.query(updateQuery, values);
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    
    // Fetch updated user with denormalized department name
    const selectQuery = `SELECT u.id, u.email, u.full_name, u.role, u.created_at, d.name as department, u.department_id
                         FROM users u
                         LEFT JOIN departments d ON u.department_id = d.id
                         WHERE u.email = $1`;
    const selectResult = await pool.query(selectQuery, [email]);
    
    res.json({ success: true, user: selectResult.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};