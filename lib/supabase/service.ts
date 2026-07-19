import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Used ONLY on the server, ONLY by the WhatsApp webhook route.
// The service role key bypasses Row Level Security — that's required here
// because an inbound WhatsApp message has no logged-in Supabase Auth user.
// NEVER import this file into anything that runs in the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
