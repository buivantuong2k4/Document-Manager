const pool = require('../config/database');
const geminiService = require('./openaiService');


class VectorService {
  /**
   * Store document chunks with embeddings
   */
  async storeDocumentChunks(chunks, documentId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const chunk of chunks) {
        const embedding = await geminiService.generateEmbedding(chunk);
        
        await client.query(
          `INSERT INTO documents (content, metadata, embedding) 
           VALUES ($1, $2, $3)`,
          [
            chunk,
            JSON.stringify({ document_id: documentId }),
            JSON.stringify(embedding)
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Stored ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing document chunks:', error);
     console.error("❌ LỖI DB CHI TIẾT:", error.message); 
    if (error.detail) console.error("Chi tiết:", error.detail);
    
    throw error; // Ném lỗi gốc ra để controller bắt được
    } finally {
      client.release();
    }
  }

  /**
   * Search for similar documents
   */
  async searchSimilarDocuments(query, documentId, limit = 5) {
    try {
      const queryEmbedding = await geminiService.generateEmbedding(query);
      
      const result = await pool.query(
        `SELECT * FROM match_documents($1::vector, $2, $3)`,
        [
          JSON.stringify(queryEmbedding),
          limit,
          JSON.stringify({ document_id: documentId })
        ]
      );

      return result.rows;
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  /**
   * Delete all chunks for a document
   */
  async deleteDocumentChunks(documentId) {
    try {
      const result = await pool.query(
        `DELETE FROM documents WHERE metadata->>'document_id' = $1`,
        [documentId]
      );
      console.log(`🗑️ Deleted ${result.rowCount} chunks for document ${documentId}`);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting document chunks:', error);
      throw new Error('Failed to delete document chunks');
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(documentId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as chunk_count FROM documents 
         WHERE metadata->>'document_id' = $1`,
        [documentId]
      );
      return { chunkCount: parseInt(result.rows[0].chunk_count) };
    } catch (error) {
      console.error('Error getting document stats:', error);
      return { chunkCount: 0 };
    }
  }
}

module.exports = new VectorService();