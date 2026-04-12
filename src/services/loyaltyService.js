import { supabase } from "../lib/supabase";

export async function getMyLoyaltySnapshot() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "Не вдалося отримати користувача");
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("Користувач не авторизований");
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile, error: profileError }, { data: todayScan, error: scanError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, bean_balance, referral_code")
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("qr_scans")
        .select("id, scan_date, created_at")
        .eq("user_id", userId)
        .eq("scan_date", today)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(profileError.message || "Не вдалося завантажити профіль");
  }

  if (scanError) {
    throw new Error(scanError.message || "Не вдалося перевірити сьогоднішній візит");
  }

  const balance = Number(profile?.bean_balance || 0);
  const redeemable = Math.floor(balance / 10) * 10;
  const progressToNext = balance % 10;
  const hasVisitedToday = !!todayScan;

  return {
    userId,
    profile,
    balance,
    redeemable,
    progressToNext,
    hasVisitedToday,
    todayScan,
    qrValue: `customer:${userId}`,
  };
}

export async function getMyTransactions(limit = 20) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "Не вдалося отримати користувача");
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("Користувач не авторизований");
  }

  const { data, error } = await supabase
    .from("bean_transactions")
    .select("id, type, delta, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Не вдалося завантажити історію");
  }

  return data || [];
}