import Colors from "@/constants/Colors";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { signUpWithUsername } from "@/lib/supabase";
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

export default function SignUpScreen() {
  const { startOnboarding } = useOnboarding();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!username || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please make sure your passwords match.");
      return;
    }

    setLoading(true);
    const { error } = await signUpWithUsername(username.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      // Navigate to challenges and start onboarding immediately
      router.replace("/(tabs)/challenges");
      // Small delay to ensure navigation completes, then start onboarding
      setTimeout(() => {
        startOnboarding();
      }, 100);
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
          <Text style={styles.title}>Sign Up</Text>

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
            passwordRules=""
          />
        </View>

        {/* Confirm Password Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.confirmLabel}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter your password"
            placeholderTextColor="#999"
            style={styles.input}
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
            passwordRules=""
          />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signupButton, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.signupButtonText}>
            {loading ? "SIGNING UP..." : "SIGN UP"}
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
  confirmLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.palette.dark,
    marginBottom: 8,
    marginLeft: 4,
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
  signupButton: {
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
  signupButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.palette.darkest,
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

