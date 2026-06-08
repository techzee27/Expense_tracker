'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { updateProfileSchema, UpdateProfileDTO } from '@/models/profile.model';
import { getProfileAction, updateProfileAction } from '@/controllers/profile.controller';
import { User, GraduationCap, DollarSign, Loader2, Check } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

export default function ProfileSettingsPage() {
  const { refreshCurrency } = useCurrency();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileDTO>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: '',
      university: '',
      studyCountry: '',
      studyCity: '',
      homeCountry: '',
      currency: 'USD',
      monthlyIncome: 0,
    },
  });

  useEffect(() => {
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
            reset({
              fullName: result.data.fullName || '',
              university: result.data.university || '',
              studyCountry: result.data.studyCountry || '',
              studyCity: result.data.studyCity || '',
              homeCountry: result.data.homeCountry || '',
              currency: result.data.currency || 'USD',
              monthlyIncome: result.data.monthlyIncome || 0,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [reset]);

  const onSubmit = async (data: UpdateProfileDTO) => {
    if (!userId) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    const result = await updateProfileAction(userId, data);

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Student profile successfully updated!' });
      await refreshCurrency();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile details.' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Profile Setup</h2>
        <p className="text-sm text-muted-foreground">
          Configure your personal student details, destination parameters, and currency settings.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
          }`}
        >
          {message.type === 'success' && <Check className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Personal info */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Personal Information</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Alex Morgan"
                {...register('fullName')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.fullName ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.fullName.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Academic & Locations */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Academic & Travel Details</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="university">
                University Name
              </label>
              <input
                id="university"
                type="text"
                placeholder="Harvard University"
                {...register('university')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.university ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.university && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.university.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="homeCountry">
                Home Country
              </label>
              <input
                id="homeCountry"
                type="text"
                placeholder="India"
                {...register('homeCountry')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.homeCountry ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.homeCountry && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.homeCountry.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="studyCountry">
                Study Destination Country
              </label>
              <input
                id="studyCountry"
                type="text"
                placeholder="United States"
                {...register('studyCountry')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.studyCountry ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.studyCountry && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.studyCountry.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="studyCity">
                Study Destination City
              </label>
              <input
                id="studyCity"
                type="text"
                placeholder="Boston"
                {...register('studyCity')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.studyCity ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.studyCity && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.studyCity.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Financial settings */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Financial Configuration</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="currency">
                Preferred Base Currency
              </label>
              <select
                id="currency"
                {...register('currency')}
                className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                  errors.currency ? 'border-destructive' : 'border-border'
                }`}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
              {errors.currency && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.currency.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="monthlyIncome">
                Estimated Monthly Income
              </label>
              <div className="relative">
                <input
                  id="monthlyIncome"
                  type="number"
                  step="0.01"
                  placeholder="1500"
                  {...register('monthlyIncome', { valueAsNumber: true })}
                  className={`w-full px-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors ${
                    errors.monthlyIncome ? 'border-destructive' : 'border-border'
                  }`}
                />
              </div>
              {errors.monthlyIncome && (
                <p className="text-[11px] text-destructive-foreground/90 font-medium">
                  {errors.monthlyIncome.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Profile Setup'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
