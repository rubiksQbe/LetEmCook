import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";

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
  return (
    <Tabs
      initialRouteName="challenges"
      screenOptions={{
        headerTitleAlign: "center",
        tabBarActiveTintColor: Colors.palette.darkest,
        tabBarInactiveTintColor: Colors.palette.darkest,
        tabBarIconStyle: { marginTop: 7, aspectRatio: 1 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Poppins_500Medium",
        },
        tabBarItemStyle: {
          flex: 1,
        },
        // Blur effect for tab bar
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          position: "absolute",
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            tint="light"
            intensity={80}
            style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.3)" }}
          />
        ),
      }}
    >
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
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
    marginBottom: 1,
  },
});
