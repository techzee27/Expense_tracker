import { createClient } from '@/lib/supabase/server';
import { CostOfLiving, CreateCostOfLivingDTO } from '@/models/cost-of-living.model';
import { Database } from '@/types/database.types';

type DBCostOfLiving = Database['public']['Tables']['cost_of_living']['Row'];

export class CostOfLivingRepository {
  async findByCity(city: string, country: string): Promise<CostOfLiving | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .select('*')
      .eq('city', city)
      .eq('country', country)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async findAll(): Promise<CostOfLiving[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .select('*')
      .order('city', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((col) => this.mapToDomain(col));
  }

  async upsert(colData: CreateCostOfLivingDTO): Promise<CostOfLiving> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .upsert(
        {
          city: colData.city,
          country: colData.country,
          index_score: colData.indexScore,
          estimated_monthly_cost: colData.estimatedMonthlyCost || null,
        },
        { onConflict: 'city,country' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async search(query: string): Promise<CostOfLiving[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .select('*')
      .or(`city.ilike.%${query}%,country.ilike.%${query}%`)
      .order('city', { ascending: true })
      .limit(15);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((col) => this.mapToDomain(col));
  }

  async getUniqueCountries(): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .select('country')
      .order('country', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    const countries = Array.from(new Set((data || []).map((row) => row.country)));
    return countries.filter(Boolean);
  }

  async getCitiesByCountry(country: string): Promise<CostOfLiving[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_of_living')
      .select('*')
      .eq('country', country)
      .order('city', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map((col) => this.mapToDomain(col));
  }

  private mapToDomain(dbRecord: DBCostOfLiving): CostOfLiving {
    const record = dbRecord as any;

    // Dynamically calculate estimated monthly cost and index score from the 55 columns
    const rent = Number(record.apartment_1bed_outside_centre || record.apartment_1bed_city_centre || 500);
    const utilities = Number(record.utilities_basic_apartment || 100);
    const internet = Number(record.internet_unlimited || 30);
    const transport = Number(record.monthly_pass_transport || 50);

    const food = Number(
      (record.milk_1_liter || 1) * 10 +
      (record.bread_500g || 1.5) * 8 +
      (record.eggs_12 || 2) * 3 +
      (record.chicken_breasts_1kg || 6) * 4 +
      (record.apples_1kg || 2) * 5 +
      (record.potato_1kg || 1) * 8 +
      (record.cappuccino || 3) * 10
    );

    const entertainment = Number(
      (record.meal_inexpensive_restaurant || 10) * 6 +
      (record.cinema_ticket || 10) * 2
    );

    const calculatedCost = rent + utilities + internet + transport + food + entertainment;
    const roundedCost = Number(calculatedCost.toFixed(2));
    const calculatedIndex = Number(((roundedCost / 1800) * 100).toFixed(2));

    return {
      id: dbRecord.id,
      city: dbRecord.city,
      country: dbRecord.country,
      indexScore: calculatedIndex,
      estimatedMonthlyCost: roundedCost,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const costOfLivingRepository = new CostOfLivingRepository();
