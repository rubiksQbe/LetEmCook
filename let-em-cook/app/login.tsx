import Colors from "@/constants/Colors";
import { signInWithUsername } from "@/lib/supabase";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!username || !password) {
      Alert.alert("Missing fields", "Enter a username and password.");
      return;
    }
    setLoading(true);
    const { error } = await signInWithUsername(username.trim(), password);
    setLoading(false);
    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes("Invalid login credentials") || 
          error.message.includes("Email not confirmed") ||
          error.message.includes("User not found")) {
        errorMessage = "Invalid username or password. Please check your credentials and try again.";
      }
      Alert.alert("Sign in failed", errorMessage);
    } else {
      router.replace("/(tabs)/challenges");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={Colors.palette.blue} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Login</Text>

        {/* Username Field */}
        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <FontAwesome
              name="user"
              size={20}
              color={Colors.palette.darkest}
            />
            <Text style={styles.label}>Username</Text>
          </View>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your username"
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>

        {/* Password Field */}
        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons
              name="lock"
              size={20}
              color={Colors.palette.darkest}
            />
            <Text style={styles.label}>Password</Text>
          </View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor="#999"
            style={styles.input}
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </Text>
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f4fb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f4fb",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "center",
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 32,
    color: Colors.palette.blue,
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
    marginLeft: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: Colors.palette.blue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.palette.darkest,
  },
  loginButton: {
    backgroundColor: Colors.palette.accent,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.palette.darkest,
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

