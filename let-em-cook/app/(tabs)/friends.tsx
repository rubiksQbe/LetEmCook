import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";

// Define your local image assets map
const LocalAvatars: { [key: string]: any } = {
  dipsy: require("../../assets/images/mouse-assets/dipsy.png"),
  laalaa: require("../../assets/images/mouse-assets/laalaa.png"),
  po: require("../../assets/images/mouse-assets/po.png"),
  macaroni: require("../../assets/images/mouse-assets/macaroni.png"),
};

// Define the shape of a single challenge row from the 'challenges' table
type Challenge = {
  id: string;
  title: string | null; // Assuming your challenge name is 'title'
  image_url: string | null; // Assuming your challenge image is 'image_url'
  // Add other challenge fields here if needed
};

// Define the shape of a friend's profile, including the nested challenge data
type FriendProfile = {
  id: string;
  username: string | null;
  avatar: string | null; // Renamed from avatar_url to match your table column 'avatar'
  // curr_chal will now be the full Challenge object via the join, or null
  curr_chal: Challenge | null;
};

type Friend = FriendProfile & {
  current_challenge_name: string | null;
  current_challenge_image: string | null;
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

      const username =
        userData?.user?.user_metadata?.username ??
        userData?.user?.email ??
        null;
      if (username) setUserName(username);
      if (!myUserId) return;

      // 2. Fetch friend relationships from the 'friendships' table
      // We select the profiles joined via both foreign key relationships.
      const { data: friendshipData, error: friendsError } = await supabase
        .from("friendships")
        .select(
          `
            user_id1:profiles!friendships_user_id1_fkey (
                id,
                username,
                avatar,
                curr_chal:challenges (id, title, image_url)
            ),
            user_id2:profiles!friendships_user_id2_fkey (
                id,
                username,
                avatar,
                curr_chal:challenges (id, title, image_url)
            )
          `
        )
        // Filter to find rows where the current user is involved
        .or(`user_id1.eq.${myUserId},user_id2.eq.${myUserId}`);

      if (friendsError) throw friendsError;

      // 3. Process the results
      const friendProfiles: Friend[] = (friendshipData ?? []).map((row) => {
        // Determine which column (user_id1 or user_id2) holds the FRIEND's data
        // We use the ID to figure out which nested profile object belongs to the FRIEND.
        const friendProfile =
          row.user_id1.id === myUserId ? row.user_id2 : row.user_id1;

        // Map the joined profile data to the Friend type for rendering
        return mapToFriend(friendProfile as FriendProfile);
      });

      setFriends(friendProfiles);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call loadData on mount
  useEffect(() => {
    loadData();
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

    // Prevent adding self
    if (searchUsername.toLowerCase() === userName?.toLowerCase()) {
      setAddFriendMessage("You can't add yourself!");
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

      // 3. Success: Clear input, show message, and refresh list
      setSearchUsername("");
      setAddFriendMessage(`Successfully added ${searchUsername}!`);
      loadData();
    } catch (error) {
      console.error("Add friend failed:", error);
      Alert.alert("Error", "Failed to add friend due to a server error.");
    } finally {
      setAddFriendLoading(false);
    }
  };

  function renderFriend({ item }: { item: Friend }) {
    const isLocalKey = item.avatar && LocalAvatars.hasOwnProperty(item.avatar);

    const avatarSource = isLocalKey
      ? LocalAvatars[item.avatar] // Use the mapped 'require()' result
      : item.avatar
      ? { uri: item.avatar } // Otherwise, treat it as a remote URI
      : require("../../assets/images/mouse-assets/defaultmouse.png");

    // Note: The challenge image is also a remote URL from the 'challenges' table
    const challengeImageSource = item.current_challenge_image
      ? { uri: item.current_challenge_image }
      : require("../../assets/images/placeholder.jpg");

    const challengeIsPresent = !!item.curr_chal?.id; // Check if a challenge ID exists

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
          // Since the ChallengeDetailScreen expects a full 'challenge' object in params,
          // we must construct it or rely on the detail screen to fetch it.
          // For now, let's use the ID and assume the detail screen can fetch the rest.
          // The other Challenge screen ([id].tsx) seems to rely on JSON.parse(params.challenge)
          // so we'll pass the friend's simplified challenge data.
          challenge: JSON.stringify({
            id: item.curr_chal.id,
            title: item.current_challenge_name,
            image_url: item.current_challenge_image,
            // NOTE: The ChallengeDetailScreen ([id].tsx) needs more fields (timeLimit, ingredients, etc.)
            // which are NOT available in the 'Friend' type. You will need to update the
            // ChallengeDetailScreen to fetch the full challenge data by ID if it's missing.
            // For now, this is the best we can do with available data.
          }),
        },
      });
    };

    return (
      // 2. Wrap the whole row with TouchableOpacity
      <TouchableOpacity
        onPress={handleCardPress}
        disabled={!challengeIsPresent} // Disable press if no challenge is set
        activeOpacity={challengeIsPresent ? 0.8 : 1.0} // Change opacity only if clickable
        style={styles.friendRow} // Apply the row style to the TouchableOpacity
      >
        <View style={styles.friendAvatarColumn}>
          <Image source={avatarSource} style={styles.avatar} />
          <Text style={styles.friendName}>{item.username ?? "Unknown"}</Text>
        </View>
        <View style={styles.challengeCard}>
          <Image
            source={challengeImageSource}
            style={[
              styles.challengeImage,
              // Dim the image slightly if it's not clickable/no challenge is set
              !challengeIsPresent && { opacity: 0.5 },
            ]}
          />
          <Text style={styles.challengeLabel}>
            {challengeIsPresent
              ? `Current challenge: ${item.current_challenge_name}`
              : "No current challenge..."}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Mouse */}
      <View style={styles.headerContainer}>
        <View style={styles.mouseContainer}>
          <Image
            source={require("../../assets/images/mouse-assets/macaroni.png")}
            style={styles.headerMouseAvatar}
          />
          <View style={styles.speechBubble}>
            <Text style={styles.greeting}>
              {userName ? `Hi, ${userName}!` : "Hi!"}
            </Text>
            <View style={styles.speechBubbleTail} />
          </View>
        </View>
      </View>

      {/*ADD FRIENDS SECTION */}
      <View style={styles.addFriendSection}>
        <Text style={styles.addFriendTitle}>Add Friends</Text>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search username to add..."
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
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
        {addFriendMessage && (
          <Text style={styles.messageText}>{addFriendMessage}</Text>
        )}
      </View>

      {/* Friends List */}
      <View style={styles.content}>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          contentContainerStyle={
            friends.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>You have no friends yet.</Text>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
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
  },
  headerMouseAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.palette.lightest,
    zIndex: 2,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginLeft: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  speechBubbleTail: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -4,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: "transparent",
    borderBottomWidth: 12,
    borderBottomColor: "transparent",
    borderRightWidth: 12,
    borderRightColor: Colors.palette.lightest,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.palette.darkest,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.palette.lightest,
  },
  friendAvatarColumn: {
    alignItems: "center",
    width: 100,
  },
  challengeCard: {
    flex: 1,
    paddingLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeImage: {
    width: "90%",
    height: 84,
    borderRadius: 8,
    backgroundColor: Colors.palette.lightest,
    //opacity: 0.35,
    resizeMode: "cover",
  },
  challengeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.palette.darkest,
    textAlign: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.palette.lightest,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    color: Colors.palette.darkest,
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: Colors.palette.light,
    minHeight: 100,
  },
  mouseContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  addFriendSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.palette.lightest,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  addFriendTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: Colors.palette.darkest,
    marginBottom: 10,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
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
    paddingHorizontal: 20,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
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
});
