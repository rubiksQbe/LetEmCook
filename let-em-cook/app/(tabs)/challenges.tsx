import { MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/Colors";

export default function ChallengeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setModalVisible(true)}>
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

  const [challenges, setChallenges] = useState([
    {
      id: "1",
      title: "Chimichurri Steak",
      timeLimit: "10 min",
      difficulty: "Medium",
      rating: 5,
      ingredients: [
        "Steak",
        "red wine vinegar",
        "parsley",
        "oregano",
        "garlic",
      ],
      pinned: false,
      image: require("@/assets/images/steak.jpg"),
    },
    {
      id: "2",
      title: "30-Minute Mussels",
      timeLimit: "30 min",
      difficulty: "Easy",
      rating: 4,
      ingredients: [
        "Mussels",
        "garlic",
        "white wine",
        "butter",
        "olive oil",
        "parsley",
      ],
      pinned: false,
      image: require("@/assets/images/mussels.jpg"),
    },
  ]);

  const togglePin = (id: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const StarRating = ({ rating }: { rating: number }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={18}
          color={Colors.palette.dark}
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={{ flexDirection: "row" }}>{stars}</View>;
  };

  return (
    <View style={styles.container}>
      {/* Challenge List */}
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={item.image} style={styles.cardImage} />

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>

                <TouchableOpacity onPress={() => togglePin(item.id)}>
                  <MaterialCommunityIcons
                    name={item.pinned ? "pin" : "pin-outline"}
                    size={25}
                    color={
                      item.pinned ? Colors.palette.blue : Colors.palette.darkest
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                {/* Time */}
                <View style={styles.infoItem}>
                  <Ionicons
                    name="timer"
                    size={20}
                    color={Colors.palette.dark}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.cardTime}>{item.timeLimit}</Text>
                </View>

                {/* Difficulty */}
                <View style={styles.infoItem}>
                  <FontAwesome
                    name="gear"
                    size={20}
                    color={Colors.palette.dark}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.difficultyText}>
                    {"Difficulty: " + item.difficulty}
                  </Text>
                </View>

                {/* Star rating */}
                <StarRating rating={item.rating} />
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal */}
      <Modal animationType="slide" visible={modalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Challenge</Text>

            <TextInput
              placeholder="Challenge Title"
              style={styles.input}
              placeholderTextColor="#333"
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// styles unchanged...

// ---------- STYLES ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.light,
  },

  // Cards
  card: {
    backgroundColor: Colors.palette.lightest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 200,
  },
  cardContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    color: Colors.palette.darkest,
  },
  cardTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.dark,
    marginVertical: 5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    width: "85%",
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    fontFamily: "Poppins_400Regular",
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: Colors.palette.blue,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  closeButtonText: {
    color: "white",
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },

  difficultyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.dark,
  },
});
