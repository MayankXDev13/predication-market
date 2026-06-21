import { useState, useEffect, useCallback } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { setToken, clearToken } from '../services/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nkdszslbxpdidqodhvjt.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_nJEMv28XH35Jy8DrCifw9Q_LnaXwSz3';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

declare global {
  interface Window {
    phantom?: { solana: any };
  }
}

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [claims, setClaims] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setTokenState(session.access_token);
        setToken(session.access_token);
        localStorage.setItem('auth_token', session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setTokenState(session.access_token);
        setToken(session.access_token);
        localStorage.setItem('auth_token', session.access_token);
      } else {
        setTokenState(null);
        clearToken();
        localStorage.removeItem('auth_token');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (token) {
      supabase.auth.getUser(token).then(({ data: { user } }) => {
        setClaims(user?.user_metadata || null);
      });
    } else {
      setClaims(null);
    }
  }, [token, supabase]);

const signIn = useCallback(async () => {
  try {
    if (!window.phantom?.solana) {
      throw new Error("Phantom wallet not installed");
    }

    await window.phantom.solana.connect();

    const { data, error } = await supabase.auth.signInWithWeb3({
      chain: "solana",
      wallet: window.phantom.solana,
      statement: "Sign in to Prediction Market",
    });

    if (error) {
      console.error(error);
      throw error;
    }

    console.log("Signed in", data);
  } catch (err) {
    console.error("Web3 login failed:", err);
  }
}, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setTokenState(null);
    clearToken();
    localStorage.removeItem('auth_token');
    setClaims(null);
  }, [supabase]);

  return { token, claims, loading, signIn, signOut, isAuthenticated: !!token };
}
