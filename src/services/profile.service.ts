import { profileRepository } from '@/repositories/profile.repository';
import { Profile, UpdateProfileDTO } from '@/models/profile.model';

export class ProfileService {
  async getProfile(userId: string): Promise<Profile | null> {
    return profileRepository.findById(userId);
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<Profile> {
    // We can run business checks here: e.g. check currency supports, clean string values, etc.
    return profileRepository.update(userId, data);
  }

  async clearImportedTransactions(userId: string): Promise<void> {
    return profileRepository.clearImportedTransactions(userId);
  }

  async deleteUserAccountData(userId: string): Promise<void> {
    return profileRepository.deleteUserAccountData(userId);
  }
}

export const profileService = new ProfileService();
