import { useLocalSearchParams } from "expo-router";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={challenge.image} style={styles.image} />
      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.description}>{challenge.description}</Text>
      <Text style={styles.sectionTitle}>Ingredients:</Text>
      {challenge.ingredients.map((ingredient, idx) => (
        <Text key={idx} style={styles.ingredient}>
          {ingredient}
        </Text>
      ))}
      <Text style={styles.sectionTitle}>
        Time Limit: <Text style={styles.info}>{challenge.timeLimit}</Text>
      </Text>
      <Text style={styles.sectionTitle}>
        Difficulty: <Text style={styles.info}>{challenge.difficulty}</Text>
      </Text>
      <Text style={styles.sectionTitle}>
        Rating: <Text style={styles.info}>{challenge.rating} / 5</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.palette.light,
    flexGrow: 1,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.darkest,
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.palette.blue,
    marginTop: 12,
  },
  ingredient: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
    marginLeft: 10,
  },
  info: {
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.dark,
    fontSize: 16,
  },
});
