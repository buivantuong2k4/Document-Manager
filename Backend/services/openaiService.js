const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



class GeminiService {

  constructor() {

    this.embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    this.chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  }



  /**

   * Generate embeddings for text using Gemini

   */

  async generateEmbedding(text) {

    try {

      const result = await this.embeddingModel.embedContent(text);

      const embedding = result.embedding.values;

     

      // Gemini text-embedding-004 returns 768 dimensions by default

      return embedding;

    } catch (error) {

      console.error('Error generating embedding:', error);

      throw new Error('Failed to generate embedding: ' + error.message);

    }

  }



  /**

   * Generate embeddings for multiple texts

   */

  async generateEmbeddings(texts) {

    try {

      const embeddings = await Promise.all(

        texts.map(text => this.generateEmbedding(text))

      );

      return embeddings;

    } catch (error) {

      console.error('Error generating embeddings:', error);

      throw new Error('Failed to generate embeddings');

    }

  }



  /**

   * Generate chat completion with context using Gemini

   */

  async generateChatResponse(userMessage, context, conversationHistory = []) {

    try {

      // Build conversation history for Gemini

      let conversationText = '';

     

      if (conversationHistory.length > 0) {

        conversationText = conversationHistory

          .map(msg => `${msg.role === 'user' ? 'Người dùng' : 'AI'}: ${msg.content}`)

          .join('\n\n');

      }



      const prompt = `Bạn là một trợ lý AI thông minh, chuyên phân tích và trả lời câu hỏi dựa trên tài liệu được cung cấp.



Quy tắc:

1. Trả lời CHÍNH XÁC dựa trên nội dung tài liệu được cung cấp

2. Nếu thông tin không có trong tài liệu, hãy nói rõ điều đó

3. Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu

4. Trích dẫn thông tin từ tài liệu khi cần thiết

5. Không bịa đặt thông tin không có trong tài liệu



Nội dung tài liệu:

${context}



${conversationText ? `Lịch sử hội thoại trước đó:\n${conversationText}\n\n` : ''}Câu hỏi hiện tại: ${userMessage}



Câu trả lời:`;



      const result = await this.chatModel.generateContent(prompt);

      const response = await result.response;

      return response.text();

     

    } catch (error) {

      console.error('Error generating chat response:', error);

      throw new Error('Failed to generate chat response: ' + error.message);

    }

  }



  /**

   * Batch embed content (more efficient for multiple texts)

   */

  async batchEmbedContents(texts) {

    try {

      const result = await this.embeddingModel.batchEmbedContents({

        requests: texts.map(text => ({ content: { parts: [{ text }] } }))

      });

     

      return result.embeddings.map(emb => emb.values);

    } catch (error) {

      console.error('Error batch embedding:', error);

      // Fallback to individual embeddings if batch fails

      return await this.generateEmbeddings(texts);

    }

  }

}



module.exports = new GeminiService();