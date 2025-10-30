import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (!url || !anon) {
  console.warn("⚠️ Supabase credentials are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  console.warn("Current values:", {
    url: url ? `${url.substring(0, 20)}...` : 'MISSING',
    anon: anon ? `${anon.substring(0, 20)}...` : 'MISSING'
  });
} else {
  console.log("✅ Supabase client initialized successfully");
  console.log("📍 URL:", `${url.substring(0, 30)}...`);
  client = createClient(url, anon);

  // Test connection on initialization
  (async () => {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn("⚠️ Supabase connection test failed:", error.message);
      } else {
        console.log("✅ Supabase connection test successful");
        if (data?.session) {
          console.log("👤 Active session found for:", data.session.user.email);
        }
      }
    } catch (err) {
      console.error("❌ Supabase connection error:", err);
    }
  })();
}

export const supabase = client;
