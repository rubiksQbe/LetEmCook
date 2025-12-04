import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  invited_challenge_id: string | null;
  invitation_status: string | null; // Tracks 'none', 'sent', 'accepted', etc.
  invited_challenge_title: string | null;
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
                curr_chal:challenges (id, title, image_url)
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
      const friendProfiles: Friend[] = (friendshipData ?? []).map((row) => {
        // Renamed to friendProfile to match the query alias
        const friendProfileData = row.friendProfile;

        // CRITICAL: Construct the object using the friend's profile data
        // combined with the invitation status from the parent row.
        const friendDataWithInvite = {
          // Essential Profile Properties
          id: friendProfileData.id,
          username: friendProfileData.username,
          avatar: friendProfileData.avatar,
          curr_chal: friendProfileData.curr_chal,

          // Invitation Properties (From the parent row, which belongs to this relationship)
          invited_challenge_id: row.invited_challenge_id,
          invitation_status: row.invitation_status,
          invited_challenge_title: row.invited_challenge?.title ?? null,
        };

        // Map the combined data to the final Friend type
        return mapToFriend(friendDataWithInvite as FriendProfile);
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
    // Determine if the friend has a pending invitation
    const isInvited =
      item.invitation_status === "sent" && item.invited_challenge_title;

    // Determine the label text and image source based on status
    let labelText = "No current challenge...";
    let imageSource = require("../../assets/images/placeholder.jpg");
    let imageOpacity = 1.0;
    let isDisabled = !challengeIsPresent; // Only clickable if they have a pinned challenge

    if (isInvited) {
      // PRIORITY 1: Display Invitation Status
      labelText = `Invited to: ${item.invited_challenge_title}`;
      imageOpacity = 0.7;
      isDisabled = true; // Invites are not clickable to view the challenge
    } else if (challengeIsPresent) {
      // PRIORITY 2: Display Pinned Challenge
      labelText = `Current challenge: ${item.current_challenge_name}`;
      imageSource = challengeImageSource;
      imageOpacity = 1.0;
      isDisabled = false; // Is clickable
    } else {
      // PRIORITY 3: No current challenge/invite
      labelText = "No current challenge...";
      imageSource = require("../../assets/images/placeholder.jpg");
      imageOpacity = 0.5;
      isDisabled = true;
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
        <View style={{ justifyContent: "center", flex: 1, marginRight: 20 }}>
          <View style={styles.friendAvatarColumn}>
            <Image source={avatarSource} style={styles.avatar} />
            <Text style={styles.friendName}>{item.username ?? "Unknown"}</Text>
          </View>
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
              <ActivityIndicator color="white" />
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
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    //justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 10,
    marginHorizontal: 5,
    // borderBottomWidth: 0.5,
    // borderBottomColor: Colors.palette.lightest,
  },
  friendAvatarColumn: {
    alignItems: "center",
    //paddingHorizontal: 10,
  },
  challengeCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  challengeImage: {
    height: 120,
    aspectRatio: 2,
    borderRadius: 12,
    backgroundColor: Colors.palette.lightest,
    //opacity: 0.35,
    resizeMode: "cover",
  },
  challengeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.palette.darkest,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 5,
    backgroundColor: Colors.palette.lightest,
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
});
