import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/auth";
import { theme } from "@/src/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;

  const isOrganizer = user.role === "organizer" || user.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.onSurfaceSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + (Platform.OS === "android" ? 6 : 4),
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          href: isOrganizer ? "/(tabs)/create" : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 6} color={theme.colors.brand} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
});
