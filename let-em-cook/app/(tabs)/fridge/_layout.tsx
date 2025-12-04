import { Stack } from "expo-router";
import Colors from "../../../constants/Colors";

export default function FridgeLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors.palette.blue,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Fridge",
          headerShown: false, // Let the tab handle the header
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="customize"
        options={{
          title: "",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
