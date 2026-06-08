import { createClient } from '@/lib/supabase/server';
import { SignupInput, LoginInput, ForgotPasswordInput } from '@/models/auth.model';

export class AuthService {
  async signUp(input: SignupInput, redirectTo: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: input.fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async signIn(input: LoginInput) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async resetPassword(input: ForgotPasswordInput, redirectTo: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updatePassword(password: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getSessionUser() {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  }
}

export const authService = new AuthService();
