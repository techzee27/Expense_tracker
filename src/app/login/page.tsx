'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Lock, Mail, Loader2 } from 'lucide-react';
import { loginSchema, LoginInput } from '@/models/auth.model';
import { signInAction } from '@/controllers/auth.controller';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setServerError('');

    const result = await signInAction(data);
    
    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setLoading(false);
      setServerError(result.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-6">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/40 border border-border backdrop-blur-md rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 mb-8">
          <GraduationCap className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-xs text-muted-foreground text-center">
            Sign in to track your student budget and cash flows.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive-foreground">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          New to UniFinance?{' '}
          <Link href="/signup" className="text-primary hover:underline font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
