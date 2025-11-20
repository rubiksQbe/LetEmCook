import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/Colors";
import { createChallenge } from "../../lib/supabase";

const STORAGE_KEY = "challengeDraft";

export default function AddChallengeScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("20 min");
  const [difficulty, setDifficulty] = useState("Easy");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Load draft from AsyncStorage on mount
  useEffect(() => {
    const loadDraft = async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const draft = JSON.parse(json);
      setTitle(draft.title || "");
      setTimeLimit(draft.timeLimit || "20 min");
      setDifficulty(draft.difficulty || "Easy");
      setIngredients(draft.ingredients || []);
      setImageUri(draft.imageUri || null);
      setDescription(draft.description || "");
    };
    loadDraft();
  }, []);

  // Save draft to AsyncStorage whenever inputs change
  useEffect(() => {
    const draft = {
      title,
      timeLimit,
      difficulty,
      ingredients,
      imageUri,
      description,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [title, timeLimit, difficulty, ingredients, imageUri, description]);

  const removeImage = () => setImageUri(null);

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

  const postChallenge = () => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your challenge.");
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert(
        "Missing Ingredients",
        "Please add at least one ingredient."
      );
      return;
    }

    Alert.alert(
      "Confirm Post",
      "Post this challenge to the public challenges page?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Post",
          onPress: async () => {
            setIsPosting(true);
            try {
              const { data, error } = await createChallenge({
                title,
                timeLimit,
                difficulty,
                description,
                ingredients,
                imageUri,
              });

              if (error) {
                throw error;
              }

              // Clear draft after successful posting
              await AsyncStorage.removeItem(STORAGE_KEY);
              
              Alert.alert(
                "Success!",
                "Your challenge has been posted!",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (error) {
              console.error("Error posting challenge:", error);
              Alert.alert(
                "Error",
                "Failed to post challenge. Please try again."
              );
            } finally {
              setIsPosting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

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
          onValueChange={setTimeLimit}
          style={styles.pickerContainer}
          itemStyle={{ fontSize: 16, height: 110 }}
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
              imageUri && imageUri !== "null" // sometimes string "null" is saved
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

        {/* ---------------- DESCRIPTION ---------------- */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Write a description for your challenge"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 100 }]}
          multiline
          textAlignVertical="top"
        />

        {/* ---------------- INGREDIENTS ---------------- */}
        <Text style={styles.label}>Ingredients</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={styles.ingredientInputRow}>
            <TextInput
              placeholder="Add ingredient"
              placeholderTextColor="#888"
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
        <TouchableOpacity
          onPress={saveChallenge}
          style={styles.saveArea}
          disabled={isPosting}
        >
          <Text style={styles.footerText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={postChallenge}
          style={[styles.postArea, isPosting && { opacity: 0.6 }]}
          disabled={isPosting}
        >
          {isPosting ? (
            <ActivityIndicator color={Colors.palette.darkest} size="small" />
          ) : (
            <Text
              style={[styles.footerText, { color: Colors.palette.darkest }]}
            >
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// import {
//   FontAwesome,
//   Ionicons,
//   MaterialCommunityIcons,
// } from "@expo/vector-icons";
// import { Picker } from "@react-native-picker/picker";
// import * as ImagePicker from "expo-image-picker";
// import { useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   Alert,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Colors from "../../constants/Colors";

// export default function AddChallengeScreen() {
//   const router = useRouter();

//   const [title, setTitle] = useState("");
//   const [timeLimit, setTimeLimit] = useState("20 min");

//   const [difficulty, setDifficulty] = useState("Easy");
//   const [ingredients, setIngredients] = useState<string[]>([]);
//   const [newIngredient, setNewIngredient] = useState("");
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [description, setDescription] = useState("");

//   const removeImage = () => setImageUri(null);

//   // -------- IMAGE PICKER --------
//   const pickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       allowsEditing: true,
//       quality: 0.7,
//     });
//     if (!result.canceled) setImageUri(result.assets[0].uri);
//   };

//   const addIngredient = () => {
//     if (!newIngredient.trim()) return;
//     setIngredients((prev) => [...prev, newIngredient]);
//     setNewIngredient("");
//   };

//   const removeIngredient = (idx: number) => {
//     setIngredients((prev) => prev.filter((_, i) => i !== idx));
//   };

//   const saveChallenge = () => router.back();
//   const postChallenge = () => {
//     Alert.alert(
//       "Confirm Post",
//       "Post this challenge to the public challenges page?",
//       [
//         {
//           text: "Cancel",
//           style: "cancel",
//         },
//         {
//           text: "Post",
//           onPress: () => {
//             // Add your logic to save/post the challenge to the database here
//             router.back(); // or navigate to another screen if needed
//           },
//         },
//       ],
//       { cancelable: true }
//     );
//   };

//   const timeOptions = [
//     "5 min",
//     "10 min",
//     "15 min",
//     "20 min",
//     "30 min",
//     "45 min",
//     "1 hr",
//   ];
//   const difficulties = ["Easy", "Medium", "Hard"];

//   const handleTimeChange = (value: string) => {
//     setTimeLimit(value);
//   };

//   return (
//     <View style={styles.modalContainer}>
//       <ScrollView
//         contentContainerStyle={{ paddingBottom: 350, paddingTop: 10 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ---------------- TITLE ---------------- */}
//         <Text style={styles.label}>Title</Text>
//         <TextInput
//           placeholder="Challenge Title"
//           placeholderTextColor="#888"
//           value={title}
//           onChangeText={setTitle}
//           style={styles.input}
//         />

//         {/* ---------------- TIME LIMIT ---------------- */}
//         <View style={styles.sectionHeaderRow}>
//           <Ionicons name="timer" size={20} color={Colors.palette.dark} />
//           <Text style={styles.sectionHeaderText}>Time Limit</Text>
//         </View>

//         <Picker
//           selectedValue={timeLimit}
//           onValueChange={handleTimeChange}
//           style={styles.pickerContainer}
//           itemStyle={{ fontSize: 16, height: 110 }}
//         >
//           {timeOptions.map((t) => (
//             <Picker.Item key={t} label={t} value={t} />
//           ))}
//         </Picker>

//         <Text
//           style={{ marginTop: 6, marginBottom: 10, color: Colors.palette.dark }}
//         >
//           Selected: {timeLimit}
//         </Text>

//         {/* ---------------- DIFFICULTY ---------------- */}
//         <View style={styles.sectionHeaderRow}>
//           <FontAwesome name="gear" size={20} color={Colors.palette.dark} />
//           <Text style={styles.sectionHeaderText}>Difficulty</Text>
//         </View>

//         <View style={styles.wrapContainer}>
//           {difficulties.map((d) => (
//             <TouchableOpacity
//               key={d}
//               style={[styles.chip, difficulty === d && styles.chipSelected]}
//               onPress={() => setDifficulty(d)}
//             >
//               <Text
//                 style={[
//                   styles.chipText,
//                   difficulty === d && { color: "white" },
//                 ]}
//               >
//                 {d}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* ---------------- IMAGE ---------------- */}
//         <Text style={styles.label}>Image</Text>

//         <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
//           <Image
//             source={
//               imageUri
//                 ? { uri: imageUri }
//                 : require("../../assets/images/placeholder.jpg")
//             }
//             style={styles.image}
//           />
//         </TouchableOpacity>
//         {imageUri ? (
//           <TouchableOpacity onPress={removeImage}>
//             <Text style={[styles.imageText, { color: "#d33" }]}>
//               Remove Image
//             </Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity onPress={pickImage}>
//             <Text style={styles.imageText}>Upload Image</Text>
//           </TouchableOpacity>
//         )}

//         {/* ---------------- DESCRIPTION ---------------- */}
//         <Text style={styles.label}>Description</Text>
//         <TextInput
//           placeholder="Write a description for your challenge"
//           placeholderTextColor="#888"
//           value={description}
//           onChangeText={setDescription}
//           style={[styles.input, { height: 100 }]}
//           multiline
//           textAlignVertical="top"
//         />

//         {/* ---------------- INGREDIENTS ---------------- */}
//         <Text style={styles.label}>Ingredients</Text>
//         <View style={{ marginBottom: 8 }}>
//           <View style={styles.ingredientInputRow}>
//             <TextInput
//               placeholder="Add ingredient"
//               placeholderTextColor="#888"
//               value={newIngredient}
//               onChangeText={setNewIngredient}
//               style={styles.ingredientInput}
//               onSubmitEditing={addIngredient}
//             />
//             <TouchableOpacity onPress={addIngredient}>
//               <Ionicons
//                 name="add-circle"
//                 size={32}
//                 color={Colors.palette.blue}
//               />
//             </TouchableOpacity>
//           </View>
//         </View>

//         {ingredients.map((ing, index) => (
//           <View key={index} style={styles.ingredientRow}>
//             <TouchableOpacity onPress={() => removeIngredient(index)}>
//               <MaterialCommunityIcons
//                 name="close"
//                 size={18}
//                 color={Colors.palette.blue}
//               />
//             </TouchableOpacity>
//             <Text style={styles.ingredientText}>{ing}</Text>
//           </View>
//         ))}
//       </ScrollView>

//       {/* ---------------- FOOTER BUTTONS ---------------- */}
//       <View style={styles.footer}>
//         <TouchableOpacity onPress={saveChallenge} style={styles.saveArea}>
//           <Text style={styles.footerText}>Save</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={postChallenge} style={styles.postArea}>
//           <Text style={[styles.footerText, { color: Colors.palette.darkest }]}>
//             Post
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

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
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "white",
    height: 110,
  },
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontSize: 16,
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
