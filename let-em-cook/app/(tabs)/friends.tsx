import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
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

  // Function to map the complex Supabase result into the simple Friend array for FlatList
  const mapToFriend = (profile: FriendProfile): Friend => ({
    ...profile,
    current_challenge_name: profile.curr_chal?.title ?? "None",
    current_challenge_image: profile.curr_chal?.image_url ?? null,
  });

  // ... (useEffect loadData and fetching logic unchanged) ...
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const username = user?.user_metadata?.username ?? user?.email ?? null;
        if (mounted && username) setUserName(username);

        // 2. TEMPORARILY Fetch ALL profiles, excluding the current user
        // We select the profile data and deep-join to the challenges table.
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select(
            `
            id,
            username,
            avatar,
            curr_chal:challenges (id, title, image_url)
          `
          )
          .neq("id", myUserId); // IMPORTANT: Exclude the current user from the list

        if (profilesError) throw profilesError;

        // 3. Process the results
        const friendProfiles: Friend[] = (profileData ?? []).map(
          (profileRow) => {
            // Map the joined profile data to the final Friend type for rendering
            return mapToFriend(profileRow as FriendProfile);
          }
        );

        if (mounted) {
          setFriends(friendProfiles);
        }
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  function renderFriend({ item }: { item: Friend }) {
    const isLocalKey = item.avatar && LocalAvatars.hasOwnProperty(item.avatar);

    const avatarSource = isLocalKey
      ? LocalAvatars[item.avatar] // Use the mapped 'require()' result
      : item.avatar
      ? { uri: item.avatar } // Otherwise, treat it as a remote URI
      : require("../../assets/images/placeholder.jpg");

    // Note: The challenge image is also a remote URL from the 'challenges' table
    const challengeImageSource = item.current_challenge_image
      ? { uri: item.current_challenge_image }
      : require("../../assets/images/placeholder.jpg");

    const challengeIsPresent = !!item.curr_chal?.id; // Check if a challenge ID exists

    // Function to handle the press event
    const handleCardPress = () => {
      if (!challengeIsPresent || !item.curr_chal) {
        return;
      }

      router.push({
        pathname: "/challenges/[id]",
        params: {
          id: item.curr_chal.id,
          // OPTIONAL: Pass minimal data for instant UI display before full data loads
          challenge: JSON.stringify({
            id: item.curr_chal.id,
            title: item.current_challenge_name,
            image_url: item.current_challenge_image,
            // Pass minimal vote counts if available to prevent initial 0/0 flash
            upvotes: item.curr_chal.upvotes || 0,
            downvotes: item.curr_chal.downvotes || 0,
            submission_count: item.curr_chal.submission_count || 0,
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
      {/* Page Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Friends</Text>
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
          ListHeaderComponent={() => (
            <View style={styles.userHeaderContainer}>
              <Image
                source={require("../../assets/images/mouse-assets/macaroni.png")}
                style={styles.userAvatar}
              />
              <View style={styles.speechBubble}>
                <Text style={styles.greeting}>
                  {userName ? `Hi, ${userName}!` : "Hi!"}
                </Text>
                <View style={styles.speechBubbleTail} />
              </View>
            </View>
          )}
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
    backgroundColor: Colors.palette.accent,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 1,
    paddingBottom: 8,
    backgroundColor: Colors.palette.accent,
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
  userHeaderContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 12,
    backgroundColor: Colors.palette.lightest,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speechBubbleTail: {
    position: "absolute",
    left: -8,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: "transparent",
    borderBottomWidth: 8,
    borderBottomColor: "transparent",
    borderRightWidth: 8,
    borderRightColor: Colors.palette.lightest,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.palette.darkest,
    fontFamily: "Poppins_700Bold",
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
    fontSize: 15,
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
});
