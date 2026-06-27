'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  X,
  TrendingDown,
  TrendingUp,
  Upload,
  FileText,
  Sparkles,
  Download,
  EyeOff,
  ChevronDown,
  RotateCcw,
  Camera,
} from 'lucide-react';
import {
  getExpensesAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '@/controllers/expense.controller';
import {
  getRecurringExpensesAction,
  createRecurringExpenseAction,
  updateRecurringExpenseAction,
  deleteRecurringExpenseAction,
  processRecurringExpensesAction,
} from '@/controllers/recurring-expense.controller';
import { uploadAndExtractReceiptAction, approveReceiptAction } from '@/controllers/ocr.controller';
import { useFinancialData } from '@/components/providers/financial-data-provider';
import { Expense, EXPENSE_CATEGORIES } from '@/models/expense.model';
import { RecurringExpense } from '@/models/recurring-expense.model';
import { useCurrency } from '@/hooks/use-currency';
import { formatCurrency } from '@/utils/currency';
import { CurrencyDisplay } from '@/components/dashboard/currency-display';

export default function ExpensesPage() {
  const { format, formatHome, currencyCode: profileCurrency } = useCurrency();
  const { refreshData } = useFinancialData();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'log' | 'recurring'>('log');

  // Recurring Expenses states
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringModalMode, setRecurringModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);

  // Recurring Form states
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringType, setRecurringType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [recurringCategory, setRecurringCategory] = useState('Food');
  const [recurringDescription, setRecurringDescription] = useState('');
  const [recurringMerchant, setRecurringMerchant] = useState('');
  const [recurringInterval, setRecurringInterval] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [recurringStartDate, setRecurringStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringCurrency, setRecurringCurrency] = useState('USD');
  const [recurringStatus, setRecurringStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');

  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [month, setMonth] = useState('');
  const [showSolarPicker, setShowSolarPicker] = useState(false);
  const [solarDate, setSolarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [solarRotation, setSolarRotation] = useState(0);
  const [isDraggingSolar, setIsDraggingSolar] = useState(false);
  const [isEditingSolarDate, setIsEditingSolarDate] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 8; // items per page

  // Message states
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formCategory, setFormCategory] = useState('Food');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formMerchant, setFormMerchant] = useState('');

  // Receipt and OCR states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFilename, setReceiptFilename] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [isOcrUsed, setIsOcrUsed] = useState(false);
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isMessageRecord, setIsMessageRecord] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<boolean>(false);

  // Camera Capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Stop camera tracks automatically when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);
      setCapturedPhotoUrl(null);
      setCameraError(null);
    }
  }, [isModalOpen, cameraStream]);

  // Bind video stream to <video> when camera becomes active
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhotoUrl(null);
    setIsCameraActive(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please check permissions or upload a file.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Canvas optimization: Resize large captures to speed up processing
    const maxDim = 1600;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      // Compress frame as JPEG (0.85 quality) to optimize file size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhotoUrl(dataUrl);
    }
  };

  const retakePhoto = () => {
    setCapturedPhotoUrl(null);
  };

  const usePhoto = () => {
    if (!capturedPhotoUrl) return;
    
    fetch(capturedPhotoUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `captured_receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setReceiptFile(file);
        setReceiptFilename(file.name);
        setReceiptUrl(capturedPhotoUrl);
        setOcrConfidence(null);
        setIsOcrUsed(false);
        stopCamera();
      })
      .catch((err) => {
        console.error('Error converting captured photo:', err);
        setCameraError('Failed to process captured photo. Please try again.');
      });
  };

  const [validationError, setValidationError] = useState('');

  // Solar system date picker helpers
  const solarSystemRef = React.useRef<HTMLDivElement>(null);
  const lastAngleRef = React.useRef<number | null>(null);

  const getDisplayMonth = () => {
    if (!month) return '';
    const [year, m] = month.split('-');
    const dateObj = new Date(parseInt(year), parseInt(m) - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const syncRotationFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const base = new Date(new Date().getFullYear(), 0, 1);
    const diffDays = (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
    const rotation = (diffDays / 365.25) * 360;
    setSolarRotation(rotation);
  };

  const handleSolarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSolar(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (!solarSystemRef.current) return;
    const rect = solarSystemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    lastAngleRef.current = angle;
  };

  const handleSolarPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSolar) return;
    updateSolarRotation(e);
  };

  const handleSolarPointerUp = (e: React.PointerEvent) => {
    setIsDraggingSolar(false);
    lastAngleRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateSolarRotation = (e: React.PointerEvent) => {
    if (!solarSystemRef.current || lastAngleRef.current === null) return;
    const rect = solarSystemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let diff = angle - lastAngleRef.current;

    // Normalize boundary wrap around (e.g. crossing 360/0)
    if (diff < -180) {
      diff += 360;
    } else if (diff > 180) {
      diff -= 360;
    }

    setSolarRotation((prevRotation) => {
      const newRotation = prevRotation + diff;

      // Map rotation back to date
      const base = new Date(new Date().getFullYear(), 0, 1);
      const diffDays = (newRotation / 360) * 365.25;
      const targetDate = new Date(base.getTime() + Math.round(diffDays) * 24 * 60 * 60 * 1000);
      setSolarDate(targetDate.toISOString().split('T')[0]);

      return newRotation;
    });

    lastAngleRef.current = angle;
  };

  // Sync rotation when picker is opened
  useEffect(() => {
    if (showSolarPicker) {
      syncRotationFromDate(solarDate);
    }
  }, [showSolarPicker]);

  // Fetch session user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Update form currency when profile currency loads/changes
  useEffect(() => {
    if (profileCurrency) {
      setFormCurrency(profileCurrency);
    }
  }, [profileCurrency]);

  // Fetch expenses function
  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getExpensesAction(userId, {
      search: search || undefined,
      category: category || undefined,
      type: type || undefined,
      source: sourceFilter || undefined,
      month: month || undefined,
      page,
      limit,
    });

    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setTotal(result.data.total);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to fetch expenses' });
    }
    setLoading(false);
  }, [userId, search, category, type, sourceFilter, month, page, limit]);

  // Fetch recurring expenses
  const fetchRecurringExpenses = useCallback(async () => {
    if (!userId) return;
    setLoadingRecurring(true);
    const result = await getRecurringExpensesAction(userId);
    if (result.success && result.data) {
      setRecurringExpenses(result.data);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to fetch recurring expenses' });
    }
    setLoadingRecurring(false);
  }, [userId]);

  // Load expenses and check recurring on mount/user change
  useEffect(() => {
    const initData = async () => {
      if (userId) {
        setLoading(true);
        // Process any due recurring expenses first
        await processRecurringExpensesAction(userId);
        // Fetch fresh logs
        await Promise.all([fetchExpenses(), fetchRecurringExpenses()]);
        setLoading(false);
      }
    };
    initData();
  }, [userId, fetchExpenses, fetchRecurringExpenses]);

  // Load expenses when filters/page/user changes
  useEffect(() => {
    if (userId) {
      fetchExpenses();
    }
  }, [userId, fetchExpenses]);

  // Handle open modal
  const openModal = (mode: 'create' | 'edit' | 'view', expense?: Expense) => {
    setModalMode(mode);
    setValidationError('');
    setPreviewReceipt(false);

    if (expense) {
      setSelectedExpense(expense);
      setFormAmount(expense.originalAmount !== undefined ? expense.originalAmount.toString() : expense.amount.toString());
      setFormType(expense.type);
      setFormCategory(expense.category);
      setFormDescription(expense.description || '');
      setFormDate(expense.date);
      setFormCurrency(expense.originalCurrency || profileCurrency);

      // Populate new fields
      setFormMerchant(expense.merchant || '');
      setReceiptFilename(expense.receiptFilename || null);
      setReceiptUrl(expense.receiptUrl || null);
      setOcrConfidence(expense.ocrConfidence || null);
      setIsOcrUsed(expense.source === 'OCR' || expense.source === 'OCR_RECEIPT');
      setIsMessageRecord(expense.source === 'MESSAGE');
    } else {
      setSelectedExpense(null);
      setFormAmount('');
      setFormType('EXPENSE');
      setFormCategory('Food');
      setFormDescription('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormCurrency(profileCurrency);

      // Reset new fields
      setFormMerchant('');
      setReceiptFilename(null);
      setReceiptUrl(null);
      setOcrConfidence(null);
      setIsOcrUsed(false);
      setIsMessageRecord(false);
      setReceiptId(null);
    }
    setIsModalOpen(true);
  };

  // Submit expense (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validate inputs
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive amount.');
      return;
    }
    if (!formCategory) {
      setValidationError('Category is required.');
      return;
    }
    if (!formDate) {
      setValidationError('Date is required.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    // Determine final source logic
    let finalSource: 'MANUAL' | 'MESSAGE' | 'OCR_RECEIPT' | 'EMAIL' = 'MANUAL';
    if (isMessageRecord) {
      finalSource = 'MESSAGE';
    } else if (receiptFilename && isOcrUsed) {
      finalSource = 'OCR_RECEIPT';
    }

    const payload = {
      amount: parsedAmount,
      type: formType,
      category: formCategory,
      description: formDescription || null,
      date: formDate,
      originalCurrency: formCurrency,
      merchant: formMerchant || null,
      source: finalSource,
      receiptFilename: receiptFilename || null,
      receiptUrl: receiptUrl || null,
      ocrConfidence: ocrConfidence || null,
    };

    let result;
    if (modalMode === 'create') {
      if (receiptId) {
        result = await approveReceiptAction(receiptId, userId, {
          merchant: payload.merchant || 'Miscellaneous',
          amount: payload.amount,
          category: payload.category,
          date: payload.date,
          description: payload.description || undefined,
          originalCurrency: payload.originalCurrency,
        });
      } else {
        result = await createExpenseAction(userId, payload);
      }
    } else if (modalMode === 'edit' && selectedExpense) {
      result = await updateExpenseAction(selectedExpense.id, userId, payload);
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Expense successfully ${modalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsModalOpen(false);
      fetchExpenses();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save changes.');
    }
  };

  // Delete expense
  const handleDelete = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this record?')) return;
    setLoading(true);
    const result = await deleteExpenseAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Expense successfully deleted.' });
      fetchExpenses();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete expense.' });
      setLoading(false);
    }
  };

  // Recurring Handlers
  const openRecurringModal = (mode: 'create' | 'edit', recurring?: RecurringExpense) => {
    setRecurringModalMode(mode);
    setValidationError('');
    
    if (recurring) {
      setSelectedRecurring(recurring);
      setRecurringAmount(recurring.originalAmount.toString());
      setRecurringType(recurring.type);
      setRecurringCategory(recurring.category);
      setRecurringDescription(recurring.description || '');
      setRecurringMerchant(recurring.merchant || '');
      setRecurringInterval(recurring.interval);
      setRecurringStartDate(recurring.startDate);
      setRecurringEndDate(recurring.endDate || '');
      setRecurringCurrency(recurring.originalCurrency);
      setRecurringStatus(recurring.status);
    } else {
      setSelectedRecurring(null);
      setRecurringAmount('');
      setRecurringType('EXPENSE');
      setRecurringCategory('Food');
      setRecurringDescription('');
      setRecurringMerchant('');
      setRecurringInterval('MONTHLY');
      setRecurringStartDate(new Date().toISOString().split('T')[0]);
      setRecurringEndDate('');
      setRecurringCurrency(profileCurrency || 'USD');
      setRecurringStatus('ACTIVE');
    }
    setIsRecurringModalOpen(true);
  };

  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const parsedAmount = parseFloat(recurringAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Amount must be a positive number.');
      return;
    }
    if (!recurringStartDate) {
      setValidationError('Start date is required.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const payload = {
      amount: parsedAmount,
      type: recurringType,
      category: recurringCategory,
      description: recurringDescription || null,
      merchant: recurringMerchant || null,
      interval: recurringInterval,
      startDate: recurringStartDate,
      endDate: recurringEndDate || null,
      originalCurrency: recurringCurrency,
      status: recurringStatus,
    };

    let result;
    if (recurringModalMode === 'create') {
      result = await createRecurringExpenseAction(userId, payload);
    } else if (recurringModalMode === 'edit' && selectedRecurring) {
      result = await updateRecurringExpenseAction(selectedRecurring.id, userId, payload);
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Recurring expense successfully ${recurringModalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsRecurringModalOpen(false);
      fetchRecurringExpenses();
      fetchExpenses(); // In case processing generated new expenses
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save recurring expense.');
    }
  };

  const handleRecurringDelete = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this recurring expense schedule? This will not delete previously generated expenses.')) return;
    setLoadingRecurring(true);
    const result = await deleteRecurringExpenseAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Recurring expense successfully deleted.' });
      fetchRecurringExpenses();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete recurring expense.' });
      setLoadingRecurring(false);
    }
  };

  const handleToggleStatus = async (recurring: RecurringExpense) => {
    if (!userId) return;
    const nextStatus = recurring.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const result = await updateRecurringExpenseAction(recurring.id, userId, { status: nextStatus });
    if (result.success) {
      setMessage({ type: 'success', text: `Recurring expense ${nextStatus === 'ACTIVE' ? 'resumed' : 'paused'}.` });
      fetchRecurringExpenses();
      fetchExpenses();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update status.' });
    }
  };

  // Production-Ready Receipt Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setValidationError('File size exceeds the 10 MB limit.');
        return;
      }
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setValidationError('Invalid file type. Supported types: JPG, JPEG, PNG, WEBP, PDF');
        return;
      }
      setReceiptFile(file);
      setReceiptFilename(file.name);
      setReceiptUrl(URL.createObjectURL(file));
      setOcrConfidence(null);
      setIsOcrUsed(false);
      setValidationError('');
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setValidationError('File size exceeds the 10 MB limit.');
        return;
      }
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        setReceiptFile(file);
        setReceiptFilename(file.name);
        setReceiptUrl(URL.createObjectURL(file));
        setOcrConfidence(null);
        setIsOcrUsed(false);
        setValidationError('');
      } else {
        setValidationError('Invalid file type. Supported types: JPG, JPEG, PNG, WEBP, PDF');
      }
    }
  };

  // Production OCR Extraction Handler
  const handleOcrExtraction = async () => {
    if (!receiptFile) {
      setValidationError('Please select or drop a file first.');
      return;
    }
    setOcrExtracting(true);
    setValidationError('');

    const formData = new FormData();
    formData.append('file', receiptFile);

    const result = await uploadAndExtractReceiptAction(formData);
    setOcrExtracting(false);

    if (result.success && result.data) {
      const data = result.data;
      setOcrConfidence(data.confidenceScore);
      setIsOcrUsed(true);
      setReceiptId(data.id);
      
      // Notify the user about pending review queue state
      setMessage({
        type: 'success',
        text: `Receipt successfully uploaded & parsed! Confidence: ${data.confidenceScore}%. It is now awaiting review in the Review Queue.`
      });

      // Auto-fill manual entry form for convenience
      setFormMerchant(data.merchant || '');
      setFormAmount(data.amount ? data.amount.toString() : '');
      setFormDate(data.date || '');
      setFormCategory(data.category || 'Food');
      setFormCurrency(data.currency || 'USD');
      setFormDescription(`Purchased from ${data.merchant || 'Unknown'}`);
      
      // Reset receipt file reference so form can be submitted or another uploaded
      setReceiptFile(null);
    } else {
      setValidationError(result.error || 'Failed to process receipt via OCR engine.');
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'MESSAGE':
        return 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
      case 'OCR':
      case 'OCR_RECEIPT':
        return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
      case 'EMAIL':
        return 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
      case 'RECURRING':
        return 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400';
      case 'MANUAL':
      default:
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'MESSAGE':
        return 'Message Record';
      case 'OCR':
      case 'OCR_RECEIPT':
        return 'OCR Receipt';
      case 'EMAIL':
        return 'Email Record';
      case 'RECURRING':
        return 'Recurring';
      case 'MANUAL':
      default:
        return 'Manual Entry';
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Loading screen
  if (!userId && loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">Please sign in to view your expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .solar-system {
          width: 240px;
          height: 240px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0;
        }
        .solar-system-rotate {
          width: 180px;
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          touch-action: none;
        }
        .solar-system-rotate:active {
          cursor: grabbing;
        }
        .solar-system-dash {
          position: absolute;
          width: 180px;
          height: 180px;
          fill: none;
          stroke: rgba(255, 255, 255, 0.25);
        }
        .earth {
          position: absolute;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .earth::before,
        .earth::after {
          content: "";
          width: 20px;
          height: 20px;
          position: absolute;
          background: rgba(200, 228, 255, 0.15);
          border-radius: 50%;
        }
        .earth::before {
          transform: scale(1.25);
        }
        .earth::after {
          transform: scale(1.5);
        }
        .earth-dash {
          position: absolute;
          width: 44px;
          height: 44px;
          fill: none;
          stroke: rgba(255, 255, 255, 0.25);
        }
        .earth-planet {
          width: 20px;
          height: 20px;
          z-index: 2;
        }
        .moon {
          width: 6.5px;
          height: 6.5px;
          background-color: #f2e6f6;
          position: absolute;
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(242, 230, 247, 0.35);
        }
        .sun {
          position: absolute;
          width: 44px;
          height: 44px;
          pointer-events: none;
        }
        .sun .blur {
          width: 44px;
          height: 44px;
          position: absolute;
          border-radius: 50%;
          background-color: #fcd385;
          opacity: 0.2;
        }
        .sun .blur-1 {
          animation: sun-blur 3s linear 0s infinite;
        }
        .sun .blur-2 {
          animation: sun-blur 3s linear -1s infinite;
        }
        .sun .blur-3 {
          animation: sun-blur 3s linear -2s infinite;
        }
        @keyframes sun-blur {
          0% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            opacity: 0.12;
          }
          100% {
            transform: scale(1.95);
            opacity: 0;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Expense Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily transactions, view academic expenses, and balance your budget.
          </p>
        </div>
        {activeTab === 'log' ? (
          <button
            onClick={() => openModal('create')}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full md:w-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        ) : (
          <button
            onClick={() => openRecurringModal('create')}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full md:w-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Recurring
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/80 pb-2 relative z-10">
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'log'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Expenses Log
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'recurring'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Recurring Expenses
        </button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
            }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {activeTab === 'log' ? (
        <>
          {/* Filters Bar */}
          <div className="relative z-20 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 rounded-2xl border border-border/80 bg-card/45 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-primary/20">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search details..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-foreground placeholder-muted-foreground/70"
              />
            </div>

            {/* Type Filter */}
            <div className="relative group">
              <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'INCOME' | 'EXPENSE' | '');
                  setPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 appearance-none cursor-pointer text-foreground/90 font-medium"
              >
                <option value="">All Types</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors duration-200" />
            </div>

            {/* Category Filter */}
            <div className="relative group">
              <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 appearance-none cursor-pointer text-foreground/90 font-medium"
              >
                <option value="">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors duration-200" />
            </div>

            {/* Source Filter */}
            <div className="relative group">
              <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 appearance-none cursor-pointer text-foreground/90 font-medium"
              >
                <option value="">All Sources</option>
                <option value="MANUAL">Manual Entry</option>
                <option value="MESSAGE">Message Record</option>
                <option value="OCR">OCR Receipt</option>
                <option value="EMAIL">Email Record</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors duration-200" />
            </div>

            {/* Monthly Filter */}
            <div className={`relative group ${showSolarPicker ? 'z-50' : 'z-10'}`}>
              <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <input
                type="text"
                readOnly
                placeholder="Filter by Month"
                value={getDisplayMonth()}
                onClick={() => setShowSolarPicker(!showSolarPicker)}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 cursor-pointer text-foreground/90 font-medium hover:border-primary/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              />
              <button
                type="button"
                onClick={() => setShowSolarPicker(!showSolarPicker)}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >

              </button>

              {/* Solar system date picker Popover */}
              {showSolarPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 bg-[#1e2330]/60 backdrop-blur-2xl border border-white/15 rounded-[24px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] w-[320px] flex flex-col items-center select-none text-white">
                  {/* Selected date header */}
                  <div className="text-center text-[15px] font-semibold text-white pb-3 border-b border-white/10 w-full mb-4 flex justify-center items-center min-h-[36px]">
                    {isEditingSolarDate ? (
                      <input
                        type="date"
                        value={solarDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setSolarDate(val);
                            syncRotationFromDate(val);
                          }
                        }}
                        onBlur={() => setIsEditingSolarDate(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingSolarDate(false);
                          }
                        }}
                        autoFocus
                        className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-primary w-full max-w-[200px]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingSolarDate(true)}
                        className="cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
                        title="Click to change date"
                      >
                        <span>
                          {(() => {
                            const d = new Date(solarDate);
                            return isNaN(d.getTime()) ? 'Select Date' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          })()}
                        </span>
                        <Edit2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                      </button>
                    )}
                  </div>

                  {/* Solar System widget */}
                  <div
                    ref={solarSystemRef}
                    onPointerDown={handleSolarPointerDown}
                    onPointerMove={handleSolarPointerMove}
                    onPointerUp={handleSolarPointerUp}
                    className="solar-system"
                  >
                    <div className="solar-system-rotate" style={{ transform: `rotate(${solarRotation}deg)` }}>
                      <svg className="solar-system-dash" viewBox="0 0 162 162">
                        <circle cx="81" cy="81" r="80" strokeDasharray="3 3" />
                      </svg>

                      <div className="earth" style={{ transform: 'translate(90px, 0)' }}>
                        <svg className="earth-dash" viewBox="0 0 43 43" style={{ transform: `rotate(${-solarRotation * 3}deg)` }}>
                          <circle cx="21.5" cy="21.5" r="20.5" strokeDasharray="3 3" />
                        </svg>

                        <svg className="earth-planet" viewBox="0 0 19 19">
                          <circle cx="9.5" cy="9.5" r="9.5" fill="#C8E4FF" />
                          <g fill="#72D172">
                            <path d="M0 9.5a9.5 9.5 0 0 0 .8 3.9l.8.3s.6.3.7.1c.4-.7-.3-2-.3-2a3 3 0 0 0-.2-.9c-.1-.3-.9-.6-.9-.6s-.7-1.2-.7-1.9c0-.3.1-.6.3-.8s.5-.3.8-.4c.2 0 .4-.1.6-.3s.4-.3.5-.5s.9-.2 1.1-.6-.2-1.3-.2-1.3l.1-.9a2 2 0 0 0-.5-.5c-.2-.6-.6-1.1-1.1-1.5A9.5 9.5 0 0 0 0 9.5Z" />
                            <path d="M9.5 0a9.5 9.5 0 0 0-.8 0c-.1.3-.5 1-.4 1.3s1 .6 1 .6s-.2.9.2 1.2.7-.4.9-.3c.2.1.2 1.7.2 1.7s.8.9 1.6 1c.7.1 1.9-1.2 1.9-1.2A9.5 9.5 0 0 0 9.5 0Z" />
                            <path d="M16.5 10.1c.2.5-.4 1.8-.9 2.1-.5.2-1 .6-1.3 1-.2.3-.5 1.5-1.1 1.8s-1.5 1.4-2.3 1.2c-.8-.2-.8-2-.3-2.9a2 2 0 0 0 0-2c0-.4-1.2-1.1-1.2-1.5s1.3-3 1.3-3a3.5 3.5 0 0 1 1.4-.3c.3.1.6.3.9.5.6 0 1.2.1 1.7.3l.6.6s1.6.6 1.8 1.1Z" />
                          </g>
                        </svg>

                        <div className="moon" style={{ transform: `rotate(${solarRotation * 4}deg) translate(21.5px, 0)` }}></div>
                      </div>
                    </div>

                    <div className="sun">
                      <div className="blur blur-1"></div>
                      <div className="blur blur-2"></div>
                      <div className="blur blur-3"></div>
                      <svg viewBox="0 0 40 40" className="w-10 h-10 display-block relative z-10">
                        <circle cx="20" cy="20" r="20" fill="#FCD385" />
                        <circle cx="20" cy="20" r="19.5" stroke="white" strokeOpacity="0.3" fill="none" />
                        <g fill="#FCBF77">
                          <path d="M31.6 19.2c-.3-1.7 1-3.2 2.7-3.2 1.5 0 2.7 1.2 2.7 2.7v1.5c0 .5-.1 1-.3 1.5l-1.5 3.7c-.1.4-.4.7-.7 1-1.9 1.5-4.6-.5-3.6-2.8l.8-1.8c.2-.5.3-1.1.2-1.7l-.3-.9Z" />
                          <path d="M14.7 30c2.2 1.3 3.7 1.7 2.9 3.2-.7 1.3-3.7 1.8-5 1.1l-1-.5a8 8 0 0 1-2.8-2.5c-1.2-1.8-1.8-4 1-6l.8.8c.9.8 1.5 1.5 1.7 2.3Z" />
                          <path d="M18 14.5c0 1.9-4 5-6 5s-1.5-3-1-5c.5-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5Z" />
                          <circle cx="18" cy="9" r="1" />
                          <circle cx="20" cy="12.5" r="1" />
                          <circle cx="29.6" cy="19.2" r="1" />
                        </g>
                      </svg>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 w-full mt-6">
                    <button
                      type="button"
                      onClick={() => setShowSolarPicker(false)}
                      className="flex-1 py-2.5 bg-white/5 border border-white/25 hover:bg-white/10 text-white rounded-full font-semibold text-xs transition-all cursor-pointer text-center active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMonth(solarDate.substring(0, 7));
                        setPage(1);
                        setShowSolarPicker(false);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#FCA274] to-[#FD8A6B] hover:opacity-90 text-white rounded-full font-semibold text-xs transition-all cursor-pointer text-center shadow-[0_4px_15px_rgba(253,138,107,0.3)] active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setType('');
                setSourceFilter('');
                setMonth('');
                setPage(1);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-secondary/15 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-secondary/30 hover:border-primary/30 transition-all active:scale-95 duration-200 shadow-sm cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>

          {/* Expenses Table/Grid */}
          <div className="relative z-10 rounded-2xl border border-border bg-card/30 backdrop-blur-md overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading transactions...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="font-bold text-lg">No records found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No transactions match your current filters. Try resetting them or add a new expense.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-secondary/10 transition-colors duration-150 text-sm"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-muted-foreground">
                          {expense.date}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground truncate max-w-[200px]">
                          <div className="flex flex-col">
                            <span>{expense.description || '-'}</span>
                            {expense.merchant && (
                              <span className="text-[11px] text-muted-foreground font-normal">
                                @ {expense.merchant}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded-lg bg-secondary/30 px-2.5 py-1 text-xs font-medium text-foreground/80">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${expense.type === 'INCOME' ? 'text-emerald-400' : 'text-purple-400'
                              }`}
                          >
                            {expense.type === 'INCOME' ? (
                              <>
                                <TrendingUp className="h-3.5 w-3.5" />
                                Income
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-3.5 w-3.5" />
                                Expense
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSourceBadgeClass(expense.source)}`}>
                            {getSourceLabel(expense.source)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right flex flex-col items-end justify-center">
                          <div className={`font-bold ${expense.type === 'INCOME' ? 'text-emerald-400' : 'text-foreground'}`}>
                            {expense.type === 'INCOME' ? '+' : '-'}{format(expense.amount)}
                          </div>
                          {formatHome(expense.amount) && (
                            <div className="text-[10px] text-muted-foreground font-semibold">
                              {expense.type === 'INCOME' ? '+' : '-'}{formatHome(expense.amount)?.replace('≈ ', '')}
                            </div>
                          )}
                          {expense.originalCurrency && expense.originalCurrency !== profileCurrency && (
                            <div className="text-[10px] text-muted-foreground font-semibold">
                              ({expense.type === 'INCOME' ? '+' : '-'}{formatCurrency(expense.originalAmount, expense.originalCurrency)})
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openModal('view', expense)}
                              className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', expense)}
                              className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {!loading && expenses.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-secondary/5">
                <p className="text-xs text-muted-foreground">
                  Showing page <span className="font-semibold">{page}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span> ({total} total items)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="relative z-10 rounded-2xl border border-border bg-card/30 backdrop-blur-md overflow-hidden">
          {loadingRecurring ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading recurring schedules...</p>
            </div>
          ) : recurringExpenses.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="font-bold text-lg">No recurring schedules</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You haven't set up any recurring expenses. Create one to automatically track regular subscriptions, rent, etc.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-4">Interval</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Next Due Date</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recurringExpenses.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-secondary/10 transition-colors duration-150 text-sm"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="rounded-lg bg-primary/10 border border-primary/25 px-2.5 py-1 text-xs font-bold text-primary">
                          {rec.interval}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground truncate max-w-[200px]">
                        <div className="flex flex-col">
                          <span>{rec.description || `Recurring ${rec.category}`}</span>
                          {rec.merchant && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              @ {rec.merchant}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="rounded-lg bg-secondary/30 px-2.5 py-1 text-xs font-medium text-foreground/80">
                          {rec.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-muted-foreground">
                        {rec.nextDueDate}
                        {rec.lastProcessedDate && (
                          <div className="text-[10px] text-muted-foreground">
                            Last: {rec.lastProcessedDate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`font-bold ${rec.type === 'INCOME' ? 'text-emerald-400' : 'text-foreground'}`}>
                          {rec.type === 'INCOME' ? '+' : '-'}{format(rec.amount)}
                        </div>
                        {rec.originalCurrency && rec.originalCurrency !== profileCurrency && (
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            ({rec.type === 'INCOME' ? '+' : '-'}{formatCurrency(rec.originalAmount, rec.originalCurrency)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleStatus(rec)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                            rec.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/25'
                          }`}
                        >
                          {rec.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRecurringModal('edit', rec)}
                            className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRecurringDelete(rec.id)}
                            className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal - Create/Edit/View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {modalMode === 'create' && 'Add Transaction'}
                {modalMode === 'edit' && 'Edit Transaction'}
                {modalMode === 'view' && 'Transaction Details'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}
              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalAmount">
                    Amount
                  </label>
                  <input
                    id="modalAmount"
                    type="number"
                    step="0.01"
                    placeholder="25.50"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    required
                  />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalCurrency">
                    Currency
                  </label>
                  <select
                    id="modalCurrency"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    required
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'].map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Converted home currency display for view mode */}
              {modalMode === 'view' && selectedExpense && (
                <div className="p-3 bg-secondary/15 rounded-xl border border-border/30 text-xs flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Home Currency Equivalent:</span>
                  <CurrencyDisplay amount={selectedExpense.amount} primaryClassName="font-bold text-foreground text-sm" />
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalCategory">
                  Category
                </label>
                <select
                  id="modalCategory"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchant (New field inserted between Category and Date) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalMerchant">
                  Merchant
                </label>
                <input
                  id="modalMerchant"
                  type="text"
                  placeholder="Enter merchant/company name"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDate">
                  Date
                </label>
                <input
                  id="modalDate"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDescription">
                  Description
                </label>
                <textarea
                  id="modalDescription"
                  placeholder="E.g., Campus cafeteria dinner with friends"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={modalMode === 'view'}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                />
              </div>

              {/* Additional Details for VIEW Mode */}
              {modalMode === 'view' && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/10 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Source:</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${getSourceBadgeClass(selectedExpense?.source || 'MANUAL')}`}>
                      {getSourceLabel(selectedExpense?.source || 'MANUAL')}
                    </span>
                  </div>
                  {selectedExpense?.ocrConfidence !== null && selectedExpense?.ocrConfidence !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">OCR Confidence:</span>
                      <span className={`font-bold ${selectedExpense.ocrConfidence >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedExpense.ocrConfidence}% ({selectedExpense.ocrConfidence >= 80 ? 'Successfully Extracted' : 'Needs Review'})
                      </span>
                    </div>
                  )}
                  {selectedExpense?.receiptFilename && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">Receipt File:</span>
                        <span className="font-semibold text-foreground/80 max-w-[200px] truncate flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          {selectedExpense.receiptFilename}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt(true)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-secondary/20 hover:bg-secondary/40 border border-border rounded-lg font-semibold text-[11px] transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          View Receipt
                        </button>
                        <a
                          href={selectedExpense.receiptUrl || '#'}
                          download={selectedExpense.receiptFilename}
                          onClick={(e) => {
                            if (!selectedExpense.receiptUrl) e.preventDefault();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-secondary/20 hover:bg-secondary/40 border border-border rounded-lg font-semibold text-[11px] transition-all cursor-pointer text-foreground"
                        >
                          <Download className="h-3.5 w-3.5 text-primary" />
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Receipt Upload & OCR Section (Create / Edit Mode only) */}
              {modalMode !== 'view' && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Add Receipt</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="smsRecordToggle"
                        checked={isMessageRecord}
                        onChange={(e) => {
                          setIsMessageRecord(e.target.checked);
                          if (e.target.checked) {
                            // Clear receipt if SMS is toggled
                            setReceiptFilename(null);
                            setReceiptUrl(null);
                            setOcrConfidence(null);
                            setIsOcrUsed(false);
                          }
                        }}
                        className="h-4 w-4 rounded border border-border bg-secondary/30 accent-primary shrink-0 cursor-pointer"
                      />
                      <label htmlFor="smsRecordToggle" className="text-[11px] text-muted-foreground cursor-pointer font-semibold">
                        Simulate Message Record Source
                      </label>
                    </div>
                  </div>

                  {isCameraActive ? (
                    <div className="relative border border-border rounded-xl bg-[#0b0c10] overflow-hidden flex flex-col items-center p-3">
                      {cameraError && (
                        <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg w-full mb-3 text-center">
                          {cameraError}
                        </div>
                      )}
                      
                      {!capturedPhotoUrl ? (
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-lg pointer-events-none flex items-center justify-center">
                            <span className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded-full font-bold">Align receipt here</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={capturedPhotoUrl}
                            alt="Captured Receipt"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex justify-center gap-3 mt-3 w-full">
                        {!capturedPhotoUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="px-4 py-2 bg-primary rounded-xl text-xs font-bold text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                            >
                              Capture Photo
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-4 py-2 bg-secondary/30 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={usePhoto}
                              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer"
                            >
                              Use Photo
                            </button>
                            <button
                              type="button"
                              onClick={retakePhoto}
                              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-500/30 transition-all cursor-pointer"
                            >
                              Retake
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-4 py-2 bg-secondary/30 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground leading-normal mt-2.5 bg-secondary/15 p-2.5 rounded-lg border border-border/40 w-full text-center">
                        <p className="font-bold mb-1">Tips for a good capture:</p>
                        <ul className="list-disc list-inside text-left inline-block space-y-0.5">
                          <li>Improve lighting (avoid shadows)</li>
                          <li>Keep the receipt flat</li>
                          <li>Ensure all text and numbers are visible</li>
                        </ul>
                      </div>
                    </div>
                  ) : !receiptFilename ? (
                    <div className="flex gap-3">
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="flex-1 relative border border-dashed border-border/80 rounded-xl p-4 text-center hover:bg-secondary/10 transition-colors cursor-pointer group"
                      >
                         <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          onChange={handleFileUpload}
                          disabled={isMessageRecord}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Upload className="mx-auto h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                        <span className="text-xs font-semibold text-foreground/80 block mb-0.5">
                          Upload File
                        </span>
                        <span className="text-[9px] text-muted-foreground block">
                          Drag & drop here
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isMessageRecord}
                        onClick={startCamera}
                        className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/80 rounded-xl p-4 text-center hover:bg-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                      >
                        <Camera className="mx-auto h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                        <span className="text-xs font-semibold text-foreground/80 block mb-0.5">
                          Take Photo
                        </span>
                        <span className="text-[9px] text-muted-foreground block">
                          Use device camera
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/10 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
                          <span className="text-xs font-bold text-foreground truncate max-w-[220px]">
                            {receiptFilename}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewReceipt(true)}
                            className="text-xs px-2.5 py-1 bg-secondary/25 border border-border rounded-lg font-semibold hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptFilename(null);
                              setReceiptUrl(null);
                              setOcrConfidence(null);
                              setIsOcrUsed(false);
                            }}
                            className="text-xs p-1 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 text-destructive-foreground transition-all cursor-pointer"
                            title="Remove File"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* OCR Extraction Trigger */}
                      <div className="flex items-center gap-2.5 pt-1 border-t border-border/40 mt-1">
                        <button
                          type="button"
                          onClick={handleOcrExtraction}
                          disabled={ocrExtracting}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/15 border border-purple-500/20 hover:bg-purple-500/25 rounded-lg text-[11px] font-bold text-purple-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                        >
                          {ocrExtracting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-purple-400" />
                              Extract Receipt Details
                            </>
                          )}
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          Auto-fills form via simulated OCR
                        </span>
                      </div>
                    </div>
                  )}

                  {/* OCR Confidence Display */}
                  {ocrConfidence !== null && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg text-[11px] font-semibold bg-secondary/25 border border-border">
                      <div className="flex items-center gap-1">
                        <span>OCR Status:</span>
                        {ocrConfidence >= 80 ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            ✓ Successfully Extracted
                          </span>
                        ) : (
                          <span className="text-amber-400">Needs Review</span>
                        )}
                      </div>
                      <div>
                        Confidence:{' '}
                        <span className={ocrConfidence >= 80 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {ocrConfidence}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Transaction'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Expense Modal - Create/Edit */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {recurringModalMode === 'create' ? 'Add Recurring Expense' : 'Edit Recurring Expense'}
              </h3>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecurringSubmit} className="space-y-4 overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}
              
              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="recAmount">
                    Amount
                  </label>
                  <input
                    id="recAmount"
                    type="number"
                    step="0.01"
                    placeholder="25.50"
                    value={recurringAmount}
                    onChange={(e) => setRecurringAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="recCurrency">
                    Currency
                  </label>
                  <select
                    id="recCurrency"
                    value={recurringCurrency}
                    onChange={(e) => setRecurringCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'].map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recType">
                  Type
                </label>
                <select
                  id="recType"
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value as 'INCOME' | 'EXPENSE')}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recCategory">
                  Category
                </label>
                <select
                  id="recCategory"
                  value={recurringCategory}
                  onChange={(e) => setRecurringCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchant */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recMerchant">
                  Merchant
                </label>
                <input
                  id="recMerchant"
                  type="text"
                  placeholder="Netflix, Landlord, etc."
                  value={recurringMerchant}
                  onChange={(e) => setRecurringMerchant(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recDescription">
                  Description
                </label>
                <input
                  id="recDescription"
                  type="text"
                  placeholder="Monthly subscription package"
                  value={recurringDescription}
                  onChange={(e) => setRecurringDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Interval */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recInterval">
                  Frequency Interval
                </label>
                <select
                  id="recInterval"
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="recStartDate">
                    Start Date
                  </label>
                  <input
                    id="recStartDate"
                    type="date"
                    value={recurringStartDate}
                    onChange={(e) => setRecurringStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="recEndDate">
                    End Date (Optional)
                  </label>
                  <input
                    id="recEndDate"
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="recStatus">
                  Status
                </label>
                <select
                  id="recStatus"
                  value={recurringStatus}
                  onChange={(e) => setRecurringStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Schedule'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Receipt Preview Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col relative max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-primary" />
                Receipt Preview: {receiptFilename || selectedExpense?.receiptFilename}
              </h3>
              <button
                onClick={() => setPreviewReceipt(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mock Receipt Document Interface */}
            <div className="flex-1 overflow-y-auto bg-white text-zinc-900 rounded-xl p-6 shadow-inner font-mono text-xs space-y-4 border border-zinc-200">
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-sm uppercase tracking-wider">
                  {formMerchant || selectedExpense?.merchant || 'MISCELLANEOUS STORE'}
                </h4>
                <p className="text-[10px] text-zinc-500">123 STUDENT BOULEVARD, CAMPUS</p>
                <p className="text-[10px] text-zinc-500">TEL: 555-0199</p>
              </div>

              <div className="border-t border-b border-dashed border-zinc-300 py-2 space-y-1 text-[10px] text-zinc-600">
                <div className="flex justify-between">
                  <span>DATE: {formDate || selectedExpense?.date}</span>
                  <span>TIME: 14:32</span>
                </div>
                <div>RECEIPT #: 9847193-0182</div>
                <div>CASHIER: MOCK_SERVICE</div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>ITEM DESCRIPTION</span>
                  <span>AMOUNT</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-700">
                  <span>GROCERY/COURSE SUPPLIES ITEM 1</span>
                  <span>{formCurrency || selectedExpense?.originalCurrency || 'USD'} ${(Number(formAmount || selectedExpense?.originalAmount || 0) * 0.7).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-700">
                  <span>MISC CAMPUS CHARGE ITEM 2</span>
                  <span>{formCurrency || selectedExpense?.originalCurrency || 'USD'} ${(Number(formAmount || selectedExpense?.originalAmount || 0) * 0.3).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-300 pt-3 space-y-1.5">
                <div className="flex justify-between font-extrabold text-sm border-b border-zinc-200 pb-1.5">
                  <span>TOTAL</span>
                  <span>
                    {formCurrency || selectedExpense?.originalCurrency || 'USD'}{' '}
                    {Number(formAmount || selectedExpense?.originalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] text-zinc-400 italic">
                <p>THANK YOU FOR YOUR PURCHASE!</p>
                <p>MOCK SYSTEM DEMO</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={() => setPreviewReceipt(false)}
                className="rounded-xl border border-border bg-secondary/15 px-5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/35 transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <a
                href={receiptUrl || selectedExpense?.receiptUrl || '#'}
                download={receiptFilename || selectedExpense?.receiptFilename}
                onClick={(e) => {
                  if (!receiptUrl && !selectedExpense?.receiptUrl) e.preventDefault();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Download Document
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
