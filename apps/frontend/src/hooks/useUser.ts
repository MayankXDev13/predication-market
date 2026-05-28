import { useEffect, useState } from "react";
import { useSupabase } from "./useSupabase";

export function useUser() {
  const [claims, setClaims] = useState(null);
  const supabase = useSupabase();
  useEffect(() => {
    supabase.auth.getClaims().then(({ data: { claims } }) => {
      setClaims(claims);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getClaims().then(({ data: { claims } }) => {
        setClaims(claims);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    claims,
  };
}
