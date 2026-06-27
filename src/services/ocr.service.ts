import { ExpenseCategory } from '@/models/expense.model';

export interface OcrParsedData {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  category: ExpenseCategory | null;
  confidenceScore: number;
  rawText: string;
  currency?: string;
  description?: string;
}

export class OcrService {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = (process.env.OCR_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
  }

  async processReceipt(fileBuffer: Buffer, mimeType: string): Promise<OcrParsedData> {
    try {
      // Determine file extension from mimeType
      let extension = 'jpg';
      if (mimeType === 'application/pdf') {
        extension = 'pdf';
      } else if (mimeType === 'image/png') {
        extension = 'png';
      } else if (mimeType === 'image/webp') {
        extension = 'webp';
      } else if (mimeType === 'image/gif') {
        extension = 'gif';
      }

      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, `receipt.${extension}`);

      const response = await fetch(`${this.serviceUrl}/ocr/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI OCR Service returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to extract data from receipt via FastAPI OCR service');
      }

      const ocrData = result.data;

      return {
        merchant: ocrData.merchant,
        amount: ocrData.amount,
        date: ocrData.date,
        category: ocrData.category as ExpenseCategory,
        confidenceScore: ocrData.amount > 0 && ocrData.merchant !== 'Unknown Merchant' ? 95 : 60,
        rawText: `Merchant: ${ocrData.merchant}\nAmount: ${ocrData.amount}\nDate: ${ocrData.date}\nCategory: ${ocrData.category}\nCurrency: ${ocrData.currency}`,
        currency: ocrData.currency,
        description: ocrData.description,
      };
    } catch (err: any) {
      console.error('OCR Service invocation error:', err);
      // Fallback/rethrow error so controller can handle and present options to user
      throw new Error(`OCR Processing Failed: ${err.message || err}`);
    }
  }
}

export const ocrService = new OcrService();
