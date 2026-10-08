export function getSupabaseEnv() {
  const url =
    process.env.RITIK_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const anonKey =
    process.env.RITIK_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project') &&
    !anonKey.includes('your-anon-key')
  );

  return { url, anonKey, isConfigured };
}
