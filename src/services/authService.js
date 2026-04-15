import { supabase } from '../lib/supabase';

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resendVerification(email) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  return { data, error };
}

export async function registerUser({
  email,
  password,
  phone,
  firstName,
  lastName,
  referralCode,
  birthDate,
}) {
  const cleanReferral = String(referralCode || '').trim().toUpperCase();

  let referredByUserId = null;

  if (cleanReferral) {
    const { data: referralProfile, error: referralError } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', cleanReferral)
      .maybeSingle();

    if (referralError) {
      return { error: referralError };
    }

    if (!referralProfile) {
      return {
        error: { message: 'Реферальний код не знайдено' },
      };
    }

    referredByUserId = referralProfile.id;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        phone,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
      },
    },
  });

  if (error) {
    return { data, error };
  }

  const userId = data?.user?.id;

  if (userId) {
    const updatePayload = {
      phone,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
    };

    if (referredByUserId) {
      updatePayload.referred_by_user_id = referredByUserId;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      return { data, error: updateError };
    }
  }

  return { data, error: null };
}