import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type OnboardingStep =
  | "challenges"
  | "challenge-detail"
  | "challenge-detail-submissions"
  | "fridge"
  | "mouse"
  | "friends"
  | "complete";

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: OnboardingStep;
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

const ONBOARDING_KEY_PREFIX = "onboarding_completed_";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("challenges");
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check if user has completed onboarding on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsCheckingOnboarding(false);
          return;
        }

        const key = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        const completed = await AsyncStorage.getItem(key);
        setIsCheckingOnboarding(false);
        
        // Only start onboarding if user hasn't completed it
        if (!completed) {
          setIsOnboarding(true);
          setCurrentStep("challenges");
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const startOnboarding = useCallback(() => {
    setIsOnboarding(true);
    setCurrentStep("challenges");
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const steps: OnboardingStep[] = [
        "challenges",
        "challenge-detail",
        "challenge-detail-submissions",
        "fridge",
        "mouse",
        "friends",
        "complete",
      ];
      const currentIndex = steps.indexOf(prev);
      if (currentIndex < steps.length - 1) {
        return steps[currentIndex + 1];
      }
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => {
      const steps: OnboardingStep[] = [
        "challenges",
        "challenge-detail",
        "challenge-detail-submissions",
        "fridge",
        "mouse",
        "friends",
        "complete",
      ];
      const currentIndex = steps.indexOf(prev);
      if (currentIndex > 0) {
        return steps[currentIndex - 1];
      }
      return prev;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const key = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        await AsyncStorage.setItem(key, "true");
      }
    } catch (error) {
      console.error("Error saving onboarding completion:", error);
    }
    setIsOnboarding(false);
    setCurrentStep("complete");
  }, []);

  const skipOnboarding = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const key = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        await AsyncStorage.setItem(key, "true");
      }
    } catch (error) {
      console.error("Error saving onboarding skip:", error);
    }
    setIsOnboarding(false);
    setCurrentStep("complete");
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        startOnboarding,
        nextStep,
        previousStep,
        completeOnboarding,
        skipOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
