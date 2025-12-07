import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Base mouse ---
const baseMouse = require("@/assets/images/mouse-assets/defaultmouse.png");

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

// --- Default options ---
const defaultHats = [
  { id: "none", img: null },
  { id: "gamerhat.png", img: hatImages["gamerhat.png"] },
  { id: "jester.png", img: hatImages["jester.png"] },
  { id: "chef.png", img: hatImages["chef.png"] },
];

const defaultItems = [
  { id: "none", img: null },
  { id: "wand.png", img: itemImages["wand.png"] },
  { id: "spatula.png", img: itemImages["spatula.png"] },
  { id: "SNES_controller.svg.png", img: itemImages["SNES_controller.svg.png"] },
];

export default function CustomizeMouse() {
  const [selectedHat, setSelectedHat] = useState("none");
  const [selectedItem, setSelectedItem] = useState("none");
  const [originalHat, setOriginalHat] = useState("none");
  const [originalItem, setOriginalItem] = useState("none");
  const [hatOptions, setHatOptions] = useState(defaultHats);
  const [itemOptions, setItemOptions] = useState(defaultItems);
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  const router = useRouter();

  // Check if any changes have been made
  const hasChanges =
    selectedHat !== originalHat || selectedItem !== originalItem;

  // --- Get current user ID ---

  // --- Load user accessories and equipped items ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      setUserId(user.id);

      const loadData = async () => {
        try {
          // Fetch user accessories
          const { data: accessoryData } = await supabase
            .from("pal-accessory")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (accessoryData) {
            const userHats = (accessoryData.allHats || [])
              .map((name: string) => ({ id: name, img: hatImages[name] }))
              .filter((h: { id: string; img: any }) => h.img);

            const userItems = (accessoryData.allItems || [])
              .map((name: string) => ({ id: name, img: itemImages[name] }))
              .filter((i: { id: string; img: any }) => i.img);

            setHatOptions([...defaultHats, ...userHats]);
            setItemOptions([...defaultItems, ...userItems]);

            // Equip the current hat/item
            const currentHat = accessoryData.hat ?? "none";
            const currentItem = accessoryData.item ?? "none";
            setSelectedHat(currentHat);
            setSelectedItem(currentItem);
            setOriginalHat(currentHat);
            setOriginalItem(currentItem);
          }
        } catch (err) {
          console.error("Error loading accessories:", err);
        } finally {
          setIsReady(true);
        }
      };

      loadData();
    });
  }, []);

  // --- Conditional positions ---
  const hatPosition = (id: string) => {
    switch (id) {
      case "gamerhat.png":
        return { top: 14, right: 73, width: 65, height: 65 };
      case "party_hat.png":
        return { top: -15, right: 60, width: 90, height: 90 };
      case "chef.png":
        return { top: -10, right: 60, width: 90, height: 90 };
      case "jester.png":
        return { top: -15, right: 48, width: 110, height: 110 };
      default:
        return { top: -10, right: 60, width: 90, height: 90 };
    }
  };

  const itemPosition = (id: string) => {
    switch (id) {
      case "SNES_controller.svg.png":
        return { bottom: 50, right: -10, width: 75, height: 75 };
      case "spatula.png":
        return { bottom: 70, right: 3, width: 70, height: 70 };
      case "wand.png":
        return { bottom: 80, right: 3, width: 70, height: 70 };
      case "balloon.png":
        return { bottom: 80, right: 20, width: 80, height: 80 };
      default:
        return { bottom: 70, right: 3, width: 70, height: 70 };
    }
  };

  if (!isReady) return null; // render nothing until user data is loaded

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(tabs)/fridge")}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.palette.darkest} />
      </TouchableOpacity>

      {/* SAVE BUTTON - only show when changes have been made */}
      {hasChanges && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            if (!userId) return;

            try {
              const { error: accessoryError } = await supabase
                .from("pal-accessory")
                .upsert(
                  {
                    user_id: userId,
                    hat: selectedHat,
                    item: selectedItem,
                  },
                  {
                    onConflict: "user_id",
                  }
                );

              if (accessoryError) {
                console.error("Accessory update failed:", accessoryError);
                return;
              }

              router.push("/(tabs)/fridge");
            } catch (err) {
              console.error("Unexpected error:", err);
            }
          }}
        >
          <Ionicons
            name="checkmark-sharp"
            size={24}
            color={Colors.palette.darkest}
          />
        </TouchableOpacity>
      )}

      {/* MAIN CONTENT */}
      <View style={styles.container}>
        {/* Top light section */}
        <View style={styles.topHalf}>
          <View style={styles.mouseWrapper}>
            <Image source={baseMouse} style={styles.mouseImage} />

            {selectedHat !== "none" && (
              <Image
                source={
                  hatOptions.find((h) => h.id === selectedHat)?.img ?? null
                }
                style={[styles.hatOverlay, hatPosition(selectedHat)]}
                resizeMode="contain"
              />
            )}

            {selectedItem !== "none" && (
              <Image
                source={
                  itemOptions.find((i) => i.id === selectedItem)?.img ?? null
                }
                style={[styles.itemOverlay, itemPosition(selectedItem)]}
                resizeMode="contain"
              />
            )}
          </View>
        </View>

        {/* Bottom blue fridge section */}
        <View style={styles.bottomHalf}>
          {/* Hats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a Hat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {hatOptions.map((hat) => (
                <TouchableOpacity
                  key={hat.id}
                  onPress={() => setSelectedHat(hat.id)}
                  style={[
                    styles.optionWrapper,
                    selectedHat === hat.id && styles.selectedOption,
                  ]}
                >
                  {hat.img ? (
                    <Image source={hat.img} style={styles.optionImage} />
                  ) : (
                    <Text>None</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose an Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {itemOptions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItem(item.id)}
                  style={[
                    styles.optionWrapper,
                    selectedItem === item.id && styles.selectedOption,
                  ]}
                >
                  {item.img ? (
                    <Image source={item.img} style={styles.optionImage} />
                  ) : (
                    <Text>None</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.palette.light },
  backButton: {
    position: "absolute",
    top: 70,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  saveButton: {
    position: "absolute",
    top: 70,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.palette.accent, // Yellow
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  container: { flex: 1 },
  topHalf: {
    flex: 3,
    backgroundColor: Colors.palette.light,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomHalf: {
    flex: 4,
    backgroundColor: Colors.palette.blue,
    paddingTop: 20,
    borderTopWidth: 5,
    borderColor: Colors.palette.darkest,
  },
  mouseWrapper: {
    width: 200,
    height: 200,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -160,
  },
  mouseImage: {
    width: 200,
    height: 200,
    transform: [{ rotate: "-3deg" }],
  },
  hatOverlay: { position: "absolute" },
  itemOverlay: { position: "absolute" },
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.palette.lightest,
    marginBottom: 10,
  },
  optionWrapper: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: Colors.palette.lightest,
    justifyContent: "center",
    alignItems: "center",
  },
  optionImage: { width: 70, height: 70, resizeMode: "contain" },
  selectedOption: { borderWidth: 5, borderColor: Colors.palette.accent },
});
