const BONUS_BEANS = 10;

export function formatUkDate(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatMembershipDuration(createdAt) {
  if (!createdAt) return '—';

  const start = new Date(createdAt);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];

  if (years > 0) {
    parts.push(`${years} ${declOfNum(years, ['рік', 'роки', 'років'])}`);
  }

  if (months > 0) {
    parts.push(`${months} ${declOfNum(months, ['місяць', 'місяці', 'місяців'])}`);
  }

  if (days > 0) {
    parts.push(`${days} ${declOfNum(days, ['день', 'дні', 'днів'])}`);
  }

  return parts.length ? parts.join(' ') : 'менше дня';
}

export function getBirthdayInputMax(label) {
  return label === 'Дата народження' ? 10 : undefined;
}

export function isTodayBirthday(birthDate, now = new Date()) {
  if (!birthDate) return false;

  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth()
  );
}

export function getAnniversaryYears(createdAt, now = new Date()) {
  if (!createdAt) return 0;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;

  const sameMonth = created.getMonth() === now.getMonth();
  const sameDay = created.getDate() === now.getDate();

  if (!sameMonth || !sameDay) return 0;

  const years = now.getFullYear() - created.getFullYear();
  return years > 0 ? years : 0;
}

export function isTodayAnniversary(createdAt, now = new Date()) {
  return getAnniversaryYears(createdAt, now) > 0;
}

export async function hasRewardBeenGivenToday({
  supabase,
  userId,
  rewardType,
  rewardDate,
}) {
  const { data, error } = await supabase
    .from('user_rewards')
    .select('id')
    .eq('user_id', userId)
    .eq('reward_type', rewardType)
    .eq('reward_date', rewardDate)
    .maybeSingle();

  if (error) {
    console.log('hasRewardBeenGivenToday error:', error.message);
    return false;
  }

  return !!data;
}

export async function grantRewardIfNeeded({
  supabase,
  profile,
  rewardType,
  rewardDate,
  beans = BONUS_BEANS,
}) {
  const alreadyGiven = await hasRewardBeenGivenToday({
    supabase,
    userId: profile.id,
    rewardType,
    rewardDate,
  });

  if (alreadyGiven) {
    return {
      granted: false,
      reason: 'already_given',
      updatedProfile: null,
    };
  }

  const nextBalance = (profile.bean_balance || 0) + beans;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      bean_balance: nextBalance,
    })
    .eq('id', profile.id);

  if (profileError) {
    console.log('grantRewardIfNeeded profile update error:', profileError.message);
    return {
      granted: false,
      reason: 'profile_update_failed',
      updatedProfile: null,
    };
  }

  const { error: txError } = await supabase
    .from('bean_transactions')
    .insert({
      user_id: profile.id,
      type: 'manual',
      delta: beans,
    });

  if (txError) {
    console.log('grantRewardIfNeeded transaction insert error:', txError.message);
  }

  const { error: rewardError } = await supabase
    .from('user_rewards')
    .insert({
      user_id: profile.id,
      reward_type: rewardType,
      reward_date: rewardDate,
      beans,
    });

  if (rewardError) {
    console.log('grantRewardIfNeeded reward insert error:', rewardError.message);
  }

  return {
    granted: true,
    reason: 'ok',
    updatedProfile: {
      ...profile,
      bean_balance: nextBalance,
    },
  };
}

export async function checkAndPrepareReward({
  supabase,
  profile,
}) {
  if (!profile?.id) {
    return {
      shouldShowModal: false,
    };
  }

  const now = new Date();
  const rewardDate = toIsoDate(now);

  if (isTodayBirthday(profile.birth_date, now)) {
    const result = await grantRewardIfNeeded({
      supabase,
      profile,
      rewardType: 'birthday',
      rewardDate,
      beans: BONUS_BEANS,
    });

    if (result.granted) {
      return {
        shouldShowModal: true,
        title: 'З Днем народження!',
        message: `Вам нараховано ${BONUS_BEANS} зерен.`,
        updatedProfile: result.updatedProfile,
      };
    }
  }

  const anniversaryYears = getAnniversaryYears(profile.created_at, now);

  if (anniversaryYears > 0) {
    const result = await grantRewardIfNeeded({
      supabase,
      profile,
      rewardType: 'anniversary',
      rewardDate,
      beans: BONUS_BEANS,
    });

    if (result.granted) {
      return {
        shouldShowModal: true,
        title: 'Вітаємо!',
        message: `Ви з нами вже ${anniversaryYears} ${declOfNum(
          anniversaryYears,
          ['рік', 'роки', 'років']
        )}. Вам нараховано ${BONUS_BEANS} зерен.`,
        updatedProfile: result.updatedProfile,
      };
    }
  }

  return {
    shouldShowModal: false,
  };
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function declOfNum(number, words) {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;

  if (n > 10 && n < 20) return words[2];
  if (n1 > 1 && n1 < 5) return words[1];
  if (n1 === 1) return words[0];
  return words[2];
}