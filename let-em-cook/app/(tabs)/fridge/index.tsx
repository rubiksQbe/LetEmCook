import Colors from "@/constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchChallenges, supabase } from "../../../lib/supabase";

interface Challenge {
  id: string;
  title: string;
  image_url?: string | null;
}

interface ChallengeWithSubmission extends Challenge {
  submissionImage: string;
}

interface PinnedRow {
  id: string;
  user_id: string;
  challenge_id: string;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  challenge_id: string;
  image_url: string;
}

export default function FridgeScreen() {
  const [pinnedChallenge, setPinnedChallenge] = useState<Challenge | null>(
    null
  );
  const [historyChallenges, setHistoryChallenges] = useState<
    ChallengeWithSubmission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- Load fridge data ---
  async function loadFridgeData() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allChallenges } = await fetchChallenges();
      if (!allChallenges) return;

      // --- Pinned challenge ---
      const { data: pinnedData } = await supabase
        .from<PinnedRow>("pinned")
        .select("challenge_id")
        .eq("user_id", user.id)
        .single();

      const pinnedId = pinnedData?.challenge_id || null;
      const pinned = pinnedId
        ? allChallenges.find((c) => c.id === pinnedId) || null
        : null;

      // --- History submissions ---
      const historyWithSubmission: ChallengeWithSubmission[] = (
        await Promise.all(
          allChallenges.map(async (challenge) => {
            const { data: submissions } = await supabase
              .from<SubmissionRow>("submissions")
              .select("image_url")
              .eq("challenge_id", challenge.id)
              .eq("user_id", user.id)
              .limit(1);

            if (submissions?.length) {
              return {
                ...challenge,
                submissionImage: submissions[0].image_url,
              };
            }
            return null;
          })
        )
      ).filter(Boolean) as ChallengeWithSubmission[];

      setPinnedChallenge(pinned);
      setHistoryChallenges(historyWithSubmission);
    } catch (err) {
      console.error("Error loading fridge data:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Real-time subscriptions ---
  useEffect(() => {
    let pinnedChannel: any;
    let submissionsChannel: any;

    // initial load
    loadFridgeData();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Pinned table
      pinnedChannel = supabase
        .channel(`realtime-pinned-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pinned" },
          () => loadFridgeData()
        )
        .subscribe();

      // Submissions table
      submissionsChannel = supabase
        .channel(`realtime-submissions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "submissions",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadFridgeData()
        )
        .subscribe();
    });

    // cleanup
    return () => {
      if (pinnedChannel) supabase.removeChannel(pinnedChannel);
      if (submissionsChannel) supabase.removeChannel(submissionsChannel);
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          backgroundColor: Colors.palette.light,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.palette.dark} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.wall}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: "100%", flexDirection: "row" }}>
            <View
              style={{
                height: 100,
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <Image
                source={require("@/assets/images/mouse-assets/macaroni.png")}
                style={styles.inlineMouse}
                resizeMode="contain"
              />
            </View>
            {!pinnedChallenge && (
              <View style={styles.speechBubble}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Poppins_400Regular",
                    color: Colors.palette.darkest,
                  }}
                >
                  Your pinned challenge will appear here!
                </Text>
                <View style={styles.speechBubbleTail} />
              </View>
            )}
          </View>

          <View style={styles.fridgeWrapper}>
            {/* FREEZER / Pinned */}
            <View style={styles.freezerSection}>
              {pinnedChallenge && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/fridge/[id]",
                      params: {
                        id: pinnedChallenge.id,
                        challenge: JSON.stringify(pinnedChallenge),
                      },
                    })
                  }
                  style={styles.pinnedPolaroid}
                >
                  <View style={styles.magnet}>
                    <MaterialCommunityIcons
                      name="pin"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  </View>
                  {pinnedChallenge.image_url && (
                    <Image
                      source={{ uri: pinnedChallenge.image_url }}
                      style={{ width: 130, height: 100, marginBottom: 5 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.polaroidBody}>
                    <Text
                      style={styles.polaroidCaption}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {pinnedChallenge.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />
            <View style={styles.historySection}>
              {/* HISTORY LABEL */}
              <View style={styles.historyLabelRow}>
                {["H", "I", "S", "T", "O", "R", "Y"].map((char, i) => (
                  <View
                    key={i}
                    style={{
                      transform: [{ rotate: i % 2 === 0 ? "-6deg" : "7deg" }],
                    }}
                  >
                    <Text style={styles.magnetLetter}>{char}</Text>
                  </View>
                ))}
              </View>

              {/* HISTORY GRID */}
              <FlatList
                data={historyChallenges}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{
                  justifyContent: "space-around",
                  marginTop: 20,
                  paddingHorizontal: 50,
                }}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/fridge/[id]",
                        params: {
                          id: item.id,
                          challenge: JSON.stringify(item),
                        },
                      })
                    }
                    style={styles.polaroidHistory}
                  >
                    <View style={styles.magnet} />
                    {item.submissionImage && (
                      <Image
                        source={{ uri: item.submissionImage }}
                        style={{ width: 130, height: 100, marginBottom: 5 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.polaroidBody}>
                      <Text
                        style={styles.polaroidCaption}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={{ height: 300 }} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.palette.light },
  wall: { flex: 1, backgroundColor: Colors.palette.light },
  fridgeWrapper: {
    width: "130%",
    alignSelf: "center",
    backgroundColor: Colors.palette.blue,
    borderWidth: 3,
    borderColor: Colors.palette.darkest,
    paddingTop: 50,
    marginLeft: -40,
    marginRight: -40,
    marginBottom: -200,
  },
  freezerSection: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pinnedPolaroid: {
    position: "absolute",
    top: 0,
    width: 150,
    height: 180,
    backgroundColor: "white",
    alignItems: "center",
    paddingTop: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  polaroidHistory: {
    width: 150,
    height: 180,
    backgroundColor: "white",
    alignItems: "center",
    paddingTop: 25,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  polaroidBody: { flex: 1, justifyContent: "center", paddingBottom: 5 },
  polaroidCaption: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: Colors.palette.darkest,
    textAlign: "center",
    lineHeight: 16,
  },
  magnet: {
    position: "absolute",
    top: -20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.palette.accent,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: "100%",
    height: 5,
    backgroundColor: Colors.palette.darkest,
    marginTop: 30,
  },
  historyLabelRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
    marginBottom: 20,
  },
  magnetLetter: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 40,
    color: Colors.palette.accent,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginHorizontal: 7,
  },
  historySection: { minHeight: 400, justifyContent: "flex-start" },
  inlineMouse: {
    width: 80,
    height: 80,
    marginLeft: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    shadowOffset: { width: 3, height: 5 },
    transform: [{ rotate: "-3deg" }],
    marginBottom: -6,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    height: 70,
    marginTop: 20,
    marginRight: 50,
    marginLeft: 10,
    position: "relative",
    justifyContent: "center",
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
});
