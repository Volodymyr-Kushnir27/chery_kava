import { supabase } from '../lib/supabase';

export async function registerUser({
  email,
  password,
  phone,
  firstName,
  lastName,
  referralCode,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'http://localhost:8081',
      data: {
        phone,
        first_name: firstName || '',
        last_name: lastName || '',
        referral_code_used: referralCode || '',
      },
    },
  });

  return { data, error };
}

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
    options: {
      emailRedirectTo: 'http://localhost:8081',
    },
  });

  return { data, error };
}