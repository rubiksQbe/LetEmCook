import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";

type Friend = {
  id: string;
  username?: string | null;
  avatar_url?: string | number | null;
  current_challenge_name?: string | null;
  current_challenge_image?: string | null;
  [key: string]: any;
};

export default function FriendScreen() {
  const [userName, setUserName] = useState<string | null>("Current User");

  // Placeholder friends (removed duplicates)
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
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const username =
          user?.user_metadata?.username ?? user?.email ?? null;
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
      <View style={styles.friendRow}>
        <View style={styles.friendAvatarColumn}>
          <Image
            source={
              isLocalImage
                ? item.avatar_url
                : item.avatar_url
                ? { uri: item.avatar_url as string }
                : require("../../assets/images/placeholder.jpg")
            }
            style={styles.avatar}
          />
          <Text style={styles.friendName}>{item.username ?? "Unknown"}</Text>
        </View>
        <View style={styles.challengeCard}>
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
        </View>
      </View>
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
            <View style={styles.userHeader}>
              <Image
                source={require("../../assets/images/mouse-assets/macaroni.png")}
                style={styles.userAvatar}
              />
              <Text style={styles.greeting}>
                {userName ? `Hi, ${userName}!` : "Hi!"}
              </Text>
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
    paddingBottom: 14,
    backgroundColor: Colors.palette.accent,
  },
  pageTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 34,
    color: Colors.palette.darkest,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  listContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.palette.blue,
    borderRadius: 12,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: Colors.palette.lightest,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.palette.lightest,
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
    opacity: 0.35,
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
