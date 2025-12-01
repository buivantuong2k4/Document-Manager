const { pool } = require('../config/clients');

/**
 * Find the best matching department for a given classification
 * @param {string} classification - The document classification (e.g., "hóa đơn", "hợp đồng")
 * @returns {Promise<string>} - Department name or 'PUBLIC' if no match
 */
async function findDepartmentByClassification(classification) {
  if (!classification) return 'PUBLIC';

  try {
    const result = await pool.query('SELECT name, allowed_document_types FROM departments');
    const departments = result.rows;

    const lowerClassification = classification.toLowerCase().trim();

    // Find department with matching document type
    for (const dept of departments) {
      if (!dept.allowed_document_types || dept.allowed_document_types.length === 0) {
        continue;
      }

      // Check if classification matches any allowed type (case-insensitive substring match)
      const matches = dept.allowed_document_types.some((docType) =>
        lowerClassification.includes(docType.toLowerCase()) ||
        docType.toLowerCase().includes(lowerClassification)
      );

      if (matches) {
        return dept.name;
      }
    }

    // No match found, default to PUBLIC
    return 'PUBLIC';
  } catch (error) {
    console.error('Error finding department by classification:', error);
    return 'PUBLIC'; // Fallback to PUBLIC on error
  }
}

/**
 * Get all departments with their allowed document types
 * @returns {Promise<Array>} - Array of departments with doc types
 */
async function getAllDepartmentsWithDocTypes() {
  try {
    const result = await pool.query(
      'SELECT id, name, description, allowed_document_types FROM departments ORDER BY name'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching departments with doc types:', error);
    return [];
  }
}

module.exports = {
  findDepartmentByClassification,
  getAllDepartmentsWithDocTypes,
};
