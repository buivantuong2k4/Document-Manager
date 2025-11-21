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

      const { originalname, path: filePath, mimetype, size } = req.file;
      documentId = crypto.randomUUID();

      // Determine file type
      const fileType = getFileType(mimetype, originalname);
      
      // Extract text from document
      console.log(`📄 Processing document: ${originalname}`);
      const text = await documentService.extractText(filePath, fileType);

      // Chunk the text
      const chunks = documentService.chunkText(text);
      console.log(`✂️ Created ${chunks.length} chunks`);

      // Store metadata
      await pool.query(
        `INSERT INTO document_metadata (id, title, file_type, file_size) 
         VALUES ($1, $2, $3, $4)`,
        [documentId, originalname, fileType, size]
      );

      // Store chunks with embeddings
      await vectorService.storeDocumentChunks(chunks, documentId);

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
   * Get all documents
   */
  async getDocuments(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, title, file_type as type, created_at as date 
         FROM document_metadata 
         ORDER BY created_at DESC`
      );

      const documents = result.rows.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        date: doc.date.toISOString().split('T')[0]
      }));

      res.json({ documents });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM document_metadata WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const stats = await vectorService.getDocumentStats(id);

      res.json({
        document: {
          ...result.rows[0],
          ...stats
        }
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      await deleteDocumentHelper(id);

      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
}

module.exports = new DocumentController();