import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
      return { bottom: 22, right: 3, width: 25, height: 25 };
    case "spatula.png":
      return { bottom: 29, right: 6, width: 24, height: 24 };
    case "wand.png":
      return { bottom: 32, right: 6, width: 24, height: 24 };
    case "balloon.png":
      return { bottom: 32, right: 11, width: 27, height: 27 };
    default:
      return { bottom: 29, right: 6, width: 24, height: 24 };
  }
};

// Define the shape of a single challenge row from the 'challenges' table
type Challenge = {
  id: string;
  title: string | null; // Assuming your challenge name is 'title'
  image_url: string | null; // Assuming your challenge image is 'image_url'
  difficulty: string | null; // Challenge difficulty (Easy, Medium, Hard)
  // Add other challenge fields here if needed
};

// Define the shape of a friend's profile, including the nested challenge data
type FriendProfile = {
  id: string;
  username: string | null;
  avatar: string | null; // Renamed from avatar_url to match your table column 'avatar'
  // curr_chal will now be the full Challenge object via the join, or null
  curr_chal: Challenge | null;
  invited_challenge_id: string | null;
  invitation_status: string | null; // Tracks 'none', 'sent', 'accepted', etc.
  invited_challenge_title: string | null;
};

type Friend = FriendProfile & {
  current_challenge_name: string | null;
  current_challenge_image: string | null;
  hat?: string | null;
  item?: string | null;
};

export default function FriendScreen() {
  const [userName, setUserName] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState("");
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [addFriendMessage, setAddFriendMessage] = useState<string | null>(null);

  // Function to map the complex Supabase result into the simple Friend array for FlatList
  const mapToFriend = (profile: FriendProfile): Friend => ({
    ...profile,
    current_challenge_name: profile.curr_chal?.title ?? "None",
    current_challenge_image: profile.curr_chal?.image_url ?? null,
    invited_challenge_id: profile.invited_challenge_id,
    invitation_status: profile.invitation_status,
    invited_challenge_title: profile.invited_challenge_title,
  });

  const loadData = useCallback(async () => {
    let myUserId: string | undefined;
    try {
      setLoading(true);
      // 1. Get the current user's ID and username
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;
      const myUserId = userData?.user?.id;
      // ... (username setup unchanged) ...
      if (!myUserId) return;

      // 2. Fetch friend relationships from the 'friendships' table
      // CRITICAL CHANGE: Filter ONLY where the current user is user_id1
      const { data: friendshipData, error: friendsError } = await supabase
        .from("friendships")
        .select(
          `
           
            friendProfile:profiles!friendships_user_id2_fkey (
                id,
                username,
                avatar,
                curr_chal:challenges (id, title, image_url, difficulty)
            ),
            invitation_status,
            invited_challenge_id,
            invited_challenge:challenges!friendships_invited_challenge_id_fkey (
                title
            )
          `
        )
        // CRITICAL FILTER: ONLY select rows where I am the inviter/initiator
        .eq("user_id1", myUserId);

      if (friendsError) throw friendsError;

      // 3. Process the results
      const friendProfiles: Friend[] = (friendshipData ?? [])
        .map((row: any) => {
          // Renamed to friendProfile to match the query alias
          const friendProfileData = row.friendProfile;

          if (!friendProfileData) {
            console.warn(
              `DEBUG WARNING: Skipping friend row. Profile data for user_id2 is NULL in row: ${JSON.stringify(
                row
              )}`
            );
            return null;
          }

          // Handle case where curr_chal might be an array (Supabase sometimes returns arrays for relations)
          const currChal = Array.isArray(friendProfileData.curr_chal)
            ? friendProfileData.curr_chal[0] || null
            : friendProfileData.curr_chal;

          // Construct the object using the friend's profile data
          // combined with the invitation status from the parent row.
          const friendDataWithInvite: FriendProfile = {
            // Essential Profile Properties
            id: friendProfileData.id,
            username: friendProfileData.username,
            avatar: friendProfileData.avatar,
            curr_chal: currChal,

            // Invitation Properties (From the parent row, which belongs to this relationship)
            invited_challenge_id: row.invited_challenge_id,
            invitation_status: row.invitation_status,
            invited_challenge_title: Array.isArray(row.invited_challenge)
              ? row.invited_challenge[0]?.title ?? null
              : row.invited_challenge?.title ?? null,
          };

          // Map the combined data to the final Friend type
          return mapToFriend(friendDataWithInvite);
        })
        .filter((f): f is Friend => f !== null);

      const enriched = await Promise.all(
        friendProfiles.map(async (f) => {
          const { data: accessories } = await supabase
            .from("pal-accessory")
            .select("hat, item")
            .eq("user_id", f.id)
            .single();

          return {
            ...f,
            hat: accessories?.hat ?? null,
            item: accessories?.item ?? null,
          };
        })
      );

      setFriends(enriched);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call loadData on mount
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Subscribe to real-time updates for friendships
  useEffect(() => {
    let channel: any;

    const setupSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const myUserId = userData?.user?.id;
      if (!myUserId) return;

      channel = supabase
        .channel(`friendships-updates-${myUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "friendships",
            filter: `user_id1=eq.${myUserId}`,
          },
          () => {
            // Reload data when any friendship is updated
            // This will update the "Invited to..." text when recipient views/closes invite
            loadData();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  // NEW FUNCTION: Handles searching for a user and inserting the friendship
  const handleAddFriend = async () => {
    setAddFriendMessage(null);
    if (!searchUsername || addFriendLoading) return;

    const myUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!myUserId) {
      Alert.alert("Error", "You must be logged in to add friends.");
      return;
    }

    setAddFriendLoading(true);

    try {
      // 1. Find the friend's ID by username
      const { data: friendProfile, error: searchError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", searchUsername)
        .single();

      if (searchError && searchError.code !== "PGRST116") {
        // PGRST116 = no rows found
        throw searchError;
      }

      if (!friendProfile) {
        setAddFriendMessage(`No user found named "${searchUsername}"!`);
        return;
      }

      const friendId = friendProfile.id;

      // Prevent adding self - check by user ID
      if (friendId === myUserId) {
        setAddFriendMessage("You can't add yourself as a friend!");
        setAddFriendLoading(false);
        return;
      }

      // 2. Insert the friendship (user_id1 is current user, user_id2 is friend)
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({ user_id1: myUserId, user_id2: friendId });

      if (insertError) {
        if (insertError.code === "23505") {
          // 23505 is the unique constraint violation error
          setAddFriendMessage(`${searchUsername} is already your friend!`);
          return;
        }
        throw insertError;
      }

      // 3. Success: Clear input, show alert, and refresh list
      setSearchUsername("");
      Alert.alert("Success", `Successfully added ${searchUsername}!`);
      loadData();
    } catch (error) {
      console.error("Add friend failed:", error);
      Alert.alert("Error", "Failed to add friend due to a server error.");
    } finally {
      setAddFriendLoading(false);
    }
  };

  // Function to remove a friend
  const handleRemoveFriend = useCallback(
    async (friendId: string, friendUsername: string) => {
      Alert.alert(
        "Remove Friend",
        `Are you sure you want to remove ${friendUsername} from your friends list?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user?.id) {
                  Alert.alert(
                    "Error",
                    "You must be logged in to remove friends."
                  );
                  return;
                }

                // Delete the friendship (only where current user is user_id1)
                const { error } = await supabase
                  .from("friendships")
                  .delete()
                  .eq("user_id1", user.id)
                  .eq("user_id2", friendId);

                if (error) {
                  Alert.alert("Error", "Failed to remove friend.");
                  console.error("Remove friend error:", error);
                  return;
                }

                Alert.alert(
                  "Success",
                  `${friendUsername} has been removed from your friends list.`
                );
                loadData();
              } catch (error) {
                console.error("Remove friend failed:", error);
                Alert.alert(
                  "Error",
                  "Failed to remove friend due to a server error."
                );
              }
            },
          },
        ]
      );
    },
    [loadData]
  );

  // Friend Row Component with Long Press Support
  const FriendRow = React.memo(
    ({
      item,
      handleRemoveFriend,
    }: {
      item: Friend;
      handleRemoveFriend: (id: string, username: string) => void;
    }) => {
      const avatarSource = require("../../assets/images/mouse-assets/defaultmouse.png");

      // Note: The challenge image is also a remote URL from the 'challenges' table
      const challengeImageSource = item.current_challenge_image
        ? { uri: item.current_challenge_image }
        : require("../../assets/images/placeholder.jpg");

      const challengeIsPresent = !!item.curr_chal?.id; // Check if a challenge ID exists
      // Determine if the friend has a pending invitation
      const isInvited =
        item.invitation_status === "sent" && item.invited_challenge_title;

      // Determine the label text and image source based on status
      let labelText: string;
      let imageSource: any;
      let imageOpacity: number;
      let isDisabled: boolean; // Only clickable if they have a pinned challenge

      if (challengeIsPresent) {
        // PRIORITY 1: Display Pinned Challenge
        labelText = `Pinned challenge: ${item.current_challenge_name}`;
        imageSource = challengeImageSource;
        imageOpacity = 1.0;
        isDisabled = false; // Is clickable
      } else {
        // PRIORITY 2: No Pinned Challenge (This covers invited and truly empty states)
        labelText = "No pinned challenge...";
        imageSource = require("../../assets/images/placeholder.jpg");
        imageOpacity = isInvited ? 0.7 : 0.5; // Dim slightly if invited/empty
        isDisabled = true; // Not clickable
      }

      // Function to handle the press event
      const handleCardPress = () => {
        if (!challengeIsPresent || !item.curr_chal) {
          // If no current challenge, do nothing
          return;
        }

        // Navigate to the challenge details page
        router.push({
          pathname: "/challenges/[id]",
          params: {
            id: item.curr_chal.id,

            challenge: JSON.stringify({
              id: item.curr_chal.id,
              title: item.current_challenge_name,
              image_url: item.current_challenge_image,
            }),
          },
        });
      };

      // Handle long press to delete
      const handleLongPress = () => {
        handleRemoveFriend(item.id, item.username ?? "Unknown");
      };

      return (
        <View style={styles.friendRow}>
          <TouchableOpacity
            onPress={handleCardPress}
            onLongPress={handleLongPress}
            disabled={isDisabled}
            activeOpacity={isDisabled ? 1.0 : 0.8}
            style={styles.friendContent}
          >
            {/* ... (friendAvatarColumn unchanged) ... */}
            <View style={styles.friendAvatarContainer}>
              <View style={styles.friendAvatarColumn}>
                <View style={{ width: 80, height: 80 }}>
                  {/* base mouse */}
                  <Image
                    source={avatarSource}
                    style={styles.avatar}
                    resizeMode="contain"
                  />

                  {/* hat overlay */}
                  {item.hat && HatAssets[item.hat] && (
                    <Image
                      source={HatAssets[item.hat]}
                      style={[
                        {
                          position: "absolute",
                          resizeMode: "contain",
                        },
                        hatPosition(item.hat), // ⭐ apply custom coordinates
                      ]}
                    />
                  )}

                  {/* item overlay */}
                  {item.item && ItemAssets[item.item] && (
                    <Image
                      source={ItemAssets[item.item]}
                      style={[
                        {
                          position: "absolute",
                          resizeMode: "contain",
                        },
                        itemPosition(item.item), // ⭐ apply custom coordinates
                      ]}
                    />
                  )}
                </View>

                <Text style={styles.friendName}>
                  {item.username ?? "Unknown"}
                </Text>
              </View>
            </View>

            {/* CRITICAL: Update the Challenge Card JSX */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeImageContainer}>
                <Image
                  source={imageSource}
                  style={[styles.challengeImage, { opacity: imageOpacity }]}
                />
              </View>
              <View style={styles.challengeTextContainer}>
                {/* NEW WRAPPER */}
                {/* Main Label: Always present, reflects current state */}
                <Text
                  style={styles.challengeLabel}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {labelText}
                </Text>
                {/* Conditional Invitation Sub-Label */}
                {isInvited && (
                  <View style={styles.inviteSubTextRow}>
                    <MaterialCommunityIcons
                      name="invoice-text-send-outline"
                      size={12}
                      color={Colors.palette.blue}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={styles.inviteSubText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Invited to: {item.invited_challenge_title}!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
  );

  const renderFriend = React.useCallback(
    ({ item, index }: { item: Friend; index: number }) => {
      return (
        <Animated.View
          entering={FadeInDown.delay(index * 40).duration(250)}
          layout={Layout.springify()}
        >
          <FriendRow item={item} handleRemoveFriend={handleRemoveFriend} />
        </Animated.View>
      );
    },
    [handleRemoveFriend]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/*ADD FRIENDS SECTION */}
        <View style={styles.addFriendSection}>
          <Text style={styles.addFriendTitle}>Add Friends</Text>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={Colors.palette.dark}
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFriend}
              disabled={addFriendLoading || !searchUsername}
            >
              {addFriendLoading ? (
                <ActivityIndicator size={30} color="white" />
              ) : (
                <MaterialCommunityIcons
                  name="plus"
                  size={30}
                  color={Colors.palette.lightest}
                />
              )}
            </TouchableOpacity>
          </View>
          {addFriendMessage && (
            <Text style={styles.messageText}>{addFriendMessage}</Text>
          )}
        </View>

        {/* Friends List */}
        <Animated.FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          style={styles.content}
          contentContainerStyle={
            friends.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={() => (
            <Animated.Text
              style={styles.emptyText}
              entering={FadeInUp.duration(400)}
            >
              You have no friends yet.
            </Animated.Text>
          )}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  keyboardView: {
    flex: 1,
  },
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
  profileButton: {
    padding: 8,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 28,
    color: Colors.palette.darkest,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  friendRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 10,
    marginBottom: 10,
    marginHorizontal: 5,
    minHeight: 180,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(52, 52, 50, 0.2)", // Colors.palette.dark with 20% opacity
  },
  friendContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatarColumn: {
    alignItems: "center",
    width: 80,
    //paddingHorizontal: 10,
  },
  friendAvatarContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    flexShrink: 0,
  },
  challengeCard: {
    alignItems: "center",
    justifyContent: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  challengeImageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  challengeImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.palette.lightest,
    //opacity: 0.35,
    resizeMode: "cover",
    alignSelf: "center",
  },
  difficultyChip: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  difficultyChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.palette.darkest,
    textAlign: "center",
  },
  challengeLabel: {
    //marginTop: 8,
    fontSize: 14,
    color: Colors.palette.darkest,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    width: "100%",
    alignSelf: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 5,
    backgroundColor: "transparent",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    color: Colors.palette.darkest,
    fontFamily: "Poppins_600SemiBold",
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: Colors.palette.dark,
    marginTop: 24,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  addFriendSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.palette.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.palette.dark,
  },
  addFriendTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.darkest,
    marginBottom: 7,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 15,
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  addButton: {
    backgroundColor: Colors.palette.blue,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  challengeTextContainer: {
    // Aligns the two lines of text
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    width: "100%",
    paddingHorizontal: 4,
  },
  inviteSubTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4, // Small gap between main label and invite text
    width: "100%",
    justifyContent: "center",
  },
  inviteSubText: {
    fontSize: 12, // Smaller font
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.blue, // Navy blue color
    flexShrink: 1,
  },
});
