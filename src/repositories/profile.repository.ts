import { createClient } from '@/lib/supabase/server';
import { Profile, UpdateProfileDTO } from '@/models/profile.model';
import { Database } from '@/types/database.types';

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
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        currency: profile.currency,
        university: profile.university,
        study_country: profile.studyCountry,
        study_city: profile.studyCity,
        home_country: profile.homeCountry,
        monthly_income: profile.monthlyIncome,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  private mapToDomain(dbRecord: DBProfile): Profile {
    return {
      id: dbRecord.id,
      email: dbRecord.email,
      fullName: dbRecord.full_name,
      avatarUrl: dbRecord.avatar_url,
      currency: dbRecord.currency,
      university: dbRecord.university,
      studyCountry: dbRecord.study_country,
      studyCity: dbRecord.study_city,
      homeCountry: dbRecord.home_country,
      monthlyIncome: Number(dbRecord.monthly_income),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const profileRepository = new ProfileRepository();
