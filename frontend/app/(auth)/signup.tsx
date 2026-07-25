import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "organizer">("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password || !name) { setError("All fields are required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await signup(email.trim().toLowerCase(), password, name.trim(), role);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.detail || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="signup-back-button">
            <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join EventHub to discover, book, and host events.</Text>

          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              testID="role-user-chip"
              onPress={() => setRole("user")}
              style={[styles.chip, role === "user" && styles.chipActive]}
            >
              <Ionicons name="person-outline" size={16} color={role === "user" ? theme.colors.onBrandPrimary : theme.colors.onSurface} />
              <Text style={[styles.chipText, role === "user" && styles.chipTextActive]}>Attendee</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="role-organizer-chip"
              onPress={() => setRole("organizer")}
              style={[styles.chip, role === "organizer" && styles.chipActive]}
            >
              <Ionicons name="megaphone-outline" size={16} color={role === "organizer" ? theme.colors.onBrandPrimary : theme.colors.onSurface} />
              <Text style={[styles.chipText, role === "organizer" && styles.chipTextActive]}>Organizer</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>Name</Text>
          <TextInput
            testID="signup-name-input"
            value={name} onChangeText={setName}
            placeholder="Your full name" placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Email</Text>
          <TextInput
            testID="signup-email-input"
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
            placeholder="you@example.com" placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Password</Text>
          <TextInput
            testID="signup-password-input"
            value={password} onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters" placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            testID="signup-submit-button"
            style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
            onPress={onSubmit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
              <Text style={styles.primaryBtnText}>Create account</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.secondaryBtn} testID="go-to-login-button">
              <Text style={styles.secondaryBtnText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8, marginBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.onSurface, marginBottom: 6 },
  subtitle: { fontSize: 15, color: theme.colors.onSurfaceSecondary, marginBottom: theme.spacing.xl, lineHeight: 22 },
  label: { color: theme.colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  roleRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.onSurface, fontWeight: "600" },
  chipTextActive: { color: theme.colors.onBrandPrimary },
  error: { color: theme.colors.error, marginTop: theme.spacing.md },
  primaryBtn: {
    marginTop: theme.spacing.xl, backgroundColor: theme.colors.brand,
    paddingVertical: 16, borderRadius: theme.radius.md, alignItems: "center",
  },
  primaryBtnText: { color: theme.colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  secondaryBtn: { alignItems: "center", paddingVertical: 16, marginTop: theme.spacing.sm },
  secondaryBtnText: { color: theme.colors.brand, fontSize: 15, fontWeight: "600" },
});
