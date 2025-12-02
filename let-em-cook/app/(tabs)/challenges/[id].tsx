import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { Challenge, Submission } from "../../../constants/types";
import {
  fetchSubmissions,
  getUserChallengeVote,
  getUserSubmissionVote,
  hasUserSubmitted,
  submitToChallenge,
  supabase,
  voteOnChallenge,
  voteOnSubmission,
} from "../../../lib/supabase";

export default function ChallengeDetailScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

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
    challenge
  );

  useEffect(() => {
    async function init() {
      if (!challenge) return;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
      setIsCreator(user?.id === challenge.created_by);

      // Check if user has submitted
      if (user) {
        const submitted = await hasUserSubmitted(challenge.id);
        setHasSubmitted(submitted);

        // Get user's vote on challenge
        const vote = await getUserChallengeVote(challenge.id);
        setUserChallengeVote(vote);
      }

      // Load submissions
      loadSubmissions();
    }

    init();
  }, [challenge?.id]);

  // Real-time subscription for submissions
  useEffect(() => {
    if (!challenge) return;

    const submissionsChannel = supabase
      .channel(`submissions-${challenge.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `challenge_id=eq.${challenge.id}`,
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
            const userVote = await getUserSubmissionVote(updatedSubmission.id);
            setSubmissions((prev) =>
              prev.map((sub) =>
                sub.id === updatedSubmission.id
                  ? { ...updatedSubmission, user_vote: userVote }
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
  }, [challenge?.id]);

  // Real-time subscription for challenge updates (image changes)
  useEffect(() => {
    if (!challenge) return;

    const challengeChannel = supabase
      .channel(`challenge-${challenge.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challenge.id}`,
        },
        async (payload) => {
          const updatedChallenge = payload.new as any;

          // Update challenge data (especially image_url)
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
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [challenge?.id]);

  async function loadSubmissions() {
    if (!challenge) return;

    setIsLoadingSubmissions(true);
    const { data, error } = await fetchSubmissions(challenge.id);
    if (data) {
      // Get user votes for each submission
      const submissionsWithVotes = await Promise.all(
        data.map(async (sub) => {
          const userVote = await getUserSubmissionVote(sub.id);
          return { ...sub, user_vote: userVote };
        })
      );
      setSubmissions(submissionsWithVotes);
    }
    setIsLoadingSubmissions(false);
  }

  // Use challengeData for real-time updates, fallback to challenge
  const displayChallenge = challengeData || challenge;

  if (!displayChallenge) {
    return (
      <View style={styles.container}>
        <Text>Challenge not found.</Text>
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

  const handlePin = () => {
    // TODO: Implement pin functionality
    console.log("Pin to fridge");
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log("Share challenge");
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
    const { data, error } = await submitToChallenge(
      displayChallenge.id,
      selectedImage,
      isCreator
    );

    if (error) {
      Alert.alert("Error", "Failed to submit. Please try again.");
      console.error(error);
    } else {
      Alert.alert(
        "Success!",
        isCreator
          ? "Challenge image updated!"
          : hasSubmitted
          ? "Your submission has been updated!"
          : "Your submission has been posted!"
      );
      setHasSubmitted(true);
      setSelectedImage(null);
      setShowSubmissionModal(false);

      // Reload submissions
      loadSubmissions();
    }
    setIsSubmitting(false);
  };

  const handleChallengeVote = async (voteType: "up" | "down") => {
    // Optimistic update
    const previousVote = userChallengeVote;
    const newVote = previousVote === voteType ? null : voteType;
    setUserChallengeVote(newVote);

    // Update challenge data optimistically
    setChallengeData((prev) => {
      if (!prev) return prev;
      let upvotes = prev.upvotes || 0;
      let downvotes = prev.downvotes || 0;

      // Remove previous vote
      if (previousVote === "up") upvotes--;
      if (previousVote === "down") downvotes--;

      // Add new vote
      if (newVote === "up") upvotes++;
      if (newVote === "down") downvotes++;

      return { ...prev, upvotes, downvotes };
    });

    // Make API call
    const { error } = await voteOnChallenge(displayChallenge.id, voteType);
    if (error) {
      // Revert on error
      setUserChallengeVote(previousVote);
      setChallengeData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          upvotes: displayChallenge.upvotes || 0,
          downvotes: displayChallenge.downvotes || 0,
        };
      });
    }
  };

  const handleSubmissionVote = async (
    submissionId: string,
    voteType: "up" | "down"
  ) => {
    // Optimistic update - update UI immediately
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          const currentVote = sub.user_vote;
          const newVote = currentVote === voteType ? null : voteType;

          // Calculate new vote counts
          let upvotes = sub.upvotes;
          let downvotes = sub.downvotes;

          if (currentVote === "up") upvotes--;
          if (currentVote === "down") downvotes--;
          if (newVote === "up") upvotes++;
          if (newVote === "down") downvotes++;

          return { ...sub, user_vote: newVote, upvotes, downvotes };
        }
        return sub;
      })
    );

    // Make API call in background
    const { error } = await voteOnSubmission(submissionId, voteType);
    if (error) {
      // Revert on error - reload submissions to get correct state
      loadSubmissions();
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image with Creator Submission Vote Buttons */}
        <View style={styles.heroContainer}>
          <Image source={displayChallenge.image} style={styles.heroImage} />
          {/* Challenge Vote Buttons */}
          {displayChallenge.image_url && (
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
                    userChallengeVote === "up"
                      ? "white"
                      : Colors.palette.darkest
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
          )}
        </View>

        {/* Title and Creator */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{displayChallenge.title}</Text>
          <Text style={styles.creator}>
            {displayChallenge.created_by_username || "Anonymous"}
          </Text>
        </View>

        {/* Likes and Submissions Counter */}
        <View style={styles.statsContainer}>
          <View style={styles.statSection}>
            <Text style={styles.statCount}>{netVotes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statSection}>
            <Text style={styles.statCount}>{submissionCount}</Text>
            <Text style={styles.statLabel}>Submissions</Text>
          </View>
        </View>

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

          <TouchableOpacity style={styles.pinButton} onPress={handlePin}>
            <MaterialCommunityIcons
              name="pin"
              size={24}
              color={Colors.palette.darkest}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.pinButtonText}>PIN TO FRIDGE</Text>
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

          {/* Ingredients */}
          <Text style={styles.label}>
            INGREDIENTS:{" "}
            <Text style={styles.value}>
              {displayChallenge.ingredients.join(", ")}
            </Text>
          </Text>

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
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.palette.light,
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
    paddingVertical: 14,
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
    marginVertical: 6,
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
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.palette.darkest,
    lineHeight: 23,
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
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
    color: Colors.palette.darkest,
    letterSpacing: 0.5,
  },
  shareButton: {
    flex: 1,
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
    fontSize: 15,
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
});
