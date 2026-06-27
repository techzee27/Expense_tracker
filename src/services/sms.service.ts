import { expenseService } from '@/services/expense.service';
import { incomeService } from '@/services/income.service';
import { profileRepository } from '@/repositories/profile.repository';
import { smsParserService, SMSMessage, ParsedSMSTransaction } from './smsParser.service';
import { createClient } from '@/lib/supabase/server';

export class SMSService {
  /**
   * Sync SMS messages sent from the mobile wrapper
   */
  async syncSmsTransactions(userId: string, messages: SMSMessage[], permissionStatus: 'CONNECTED' | 'PERMISSION_DENIED'): Promise<{ success: boolean; count: number; scanned: number; error?: string }> {
    try {
      const profile = await profileRepository.findById(userId);
      if (!profile) {
        return { success: false, count: 0, scanned: 0, error: 'Profile not found' };
      }

      const nowStr = new Date().toISOString();

      // If user denied permission, update profile status and return
      if (permissionStatus === 'PERMISSION_DENIED') {
        await profileRepository.update(userId, {
          email: profile.email,
          smsTrackingEnabled: false,
          smsPermissionStatus: 'PERMISSION_DENIED',
          lastSmsScan: nowStr
        });
        return { success: true, count: 0, scanned: 0 };
      }

      // 1. Parse SMS messages
      const parsedTransactions = smsParserService.parseBatch(messages);
      const scannedCount = messages.length;

      const supabase = await createClient();
      let importedCount = 0;

      // 2. Iterate and import non-duplicates
      for (const tx of parsedTransactions) {
        let isDuplicate = false;

        if (tx.type === 'INCOME') {
          // Duplicate Detection logic for Income: Check if smsId or (senderId + amount + date) already exists in incomes
          if (tx.smsId) {
            const { data: dupSmsId } = await supabase
              .from('incomes')
              .select('id')
              .eq('user_id', userId)
              .eq('sms_id', tx.smsId)
              .limit(1);

            if (dupSmsId && dupSmsId.length > 0) {
              isDuplicate = true;
            }
          }

          if (!isDuplicate) {
            const { data: dupPayload } = await supabase
              .from('incomes')
              .select('id')
              .eq('user_id', userId)
              .eq('sender_id', tx.senderId)
              .eq('amount', tx.amount)
              .eq('transaction_date', tx.date)
              .limit(1);

            if (dupPayload && dupPayload.length > 0) {
              isDuplicate = true;
            }
          }

          if (isDuplicate) {
            continue; // Skip duplicates completely
          }

          // Map parsed transaction properties to suitable income categories
          let category = 'Other Income';
          const descriptionLower = tx.description.toLowerCase();
          if (descriptionLower.includes('stipend') || descriptionLower.includes('scholarship')) {
            category = 'Scholarship';
          } else if (descriptionLower.includes('refund')) {
            category = 'Refunds';
          } else if (descriptionLower.includes('cashback') || descriptionLower.includes('reward')) {
            category = 'Rewards & Cashback';
          } else if (descriptionLower.includes('salary') || descriptionLower.includes('wages')) {
            category = 'Part-Time Job';
          } else if (descriptionLower.includes('parent') || descriptionLower.includes('mom') || descriptionLower.includes('dad') || descriptionLower.includes('family')) {
            category = 'Family Support';
          }

          // Insert into incomes database
          await incomeService.createIncome(userId, {
            amount: tx.amount,
            currency: 'INR',
            category: category,
            description: tx.description,
            payer: tx.merchant,
            source: 'MESSAGE',
            recurring: false,
            transactionDate: tx.date,
            smsId: tx.smsId,
            senderId: tx.senderId,
            paymentMethod: tx.paymentMethod,
            accountReference: tx.accountReference,
            transactionTime: tx.transactionTime,
          });

        } else {
          // Duplicate Detection logic for Expense
          if (tx.smsId) {
            const { data: dupSmsId } = await supabase
              .from('expenses')
              .select('id')
              .eq('user_id', userId)
              .eq('sms_id', tx.smsId)
              .limit(1);

            if (dupSmsId && dupSmsId.length > 0) {
              isDuplicate = true;
            }
          }

          if (!isDuplicate) {
            const { data: dupPayload } = await supabase
              .from('expenses')
              .select('id')
              .eq('user_id', userId)
              .eq('sender_id', tx.senderId)
              .eq('amount', tx.amount)
              .eq('date', tx.date)
              .limit(1);

            if (dupPayload && dupPayload.length > 0) {
              isDuplicate = true;
            }
          }

          if (isDuplicate) {
            continue; // Skip duplicates completely
          }

          // Map parsed transaction properties to suitable expense categories
          const categoryMap: Record<string, string> = {
            'Food': 'Food',
            'Transport': 'Transport',
            'Shopping': 'Shopping',
            'Entertainment': 'Entertainment',
            'Miscellaneous': 'Miscellaneous'
          };
          const category = categoryMap[tx.merchant] || 'Miscellaneous';

          // Insert into expenses database
          await expenseService.createExpense(userId, {
            amount: tx.amount,
            type: tx.type,
            category: category,
            description: tx.description,
            date: tx.date,
            originalCurrency: 'INR',
            source: 'SMS',
            merchant: tx.merchant,
            approved: true,
            duplicateFlag: false,
            smsId: tx.smsId,
            senderId: tx.senderId,
            paymentMethod: tx.paymentMethod,
            accountReference: tx.accountReference,
            transactionTime: tx.transactionTime,
          } as any);
        }

        importedCount++;
      }

      // 3. Update profile fields
      await profileRepository.update(userId, {
        email: profile.email,
        smsTrackingEnabled: true,
        smsPermissionStatus: 'CONNECTED',
        lastSmsSync: nowStr,
        lastSmsScan: nowStr,
        smsImportedCount: profile.smsImportedCount + importedCount,
        smsMessagesScanned: profile.smsMessagesScanned + scannedCount,
      });

      return {
        success: true,
        count: importedCount,
        scanned: scannedCount
      };
    } catch (err) {
      console.error('SMS Sync Service failed:', err);
      return {
        success: false,
        count: 0,
        scanned: 0,
        error: err instanceof Error ? err.message : 'Unknown sync error'
      };
    }
  }

  /**
   * Generates mock SMS messages for simulation on the web browser/test environment
   */
  getMockSMSMessages(): SMSMessage[] {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    return [
      {
        id: 'sms_101',
        address: 'VK-HDFCBK',
        body: 'Alert: Your HDFC Bank Debit Card ending *4321 has been debited for Rs. 1450.00 at Starbucks Cafe on 18-06-2026. Ref: txn99120.',
        date: now - 2 * oneHour
      },
      {
        id: 'sms_102',
        address: 'BP-PHONEPE',
        body: 'UPI Payment of Rs. 45.00 to Chai Point is successful from your SBI Account *9876. Txn ID: P26061821034.',
        date: now - 5 * oneHour
      },
      {
        id: 'sms_103',
        address: 'VK-SBIINB',
        body: 'Dear Customer, Rs. 18,500.00 has been credited to your SBI Account *9876 towards monthly stipend from University. Ref: Stipend2026.',
        date: now - 1 * oneDay
      },
      {
        id: 'sms_104',
        address: 'AD-AMAZON',
        body: 'Order Placed: Amazon Pay of Rs. 2199.00 spent at Amazon India on 17-06-2026. Txn ID: AMZ88329.',
        date: now - 2 * oneDay
      },
      {
        id: 'sms_105',
        address: 'MD-OTPMSG',
        body: 'Do not share this. Your OTP for transaction of Rs. 500.00 is 562109. Valid for 10 minutes.',
        date: now - 10 * 60 * 1000 // OTP message, should be filtered out
      },
      {
        id: 'sms_106',
        address: 'AD-ZOMATO',
        body: 'Hungry? Get 50% discount up to Rs.100 on Zomato. Use code CRAVINGS. Order now!',
        date: now - 1 * oneHour // Promo message, should be filtered out
      }
    ];
  }
}

export const smsService = new SMSService();
