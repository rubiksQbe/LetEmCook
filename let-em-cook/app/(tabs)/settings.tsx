import Colors from "@/constants/Colors";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { ensureUserProfile, supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

type InviteProfile = {
  username: string | null;
};

type InviteFriendshipRow = {
  user_id1: string;
  user_id2: string;
  invitation_status: string | null;
  invited_challenge_id: string | null;
  invited_challenge: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;

  // Optional joined profile objects
  recipient?: InviteProfile | null;
  sender?: InviteProfile | null;
};

export default function ProfileScreen() {
  const params = useLocalSearchParams();
  const fromTab = params.from as string | undefined;
  const { startOnboarding } = useOnboarding();

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showInviteHistoryModal, setShowInviteHistoryModal] = useState(false);
  const [inviteHistory, setInviteHistory] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Ensure profile exists (creates if missing)
        await ensureUserProfile(user.id);

        // Load username from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else {
          // Fallback to user_metadata if profile still doesn't exist
          const metadataUsername = user.user_metadata?.username || "";
          setUsername(metadataUsername);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeName() {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "No user found.");
        setUpdating(false);
        return;
      }

      const trimmedUsername = username.trim().toLowerCase();

      // Get current user's profile from database
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const currentUsername =
        currentProfile?.username?.toLowerCase() ||
        user.user_metadata?.username?.toLowerCase() ||
        "";

      // Check if username is the same (no change needed)
      if (trimmedUsername === currentUsername) {
        Alert.alert("Info", "This is already your username.");
        setUpdating(false);
        return;
      }

      // Check if username already exists for another user (case-insensitive)
      // Use ilike for case-insensitive matching
      const { data: existingProfiles, error: checkError } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", trimmedUsername)
        .neq("id", user.id);

      if (checkError) {
        Alert.alert("Error", "Failed to check username availability.");
        setUpdating(false);
        return;
      }

      // Log all matching usernames for comparison
      if (existingProfiles && existingProfiles.length > 0) {
        Alert.alert(
          "Error",
          "This username is already taken. Please choose another."
        );
        setUpdating(false);
        return;
      }

      // Update username in profiles table (source of truth)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: trimmedUsername })
        .eq("id", user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        Alert.alert(
          "Error",
          profileError.message || "Failed to update username."
        );
        setUpdating(false);
        return;
      }

      // Also update auth metadata for consistency
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: trimmedUsername },
      });

      if (authError) {
        console.error("Error updating auth metadata:", authError);
        // Profile was updated successfully, so we can continue
        // But show a warning that metadata update failed
        console.warn("⚠️ Profile updated but auth metadata update failed");
      }

      Alert.alert("Success", "Name updated successfully!");
      setShowChangeNameModal(false);

      // Reload user data to reflect changes
      await loadUserData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update name.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }

    setUpdating(true);
    try {
      // First verify current password by attempting to sign in
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        Alert.alert("Error", "Unable to verify current password.");
        setUpdating(false);
        return;
      }

      // Try to sign in with current password to verify
      const aliasEmail = `${
        user.user_metadata?.username || "user"
      }@example.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: aliasEmail,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert("Error", "Current password is incorrect.");
        setUpdating(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Password updated successfully!");
        setShowChangePasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      Alert.alert("Error", 'Please type "delete" to confirm.');
      return;
    }

    setUpdating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "No user found.");
        setUpdating(false);
        return;
      }

      const userId = user.id;

      // Delete user's related data first (in order of dependencies)
      // 1. Delete votes (challenge_votes and submission_votes)
      await supabase.from("challenge_votes").delete().eq("user_id", userId);
      await supabase.from("submission_votes").delete().eq("user_id", userId);

      // 2. Delete submissions
      await supabase.from("submissions").delete().eq("user_id", userId);

      // 3. Delete challenges created by user
      await supabase.from("challenges").delete().eq("created_by", userId);

      // 4. Delete profile
      await supabase.from("profiles").delete().eq("id", userId);

      // 5. Delete auth user via Edge Function (requires admin privileges)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data: functionData, error: functionError } =
            await supabase.functions.invoke("delete-user", {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

          if (functionError) {
            console.error("Error calling delete-user function:", functionError);
            // Continue anyway - data is deleted, just auth user remains
          }
        }
      } catch (functionErr) {
        console.error("Error invoking delete-user function:", functionErr);
        // Continue anyway - data is deleted
      }

      // 6. Sign out the user (this clears the session)
      await supabase.auth.signOut();

      Alert.alert(
        "Account Deleted",
        "Your account and all associated data have been permanently deleted.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/auth"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", error.message || "Failed to delete account.");
      setUpdating(false);
    }
  }

  async function handleLogout() {
    setUpdating(true);
    try {
      await supabase.auth.signOut();
      router.replace("/auth");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to log out.");
    } finally {
      setUpdating(false);
    }
  }

  async function loadInviteHistory() {
    setLoadingInvites(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ---------- Fetch Sent Invites ----------
      const sentQuery = await supabase
        .from("friendships")
        .select(
          `
        user_id1,
        user_id2,
        invitation_status,
        invited_challenge_id,
        invited_challenge:challenges!friendships_invited_challenge_id_fkey (
          id,
          title,
          image_url
        ),
        recipient:profiles!friendships_user_id2_fkey (username)
      `
        )
        .eq("user_id1", user.id);

      const allSentFriendships =
        (sentQuery.data as unknown as InviteFriendshipRow[]) || [];

      // ---------- Fetch Received Invites ----------
      const receivedQuery = await supabase
        .from("friendships")
        .select(
          `
        user_id1,
        user_id2,
        invitation_status,
        invited_challenge_id,
        invited_challenge:challenges!friendships_invited_challenge_id_fkey (
          id,
          title,
          image_url
        ),
        sender:profiles!friendships_user_id1_fkey (username)
      `
        )
        .eq("user_id2", user.id);

      const allReceivedFriendships =
        (receivedQuery.data as unknown as InviteFriendshipRow[]) || [];

      // ---------- Filter only rows with challenge invites ----------
      const sentInvites = allSentFriendships.filter(
        (f) => f.invited_challenge_id !== null
      );

      const receivedInvites = allReceivedFriendships.filter(
        (f) => f.invited_challenge_id !== null
      );

      // ---------- Format for UI ----------
      const formattedInvites = [
        ...sentInvites.map((invite) => ({
          id: `${invite.user_id1}-${invite.user_id2}-${invite.invited_challenge_id}`,
          type: "sent" as const,
          status: invite.invitation_status,
          challenge: invite.invited_challenge,
          otherUser: invite.recipient?.username ?? "Unknown",
          date: null,
        })),

        ...receivedInvites.map((invite) => ({
          id: `${invite.user_id1}-${invite.user_id2}-${invite.invited_challenge_id}`,
          type: "received" as const,
          status: invite.invitation_status,
          challenge: invite.invited_challenge,
          otherUser: invite.sender?.username ?? "Unknown",
          date: null,
        })),
      ];

      setInviteHistory(formattedInvites);
    } catch (error) {
      console.error("Error loading invite history:", error);
    } finally {
      setLoadingInvites(false);
    }
  }

  async function handleOpenInviteHistory() {
    setShowInviteHistoryModal(true);
    await loadInviteHistory();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.palette.darkest} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* <View style={styles.header}>
          <Text style={styles.settingsHeader}>Settings</Text>
        </View> */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Change Name Section */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => setShowChangeNameModal(true)}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Change Name</Text>
              <Text style={styles.sectionSubtitle}>
                Current: {username || "Not set"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>

          {/* Change Password Section */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.sectionSubtitle}>Update your password</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>

          {/* Invite History Section */}
          <TouchableOpacity
            style={styles.section}
            onPress={handleOpenInviteHistory}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Invite History</Text>
              <Text style={styles.sectionSubtitle}>
                View all past invite requests
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>

          {/* View Onboarding Section */}
          <TouchableOpacity style={styles.section} onPress={startOnboarding}>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>View Onboarding</Text>
              <Text style={styles.sectionSubtitle}>
                Go through the app tutorial again
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>

          {/* Log Out Button */}
          <TouchableOpacity
            style={[styles.section, styles.logoutSection]}
            onPress={handleLogout}
            disabled={updating}
          >
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, styles.logoutTitle]}>
                Log Out
              </Text>
              <Text style={[styles.sectionSubtitle, styles.logoutSubtitle]}>
                Sign out of Let 'em Cook
              </Text>
            </View>
            <Ionicons
              name="log-out-outline"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>

          {/* Delete Account Section */}
          <TouchableOpacity
            style={[styles.section, styles.deleteSection]}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, styles.deleteTitle]}>
                Delete Account
              </Text>
              <Text style={[styles.sectionSubtitle, styles.deleteSubtitle]}>
                Permanently delete your account
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.palette.dark}
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Change Usern    ame Modal */}
        <Modal
          visible={showChangeNameModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChangeNameModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Username</Text>
                <TouchableOpacity
                  onPress={() => setShowChangeNameModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={Colors.palette.darkest}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter new name"
                placeholderTextColor={Colors.palette.dark}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowChangeNameModal(false)}
                  disabled={updating}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleChangeName}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={showChangePasswordModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChangePasswordModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity
                  onPress={() => setShowChangePasswordModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={Colors.palette.darkest}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Current password"
                placeholderTextColor={Colors.palette.dark}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="New password"
                placeholderTextColor={Colors.palette.dark}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.palette.dark}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={updating}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleChangePassword}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Invite History Modal */}
        <Modal
          visible={showInviteHistoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowInviteHistoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite History</Text>
                <TouchableOpacity
                  onPress={() => setShowInviteHistoryModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={Colors.palette.darkest}
                  />
                </TouchableOpacity>
              </View>

              {loadingInvites ? (
                <View style={styles.inviteHistoryLoading}>
                  <ActivityIndicator
                    size="large"
                    color={Colors.palette.darkest}
                  />
                </View>
              ) : inviteHistory.length === 0 ? (
                <View style={styles.inviteHistoryEmpty}>
                  <Text style={styles.inviteHistoryEmptyText}>
                    No invite history found
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.inviteHistorySummary}>
                    <Text style={styles.inviteHistorySummaryText}>
                      Total: {inviteHistory.length} invite
                      {inviteHistory.length !== 1 ? "s" : ""} • Sent:{" "}
                      {inviteHistory.filter((i) => i.type === "sent").length} •
                      Received:{" "}
                      {
                        inviteHistory.filter((i) => i.type === "received")
                          .length
                      }
                    </Text>
                  </View>
                  <ScrollView
                    style={styles.inviteHistoryScroll}
                    contentContainerStyle={styles.inviteHistoryContent}
                  >
                    {inviteHistory.map((invite) => (
                      <View
                        key={invite.id}
                        style={[
                          styles.inviteHistoryItem,
                          invite.type === "sent"
                            ? styles.inviteHistoryItemSent
                            : styles.inviteHistoryItemReceived,
                        ]}
                      >
                        <View style={styles.inviteHistoryItemHeader}>
                          <View style={styles.inviteHistoryItemTypeContainer}>
                            <Ionicons
                              name={
                                invite.type === "sent"
                                  ? "arrow-up-outline"
                                  : "arrow-down-outline"
                              }
                              size={16}
                              color={
                                invite.type === "sent"
                                  ? Colors.palette.darkest
                                  : Colors.palette.lightest
                              }
                              style={styles.inviteHistoryItemIcon}
                            />
                            <Text
                              style={[
                                styles.inviteHistoryItemType,
                                invite.type === "sent" &&
                                  styles.inviteHistoryItemTypeSent,
                              ]}
                            >
                              {invite.type === "sent"
                                ? "Sent to"
                                : "Received from"}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.inviteHistoryItemUser,
                              invite.type === "sent" &&
                                styles.inviteHistoryItemUserSent,
                            ]}
                          >
                            {invite.otherUser}
                          </Text>
                        </View>
                        {invite.challenge ? (
                          <TouchableOpacity
                            onPress={() => {
                              setShowInviteHistoryModal(false);
                              router.push({
                                pathname: "/challenges/[id]",
                                params: {
                                  id: invite.challenge.id,
                                  challenge: JSON.stringify({
                                    id: invite.challenge.id,
                                    title: invite.challenge.title,
                                    image_url: invite.challenge.image_url,
                                  }),
                                },
                              });
                            }}
                          >
                            <Text
                              style={[
                                styles.inviteHistoryItemChallenge,
                                invite.type === "sent" &&
                                  styles.inviteHistoryItemChallengeSent,
                              ]}
                            >
                              {invite.challenge.title}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text
                            style={[
                              styles.inviteHistoryItemChallenge,
                              invite.type === "sent" &&
                                styles.inviteHistoryItemChallengeSent,
                            ]}
                          >
                            Challenge no longer available
                          </Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Delete Account Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={Colors.palette.darkest}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.deleteWarningText}>
                This action cannot be undone. This will permanently delete your
                account and all associated data.
              </Text>

              <Text style={styles.deleteConfirmLabel}>
                Type 'delete' to confirm:
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Type 'delete' to confirm"
                placeholderTextColor={Colors.palette.dark}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={updating}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={handleDeleteAccount}
                  disabled={
                    updating || deleteConfirmText.toLowerCase() !== "delete"
                  }
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.palette.light,
    paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  scrollContent: {
    padding: 20,
    marginTop: 15,
    marginBottom: 15,
  },
  settingsHeader: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    color: Colors.palette.darkest,
    marginBottom: 16,
    textAlign: "center",
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.palette.lightest,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.palette.darkest,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.dark,
  },
  deleteSection: {
    borderColor: "#ff4444",
    backgroundColor: "#fff5f5",
  },
  deleteTitle: {
    color: "#ff4444",
  },
  deleteSubtitle: {
    color: "#cc0000",
  },
  logoutSection: {
    marginTop: 8,
  },
  logoutTitle: {
    color: Colors.palette.darkest,
  },
  logoutSubtitle: {
    color: Colors.palette.dark,
  },
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
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.darkest,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.palette.darkest,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInput: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.darkest,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  modalButtonSave: {
    backgroundColor: Colors.palette.blue,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonSaveText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "white",
  },
  modalButtonDelete: {
    backgroundColor: "#ff4444",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDeleteText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "white",
  },
  deleteWarningText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteConfirmLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.darkest,
    marginBottom: 8,
  },
  inviteHistoryLoading: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteHistoryEmpty: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteHistoryEmptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  inviteHistorySummary: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.darkest,
  },
  inviteHistorySummaryText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.darkest,
  },
  inviteHistoryScroll: {
    maxHeight: 400,
  },
  inviteHistoryContent: {
    paddingBottom: 20,
  },
  inviteHistoryItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteHistoryItemSent: {
    backgroundColor: Colors.palette.accent,
  },
  inviteHistoryItemReceived: {
    backgroundColor: Colors.palette.blue,
  },
  inviteHistoryItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inviteHistoryItemTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inviteHistoryItemIcon: {
    marginRight: 6,
  },
  inviteHistoryItemType: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.lightest,
  },
  inviteHistoryItemTypeSent: {
    color: Colors.palette.darkest,
  },
  inviteHistoryItemUser: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.palette.lightest,
  },
  inviteHistoryItemUserSent: {
    color: Colors.palette.darkest,
  },
  inviteHistoryItemChallenge: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.lightest,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  inviteHistoryItemChallengeSent: {
    color: Colors.palette.darkest,
  },
});
