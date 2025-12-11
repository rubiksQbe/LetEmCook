import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../../../constants/Colors";
import { Challenge, ChallengeRow, Submission } from "../../../constants/types";
import {
  addHatToUser,
  fetchChallenge,
  fetchSubmissions,
  getUserChallengeVote,
  getUserSubmissionVote,
  hasUserSubmitted,
  isChallengePinned,
  submitToChallenge,
  supabase,
  togglePinChallenge,
  voteOnChallenge,
  voteOnSubmission,
} from "../../../lib/supabase";

const HatAssets: Record<string, any> = {
  "gamerhat.png": require("@/assets/images/mouse-assets/gamerhat.png"),
  "jester.png": require("@/assets/images/mouse-assets/jester.png"),
  "party_hat.png": require("@/assets/images/mouse-assets/party_hat.png"),
  "chef.png": require("@/assets/images/mouse-assets/chef.png"),
};

const ItemAssets: Record<string, any> = {
  "wand.png": require("@/assets/images/mouse-assets/wand.png"),
  "spatula.png": require("@/assets/images/mouse-assets/spatula.png"),
  "SNES_controller.svg.png": require("@/assets/images/mouse-assets/SNES_controller.svg.png"),
  "balloon.png": require("@/assets/images/mouse-assets/balloon.png"),
};

// --- Conditional Hat Positions ---
const hatPosition = (id: string) => {
  switch (id) {
    case "gamerhat.png":
      return { top: 10, right: 31, width: 21, height: 21 };
    case "party_hat.png":
      return { top: 1, right: 26, width: 30, height: 30 };
    case "chef.png":
      return { top: 2, right: 27, width: 30, height: 30 };
    case "jester.png":
      return { top: 1, right: 23, width: 37, height: 37 };
    default:
      return { top: 2, right: 27, width: 30, height: 30 };
  }
};

// --- Conditional Item Positions ---
const itemPosition = (id: string) => {
  switch (id) {
    case "SNES_controller.svg.png":
      return { bottom: 30, right: 3, width: 25, height: 25 };
    case "spatula.png":
      return { bottom: 37, right: 6, width: 24, height: 24 };
    case "wand.png":
      return { bottom: 38, right: 6, width: 24, height: 24 };
    case "balloon.png":
      return { bottom: 38, right: 12, width: 27, height: 27 };
    default:
      return { bottom: 29, right: 6, width: 24, height: 24 };
  }
};

// Helper function to convert database row to Challenge interface
function convertToChallenge(
  row: ChallengeRow,
  currentUserId?: string
): Challenge {
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
    pinned: false,
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

type FriendForShare = {
  id: string;
  username: string;
  avatar: string | null;
  hat: string | null;
  item: string | null;
};

type FriendRow = {
  friend: {
    id: string;
    username: string | null;
    avatar: string | null;
  } | null;
};

export default function ChallengeDetailScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const challengeIdFromParams = params.id as string | undefined;
  // Attempt to parse the challenge object if it exists (for optimistic UI)
  let initialChallenge: Challenge | null = null;
  try {
    // If we only passed 'id' (as in the invite scenario), this will be null
    initialChallenge = params.challenge
      ? JSON.parse(params.challenge as string)
      : null;
  } catch {
    initialChallenge = null;
  }

  let challenge: Challenge | null = null;
  try {
    challenge = params.challenge
      ? JSON.parse(params.challenge as string)
      : null;
  } catch {
    challenge = null;
  }

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isCreator, setIsCreator] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userChallengeVote, setUserChallengeVote] = useState<
    "up" | "down" | null
  >(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const [challengeData, setChallengeData] = useState<Challenge | null>(
    initialChallenge
  );
  const [isPinned, setIsPinned] = useState(false);
  const [friendsForShare, setFriendsForShare] = useState<FriendForShare[]>([]);

  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleBack = () => {
    router.back();
  };

  // Function to load challenge data from database
  const loadChallengeData = useCallback(async () => {
    const idToFetch = challenge?.id || challengeIdFromParams;
    if (!idToFetch) return;

    try {
      const { data, error } = await fetchChallenge(idToFetch);
      if (data && !error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const convertedChallenge = convertToChallenge(
          data as ChallengeRow,
          user?.id
        );
        setChallengeData(convertedChallenge);
        setIsCreator(user?.id === convertedChallenge.created_by);
      }
    } catch (error) {
      console.error("Error loading challenge data:", error);
    }
  }, [challenge?.id, challengeIdFromParams]);

  const loadFriendsForShare = useCallback(async () => {
    if (!currentUserId) return;

    setIsFriendsLoading(true);

    try {
      // 1) Load friends
      const { data: friendshipData, error } = await supabase
        .from("friendships")
        .select(
          `
        friend:profiles!friendships_user_id2_fkey (
          id,
          username,
          avatar
        )
      `
        )
        .eq("user_id1", currentUserId);

      if (error) throw error;

      const friends = (friendshipData as unknown as FriendRow[]).map((row) => ({
        id: row.friend?.id ?? "",
        username: row.friend?.username ?? "Unknown User",
        avatar: row.friend?.avatar ?? null,
        hat: null,
        item: null,
      }));

      const friendIds = friends.map((f) => f.id);

      if (friendIds.length === 0) {
        setFriendsForShare([]);
        return;
      }

      // 2) Fetch accessories
      const { data: accessories } = await supabase
        .from("pal-accessory")
        .select("user_id, hat, item")
        .in("user_id", friendIds);

      // Merge accessories
      for (const f of friends) {
        const acc = accessories?.find((a) => a.user_id === f.id);
        if (acc) {
          f.hat = acc.hat;
          f.item = acc.item;
        }
      }

      setFriendsForShare(friends);
    } catch (e) {
      console.error("Error loading friends:", e);
      Alert.alert("Error", "Could not load friend list.");
    } finally {
      setIsFriendsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    async function init() {
      const idToUse = challenge?.id || challengeIdFromParams;
      if (!idToUse) return;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);

      // Load user's challenge vote status
      if (user) {
        const vote = await getUserChallengeVote(idToUse);
        setUserChallengeVote(vote);
      }

      // Load fresh challenge data from database and other data in parallel
      await Promise.all([
        loadChallengeData(),
        user
          ? hasUserSubmitted(idToUse).then(setHasSubmitted)
          : Promise.resolve(),
        loadSubmissionsById(idToUse),
      ]);
    }

    init();
  }, [challenge?.id, challengeIdFromParams, loadChallengeData]);

  // Refetch challenge data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function refreshData() {
        const idToUse = challenge?.id || challengeIdFromParams;
        if (!idToUse) return;
        // Refresh user's challenge vote status
        const vote = await getUserChallengeVote(idToUse);
        setUserChallengeVote(vote);
        // Then load challenge data
        await loadChallengeData();
      }
      refreshData();
    }, [loadChallengeData, challenge?.id, challengeIdFromParams])
  );

  // Load friends when currentUserId is available
  useEffect(() => {
    if (currentUserId) {
      loadFriendsForShare();
    }
  }, [showShareModal === true]); // [currentUserId, loadFriendsForShare]);

  // Real-time subscription for submissions
  useEffect(() => {
    const idToUse = challenge?.id || challengeIdFromParams;
    if (!idToUse) return;

    const submissionsChannel = supabase
      .channel(`submissions-${idToUse}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `challenge_id=eq.${idToUse}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // New submission added
            const newSubmission = payload.new as any;
            const userVote = await getUserSubmissionVote(newSubmission.id);
            setSubmissions((prev) => [
              { ...newSubmission, user_vote: userVote },
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            // Submission updated (image or votes)
            const updatedSubmission = payload.new as any;
            // Preserve the existing user_vote from state
            setSubmissions((prev) =>
              prev.map((sub) =>
                sub.id === updatedSubmission.id
                  ? { ...updatedSubmission, user_vote: sub.user_vote }
                  : sub
              )
            );
          } else if (payload.eventType === "DELETE") {
            // Submission deleted
            setSubmissions((prev) =>
              prev.filter((sub) => sub.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, [challenge?.id, challengeIdFromParams]);

  // Real-time subscription for challenge updates (image changes, vote counts)
  useEffect(() => {
    const idToUse = challenge?.id || challengeIdFromParams;
    if (!idToUse) return;

    const challengeChannel = supabase
      .channel(`challenge-${idToUse}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${idToUse}`,
        },
        async (payload) => {
          const updatedChallenge = payload.new as any;

          // Update challenge data (image_url, vote counts, etc.)
          setChallengeData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              image_url: updatedChallenge.image_url,
              image: updatedChallenge.image_url
                ? { uri: updatedChallenge.image_url }
                : prev.image,
              upvotes: updatedChallenge.upvotes || 0,
              downvotes: updatedChallenge.downvotes || 0,
            };
          });
        }
      )
      // Voting removed - no longer subscribing to challenge_votes changes
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [challenge?.id, challengeIdFromParams, loadChallengeData, currentUserId]);

  // Check if challenge is pinned when component mounts or currentUserId changes
  useEffect(() => {
    async function checkPinned() {
      if (!currentUserId || !challengeData) return;

      const pinned = await isChallengePinned(challengeData.id, currentUserId);
      setIsPinned(pinned);
    }

    checkPinned();
  }, [currentUserId, challengeData]);

  async function loadSubmissionsById(challengeId: string) {
    if (!challengeId) return;

    setIsLoadingSubmissions(true);
    const { data, error } = await fetchSubmissions(challengeId);
    if (data) {
      // Load user's vote for each submission
      const submissionsWithVotes = await Promise.all(
        data.map(async (sub) => {
          const userVote = await getUserSubmissionVote(sub.id);
          return {
            ...sub,
            user_vote: userVote,
          };
        })
      );
      setSubmissions(submissionsWithVotes);
    }
    setIsLoadingSubmissions(false);
  }

  async function loadSubmissions() {
    const idToUse = challenge?.id || challengeIdFromParams;
    if (!idToUse) return;
    await loadSubmissionsById(idToUse);
  }

  // Use challengeData for real-time updates, fallback to challenge
  const displayChallenge = challengeData || initialChallenge;

  if (!displayChallenge && !challengeIdFromParams) {
    return (
      <View style={styles.container}>
        <Text>Challenge not found.</Text>
      </View>
    );
  }

  if (!displayChallenge) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.palette.darkest} />
        <Text style={styles.loadingText}>Loading challenge details...</Text>
      </View>
    );
  }

  const netVotes =
    (displayChallenge.upvotes || 0) - (displayChallenge.downvotes || 0);
  const submissionCount = displayChallenge.submission_count || 0;

  // Find user's own submission
  const userSubmission = submissions.find(
    (sub) => sub.user_id === currentUserId
  );

  const handlePin = async () => {
    if (!currentUserId || !displayChallenge) return;

    try {
      const result = await togglePinChallenge(
        currentUserId,
        displayChallenge.id
      );

      if (result === true) {
        setIsPinned(true);
      } else if (result === false) {
        // Successfully unpinned
        setIsPinned(false);
      } else {
        // Error
        Alert.alert(
          "Error",
          "Failed to pin/unpin challenge. Please try again."
        );
      }
    } catch (error) {
      console.error("Error handling pin:", error);
      Alert.alert("Error", "Something went wrong while pinning/unpinning.");
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleFriendTap = async (friendId: string) => {
    if (!currentUserId || !displayChallenge) return;

    // 1. Get the friend's current challenge status
    setIsFriendsLoading(true);

    try {
      const { data: friendProfile, error: profileError } = await supabase
        .from("profiles")
        .select("curr_chal, username")
        .eq("id", friendId)
        .single();

      if (profileError || !friendProfile) {
        Alert.alert("Error", "Could not find friend profile.");
        return;
      }

      const friendUsername = friendProfile.username || "Your friend";

      // 2. CHECK 1: If friend already has a current challenge (curr_chal is populated)
      if (friendProfile.curr_chal) {
        Alert.alert(
          "Invite Unsuccessful",
          `${friendUsername} already has a pinned challenge! Invite unsuccessful.`
        );
        return;
      }

      // 3. INVITE: Update the friendship row with the new challenge invitation.
      // The query finds the directional relationship where the current user (inviter) is user_id1.
      const { error: updateError } = await supabase
        .from("friendships")
        .update({
          invited_challenge_id: displayChallenge.id,
          invitation_status: "sent", // Set the new status to 'sent'
        })
        .eq("user_id1", currentUserId)
        .eq("user_id2", friendId)
        .single();

      if (updateError) {
        Alert.alert(
          "Error",
          `Failed to send invite to ${friendUsername}. Relationship not found.`
        );
        console.error("Invite update failed:", updateError);
        return;
      }

      // 4. Success Confirmation
      Alert.alert(
        "Invite Sent!",
        `Successfully invited ${friendUsername} to "${displayChallenge.title}"`
      );

      // Close the share modal
      setShowShareModal(false);
    } catch (error) {
      console.error("Handle friend tap failed:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred during the invitation process."
      );
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to allow access to your photos to submit."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select an image to submit.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has any submissions
      const { data: existingSubmissions, error: fetchError } = await supabase
        .from("submissions")
        .select("id")
        .eq("user_id", currentUserId);

      if (fetchError) throw fetchError;

      const isFirstSubmission = existingSubmissions?.length === 0;

      // Submit the entry
      const { data, error: submitError } = await submitToChallenge(
        displayChallenge.id,
        selectedImage,
        isCreator
      );

      if (submitError) throw submitError;

      setHasSubmitted(true);
      setSelectedImage(null);
      setShowSubmissionModal(false);

      // Reload submissions
      loadSubmissions();

      // Show success alert
      if (!isFirstSubmission) {
        Alert.alert(
          "Success!",
          isCreator
            ? "Challenge image updated!"
            : hasSubmitted
            ? "Your submission has been updated!"
            : "Your submission has been posted!"
        );
      }

      // --- Reward new accessory if first submission ---
      if (!isCreator && isFirstSubmission) {
        const { data: hatData, error: hatError } = await addHatToUser(
          currentUserId!,
          "party_hat.png"
        );

        if (!hatError) {
          Alert.alert(
            "New Accessory Unlocked!",
            "Congratulations on your first submission! You've unlocked the Party Hat for your mouse 🎉 "
          );
        } else {
          console.error("Error adding new hat:", hatError);
        }
      }
    } catch (err) {
      console.error("Error submitting:", err);
      Alert.alert("Error", "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallengeVote = async (voteType: "up" | "down") => {
    if (!displayChallenge || !currentUserId) return;

    // Optimistic update for immediate feedback
    const previousVote = userChallengeVote;
    const previousUpvotes = displayChallenge.upvotes || 0;
    const previousDownvotes = displayChallenge.downvotes || 0;

    // Calculate new vote state
    let newVote: "up" | "down" | null;
    let newUpvotes = previousUpvotes;
    let newDownvotes = previousDownvotes;

    if (previousVote === voteType) {
      // Toggle off
      newVote = null;
      if (voteType === "up") newUpvotes--;
      else newDownvotes--;
    } else {
      // Set new vote
      newVote = voteType;
      if (previousVote === "up") newUpvotes--;
      else if (previousVote === "down") newDownvotes--;
      if (voteType === "up") newUpvotes++;
      else newDownvotes++;
    }

    // Apply optimistic update
    setUserChallengeVote(newVote);
    setChallengeData((prev) =>
      prev ? { ...prev, upvotes: newUpvotes, downvotes: newDownvotes } : prev
    );

    // Make API call
    const { error } = await voteOnChallenge(displayChallenge.id, voteType);

    if (error) {
      // Revert on error
      setUserChallengeVote(previousVote);
      setChallengeData((prev) =>
        prev
          ? { ...prev, upvotes: previousUpvotes, downvotes: previousDownvotes }
          : prev
      );
      console.error("Error voting on challenge:", error);
    }
  };

  const handleSubmissionVote = async (
    submissionId: string,
    voteType: "up" | "down"
  ) => {
    if (!currentUserId) return;

    // Find the submission
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    // Optimistic update
    const previousVote = submission.user_vote;
    const previousUpvotes = submission.upvotes;
    const previousDownvotes = submission.downvotes;

    // Calculate new vote state
    let newVote: "up" | "down" | null;
    let newUpvotes = previousUpvotes;
    let newDownvotes = previousDownvotes;

    if (previousVote === voteType) {
      // Toggle off
      newVote = null;
      if (voteType === "up") newUpvotes--;
      else newDownvotes--;
    } else {
      // Set new vote
      newVote = voteType;
      if (previousVote === "up") newUpvotes--;
      else if (previousVote === "down") newDownvotes--;
      if (voteType === "up") newUpvotes++;
      else newDownvotes++;
    }

    // Apply optimistic update
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              user_vote: newVote,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
            }
          : sub
      )
    );

    // Make API call
    const { error } = await voteOnSubmission(submissionId, voteType);

    if (error) {
      // Revert on error
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                user_vote: previousVote,
                upvotes: previousUpvotes,
                downvotes: previousDownvotes,
              }
            : sub
        )
      );
      console.error("Error voting on submission:", error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky Blurred Status Bar Overlay */}
      <BlurView
        intensity={80}
        tint="light"
        style={[styles.statusBarOverlay, { height: insets.top }]}
      />

      {/* Sticky Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={Colors.palette.darkest} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image with Challenge Vote Buttons */}
        <View style={styles.heroContainer}>
          <Image source={displayChallenge.image} style={styles.heroImage} />
          {/* Challenge Vote Buttons - Always visible */}
          <View style={styles.creatorSubmissionVoteOverlay}>
            <TouchableOpacity
              style={[
                styles.creatorSubmissionVoteButton,
                userChallengeVote === "up" &&
                  styles.creatorSubmissionVoteButtonActive,
              ]}
              onPress={() => handleChallengeVote("up")}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={
                  userChallengeVote === "up" ? "white" : Colors.palette.darkest
                }
              />
              <Text
                style={[
                  styles.creatorSubmissionVoteCount,
                  userChallengeVote === "up" &&
                    styles.creatorSubmissionVoteCountActive,
                ]}
              >
                {displayChallenge.upvotes || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.creatorSubmissionVoteButton,
                userChallengeVote === "down" &&
                  styles.creatorSubmissionVoteButtonActive,
              ]}
              onPress={() => handleChallengeVote("down")}
            >
              <Ionicons
                name="arrow-down"
                size={20}
                color={
                  userChallengeVote === "down"
                    ? "white"
                    : Colors.palette.darkest
                }
              />
              <Text
                style={[
                  styles.creatorSubmissionVoteCount,
                  userChallengeVote === "down" &&
                    styles.creatorSubmissionVoteCountActive,
                ]}
              >
                {displayChallenge.downvotes || 0}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title and Creator */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{displayChallenge.title}</Text>
          <Text style={styles.creator}>
            {displayChallenge.created_by_username || "Anonymous"}
          </Text>
        </View>

        {/* Likes and Submissions Counter */}
        {/* <View style={styles.statsContainer}>
          <View style={styles.statSection}>
            <Text style={styles.statCount}>{netVotes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statSection}>
            <Text style={styles.statCount}>{submissionCount}</Text>
            <Text style={styles.statLabel}>Submissions</Text>
          </View>
        </View> */}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>SHARE</Text>
            <Ionicons
              name="person-add"
              size={24}
              color={Colors.palette.darkest}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pinButton}
            onPress={handlePin}
            activeOpacity={1}
          >
            <MaterialCommunityIcons
              name={isPinned ? "check" : "pin"}
              size={24}
              color={Colors.palette.lightest}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.pinButtonText}>
              {isPinned ? "PINNED" : "PIN TO FRIDGE"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description Card */}
        <View style={styles.descriptionCard}>
          {/* Description */}
          {displayChallenge.description && (
            <Text style={[styles.label, { marginTop: 0 }]}>
              DESCRIPTION:{" "}
              <Text style={styles.value}>{displayChallenge.description}</Text>
            </Text>
          )}

          {/* Time Limit */}
          {displayChallenge.timeLimit && (
            <Text
              style={[
                styles.label,
                !displayChallenge.description && { marginTop: 0 },
              ]}
            >
              TIME LIMIT:{" "}
              <Text style={styles.value}>
                {displayChallenge.timeLimit} (not including prep time)
              </Text>
            </Text>
          )}

          {/* Ingredients */}
          {displayChallenge.ingredients &&
            displayChallenge.ingredients.length > 0 && (
              <Text style={styles.label}>
                INGREDIENTS:{" "}
                <Text style={styles.value}>
                  {displayChallenge.ingredients.join(", ")}
                </Text>
              </Text>
            )}

          {/* Dietary Restrictions */}
          {displayChallenge.dietary_restrictions &&
            displayChallenge.dietary_restrictions.length > 0 && (
              <Text style={styles.label}>
                DIETARY RESTRICTIONS:{" "}
                <Text style={styles.value}>
                  {displayChallenge.dietary_restrictions.join(", ")}
                </Text>
              </Text>
            )}
        </View>

        {/* User's Submission with Vote Buttons */}
        {userSubmission && (
          <View style={styles.userSubmissionContainer}>
            <Text style={styles.userSubmissionTitle}>Your Submission</Text>
            <View style={styles.userSubmissionImageContainer}>
              <Image
                source={{ uri: userSubmission.image_url }}
                style={styles.userSubmissionImage}
              />
              {/* Like/Dislike Buttons Overlay */}
              <View style={styles.userSubmissionVoteOverlay}>
                <TouchableOpacity
                  style={[
                    styles.userSubmissionVoteButton,
                    userSubmission.user_vote === "up" &&
                      styles.userSubmissionVoteButtonActive,
                  ]}
                  onPress={() => handleSubmissionVote(userSubmission.id, "up")}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={
                      userSubmission.user_vote === "up"
                        ? "white"
                        : Colors.palette.darkest
                    }
                  />
                  <Text
                    style={[
                      styles.userSubmissionVoteCount,
                      userSubmission.user_vote === "up" &&
                        styles.userSubmissionVoteCountActive,
                    ]}
                  >
                    {userSubmission.upvotes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userSubmissionVoteButton,
                    userSubmission.user_vote === "down" &&
                      styles.userSubmissionVoteButtonActive,
                  ]}
                  onPress={() =>
                    handleSubmissionVote(userSubmission.id, "down")
                  }
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={
                      userSubmission.user_vote === "down"
                        ? "white"
                        : Colors.palette.darkest
                    }
                  />
                  <Text
                    style={[
                      styles.userSubmissionVoteCount,
                      userSubmission.user_vote === "down" &&
                        styles.userSubmissionVoteCountActive,
                    ]}
                  >
                    {userSubmission.downvotes}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Submission Button */}
        <TouchableOpacity
          style={styles.submissionButton}
          onPress={() => setShowSubmissionModal(true)}
        >
          <Ionicons
            name={isCreator ? "image" : "camera"}
            size={24}
            color={Colors.palette.darkest}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submissionButtonText}>
            {isCreator
              ? "UPDATE CHALLENGE IMAGE"
              : hasSubmitted
              ? "RESUBMIT ENTRY"
              : "SUBMIT ENTRY"}
          </Text>
        </TouchableOpacity>

        {/* Submissions Section */}
        <View style={styles.submissionsSection}>
          <TouchableOpacity
            style={styles.submissionsHeader}
            onPress={() => setShowSubmissions(!showSubmissions)}
          >
            <Text style={styles.submissionsTitle}>
              Community Submissions ({submissions.length})
            </Text>
            <Ionicons
              name={showSubmissions ? "chevron-up" : "chevron-down"}
              size={22}
              color={Colors.palette.darkest}
            />
          </TouchableOpacity>

          {showSubmissions && (
            <View style={styles.submissionsList}>
              {isLoadingSubmissions ? (
                <ActivityIndicator
                  size="large"
                  color={Colors.palette.darkest}
                  style={{ marginVertical: 20 }}
                />
              ) : submissions.length === 0 ? (
                <Text style={styles.noSubmissionsText}>
                  No submissions yet. Be the first!
                </Text>
              ) : (
                submissions.map((submission) => (
                  <View key={submission.id} style={styles.submissionItem}>
                    <Image
                      source={{ uri: submission.image_url }}
                      style={styles.submissionImage}
                    />
                    <View style={styles.submissionInfo}>
                      <Text style={styles.submissionUsername}>
                        Chef {submission.username}
                      </Text>
                      <View style={styles.submissionVotes}>
                        <TouchableOpacity
                          style={[
                            styles.submissionVoteButton,
                            submission.user_vote === "up" &&
                              styles.submissionVoteButtonActive,
                          ]}
                          onPress={() =>
                            handleSubmissionVote(submission.id, "up")
                          }
                        >
                          <Ionicons
                            name="arrow-up"
                            size={20}
                            color={
                              submission.user_vote === "up"
                                ? "white"
                                : Colors.palette.dark
                            }
                          />
                          <Text
                            style={[
                              styles.voteCount,
                              submission.user_vote === "up" &&
                                styles.voteCountActive,
                            ]}
                          >
                            {submission.upvotes}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.submissionVoteButton,
                            submission.user_vote === "down" &&
                              styles.submissionVoteButtonActive,
                          ]}
                          onPress={() =>
                            handleSubmissionVote(submission.id, "down")
                          }
                        >
                          <Ionicons
                            name="arrow-down"
                            size={20}
                            color={
                              submission.user_vote === "down"
                                ? "white"
                                : Colors.palette.dark
                            }
                          />
                          <Text
                            style={[
                              styles.voteCount,
                              submission.user_vote === "down" &&
                                styles.voteCountActive,
                            ]}
                          >
                            {submission.downvotes}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Challenge</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>

            {isFriendsLoading ? (
              <ActivityIndicator
                size="large"
                color={Colors.palette.blue}
                style={{ marginVertical: 30 }}
              />
            ) : friendsForShare.length === 0 ? (
              <Text style={styles.noFriendsText}>
                You need to add friends first!
              </Text>
            ) : (
              <View style={styles.friendsGrid}>
                {friendsForShare.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendCard}
                    onPress={() => handleFriendTap(friend.id)}
                  >
                    <View style={{ position: "relative" }}>
                      {/* Base avatar */}
                      <Image
                        source={
                          friend.avatar
                            ? { uri: friend.avatar }
                            : require("@/assets/images/mouse-assets/defaultmouse.png")
                        }
                        style={styles.friendCardImage}
                        resizeMode="contain"
                      />

                      {/* HAT overlay */}
                      {friend.hat && HatAssets[friend.hat] && (
                        <Image
                          source={HatAssets[friend.hat]}
                          style={[
                            {
                              position: "absolute",
                              resizeMode: "contain",
                            },
                            hatPosition(friend.hat),
                          ]}
                        />
                      )}

                      {/* ITEM overlay */}
                      {friend.item && ItemAssets[friend.item] && (
                        <Image
                          source={ItemAssets[friend.item]}
                          style={[
                            {
                              position: "absolute",
                              resizeMode: "contain",
                            },
                            itemPosition(friend.item),
                          ]}
                        />
                      )}
                    </View>

                    <Text style={styles.friendCardName}>{friend.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Submission Modal */}
      <Modal
        visible={showSubmissionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubmissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCreator
                  ? "Update Challenge Image"
                  : hasSubmitted
                  ? "Resubmit Entry"
                  : "Submit Entry"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSubmissionModal(false);
                  setSelectedImage(null);
                }}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={Colors.palette.darkest}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Image Picker */}
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
              >
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                  />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Ionicons
                      name="camera"
                      size={40}
                      color={Colors.palette.dark}
                    />
                    <Text style={styles.imagePickerText}>Select Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isCreator
                      ? "UPDATE IMAGE"
                      : hasSubmitted
                      ? "UPDATE SUBMISSION"
                      : "SUBMIT ENTRY"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroContainer: {
    position: "relative",
    width: "100%",
    height: 400,
  },
  heroImage: {
    width: "100%",
    height: 400,
    resizeMode: "cover",
  },
  creatorSubmissionVoteOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  creatorSubmissionVoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
    minWidth: 60,
  },
  creatorSubmissionVoteButtonActive: {
    backgroundColor: Colors.palette.blue,
  },
  creatorSubmissionVoteCount: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.dark,
  },
  creatorSubmissionVoteCountActive: {
    color: "white",
  },
  statusBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 1000,
  },
  backButton: {
    position: "absolute",
    top: 70,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  titleSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: Colors.palette.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.palette.darkest,
    marginBottom: 4,
    lineHeight: 24,
  },
  creator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.blue,
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  statSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: Colors.palette.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  statCount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.palette.darkest,
    lineHeight: 20,
  },
  statLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.palette.darkest,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userSubmissionContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  userSubmissionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.palette.darkest,
    marginBottom: 12,
  },
  userSubmissionImageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userSubmissionImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    resizeMode: "cover",
  },
  userSubmissionVoteOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  userSubmissionVoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 60,
  },
  userSubmissionVoteButtonActive: {
    backgroundColor: Colors.palette.blue,
  },
  userSubmissionVoteCount: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
  },
  userSubmissionVoteCountActive: {
    color: "white",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  pinButton: {
    flex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.blue,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.palette.dark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.palette.lightest,
    letterSpacing: 0.5,
  },
  shareButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.accent,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.palette.dark,
    shadowColor: Colors.palette.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  shareButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.palette.darkest,
    letterSpacing: 0.5,
  },
  descriptionCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 6,
    borderLeftColor: Colors.palette.accent,
  },
  label: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginTop: 16,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  value: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.dark,
    lineHeight: 22,
  },

  // Submission Button
  submissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.accent,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submissionButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: Colors.palette.darkest,
    letterSpacing: 0.5,
  },
  challengeVoteSection: {
    marginBottom: 20,
  },
  challengeVoteLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 12,
  },
  voteButtons: {
    flexDirection: "row",
    gap: 12,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  voteButtonActive: {
    backgroundColor: Colors.palette.blue,
  },
  imagePickerButton: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  imagePickerPlaceholder: {
    flex: 1,
    backgroundColor: Colors.palette.light,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.dark,
    borderStyle: "dashed",
    borderRadius: 16,
  },
  imagePickerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.dark,
    marginTop: 8,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  submitButton: {
    backgroundColor: Colors.palette.darkest,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "white",
    letterSpacing: 0.5,
  },

  // Submissions Section
  submissionsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  submissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  submissionsList: {
    marginTop: 12,
  },
  noSubmissionsText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.dark,
    textAlign: "center",
    paddingVertical: 20,
  },
  submissionItem: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    resizeMode: "cover",
  },
  submissionInfo: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  submissionUsername: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  submissionVotes: {
    flexDirection: "row",
    gap: 8,
  },
  submissionVoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
    minWidth: 60,
  },
  submissionVoteButtonActive: {
    backgroundColor: Colors.palette.blue,
  },
  voteCount: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.dark,
  },
  voteCountActive: {
    color: "white",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    minHeight: 450,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.darkest,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.palette.darkest,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Share Modal Styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shareModalContent: {
    backgroundColor: Colors.palette.light,
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  shareModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: Colors.palette.lightest,
  },
  shareModalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.palette.darkest,
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    justifyContent: "space-around",
    gap: 16,
  },
  friendCard: {
    alignItems: "center",
    width: "30%",
  },
  friendCardImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 5,
    marginBottom: 8,
    //backgroundColor: Colors.palette.lightest,
  },
  friendCardName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.darkest,
    textAlign: "center",
  },
  noFriendsText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.dark,
    textAlign: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.palette.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.palette.darkest,
  },
});
