import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, MessageCircle, FileText, Loader, X, ChevronRight, Trash2 } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function RAGInterface() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load chat history when document is selected
  useEffect(() => {
    if (selectedDoc) {
      loadChatHistory(selectedDoc.id);
    }
  }, [selectedDoc]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const response = await apiClient.getDocuments();
      setDocuments(response.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Không thể tải danh sách tài liệu');
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadChatHistory = async (documentId) => {
    try {
      const response = await apiClient.getChatHistory(documentId);
      setMessages(response.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
        const response = await apiClient.uploadDocument(file);
        if (response.success) {
          setDocuments(prev => [response.document, ...prev]);
        }
      }
    } catch (err) {
      setError(err.message || 'Tải tài liệu thất bại');
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedDoc || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.sendMessage(
        selectedDoc.id,
        inputValue,
        messages
      );

      const botMessage = {
        id: Date.now() + 1,
        text: response.response,
        sender: 'bot',
        timestamp: new Date(),
        sources: response.sources
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError(err.message || 'Gửi tin nhắn thất bại');
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi của bạn.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) {
      return;
    }

    try {
      await apiClient.deleteDocument(docId);
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Không thể xóa tài liệu');
    }
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return '📄';
      case 'xlsx':
      case 'xls':
      case 'csv':
        return '📊';
      case 'docx':
      case 'doc':
        return '📝';
      case 'txt': return '📋';
      default: return '📎';
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar - Documents List */}
      <div className="w-80 border-r border-slate-700 bg-slate-800/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-900/50">
          <h1 className="text-2xl font-bold text-white mb-4">Tài liệu</h1>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <Upload size={18} />
                Thêm tài liệu
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          />
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-2">
            {loadingDocs ? (
              <div className="text-center py-12">
                <Loader size={32} className="mx-auto mb-3 text-slate-400 animate-spin" />
                <p className="text-slate-400">Đang tải...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-50" />
                <p>Chưa có tài liệu</p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setMessages([]);
                    setError(null);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition group ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-600 shadow-lg shadow-blue-500/20'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getFileIcon(doc.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm">{doc.title}</p>
                      <p className="text-slate-400 text-xs">{doc.date}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {selectedDoc?.id === doc.id && (
                        <ChevronRight size={16} className="text-blue-300 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedDoc ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <MessageCircle size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Chào mừng đến với RAG Chatbot</h2>
            <p className="text-slate-400 max-w-md mb-8">
              Chọn một tài liệu từ danh sách bên trái để bắt đầu đặt câu hỏi về nội dung của nó
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-8 rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Upload size={20} />
              Tải tài liệu đầu tiên
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="border-b border-slate-700 bg-slate-800/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(selectedDoc.type)}</span>
                <div>
                  <h2 className="text-white font-bold">{selectedDoc.title}</h2>
                  <p className="text-slate-400 text-sm">Đã tải: {selectedDoc.date}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setMessages([]);
                  setError(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border-l-4 border-red-500 p-4 m-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>Hỏi tôi bất kỳ câu hỏi nào về tài liệu này...</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-700 text-slate-100 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg rounded-bl-none">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-700 bg-slate-800/50 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Nhập câu hỏi của bạn..."
                  disabled={loading}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || loading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}