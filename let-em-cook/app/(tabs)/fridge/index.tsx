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
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchChallenges, supabase } from "../../../lib/supabase";

// --- Static mapping of filenames to images ---
const hatImages: Record<string, any> = {
  "gamerhat.png": require("@/assets/images/mouse-assets/gamerhat.png"),
  "jester.png": require("@/assets/images/mouse-assets/jester.png"),
  "party_hat.png": require("@/assets/images/mouse-assets/party_hat.png"),
  "chef.png": require("@/assets/images/mouse-assets/chef.png"),
};

const itemImages: Record<string, any> = {
  "wand.png": require("@/assets/images/mouse-assets/wand.png"),
  "spatula.png": require("@/assets/images/mouse-assets/spatula.png"),
  "SNES_controller.svg.png": require("@/assets/images/mouse-assets/SNES_controller.svg.png"),
  "balloon.png": require("@/assets/images/mouse-assets/balloon.png"),
};

// --- Base mouse ---
const baseMouse = require("@/assets/images/mouse-assets/defaultmouse.png");

interface Challenge {
  id: string;
  title: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  image_url?: string | null;
}

interface ChallengeWithSubmission extends Challenge {
  submissionImage: string;
}

interface PalAccessoryRow {
  user_id: string;
  hat: string | null;
  item: string | null;
  allHats?: string[];
  allItems?: string[];
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

// Animated Polaroid Component - Subtle press feedback
interface AnimatedPolaroidProps {
  children: React.ReactNode;
  onPress: () => void;
  style: any;
  isPinned?: boolean;
  index?: number;
}

function AnimatedPolaroid({
  children,
  onPress,
  style,
  isPinned = false,
  index = 0,
}: AnimatedPolaroidProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  return (
    <Animated.View
      entering={
        isPinned
          ? FadeIn.duration(300)
          : FadeInDown.delay(index * 60).duration(300)
      }
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={style}
          activeOpacity={1}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// Animated Mouse with very subtle idle bounce
function AnimatedMouse({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Very subtle idle bounce animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  return (
    <Animated.View entering={FadeInLeft.duration(400)}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function FridgeScreen() {
  const [pinnedChallenge, setPinnedChallenge] = useState<Challenge | null>(
    null
  );
  const [historyChallenges, setHistoryChallenges] = useState<
    ChallengeWithSubmission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [equippedHat, setEquippedHat] = useState<string | null>(null);
  const [equippedItem, setEquippedItem] = useState<string | null>(null);

  const router = useRouter();

  // --- Load all fridge data including accessories ---
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
        .from("pinned")
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
              .from("submissions")
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

      // --- Equipped accessories ---
      const { data: accessoryData } = await supabase
        .from("pal-accessory")
        .select("hat, item")
        .eq("user_id", user.id)
        .single();

      setPinnedChallenge(pinned);
      setHistoryChallenges(historyWithSubmission);
      setEquippedHat(accessoryData?.hat ?? null);
      setEquippedItem(accessoryData?.item ?? null);
    } catch (err) {
      console.error("Error loading fridge data:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Real-time subscriptions ---
  useEffect(() => {
    let accessoriesChannel: any;
    let pinnedChannel: any;
    let submissionsChannel: any;
    let challengesChannel: any;

    // Initial load
    loadFridgeData();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // --- Accessories realtime ---
      accessoriesChannel = supabase
        .channel(`realtime-accessories-${user.id}`)
        .on(
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "pal-accessory",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (!payload.new) return;
            setEquippedHat(payload.new.hat);
            setEquippedItem(payload.new.item);
          }
        )
        .subscribe();

      // --- Pinned realtime ---
      pinnedChannel = supabase
        .channel(`realtime-pinned-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pinned",
          },
          () => loadFridgeData()
        )
        .subscribe();

      // --- Submissions realtime ---
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

      // --- Challenges realtime (for deletions) ---
      challengesChannel = supabase
        .channel(`realtime-challenges-fridge-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "challenges",
          },
          async (payload: any) => {
            if (payload.eventType === "DELETE") {
              const deletedId = payload.old.id;
              // If the deleted challenge was pinned, unpin it
              setPinnedChallenge((prev) => {
                if (prev && prev.id === deletedId) {
                  return null;
                }
                return prev;
              });
              // Remove from history if it was there
              setHistoryChallenges((prev) =>
                prev.filter((c) => c.id !== deletedId)
              );
            }
          }
        )
        .subscribe();
    });

    return () => {
      if (accessoriesChannel) supabase.removeChannel(accessoriesChannel);
      if (pinnedChannel) supabase.removeChannel(pinnedChannel);
      if (submissionsChannel) supabase.removeChannel(submissionsChannel);
      if (challengesChannel) supabase.removeChannel(challengesChannel);
    };
  }, []);

  const hatPosition = (id: string) => {
    switch (id) {
      case "gamerhat.png":
        return { top: 8, right: 36, width: 32, height: 32 };
      case "party_hat.png":
        return { top: -8, right: 30, width: 45, height: 45 };
      case "chef.png":
        return { top: -5, right: 30, width: 45, height: 45 };
      case "jester.png":
        return { top: -7, right: 25, width: 55, height: 55 };
      default:
        return { top: -5, right: 30, width: 45, height: 45 };
    }
  };

  const itemPosition = (id: string) => {
    switch (id) {
      case "SNES_controller.svg.png":
        return { bottom: 15, right: -5, width: 38, height: 38 };
      case "spatula.png":
        return { bottom: 25, right: 0, width: 35, height: 35 };
      case "wand.png":
        return { bottom: 30, right: 0, width: 35, height: 35 };
      case "balloon.png":
        return { bottom: 30, right: 8, width: 40, height: 40 };
      default:
        return { bottom: 25, right: 0, width: 35, height: 35 };
    }
  };

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
              <AnimatedMouse onPress={() => router.push("/fridge/customize")}>
                <View>
                  <Image
                    source={baseMouse}
                    style={styles.inlineMouse}
                    resizeMode="contain"
                  />
                  {equippedHat && hatImages[equippedHat] && (
                    <Image
                      source={hatImages[equippedHat]}
                      style={[styles.hatOverlay, hatPosition(equippedHat)]}
                      resizeMode="contain"
                    />
                  )}
                  {equippedItem && itemImages[equippedItem] && (
                    <Image
                      source={itemImages[equippedItem]}
                      style={[styles.itemOverlay, itemPosition(equippedItem)]}
                      resizeMode="contain"
                    />
                  )}
                </View>
              </AnimatedMouse>
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
                  Your pinned challenge will appear down below!
                </Text>
                <View style={styles.speechBubbleTail} />
              </View>
            )}
          </View>

          <Animated.View
            style={styles.fridgeWrapper}
            entering={FadeInDown.duration(350)}
          >
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
                  activeOpacity={0.8}
                >
                  <View style={styles.magnet}>
                    <MaterialCommunityIcons
                      name="pin"
                      size={20}
                      color={Colors.palette.darkest}
                    />
                  </View>
                  <View
                    style={{
                      position: "relative",
                      width: 130,
                      height: 100,
                      marginBottom: 5,
                    }}
                  >
                    <Image
                      source={
                        pinnedChallenge.image_url
                          ? { uri: pinnedChallenge.image_url }
                          : require("@/assets/images/placeholder.jpg")
                      }
                      style={{ width: 130, height: 100 }}
                      resizeMode="cover"
                    />
                  </View>
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
                renderItem={({ item, index }) => (
                  <AnimatedPolaroid
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
                    index={index}
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
                  </AnimatedPolaroid>
                )}
              />
            </View>

            <View style={{ height: 300 }} />
          </Animated.View>
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
    padding: 2,
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
    width: 100,
    height: 100,
    marginLeft: 18,
    transform: [{ rotate: "-3deg" }],
    marginBottom: -10,
    position: "relative",
  },
  difficultyChip: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: Colors.palette.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    height: 70,
    marginTop: 20,
    marginRight: 22,
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
  hatOverlay: { position: "absolute" },
  itemOverlay: { position: "absolute" },
});
