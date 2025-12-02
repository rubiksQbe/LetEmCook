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
  dietaryRestrictions,
}: {
  title: string;
  timeLimit: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  ingredients: string[];
  imageUri: string | null;
  dietaryRestrictions?: string[];
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
        dietary_restrictions: dietaryRestrictions || null,
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
      .select(
        `
        *,
        submissions(id)
      `
      )
      .order("created_at", { ascending: false });

    if (data) {
      // Transform the data to include submission_count
      const transformedData = data.map((challenge: any) => ({
        ...challenge,
        submission_count: challenge.submissions?.length || 0,
        submissions: undefined, // Remove the nested submissions array
      }));
      return { data: transformedData, error };
    }

    return { data, error };
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return { data: null, error };
  }
}

/**
 * Fetch a single challenge by ID
 */
export async function fetchChallenge(challengeId: string) {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select(`
        *,
        submissions(id)
      `)
      .eq("id", challengeId)
      .single();

    if (data) {
      // Transform the data to include submission_count
      const transformedData = {
        ...data,
        submission_count: data.submissions?.length || 0,
        submissions: undefined, // Remove the nested submissions array
      };
      return { data: transformedData, error };
    }

    return { data, error };
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return { data: null, error };
  }
}

/**
 * Delete a challenge from the database
 */
export async function deleteChallenge(challengeId: string) {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error("No authenticated user") };
    }

    // Delete the challenge (RLS policy ensures only creator can delete)
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId)
      .eq("created_by", user.id);

    return { error };
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return { error };
  }
}

// ============= SUBMISSION FUNCTIONS =============

/**
 * Upload a submission image to Supabase Storage
 */
export async function uploadSubmissionImage(
  imageUri: string,
  userId: string
): Promise<string | null> {
  try {
    // Generate a unique filename
    const fileExt = imageUri.split(".").pop();
    const fileName = `${userId}/submissions/${Date.now()}.${fileExt}`;

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
      console.error("Error uploading submission image:", error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("challenge-images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadSubmissionImage:", error);
    return null;
  }
}

/**
 * Create or update a user's submission to a challenge
 * If the user is the challenge creator, update the challenge image instead
 */
export async function submitToChallenge(
  challengeId: string,
  imageUri: string,
  isCreator: boolean
) {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error("No authenticated user") };
    }

    const username = user.user_metadata?.username || "Anonymous";

    // Upload image
    const imageUrl = await uploadSubmissionImage(imageUri, user.id);
    if (!imageUrl) {
      return { data: null, error: new Error("Failed to upload image") };
    }

    // If user is creator, update the challenge image
    if (isCreator) {
      const { data, error } = await supabase
        .from("challenges")
        .update({ image_url: imageUrl })
        .eq("id", challengeId)
        .eq("created_by", user.id)
        .select()
        .single();

      return { data, error };
    }

    // Otherwise, create or update submission
    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .single();

    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from("submissions")
        .update({ image_url: imageUrl })
        .eq("id", existingSubmission.id)
        .select()
        .single();

      return { data, error };
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from("submissions")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          username,
          image_url: imageUrl,
          upvotes: 0,
          downvotes: 0,
        })
        .select()
        .single();

      return { data, error };
    }
  } catch (error) {
    console.error("Error submitting to challenge:", error);
    return { data: null, error };
  }
}

/**
 * Fetch all submissions for a challenge with vote counts
 */
export async function fetchSubmissions(challengeId: string) {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false });

    return { data, error };
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return { data: null, error };
  }
}

/**
 * Check if user has submitted to a challenge
 */
export async function hasUserSubmitted(challengeId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("submissions")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

// ============= VOTING FUNCTIONS =============

/**
 * Vote on a challenge (after completing it)
 */
export async function voteOnChallenge(
  challengeId: string,
  voteType: "up" | "down"
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error("No authenticated user") };
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("challenge_votes")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      // Update existing vote if different, or remove if same
      if (existingVote.vote_type === voteType) {
        // Remove vote (toggle off)
        const { error: deleteError } = await supabase
          .from("challenge_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) return { error: deleteError };

        // Update challenge vote counts
        await updateChallengeVoteCounts(challengeId);
        return { error: null };
      } else {
        // Change vote
        const { error: updateError } = await supabase
          .from("challenge_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id);

        if (updateError) return { error: updateError };

        // Update challenge vote counts
        await updateChallengeVoteCounts(challengeId);
        return { error: null };
      }
    }

    // Create new vote
    const { error: insertError } = await supabase.from("challenge_votes").insert({
      challenge_id: challengeId,
      user_id: user.id,
      vote_type: voteType,
    });

    if (insertError) {
      console.error("Error inserting vote:", insertError);
      return { error: insertError };
    }

    // Update challenge vote counts - wait for it to complete
    await updateChallengeVoteCounts(challengeId);
    return { error: null };
  } catch (error) {
    console.error("Error voting on challenge:", error);
    return { error };
  }
}

/**
 * Vote on a submission
 */
export async function voteOnSubmission(
  submissionId: string,
  voteType: "up" | "down"
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error("No authenticated user") };
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("submission_votes")
      .select("*")
      .eq("submission_id", submissionId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      // Update existing vote if different, or remove if same
      if (existingVote.vote_type === voteType) {
        // Remove vote (toggle off)
        const { error: deleteError } = await supabase
          .from("submission_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) return { error: deleteError };

        // Update submission vote counts
        await updateSubmissionVoteCounts(submissionId);
        return { error: null };
      } else {
        // Change vote
        const { error: updateError } = await supabase
          .from("submission_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id);

        if (updateError) return { error: updateError };

        // Update submission vote counts
        await updateSubmissionVoteCounts(submissionId);
        return { error: null };
      }
    }

    // Create new vote
    const { error } = await supabase.from("submission_votes").insert({
      submission_id: submissionId,
      user_id: user.id,
      vote_type: voteType,
    });

    if (error) return { error };

    // Update submission vote counts
    await updateSubmissionVoteCounts(submissionId);
    return { error: null };
  } catch (error) {
    console.error("Error voting on submission:", error);
    return { error };
  }
}

/**
 * Get user's vote on a challenge
 */
export async function getUserChallengeVote(
  challengeId: string
): Promise<"up" | "down" | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("challenge_votes")
      .select("vote_type")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .single();

    return data?.vote_type || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user's vote on a submission
 */
export async function getUserSubmissionVote(
  submissionId: string
): Promise<"up" | "down" | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("submission_votes")
      .select("vote_type")
      .eq("submission_id", submissionId)
      .eq("user_id", user.id)
      .single();

    return data?.vote_type || null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to update challenge vote counts
 */
async function updateChallengeVoteCounts(challengeId: string) {
  try {
    const { data: votes, error: votesError } = await supabase
      .from("challenge_votes")
      .select("vote_type")
      .eq("challenge_id", challengeId);

    if (votesError) {
      console.error("Error fetching votes:", votesError);
      return;
    }

    const upvotes = votes?.filter((v) => v.vote_type === "up").length || 0;
    const downvotes = votes?.filter((v) => v.vote_type === "down").length || 0;

    const { error: updateError } = await supabase
      .from("challenges")
      .update({ upvotes, downvotes })
      .eq("id", challengeId);

    if (updateError) {
      console.error("Error updating challenge vote counts:", updateError);
    }
  } catch (error) {
    console.error("Error in updateChallengeVoteCounts:", error);
  }
}

/**
 * Helper function to update submission vote counts
 */
async function updateSubmissionVoteCounts(submissionId: string) {
  const { data: votes } = await supabase
    .from("submission_votes")
    .select("vote_type")
    .eq("submission_id", submissionId);

  const upvotes = votes?.filter((v) => v.vote_type === "up").length || 0;
  const downvotes = votes?.filter((v) => v.vote_type === "down").length || 0;

  await supabase
    .from("submissions")
    .update({ upvotes, downvotes })
    .eq("id", submissionId);
}

// ================= PINNED CHALLENGE FUNCTIONS =================

/**
 * Check if a specific challenge is currently pinned by a user
 * @param challengeId - The ID of the challenge
 * @param userId - The ID of the user
 * @returns true if pinned, false otherwise
 */
export async function isChallengePinned(
  challengeId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("pinned")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // ignore "No rows found" error
      console.error("Error checking pinned challenge:", error);
    }

    return !!data;
  } catch (err) {
    console.error("Error in isChallengePinnedByUser:", err);
    return false;
  }
}

/**
 * Get the currently pinned challenge (if any) for a user
 * @param userId - The ID of the user
 * @returns The challenge_id of the pinned challenge or null
 */
export async function getPinnedChallengeForUser(
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("pinned")
      .select("challenge_id")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching pinned challenge:", error);
    }

    return data?.challenge_id || null;
  } catch (err) {
    console.error("Error in getPinnedChallengeForUser:", err);
    return null;
  }
}

/**
 * Toggle pin/unpin for a challenge
 * @param userId - current user ID
 * @param challengeId - challenge to pin/unpin
 * @returns true if pinned, false if unpinned, null if error
 */
export async function togglePinChallenge(
  userId: string,
  challengeId: string
): Promise<boolean | null> {
  try {
    // 1️⃣ Check if user already has this challenge pinned
    const { data: existingPinned, error: selectError } = await supabase
      .from("pinned")
      .select("id, challenge_id")
      .eq("user_id", userId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking pinned challenge:", selectError);
      return null;
    }

    // 2️⃣ If same challenge is already pinned → unpin
    if (existingPinned?.challenge_id === challengeId) {
      const { error: deleteError } = await supabase
        .from("pinned")
        .delete()
        .eq("id", existingPinned.id);

      if (deleteError) {
        console.error("Error unpinning challenge:", deleteError);
        return null;
      }
      return false; // unpinned
    }

    // 3️⃣ Delete old pinned challenge if exists (different challenge)
    if (existingPinned) {
      const { error: deleteOldError } = await supabase
        .from("pinned")
        .delete()
        .eq("id", existingPinned.id);

      if (deleteOldError) {
        console.error("Error deleting old pinned challenge:", deleteOldError);
        return null;
      }
    }

    // 4️⃣ Insert new pinned challenge
    const { data: newPinned, error: insertError } = await supabase
      .from("pinned")
      .insert({
        user_id: userId,
        challenge_id: challengeId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error pinning challenge:", insertError);
      return null;
    }

    return true; // pinned
  } catch (err) {
    console.error("Unexpected error in togglePinChallenge:", err);
    return null;
  }
}
