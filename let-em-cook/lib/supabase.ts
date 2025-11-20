import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Prefer EXPO_PUBLIC_* envs; fall back to app.json extra for local dev.
const extra =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ||
  // manifest is legacy in dev; used as a fallback only.
  (Constants.manifest?.extra as Record<string, unknown> | undefined);
const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (typeof extra?.EXPO_PUBLIC_SUPABASE_URL === "string"
    ? (extra?.EXPO_PUBLIC_SUPABASE_URL as string)
    : undefined);
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (typeof extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY === "string"
    ? (extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string)
    : undefined);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (in env or app.json extra), then restart Expo."
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
  //   console.log("SUPABASE_URL:", SUPABASE_URL);
  //   console.log("supabase client created");
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

// ============= CHALLENGE FUNCTIONS =============

/**
 * Upload an image to Supabase Storage
 * @param imageUri - Local file URI from ImagePicker
 * @param userId - User ID for organizing files
 * @returns URL of the uploaded image or null if failed
 */
export async function uploadChallengeImage(
  imageUri: string,
  userId: string
): Promise<string | null> {
  try {
    // Generate a unique filename
    const fileExt = imageUri.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Convert blob to ArrayBuffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("challenge-images")
      .upload(fileName, arrayBuffer, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("challenge-images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadChallengeImage:", error);
    return null;
  }
}

/**
 * Create a new challenge in the database
 */
export async function createChallenge({
  title,
  timeLimit,
  difficulty,
  description,
  ingredients,
  imageUri,
}: {
  title: string;
  timeLimit: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  ingredients: string[];
  imageUri: string | null;
}) {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error("No authenticated user") };
    }

    const username = user.user_metadata?.username || "Anonymous";

    // Upload image if provided
    let imageUrl: string | null = null;
    if (imageUri && imageUri !== "null") {
      imageUrl = await uploadChallengeImage(imageUri, user.id);
    }

    // Insert challenge into database
    const { data, error } = await supabase
      .from("challenges")
      .insert({
        title,
        time_limit: timeLimit,
        difficulty,
        description: description || null,
        ingredients,
        image_url: imageUrl,
        created_by: user.id,
        created_by_username: username,
        rating: null,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error("Error creating challenge:", error);
    return { data: null, error };
  }
}

/**
 * Fetch all challenges ordered by recency
 */
export async function fetchChallenges() {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return { data: null, error };
  }
}
