const { pool } = require('../config/clients');

exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, allowed_document_types FROM departments ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};
