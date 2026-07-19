import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used in Server Components / Server Actions. Runs as the logged-in team
// member, so normal RLS policies apply (they only see their own distributor's data).
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component with no way to set cookies — safe to ignore
          }
        },
      },
    }
  );
}
