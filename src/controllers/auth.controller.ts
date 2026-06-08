'use server';

import { authService } from '@/services/auth.service';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/models/auth.model';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signUpAction(payload: unknown, redirectTo: string) {
  try {
    const validated = signupSchema.parse(payload);
    await authService.signUp(validated, redirectTo);
    return {
      success: true,
      message: 'Signup successful! Please check your email for confirmation.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during signup',
    };
  }
}

export async function signInAction(payload: unknown) {
  try {
    const validated = loginSchema.parse(payload);
    await authService.signIn(validated);
    revalidatePath('/dashboard');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during sign-in',
    };
  }
}

export async function signOutAction() {
  try {
    await authService.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }
  revalidatePath('/dashboard');
  redirect('/');
}

export async function forgotPasswordAction(payload: unknown, redirectTo: string) {
  try {
    const validated = forgotPasswordSchema.parse(payload);
    await authService.resetPassword(validated, redirectTo);
    return {
      success: true,
      message: 'Password reset link sent! Please check your inbox.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred sending reset link',
    };
  }
}

export async function updatePasswordAction(payload: unknown) {
  try {
    const validated = resetPasswordSchema.parse(payload);
    await authService.updatePassword(validated.password);
    return {
      success: true,
      message: 'Password successfully updated!',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password',
    };
  }
}
