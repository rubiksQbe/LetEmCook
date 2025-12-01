// This file defines the TypeScript interfaces used throughout the application.

// main challenge interface
export interface Challenge {
  id: string;
  title: string;
  timeLimit: string;
  difficulty: "Easy" | "Medium" | "Hard";
  ingredients: string[];
  description?: string;
  pinned: boolean;
  // Note: For React Native, 'image' usually refers to a 'number' type
  // when using require() for static assets, or a string for a URL.
  image: any;
  created_at?: string; // ISO timestamp from database
  created_by?: string; // User ID who created the challenge
  created_by_username?: string; // Username of creator
  image_url?: string; // URL from Supabase Storage
  dietary_restrictions?: string[]; // Array of dietary restrictions
  upvotes?: number; // Total upvotes for the challenge
  downvotes?: number; // Total downvotes for the challenge
  submission_count?: number; // Number of submissions for the challenge
}

// Database row type (matches Supabase table structure)
export interface ChallengeRow {
  id: string;
  created_at: string;
  title: string;
  time_limit: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string | null;
  ingredients: string[];
  image_url: string | null;
  created_by: string;
  created_by_username: string;
  dietary_restrictions: string[] | null;
  upvotes: number;
  downvotes: number;
  submission_count?: number; // Number of submissions (added via query)
}

// Submission interface - represents a user's submission to a challenge
export interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  username: string;
  image_url: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote?: "up" | "down" | null; // Current user's vote on this submission
}

// Database row type for submissions
export interface SubmissionRow {
  id: string;
  challenge_id: string;
  user_id: string;
  username: string;
  image_url: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

// Vote types
export type VoteType = "up" | "down";

// Challenge vote (user votes on whether they liked doing the challenge)
export interface ChallengeVote {
  id: string;
  challenge_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

// Submission vote (user votes on someone's submission)
export interface SubmissionVote {
  id: string;
  submission_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}
