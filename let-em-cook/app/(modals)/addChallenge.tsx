import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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

const TIME_OPTIONS = [
  "5 min",
  "10 min",
  "15 min",
  "20 min",
  "30 min",
  "45 min",
  "1 hr",
];

const TIME_UNITS = ["min", "hr"];

const DIETARY_OPTIONS = [
  "Vegan",
  "Vegetarian",
  "Kosher",
  "Halal",
  "Gluten-Free",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function AddChallengeScreen() {
  const router = useRouter();

  // Basic fields
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Easy"
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Filters - Time Limit
  const [timeLimit, setTimeLimit] = useState("");
  const [customTimeOptions, setCustomTimeOptions] = useState<string[]>([]);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");
  const [customTimeUnit, setCustomTimeUnit] = useState("min");

  // Filters - Ingredients
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");

  // Filters - Dietary Restrictions
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [isCustomDietary, setIsCustomDietary] = useState(false);
  const [customDietary, setCustomDietary] = useState("");

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load draft from AsyncStorage on mount
  useEffect(() => {
    const loadDraft = async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const draft = JSON.parse(json);
      setTitle(draft.title || "");
      setDifficulty(draft.difficulty || "Easy");
      setTimeLimit(draft.timeLimit || "");
      setCustomTimeOptions(draft.customTimeOptions || []);
      setIngredients(draft.ingredients || []);
      setDietaryRestrictions(draft.dietaryRestrictions || []);
      setImageUri(draft.imageUri || null);
      setDescription(draft.description || "");
    };
    loadDraft();
  }, []);

  // Save draft to AsyncStorage whenever inputs change
  useEffect(() => {
    const draft = {
      title,
      difficulty,
      timeLimit,
      customTimeOptions,
      ingredients,
      dietaryRestrictions,
      imageUri,
      description,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    title,
    difficulty,
    timeLimit,
    customTimeOptions,
    ingredients,
    dietaryRestrictions,
    imageUri,
    description,
  ]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleDiscardDraft = () => {
    Alert.alert(
      "Discard Challenge",
      "Are you sure you want to discard this challenge? All changes will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
            } catch (e) {
              console.error("Failed to clear challenge draft", e);
            }
            router.back();
          },
        },
      ]
    );
  };

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

  const toggleDietaryRestriction = (option: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const applyCustomTime = () => {
    if (!customTimeValue.trim()) {
      Alert.alert("Invalid Time", "Please enter a time value.");
      return;
    }
    const customTimeString = `${customTimeValue} ${customTimeUnit}`;
    // Add to custom time options if not already there
    if (!customTimeOptions.includes(customTimeString)) {
      setCustomTimeOptions((prev) => [...prev, customTimeString]);
    }
    setTimeLimit(customTimeString);
    setIsCustomTime(false);
    setCustomTimeValue("");
  };

  const applyCustomDietary = () => {
    if (!customDietary.trim()) {
      Alert.alert("Invalid Input", "Please enter a dietary restriction.");
      return;
    }
    // Add custom dietary restriction if not already in the list
    if (!dietaryRestrictions.includes(customDietary.trim())) {
      setDietaryRestrictions((prev) => [...prev, customDietary.trim()]);
    }
    setIsCustomDietary(false);
    setCustomDietary("");
  };

  const saveChallenge = () => router.back();

  const postChallenge = () => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your challenge.");
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Missing Description",
        "Please enter a description for your challenge."
      );
      return;
    }

    // Check that at least one filter is selected
    const hasTimeLimit = timeLimit !== "";
    const hasIngredients = ingredients.length > 0;
    const hasDietaryRestrictions = dietaryRestrictions.length > 0;

    if (!hasTimeLimit && !hasIngredients && !hasDietaryRestrictions) {
      Alert.alert(
        "Missing Tags",
        "Please select at least one tag: Time Limit, Ingredients, or Dietary Restrictions."
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
                dietaryRestrictions,
              });

              if (error) {
                throw error;
              }

              // Clear draft after successful posting
              await AsyncStorage.removeItem(STORAGE_KEY);

              Alert.alert("Success!", "Your challenge has been posted!", [
                { text: "OK", onPress: () => router.back() },
              ]);
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

  return (
    <KeyboardAvoidingView
      style={styles.modalContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------- TITLE + DISCARD ---------------- */}
        <View style={styles.titleHeaderRow}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity
            onPress={handleDiscardDraft}
            accessibilityRole="button"
            accessibilityLabel="Discard challenge draft"
          >
            <Ionicons name="trash" size={24} color="red" />
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Challenge Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          autoCorrect={false}
        />

        {/* ---------------- DIFFICULTY ---------------- */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Difficulty</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <View style={styles.wrapContainer}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, difficulty === d && styles.chipSelected]}
              onPress={() => setDifficulty(d as "Easy" | "Medium" | "Hard")}
            >
              <Text
                style={[
                  styles.chipText,
                  difficulty === d && { color: Colors.palette.darkest },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------------- FILTERS ---------------- */}
        <View style={[styles.labelRow, { marginTop: 6 }]}>
          <Text style={styles.label}>Tags</Text>
          <Text style={styles.optional}>(Select at least 1)</Text>
        </View>

        {/* Time Limit Accordion */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => toggleSection("timeLimit")}
        >
          <View style={styles.accordionTitleRow}>
            <Ionicons name="timer" size={20} color={Colors.palette.dark} />
            <Text style={styles.accordionTitle}>Time Limit</Text>
          </View>
          <Ionicons
            name={
              expandedSection === "timeLimit" ? "chevron-up" : "chevron-down"
            }
            size={20}
            color={Colors.palette.dark}
          />
        </TouchableOpacity>
        {expandedSection === "timeLimit" && (
          <View style={styles.accordionContent}>
            {!isCustomTime ? (
              <>
                <View style={styles.wrapContainer}>
                  {TIME_OPTIONS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chip,
                        timeLimit === t && styles.chipSelected,
                      ]}
                      onPress={() => setTimeLimit(t)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          timeLimit === t && { color: Colors.palette.darkest },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Show custom time options as chips too */}
                  {customTimeOptions.map((customTime) => (
                    <TouchableOpacity
                      key={customTime}
                      style={[
                        styles.chip,
                        timeLimit === customTime && styles.chipSelected,
                      ]}
                      onPress={() => setTimeLimit(customTime)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          timeLimit === customTime && {
                            color: Colors.palette.darkest,
                          },
                        ]}
                      >
                        {customTime}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => setIsCustomTime(true)}
                  style={styles.customButton}
                >
                  <Text style={styles.customButtonText}>+ Custom Time</Text>
                </TouchableOpacity>
                {timeLimit && (
                  <Text style={styles.selectedText}>Selected: {timeLimit}</Text>
                )}
                {!timeLimit && (
                  <Text
                    style={[
                      styles.selectedText,
                      { color: Colors.palette.dark, fontStyle: "italic" },
                    ]}
                  >
                    None selected
                  </Text>
                )}
              </>
            ) : (
              <View>
                <Text style={styles.smallLabel}>Enter Custom Time</Text>
                <View style={styles.customTimeRow}>
                  <TextInput
                    placeholder="Value"
                    placeholderTextColor="#888"
                    value={customTimeValue}
                    onChangeText={setCustomTimeValue}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                    autoCorrect={false}
                  />
                  <View style={styles.unitPicker}>
                    {TIME_UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitOption,
                          customTimeUnit === unit && styles.unitOptionSelected,
                        ]}
                        onPress={() => setCustomTimeUnit(unit)}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            customTimeUnit === unit && {
                              color: Colors.palette.darkest,
                            },
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.customTimeButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomTime(false);
                      setCustomTimeValue("");
                    }}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={applyCustomTime}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Ingredients Accordion */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => toggleSection("ingredients")}
        >
          <View style={styles.accordionTitleRow}>
            <MaterialCommunityIcons
              name="food-apple"
              size={20}
              color={Colors.palette.dark}
            />
            <Text style={styles.accordionTitle}>Ingredients</Text>
          </View>
          <Ionicons
            name={
              expandedSection === "ingredients" ? "chevron-up" : "chevron-down"
            }
            size={20}
            color={Colors.palette.dark}
          />
        </TouchableOpacity>
        {expandedSection === "ingredients" && (
          <View style={styles.accordionContent}>
            <View style={styles.ingredientInputRow}>
              <TextInput
                placeholder="Add ingredient"
                placeholderTextColor="#888"
                value={newIngredient}
                onChangeText={setNewIngredient}
                style={styles.ingredientInput}
                onSubmitEditing={addIngredient}
                autoCorrect={false}
              />
              <TouchableOpacity onPress={addIngredient}>
                <Ionicons
                  name="add-circle"
                  size={32}
                  color={Colors.palette.blue}
                />
              </TouchableOpacity>
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
            {ingredients.length === 0 && (
              <Text
                style={[
                  styles.selectedText,
                  { color: Colors.palette.dark, fontStyle: "italic" },
                ]}
              >
                None added
              </Text>
            )}
          </View>
        )}

        {/* Dietary Restrictions Accordion */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => toggleSection("dietary")}
        >
          <View style={styles.accordionTitleRow}>
            <MaterialCommunityIcons
              name="leaf"
              size={20}
              color={Colors.palette.dark}
            />
            <Text style={styles.accordionTitle}>Dietary Restrictions</Text>
          </View>
          <Ionicons
            name={expandedSection === "dietary" ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.palette.dark}
          />
        </TouchableOpacity>
        {expandedSection === "dietary" && (
          <View style={styles.accordionContent}>
            {!isCustomDietary ? (
              <>
                <View style={styles.wrapContainer}>
                  {DIETARY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.chip,
                        dietaryRestrictions.includes(option) &&
                          styles.chipSelected,
                      ]}
                      onPress={() => toggleDietaryRestriction(option)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          dietaryRestrictions.includes(option) && {
                            color: Colors.palette.darkest,
                          },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Show custom dietary restrictions as chips too */}
                  {dietaryRestrictions
                    .filter((item) => !DIETARY_OPTIONS.includes(item))
                    .map((customItem) => (
                      <TouchableOpacity
                        key={customItem}
                        style={[styles.chip, styles.chipSelected]}
                        onPress={() => toggleDietaryRestriction(customItem)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: Colors.palette.darkest },
                          ]}
                        >
                          {customItem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                  onPress={() => setIsCustomDietary(true)}
                  style={styles.customButton}
                >
                  <Text style={styles.customButtonText}>
                    + Custom Restriction
                  </Text>
                </TouchableOpacity>
                {dietaryRestrictions.length > 0 ? (
                  <Text style={styles.selectedText}>
                    Selected: {dietaryRestrictions.join(", ")}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.selectedText,
                      { color: Colors.palette.dark, fontStyle: "italic" },
                    ]}
                  >
                    None selected
                  </Text>
                )}
              </>
            ) : (
              <View>
                <Text style={styles.smallLabel}>
                  Enter Custom Dietary Restriction
                </Text>
                <TextInput
                  placeholder="e.g. Nut-Free, Dairy-Free, Low-Carb"
                  placeholderTextColor="#888"
                  value={customDietary}
                  onChangeText={setCustomDietary}
                  style={[styles.input, { marginBottom: 12 }]}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <View style={styles.customTimeButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomDietary(false);
                      setCustomDietary("");
                    }}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={applyCustomDietary}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ---------------- IMAGE ---------------- */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Image</Text>
          <Text style={styles.optional}>(Optional)</Text>
        </View>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          <Image
            source={
              imageUri && imageUri !== "null"
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
        <View style={styles.labelRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <TextInput
          placeholder="Write a description for your challenge"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 100 }]}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          blurOnSubmit={true}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </ScrollView>

      {/* ---------------- FOOTER BUTTONS ---------------- */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={saveChallenge}
          style={styles.saveButton}
          disabled={isPosting}
        >
          <Text style={styles.saveButtonText}>SAVE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={postChallenge}
          style={[styles.postButton, isPosting && { opacity: 0.6 }]}
          disabled={isPosting}
        >
          {isPosting ? (
            <ActivityIndicator color={Colors.palette.darkest} size="small" />
          ) : (
            <Text style={styles.postButtonText}>POST</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.palette.light,
    paddingHorizontal: 20,
  },
  titleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
    color: Colors.palette.dark,
  },
  required: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d33",
    marginLeft: 4,
  },
  optional: {
    fontSize: 13,
    fontWeight: "400",
    color: Colors.palette.dark,
    marginLeft: 6,
    fontStyle: "italic",
  },
  smallLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.palette.dark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "white",
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
    backgroundColor: Colors.palette.lightest,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
    marginRight: 10,
    marginBottom: 10,
  },
  chipSelected: {
    backgroundColor: Colors.palette.accent,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
  },
  chipText: {
    color: Colors.palette.darkest,
    fontSize: 14,
    fontWeight: "500",
  },
  // Accordion styles
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
    color: Colors.palette.darkest,
  },
  accordionContent: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
  },
  selectedText: {
    fontSize: 14,
    color: Colors.palette.dark,
    marginTop: 8,
  },
  customButton: {
    marginTop: 8,
    padding: 10,
    alignItems: "center",
  },
  customButtonText: {
    color: Colors.palette.blue,
    fontSize: 14,
    fontWeight: "600",
  },
  customTimeRow: {
    flexDirection: "row",
    //alignItems: "center",
    marginBottom: 12,
  },
  unitPicker: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  unitOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.palette.lightest,
  },
  unitOptionSelected: {
    backgroundColor: Colors.palette.accent,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.palette.darkest,
  },
  customTimeButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.palette.dark,
    fontSize: 14,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.palette.blue,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
    alignItems: "center",
  },
  applyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Ingredients
  ingredientInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ingredientInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.palette.darkest,
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
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 16,
    marginHorizontal: 12,
  },
  // Image
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
  // Footer Buttons
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.palette.darkest,
    letterSpacing: 1,
  },
  postButton: {
    flex: 1,
    backgroundColor: Colors.palette.blue,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  postButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.palette.lightest,
    letterSpacing: 1,
  },
});
