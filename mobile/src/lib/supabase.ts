import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import { LargeSecureStore } from '@/lib/large-secure-store'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)