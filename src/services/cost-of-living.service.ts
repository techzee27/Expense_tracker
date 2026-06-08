import { costOfLivingRepository } from '@/repositories/cost-of-living.repository';
import { CostOfLiving } from '@/models/cost-of-living.model';

export interface CostBreakdown {
  rent: number;
  food: number;
  transport: number;
  utilities: number;
  internet: number;
  healthcare: number;
  entertainment: number;
}

export interface CostOfLivingDetails {
  location: CostOfLiving;
  estimatedMonthlyCost: number;
  breakdown: CostBreakdown;
}

export class CostOfLivingService {
  async searchLocations(query: string): Promise<CostOfLiving[]> {
    if (!query || query.trim().length < 2) return [];
    return costOfLivingRepository.search(query.trim());
  }

  async getUniqueCountries(): Promise<string[]> {
    return costOfLivingRepository.getUniqueCountries();
  }

  async getCitiesByCountry(country: string): Promise<CostOfLiving[]> {
    return costOfLivingRepository.getCitiesByCountry(country);
  }

  async getCostOfLivingDetails(city: string, country: string): Promise<CostOfLivingDetails | null> {
    const loc = await costOfLivingRepository.findByCity(city, country);
    if (!loc) return null;

    // Baseline calculation: If estimatedMonthlyCost is null, compute using indexScore relative to a NYC base of $1800.
    const totalCost = loc.estimatedMonthlyCost || (loc.indexScore / 100) * 1800;
    const roundedTotal = Number(totalCost.toFixed(2));

    const breakdown: CostBreakdown = {
      rent: Number((roundedTotal * 0.40).toFixed(2)),
      food: Number((roundedTotal * 0.20).toFixed(2)),
      transport: Number((roundedTotal * 0.10).toFixed(2)),
      utilities: Number((roundedTotal * 0.08).toFixed(2)),
      internet: Number((roundedTotal * 0.04).toFixed(2)),
      healthcare: Number((roundedTotal * 0.08).toFixed(2)),
      entertainment: Number((roundedTotal * 0.10).toFixed(2)),
    };

    return {
      location: loc,
      estimatedMonthlyCost: roundedTotal,
      breakdown,
    };
  }
}

export const costOfLivingService = new CostOfLivingService();
