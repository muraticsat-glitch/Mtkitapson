import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      initialRouteName="reading"
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen name="reading" options={{ title: "Okuyorum", tabBarIcon: ({ color }) => <Ionicons size={25} name="book" color={color} /> }} />
      <Tabs.Screen name="index" options={{ title: "Kitaplık", tabBarIcon: ({ color }) => <Ionicons size={25} name="book-outline" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: "Geçmiş", tabBarIcon: ({ color }) => <Ionicons size={25} name="time-outline" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Ayarlar", tabBarIcon: ({ color }) => <Ionicons size={25} name="options-outline" color={color} /> }} />
    </Tabs>
  );
}
