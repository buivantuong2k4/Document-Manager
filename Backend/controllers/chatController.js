const pool = require('../config/database');
const vectorService = require('../services/vectorService');
const geminiService = require('../services/openaiService');

class ChatController {
  /**
   * Send message and get response
   */
  async sendMessage(req, res) {
    try {
      const { documentId, message, conversationHistory = [] } = req.body;
      const userId = req.user.id || req.user.email;
      const isAdmin = req.user.role === 'admin';

      if (!documentId || !message) {
        return res.status(400).json({ 
          error: 'documentId and message are required' 
        });
      }

      // Verify document exists and check permission
      const docCheck = await pool.query(
        `SELECT id, user_id FROM document_metadata WHERE id = $1`,
        [documentId]
      );

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = docCheck.rows[0];

      // Check permission: user can only chat with their own documents, admin can chat with any
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied to this document' });
      }

      console.log(`💬 Processing message for document: ${documentId} by user: ${userId}`);

      // Search for relevant chunks (filter by user for non-admin)
      const searchUserId = isAdmin ? null : userId;
      const similarDocs = await vectorService.searchSimilarDocuments(
        message, 
        documentId,
        searchUserId,
        5
      );

      console.log(`🔍 Found ${similarDocs.length} relevant chunks`);

      // Build context from similar documents
      const context = similarDocs
        .map((doc, idx) => `[${idx + 1}] ${doc.content}`)
        .join('\n\n');

      // Format conversation history
      const formattedHistory = conversationHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Generate response
      const botResponse = await geminiService.generateChatResponse(
        message,
        context,
        formattedHistory
      );

      // Save to chat history with user_id
      await pool.query(
        `INSERT INTO chat_history (document_id, user_id, user_message, bot_response) 
         VALUES ($1, $2, $3, $4)`,
        [documentId, userId, message, botResponse]
      );

      res.json({
        success: true,
        response: botResponse,
        sources: similarDocs.map((doc, idx) => ({
          index: idx + 1,
          preview: doc.content.substring(0, 100) + '...',
          similarity: doc.similarity
        }))
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        error: 'Failed to process message',
        details: error.message 
      });
    }
  }

  /**
   * Get chat history for a document
   */
  async getChatHistory(req, res) {
    try {
      const { documentId } = req.params;
      const { limit = 50 } = req.query;
      const userId = req.user.id || req.user.email;
      const isAdmin = req.user.role === 'admin';

      // Check document ownership
      const docCheck = await pool.query(
        `SELECT user_id FROM document_metadata WHERE id = $1`,
        [documentId]
      );

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = docCheck.rows[0];

      // Check permission
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await pool.query(
        `SELECT id, user_message, bot_response, created_at 
         FROM chat_history 
         WHERE document_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [documentId, limit]
      );

      const messages = result.rows.reverse().flatMap(row => [
        {
          id: `${row.id}-user`,
          text: row.user_message,
          sender: 'user',
          timestamp: row.created_at
        },
        {
          id: `${row.id}-bot`,
          text: row.bot_response,
          sender: 'bot',
          timestamp: row.created_at
        }
      ]);

      res.json({ messages });

    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  }

  /**
   * Clear chat history for a document
   */
  async clearChatHistory(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id || req.user.email;
      const isAdmin = req.user.role === 'admin';

      // Check document ownership
      const docCheck = await pool.query(
        `SELECT user_id FROM document_metadata WHERE id = $1`,
        [documentId]
      );

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = docCheck.rows[0];

      // Check permission
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await pool.query(
        `DELETE FROM chat_history WHERE document_id = $1`,
        [documentId]
      );

      res.json({ 
        success: true, 
        deleted: result.rowCount,
        message: 'Chat history cleared successfully' 
      });

    } catch (error) {
      console.error('Clear chat history error:', error);
      res.status(500).json({ error: 'Failed to clear chat history' });
    }
  }

  /**
   * Get chat history by user (Admin only)
   */
  async getChatHistoryByUser(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 100 } = req.query;

      const result = await pool.query(
        `SELECT ch.id, ch.document_id, ch.user_message, ch.bot_response, ch.created_at,
                dm.title as document_title
         FROM chat_history ch
         LEFT JOIN document_metadata dm ON ch.document_id = dm.id
         WHERE ch.user_id = $1
         ORDER BY ch.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      res.json({ 
        chats: result.rows,
        total: result.rows.length
      });

    } catch (error) {
      console.error('Get user chat history error:', error);
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  }
}

module.exports = new ChatController();