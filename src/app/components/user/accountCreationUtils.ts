import { supabaseDbService } from '../../../services/supabaseDbService';
import { uploadFileToStorage } from '../../../services/supabaseClient';
import { UserProfile } from '../../../types';
import { AccountCreationFormData } from './AccountCreationForm';

export interface AccountCreationResult {
  fullName: string;
  accountNumber: string;
  routingNumber: string;
  updatedUser: UserProfile;
}

const getFilePath = (userId: string, file: File) => `${userId}/${Date.now()}-${file.name}`;

export async function completeAccountCreation(
  user: UserProfile,
  formData: AccountCreationFormData
): Promise<AccountCreationResult | null> {
  if (!user?.id) return null;

  const fullName = formData.middleName
    ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
    : `${formData.firstName} ${formData.lastName}`;

  let avatarUrl: string | undefined;
  if (formData.photo) {
    const path = getFilePath(user.id, formData.photo);
    avatarUrl = await uploadFileToStorage('avatars', path, formData.photo);
  }

  const result = await supabaseDbService.createAccount({
    first_name: formData.firstName,
    last_name: formData.lastName,
    middle_name: formData.middleName || '',
    gender: formData.gender,
    date_of_birth: formData.dateOfBirth,
    nationality: formData.nationality,
    house_address: formData.houseAddress,
    occupation: formData.occupation,
    salary_range: formData.salaryRange,
    account_type: formData.accountType,
    currency: formData.currency,
    avatar_url: avatarUrl
  });

  if (!result) return null;

  const profile = await supabaseDbService.updateProfile(user.id, {
    name: fullName,
    first_name: formData.firstName,
    last_name: formData.lastName,
    nationality: formData.nationality,
    gender: formData.gender,
    date_of_birth: formData.dateOfBirth,
    house_address: formData.houseAddress,
    occupation: formData.occupation,
    salary_range: formData.salaryRange,
    primary_account_type: formData.accountType,
    currency: formData.currency,
    avatar_url: avatarUrl,
    status: 'ACTIVE'
  });

  const updatedUser: UserProfile = {
    ...user,
    name: profile?.name || fullName,
    status: 'ACTIVE',
    currency: profile?.currency || formData.currency,
    avatar: profile?.avatar_url || avatarUrl || user.avatar
  } as UserProfile;

  return {
    fullName,
    accountNumber: result.account.account_number,
    routingNumber: result.account.routing_number,
    updatedUser
  };
}
