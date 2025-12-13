import OpenAI from "openai";
import { Storage } from "@google-cloud/storage";
import fetch from "node-fetch";

// Initialize DeepSeek for OCR (using deepseek-chat with vision capabilities)
const deepseekOCR = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// Initialize Google Cloud Storage
const storage = new Storage();

/**
 * Extract text from a document image using DeepSeek Vision API
 * @param imageUrl - URL or base64 encoded image
 * @returns Extracted text content
 */
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    console.log(`[OCR] Extracting text from image using DeepSeek...`);
    
    const completion = await deepseekOCR.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this document image. Return the complete text content as plain text, preserving structure and formatting where possible. Include all visible text, tables, lists, and any other readable content."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for accurate extraction
    });

    const extractedText = completion.choices[0].message.content || "";
    console.log(`[OCR] Successfully extracted ${extractedText.length} characters`);
    
    return extractedText;
  } catch (error) {
    console.error("[OCR] Error extracting text from image:", error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Download and convert a file to base64
 * Supports MongoDB file IDs (via FileUpload collection) and legacy Google Cloud Storage URLs
 * @param fileIdOrUrl - MongoDB file ID or URL from object storage
 * @returns Base64 encoded file
 */
async function downloadAndConvertToBase64(fileIdOrUrl: string): Promise<string> {
  try {
    // If it's a Google Cloud Storage URL (legacy support)
    if (fileIdOrUrl.includes('storage.googleapis.com')) {
      const url = new URL(fileIdOrUrl);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[1];
      const filePath = pathParts.slice(2).join('/');

      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filePath);
      
      const [contents] = await file.download();
      const base64 = contents.toString('base64');
      
      const extension = filePath.split('.').pop()?.toLowerCase();
      const mimeType = getMimeType(extension || '');
      
      return `data:${mimeType};base64,${base64}`;
    }
    
    // If it's a full HTTP URL
    if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) {
      const response = await fetch(fileIdOrUrl);
      const buffer = await response.buffer();
      const base64 = buffer.toString('base64');
      
      const extension = fileIdOrUrl.split('.').pop()?.toLowerCase();
      const mimeType = getMimeType(extension || '');
      
      return `data:${mimeType};base64,${base64}`;
    }
    
    // If it's an API path like /api/files/{fileId}, extract the file ID
    let fileId = fileIdOrUrl;
    if (fileIdOrUrl.startsWith('/api/files/')) {
      fileId = fileIdOrUrl.replace('/api/files/', '');
      console.log(`[OCR] Extracted file ID from API path: ${fileId}`);
    }
    
    // Otherwise, it's a MongoDB file ID - fetch from local storage
    console.log(`[OCR] Fetching file from MongoDB storage: ${fileId}`);
    const { FileUpload } = await import('./db');
    
    const fileDoc = await FileUpload.findById(fileId);
    if (!fileDoc) {
      throw new Error(`File not found in MongoDB: ${fileId}`);
    }
    
    // FileDoc already has base64 data and mimeType
    return `data:${fileDoc.mimeType};base64,${fileDoc.data}`;
  } catch (error) {
    console.error("[OCR] Error downloading file:", error);
    throw error;
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Extract text from a PDF document using DeepSeek Vision API
 * Note: DeepSeek's chat model supports vision capabilities for PDFs
 * @param fileUrl - URL to the PDF file
 * @returns Extracted text content
 */
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    console.log(`[OCR] Extracting text from PDF using DeepSeek Vision...`);
    
    // Convert PDF to base64
    const pdfBase64 = await downloadAndConvertToBase64(fileUrl);
    
    // Use DeepSeek Vision API to extract text from PDF
    const completion = await deepseekOCR.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this PDF document. Return the complete text content as plain text, preserving structure and formatting where possible. Include all visible text, tables, lists, and any other readable content."
            },
            {
              type: "image_url",
              image_url: {
                url: pdfBase64,
              }
            }
          ]
        }
      ],
      max_tokens: 4000, // Increased for larger PDFs
      temperature: 0.1,
    });

    const extractedText = completion.choices[0].message.content || "";
    console.log(`[OCR] Successfully extracted ${extractedText.length} characters from PDF`);
    
    return extractedText;
  } catch (error) {
    console.error("[OCR] Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from multiple document files
 * @param fileUrls - Array of file URLs from object storage
 * @returns Combined extracted text from all documents
 */
export async function extractTextFromDocuments(fileUrls: string[]): Promise<string> {
  if (!fileUrls || fileUrls.length === 0) {
    return "";
  }

  console.log(`[OCR] Processing ${fileUrls.length} document(s)...`);
  
  const extractedTexts: string[] = [];
  
  for (const fileUrl of fileUrls) {
    try {
      // Check if file is supported by Vision API
      let extension = fileUrl.split('.').pop()?.toLowerCase();
      
      // If it's a MongoDB file ID (no extension), fetch the MIME type to determine file type
      if (fileUrl.startsWith('/api/files/')) {
        try {
          const fileId = fileUrl.replace('/api/files/', '');
          const { FileUpload } = await import('./db');
          const fileDoc = await FileUpload.findById(fileId);
          
          if (fileDoc) {
            // Map MIME type to extension
            const mimeToExt: Record<string, string> = {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp',
              'application/pdf': 'pdf',
            };
            extension = mimeToExt[fileDoc.mimeType] || extension;
            console.log(`[OCR] Detected MIME type ${fileDoc.mimeType} → extension: ${extension}`);
          }
        } catch (error) {
          console.error(`[OCR] Failed to fetch file metadata for ${fileUrl}:`, error);
        }
      }
      
      const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
      
      if (!extension || !supportedFormats.includes(extension)) {
        console.log(`[OCR] Skipping unsupported file format: ${extension}`);
        continue;
      }

      // Handle PDFs and images differently
      let text = "";
      
      if (extension === 'pdf') {
        console.log(`[OCR] Processing PDF document: ${fileUrl}`);
        text = await extractTextFromPDF(fileUrl);
      } else {
        // Convert to base64 if needed for images
        let imageUrl = fileUrl;
        if (!fileUrl.startsWith('data:') && !fileUrl.startsWith('http')) {
          imageUrl = await downloadAndConvertToBase64(fileUrl);
        }
        text = await extractTextFromImage(imageUrl);
      }

      if (text.trim()) {
        extractedTexts.push(text);
      }
    } catch (error) {
      console.error(`[OCR] Failed to process file ${fileUrl}:`, error);
      // Continue with other files even if one fails
    }
  }

  const combinedText = extractedTexts.join('\n\n--- Next Document ---\n\n');
  console.log(`[OCR] Total extracted text: ${combinedText.length} characters from ${extractedTexts.length} document(s)`);
  
  return combinedText;
}
