import React, { useEffect, useState } from "react";
import { FlatList, Image, View as RNView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";

type Friend = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
};

export default function FriendScreen() {
  // Placeholder current user name until Supabase is wired up
  const [userName, setUserName] = useState<string | null>("Current User");

  // Three placeholder friends
  const [friends] = useState<Friend[]>([
    {
      id: "1",
      username: "Laa-laa",
      avatar_url: require("../../assets/images/mouse-assets/laalaa.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
    {
      id: "2",
      username: "Po",
      avatar_url: require("../../assets/images/mouse-assets/po.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
    {
      id: "3",
      username: "Dipsy",
      avatar_url: require("../../assets/images/mouse-assets/dipsy.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
    {
      id: "4",
      username: "Laa-laa",
      avatar_url: require("../../assets/images/mouse-assets/laalaa.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
    {
      id: "5",
      username: "Po",
      avatar_url: require("../../assets/images/mouse-assets/po.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
    {
      id: "6",
      username: "Dipsy",
      avatar_url: require("../../assets/images/mouse-assets/dipsy.png"),
      current_challenge_name: "Placeholder Challenge",
      current_challenge_image: null,
    },
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const username = user?.user_metadata?.username ?? user?.email ?? null;
        if (mounted && username) setUserName(username);
      } catch (e) {
        console.error("Error fetching current user:", e);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  function renderFriend({ item }: { item: Friend }) {
    const isLocalImage = typeof item.avatar_url === "number";
    return (
      <RNView style={styles.friendRow}>
        <RNView style={styles.friendAvatarColumn}>
          <Image
            source={
              isLocalImage
                ? item.avatar_url // Pass the require() result directly
                : item.avatar_url
                ? { uri: item.avatar_url } // Use for remote URLs
                : require("../../assets/images/placeholder.jpg")
            }
            style={styles.avatar}
          />
          <Text style={styles.friendName}>{item.username ?? "Unknown"}</Text>
        </RNView>
        <RNView style={styles.challengeCard}>
          <Image
            source={
              item.current_challenge_image
                ? { uri: item.current_challenge_image }
                : require("../../assets/images/placeholder.jpg")
            }
            style={styles.challengeImage}
          />
          <Text style={styles.challengeLabel}>
            {`Current challenge: ${item.current_challenge_name ?? "None"}`}
          </Text>
        </RNView>
      </RNView>
    );
  }

  return (
    <View style={styles.container}>
      <RNView style={styles.userHeader}>
        <Image
          source={require("../../assets/images/mouse-assets/macaroni.png")}
          style={styles.userAvatar}
        />
        <RNView>
          <Text style={styles.title}>
            {userName ? `Hi, ${userName}` : "Hi"}
          </Text>
        </RNView>
      </RNView>

      <RNView style={styles.separator} />

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        contentContainerStyle={
          friends.length === 0 ? styles.emptyList : undefined
        }
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>You have no friends yet.</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.palette.light,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.palette.darkest,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#666",
  },
  separator: {
    marginVertical: 12,
    height: 1,
    backgroundColor: Colors.palette.lightest,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  friendAvatarColumn: {
    alignItems: "center",
    width: 100,
  },
  challengeCard: {
    flex: 2,
    paddingLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeImage: {
    width: "90%",
    height: 84,
    borderRadius: 8,
    backgroundColor: "#eee",
    opacity: 0.35,
    resizeMode: "cover",
  },
  challengeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: Colors.palette.lightest,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.palette.lightest,
  },
  friendInfo: {
    flex: 1,
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
    opacity: 0.35,
    resizeMode: "cover",
  },
  challengeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.palette.darkest,
    textAlign: "center",
  },
});
