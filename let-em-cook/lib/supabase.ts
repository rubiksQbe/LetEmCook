import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Prefer EXPO_PUBLIC_* envs; fall back to app.json extra for local dev.
const extra =
	(Constants.expoConfig?.extra as Record<string, unknown> | undefined) ||
	// manifest is legacy in dev; used as a fallback only.
	(Constants.manifest?.extra as Record<string, unknown> | undefined);
const SUPABASE_URL =
	(process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
	(typeof extra?.EXPO_PUBLIC_SUPABASE_URL === 'string' ? (extra?.EXPO_PUBLIC_SUPABASE_URL as string) : undefined);
const SUPABASE_ANON_KEY =
	(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
	(typeof extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'string' ? (extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) : undefined);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error(
		'Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (in env or app.json extra), then restart Expo.'
	);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

export async function signUpWithUsername(username: string, password: string) {
	// Supabase requires an email or phone as the primary identifier.
	// To support "username + password" UX without emails, we alias the username to a synthetic email.
	// Ensure you disable email confirmations in your Supabase project.
	const aliasEmail = `${username}@example.local`;

	const { data, error } = await supabase.auth.signUp({
		email: aliasEmail,
		password,
		options: {
			data: { username },
			emailRedirectTo: undefined,
		},
	});
	return { data, error };
}

export async function signInWithUsername(username: string, password: string) {
	const aliasEmail = `${username}@example.local`;
	const { data, error } = await supabase.auth.signInWithPassword({
		email: aliasEmail,
		password,
	});
	return { data, error };
}


