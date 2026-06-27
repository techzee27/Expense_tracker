'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getUnapprovedExpensesAction,
  approveExpenseAction,
  rejectExpenseAction,
  mergeExpenseAction,
  updateExpenseAction,
  getExpensesAction
} from '@/controllers/expense.controller';
import {
  getPendingReceiptsAction,
  approveReceiptAction,
  rejectReceiptAction
} from '@/controllers/ocr.controller';
import { Expense, EXPENSE_CATEGORIES } from '@/models/expense.model';
import { Receipt as ReceiptModel } from '@/models/receipt.model';
import {
  Loader2,
  AlertTriangle,
  Check,
  X,
  Edit2,
  Mail,
  Receipt,
  Smartphone,
  Info,
  Layers,
  ArrowRight,
  Eye,
  FileText
} from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useFinancialData } from '@/components/providers/financial-data-provider';

interface UnifiedReviewItem {
  id: string;
  itemType: 'EXPENSE' | 'RECEIPT';
  source: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  confidenceScore: number;
  fileUrl?: string;
  duplicateFlag?: boolean;
  originalCurrency?: string;
}

export default function ReviewQueuePage() {
  const { format } = useCurrency();
  const { refreshData } = useFinancialData();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UnifiedReviewItem[]>([]);
  const [approvedList, setApprovedList] = useState<Expense[]>([]); // Approved list to support merge targets
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Document Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Modal/Inline Edit state
  const [editingItem, setEditingItem] = useState<UnifiedReviewItem | null>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Food');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Merge modal state
  const [mergingItem, setMergingItem] = useState<UnifiedReviewItem | null>(null);

  const fetchQueue = useCallback(async (uid: string) => {
    setLoading(true);
    
    // Fetch unapproved expenses (SMS, Email, etc.)
    const expensesRes = await getUnapprovedExpensesAction(uid);
    let rawExpenses: Expense[] = [];
    if (expensesRes.success && expensesRes.data) {
      rawExpenses = expensesRes.data;
    }

    // Fetch pending OCR receipts
    const receiptsRes = await getPendingReceiptsAction(uid);
    let rawReceipts: ReceiptModel[] = [];
    if (receiptsRes.success && receiptsRes.data) {
      rawReceipts = receiptsRes.data;
    }

    // Map into unified review list
    const unifiedItems: UnifiedReviewItem[] = [
      ...rawExpenses.map((ex) => ({
        id: ex.id,
        itemType: 'EXPENSE' as const,
        source: ex.source,
        merchant: ex.merchant || 'Unknown Merchant',
        amount: ex.amount,
        date: ex.date,
        category: ex.category || 'Miscellaneous',
        description: ex.description || 'Imported expense transaction',
        confidenceScore: ex.ocrConfidence || ex.emailConfidence || 85,
        fileUrl: ex.receiptUrl || undefined,
        duplicateFlag: ex.duplicateFlag,
      })),
      ...rawReceipts.map((rc) => ({
        id: rc.id,
        itemType: 'RECEIPT' as const,
        source: 'OCR_RECEIPT',
        merchant: rc.merchant || 'Extracted Merchant',
        amount: rc.amount || 0,
        date: rc.date || new Date().toISOString().split('T')[0],
        category: rc.category || 'Miscellaneous',
        description: `Uploaded Receipt: ${rc.merchant || 'Unknown'}`,
        confidenceScore: rc.confidenceScore || 0,
        fileUrl: rc.fileUrl,
        duplicateFlag: false, // We'll verify duplicate check manually or fallback
        originalCurrency: rc.currency || 'USD',
      })),
    ];

    // Sort unified items by date (newest first)
    unifiedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(unifiedItems);
    
    // Fetch some approved expenses to suggest for merge targets
    const approvedResult = await getExpensesAction(uid, { limit: 15 });
    if (approvedResult.success && approvedResult.data) {
      setApprovedList(approvedResult.data.expenses);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchQueue(user.id);
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, [fetchQueue]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleApprove = async (item: UnifiedReviewItem) => {
    if (!userId) return;
    setActionLoading(`approve-${item.id}`);
    
    let result;
    if (item.itemType === 'RECEIPT') {
      result = await approveReceiptAction(item.id, userId, {
        merchant: item.merchant,
        amount: item.amount,
        category: item.category,
        date: item.date,
        description: item.description,
        originalCurrency: item.originalCurrency,
      });
    } else {
      result = await approveExpenseAction(item.id, userId);
    }

    setActionLoading(null);
    if (result.success) {
      showToast('success', 'Transaction approved and saved to dashboard.');
      fetchQueue(userId);
      refreshData();
    } else {
      showToast('error', (result as any).error || 'Failed to approve transaction.');
    }
  };

  const handleReject = async (item: UnifiedReviewItem) => {
    if (!userId) return;
    setActionLoading(`reject-${item.id}`);
    
    let result;
    if (item.itemType === 'RECEIPT') {
      result = await rejectReceiptAction(item.id, userId);
    } else {
      result = await rejectExpenseAction(item.id, userId);
    }

    setActionLoading(null);
    if (result.success) {
      showToast('success', 'Imported item rejected.');
      fetchQueue(userId);
      refreshData();
    } else {
      showToast('error', result.error || 'Failed to reject item.');
    }
  };

  const handleMerge = async (id: string, targetId: string) => {
    if (!userId) return;
    setActionLoading(`merge-${id}`);
    const result = await mergeExpenseAction(id, targetId, userId);
    setActionLoading(null);
    setMergingItem(null);
    if (result.success) {
      showToast('success', 'Transactions successfully merged.');
      fetchQueue(userId);
      refreshData();
    } else {
      showToast('error', result.error || 'Failed to merge transactions.');
    }
  };

  const startEdit = (item: UnifiedReviewItem) => {
    setEditingItem(item);
    setEditMerchant(item.merchant);
    setEditAmount(item.amount.toString());
    setEditCategory(item.category || 'Food');
    setEditDate(item.date);
    setEditDescription(item.description);
  };

  const handleSaveEdit = async () => {
    if (!userId || !editingItem) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('error', 'Please enter a valid positive amount.');
      return;
    }

    setActionLoading('save-edit');
    
    let result;
    if (editingItem.itemType === 'RECEIPT') {
      // Approving a receipt with updated/edited values
      result = await approveReceiptAction(editingItem.id, userId, {
        merchant: editMerchant,
        amount: parsedAmount,
        category: editCategory,
        date: editDate,
        description: editDescription || undefined,
        originalCurrency: editingItem.originalCurrency,
      });
    } else {
      const payload = {
        merchant: editMerchant || null,
        amount: parsedAmount,
        category: editCategory,
        date: editDate,
        description: editDescription || null,
        approved: true, // Auto-approves upon manual editing/reviewing
      };
      result = await updateExpenseAction(editingItem.id, userId, payload);
    }

    setActionLoading(null);
    setEditingItem(null);
    if (result.success) {
      showToast('success', 'Transaction details modified and approved.');
      fetchQueue(userId);
      refreshData();
    } else {
      showToast('error', (result as any).error || 'Failed to update transaction.');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-blue-400" />;
      case 'OCR':
      case 'OCR_RECEIPT':
        return <Receipt className="h-4 w-4 text-emerald-400" />;
      case 'MESSAGE':
        return <Smartphone className="h-4 w-4 text-purple-400" />;
      default:
        return <Info className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score === null || score === undefined) return { label: 'Manual', class: 'text-zinc-400 bg-zinc-500/10' };
    if (score >= 90) return { label: `${score}% High`, class: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' };
    if (score >= 70) return { label: `${score}% Needs Review`, class: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' };
    return { label: `${score}% Low`, class: 'text-red-400 bg-red-500/10 border border-red-500/20' };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Imported Transactions Review</h2>
        <p className="text-sm text-muted-foreground">
          Inspect, adjust, and approve automatically parsed receipts and email items before committing them to your active budget.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
          }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card/20 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="font-bold text-lg text-white">Review Queue is Clear!</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            All transaction imports have been reviewed. Connect your email or upload receipts on the Expense Dashboard to import more.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>{items.length} Item(s) awaiting review</span>
            <span>Confidence Threshold: 70%</span>
          </div>

          <div className="grid gap-4">
            {items.map((tx) => {
              const confidence = getConfidenceLevel(tx.confidenceScore);
              return (
                <div
                  key={`${tx.itemType}-${tx.id}`}
                  className={`rounded-2xl border bg-card/30 p-5 backdrop-blur-md space-y-4 transition-all hover:border-white/10 ${
                    tx.duplicateFlag ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-secondary/40">
                        {getSourceIcon(tx.source)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{tx.merchant}</h4>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          {tx.itemType === 'RECEIPT' ? 'Uploaded Receipt Record' : `${tx.source} parsing record`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.fileUrl && (
                        <button
                          onClick={() => setPreviewUrl(tx.fileUrl || null)}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 bg-secondary/25 border border-border rounded-lg text-muted-foreground hover:text-white hover:bg-secondary/40 transition-all cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> View Original
                        </button>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${confidence.class}`}>
                        {confidence.label}
                      </span>
                    </div>
                  </div>

                  {tx.duplicateFlag && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 leading-normal">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-bold">Possible Duplicate Detected</p>
                        <p className="text-amber-500/70">
                          A similar transaction with the same merchant, amount, and date was found in your history.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="text-base font-bold text-white mt-0.5">
                        {tx.originalCurrency || 'USD'} {tx.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transaction Date</p>
                      <p className="font-semibold text-zinc-300 mt-0.5">{tx.date}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category Suggestion</p>
                      <p className="font-semibold text-zinc-300 mt-0.5">{tx.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Description</p>
                      <p className="font-semibold text-zinc-300 mt-0.5 truncate">{tx.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(tx)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary/20 hover:bg-secondary/40 text-zinc-300 cursor-pointer transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit details
                      </button>
                      
                      {tx.duplicateFlag && (
                        <button
                          onClick={() => setMergingItem(tx)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer transition-colors"
                        >
                          <Layers className="h-3.5 w-3.5" /> Resolve / Merge
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleReject(tx)}
                        disabled={actionLoading !== null}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-destructive-foreground cursor-pointer transition-colors"
                      >
                        {actionLoading === `reject-${tx.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5" /> Reject
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleApprove(tx)}
                        disabled={actionLoading !== null}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                      >
                        {actionLoading === `approve-${tx.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full p-5 space-y-4 shadow-2xl text-white relative">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="font-bold text-base flex items-center gap-1.5">
              <FileText className="h-5 w-5 text-primary" /> Receipt Attachment Preview
            </h4>

            <div className="flex justify-center items-center bg-zinc-950/80 rounded-2xl overflow-hidden p-2 min-h-[300px]">
              {previewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[550px] border-none rounded-xl" />
              ) : (
                <img src={previewUrl} alt="Receipt Attachment" className="max-w-full max-h-[550px] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merge suggested target selector modal */}
      {mergingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Layers className="h-5 w-5" />
                <h4 className="font-bold text-base">Merge Duplicate Record</h4>
              </div>
              <button
                onClick={() => setMergingItem(null)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-zinc-400">
                Choose an existing transaction from dashboard history to merge this imported record into. The duplicate flag will be resolved.
              </p>
              
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-amber-500 font-semibold uppercase">Imported record to merge</span>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="font-bold">{mergingItem.merchant}</span>
                  <span className="font-bold text-white">{format(mergingItem.amount)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>{mergingItem.date}</span>
                  <span>{mergingItem.source}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-zinc-400 font-semibold">Suggested Match Candidates:</span>
              <div className="max-h-[180px] overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 bg-zinc-950/20">
                {approvedList
                  .filter((a) => a.merchant?.toLowerCase() === mergingItem.merchant?.toLowerCase() || a.amount === mergingItem.amount)
                  .map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => handleMerge(mergingItem.id, candidate.id)}
                      className="w-full p-3 text-left hover:bg-zinc-800/40 transition-all flex justify-between items-center text-xs group"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-zinc-300 group-hover:text-white">{candidate.merchant}</p>
                        <p className="text-[10px] text-zinc-500">{candidate.date} • {candidate.category}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{format(candidate.amount)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                
                {approvedList.filter((a) => a.merchant?.toLowerCase() === mergingItem.merchant?.toLowerCase() || a.amount === mergingItem.amount).length === 0 && (
                  <div className="p-4 text-center text-xs text-zinc-600 italic">
                    No matching candidates found in recent history.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                onClick={() => handleApprove(mergingItem)} // Keep both approves the new import as is
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Keep Both
              </button>
              <button
                onClick={() => setMergingItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline edit details modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="font-bold text-base text-white">Review & Edit Details</h4>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Merchant</label>
                <input
                  type="text"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Amount</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading === 'save-edit'}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                {actionLoading === 'save-edit' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Save & Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
