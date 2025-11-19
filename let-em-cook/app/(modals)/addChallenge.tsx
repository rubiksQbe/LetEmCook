import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/Colors";

export default function AddChallengeScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("10 min");
  const [difficulty, setDifficulty] = useState("Easy");

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const removeImage = () => {
    setImageUri(null);
  };

  // -------- IMAGE PICKER --------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const addIngredient = () => {
    if (!newIngredient.trim()) return;
    setIngredients((prev) => [...prev, newIngredient]);
    setNewIngredient("");
  };

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveChallenge = () => router.back();
  const discard = () => router.back();
  const postChallenge = () => router.back();

  const timeOptions = [
    "5 min",
    "10 min",
    "15 min",
    "20 min",
    "30 min",
    "45 min",
    "1 hr",
  ];
  const difficulties = ["Easy", "Medium", "Hard"];

  return (
    <View style={styles.modalContainer}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Create a Challenge</Text>

        {/* ---------------- TITLE ---------------- */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="Challenge Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* ---------------- IMAGE ---------------- */}
        <Text style={styles.label}>Image</Text>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          <Image
            source={
              imageUri
                ? { uri: imageUri }
                : require("../../assets/images/placeholder.jpg")
            }
            style={styles.image}
          />
          <Text style={styles.imageText}>Upload Image</Text>
        </TouchableOpacity>

        {/* ---------------- TIME LIMIT ---------------- */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", height: 27 }}>
            <Ionicons name="timer" size={20} color={Colors.palette.dark} />
            <Text style={{ fontSize: 16, fontWeight: "600", marginLeft: 6 }}>
              Time Limit
            </Text>
          </View>
        </View>

        <View style={styles.wrapContainer}>
          {timeOptions.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, timeLimit === t && styles.chipSelected]}
              onPress={() => setTimeLimit(t)}
            >
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------------- DIFFICULTY ---------------- */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", height: 27 }}>
            <FontAwesome name="gear" size={20} color={Colors.palette.dark} />
            <Text style={{ fontSize: 16, fontWeight: "600", marginLeft: 6 }}>
              Difficulty
            </Text>
          </View>
        </View>

        <View style={styles.wrapContainer}>
          {difficulties.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, difficulty === d && styles.chipSelected]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={styles.chipText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------------- INGREDIENTS ---------------- */}
        <Text style={styles.label}>Ingredients</Text>
        <View style={styles.ingredientInputRow}>
          <TextInput
            placeholder="Add ingredient"
            placeholderTextColor="#777"
            value={newIngredient}
            onChangeText={setNewIngredient}
            style={styles.ingredientInput}
          />
          <TouchableOpacity onPress={addIngredient}>
            <Ionicons name="add-circle" size={32} color={Colors.palette.blue} />
          </TouchableOpacity>
        </View>

        {ingredients.map((ing, index) => (
          <View key={index} style={styles.ingredientRow}>
            <Text style={styles.ingredientText}>• {ing}</Text>
            <TouchableOpacity onPress={() => removeIngredient(index)}>
              <MaterialCommunityIcons name="close" size={24} color="#444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* ---------------- FOOTER BUTTONS ---------------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={discard}
          style={[styles.footerBtn, styles.discardBtn]}
        >
          <Text style={styles.footerText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveChallenge}
          style={[styles.footerBtn, styles.saveBtn]}
        >
          <Text style={styles.footerText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={postChallenge}
          style={[styles.footerBtn, styles.postBtn]}
        >
          <Text style={styles.footerText}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 20,
    color: Colors.palette.darkest,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4, // small spacing
    color: Colors.palette.dark,
    marginTop: 15,
    marginBottom: 6,
  },

  /* --- Title & Inputs --- */
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },

  /* --- Image Picker --- */
  imagePicker: {
    alignItems: "center",
    marginBottom: 15,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  imageText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.palette.blue,
  },

  /* --- Chips + Wrap Layout --- */
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 10,
    marginBottom: 10,
  },
  chipSelected: {
    backgroundColor: Colors.palette.blue,
  },
  chipText: {
    color: Colors.palette.darkest,
    fontSize: 14,
    fontWeight: "500",
  },

  /* --- Ingredients --- */
  ingredientInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ingredientInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  ingredientText: {
    fontSize: 16,
  },

  /* --- Footer Buttons --- */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 25,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  footerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  discardBtn: { backgroundColor: "#bbb" },
  saveBtn: { backgroundColor: Colors.palette.blue },
  postBtn: { backgroundColor: Colors.palette.accent },
  footerText: { color: "white", fontSize: 16, fontWeight: "600" },
  removeImageBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f55",
    borderRadius: 8,
  },
  removeImageText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
