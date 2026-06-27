'use server';

import { createClient } from '@/lib/supabase/server';
import { ocrService } from '@/services/ocr.service';
import { receiptRepository } from '@/repositories/receipt.repository';
import { Receipt } from '@/models/receipt.model';
import { expenseService } from '@/services/expense.service';
import { revalidatePath } from 'next/cache';

export async function uploadAndExtractReceiptAction(formData: FormData): Promise<{
  success: boolean;
  data?: Receipt;
  error?: string;
}> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }

    // Check size limit: 10MB (10 * 1024 * 1024 bytes)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds the 10 MB limit' };
    }

    // Check file type
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowedExts.includes(ext)) {
      return { success: false, error: 'Invalid file type. Supported types: JPG, JPEG, PNG, WEBP, PDF' };
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage bucket: receipts
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: `Failed to upload to storage: ${uploadError.message}` };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    // Process OCR
    const parsedData = await ocrService.processReceipt(buffer, file.type);

    // Save receipt to database with PENDING_REVIEW status
    const createdReceipt = await receiptRepository.create(user.id, {
      fileUrl: publicUrl,
      merchant: parsedData.merchant || 'Miscellaneous',
      amount: parsedData.amount || 0,
      date: parsedData.date || new Date().toISOString().split('T')[0],
      category: parsedData.category || 'Miscellaneous',
      confidenceScore: parsedData.confidenceScore,
      processingStatus: 'PENDING_REVIEW',
      currency: parsedData.currency || 'USD',
    });

    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: createdReceipt,
    };
  } catch (error: any) {
    console.error('OCR Controller Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR receipt processing failed',
    };
  }
}

export async function getPendingReceiptsAction(userId: string): Promise<{
  success: boolean;
  data?: Receipt[];
  error?: string;
}> {
  try {
    const data = await receiptRepository.findAll(userId, { status: 'PENDING_REVIEW' });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve pending receipts' };
  }
}

import { hindsightService } from '@/services/hindsight.service';

export async function approveReceiptAction(
  id: string,
  userId: string,
  payload: {
    merchant: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
    originalCurrency?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const receipt = await receiptRepository.findById(id, userId);
    if (!receipt) {
      return { success: false, error: 'Receipt not found' };
    }

    // Capture user correction in Hindsight memory if merchant or category changed
    if (payload.category !== receipt.category || payload.merchant !== receipt.merchant) {
      await hindsightService.learnFromOcrCorrection(
        userId,
        payload.merchant,
        receipt.category,
        payload.category
      );
    }

    // Update receipt status to APPROVED
    await receiptRepository.update(id, userId, {
      processingStatus: 'APPROVED',
      merchant: payload.merchant,
      amount: payload.amount,
      category: payload.category as any,
      date: payload.date,
      currency: payload.originalCurrency,
    });

    // Create the confirmed expense transaction
    await expenseService.createExpense(userId, {
      amount: payload.amount,
      type: 'EXPENSE',
      category: payload.category as any,
      description: payload.description || `OCR Receipt: ${payload.merchant}`,
      date: payload.date,
      source: 'OCR_RECEIPT',
      merchant: payload.merchant,
      receiptUrl: receipt.fileUrl,
      ocrConfidence: receipt.confidenceScore,
      approved: true,
      originalCurrency: payload.originalCurrency || receipt.currency || 'USD',
    });

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve receipt' };
  }
}

export async function rejectReceiptAction(id: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await receiptRepository.update(id, userId, { processingStatus: 'REJECTED' });
    
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject receipt' };
  }
}

// Keep a backward compatible signature or fallback action if referenced elsewhere
export async function extractReceiptDetailsAction(filename: string): Promise<{
  success: boolean;
  data?: {
    merchant: string;
    amount: number;
    date: string;
    category: string;
    description: string;
    confidence: number;
  };
  error?: string;
}> {
  try {
    // Return simulated extract result if direct call is made with filename
    const date = new Date().toISOString().split('T')[0];
    return {
      success: true,
      data: {
        merchant: 'Mock Merchant',
        amount: 25.00,
        date,
        category: 'Food',
        description: 'Simulated OCR parsing from filename',
        confidence: 85,
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Simulation failed'
    };
  }
}
