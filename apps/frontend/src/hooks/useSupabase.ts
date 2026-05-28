import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

export function useSupabase() {
  const [supabase, setSupabase] = useState(
    createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ),
  );

  return supabase;
}
