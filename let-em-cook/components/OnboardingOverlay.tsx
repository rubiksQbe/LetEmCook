import Colors from "@/constants/Colors";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const onboardingContent = {
  challenges: {
    title: "Challenges Page",
    description:
      "Browse all available cooking challenges! Use filters to sort challenges by difficulty, time, ingredients, and/or dietary restrictions. Tap any challenge to view more details.",
    highlightPosition: null, // No specific highlight needed
  },
  "challenge-detail": {
    title: "Challenge Details",
    description:
      "Here, you can view the specifics of a given challenge, pin it to your fridge, share with friends, and when you're ready, submit your own entry!",
    highlightPosition: null, // No specific highlight needed
  },
  "challenge-detail-submissions": {
    title: "Community Submissions",
    description:
      "You can also see what the community has created and vote on your favorite submissions!",
    highlightPosition: null, // No specific highlight needed
  },
  fridge: {
    title: "Fridge Page",
    description:
      "Your pinned challenge appears here in the freezer section. Past submissions are saved in your history below. If you tap your mouse companion, you can customize them!",
    highlightPosition: null, // No specific highlight needed
  },
  mouse: {
    title: "Your Companion",
    description:
      "Personalize your cooking companion! Unlock accessories by completing challenges. Choose hats and items to make your mouse unique.",
    highlightPosition: null, // No specific highlight needed
  },
  friends: {
    title: "Friends Page",
    description:
      "Here you can add friends and see what challenges they're working on (and their personalized mouse companions!). Press and hold on a friend to remove them.",
    highlightPosition: null, // No specific highlight needed
  },
};

export function OnboardingOverlay() {
  const { isOnboarding, currentStep, nextStep, previousStep, completeOnboarding, skipOnboarding } =
    useOnboarding();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  // Always use a specific challenge for onboarding
  const exampleChallengeId = "da1a919f-bf8e-412f-a239-d7bd47f5b9cb";

  useEffect(() => {
    if (isOnboarding) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnboarding, fadeAnim]);

  useEffect(() => {
    if (!isOnboarding) return;

    // Navigate to the appropriate screen based on current step
    const navigateToStep = async () => {
      switch (currentStep) {
        case "challenges":
          router.replace("/(tabs)/challenges");
          break;
        case "challenge-detail":
          // Navigate to the "Cooking on a Budget" challenge
          router.push({
            pathname: "/(tabs)/challenges/[id]",
            params: { id: exampleChallengeId },
          });
          break;
        case "challenge-detail-submissions":
          // Stay on the same challenge detail page, but scroll to submissions
          // We'll use a small delay to ensure the page is loaded, then scroll
          // The challenge detail page will handle scrolling via a query param or context
          break;
        case "fridge":
          router.replace("/(tabs)/fridge");
          break;
        case "mouse":
          router.push("/(tabs)/fridge/customize");
          break;
        case "friends":
          router.replace("/(tabs)/friends");
          break;
        case "complete":
          completeOnboarding();
          break;
      }
    };

    // Small delay to ensure navigation completes
    const timer = setTimeout(navigateToStep, 100);
    return () => clearTimeout(timer);
  }, [currentStep, isOnboarding, completeOnboarding, exampleChallengeId]);

  if (!isOnboarding || currentStep === "complete") {
    return null;
  }

  const content = onboardingContent[currentStep];
  if (!content) return null;

  const isLastStep = currentStep === "friends";
  const isFirstStep = currentStep === "challenges";

  return (
    <Modal
      visible={isOnboarding}
      transparent={true}
      animationType="none"
      onRequestClose={skipOnboarding}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Content Card */}
        <View style={styles.contentCard}>
          <View style={styles.contentWrapper}>
            <View style={styles.header}>
              <Text style={styles.stepIndicator}>
                {Object.keys(onboardingContent).indexOf(currentStep) + 1} /{" "}
                {Object.keys(onboardingContent).length}
              </Text>
              <Text style={styles.title}>{content.title}</Text>
              <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{content.description}</Text>

            <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.backButton,
                isFirstStep && styles.backButtonDisabled,
              ]}
              onPress={previousStep}
              activeOpacity={0.8}
              disabled={isFirstStep}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            {!isLastStep ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={nextStep}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  completeOnboarding();
                  router.replace("/(tabs)/challenges");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.completeButtonText}>Get Started!</Text>
              </TouchableOpacity>
            )}
          </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  contentCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 0,
    height: 290,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  contentWrapper: {
    padding: 24,
    paddingBottom: 24,
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    height: 32,
    minHeight: 32,
  },
  stepIndicator: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.palette.dark,
    flex: 0,
    minWidth: 40,
    lineHeight: 32,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  skipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.palette.blue,
    textDecorationLine: "underline",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.palette.darkest,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
    lineHeight: 32,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.palette.dark,
    lineHeight: 24,
    marginBottom: 16,
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: "auto",
    paddingTop: 8,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.lightest,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonDisabled: {
    opacity: 0.3,
  },
  backButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.lightest,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.palette.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.palette.darkest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.palette.darkest,
  },
});

