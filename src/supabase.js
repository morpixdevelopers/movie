// Supabase client, configured for React Native.
// Not wired into the UI yet — the app still runs on local state in store.js.
// Swap it in once auth exists; every write already funnels through apply(),
// so there is one place to change.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,   // RN has no localStorage — sessions vanish without this
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // no URL callbacks on native
      },
    })
  : null;

// Tokens expire while the app is backgrounded unless refresh is paused/resumed.
if (supabase) {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
