// This file defines the TypeScript interfaces used throughout the application.

// main challenge interface
export interface Challenge {
  id: string;
  title: string;
  timeLimit: string;
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number | undefined; // 0 to 5 or no rating
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
  rating: number | null;
  dietary_restrictions: string[] | null;
}
