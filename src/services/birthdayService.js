import { supabase } from '../lib/supabase';

export async function getBirthdayRewardStatus() {
  const { data, error } = await supabase.rpc('get_birthday_reward_status');

  if (error) {
    throw new Error(error.message || 'Не вдалося перевірити статус дня народження');
  }

  return data;
}

export async function claimBirthdayReward() {
  const { data, error } = await supabase.rpc('claim_birthday_reward');

  if (error) {
    throw new Error(error.message || 'Не вдалося отримати подарунок на день народження');
  }

  return data;
}