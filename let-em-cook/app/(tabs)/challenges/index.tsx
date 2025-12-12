import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AnimatedFAB,
  ChallengeCardSkeleton,
} from "../../../components/animations";
import Colors from "../../../constants/Colors";
import { Challenge, ChallengeRow } from "../../../constants/types";
import { fetchChallenges, supabase } from "../../../lib/supabase";

// Helper function to convert database row to Challenge interface
function convertToChallenge(
  row: ChallengeRow,
  currentUserId?: string
): Challenge {
  // Format username as "Chef [Username]" or "Your Challenge" if current user
  const displayUsername =
    row.created_by === currentUserId
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
    image: row.image_url
      ? { uri: row.image_url }
      : require("@/assets/images/placeholder.jpg"),
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

type ChallengeInvitation = {
  key: string;
  sender_id: string;
  recipient_id: string;
  sender_username: string;
  challenge_id: string;
  challenge_title: string;
};

// Animated Challenge Card Component - Subtle animations
interface AnimatedChallengeCardProps {
  item: Challenge;
  index: number;
  onPress: () => void;
}

function AnimatedChallengeCard({
  item,
  index,
  onPress,
}: AnimatedChallengeCardProps) {
  const scale = useSharedValue(1);
  const likesCount = item.upvotes || 0;
  const submissionCount = item.submission_count || 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      layout={Layout.springify()}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.card}>
            {/* Large Hero Image */}
            <View style={styles.cardImageContainer}>
              <Image source={item.image} style={styles.cardImage} />
              {/* Difficulty Chip */}
              <View style={styles.difficultyChip}>
                <Text style={styles.difficultyChipText}>{item.difficulty}</Text>
              </View>
            </View>

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
                  <Text style={styles.statCount}>{likesCount}</Text>
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
      </Animated.View>
    </Animated.View>
  );
}

export default function ChallengeScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [invitations, setInvitations] = useState<ChallengeInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [dismissedInviteKeys, setDismissedInviteKeys] = useState<Set<string>>(
    new Set()
  );

  // Filter states
  const [unifiedSearch, setUnifiedSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    ("Easy" | "Medium" | "Hard")[]
  >([]);
  const [maxTimeMinutes, setMaxTimeMinutes] = useState<number[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] =
    useState<string[]>([]);

  // Sort state
  const [sortBy, setSortBy] = useState<"recent" | "submissions" | "likes">(
    "likes"
  );

  // Modal states
  const [modalVisible, setModalVisible] = useState<
    "difficulty" | "time" | "ingredients" | "dietary" | "sort" | null
  >(null);
  const [ingredientInput, setIngredientInput] = useState("");
  const [dietaryInput, setDietaryInput] = useState("");
  const [customTimeValue, setCustomTimeValue] = useState("");
  const [customTimeUnit, setCustomTimeUnit] = useState<"min" | "hr">("min");

  // Function to fetch invitations
  const fetchInvitations = useCallback(
    async (myUserId: string) => {
      if (!myUserId) return;

      const { data, error } = await supabase
        .from("friendships")
        .select(
          `
          user_id1,        
          user_id2,        
          invitation_status,
          sender:profiles!friendships_user_id1_fkey (username),
          challenge:challenges!friendships_invited_challenge_id_fkey (id, title)
        `
        )
        // Filter for invites sent TO me (I am user_id2)
        .eq("user_id2", myUserId)
        // Filter for active invites
        .eq("invitation_status", "sent");

      if (error) {
        console.error("Error fetching invites:", error);
        return;
      }

      if (data && data.length > 0) {
        const pendingInvites: ChallengeInvitation[] = data
          .map((row: any) => ({
            key: `${row.user_id1}-${row.user_id2}-${
              Array.isArray(row.challenge)
                ? row.challenge[0]?.id
                : row.challenge?.id
            }`,
            sender_id: row.user_id1,
            recipient_id: row.user_id2,
            sender_username: Array.isArray(row.sender)
              ? row.sender[0]?.username || "A Friend"
              : row.sender?.username || "A Friend",
            challenge_id: Array.isArray(row.challenge)
              ? row.challenge[0]?.id
              : row.challenge?.id,
            challenge_title: Array.isArray(row.challenge)
              ? row.challenge[0]?.title || "Unknown Challenge"
              : row.challenge?.title || "Unknown Challenge",
          }))
          // Filter out any rows where challenge data failed to load
          .filter((invite) => invite.challenge_id && invite.challenge_title)
          // Filter out invites that have already been dismissed this session
          .filter((invite) => !dismissedInviteKeys.has(invite.key));

        setInvitations(pendingInvites);
        if (pendingInvites.length > 0) {
          setShowInviteModal(true);
        }
      }
    },
    [dismissedInviteKeys]
  );

  // Function to load challenges
  const loadChallenges = useCallback(async () => {
    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;
      setCurrentUserId(userId);

      // Fetch challenges
      const { data, error } = await fetchChallenges();
      if (error) {
        console.error("Error fetching challenges:", error);
        return;
      }

      if (data) {
        const convertedChallenges = data.map((row: ChallengeRow) =>
          convertToChallenge(row, userId)
        );
        setChallenges(convertedChallenges);
      }
      if (userId) {
        await fetchInvitations(userId);
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvitations]);

  const handleAcceptInvite = async (invite: ChallengeInvitation) => {
    // 1. Mark the invitation as accepted/resolved in the friendships table
    // We update the row where we are the recipient (user_id2)
    // Keep the challenge_id so it can be shown in invite history
    const { error } = await supabase
      .from("friendships")
      .update({
        invitation_status: "viewed", // Mark as viewed but keep challenge_id for history
      })
      .eq("user_id1", invite.sender_id)
      .eq("user_id2", invite.recipient_id);

    if (error) {
      console.error("Failed to update invite status:", error);
      Alert.alert("Error", "Could not mark invite as seen.");
      // Continue navigation even if status update fails
    }

    if (!invite.challenge_id) {
      Alert.alert("Error", "Challenge ID is missing from the invite object.");
      setShowInviteModal(false);
      return;
    }
    // 2. Navigate to the challenge
    router.push({
      pathname: "/challenges/[id]",
      params: { id: invite.challenge_id },
    });

    // 3. Close the modal and clear invitations state for immediate UI update
    setShowInviteModal(false);
    setInvitations([]);
  };

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
              .select(
                `
                *,
                submissions(id)
              `
              )
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
                const exists = prev.some((c) => c.id === newChallenge.id);
                if (exists) return prev;
                return [newChallenge, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            // Challenge updated - fetch full challenge data to ensure all fields (including vote counts) are present
            const { data: fullChallenge, error } = await supabase
              .from("challenges")
              .select(
                `
                *,
                submissions(id)
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (fullChallenge && !error) {
              const challengeWithCount = {
                ...fullChallenge,
                submission_count: fullChallenge.submissions?.length || 0,
                submissions: undefined,
              };
              const updatedChallenge = convertToChallenge(
                challengeWithCount as ChallengeRow,
                currentUserId
              );
              setChallenges((prev) =>
                prev.map((c) =>
                  c.id === updatedChallenge.id ? updatedChallenge : c
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            // Challenge deleted - remove it from the list
            const deletedId = (payload.old as any).id;
            setChallenges((prev) => prev.filter((c) => c.id !== deletedId));
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
      // Unified search filter (searches both title and creator)
      if (unifiedSearch) {
        const searchLower = unifiedSearch.toLowerCase();
        const titleMatch = challenge.title.toLowerCase().includes(searchLower);

        // Allow searching for own challenges with keywords like "me", "my", "mine", "your"
        const isOwnChallengeKeyword = ["me", "my", "mine", "your"].some(
          (keyword) => searchLower.includes(keyword)
        );
        const isOwnChallenge = challenge.created_by === currentUserId;

        let creatorMatch = false;
        if (isOwnChallengeKeyword && isOwnChallenge) {
          creatorMatch = true;
        } else {
          creatorMatch =
            challenge.created_by_username
              ?.toLowerCase()
              .includes(searchLower) || false;
        }

        // Show challenge if either title or creator matches
        if (!titleMatch && !creatorMatch) return false;
      }

      // Difficulty filter (multi-select)
      if (
        selectedDifficulty.length > 0 &&
        !selectedDifficulty.includes(
          challenge.difficulty as "Easy" | "Medium" | "Hard"
        )
      ) {
        return false;
      }

      // Time limit filter (multi-select)
      if (maxTimeMinutes.length > 0) {
        // Parse time limit (assumes format like "30 minutes" or "1 hour")
        const timeLimitLower = challenge.timeLimit.toLowerCase();
        let challengeMinutes = 0;

        if (timeLimitLower.includes("hr")) {
          const hours = parseFloat(timeLimitLower);
          challengeMinutes = hours * 60;
        } else if (timeLimitLower.includes("min")) {
          challengeMinutes = parseFloat(timeLimitLower);
        }

        // Check if challenge time exactly matches any of the selected times
        const matchesAnyTime = maxTimeMinutes.some(
          (maxTime) => challengeMinutes === maxTime
        );
        if (!matchesAnyTime) return false;
      }

      // Ingredient search (multi-select)
      if (selectedIngredients.length > 0) {
        // Check if challenge has at least one of the selected ingredients
        const hasMatchingIngredient = selectedIngredients.some(
          (selectedIng) => {
            const selectedLower = selectedIng.toLowerCase();
            return challenge.ingredients.some((ing) =>
              ing.toLowerCase().includes(selectedLower)
            );
          }
        );
        if (!hasMatchingIngredient) return false;
      }

      // Dietary restrictions filter
      if (selectedDietaryRestrictions.length > 0) {
        const challengeRestrictions = challenge.dietary_restrictions || [];
        const hasAllRestrictions = selectedDietaryRestrictions.every(
          (restriction) => challengeRestrictions.includes(restriction)
        );
        if (!hasAllRestrictions) return false;
      }

      return true;
    });
  }, [
    challenges,
    unifiedSearch,
    selectedDifficulty,
    maxTimeMinutes,
    selectedIngredients,
    selectedDietaryRestrictions,
    currentUserId,
  ]);

  // Sort challenges based on selected sort option
  const sortedChallenges = useMemo(() => {
    const sorted = [...filteredChallenges];
    switch (sortBy) {
      case "submissions":
        return sorted.sort(
          (a, b) => (b.submission_count || 0) - (a.submission_count || 0)
        );
      case "likes":
        return sorted.sort((a, b) => {
          const aLikes = a.upvotes || 0;
          const bLikes = b.upvotes || 0;
          return bLikes - aLikes;
        });
      case "recent":
      default:
        return sorted.sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        });
    }
  }, [filteredChallenges, sortBy]);

  // Sort options for display
  const sortOptions = [
    { label: "By Recent", value: "recent" as const },
    { label: "By Submissions", value: "submissions" as const },
    { label: "By Likes", value: "likes" as const },
  ];

  // Common dietary restrictions for filtering
  const commonDietaryRestrictions = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Nut-Free",
    "Halal",
    "Kosher",
  ];

  // Time limit options in minutes
  const timeLimitOptions = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "1 hr", value: 60 },
  ];

  const toggleDietaryRestriction = (restriction: string) => {
    setSelectedDietaryRestrictions((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  };

  const addDietaryRestriction = () => {
    const trimmed = dietaryInput.trim();
    if (trimmed && !selectedDietaryRestrictions.includes(trimmed)) {
      setSelectedDietaryRestrictions([...selectedDietaryRestrictions, trimmed]);
      setDietaryInput("");
    }
  };

  const removeDietaryRestriction = (restriction: string) => {
    setSelectedDietaryRestrictions(
      selectedDietaryRestrictions.filter((r) => r !== restriction)
    );
  };

  const clearAllFilters = () => {
    setUnifiedSearch("");
    setSelectedDifficulty([]);
    setMaxTimeMinutes([]);
    setSelectedIngredients([]);
    setSelectedDietaryRestrictions([]);
  };

  const hasActiveFilters =
    unifiedSearch ||
    selectedDifficulty.length > 0 ||
    maxTimeMinutes.length > 0 ||
    selectedIngredients.length > 0 ||
    selectedDietaryRestrictions.length > 0;

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients([...selectedIngredients, trimmed]);
      setIngredientInput("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setSelectedIngredients(
      selectedIngredients.filter((ing) => ing !== ingredient)
    );
  };

  const addCustomTime = () => {
    const trimmed = customTimeValue.trim();
    if (trimmed) {
      const value = parseFloat(trimmed);
      if (!isNaN(value) && value > 0) {
        const minutes = customTimeUnit === "hr" ? value * 60 : value;
        const roundedMinutes = Math.round(minutes);
        if (!maxTimeMinutes.includes(roundedMinutes)) {
          setMaxTimeMinutes([...maxTimeMinutes, roundedMinutes]);
          setCustomTimeValue("");
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.palette.dark} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or creator..."
            placeholderTextColor={Colors.palette.dark}
            value={unifiedSearch}
            onChangeText={setUnifiedSearch}
            autoCorrect={false}
          />
          {unifiedSearch ? (
            <TouchableOpacity onPress={() => setUnifiedSearch("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.palette.dark}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersSectionContainer}>
        <View style={styles.filtersHeaderRow}>
          <Text style={styles.filtersSectionLabel}>Filters</Text>
          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={clearAllFilters}
              style={styles.clearFiltersButtonInline}
            >
              <Text style={styles.clearFiltersTextInline}>Clear All</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clearFiltersButtonInline}>
              <Text style={styles.clearFiltersTextPlaceholder}>Clear All</Text>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {/* Sort By */}
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipActive]}
            onPress={() => setModalVisible("sort")}
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={Colors.palette.darkest}
            />
            <Text style={styles.filterChipText} numberOfLines={1}>
              {sortOptions.find((opt) => opt.value === sortBy)?.label || "Sort"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>

          {/* Difficulty Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedDifficulty.length > 0 && styles.filterChipActive,
            ]}
            onPress={() => setModalVisible("difficulty")}
          >
            <Text style={styles.filterChipText} numberOfLines={1}>
              Difficulty
              {selectedDifficulty.length > 0
                ? ` (${selectedDifficulty.length})`
                : ""}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>

          {/* Time Limit Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              maxTimeMinutes.length > 0 && styles.filterChipActive,
            ]}
            onPress={() => setModalVisible("time")}
          >
            <Text style={styles.filterChipText} numberOfLines={1}>
              Time Limit
              {maxTimeMinutes.length > 0 ? ` (${maxTimeMinutes.length})` : ""}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>

          {/* Ingredient Search Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedIngredients.length > 0 && styles.filterChipActive,
            ]}
            onPress={() => {
              setModalVisible("ingredients");
              setIngredientInput("");
            }}
          >
            <Text style={styles.filterChipText} numberOfLines={1}>
              Ingredients
              {selectedIngredients.length > 0
                ? ` (${selectedIngredients.length})`
                : ""}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>

          {/* Dietary Restrictions Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedDietaryRestrictions.length > 0 && styles.filterChipActive,
            ]}
            onPress={() => {
              setModalVisible("dietary");
              setDietaryInput("");
            }}
          >
            <Text style={styles.filterChipText} numberOfLines={1}>
              Dietary
              {selectedDietaryRestrictions.length > 0
                ? ` (${selectedDietaryRestrictions.length})`
                : ""}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Difficulty Modal */}
      <Modal
        visible={modalVisible === "difficulty"}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={0}
          onPress={() => setModalVisible(null)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Difficulty</Text>
              <TouchableOpacity onPress={() => setModalVisible(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {(["Easy", "Medium", "Hard"] as const).map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.modalOption,
                    selectedDifficulty.includes(difficulty) &&
                      styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedDifficulty((prev) =>
                      prev.includes(difficulty)
                        ? prev.filter((d) => d !== difficulty)
                        : [...prev, difficulty]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedDifficulty.includes(difficulty) &&
                        styles.modalOptionTextActive,
                    ]}
                  >
                    {difficulty}
                  </Text>
                  {selectedDifficulty.includes(difficulty) && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setSelectedDifficulty([]);
                }}
              >
                <Text style={styles.modalClearText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setModalVisible(null)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Limit Modal */}
      <Modal
        visible={modalVisible === "time"}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={0}
            onPress={() => setModalVisible(null)}
          />
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Limit</Text>
              <TouchableOpacity onPress={() => setModalVisible(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalOptions}
              showsVerticalScrollIndicator={false}
            >
              {timeLimitOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    maxTimeMinutes.includes(option.value) &&
                      styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setMaxTimeMinutes((prev) =>
                      prev.includes(option.value)
                        ? prev.filter((t) => t !== option.value)
                        : [...prev, option.value]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      maxTimeMinutes.includes(option.value) &&
                        styles.modalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {maxTimeMinutes.includes(option.value) && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Time Input */}
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <Text style={styles.modalSectionLabel}>Custom Time:</Text>
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={[styles.modalInput, styles.customTimeInput]}
                    placeholder="Enter time..."
                    placeholderTextColor={Colors.palette.dark}
                    value={customTimeValue}
                    onChangeText={setCustomTimeValue}
                    keyboardType="numeric"
                    autoCorrect={false}
                  />
                  <View style={styles.unitSelector}>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        customTimeUnit === "min" && styles.unitButtonActive,
                      ]}
                      onPress={() => setCustomTimeUnit("min")}
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          customTimeUnit === "min" &&
                            styles.unitButtonTextActive,
                        ]}
                      >
                        min
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        customTimeUnit === "hr" && styles.unitButtonActive,
                      ]}
                      onPress={() => setCustomTimeUnit("hr")}
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          customTimeUnit === "hr" &&
                            styles.unitButtonTextActive,
                        ]}
                      >
                        hr
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={addCustomTime}
                    style={styles.plusButton}
                    disabled={!customTimeValue.trim()}
                  >
                    <Ionicons
                      name="add"
                      size={24}
                      color={
                        customTimeValue.trim()
                          ? Colors.palette.blue
                          : Colors.palette.dark
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {maxTimeMinutes.length > 0 && (
                <View style={styles.modalTimeList}>
                  <Text style={styles.modalIngredientsLabel}>
                    Selected Times:
                  </Text>
                  <View style={styles.modalChipContainer}>
                    {maxTimeMinutes
                      .sort((a, b) => a - b)
                      .map((minutes) => {
                        const hours = minutes / 60;
                        const label =
                          hours >= 1 && hours % 1 === 0
                            ? `${hours} hr`
                            : `${minutes} min`;
                        return (
                          <TouchableOpacity
                            key={minutes}
                            style={styles.modalIngredientChip}
                            onPress={() => {
                              setMaxTimeMinutes(
                                maxTimeMinutes.filter((t) => t !== minutes)
                              );
                            }}
                          >
                            <Text style={styles.modalIngredientChipText}>
                              {label}
                            </Text>
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color={Colors.palette.darkest}
                            />
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setMaxTimeMinutes([]);
                }}
              >
                <Text style={styles.modalClearText}>Clear Selection</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => {
                setModalVisible(null);
                setCustomTimeValue("");
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ingredients Modal */}
      <Modal
        visible={modalVisible === "ingredients"}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={0}
            onPress={() => setModalVisible(null)}
          />
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ingredients</Text>
              <TouchableOpacity onPress={() => setModalVisible(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                placeholder="Type ingredient..."
                placeholderTextColor={Colors.palette.dark}
                value={ingredientInput}
                onChangeText={setIngredientInput}
                autoCorrect={false}
                autoFocus={true}
                onSubmitEditing={addIngredient}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addIngredient}
                style={styles.plusButton}
                disabled={!ingredientInput.trim()}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={
                    ingredientInput.trim()
                      ? Colors.palette.blue
                      : Colors.palette.dark
                  }
                />
              </TouchableOpacity>
            </View>
            {selectedIngredients.length > 0 && (
              <View style={styles.modalIngredientsList}>
                <Text style={styles.modalIngredientsLabel}>
                  Selected Ingredients:
                </Text>
                <View style={styles.modalChipContainer}>
                  {selectedIngredients.map((ingredient) => (
                    <TouchableOpacity
                      key={ingredient}
                      style={styles.modalIngredientChip}
                      onPress={() => removeIngredient(ingredient)}
                    >
                      <Text style={styles.modalIngredientChipText}>
                        {ingredient}
                      </Text>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.palette.darkest}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.modalClearButton}
                  onPress={() => {
                    setSelectedIngredients([]);
                  }}
                >
                  <Text style={styles.modalClearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => {
                setModalVisible(null);
                setIngredientInput("");
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dietary Restrictions Modal */}
      <Modal
        visible={modalVisible === "dietary"}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={0}
            onPress={() => setModalVisible(null)}
          />
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dietary Restrictions</Text>
              <TouchableOpacity onPress={() => setModalVisible(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalChipContainer}>
                {commonDietaryRestrictions.map((restriction) => (
                  <TouchableOpacity
                    key={restriction}
                    style={[
                      styles.modalChip,
                      selectedDietaryRestrictions.includes(restriction) &&
                        styles.modalChipActive,
                    ]}
                    onPress={() => toggleDietaryRestriction(restriction)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        selectedDietaryRestrictions.includes(restriction) &&
                          styles.modalChipTextActive,
                      ]}
                    >
                      {restriction}
                    </Text>
                    {selectedDietaryRestrictions.includes(restriction) && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={Colors.palette.darkest}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                placeholder="Type dietary restriction..."
                placeholderTextColor={Colors.palette.dark}
                value={dietaryInput}
                onChangeText={setDietaryInput}
                autoCorrect={false}
                autoFocus={false}
                onSubmitEditing={addDietaryRestriction}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addDietaryRestriction}
                style={styles.plusButton}
                disabled={!dietaryInput.trim()}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={
                    dietaryInput.trim()
                      ? Colors.palette.blue
                      : Colors.palette.dark
                  }
                />
              </TouchableOpacity>
            </View>
            {selectedDietaryRestrictions.length > 0 && (
              <View style={styles.modalIngredientsList}>
                <Text style={styles.modalIngredientsLabel}>
                  Selected Dietary Restrictions:
                </Text>
                <View style={styles.modalChipContainer}>
                  {selectedDietaryRestrictions.map((restriction) => (
                    <TouchableOpacity
                      key={restriction}
                      style={styles.modalIngredientChip}
                      onPress={() => removeDietaryRestriction(restriction)}
                    >
                      <Text style={styles.modalIngredientChipText}>
                        {restriction}
                      </Text>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.palette.darkest}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.modalClearButton}
                  onPress={() => {
                    setSelectedDietaryRestrictions([]);
                  }}
                >
                  <Text style={styles.modalClearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => {
                setModalVisible(null);
                setDietaryInput("");
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={modalVisible === "sort"}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={0}
          onPress={() => setModalVisible(null)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setModalVisible(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    sortBy === option.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    setModalVisible(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      sortBy === option.value && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setModalVisible(null)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Challenge List */}
      <Animated.FlatList
        data={sortedChallenges}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: Colors.palette.light }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 15,
          paddingBottom: 100,
        }}
        ListHeaderComponent={null}
        ListEmptyComponent={
          isLoading ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
            </Animated.View>
          ) : (
            <Animated.View
              style={styles.emptyContainer}
              entering={FadeInUp.duration(500)}
            >
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? "No challenges match your filters"
                  : "No challenges yet!"}
              </Text>
              <Text style={styles.emptySubText}>
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Tap the + icon to create a challenge"}
              </Text>
            </Animated.View>
          )
        }
        renderItem={({ item, index }) => (
          <AnimatedChallengeCard
            item={item}
            index={index}
            onPress={() =>
              router.push({
                pathname: "/challenges/[id]",
                params: {
                  id: item.id,
                  challenge: JSON.stringify(item),
                },
              })
            }
          />
        )}
      />

      {/* Invitation Modal */}
      <Modal
        visible={showInviteModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.inviteModalOverlay}>
          <View style={styles.inviteModalContent}>
            <Text style={styles.inviteModalTitle}>
              New Challenge Invitations!
            </Text>
            <Text style={styles.inviteModalSubtitle}>
              You have {invitations.length} challenges waiting for you.
            </Text>

            <ScrollView style={styles.inviteModalScrollView}>
              {invitations.map((invite) => (
                <View key={invite.key} style={styles.inviteCard}>
                  <View style={styles.inviteCardText}>
                    <Text style={styles.inviteCardMessage}>
                      <Text style={styles.inviteCardSender}>
                        {invite.sender_username}
                      </Text>{" "}
                      invited you to a challenge:
                    </Text>
                    <Text style={styles.inviteCardChallenge}>
                      "{invite.challenge_title}"
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inviteCardButton}
                    onPress={() => handleAcceptInvite(invite)}
                  >
                    <Text style={styles.inviteCardButtonText}>View</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.inviteModalCloseButton}
              onPress={async () => {
                // Mark all current invitations as dismissed in the database
                // This will update the sender's view to remove "Invited to..." text
                // Keep the challenge_id so it can be shown in invite history
                for (const invite of invitations) {
                  await supabase
                    .from("friendships")
                    .update({
                      invitation_status: "closed", // Mark as closed but keep challenge_id for history
                    })
                    .eq("user_id1", invite.sender_id)
                    .eq("user_id2", invite.recipient_id);
                }

                // Mark all current invitations as dismissed so they won't show again this session
                const newDismissed = new Set(dismissedInviteKeys);
                invitations.forEach((invite) => newDismissed.add(invite.key));
                setDismissedInviteKeys(newDismissed);
                setShowInviteModal(false);
              }}
            >
              <Text style={styles.inviteModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <AnimatedFAB
        onPress={() => router.push("/(modals)/addChallenge")}
        style={styles.floatingAddButton}
      >
        <MaterialCommunityIcons
          name="plus"
          size={30}
          color={Colors.palette.darkest}
        />
      </AnimatedFAB>
    </SafeAreaView>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 1,
    paddingBottom: 8,
    backgroundColor: Colors.palette.light,
  },
  titleRowSpacer: {
    width: 28,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 28,
    color: Colors.palette.darkest,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.palette.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
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

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: Colors.palette.light,
    gap: 10,
  },

  // Filters Section
  filtersSectionContainer: {
    backgroundColor: Colors.palette.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.dark,
  },
  filtersHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  filtersSectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.palette.dark,
    letterSpacing: 0.3,
  },
  clearFiltersButtonInline: {
    paddingVertical: 4,
    minWidth: 70,
    alignItems: "flex-end",
  },
  clearFiltersTextInline: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.palette.blue,
    textDecorationLine: "underline",
  },
  clearFiltersTextPlaceholder: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "transparent",
  },
  filtersScrollView: {
    maxHeight: 60,
  },
  filtersScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 10,
    gap: 3,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    gap: 6,
    marginRight: 4,
    maxWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.palette.accent,
  },
  filterChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.darkest,
    flexShrink: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.palette.lightest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.darkest,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.palette.darkest,
  },
  modalOptions: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "white",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
  },
  modalOptionActive: {
    backgroundColor: Colors.palette.accent,
  },
  modalOptionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  modalOptionTextActive: {
    fontFamily: "Poppins_600SemiBold",
  },
  modalClearButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalClearText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.palette.blue,
    textDecorationLine: "underline",
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
  },
  modalInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  plusButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    gap: 8,
  },
  modalChipActive: {
    backgroundColor: Colors.palette.accent,
  },
  modalChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.palette.darkest,
  },
  modalChipTextActive: {
    fontFamily: "Poppins_600SemiBold",
  },
  modalIngredientsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalIngredientsLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 12,
  },
  modalIngredientChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.palette.accent,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    gap: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  modalIngredientChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.palette.darkest,
  },
  modalSectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 8,
  },
  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customTimeInput: {
    flex: 1,
    minWidth: 100,
  },
  unitSelector: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    overflow: "hidden",
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  unitButtonActive: {
    backgroundColor: Colors.palette.accent,
  },
  unitButtonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.dark,
  },
  unitButtonTextActive: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.darkest,
  },
  modalTimeList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalDoneButton: {
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.palette.blue,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDoneText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "white",
  },

  // Search Input
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
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

  // Cards
  card: {
    backgroundColor: Colors.palette.lightest,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
  },
  cardImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  difficultyChip: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.palette.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  difficultyChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.palette.darkest,
    textAlign: "center",
  },
  cardContent: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTextContent: {
    flex: 1,
    flexDirection: "column",
    gap: 3,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    color: Colors.palette.darkest,
    lineHeight: 26,
  },
  cardCreator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.blue,
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: "column",
    gap: 4,
  },
  statSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    minWidth: 85,
    gap: 5,
  },
  statSectionLikes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    alignSelf: "flex-end",
    gap: 5,
  },
  statCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.darkest,
    lineHeight: 22,
  },
  statLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.palette.darkest,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  inviteModalContent: {
    backgroundColor: Colors.palette.lightest,
    borderRadius: 20,
    width: "100%",
    maxWidth: 380,
    padding: 25,
  },
  inviteModalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.palette.darkest,
    marginBottom: 8,
  },
  inviteModalSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.dark,
    marginBottom: 15,
  },
  inviteModalScrollView: {
    maxHeight: 300,
  },
  inviteCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: Colors.palette.blue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCardText: {
    flex: 1,
    marginRight: 10,
  },
  inviteCardMessage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 4,
  },
  inviteCardSender: {
    fontFamily: "Poppins_700Bold",
    color: Colors.palette.blue,
  },
  inviteCardChallenge: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.palette.darkest,
    fontStyle: "italic",
  },
  inviteCardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.palette.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCardButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "white",
  },
  inviteModalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteModalCloseText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.dark,
  },
});
