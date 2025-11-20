import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/Colors";
import { Challenge, ChallengeRow } from "../../constants/types";
import { fetchChallenges, supabase } from "../../lib/supabase";

// Helper function to convert database row to Challenge interface
function convertToChallenge(row: ChallengeRow, currentUserId?: string): Challenge {
  // Format username as "Chef [Username]" or "Your Challenge" if current user
  const displayUsername = row.created_by === currentUserId 
    ? "Your Challenge" 
    : `Chef ${row.created_by_username}`;

  return {
    id: row.id,
    title: row.title,
    timeLimit: row.time_limit,
    difficulty: row.difficulty,
    rating: row.rating ?? undefined,
    ingredients: row.ingredients,
    description: row.description ?? undefined,
    pinned: false, // Pinned state is per-user, stored locally
    image: row.image_url ? { uri: row.image_url } : require("@/assets/images/placeholder.jpg"),
    created_at: row.created_at,
    created_by: row.created_by,
    created_by_username: displayUsername,
    image_url: row.image_url ?? undefined,
    dietary_restrictions: row.dietary_restrictions ?? undefined,
  };
}

export default function ChallengeScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push("/(modals)/addChallenge")}>
          <MaterialCommunityIcons
            name="plus"
            size={32}
            color={Colors.palette.blue}
            style={{ marginRight: 18 }}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Fetch challenges on mount
  useEffect(() => {
    async function loadChallenges() {
      try {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id);

        // Fetch challenges
        const { data, error } = await fetchChallenges();
        if (error) {
          console.error("Error fetching challenges:", error);
          return;
        }

        if (data) {
          const convertedChallenges = data.map((row: ChallengeRow) => 
            convertToChallenge(row, user?.id)
          );
          setChallenges(convertedChallenges);
        }
      } catch (error) {
        console.error("Error loading challenges:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadChallenges();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("challenges-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
        },
        async (payload) => {
          console.log("Real-time update:", payload);

          if (payload.eventType === "INSERT") {
            // New challenge added
            const newChallenge = convertToChallenge(
              payload.new as ChallengeRow,
              currentUserId
            );
            setChallenges((prev) => [newChallenge, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Challenge updated
            const updatedChallenge = convertToChallenge(
              payload.new as ChallengeRow,
              currentUserId
            );
            setChallenges((prev) =>
              prev.map((c) => (c.id === updatedChallenge.id ? updatedChallenge : c))
            );
          } else if (payload.eventType === "DELETE") {
            // Challenge deleted
            setChallenges((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);


  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.palette.blue} />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Challenge List */}
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No challenges yet!</Text>
            <Text style={styles.emptySubText}>
              Tap the + icon to create your first challenge
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/challenges/[id]",
                params: { id: item.id, challenge: JSON.stringify(item) },
              })
            }
          >
            <View style={styles.card}>
              <View style={styles.cardImageContainer}>
                <Image source={item.image} style={styles.cardImage} />
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>
                    {item.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardCreator}>
                  {item.created_by_username || "Anonymous"}
                </Text>
                <View style={styles.timeContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={Colors.palette.blue}
                  />
                  <Text style={styles.timeText}>{item.timeLimit}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.palette.dark,
    fontFamily: "Poppins_400Regular",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.dark,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "row",
    overflow: "hidden",
    borderLeftWidth: 4,
    borderLeftColor: Colors.palette.blue,
  },
  cardImageContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  difficultyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: Colors.palette.darkest,
    letterSpacing: 0.5,
  },
  cardTextContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 19,
    color: Colors.palette.darkest,
    marginBottom: 6,
    lineHeight: 24,
  },
  cardCreator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.palette.blue,
    marginBottom: 8,
    fontStyle: "italic",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.palette.dark,
    marginLeft: 6,
  },
});
