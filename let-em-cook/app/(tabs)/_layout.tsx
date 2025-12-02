import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// Custom TabBarIcon component that uses images
function TabBarIcon({
  focused,
  iconName,
}: {
  focused: boolean;
  iconName: "challenges" | "friends" | "fridge";
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
  };

  const iconSource = focused
    ? iconMap[iconName].selected
    : iconMap[iconName].default;

  return (
    <Image source={iconSource} style={styles.tabIcon} resizeMode="contain" />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="challenges"
      screenOptions={{
        headerTitleAlign: "center",
        tabBarActiveTintColor: Colors.palette.darkest,
        tabBarInactiveTintColor: "#676767ff",
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        tabBarIconStyle: { marginTop: 7 },
        tabBarLabelStyle: {
          fontSize: 14,
          fontFamily: "Poppins_600SemiBold",
        },
        // tabBarStyle: {
        //   borderTopWidth: 0,
        //   backgroundColor:
        //     colorScheme === "dark" ? Colors.palette.lightest : undefined,
        // },
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
    marginBottom: -3,
  },
});
