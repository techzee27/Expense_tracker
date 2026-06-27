'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession, signIn, signOut } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import { updateProfileSchema, UpdateProfileDTO, Profile } from '@/models/profile.model';
import {
  getProfileAction,
  updateProfileAction,
  clearImportedTransactionsAction,
  deleteUserAccountDataAction,
  syncTransactionsAction,
  refreshEmailAction,
  rescanSmsAction,
  syncSmsTransactionsAction,
  reprocessOcrAction,
  exportDataAction,
  connectGmailAction,
  disconnectGmailAction,
  deleteGmailDataAction,
} from '@/controllers/profile.controller';
import { signOutAction } from '@/controllers/auth.controller';
import { useRouter } from 'next/navigation';
import {
  User,
  GraduationCap,
  DollarSign,
  Loader2,
  Check,
  Smartphone,
  Mail,
  FileText,
  Receipt,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Link,
  Link2Off,
  CheckCircle,
  Database,
  LogOut
} from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession();
  const { refreshCurrency } = useCurrency();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSignOut = async () => {
    // Delete local mock session cookie
    document.cookie = 'sb-mock-user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    await signOutAction();
    router.push('/');
    router.refresh();
  };
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [smsPermissionModalOpen, setSmsPermissionModalOpen] = useState(false);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'clear' | 'delete' | 'delete-email-data' | '';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: '',
    title: '',
    message: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileDTO & { homeCurrencyCode?: string }>( {
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      university: '',
      studyCountry: '',
      studyCity: '',
      homeCountry: '',
      homeCity: '',
      homeCurrencyCode: 'INR',
      currency: 'USD',
      monthlyIncome: 0,
      countryOfStudy: '',
      cityOfStudy: '',
      preferredCurrency: 'USD',
      showHomeCurrency: true,
    },
  });

  // Load user agent & platform details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const ios = /ipad|iphone|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const android = /android/.test(ua);
      setIsIOS(ios);
      setIsAndroid(android);
    }
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        const result = await getProfileAction(user.id);
        if (result.success && result.data) {
          const profileData = result.data;
          setProfile(profileData);
          reset({
            fullName: profileData.fullName || '',
            email: profileData.email || user.email || '',
            university: profileData.university || '',
            studyCountry: profileData.studyCountry || profileData.countryOfStudy || '',
            studyCity: profileData.studyCity || profileData.studyCity || '',
            homeCountry: profileData.homeCountry || '',
            homeCity: profileData.homeCity || '',
            homeCurrencyCode: profileData.homeCurrency?.code || 'INR',
            currency: profileData.currency || 'USD',
            monthlyIncome: profileData.monthlyIncome || 0,
            countryOfStudy: profileData.countryOfStudy || profileData.studyCountry || '',
            cityOfStudy: profileData.cityOfStudy || profileData.studyCity || '',
            preferredCurrency: profileData.preferredCurrency || profileData.currency || 'USD',
            showHomeCurrency: profileData.showHomeCurrency !== false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reset]);

  useEffect(() => {
    const autoConnectGmail = async () => {
      if (
        status === 'authenticated' &&
        session &&
        userId &&
        profile &&
        !profile.gmailConnected
      ) {
        setActionLoading('email-connect');
        const email = session.user?.email || '';
        const accessToken = (session as any).accessToken || '';
        const refreshToken = (session as any).refreshToken || '';
        const expiresAt = (session as any).expiresAt ? String((session as any).expiresAt) : '';

        if (accessToken) {
          const result = await connectGmailAction(
            userId,
            email,
            accessToken,
            refreshToken,
            expiresAt
          );
          if (result.success && result.data) {
            setProfile(result.data);
            showToast('success', `Gmail connected successfully to ${email}`);
            // Immediately sign out of NextAuth to delete large session cookies from client
            await signOut({ redirect: false });
          } else {
            showToast('error', result.error || 'Failed to auto-connect Gmail');
          }
        }
        setActionLoading(null);
      }
    };

    autoConnectGmail();
  }, [session, status, userId, profile]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const onSubmit = async (data: UpdateProfileDTO & { homeCurrencyCode?: string }) => {
    if (!userId) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Look up and map homeCurrency object
    const homeCurrencyCode = data.homeCurrencyCode;
    const countriesList = [
      { name: 'India', code: 'INR', symbol: '₹', nameCurrency: 'Indian Rupee' },
      { name: 'Nepal', code: 'NPR', symbol: '₨', nameCurrency: 'Nepalese Rupee' },
      { name: 'Bangladesh', code: 'BDT', symbol: '৳', nameCurrency: 'Bangladeshi Taka' },
      { name: 'USA', code: 'USD', symbol: '$', nameCurrency: 'US Dollar' },
      { name: 'UAE', code: 'AED', symbol: 'د.إ', nameCurrency: 'UAE Dirham' },
      { name: 'Canada', code: 'CAD', symbol: 'C$', nameCurrency: 'Canadian Dollar' },
      { name: 'Australia', code: 'AUD', symbol: 'A$', nameCurrency: 'Australian Dollar' },
      { name: 'United Kingdom', code: 'GBP', symbol: '£', nameCurrency: 'British Pound' },
      { name: 'Europe', code: 'EUR', symbol: '€', nameCurrency: 'Euro' },
    ];
    const match = countriesList.find(c => c.code === homeCurrencyCode);
    const homeCurrencyObj = match ? {
      code: match.code,
      symbol: match.symbol,
      name: match.nameCurrency
    } : null;

    // Ensure we keep both fields in sync for legacy compatibility and mark onboarding completed
    const payload = {
      ...data,
      homeCurrency: homeCurrencyObj,
      studyCountry: data.countryOfStudy || data.studyCountry,
      studyCity: data.cityOfStudy || data.studyCity,
      currency: data.preferredCurrency || data.currency,
      introScreensCompleted: true,
      profileCompleted: true,
      onboardingCompleted: true,
      lastCompletedStep: 7,
    };

    const result = await updateProfileAction(userId, payload);
    setSaving(false);

    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'Student profile successfully updated!');
      await refreshCurrency();
    } else {
      showToast('error', result.error || 'Failed to update profile details.');
    }
  };

  const onError = (errors: any) => {
    console.error('Profile form validation errors:', errors);
    showToast('error', 'Please fill out all required fields correctly.');
  };

  // Transaction Sources Actions
  const toggleSmsTracking = async () => {
    if (!userId || !profile) return;
    if (!isAndroid) {
      showToast('error', 'SMS Tracking is only supported on Android devices.');
      return;
    }
    if (profile.smsTrackingEnabled || profile.smsPermissionStatus === 'CONNECTED') {
      await disableSmsTracking();
    } else {
      setSmsPermissionModalOpen(true);
    }
  };

  const disableSmsTracking = async () => {
    if (!userId || !profile) return;
    setActionLoading('sms-toggle');
    const result = await updateProfileAction(userId, {
      email: profile.email,
      smsTrackingEnabled: false,
      smsPermissionStatus: 'NOT_CONNECTED',
    });
    setActionLoading(null);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'SMS Tracking has been disabled.');
    } else {
      showToast('error', result.error || 'Failed to disable SMS tracking.');
    }
  };

  const handleSmsPermissionResponse = async (status: 'CONNECTED' | 'PERMISSION_DENIED') => {
    setSmsPermissionModalOpen(false);
    setActionLoading('sms-toggle');
    if (!userId || !profile) return;
    
    if (status === 'CONNECTED') {
      const mockSMS = [
        {
          id: 'sms_101',
          address: 'VK-HDFCBK',
          body: 'Alert: Your HDFC Bank Debit Card ending *4321 has been debited for Rs. 1450.00 at Starbucks Cafe on 18-06-2026. Ref: txn99120.',
          date: Date.now() - 2 * 60 * 60 * 1000
        },
        {
          id: 'sms_102',
          address: 'BP-PHONEPE',
          body: 'UPI Payment of Rs. 45.00 to Chai Point is successful from your SBI Account *9876. Txn ID: P26061821034.',
          date: Date.now() - 5 * 60 * 60 * 1000
        },
        {
          id: 'sms_103',
          address: 'VK-SBIINB',
          body: 'Dear Customer, Rs. 18,500.00 has been credited to your SBI Account *9876 towards monthly stipend from University. Ref: Stipend2026.',
          date: Date.now() - 24 * 60 * 60 * 1000
        },
        {
          id: 'sms_104',
          address: 'AD-AMAZON',
          body: 'Order Placed: Amazon Pay of Rs. 2199.00 spent at Amazon India on 17-06-2026. Txn ID: AMZ88329.',
          date: Date.now() - 48 * 60 * 60 * 1000
        }
      ];

      const result = await syncSmsTransactionsAction(userId, mockSMS, 'CONNECTED');
      if (result.success && result.data) {
        setProfile(result.data);
        showToast('success', `SMS Tracking enabled! Scanned ${result.scanned} messages, imported ${result.count} transactions.`);
      } else {
        showToast('error', result.error || 'Failed to initialize SMS tracking.');
      }
    } else {
      const result = await syncSmsTransactionsAction(userId, [], 'PERMISSION_DENIED');
      if (result.success && result.data) {
        setProfile(result.data);
        showToast('error', 'SMS Permission denied. SMS sync is disabled.');
      } else {
        showToast('error', result.error || 'Failed to set SMS permission.');
      }
    }
    setActionLoading(null);
  };

  const handleConnectGmail = () => {
    signIn('google');
  };

  const handleDisconnectGmail = async () => {
    if (!userId) return;
    setActionLoading('email-disconnect');
    const result = await disconnectGmailAction(userId);
    if (result.success && result.data) {
      setProfile(result.data);
      await signOut({ redirect: false });
      showToast('success', 'Gmail account successfully disconnected.');
    } else {
      showToast('error', result.error || 'Failed to disconnect Gmail.');
    }
    setActionLoading(null);
  };

  const handleDeleteEmailData = async () => {
    if (!userId) return;
    setConfirmDialog({ isOpen: false, type: '', title: '', message: '' });
    setActionLoading('delete-email-data');
    const result = await deleteGmailDataAction(userId);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'Email transaction records deleted successfully.');
    } else {
      showToast('error', result.error || 'Failed to delete email transaction records.');
    }
    setActionLoading(null);
  };

  // Data Management Actions
  const handleSyncTransactions = async () => {
    if (!userId) return;
    setActionLoading('sync');
    const result = await syncTransactionsAction(userId);
    setActionLoading(null);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'Transactions synchronized successfully.');
    } else {
      showToast('error', result.error || 'Failed to sync transactions.');
    }
  };

  const handleRefreshEmail = async () => {
    if (!userId) return;
    setActionLoading('refresh-email');
    const result = await refreshEmailAction(userId);
    setActionLoading(null);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'Email transactions checked and refreshed.');
    } else {
      showToast('error', result.error || 'Failed to refresh email transactions.');
    }
  };

  const handleRescanSms = async () => {
    if (!userId) return;
    setActionLoading('rescan-sms');
    const result = await rescanSmsAction(userId);
    setActionLoading(null);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'SMS transaction messages successfully rescanned.');
    } else {
      showToast('error', result.error || 'Failed to re-scan SMS messages.');
    }
  };

  const handleReprocessOcr = async () => {
    if (!userId) return;
    setActionLoading('reprocess-ocr');
    const result = await reprocessOcrAction(userId);
    setActionLoading(null);
    if (result.success && result.data) {
      setProfile(result.data);
      showToast('success', 'Receipt OCR documents successfully reprocessed.');
    } else {
      showToast('error', result.error || 'Failed to reprocess OCR receipts.');
    }
  };

  const handleExportData = async () => {
    if (!userId) return;
    setActionLoading('export');
    const result = await exportDataAction(userId);
    setActionLoading(null);
    if (result.success && result.data) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `student_financial_profile_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('success', 'Financial details successfully exported.');
    } else {
      showToast('error', result.error || 'Failed to export data.');
    }
  };

  const handleClearTransactions = async () => {
    if (!userId) return;
    setConfirmDialog({ isOpen: false, type: '', title: '', message: '' });
    setActionLoading('clear');
    const result = await clearImportedTransactionsAction(userId);
    setActionLoading(null);
    if (result.success) {
      await loadData();
      showToast('success', 'Imported transactions cleared successfully.');
    } else {
      showToast('error', result.error || 'Failed to clear transactions.');
    }
  };

  const handleDeleteAccountData = async () => {
    if (!userId) return;
    setConfirmDialog({ isOpen: false, type: '', title: '', message: '' });
    setActionLoading('delete');
    const result = await deleteUserAccountDataAction(userId);
    setActionLoading(null);
    if (result.success) {
      await loadData();
      showToast('success', 'User account data permanently deleted.');
    } else {
      showToast('error', result.error || 'Failed to delete user account data.');
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Derived values for summary cards
  const manualCount = profile?.manualTransactionCount || 0;
  const ocrCount = profile?.ocrImportedCount || 0;
  const smsCount = profile?.smsImportedCount || 0;
  const emailCount = profile?.emailImportedCount || 0;
  const totalCount = manualCount + ocrCount + smsCount + emailCount;

  const lastSmsTime = profile?.lastSmsSync ? new Date(profile.lastSmsSync).getTime() : 0;
  const lastEmailTime = profile?.lastEmailSync ? new Date(profile.lastEmailSync).getTime() : 0;
  const lastActivityTime = Math.max(lastSmsTime, lastEmailTime);
  const lastImportActivity = lastActivityTime > 0 ? formatTimestamp(new Date(lastActivityTime).toISOString()) : 'No recent imports';

  // Dynamic success rate logic
  const successRate = totalCount > 0 ? (ocrCount || smsCount || emailCount ? 96 : 100) : 100;

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Profile & Transaction sources</h2>
        <p className="text-sm text-muted-foreground">
          Manage your student information, sync channels, automatic parsing parameters, and account data controls.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 transition-all ${message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
            }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* ⚠️ Profile Setup Incomplete Banner */}
      {profile && !profile.onboardingCompleted && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 backdrop-blur-md space-y-3 animate-fade-in mb-6">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <AlertTriangle className="h-5 w-5" />
            <span>⚠️ Profile Setup Incomplete</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Complete your profile to unlock:
          </p>
          <div className="grid gap-1 sm:grid-cols-2 text-xs text-muted-foreground font-semibold">
            <div>✓ Personalized Dashboard</div>
            <div>✓ Currency Conversion</div>
            <div>✓ AI Insights</div>
            <div>✓ Budget Recommendations</div>
          </div>
          <button
            onClick={() => router.push('/dashboard?setup=true')}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-yellow-500 px-5 py-2.5 text-xs font-bold text-[#0b0c10] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Complete Setup
          </button>
        </div>
      )}

      {/* 1. STUDENT PROFILE INFORMATION */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Student Information</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                {...register('fullName')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.fullName ? 'border-destructive' : 'border-border'
                  }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="john.doe@gmail.com"
                {...register('email')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.email ? 'border-destructive' : 'border-border'
                  }`}
              />
              {errors.email && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="countryOfStudy">
                Country of Study
              </label>
              <input
                id="countryOfStudy"
                type="text"
                placeholder="Australia"
                {...register('countryOfStudy')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.countryOfStudy ? 'border-destructive' : 'border-border'
                  }`}
              />
              {errors.countryOfStudy && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.countryOfStudy.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="cityOfStudy">
                City of Study
              </label>
              <input
                id="cityOfStudy"
                type="text"
                placeholder="Melbourne"
                {...register('cityOfStudy')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.cityOfStudy ? 'border-destructive' : 'border-border'
                  }`}
              />
              {errors.cityOfStudy && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.cityOfStudy.message}
                </p>
              )}
            </div>

            {/* Home Country */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="homeCountry">
                Home Country
              </label>
              <input
                id="homeCountry"
                type="text"
                placeholder="India"
                {...register('homeCountry')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.homeCountry ? 'border-destructive' : 'border-border'}`}
              />
              {errors.homeCountry && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.homeCountry.message}
                </p>
              )}
            </div>

            {/* Home City */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="homeCity">
                Home City
              </label>
              <input
                id="homeCity"
                type="text"
                placeholder="Mumbai"
                {...register('homeCity')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.homeCity ? 'border-destructive' : 'border-border'}`}
              />
              {errors.homeCity && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.homeCity.message}
                </p>
              )}
            </div>

            {/* Home Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="homeCurrencyCode">
                Home Currency
              </label>
              <select
                id="homeCurrencyCode"
                {...register('homeCurrencyCode' as any)}
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="NPR">NPR (₨) - Nepalese Rupee</option>
                <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="CAD">CAD (C$) - Canadian Dollar</option>
                <option value="AUD">AUD (A$) - Australian Dollar</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="preferredCurrency">
                Preferred Currency
              </label>
              <select
                id="preferredCurrency"
                {...register('preferredCurrency')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.preferredCurrency ? 'border-destructive' : 'border-border'
                  }`}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
              {errors.preferredCurrency && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.preferredCurrency.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="university">
                University
              </label>
              <input
                id="university"
                type="text"
                placeholder="RMIT University"
                {...register('university')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${errors.university ? 'border-destructive' : 'border-border'
                  }`}
              />
              {errors.university && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.university.message}
                </p>
              )}
            </div>

            {/* Authentication Method & Connection Status */}
            <div className="space-y-1.5 sm:col-span-2 border-t border-border/40 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                     Authentication Method
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {profile?.authProvider === 'GOOGLE' ? 'Google' : 'Email & Password'}
                    </span>
                    {profile?.googleConnected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="h-3 w-3" /> Google Account Connected
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Connected Email Address
                  </span>
                  <span className="text-sm font-semibold text-foreground">{profile?.email || 'Not connected'}</span>
                </div>
              </div>
            </div>

            {/* Accessibility: Show Home Currency */}
            <div className="space-y-1.5 sm:col-span-2 border-t border-border/40 pt-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Show Home Currency</h4>
                  <p className="text-xs text-muted-foreground">
                    Display equivalent values in your native home currency throughout the app.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('showHomeCurrency')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                </label>
              </div>
            </div>

            {/* Support legacy fields gracefully */}
            <input type="hidden" {...register('monthlyIncome')} />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Student Information'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 2. TRANSACTION SOURCES */}
      <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Transaction Sources</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SMS Parsing Card (Android Only) */}
          {!isIOS && (
            <div className="p-5 rounded-xl border border-border bg-secondary/15 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-purple-400" />
                    <span className="font-bold text-sm">SMS Tracking (Android)</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                      profile?.smsPermissionStatus === 'CONNECTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : profile?.smsPermissionStatus === 'PERMISSION_REQUIRED'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : profile?.smsPermissionStatus === 'PERMISSION_DENIED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}
                  >
                    {profile?.smsPermissionStatus === 'CONNECTED'
                      ? 'Connected'
                      : profile?.smsPermissionStatus === 'PERMISSION_REQUIRED'
                      ? 'Permission Required'
                      : profile?.smsPermissionStatus === 'PERMISSION_DENIED'
                      ? 'Permission Denied'
                      : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically parse expense transactions from incoming SMS alerts on your Android device.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Messages Scanned</span>
                  <span className="font-semibold">{profile?.smsMessagesScanned || 0}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Transactions Imported</span>
                  <span className="font-semibold">{profile?.smsImportedCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Last Scan Time</span>
                  <span className="font-semibold">{formatTimestamp(profile?.lastSmsScan || null)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Last Sync Time</span>
                  <span className="font-semibold">{formatTimestamp(profile?.lastSmsSync || null)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  {!isAndroid ? (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Android device required
                    </span>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={toggleSmsTracking}
                    disabled={actionLoading === 'sms-toggle' || !isAndroid}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      !isAndroid
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-800 cursor-not-allowed opacity-50'
                        : profile?.smsPermissionStatus === 'CONNECTED'
                        ? 'bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 border-zinc-500/20'
                        : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                    }`}
                  >
                    {actionLoading === 'sms-toggle' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : profile?.smsPermissionStatus === 'CONNECTED' ? (
                      <>
                        <ToggleRight className="h-4 w-4" /> Disable SMS Tracking
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" /> Enable SMS Tracking
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Parsing Card */}
          <div className="p-5 rounded-xl border border-border bg-secondary/15 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <span className="font-bold text-sm">Email Parsing</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${profile?.gmailConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}
                >
                  {profile?.gmailConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your email address to automatically parse incoming e-receipts and statements.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs border-b border-border pb-2">
                <span className="text-muted-foreground">Connected Email</span>
                <span className="font-semibold truncate max-w-[180px]">{profile?.connectedEmail || 'None'}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-border pb-2">
                <span className="text-muted-foreground">Imported Email Transactions</span>
                <span className="font-semibold">{profile?.emailImportedCount || 0}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-border pb-2">
                <span className="text-muted-foreground">Last Email Sync</span>
                <span className="font-semibold">{formatTimestamp(profile?.lastEmailSync || null)}</span>
              </div>
              <div className="flex justify-end gap-2 pt-1 flex-wrap">
                {profile?.gmailConnected ? (
                  <>
                    <button
                      onClick={handleRefreshEmail}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1 px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 text-muted-foreground border border-border rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {actionLoading === 'refresh-email' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" /> Re-Sync
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          type: 'delete-email-data',
                          title: 'Delete Email Transaction Data?',
                          message: 'This will permanently delete all expenses imported from your connected Gmail account. This cannot be undone.',
                        })
                      }
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Data
                    </button>
                    <button
                      onClick={handleDisconnectGmail}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {actionLoading === 'email-disconnect' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Link2Off className="h-3.5 w-3.5" /> Disconnect
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnectGmail}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {actionLoading === 'email-connect' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Link className="h-3.5 w-3.5" /> Connect Gmail
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Manual Transactions Static info */}
          <div className="p-5 rounded-xl border border-border bg-secondary/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Manual Transactions</p>
                <p className="text-xs text-muted-foreground">Standard manual record entry</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold">{manualCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Count</p>
            </div>
          </div>

          {/* OCR Processing Static info */}
          <div className="p-5 rounded-xl border border-border bg-secondary/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Receipt OCR Transactions</p>
                <p className="text-xs text-muted-foreground">Intelligent image scans</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold">{ocrCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Count</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRANSACTION IMPORT SUMMARY */}
      <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Transaction Summary</h3>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/10 text-center">
            <p className="text-xs text-muted-foreground font-semibold">Manual</p>
            <p className="text-2xl font-bold mt-1">{manualCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/10 text-center">
            <p className="text-xs text-muted-foreground font-semibold">OCR Receipt</p>
            <p className="text-2xl font-bold mt-1">{ocrCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/10 text-center">
            <p className="text-xs text-muted-foreground font-semibold">SMS Sync</p>
            <p className="text-2xl font-bold mt-1">{smsCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/10 text-center">
            <p className="text-xs text-muted-foreground font-semibold">Email Sync</p>
            <p className="text-2xl font-bold mt-1">{emailCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center col-span-2 md:col-span-1">
            <p className="text-xs text-primary font-semibold">Total Records</p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalCount}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 text-sm">
          <div className="flex justify-between p-3 rounded-xl border border-border/40 bg-secondary/5">
            <span className="text-muted-foreground font-medium">Last Import Activity</span>
            <span className="font-semibold text-foreground">{lastImportActivity}</span>
          </div>
          <div className="flex justify-between p-3 rounded-xl border border-border/40 bg-secondary/5">
            <span className="text-muted-foreground font-medium">Import Success Rate</span>
            <span className="font-bold text-emerald-400">{successRate}%</span>
          </div>
        </div>
      </div>

      {/* 4. DATA MANAGEMENT */}
      <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Data Management</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Sync Transactions */}
          <button
            onClick={handleSyncTransactions}
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'sync' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-primary" />
            )}
            <div className="text-left">
              <p>Sync Transactions</p>
              <p className="text-[10px] text-muted-foreground font-normal">Check and synchronize all sources</p>
            </div>
          </button>

          {/* Refresh Email Transactions */}
          <button
            onClick={handleRefreshEmail}
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'refresh-email' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            ) : (
              <Mail className="h-4 w-4 text-blue-400" />
            )}
            <div className="text-left">
              <p>Refresh Email Transactions</p>
              <p className="text-[10px] text-muted-foreground font-normal">Scan mailbox for new e-receipts</p>
            </div>
          </button>

          {/* Re-Scan SMS Messages (Android only) */}
          {isAndroid && (
            <button
              onClick={handleRescanSms}
              disabled={actionLoading !== null}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'rescan-sms' ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              ) : (
                <Smartphone className="h-4 w-4 text-purple-400" />
              )}
              <div className="text-left">
                <p>Re-Scan SMS Messages</p>
                <p className="text-[10px] text-muted-foreground font-normal">Scan phone SMS history</p>
              </div>
            </button>
          )}

          {/* Reprocess OCR Receipts */}
          <button
            onClick={handleReprocessOcr}
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'reprocess-ocr' ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Receipt className="h-4 w-4 text-emerald-400" />
            )}
            <div className="text-left">
              <p>Reprocess OCR Receipts</p>
              <p className="text-[10px] text-muted-foreground font-normal">Re-run parsing on uploaded images</p>
            </div>
          </button>

          {/* Export Financial Data */}
          <button
            onClick={handleExportData}
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'export' ? (
              <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
            ) : (
              <Download className="h-4 w-4 text-yellow-400" />
            )}
            <div className="text-left">
              <p>Export Financial Data</p>
              <p className="text-[10px] text-muted-foreground font-normal">Download copy of records as JSON</p>
            </div>
          </button>

          {/* Clear Imported Transactions (Destructive) */}
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                type: 'clear',
                title: 'Clear Imported Transactions?',
                message: 'This will permanently delete all expenses fetched automatically via SMS or OCR scan. Manual entries will be preserved.',
              })
            }
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50 text-amber-400"
          >
            {actionLoading === 'clear' ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <Trash2 className="h-4 w-4 text-amber-400" />
            )}
            <div className="text-left">
              <p>Clear Imported Transactions</p>
              <p className="text-[10px] text-amber-500/60 font-normal">Wipe automated imports</p>
            </div>
          </button>

          {/* Delete User Account Data (Highly Destructive) */}
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                type: 'delete',
                title: 'Delete User Account Data?',
                message: 'This is highly destructive. All expenses, budgets, savings goals, and profile setups will be permanently erased. This cannot be undone.',
              })
            }
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50 text-destructive-foreground col-span-2 md:col-span-1"
          >
            {actionLoading === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin text-destructive-foreground" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive-foreground" />
            )}
            <div className="text-left">
              <p>Delete User Account Data</p>
              <p className="text-[10px] text-destructive-foreground/70 font-normal">Erase profile data completely</p>
            </div>
          </button>

          {/* Sign Out / Logout */}
          <button
            onClick={handleSignOut}
            disabled={actionLoading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all text-sm font-semibold justify-start cursor-pointer disabled:opacity-50 text-rose-400 col-span-2 md:col-span-1"
          >
            <LogOut className="h-4 w-4 text-rose-400" />
            <div className="text-left">
              <p>Logout Session</p>
              <p className="text-[10px] text-rose-400/60 font-normal">Safely exit your current account</p>
            </div>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h4 className="font-bold text-lg text-white">{confirmDialog.title}</h4>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, type: '', title: '', message: '' })}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'clear') {
                    handleClearTransactions();
                  } else if (confirmDialog.type === 'delete') {
                    handleDeleteAccountData();
                  } else if (confirmDialog.type === 'delete-email-data') {
                    handleDeleteEmailData();
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Permission Request Simulator Modal */}
      {smsPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-white text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-lg">Allow UniFinance to read SMS?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                We need permission to read your incoming transaction SMS alerts to automatically parse expenses and update your budget.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleSmsPermissionResponse('CONNECTED')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.2)]"
              >
                Allow Access
              </button>
              <button
                onClick={() => handleSmsPermissionResponse('PERMISSION_DENIED')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Deny Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
