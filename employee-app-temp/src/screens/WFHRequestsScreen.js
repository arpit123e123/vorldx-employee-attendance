import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getMyWfhRequests, submitWfhRequest } from "../services/wfhService";

const colors = {
  green: "#079B70", greenDark: "#087F5B", greenLight: "#E5F6EF",
  white: "#FFFFFF", bg: "#F5F7F8", text: "#18212B", muted: "#7A8491",
  line: "#E8ECEF", red: "#D93645", orange: "#B86D08",
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "Date unavailable";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function RequestStatus({ status }) {
  const palette = status === "approved"
    ? { bg: colors.greenLight, fg: colors.greenDark, label: "Approved" }
    : status === "rejected"
      ? { bg: "#FFF0F1", fg: colors.red, label: "Rejected" }
      : { bg: "#FFF4DF", fg: colors.orange, label: "Pending HR review" };
  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusText, { color: palette.fg }]}>{palette.label}</Text>
    </View>
  );
}

export default function WFHRequestsScreen() {
  const [date, setDate] = useState(getLocalDateString);
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRequests() {
    try {
      setRequests(await getMyWfhRequests());
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message || "Work from home requests could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadRequests();
    });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit() {
    setNotice("");
    setError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError("Date ko YYYY-MM-DD format me likho.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("WFH ka reason kam se kam 5 characters ka likho.");
      return;
    }
    setSubmitting(true);
    try {
      await submitWfhRequest({ date: date.trim(), reason: reason.trim() });
      setReason("");
      setNotice("Your work from home request has been sent to HR.");
      await loadRequests();
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message || "The work from home request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh() {
    setError("");
    setRefreshing(true);
    await loadRequests();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EMPLOYEE REQUESTS</Text>
          <Text style={styles.title}>Work from home</Text>
          <Text style={styles.subtitle}>Choose a date and tell HR why you need to work remotely.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>New WFH request</Text>
          <Text style={styles.label}>Requested date</Text>
          <TextInput
            accessibilityLabel="Requested WFH date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={styles.input}
          />
          <Text style={styles.hint}>Use YYYY-MM-DD. Today or a future date is allowed.</Text>
          <Text style={[styles.label, styles.reasonLabel]}>Reason for WFH</Text>
          <TextInput
            accessibilityLabel="Reason for WFH"
            value={reason}
            onChangeText={setReason}
            placeholder="Share a short reason with HR"
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={[styles.input, styles.reasonInput]}
          />
          <Text style={styles.counter}>{reason.length}/1000</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSubmit}
            style={[styles.submitButton, submitting && styles.disabledButton]}
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Send request to HR</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeading}>
          <View>
            <Text style={styles.sectionTitle}>My requests</Text>
            <Text style={styles.historySubtitle}>Track HR&apos;s decision and any review note.</Text>
          </View>
          <Text style={styles.count}>{requests.length}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.green} style={styles.loader} />
        ) : requests.length ? requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestDate}>{formatDate(request.date)}</Text>
                <Text style={styles.requestSubmitted}>Submitted {new Date(request.createdAt).toLocaleDateString("en-IN")}</Text>
              </View>
              <RequestStatus status={request.status} />
            </View>
            <Text style={styles.requestReason}>{request.reason}</Text>
            {request.reviewNote ? (
              <View style={styles.reviewNote}>
                <Text style={styles.reviewTitle}>HR note{request.reviewer?.name ? ` · ${request.reviewer.name}` : ""}</Text>
                <Text style={styles.reviewText}>{request.reviewNote}</Text>
              </View>
            ) : null}
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No WFH requests yet</Text>
            <Text style={styles.emptyText}>Your submitted requests and HR decisions will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 26 },
  header: { marginBottom: 14 },
  eyebrow: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 23, fontWeight: "800", marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  label: { color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: "#FBFCFD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 10, marginTop: 6 },
  reasonLabel: { marginTop: 17 },
  reasonInput: { minHeight: 100 },
  counter: { color: colors.muted, fontSize: 10, textAlign: "right", marginTop: 4 },
  error: { color: colors.red, fontSize: 12, lineHeight: 17, marginTop: 11 },
  notice: { color: colors.greenDark, fontSize: 12, lineHeight: 17, marginTop: 11 },
  submitButton: { minHeight: 47, borderRadius: 11, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", marginTop: 16 },
  disabledButton: { opacity: 0.65 },
  submitText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  historyHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 11 },
  historySubtitle: { color: colors.muted, fontSize: 10, marginTop: 4 },
  count: { color: colors.greenDark, backgroundColor: colors.greenLight, overflow: "hidden", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontWeight: "800", fontSize: 12 },
  loader: { paddingVertical: 28 },
  requestCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  requestDate: { color: colors.text, fontSize: 14, fontWeight: "800" },
  requestSubmitted: { color: colors.muted, fontSize: 10, marginTop: 4 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: "800" },
  requestReason: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 12 },
  reviewNote: { backgroundColor: colors.bg, borderRadius: 9, padding: 10, marginTop: 12 },
  reviewTitle: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  reviewText: { color: colors.text, fontSize: 11, lineHeight: 16, marginTop: 4 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.line, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 13 },
  emptyText: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 6 },
});
