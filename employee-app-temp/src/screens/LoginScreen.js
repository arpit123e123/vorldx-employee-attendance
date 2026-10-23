import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginEmployee } from "../services/authService";
import api from "../services/api";
import CaptchaChallenge from "../components/CaptchaChallenge";

const C = {
  green: "#079B70",
  greenDark: "#087F5B",
  bg: "#F5F7F8",
  white: "#FFFFFF",
  text: "#18212B",
  muted: "#7A8491",
  line: "#E8ECEF",
  red: "#D93645",
};

export default function LoginScreen({ onLoginSuccess }) {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaConfig, setCaptchaConfig] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get("/auth/captcha-config")
      .then((response) => {
        if (!cancelled && response.data?.success) {
          setCaptchaConfig(response.data.data);
        } else if (!cancelled) {
          setCaptchaConfig({ enabled: true, error: true });
        }
      })
      .catch(() => {
        if (!cancelled) setCaptchaConfig({ enabled: true, error: true });
      });
    return () => { cancelled = true; };
  }, []);

  async function handleLogin() {
    if (!captchaConfig) {
      setError("The security check is loading. Please try again shortly.");
      return;
    }
    if (captchaConfig.error || (captchaConfig.enabled && !captchaToken)) {
      setError("Please complete the CAPTCHA security check first.");
      return;
    }
    if (!employeeId.trim() || !password) {
      setError("Enter both your employee ID and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const user = await loginEmployee(employeeId, password, captchaToken);
      onLoginSuccess(user);
    } catch (err) {
      const status = err.response?.status;

      if (!err.response) {
        setError(
          "Could not connect to the server. Check the API URL and backend service."
        );
      } else if (status === 401) {
        setError("The employee ID or password is incorrect.");
      } else if (status === 403) {
        setError(err.response?.data?.message || "This account is inactive.");
      } else {
        setError(
          err.response?.data?.message || err.message || "Login failed."
        );
      }
    } finally {
      setLoading(false);
      setCaptchaToken("");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>

          <Text style={styles.brand}>VorldX</Text>
          <Text style={styles.subtitle}>Employee Attendance System</Text>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.description}>
              Sign in with your employee credentials.
            </Text>

            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              value={employeeId}
              onChangeText={setEmployeeId}
              placeholder="Enter your employee ID"
              placeholderTextColor="#9AA3AD"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9AA3AD"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={styles.input}
            />

            {captchaConfig?.enabled && captchaConfig.siteKey && (
              <CaptchaChallenge
                siteKey={captchaConfig.siteKey}
                hostname={captchaConfig.hostnames?.[0]}
                action="login"
                onToken={setCaptchaToken}
              />
            )}

            {captchaConfig?.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>The security check could not be loaded. Restart the app and try again.</Text>
              </View>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || !captchaConfig || captchaConfig.error || (captchaConfig.enabled && !captchaToken)}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footer}>
              Secure employee access
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 35,
  },
  logo: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: C.green,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: {
    color: C.white,
    fontSize: 34,
    fontWeight: "800",
  },
  brand: {
    textAlign: "center",
    color: C.text,
    fontSize: 29,
    fontWeight: "800",
  },
  subtitle: {
    textAlign: "center",
    color: C.muted,
    marginTop: 5,
    marginBottom: 30,
    fontSize: 13,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: C.line,
  },
  title: {
    color: C.text,
    fontSize: 23,
    fontWeight: "800",
  },
  description: {
    color: C.muted,
    fontSize: 13,
    marginTop: 7,
    marginBottom: 25,
  },
  label: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    height: 49,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#FAFBFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: "#FFF0F1",
    borderRadius: 10,
    padding: 11,
    marginBottom: 14,
  },
  errorText: {
    color: C.red,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    minHeight: 50,
    backgroundColor: C.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    marginTop: 19,
  },
});
