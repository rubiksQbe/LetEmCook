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
    paddingBottom: 100,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
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
});
