const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

class DocumentService {
  /**
   * Extract text from various file types
   */
  async extractText(filePath, fileType) {
    try {
      const buffer = await fs.readFile(filePath);

      switch (fileType) {
        case 'pdf':
          return await this.extractFromPDF(buffer);
        case 'docx':
          return await this.extractFromDOCX(buffer);
        case 'xlsx':
        case 'xls':
        case 'csv':
          return await this.extractFromSpreadsheet(buffer, fileType);
        case 'txt':
          return buffer.toString('utf-8');
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Extract text from PDF
   */
  async extractFromPDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  /**
   * Extract text from DOCX
   */
  async extractFromDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extract text from spreadsheets
   */
  async extractFromSpreadsheet(buffer, fileType) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let allText = '';

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      allText += `\n--- Sheet: ${sheetName} ---\n`;
      jsonData.forEach(row => {
        allText += row.join(' | ') + '\n';
      });
    });

    return allText;
  }

  /**
   * Extract structured data from spreadsheet
   */
  async extractStructuredData(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      result[sheetName] = xlsx.utils.sheet_to_json(sheet);
    });

    return result;
  }

  /**
   * Chunk text into smaller pieces for embeddings
   */
  chunkText(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Clean up uploaded file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

module.exports = new DocumentService();