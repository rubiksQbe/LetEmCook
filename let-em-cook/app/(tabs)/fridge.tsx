import Colors from "@/constants/Colors";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FridgeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Page Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Fridge</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>Manage your fridge items here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.palette.accent,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 1,
    paddingBottom: 14,
    backgroundColor: Colors.palette.accent,
  },
  pageTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 34,
    color: Colors.palette.darkest,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.palette.lightest,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.palette.dark,
    fontFamily: "Poppins_400Regular",
  },
});
