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

      if (!documentId || !message) {
        return res.status(400).json({ 
          error: 'documentId and message are required' 
        });
      }

      // Verify document exists
      const docCheck = await pool.query(
        `SELECT id FROM document_metadata WHERE id = $1`,
        [documentId]
      );

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      console.log(`💬 Processing message for document: ${documentId}`);

      // Search for relevant chunks
      const similarDocs = await vectorService.searchSimilarDocuments(
        message, 
        documentId, 
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

      // Save to chat history
      await pool.query(
        `INSERT INTO chat_history (document_id, user_message, bot_response) 
         VALUES ($1, $2, $3)`,
        [documentId, message, botResponse]
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
}

module.exports = new ChatController();