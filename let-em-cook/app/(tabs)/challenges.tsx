import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import Colors from "../../constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ChallengeScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const [challenges, setChallenges] = useState([
    {
      id: "1",
      title: "Chimichurri Steak",
      timeLimit: "10 min",
      ingredients: [
        "Steak",
        "red wine vinegar",
        "parsley",
        "oregano",
        "garlic",
      ],
      image: require("@/assets/images/steak.jpg"),
    },
    {
      id: "2",
      title: "30-Minute Mussels",
      timeLimit: "30 min",
      ingredients: [
        "Mussels",
        "garlic",
        "white wine",
        "butter",
        "olive oil",
        "parsley",
      ],
      image: require("@/assets/images/mussels.jpg"),
    },
  ]);

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
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardTime}>⏱ {item.timeLimit}</Text>
              <Text style={styles.cardIngredients}>
                {"Ingredients: " + item.ingredients.join(", ")}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="plus"
          size={44}
          color={Colors.palette.dark}
        />
      </TouchableOpacity>

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

// ---------- STYLES ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.dark,
  },

  // Header
  header: {
    width: "100%",
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.palette.blue,
    alignItems: "center",
  },
  headerText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 30,
    color: "white",
  },

  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: 200,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: Colors.palette.dark,
  },
  cardTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.blue,
    marginVertical: 5,
  },
  cardIngredients: {
    fontFamily: "Poppins_300Light",
    color: Colors.palette.dark,
  },

  // Add Button
  addButton: {
    backgroundColor: Colors.palette.accent,
    width: 60,
    height: 60,
    borderRadius: 30,
    position: "absolute",
    bottom: 30,
    right: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
});

// import { StyleSheet } from 'react-native';

// import { Text, View } from '@/components/Themed';

// export default function ChallengeScreen() {
// 	return (
// 		<View style={styles.container}>
// 			<Text style={styles.title}>Challenges</Text>
// 			<View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
// 			<Text>Browse and track challenges here.</Text>
// 		</View>
// 	);
// }

// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		alignItems: 'center',
// 		justifyContent: 'center',
// 	},
// 	title: {
// 		fontSize: 20,
// 		fontWeight: 'bold',
// 	},
// 	separator: {
// 		marginVertical: 30,
// 		height: 1,
// 		width: '80%',
// 	},
// });
