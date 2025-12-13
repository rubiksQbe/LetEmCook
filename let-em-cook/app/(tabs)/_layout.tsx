import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import Colors from "@/constants/Colors";
import { useOnboarding } from "@/contexts/OnboardingContext";

// Custom TabBarIcon component that uses images
function TabBarIcon({
  focused,
  iconName,
}: {
  focused: boolean;
  iconName: "challenges" | "friends" | "fridge" | "settings";
}) {
  const iconMap = {
    challenges: {
      default: require("@/assets/images/spoon-and-fork.png"),
      selected: require("@/assets/images/spoon-and-fork (1).png"),
    },
    friends: {
      default: require("@/assets/images/friends.png"),
      selected: require("@/assets/images/friends (1).png"),
    },
    fridge: {
      default: require("@/assets/images/fridge.png"),
      selected: require("@/assets/images/fridge (1).png"),
    },
    settings: {
      default: require("@/assets/images/settings.png"),
      selected: require("@/assets/images/settings (1).png"),
    },
  };

  const iconSource = focused
    ? iconMap[iconName].selected
    : iconMap[iconName].default;

  return (
    <Image source={iconSource} style={styles.tabIcon} resizeMode="contain" />
  );
}

export default function TabLayout() {
  const { isOnboarding } = useOnboarding();

  return (
    <>
      <Tabs
        initialRouteName="challenges"
        screenOptions={{
          headerTitleAlign: "center",
          tabBarActiveTintColor: Colors.palette.darkest,
          tabBarInactiveTintColor: Colors.palette.darkest,
          tabBarItemStyle: {
            flex: 1,
          },
          // Off-white background for tab bar, blank white during onboarding
          tabBarStyle: {
            backgroundColor: isOnboarding ? "#FFFFFF" : "#FAFAFA",
            borderTopWidth: 0,
            position: "absolute",
            elevation: 0,
            paddingHorizontal: 10,
          },
          // Hide tab bar content during onboarding
          tabBarIconStyle: isOnboarding
            ? { display: "none" }
            : { marginTop: 7, aspectRatio: 1 },
          tabBarLabelStyle: isOnboarding
            ? { display: "none" }
            : {
                fontSize: 12,
                fontFamily: "Poppins_500Medium",
              },
        }}
      >
        <Tabs.Screen
          name="challenges"
          options={{
            title: "Challenges",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabBarIcon focused={focused} iconName="challenges" />
            ),
          }}
        />
        <Tabs.Screen
          name="fridge"
          options={{
            title: "Fridge",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabBarIcon focused={focused} iconName="fridge" />
            ),
            tabBarItemStyle: {
              flex: 1,
              marginLeft: 4,
            },
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabBarIcon focused={focused} iconName="friends" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabBarIcon focused={focused} iconName="settings" />
            ),
          }}
        />
      </Tabs>
      <OnboardingOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
    marginBottom: 1,
  },
});
