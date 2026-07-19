import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components. Safe to expose — relies on the anon key + RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
