import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) { setError("Enter email and password"); return; }
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image
        source="https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&w=940"
        style={styles.hero}
        contentFit="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(28,27,26,0.55)", "rgba(28,27,26,0.95)"]}
        style={styles.scrim}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <View style={styles.logoDot}><Ionicons name="ticket" size={22} color={theme.colors.onBrandPrimary} /></View>
              <Text style={styles.brand}>EventHub</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Discover events, get tickets, connect with people.</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Password</Text>
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Your password"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                testID="login-submit-button"
                style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
                onPress={onSubmit}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
                  <Text style={styles.primaryBtnText}>Sign in</Text>}
              </TouchableOpacity>

              <View style={styles.divider} />
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity testID="go-to-signup-button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Create a new account</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.demo} testID="demo-credentials">
              <Text style={styles.demoTitle}>Demo accounts</Text>
              <Text style={styles.demoText}>Admin: admin@eventhub.app / Admin@12345</Text>
              <Text style={styles.demoText}>Organizer: organizer@eventhub.app / Organizer@12345</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceInverse },
  hero: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  brand: { color: theme.colors.onSurfaceInverse, fontSize: 22, fontWeight: "700", letterSpacing: 0.2 },
  title: { color: theme.colors.onSurfaceInverse, fontSize: 32, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#DDD9D2", fontSize: 16, marginBottom: theme.spacing.xl, lineHeight: 22 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.xl, ...theme.shadow.card,
  },
  label: { color: theme.colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  error: { color: theme.colors.error, marginTop: theme.spacing.md, fontSize: 13 },
  primaryBtn: {
    marginTop: theme.spacing.xl, backgroundColor: theme.colors.brand,
    paddingVertical: 16, borderRadius: theme.radius.md, alignItems: "center",
  },
  primaryBtnText: { color: theme.colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.lg },
  secondaryBtn: { alignItems: "center", paddingVertical: 12 },
  secondaryBtnText: { color: theme.colors.brand, fontSize: 15, fontWeight: "600" },
  demo: {
    marginTop: theme.spacing.lg, backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: theme.radius.md, padding: theme.spacing.md,
  },
  demoTitle: { color: theme.colors.onSurfaceInverse, fontWeight: "700", marginBottom: 4 },
  demoText: { color: "#DDD9D2", fontSize: 12 },
});
