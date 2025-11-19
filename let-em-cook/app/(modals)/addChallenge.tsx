import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
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
  const [timeLimit, setTimeLimit] = useState("20 min");

  const [difficulty, setDifficulty] = useState("Easy");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const removeImage = () => setImageUri(null);

  // -------- IMAGE PICKER --------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
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

  const handleTimeChange = (value: string) => {
    setTimeLimit(value);
  };

  return (
    <View style={styles.modalContainer}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 350, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------- TITLE ---------------- */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="Challenge Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* ---------------- TIME LIMIT ---------------- */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="timer" size={20} color={Colors.palette.dark} />
          <Text style={styles.sectionHeaderText}>Time Limit</Text>
        </View>

        <Picker
          selectedValue={timeLimit}
          onValueChange={handleTimeChange}
          style={styles.pickerContainer}
          itemStyle={{ fontSize: 16, height: 125 }} // smaller row height for each option
        >
          {timeOptions.map((t) => (
            <Picker.Item key={t} label={t} value={t} />
          ))}
        </Picker>

        <Text
          style={{ marginTop: 6, marginBottom: 10, color: Colors.palette.dark }}
        >
          Selected: {timeLimit}
        </Text>

        {/* ---------------- DIFFICULTY ---------------- */}
        <View style={styles.sectionHeaderRow}>
          <FontAwesome name="gear" size={20} color={Colors.palette.dark} />
          <Text style={styles.sectionHeaderText}>Difficulty</Text>
        </View>

        <View style={styles.wrapContainer}>
          {difficulties.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, difficulty === d && styles.chipSelected]}
              onPress={() => setDifficulty(d)}
            >
              <Text
                style={[
                  styles.chipText,
                  difficulty === d && { color: "white" },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
        </TouchableOpacity>
        {imageUri ? (
          <TouchableOpacity onPress={removeImage}>
            <Text style={[styles.imageText, { color: "#d33" }]}>
              Remove Image
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.imageText}>Upload Image</Text>
          </TouchableOpacity>
        )}

        {/* ---------------- INGREDIENTS ---------------- */}
        <Text style={styles.label}>Ingredients</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={styles.ingredientInputRow}>
            <TextInput
              placeholder="Add ingredient"
              placeholderTextColor="#777"
              value={newIngredient}
              onChangeText={setNewIngredient}
              style={styles.ingredientInput}
              onSubmitEditing={addIngredient}
            />
            <TouchableOpacity onPress={addIngredient}>
              <Ionicons
                name="add-circle"
                size={32}
                color={Colors.palette.blue}
              />
            </TouchableOpacity>
          </View>
        </View>

        {ingredients.map((ing, index) => (
          <View key={index} style={styles.ingredientRow}>
            <TouchableOpacity onPress={() => removeIngredient(index)}>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={Colors.palette.blue}
              />
            </TouchableOpacity>
            <Text style={styles.ingredientText}>{ing}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ---------------- FOOTER BUTTONS ---------------- */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={saveChallenge} style={styles.saveArea}>
          <Text style={styles.footerText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={postChallenge} style={styles.postArea}>
          <Text style={[styles.footerText, { color: Colors.palette.darkest }]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
    color: Colors.palette.dark,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.palette.light,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "white",
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.palette.light,
  },
  imageText: {
    fontSize: 16,
    color: Colors.palette.blue,
    alignSelf: "center",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
    color: Colors.palette.dark,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.palette.light,
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "white",
    height: 150,
  },
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.palette.light,
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
  ingredientInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ingredientInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.palette.light,
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "white",
  },
  ingredientRow: {
    flexDirection: "row",
    alignContent: "flex-start",
    padding: 1,
  },
  ingredientText: {
    fontSize: 16,
    marginHorizontal: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 60,
  },
  saveArea: {
    flex: 1,
    backgroundColor: Colors.palette.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  postArea: {
    flex: 1,
    backgroundColor: Colors.palette.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
});
