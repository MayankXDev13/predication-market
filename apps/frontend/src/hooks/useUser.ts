import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


export function useUser() {
  const [claims, setClaims] = useState(null);
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
