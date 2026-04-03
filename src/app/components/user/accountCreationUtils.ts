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

  const latestProfile = await supabaseDbService.getProfile(user.id);
  const accountCreationForm = {
    firstName: formData.firstName,
    middleName: formData.middleName || '',
    lastName: formData.lastName,
    gender: formData.gender,
    dateOfBirth: formData.dateOfBirth,
    nationality: formData.nationality,
    houseAddress: formData.houseAddress,
    occupation: formData.occupation,
    salaryRange: formData.salaryRange,
    accountType: formData.accountType,
    currency: formData.currency,
    avatarUrl: avatarUrl || latestProfile?.avatar_url || '',
    submittedAt: new Date().toISOString(),
  };

  const profile = await supabaseDbService.updateProfile(user.id, {
    preferences: {
      ...(latestProfile?.preferences || user.preferences || {}),
      accountCreationForm,
    },
  });

  const resolvedProfile = profile || latestProfile;
  const resolvedPreferences = resolvedProfile?.preferences || {
    ...(user.preferences || {}),
    accountCreationForm,
  };

  const updatedUser: UserProfile = {
    ...user,
    name: resolvedProfile?.name || fullName,
    status: 'ACTIVE',
    currency: resolvedProfile?.currency || formData.currency,
    avatar: resolvedProfile?.avatar_url || avatarUrl || user.avatar,
    preferences: resolvedPreferences,
  } as UserProfile;

  return {
    fullName,
    accountNumber: result.account.account_number,
    routingNumber: result.account.routing_number,
    updatedUser
  };
}
