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
}
