const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  /**
   * Upload document
   */
  async uploadDocument(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  async getDocuments() {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      return await response.json();
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      return await response.json();
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      return await response.json();
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(documentId, message, conversationHistory = []) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          message,
          conversationHistory
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(documentId, limit = 50) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/history/${documentId}?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }

      return await response.json();
    } catch (error) {
      console.error('Get chat history error:', error);
      throw error;
    }
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(documentId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/history/${documentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      return await response.json();
    } catch (error) {
      console.error('Clear chat history error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

export default new ApiClient();