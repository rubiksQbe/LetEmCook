import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../../constants/Colors";
import { Challenge } from "../../../constants/types";

export default function ChallengeDetailScreen() {
  const params = useLocalSearchParams();
  let challenge: Challenge | null = null;
  try {
    challenge = params.challenge
      ? JSON.parse(params.challenge as string)
      : null;
  } catch {
    challenge = null;
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Text>Challenge not found.</Text>
      </View>
    );
  }

  const handlePin = () => {
    // TODO: Implement pin functionality
    console.log("Pin to fridge");
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log("Share challenge");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <Image source={challenge.image} style={styles.heroImage} />

        {/* Title and Creator */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.creator}>
            {challenge.created_by_username || "Anonymous"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pinButton} onPress={handlePin}>
            <MaterialCommunityIcons
              name="download"
              size={24}
              color={Colors.palette.darkest}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.pinButtonText}>PIN TO FRIDGE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>SHARE</Text>
            <Ionicons
              name="person-add"
              size={24}
              color="white"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>

        {/* Description Card */}
        <View style={styles.descriptionCard}>
          {/* Description */}
          {challenge.description && (
            <Text style={[styles.label, { marginTop: 0 }]}>
              DESCRIPTION:{" "}
              <Text style={styles.value}>{challenge.description}</Text>
            </Text>
          )}

          {/* Time Limit */}
          <Text style={[styles.label, !challenge.description && { marginTop: 0 }]}>
            TIME LIMIT:{" "}
            <Text style={styles.value}>
              {challenge.timeLimit} (not including prep time)
            </Text>
          </Text>

          {/* Ingredients */}
          <Text style={styles.label}>
            INGREDIENTS:{" "}
            <Text style={styles.value}>{challenge.ingredients.join(", ")}</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroImage: {
    width: "100%",
    height: 400,
    resizeMode: "cover",
  },
  titleSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.palette.blue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: Colors.palette.darkest,
    marginBottom: 6,
    lineHeight: 34,
  },
  creator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.blue,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  pinButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.palette.dark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: Colors.palette.darkest,
    letterSpacing: 0.5,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.blue,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: Colors.palette.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  shareButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "white",
    letterSpacing: 0.5,
  },
  descriptionCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: Colors.palette.accent,
  },
  label: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: Colors.palette.darkest,
    marginTop: 16,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  value: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.dark,
    lineHeight: 22,
  },
});
