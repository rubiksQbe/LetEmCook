import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../../constants/Colors";
import { Challenge, ChallengeRow } from "../../../constants/types";
import { fetchChallenges, supabase } from "../../../lib/supabase";

// Helper function to convert database row to Challenge interface
function convertToChallenge(row: ChallengeRow, currentUserId?: string): Challenge {
  // Format username as "Chef [Username]" or "Your Challenge" if current user
  const displayUsername = row.created_by === currentUserId 
    ? "Your Challenge" 
    : `Chef ${row.created_by_username}`;

  return {
    id: row.id,
    title: row.title,
    timeLimit: row.time_limit,
    difficulty: row.difficulty,
    ingredients: row.ingredients,
    description: row.description ?? undefined,
    pinned: false, // Pinned state is per-user, stored locally
    image: row.image_url ? { uri: row.image_url } : require("@/assets/images/placeholder.jpg"),
    created_at: row.created_at,
    created_by: row.created_by,
    created_by_username: displayUsername,
    image_url: row.image_url ?? undefined,
    dietary_restrictions: row.dietary_restrictions ?? undefined,
    upvotes: row.upvotes || 0,
    downvotes: row.downvotes || 0,
    submission_count: row.submission_count || 0,
  };
}

export default function ChallengeScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Filter states
  const [titleSearch, setTitleSearch] = useState("");
  const [creatorSearch, setCreatorSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"Easy" | "Medium" | "Hard" | null>(null);
  const [maxTimeMinutes, setMaxTimeMinutes] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Function to load challenges
  const loadChallenges = useCallback(async () => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);

      // Fetch challenges
      const { data, error } = await fetchChallenges();
      if (error) {
        console.error("Error fetching challenges:", error);
        return;
      }

      if (data) {
        const convertedChallenges = data.map((row: ChallengeRow) => 
          convertToChallenge(row, user?.id)
        );
        setChallenges(convertedChallenges);
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch challenges on mount
  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Refetch challenges when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [loadChallenges])
  );

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("challenges-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
        },
        async (payload) => {

          if (payload.eventType === "INSERT") {
            // New challenge added - fetch the full challenge data to ensure all fields are present
            const { data: fullChallenge, error } = await supabase
              .from("challenges")
              .select(`
                *,
                submissions(id)
              `)
              .eq("id", payload.new.id)
              .single();
            
            if (fullChallenge && !error) {
              const challengeWithCount = {
                ...fullChallenge,
                submission_count: fullChallenge.submissions?.length || 0,
                submissions: undefined,
              };
              const newChallenge = convertToChallenge(
                challengeWithCount as ChallengeRow,
                currentUserId
              );
              setChallenges((prev) => {
                // Check if challenge already exists to avoid duplicates
                const exists = prev.some(c => c.id === newChallenge.id);
                if (exists) return prev;
                return [newChallenge, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            // Challenge updated
            const updatedChallenge = convertToChallenge(
              payload.new as ChallengeRow,
              currentUserId
            );
            setChallenges((prev) =>
              prev.map((c) => (c.id === updatedChallenge.id ? updatedChallenge : c))
            );
          } else if (payload.eventType === "DELETE") {
            // Challenge deleted
            setChallenges((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        async (payload) => {
          // Update submission count for the affected challenge
          const challengeId = 
            payload.eventType === "DELETE" 
              ? payload.old.challenge_id 
              : payload.new.challenge_id;
          
          if (challengeId) {
            const { count } = await supabase
              .from("submissions")
              .select("*", { count: "exact", head: true })
              .eq("challenge_id", challengeId);
            
            setChallenges((prev) =>
              prev.map((c) =>
                c.id === challengeId
                  ? { ...c, submission_count: count || 0 }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Filter challenges in real-time
  const filteredChallenges = useMemo(() => {
    return challenges.filter((challenge) => {
      // Title search filter
      if (titleSearch) {
        const titleLower = titleSearch.toLowerCase();
        const titleMatch = challenge.title.toLowerCase().includes(titleLower);
        if (!titleMatch) return false;
      }

      // Creator search filter
      if (creatorSearch) {
        const creatorLower = creatorSearch.toLowerCase();
        
        // Allow searching for own challenges with keywords like "me", "my", "mine", "your"
        const isOwnChallengeKeyword = ["me", "my", "mine", "your"].some(keyword => 
          creatorLower.includes(keyword)
        );
        const isOwnChallenge = challenge.created_by === currentUserId;
        
        if (isOwnChallengeKeyword && isOwnChallenge) {
          // Match found - this is the user's challenge
        } else {
          // Check if creator name matches
          const creatorMatch = challenge.created_by_username?.toLowerCase().includes(creatorLower);
          if (!creatorMatch) return false;
        }
      }

      // Difficulty filter
      if (selectedDifficulty && challenge.difficulty !== selectedDifficulty) {
        return false;
      }

      // Time limit filter
      if (maxTimeMinutes !== null) {
        // Parse time limit (assumes format like "30 minutes" or "1 hour")
        const timeLimitLower = challenge.timeLimit.toLowerCase();
        let challengeMinutes = 0;
        
        if (timeLimitLower.includes("hour")) {
          const hours = parseFloat(timeLimitLower);
          challengeMinutes = hours * 60;
        } else if (timeLimitLower.includes("minute")) {
          challengeMinutes = parseFloat(timeLimitLower);
        }
        
        if (challengeMinutes > maxTimeMinutes) return false;
      }

      // Ingredient search
      if (ingredientSearch) {
        const ingredientLower = ingredientSearch.toLowerCase();
        const hasIngredient = challenge.ingredients.some((ing) =>
          ing.toLowerCase().includes(ingredientLower)
        );
        if (!hasIngredient) return false;
      }

      // Dietary restrictions filter
      if (selectedDietaryRestrictions.length > 0) {
        const challengeRestrictions = challenge.dietary_restrictions || [];
        const hasAllRestrictions = selectedDietaryRestrictions.every((restriction) =>
          challengeRestrictions.includes(restriction)
        );
        if (!hasAllRestrictions) return false;
      }

      return true;
    });
  }, [challenges, titleSearch, creatorSearch, selectedDifficulty, maxTimeMinutes, ingredientSearch, selectedDietaryRestrictions]);

  // Common dietary restrictions for filtering
  const commonDietaryRestrictions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free"];

  // Time limit options in minutes
  const timeLimitOptions = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
  ];

  const toggleDietaryRestriction = (restriction: string) => {
    setSelectedDietaryRestrictions((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  };

  const clearAllFilters = () => {
    setTitleSearch("");
    setCreatorSearch("");
    setSelectedDifficulty(null);
    setMaxTimeMinutes(null);
    setIngredientSearch("");
    setSelectedDietaryRestrictions([]);
  };

  const hasActiveFilters =
    titleSearch ||
    creatorSearch ||
    selectedDifficulty ||
    maxTimeMinutes !== null ||
    ingredientSearch ||
    selectedDietaryRestrictions.length > 0;


  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Page Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Challenges</Text>
      </View>

      {/* Challenge List */}
      <FlatList
        data={filteredChallenges}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: Colors.palette.light }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {/* Filter Toggle Button */}
            <View style={styles.filterToggleContainer}>
              <TouchableOpacity
                style={styles.filterToggleButton}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons 
                  name={showFilters ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.palette.darkest} 
                />
                <Text style={styles.filterToggleText}>
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Text>
                {hasActiveFilters && <View style={styles.activeFilterDot} />}
              </TouchableOpacity>
              {hasActiveFilters && (
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.clearFiltersText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Panel */}
            {showFilters && (
              <View style={[styles.filterPanel, styles.filterPanelContent]}>
                {/* Search by Title */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Search Title</Text>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color={Colors.palette.dark} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by challenge title..."
                      placeholderTextColor={Colors.palette.dark}
                      value={titleSearch}
                      onChangeText={setTitleSearch}
                      autoCorrect={false}
                    />
                    {titleSearch ? (
                      <TouchableOpacity onPress={() => setTitleSearch("")}>
                        <Ionicons name="close-circle" size={20} color={Colors.palette.dark} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Search by Creator */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Search Creator</Text>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="person" size={20} color={Colors.palette.dark} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Try 'my' or a chef's name..."
                      placeholderTextColor={Colors.palette.dark}
                      value={creatorSearch}
                      onChangeText={setCreatorSearch}
                      autoCorrect={false}
                    />
                    {creatorSearch ? (
                      <TouchableOpacity onPress={() => setCreatorSearch("")}>
                        <Ionicons name="close-circle" size={20} color={Colors.palette.dark} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Difficulty Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Difficulty</Text>
                  <View style={styles.buttonGroup}>
                    {(["Easy", "Medium", "Hard"] as const).map((difficulty) => (
                      <TouchableOpacity
                        key={difficulty}
                        style={[
                          styles.filterButton,
                          selectedDifficulty === difficulty && styles.filterButtonActive,
                        ]}
                        onPress={() =>
                          setSelectedDifficulty(
                            selectedDifficulty === difficulty ? null : difficulty
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            selectedDifficulty === difficulty && styles.filterButtonTextActive,
                          ]}
                        >
                          {difficulty}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Time Limit Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Max Time</Text>
                  <View style={styles.buttonGroup}>
                    {timeLimitOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterButton,
                          maxTimeMinutes === option.value && styles.filterButtonActive,
                        ]}
                        onPress={() =>
                          setMaxTimeMinutes(
                            maxTimeMinutes === option.value ? null : option.value
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            maxTimeMinutes === option.value && styles.filterButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Ingredient Search */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Search Ingredients</Text>
                  <View style={styles.searchInputContainer}>
                    <MaterialCommunityIcons
                      name="food-apple"
                      size={20}
                      color={Colors.palette.dark}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="e.g., chicken, tomato..."
                      placeholderTextColor={Colors.palette.dark}
                      value={ingredientSearch}
                      onChangeText={setIngredientSearch}
                      autoCorrect={false}
                    />
                    {ingredientSearch ? (
                      <TouchableOpacity onPress={() => setIngredientSearch("")}>
                        <Ionicons name="close-circle" size={20} color={Colors.palette.dark} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Dietary Restrictions */}
                <View style={[styles.filterSection, { marginBottom: 10 }]}>
                  <Text style={styles.filterLabel}>Dietary Restrictions</Text>
                  <View style={styles.chipGroup}>
                    {commonDietaryRestrictions.map((restriction) => (
                      <TouchableOpacity
                        key={restriction}
                        style={[
                          styles.chip,
                          selectedDietaryRestrictions.includes(restriction) && styles.chipActive,
                        ]}
                        onPress={() => toggleDietaryRestriction(restriction)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedDietaryRestrictions.includes(restriction) &&
                              styles.chipTextActive,
                          ]}
                        >
                          {restriction}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.palette.darkest} />
              <Text style={styles.loadingText}>Loading challenges...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {hasActiveFilters ? "No challenges match your filters" : "No challenges yet!"}
              </Text>
              <Text style={styles.emptySubText}>
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Tap the + icon to create a challenge"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const netVotes = (item.upvotes || 0) - (item.downvotes || 0);
          const submissionCount = item.submission_count || 0;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/challenges/[id]",
                  params: { id: item.id, challenge: JSON.stringify(item) },
                })
              }
            >
              <View style={styles.card}>
                {/* Large Hero Image */}
                <Image source={item.image} style={styles.cardImage} />
                
                {/* Card Content */}
                <View style={styles.cardContent}>
                  {/* Left: Title and Chef Name */}
                  <View style={styles.cardTextContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardCreator}>
                      {item.created_by_username || "Anonymous"}
                    </Text>
                  </View>

                  {/* Right: Likes and Submissions */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statSectionLikes}>
                      <Text style={styles.statCount}>{netVotes}</Text>
                      <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statSection}>
                      <Text style={styles.statCount}>{submissionCount}</Text>
                      <Text style={styles.statLabel}>Submissions</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      
      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingAddButton}
        onPress={() => router.push("/(modals)/addChallenge")}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color="white"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.accent,
    position: "relative",
  },
  loadingContainerBackground: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.palette.darkest,
    fontFamily: "Poppins_400Regular",
  },

  // Page Title
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 1,
    paddingBottom: 14,
    backgroundColor: Colors.palette.accent,
  },
  pageTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 34,
    color: Colors.palette.darkest,
    letterSpacing: -0.5,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.palette.blue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.dark,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Filter Toggle
  filterToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 0,
  },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    backgroundColor: "white",
  },
  filterToggleText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  activeFilterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.palette.darkest,
  },
  clearFiltersText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.dark,
    textDecorationLine: "underline",
  },

  // Filter Panel
  filterPanel: {
    backgroundColor: Colors.palette.light,
  },
  filterPanelContent: {
    padding: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  // Search Input
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.palette.darkest,
  },

  // Button Groups
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  filterButtonActive: {
    backgroundColor: Colors.palette.accent,
    borderColor: Colors.palette.accent,
  },
  filterButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
  },
  filterButtonTextActive: {
    color: Colors.palette.darkest,
  },

  // Chips
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
  },
  chipActive: {
    backgroundColor: Colors.palette.accent,
    borderColor: Colors.palette.accent,
  },
  chipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.palette.darkest,
  },
  chipTextActive: {
    color: Colors.palette.darkest,
    fontFamily: "Poppins_600SemiBold",
  },

  // Cards
  card: {
    backgroundColor: Colors.palette.lightest,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTextContent: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    marginRight: 12,
  },
  cardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: Colors.palette.darkest,
    lineHeight: 28,
  },
  cardCreator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.blue,
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: "column",
    gap: 6,
  },
  statSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    minWidth: 90,
    gap: 6,
  },
  statSectionLikes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    alignSelf: "flex-end",
    gap: 6,
  },
  statCount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.palette.darkest,
    lineHeight: 20,
  },
  statLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: Colors.palette.darkest,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
