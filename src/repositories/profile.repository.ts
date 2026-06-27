import { createClient } from '@/lib/supabase/server';
import { Profile, UpdateProfileDTO } from '@/models/profile.model';
import { Database } from '@/types/database.types';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a3c7f92083bdc10e42d76503b879cbe4'; // 32 bytes fallback key
const IV_LENGTH = 12;

function encryptToken(text: string | null): string | null {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return null;
  }
}

function decryptToken(encryptedText: string | null): string | null {
  if (!encryptedText) return null;
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

type DBProfile = Database['public']['Tables']['profiles']['Row'];

export class ProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async update(id: string, profile: UpdateProfileDTO): Promise<Profile> {
    const supabase = await createClient();
    const updatePayload: Record<string, any> = {};

    if (profile.fullName !== undefined) updatePayload.full_name = profile.fullName;
    if (profile.avatarUrl !== undefined) updatePayload.avatar_url = profile.avatarUrl;
    
    // Support both currency and preferredCurrency
    const finalCurrency = profile.preferredCurrency || profile.currency;
    if (finalCurrency !== undefined) {
      updatePayload.currency = finalCurrency;
      updatePayload.preferred_currency = finalCurrency;
    }

    if (profile.university !== undefined) updatePayload.university = profile.university;
    
    // Support both studyCountry and countryOfStudy
    const finalCountry = profile.countryOfStudy || profile.studyCountry;
    if (finalCountry !== undefined) {
      updatePayload.study_country = finalCountry;
      updatePayload.country_of_study = finalCountry;
    }

    // Support both studyCity and cityOfStudy
    const finalCity = profile.cityOfStudy || profile.studyCity;
    if (finalCity !== undefined) {
      updatePayload.study_city = finalCity;
      updatePayload.city_of_study = finalCity;
    }

    if (profile.homeCountry !== undefined) updatePayload.home_country = profile.homeCountry;
    if (profile.monthlyIncome !== undefined) updatePayload.monthly_income = profile.monthlyIncome;

    // Extended fields
    if (profile.smsTrackingEnabled !== undefined) updatePayload.sms_tracking_enabled = profile.smsTrackingEnabled;
    if (profile.emailTrackingEnabled !== undefined) updatePayload.email_tracking_enabled = profile.emailTrackingEnabled;
    if (profile.lastSmsSync !== undefined) updatePayload.last_sms_sync = profile.lastSmsSync;
    if (profile.lastEmailSync !== undefined) updatePayload.last_email_sync = profile.lastEmailSync;
    if (profile.smsImportedCount !== undefined) updatePayload.sms_imported_count = profile.smsImportedCount;
    if (profile.emailImportedCount !== undefined) updatePayload.email_imported_count = profile.emailImportedCount;
    if (profile.ocrImportedCount !== undefined) updatePayload.ocr_imported_count = profile.ocrImportedCount;
    if (profile.manualTransactionCount !== undefined) updatePayload.manual_transaction_count = profile.manualTransactionCount;
    
    // New SMS Tracking fields
    if (profile.smsPermissionStatus !== undefined) updatePayload.sms_permission_status = profile.smsPermissionStatus;
    if (profile.smsMessagesScanned !== undefined) updatePayload.sms_messages_scanned = profile.smsMessagesScanned;
    if (profile.lastSmsScan !== undefined) updatePayload.last_sms_scan = profile.lastSmsScan;

    // Gmail integration fields
    if (profile.connectedEmail !== undefined) updatePayload.connected_email = profile.connectedEmail;
    if (profile.gmailConnected !== undefined) updatePayload.gmail_connected = profile.gmailConnected;
    if (profile.gmailAccessToken !== undefined) updatePayload.gmail_access_token = encryptToken(profile.gmailAccessToken);
    if (profile.gmailRefreshToken !== undefined) updatePayload.gmail_refresh_token = encryptToken(profile.gmailRefreshToken);
    if (profile.gmailTokenExpiry !== undefined) updatePayload.gmail_token_expiry = profile.gmailTokenExpiry;

    // Google Auth integration fields
    if (profile.authProvider !== undefined) updatePayload.auth_provider = profile.authProvider;
    if (profile.googleConnected !== undefined) updatePayload.google_connected = profile.googleConnected;

    // Onboarding fields
    if (profile.introScreensCompleted !== undefined) updatePayload.intro_screens_completed = profile.introScreensCompleted;
    if (profile.profileCompleted !== undefined) updatePayload.profile_completed = profile.profileCompleted;
    if (profile.onboardingCompleted !== undefined) updatePayload.onboarding_completed = profile.onboardingCompleted;
    if (profile.lastCompletedStep !== undefined) updatePayload.last_completed_step = profile.lastCompletedStep;
    if (profile.homeCity !== undefined) updatePayload.home_city = profile.homeCity;
    if (profile.homeCurrency !== undefined) updatePayload.home_currency = profile.homeCurrency;
    if (profile.studyCurrency !== undefined) updatePayload.study_currency = profile.studyCurrency;
    if (profile.showHomeCurrency !== undefined) updatePayload.show_home_currency = profile.showHomeCurrency;

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async clearImportedTransactions(userId: string): Promise<void> {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId)
      .in('source', ['MESSAGE', 'OCR', 'EMAIL', 'SMS', 'OCR_RECEIPT']);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        sms_imported_count: 0,
        email_imported_count: 0,
        ocr_imported_count: 0,
        sms_messages_scanned: 0,
        last_sms_scan: null,
        last_sms_sync: null,
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  async deleteUserAccountData(userId: string): Promise<void> {
    const supabase = await createClient();
    const { error: expensesError } = await supabase.from('expenses').delete().eq('user_id', userId);
    if (expensesError) throw new Error(expensesError.message);

    const { error: budgetsError } = await supabase.from('budgets').delete().eq('user_id', userId);
    if (budgetsError) throw new Error(budgetsError.message);

    const { error: savingsError } = await supabase.from('savings_goals').delete().eq('user_id', userId);
    if (savingsError) throw new Error(savingsError.message);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: null,
        university: null,
        study_country: null,
        study_city: null,
        home_country: null,
        monthly_income: 0,
        country_of_study: null,
        city_of_study: null,
        preferred_currency: 'USD',
        currency: 'USD',
        sms_tracking_enabled: false,
        email_tracking_enabled: false,
        last_sms_sync: null,
        last_email_sync: null,
        sms_imported_count: 0,
        email_imported_count: 0,
        ocr_imported_count: 0,
        manual_transaction_count: 0,
        sms_permission_status: 'NOT_CONNECTED',
        sms_messages_scanned: 0,
        last_sms_scan: null,
      })
      .eq('id', userId);
    
    if (profileError) throw new Error(profileError.message);
  }

  private mapToDomain(dbRecord: DBProfile): Profile {
    return {
      id: dbRecord.id,
      email: dbRecord.email,
      fullName: dbRecord.full_name,
      avatarUrl: dbRecord.avatar_url,
      currency: dbRecord.currency || 'USD',
      university: dbRecord.university,
      studyCountry: dbRecord.study_country,
      studyCity: dbRecord.study_city,
      homeCountry: dbRecord.home_country,
      monthlyIncome: Number(dbRecord.monthly_income || 0),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,

      // Extended fields
      countryOfStudy: dbRecord.country_of_study || dbRecord.study_country,
      cityOfStudy: dbRecord.city_of_study || dbRecord.study_city,
      preferredCurrency: dbRecord.preferred_currency || dbRecord.currency || 'USD',
      smsTrackingEnabled: !!dbRecord.sms_tracking_enabled,
      emailTrackingEnabled: !!dbRecord.email_tracking_enabled,
      lastSmsSync: dbRecord.last_sms_sync,
      lastEmailSync: dbRecord.last_email_sync,
      smsImportedCount: Number(dbRecord.sms_imported_count || 0),
      emailImportedCount: Number(dbRecord.email_imported_count || 0),
      ocrImportedCount: Number(dbRecord.ocr_imported_count || 0),
      manualTransactionCount: Number(dbRecord.manual_transaction_count || 0),

      // Gmail integration fields
      connectedEmail: dbRecord.connected_email,
      gmailConnected: !!dbRecord.gmail_connected,
      gmailAccessToken: decryptToken(dbRecord.gmail_access_token),
      gmailRefreshToken: decryptToken(dbRecord.gmail_refresh_token),
      gmailTokenExpiry: dbRecord.gmail_token_expiry,

      // Google Auth integration fields
      authProvider: dbRecord.auth_provider || 'EMAIL',
      googleConnected: !!dbRecord.google_connected,

      // New SMS Tracking fields
      smsPermissionStatus: (dbRecord.sms_permission_status || 'NOT_CONNECTED') as Profile['smsPermissionStatus'],
      smsMessagesScanned: Number(dbRecord.sms_messages_scanned || 0),
      lastSmsScan: dbRecord.last_sms_scan,

      // Onboarding fields
      introScreensCompleted: !!dbRecord.intro_screens_completed,
      profileCompleted: !!dbRecord.profile_completed,
      onboardingCompleted: !!dbRecord.onboarding_completed,
      lastCompletedStep: Number(dbRecord.last_completed_step || 0),
      homeCity: dbRecord.home_city,
      homeCurrency: typeof dbRecord.home_currency === 'string' ? JSON.parse(dbRecord.home_currency) : (dbRecord.home_currency || null),
      studyCurrency: typeof dbRecord.study_currency === 'string' ? JSON.parse(dbRecord.study_currency) : (dbRecord.study_currency || null),
      showHomeCurrency: dbRecord.show_home_currency !== false,
    };
  }
}

export const profileRepository = new ProfileRepository();
