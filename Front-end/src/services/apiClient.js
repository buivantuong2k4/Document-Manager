import axiosClient from '../api/axiosClient';

class ApiClient {
  /**
   * Upload document (with auth)
   */
  async uploadDocument(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axiosClient.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(error.response?.data?.error || 'Upload failed');
    }
  }

  /**
   * Get all documents (filtered by user)
   */
  async getDocuments() {
    try {
      const response = await axiosClient.get('/api/documents');
      return response.data;
    } catch (error) {
      console.error('Get documents error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch documents');
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId) {
    try {
      const response = await axiosClient.get(`/api/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Get document error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch document');
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    try {
      const response = await axiosClient.delete(`/api/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Delete document error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete document');
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(documentId, message, conversationHistory = []) {
    try {
      const response = await axiosClient.post('/api/chat/message', {
        documentId,
        message,
        conversationHistory
      });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(documentId, limit = 50) {
    try {
      const response = await axiosClient.get(`/api/chat/history/${documentId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get chat history error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch chat history');
    }
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(documentId) {
    try {
      const response = await axiosClient.delete(`/api/chat/history/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Clear chat history error:', error);
      throw new Error(error.response?.data?.error || 'Failed to clear chat history');
    }
  }

  /**
   * Admin: Get users with stats
   */
  async getUsersWithStats() {
    try {
      const response = await axiosClient.get('/api/admin/users-stats');
      return response.data;
    } catch (error) {
      console.error('Get users stats error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch users');
    }
  }

  /**
   * Admin: Get documents by user
   */
  async getDocumentsByUser(userId) {
    try {
      const response = await axiosClient.get(`/api/admin/users/${userId}/documents`);
      return response.data;
    } catch (error) {
      console.error('Get user documents error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch user documents');
    }
  }

  /**
   * Admin: Get chat history by user
   */
  async getChatHistoryByUser(userId, limit = 100) {
    try {
      const response = await axiosClient.get(`/api/admin/users/${userId}/chats?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get user chat history error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch user chat history');
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axiosClient.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw new Error(error.response?.data?.error || 'Health check failed');
    }
  }
}

export default new ApiClient();