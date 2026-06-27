'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Lock, Mail, User, Loader2 } from 'lucide-react';
import { signupSchema, SignupInput } from '@/models/auth.model';
import { signUpAction } from '@/controllers/auth.controller';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setLoading(true);
    setServerError('');
    setSuccessMessage('');

    // Dynamically fetch target confirmation URL origin
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const result = await signUpAction(data, redirectUrl);

    setLoading(false);
    if (result.success) {
      setSuccessMessage(result.message || 'Verification link sent! Check your email.');
    } else {
      setServerError(result.error || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-6">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/40 border border-border backdrop-blur-md rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 mb-8">
          <GraduationCap className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-xs text-muted-foreground text-center">
            Sign up today to start taking control of your student budget.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive-foreground">
            {serverError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                {...register('fullName')}
                className={`w-full pl-10 pr-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none transition-colors ${
                  errors.fullName ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/50'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-[11px] text-destructive-foreground/90 font-medium pl-1">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
              University Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="you@university.edu"
                {...register('email')}
                className={`w-full pl-10 pr-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none transition-colors ${
                  errors.email ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/50'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-destructive-foreground/90 font-medium pl-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full pl-10 pr-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none transition-colors ${
                  errors.password ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/50'
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-destructive-foreground/90 font-medium pl-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`w-full pl-10 pr-4 py-2.5 bg-secondary/30 border rounded-xl text-sm focus:outline-none transition-colors ${
                  errors.confirmPassword ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/50'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-destructive-foreground/90 font-medium pl-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.2)] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
