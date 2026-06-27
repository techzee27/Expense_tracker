/**
 * SMS Parsing Service
 * Parses transactional SMS alerts from banks, UPI apps, wallets, and card issuers.
 * Filters out OTPs, spam, and marketing messages.
 */

export interface ParsedSMSTransaction {
  smsId: string;
  senderId: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  merchant: string;
  date: string;
  transactionTime: string;
  accountReference: string | null;
  paymentMethod: 'Bank' | 'UPI' | 'Card' | 'Wallet';
  description: string;
}

export interface SMSMessage {
  id: string;
  address: string; // Sender ID (e.g. "AD-HDFCBK", "VK-SBIINB")
  body: string;    // SMS body
  date: number;    // Epoch timestamp in ms
}

export class SMSParserService {
  // Common spam/promotional keywords to ignore
  private static SPAM_KEYWORDS = [
    'otp', 'one time password', 'verification code', 'verify', 'security code', 
    'login', 'passwd', 'auth', 'discount', 'offer', 'win', 'cashback up to', 
    'loan', 'pre-approved', 'credit limit', 'apply now', 'free', 'reward points',
    'subscribe', 'luck', 'congrats', 'congratulations'
  ];

  /**
   * Determine if an SMS is transactional and should be processed
   */
  isTransactional(body: string): boolean {
    const text = body.toLowerCase();
    
    // Check if it looks like an OTP or spam/promo
    const isSpam = SMSParserService.SPAM_KEYWORDS.some(keyword => text.includes(keyword));
    if (isSpam) {
      // Allow credit card cashbacks if they actually credited money, but general promo is ignored
      if (!text.includes('credited') && !text.includes('received')) {
        return false;
      }
    }

    // Must contain typical transaction terms
    const hasTransactionKeywords = [
      'debited', 'credited', 'spent', 'withdrawn', 'paid', 'sent', 
      'received', 'added', 'refunded', 'deposited', 'transfer', 'txn'
    ].some(keyword => text.includes(keyword));

    // Must contain currency pattern
    const hasCurrency = /(?:rs\.?|inr|usd|inr\.|eur|gbp|a\$)\s*\d+/i.test(text);

    return hasTransactionKeywords && hasCurrency;
  }

  /**
   * Parse a single SMS message
   */
  parseMessage(sms: SMSMessage): ParsedSMSTransaction | null {
    if (!this.isTransactional(sms.body)) {
      return null;
    }

    const body = sms.body;
    const bodyLower = body.toLowerCase();

    // 1. Determine Transaction Type
    let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
    if (
      bodyLower.includes('credited') || 
      bodyLower.includes('received') || 
      bodyLower.includes('deposited') || 
      bodyLower.includes('refunded') ||
      bodyLower.includes('added to wallet')
    ) {
      type = 'INCOME';
    }

    // 2. Extract Amount
    let amount = 0;
    // Match Rs. 100, Rs.100, INR 100, USD 100.50, Rs 10,000.00
    const amountRegex = /(?:rs\.?|inr|usd|eur|gbp|a\$)\s*([\d,]+(?:\.\d{2})?)/i;
    const amountMatch = body.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    if (amount <= 0) {
      return null; // Invalid amount parsed
    }

    // 3. Extract Payment Method
    let paymentMethod: 'Bank' | 'UPI' | 'Card' | 'Wallet' = 'Bank';
    if (bodyLower.includes('upi') || bodyLower.includes('gpay') || bodyLower.includes('phonepe') || bodyLower.includes('paytm u')) {
      paymentMethod = 'UPI';
    } else if (bodyLower.includes('card') || bodyLower.includes('visa') || bodyLower.includes('mastercard') || bodyLower.includes('rupay') || bodyLower.includes('amex')) {
      paymentMethod = 'Card';
    } else if (bodyLower.includes('wallet') || bodyLower.includes('paytm w') || bodyLower.includes('amazon pay')) {
      paymentMethod = 'Wallet';
    }

    // 4. Extract Account Reference (e.g. account ending in *1234 or XX98)
    let accountReference: string | null = null;
    const accountRegex = /(?:a\/c|acct|card|account|bank|vpa|ending)\s*(?:no\.?|ending)?\s*([x*]*\d{3,4}|\S+@\S+)/i;
    const accountMatch = body.match(accountRegex);
    if (accountMatch && accountMatch[1]) {
      accountReference = accountMatch[1].trim();
    }

    // 5. Extract Merchant / Recipient Name
    let merchant = 'Miscellaneous';
    
    // Look for common merchant structures in SMS
    // e.g., "paid to [Merchant]", "debited for [Merchant]", "sent to [Merchant]", "at [Merchant]"
    const merchantPatterns = [
      /(?:paid|sent|transfer|transferred)\s+to\s+([^,.\n]+)/i,
      /(?:spent|used|debited)\s+(?:at|on|for)\s+([^,.\n]+)/i,
      /(?:info|txn)\s*:\s*([^,.\n]+)/i,
      /at\s+([^,.\n]+?)\s+on\s+\d{2}[-/]\d{2}/i,
      /towards\s+([^,.\n]+)/i
    ];

    for (const pattern of merchantPatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        let candidate = match[1].trim();
        // Clean up common suffix noise
        candidate = candidate.replace(/(?:Ref|Txn|Ref|id|using|a\/c|\d{4,}).*/i, '').trim();
        candidate = candidate.replace(/[;.\-*]/g, ' ').trim();
        // Capitalize words
        candidate = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        
        if (candidate.length > 2 && candidate.length < 50 && !candidate.toLowerCase().includes('credited') && !candidate.toLowerCase().includes('debited')) {
          merchant = candidate;
          break;
        }
      }
    }

    // Fallback Merchant classification by Payment provider names
    if (merchant === 'Miscellaneous') {
      if (bodyLower.includes('uber')) merchant = 'Uber';
      else if (bodyLower.includes('swiggy')) merchant = 'Swiggy';
      else if (bodyLower.includes('zomato')) merchant = 'Zomato';
      else if (bodyLower.includes('netflix')) merchant = 'Netflix';
      else if (bodyLower.includes('spotify')) merchant = 'Spotify';
      else if (bodyLower.includes('amazon')) merchant = 'Amazon';
      else if (bodyLower.includes('walmart')) merchant = 'Walmart';
      else if (bodyLower.includes('starbucks')) merchant = 'Starbucks';
    }

    // 6. Set Dates
    const txnDateObj = new Date(sms.date);
    const dateStr = txnDateObj.toISOString().split('T')[0];
    const timeStr = txnDateObj.toISOString();

    return {
      smsId: sms.id,
      senderId: sms.address,
      amount,
      type,
      merchant,
      date: dateStr,
      transactionTime: timeStr,
      accountReference,
      paymentMethod,
      description: `SMS Import: ${type === 'EXPENSE' ? 'Paid to' : 'Received from'} ${merchant} via ${paymentMethod}`
    };
  }

  /**
   * Parse a batch of SMS messages
   */
  parseBatch(messages: SMSMessage[]): ParsedSMSTransaction[] {
    const transactions: ParsedSMSTransaction[] = [];
    for (const msg of messages) {
      try {
        const parsed = this.parseMessage(msg);
        if (parsed) {
          transactions.push(parsed);
        }
      } catch (err) {
        console.error('Error parsing SMS:', msg.id, err);
      }
    }
    return transactions;
  }
}

export const smsParserService = new SMSParserService();
