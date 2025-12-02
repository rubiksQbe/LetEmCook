import Colors from "@/constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TEMP MOCK DATA
const pinnedChallenge = { id: "1", title: "10 Pushups" };

const historyChallenges = [
  { id: "a", title: "Sunset Photo" },
  { id: "b", title: "Drink 8 Cups" },
  { id: "c", title: "Try Yoga" },
  { id: "d", title: "Cook Eggs" },
  { id: "e", title: "Morning Walk" },
  { id: "f", title: "Stretch 5 min" },
];

export default function FridgeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.headerBackground}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Fridge</Text>
        </View>
      </View>

      {/* WALL BACKGROUND */}
      <View style={styles.wall}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ height: 100 }} />

          {/* === FRIDGE === */}
          <View style={styles.fridgeWrapper}>
            {/* === FREEZER === */}
            <View style={styles.freezerSection}>
              <View style={styles.polaroid}>
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
            </View>

            {/* dividing line */}
            <View style={styles.divider} />

            {/* === HISTORY LABEL (tilted letters) === */}
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

            {/* === HISTORY GRID === */}
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
                <View style={styles.polaroidHistory}>
                  <View style={styles.magnet} />
                  <View style={styles.polaroidBody}>
                    <Text style={styles.polaroidCaption}>{item.title}</Text>
                  </View>
                </View>
              )}
            />

            {/* bottom offscreen */}
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

  /* === WALL BG === */
  wall: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },

  /* === TITLE === */
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
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: Colors.palette.darkest,
    letterSpacing: -0.5,
  },

  /* === FRIDGE BODY === */
  fridgeWrapper: {
    width: "130%",
    alignSelf: "center",
    backgroundColor: Colors.palette.blue,
    borderWidth: 3,
    borderColor: Colors.palette.darkest,
    paddingTop: 70,
    marginLeft: -40,
    marginRight: -40,

    /* hides bottom of fridge offscreen */
    marginBottom: -200,
  },

  /* === FREEZER === */
  freezerSection: {
    alignItems: "center",
  },

  /* === POLAROIDS === */
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
    paddingBottom: 15,
  },
  polaroidCaption: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: Colors.palette.darkest,
    textAlign: "center",
  },

  /* === MAGNETS === */
  magnet: {
    position: "absolute",
    top: -12,
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

  /* === DIVIDER === */
  divider: {
    width: "100%",
    height: 5,
    backgroundColor: Colors.palette.darkest,
    marginTop: 30,
  },

  /* === HISTORY LETTERS === */
  historyLabelRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginTop: 18,
    marginBottom: 10,
  },

  magnetLetter: {
    fontSize: 42,
    fontWeight: "900",
    color: Colors.palette.accent,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
