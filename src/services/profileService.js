import { supabase } from '../lib/supabase';

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { data: null, error: userError };
  }

  if (!user?.id) {
    return {
      data: null,
      error: { message: 'Користувач не знайдений' },
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data, error };
}

export async function getMyTransactions(limit = 20) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { data: [], error: userError };
  }

  if (!user?.id) {
    return {
      data: [],
      error: { message: 'Користувач не знайдений' },
    };
  }

  const { data, error } = await supabase
    .from('bean_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}