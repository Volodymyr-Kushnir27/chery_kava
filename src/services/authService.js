import { supabase } from '../lib/supabase';

function mapAuthErrorMessage(message = '') {
  const msg = String(message).toLowerCase();

  if (
    msg.includes('user already registered') ||
    msg.includes('already registered') ||
    msg.includes('email address not authorized')
  ) {
    return 'Такий користувач вже зареєстрований';
  }

  if (msg.includes('invalid login credentials')) {
    return 'Неправильно введено логін або пароль';
  }

  if (msg.includes('email not confirmed')) {
    return 'Пошта ще не підтверджена';
  }

  if (msg.includes('too many requests')) {
    return 'Забагато спроб. Спробуйте трохи пізніше';
  }

  return message || 'Сталася помилка';
}

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      data: null,
      error: {
        ...error,
        message: mapAuthErrorMessage(error.message),
      },
    };
  }

  return { data, error: null };
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: {
        ...error,
        message: mapAuthErrorMessage(error.message),
      },
    };
  }

  return { error: null };
}

export async function resendVerification(email) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    return {
      data: null,
      error: {
        ...error,
        message: mapAuthErrorMessage(error.message),
      },
    };
  }

  return { data, error: null };
}

export async function registerUser({
  email,
  password,
  phone,
  firstName,
  lastName,
  birthDate,
  referralCode,
}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanReferralCode = String(referralCode || '').trim().toUpperCase();

  if (cleanReferralCode) {
    const { data: referralCheck, error: referralError } = await supabase.rpc(
      'validate_referral_code',
      { p_code: cleanReferralCode }
    );

    if (referralError) {
      return {
        data: null,
        error: {
          ...referralError,
          message: referralError.message || 'Не вдалося перевірити реферальний код',
        },
      };
    }

    if (!referralCheck?.valid) {
      return {
        data: null,
        error: {
          message: referralCheck?.message || 'Реферальний код не знайдено',
          field: 'referral_code',
        },
      };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        birth_date: birthDate,
        referral_code: cleanReferralCode || null,
      },
    },
  });

  if (error) {
    return {
      data: null,
      error: {
        ...error,
        message: mapAuthErrorMessage(error.message),
      },
    };
  }

  return { data, error: null };
}