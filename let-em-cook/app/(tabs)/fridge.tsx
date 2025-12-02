import Colors from "@/constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchChallenges, supabase } from "../../lib/supabase";

interface Challenge {
  id: string;
  title: string;
  image_url?: string | null;
}

interface ChallengeWithSubmission extends Challenge {
  submissionImage: string;
}

export default function FridgeScreen() {
  const [pinnedChallenge, setPinnedChallenge] = useState<Challenge | null>(
    null
  );
  const [historyChallenges, setHistoryChallenges] = useState<
    ChallengeWithSubmission[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFridgeData() {
      setLoading(true);

      try {
        // 1️⃣ Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 2️⃣ Fetch all challenges
        const { data: allChallenges } = await fetchChallenges();
        if (!allChallenges) return;

        // 3️⃣ Determine pinned challenge (user metadata)
        const pinnedId = user.user_metadata?.pinned_challenge_id;
        const pinned = allChallenges.find((c) => c.id === pinnedId) || null;

        // 4️⃣ Filter history: only challenges where user submitted
        const historyWithSubmission: ChallengeWithSubmission[] = (
          await Promise.all(
            allChallenges
              .filter((c) => c.id !== pinnedId)
              .map(async (challenge) => {
                const { data: submissions } = await supabase
                  .from("submissions")
                  .select("image_url") // fetch the image
                  .eq("challenge_id", challenge.id)
                  .eq("user_id", user.id)
                  .limit(1);

                if (submissions?.length) {
                  return {
                    ...challenge,
                    submissionImage: submissions[0].image_url as string, // include user's image
                  };
                }
                return null;
              })
          )
        ).filter(Boolean) as ChallengeWithSubmission[];

        setPinnedChallenge(pinned);
        setHistoryChallenges(historyWithSubmission);
      } catch (error) {
        console.error("Error loading fridge data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFridgeData();
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
        <ActivityIndicator size="large" color={Colors.palette.darkest} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.headerBackground}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Fridge</Text>
        </View>
      </View>

      <View style={styles.wall}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ height: 100 }} />

          <View style={styles.fridgeWrapper}>
            {/* FREEZER / Pinned */}
            <View style={styles.freezerSection}>
              {pinnedChallenge && (
                <View style={styles.pinnedPolaroid}>
                  <View style={styles.magnet}>
                    <MaterialCommunityIcons
                      name="pin"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  </View>
                  <View style={styles.polaroidBody}>
                    <Text style={styles.polaroidCaption}>
                      {pinnedChallenge.title}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* HISTORY LABEL */}
            <View style={styles.historyLabelRow}>
              {["H", "I", "S", "T", "O", "R", "Y"].map((char, i) => (
                <Text
                  key={i}
                  style={[
                    styles.magnetLetter,
                    {
                      transform: [{ rotate: i % 2 === 0 ? "-6deg" : "7deg" }],
                    },
                  ]}
                >
                  {char}
                </Text>
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
              renderItem={({ item }: { item: ChallengeWithSubmission }) => (
                <View style={styles.polaroidHistory}>
                  <View style={styles.magnet} />

                  {item.submissionImage && (
                    <Image
                      source={{ uri: item.submissionImage }}
                      style={{
                        width: 130,
                        height: 100,
                        marginBottom: 5,
                      }}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.polaroidBody}>
                    <Text style={styles.polaroidCaption}>{item.title}</Text>
                  </View>
                </View>
              )}
            />

            <View style={{ height: 200 }} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* === SAFE AREA HEADER === */
  safeArea: {
    flex: 1,
    backgroundColor: Colors.palette.accent,
  },
  headerBackground: {
    backgroundColor: Colors.palette.accent,
  },
  wall: {
    flex: 1,
    backgroundColor: Colors.palette.light,
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
  fridgeWrapper: {
    width: "130%",
    alignSelf: "center",
    backgroundColor: Colors.palette.blue,
    borderWidth: 3,
    borderColor: Colors.palette.darkest,
    paddingTop: 70,
    marginLeft: -40,
    marginRight: -40,
    marginBottom: -200,
  },
  freezerSection: {
    height: 180, // fixed height for top part
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // allow absolute children
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

  polaroid: {
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
  polaroidBody: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 5,
  },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.palette.accent,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
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
    gap: 15,
    marginTop: 18,
    marginBottom: 10,
  },
  magnetLetter: {
    fontSize: 40,
    fontWeight: "900",
    color: Colors.palette.accent,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
