const pool = require('../config/database');
const documentService = require('../services/documentService');
const vectorService = require('../services/vectorService');
const crypto = require('crypto');

/**
 * Helper function to get file type
 */
function getFileType(mimetype, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (mimetype.includes('pdf') || ext === 'pdf') return 'pdf';
  if (mimetype.includes('word') || ext === 'docx' || ext === 'doc') return 'docx';
  if (mimetype.includes('sheet') || ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt') return 'txt';
  
  return 'document';
}

/**
 * Helper function to delete document
 */
async function deleteDocumentHelper(documentId) {
  try {
    await vectorService.deleteDocumentChunks(documentId);
    await pool.query(`DELETE FROM document_metadata WHERE id = $1`, [documentId]);
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

class DocumentController {
  /**
   * Upload and process document
   */
  async uploadDocument(req, res) {
    let documentId = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get user ID from authenticated user
      const userId = req.user.id;

      const { originalname, path: filePath, mimetype, size } = req.file;
      documentId = crypto.randomUUID();

      // Determine file type
      const fileType = getFileType(mimetype, originalname);
      
      // Extract text from document
      console.log(`📄 Processing document: ${originalname} for user ${userId}`);
      const text = await documentService.extractText(filePath, fileType);

      // Chunk the text
      const chunks = documentService.chunkText(text);
      console.log(`✂️ Created ${chunks.length} chunks`);

      // Store metadata with user_id
      await pool.query(
        `INSERT INTO document_metadata (id, title, file_type, file_size, user_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [documentId, originalname, fileType, size, userId]
      );

      // Store chunks with embeddings and user_id
      await vectorService.storeDocumentChunks(chunks, documentId, userId);

      // Handle structured data for spreadsheets
      if (['xlsx', 'xls', 'csv'].includes(fileType)) {
        const fs = require('fs');
        const buffer = fs.readFileSync(filePath);
        const structuredData = await documentService.extractStructuredData(buffer);
        
        for (const [sheetName, rows] of Object.entries(structuredData)) {
          for (const row of rows) {
            await pool.query(
              `INSERT INTO document_rows (dataset_id, row_data) VALUES ($1, $2)`,
              [documentId, JSON.stringify(row)]
            );
          }
        }
      }

      // Clean up file
      await documentService.deleteFile(filePath);

      res.json({
        success: true,
        document: {
          id: documentId,
          title: originalname,
          type: fileType,
          chunks: chunks.length,
          date: new Date().toISOString().split('T')[0]
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up on error
      if (documentId) {
        await deleteDocumentHelper(documentId);
      }
      
      res.status(500).json({ 
        error: 'Failed to process document',
        details: error.message 
      });
    }
  }

  /**
   * Get all documents (filtered by user or all for admin)
   */
  async getDocuments(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      let query;
      let params;

      if (isAdmin) {
        // Admin sees all documents with user info
        query = `
          SELECT dm.id, dm.title, dm.file_type as type, dm.created_at as date,
                 dm.user_id, u.full_name as user_name, u.email as user_email
          FROM document_metadata dm
          LEFT JOIN users u ON dm.user_id = u.id
          ORDER BY dm.created_at DESC
        `;
        params = [];
      } else {
        // Regular user sees only their documents
        query = `
          SELECT id, title, file_type as type, created_at as date, user_id
          FROM document_metadata 
          WHERE user_id = $1
          ORDER BY created_at DESC
        `;
        params = [userId];
      }

      const result = await pool.query(query, params);

      const documents = result.rows.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        date: doc.date.toISOString().split('T')[0],
        userId: doc.user_id,
        userName: doc.user_name || null,
        userEmail: doc.user_email || null
      }));

      res.json({ documents });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  /**
   * Get document by ID (with permission check)
   */
  async getDocumentById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const result = await pool.query(
        `SELECT dm.*, u.full_name as user_name, u.email as user_email
         FROM document_metadata dm
         LEFT JOIN users u ON dm.user_id = u.id
         WHERE dm.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = result.rows[0];

      // Check permission
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await vectorService.getDocumentStats(id);

      res.json({
        document: {
          ...doc,
          ...stats
        }
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }

  /**
   * Delete document (with permission check)
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Check ownership
      const result = await pool.query(
        `SELECT user_id FROM document_metadata WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = result.rows[0];

      // Only owner or admin can delete
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await deleteDocumentHelper(id);

      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  /**
   * Get all users with their document stats (Admin only)
   */
  async getUsersWithStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM user_document_stats
        ORDER BY document_count DESC, email ASC
      `);

      res.json({ users: result.rows });
    } catch (error) {
      console.error('Get users stats error:', error);
      res.status(500).json({ error: 'Failed to retrieve user statistics' });
    }
  }

  /**
   * Get documents by user ID (Admin only)
   */
  async getDocumentsByUser(req, res) {
    try {
      const { userId } = req.params;

      const result = await pool.query(
        `SELECT id, title, file_type as type, created_at as date
         FROM document_metadata 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      const documents = result.rows.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        date: doc.date.toISOString().split('T')[0]
      }));

      res.json({ documents });
    } catch (error) {
      console.error('Get user documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }
}

module.exports = new DocumentController();