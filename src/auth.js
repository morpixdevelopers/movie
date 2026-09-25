import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isConfigured } from './supabase';

// Closes the in-app browser cleanly if the OS backgrounds it mid-flow.
WebBrowser.maybeCompleteAuthSession();

/**
 * Local stand-in for Supabase Auth, so the screens can be built and tested
 * before a backend exists.
 *
 * ⚠️  Passwords are stored in plain text on the device. This is throwaway
 * scaffolding — it exists so the UI is real, not so accounts are safe. Nothing
 * here survives the swap to Supabase.
 *
 * The API is deliberately the same shape as supabase.auth, so wiring the real
 * thing is a change inside these three functions and nowhere else:
 *
 *   signIn  -> supabase.auth.signInWithPassword({ email, password })
 *   signUp  -> supabase.auth.signUp({ email, password, options: { data } })
 *   signOut -> supabase.auth.signOut()
 *
 * Each returns { error } or { error: null }, exactly as supabase-js does, so
 * the calling screens need no changes at all.
 */

const ACCOUNTS = 'mr.accounts.v1';
const SESSION = 'mr.session.v1';

// The one account that always exists, for testing.
const SEEDED = [{
  id: 'acc-admin',
  email: 'admin@gmail.com',
  password: 'admin',
  displayName: 'Admin',
}];

const clean = (s) => String(s || '').trim().toLowerCase();
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(s));

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(SEEDED);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawAcc, rawSes] = await Promise.all([
          AsyncStorage.getItem(ACCOUNTS),
          AsyncStorage.getItem(SESSION),
        ]);
        const saved = rawAcc ? JSON.parse(rawAcc) : [];
        // the seeded account is always present, however stale the store is
        const merged = [...SEEDED, ...saved.filter((a) => a.id !== 'acc-admin')];
        setAccounts(merged);
        if (rawSes) {
          const s = JSON.parse(rawSes);
          if (merged.some((a) => a.id === s?.user?.id)) setSession(s);
        }
      } catch {
        setAccounts(SEEDED);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = async (list, next) => {
    setAccounts(list);
    setSession(next);
    try {
      await AsyncStorage.setItem(ACCOUNTS, JSON.stringify(list.filter((a) => a.id !== 'acc-admin')));
      if (next) await AsyncStorage.setItem(SESSION, JSON.stringify(next));
      else await AsyncStorage.removeItem(SESSION);
    } catch { /* a failed write only costs the session on next launch */ }
  };

  const sessionFor = (a) => ({
    user: { id: a.id, email: a.email, displayName: a.displayName },
  });

  const signIn = async ({ email, password }) => {
    if (!looksLikeEmail(email)) return { error: { message: 'That does not look like an email address.' } };
    if (!password) return { error: { message: 'Enter your password.' } };
    const found = accounts.find((a) => a.email === clean(email));
    // one message for both cases, so it cannot be used to discover who has an account
    if (!found || found.password !== password) {
      return { error: { message: 'That email and password do not match.' } };
    }
    await persist(accounts, sessionFor(found));
    return { error: null };
  };

  const signUp = async ({ email, password, displayName }) => {
    const name = String(displayName || '').trim();
    if (!name) return { error: { message: 'What should people call you?' } };
    if (!looksLikeEmail(email)) return { error: { message: 'That does not look like an email address.' } };
    if (String(password || '').length < 4) return { error: { message: 'Use at least 4 characters.' } };
    if (accounts.some((a) => a.email === clean(email))) {
      return { error: { message: 'That email already has an account. Sign in instead.' } };
    }
    const account = {
      id: 'acc-' + Date.now().toString(36),
      email: clean(email),
      password,
      displayName: name,
    };
    await persist([...accounts, account], sessionFor(account));
    return { error: null };
  };

  /**
   * Google, via Supabase. Unlike the email path above this is the real thing —
   * Supabase does the OAuth, we just open the browser and catch the return.
   *
   * Works in Expo Go: the redirect target is whatever Linking.createURL gives
   * us (an exp:// URL on Expo Go, movievouch:// in a build). Google never sees
   * it — Google only ever redirects to Supabase's https callback, and Supabase
   * then bounces to us. The only requirement is that the URL printed below is
   * in Supabase's redirect allow-list.
   */
  const signInWithGoogle = async () => {
    if (!isConfigured) {
      return { error: { message: 'Google sign-in needs a Supabase project. Add the URL and key to .env, then restart.' } };
    }
    const redirectTo = Linking.createURL('/auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return { error: { message: 'Google sign-in was cancelled.' } };

    // We ask for PKCE (?code=), but read the fragment too so an implicit
    // response still works. Everything the redirect carries, merged.
    const url = res.url;
    const afterQ = url.split('?')[1] || '';
    const params = {
      ...Object.fromEntries(new URLSearchParams(afterQ.split('#')[0])),
      ...Object.fromEntries(new URLSearchParams(url.split('#')[1] || '')),
    };

    // A failed authorisation comes back as a normal redirect carrying an
    // error — surface it rather than reporting "no session" for everything.
    if (params.error || params.error_description) {
      return { error: { message: params.error_description || params.error } };
    }

    let authed = null;
    if (params.code) {
      const out = await supabase.auth.exchangeCodeForSession(params.code);
      if (out.error) return { error: out.error };
      authed = out.data?.session;
    } else if (params.access_token && params.refresh_token) {
      const out = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (out.error) return { error: out.error };
      authed = out.data?.session;
    }

    if (!authed?.user) {
      // name what did come back, so the next attempt has something to go on
      const keys = Object.keys(params);
      return { error: { message: keys.length
        ? `Google came back with no session. The redirect carried: ${keys.join(', ')}.`
        : 'Google came back with an empty redirect — the session was lost on the way back to the app.' } };
    }

    const u = authed.user;
    const account = {
      id: u.id,
      email: u.email || '',
      password: null,                        // there is no password on a Google account
      displayName: u.user_metadata?.full_name || u.user_metadata?.name || (u.email || '').split('@')[0],
    };
    const rest = accounts.filter((a) => a.id !== account.id);
    await persist([...rest, account], sessionFor(account));
    return { error: null };
  };

  const signOut = async () => {
    if (isConfigured) await supabase.auth.signOut().catch(() => {});
    await persist(accounts, null);
    return { error: null };
  };

  return (
    <Ctx.Provider value={{
      ready, session, user: session?.user || null,
      signIn, signUp, signInWithGoogle, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
