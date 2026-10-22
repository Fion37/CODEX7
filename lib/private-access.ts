type Config = {
  NODE_ENV?: string;
  APP_PRIVATE_MODE?: string;
  APP_OWNER_EMAIL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};
export function privateAccessConfig(env: Config) {
  const enabled =
    env.APP_PRIVATE_MODE === "true" ||
    (env.APP_PRIVATE_MODE !== "false" && env.NODE_ENV === "production");
  const owner = env.APP_OWNER_EMAIL?.trim().toLowerCase() || "";
  return {
    enabled,
    owner,
    configured: Boolean(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner) &&
      env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
export function isOwner(
  user: { email?: string; email_confirmed_at?: string | null } | null,
  owner: string,
) {
  return Boolean(
    user?.email_confirmed_at && user.email?.trim().toLowerCase() === owner,
  );
}
