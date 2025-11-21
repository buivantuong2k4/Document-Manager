// import React, { useState, useEffect, useRef } from 'react';
// import { Upload, FileText, MessageSquare, Send, Loader2, X, Home, Trash2 } from 'lucide-react';

// // API Configuration
// const API_CONFIG = {
//   uploadUrl: 'YOUR_N8N_WEBHOOK_URL', // Webhook để upload file
//   chatUrl: 'YOUR_N8N_CHAT_WEBHOOK_URL', // Webhook chat từ N8N
//   documentsUrl: 'YOUR_N8N_DOCUMENTS_LIST_URL' // API để lấy danh sách documents
// };

// const DocumentChatApp = () => {
//   const [documents, setDocuments] = useState([]);
//   const [selectedDoc, setSelectedDoc] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [inputMessage, setInputMessage] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);
//   const [sessionId] = useState(() => `session_${Date.now()}`);
//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   // Scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   // Load documents on mount
//   useEffect(() => {
//     loadDocuments();
//   }, []);

//   const loadDocuments = async () => {
//     try {
//       // Giả lập dữ liệu - thay bằng API call thực
//       const mockDocs = [
//         { id: '1', title: 'Product Guide.pdf', type: 'pdf', uploadedAt: new Date().toISOString() },
//         { id: '2', title: 'Sales Data.xlsx', type: 'excel', uploadedAt: new Date().toISOString() },
//         { id: '3', title: 'Meeting Notes.docx', type: 'doc', uploadedAt: new Date().toISOString() }
//       ];
//       setDocuments(mockDocs);
      
//       // Uncomment để sử dụng API thực
//       // const response = await fetch(API_CONFIG.documentsUrl);
//       // const data = await response.json();
//       // setDocuments(data.documents);
//     } catch (error) {
//       console.error('Error loading documents:', error);
//     }
//   };

//   const handleFileUpload = async (event) => {
//     const files = Array.from(event.target.files);
//     if (files.length === 0) return;

//     setIsUploading(true);
    
//     try {
//       for (const file of files) {
//         const formData = new FormData();
//         formData.append('file', file);
        
//         // Giả lập upload
//         await new Promise(resolve => setTimeout(resolve, 1500));
        
//         const newDoc = {
//           id: Date.now().toString(),
//           title: file.name,
//           type: file.type,
//           uploadedAt: new Date().toISOString()
//         };
        
//         setDocuments(prev => [newDoc, ...prev]);
        
//         // Uncomment để sử dụng API thực
//         // const response = await fetch(API_CONFIG.uploadUrl, {
//         //   method: 'POST',
//         //   body: formData
//         // });
//         // const data = await response.json();
//         // setDocuments(prev => [data.document, ...prev]);
//       }
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       alert('Lỗi khi tải tài liệu lên. Vui lòng thử lại.');
//     } finally {
//       setIsUploading(false);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = '';
//       }
//     }
//   };

//   const sendMessage = async () => {
//     if (!inputMessage.trim() || !selectedDoc) return;

//     const userMessage = {
//       id: Date.now(),
//       type: 'user',
//       content: inputMessage,
//       timestamp: new Date().toISOString()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInputMessage('');
//     setIsLoading(true);

//     try {
//       // Giả lập response
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       const botMessage = {
//         id: Date.now() + 1,
//         type: 'bot',
//         content: `Đây là câu trả lời mẫu cho câu hỏi "${inputMessage}" từ tài liệu "${selectedDoc.title}". Trong thực tế, câu trả lời sẽ được lấy từ vector database thông qua API N8N.`,
//         timestamp: new Date().toISOString()
//       };
      
//       setMessages(prev => [...prev, botMessage]);
      
//       // Uncomment để sử dụng API thực
//       // const response = await fetch(API_CONFIG.chatUrl, {
//       //   method: 'POST',
//       //   headers: { 'Content-Type': 'application/json' },
//       //   body: JSON.stringify({
//       //     chatInput: inputMessage,
//       //     sessionId: sessionId,
//       //     documentId: selectedDoc.id
//       //   })
//       // });
//       // const data = await response.json();
//       // const botMessage = {
//       //   id: Date.now() + 1,
//       //   type: 'bot',
//       //   content: data.output,
//       //   timestamp: new Date().toISOString()
//       // };
//       // setMessages(prev => [...prev, botMessage]);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       setMessages(prev => [...prev, {
//         id: Date.now() + 1,
//         type: 'bot',
//         content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
//         timestamp: new Date().toISOString()
//       }]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const selectDocument = (doc) => {
//     setSelectedDoc(doc);
//     setMessages([{
//       id: Date.now(),
//       type: 'bot',
//       content: `Xin chào! Tôi có thể giúp bạn trả lời các câu hỏi về tài liệu "${doc.title}". Hãy đặt câu hỏi của bạn.`,
//       timestamp: new Date().toISOString()
//     }]);
//   };

//   const backToHome = () => {
//     setSelectedDoc(null);
//     setMessages([]);
//   };

//   const deleteDocument = (docId, e) => {
//     e.stopPropagation();
//     if (window.confirm('Bạn có chắc muốn xóa tài liệu này?')) {
//       setDocuments(prev => prev.filter(doc => doc.id !== docId));
//       if (selectedDoc?.id === docId) {
//         backToHome();
//       }
//     }
//   };

//   const getFileIcon = (type) => {
//     if (type?.includes('pdf')) return '📄';
//     if (type?.includes('sheet') || type?.includes('excel')) return '📊';
//     if (type?.includes('doc')) return '📝';
//     return '📁';
//   };

//   // Home View - Document List
//   if (!selectedDoc) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//         <div className="container mx-auto px-4 py-8 max-w-6xl">
//           {/* Header */}
//           <div className="text-center mb-8">
//             <h1 className="text-4xl font-bold text-gray-800 mb-2">
//               📚 RAG Document Chat
//             </h1>
//             <p className="text-gray-600">
//               Tải lên tài liệu và chat với AI để trích xuất thông tin
//             </p>
//           </div>

//           {/* Upload Section */}
//           <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
//             <div className="flex flex-col items-center">
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 multiple
//                 onChange={handleFileUpload}
//                 className="hidden"
//                 accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
//               />
//               <button
//                 onClick={() => fileInputRef.current?.click()}
//                 disabled={isUploading}
//                 className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
//               >
//                 {isUploading ? (
//                   <>
//                     <Loader2 className="animate-spin" size={20} />
//                     Đang tải lên...
//                   </>
//                 ) : (
//                   <>
//                     <Upload size={20} />
//                     Tải tài liệu lên
//                   </>
//                 )}
//               </button>
//               <p className="text-sm text-gray-500 mt-2">
//                 Hỗ trợ: PDF, DOC, DOCX, TXT, XLSX, XLS, CSV
//               </p>
//             </div>
//           </div>

//           {/* Documents Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {documents.length === 0 ? (
//               <div className="col-span-full text-center py-12 text-gray-500">
//                 <FileText size={48} className="mx-auto mb-4 opacity-50" />
//                 <p>Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên!</p>
//               </div>
//             ) : (
//               documents.map(doc => (
//                 <div
//                   key={doc.id}
//                   onClick={() => selectDocument(doc)}
//                   className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-xl transition-shadow group relative"
//                 >
//                   <button
//                     onClick={(e) => deleteDocument(doc.id, e)}
//                     className="absolute top-2 right-2 p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-full transition-opacity"
//                   >
//                     <Trash2 size={16} />
//                   </button>
//                   <div className="text-4xl mb-3">{getFileIcon(doc.type)}</div>
//                   <h3 className="font-semibold text-gray-800 mb-2 truncate">
//                     {doc.title}
//                   </h3>
//                   <p className="text-xs text-gray-500">
//                     {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
//                   </p>
//                   <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">
//                     <MessageSquare size={16} className="mr-1" />
//                     Chat với tài liệu
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Chat View
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
//       {/* Header */}
//       <div className="bg-white shadow-md">
//         <div className="container mx-auto px-4 py-4 max-w-4xl">
//           <div className="flex items-center justify-between">
//             <button
//               onClick={backToHome}
//               className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
//             >
//               <Home size={20} />
//               <span className="font-medium">Về trang chủ</span>
//             </button>
//             <div className="flex items-center gap-2">
//               <span className="text-2xl">{getFileIcon(selectedDoc.type)}</span>
//               <h2 className="font-semibold text-gray-800">{selectedDoc.title}</h2>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Messages Container */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="container mx-auto px-4 py-6 max-w-4xl">
//           <div className="space-y-4">
//             {messages.map(message => (
//               <div
//                 key={message.id}
//                 className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
//               >
//                 <div
//                   className={`max-w-[70%] rounded-lg px-4 py-3 ${
//                     message.type === 'user'
//                       ? 'bg-indigo-600 text-white'
//                       : 'bg-white text-gray-800 shadow-md'
//                   }`}
//                 >
//                   <p className="whitespace-pre-wrap">{message.content}</p>
//                   <p
//                     className={`text-xs mt-1 ${
//                       message.type === 'user' ? 'text-indigo-200' : 'text-gray-400'
//                     }`}
//                   >
//                     {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
//                       hour: '2-digit',
//                       minute: '2-digit'
//                     })}
//                   </p>
//                 </div>
//               </div>
//             ))}
//             {isLoading && (
//               <div className="flex justify-start">
//                 <div className="bg-white rounded-lg px-4 py-3 shadow-md">
//                   <Loader2 className="animate-spin text-indigo-600" size={20} />
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
//         </div>
//       </div>

//       {/* Input Area */}
//       <div className="bg-white border-t shadow-lg">
//         <div className="container mx-auto px-4 py-4 max-w-4xl">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={inputMessage}
//               onChange={(e) => setInputMessage(e.target.value)}
//               onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
//               placeholder="Đặt câu hỏi về tài liệu..."
//               disabled={isLoading}
//               className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
//             />
//             <button
//               onClick={sendMessage}
//               disabled={isLoading || !inputMessage.trim()}
//               className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
//             >
//               <Send size={20} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DocumentChatApp;

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, MessageCircle, FileText, Loader, X, ChevronRight } from 'lucide-react';

export default function RAGInterface() {
  const [documents, setDocuments] = useState([
    { id: '1', title: 'Test Sheet #1', type: 'spreadsheet', date: '2025-02-23' },
    { id: '2', title: 'Company Policy.pdf', type: 'pdf', date: '2025-02-22' },
    { id: '3', title: 'Q4 Report.docx', type: 'document', date: '2025-02-21' }
  ]);
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    // Simulate file upload
    setTimeout(() => {
      files.forEach(file => {
        const newDoc = {
          id: Date.now().toString(),
          title: file.name,
          type: file.type.includes('pdf') ? 'pdf' : file.type.includes('sheet') ? 'spreadsheet' : 'document',
          date: new Date().toISOString().split('T')[0]
        };
        setDocuments(prev => [newDoc, ...prev]);
      });
      setUploading(false);
      fileInputRef.current.value = '';
    }, 1500);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedDoc) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // Simulate API call to N8N webhook
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        text: `Dựa trên tài liệu "${selectedDoc.title}", tôi tìm thấy thông tin liên quan: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Đây là câu trả lời mẫu từ chatbot RAG của bạn.`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setLoading(false);
    }, 1000);
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return '📄';
      case 'spreadsheet': return '📊';
      case 'document': return '📝';
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
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
            {documents.length === 0 ? (
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
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition ${
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
                    {selectedDoc?.id === doc.id && (
                      <ChevronRight size={16} className="text-blue-300 flex-shrink-0" />
                    )}
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
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

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
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || loading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg transition disabled:opacity-50"
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