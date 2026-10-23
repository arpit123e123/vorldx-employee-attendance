import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getMyLeaveRequests, submitLeaveRequest } from "../services/leaveService";

const c = { green: "#079B70", dark: "#087F5B", light: "#E5F6EF", white: "#FFFFFF", bg: "#F5F7F8", text: "#18212B", muted: "#7A8491", line: "#E8ECEF", red: "#D93645", orange: "#B86D08" };
const types = [{ value: "annual", label: "Annual" }, { value: "sick", label: "Sick" }, { value: "casual", label: "Casual" }, { value: "unpaid", label: "Unpaid" }, { value: "other", label: "Other" }];
function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number); const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function displayDate(value) {
  if (!validDate(value || "")) return value || "Date unavailable";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function Status({ value }) {
  const approved = value === "approved", rejected = value === "rejected";
  const color = approved ? c.dark : rejected ? c.red : c.orange;
  const background = approved ? c.light : rejected ? "#FFF0F1" : "#FFF4DF";
  return <View style={[s.badge, { backgroundColor: background }]}><Text style={[s.badgeText, { color }]}>{approved ? "Approved" : rejected ? "Rejected" : "Pending HR review"}</Text></View>;
}

export default function LeaveRequestsScreen() {
  const today = localDate();
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRequests() {
    try { setRequests(await getMyLeaveRequests()); }
    catch (err) { setError(err.response?.data?.message || err.message || "Leave requests could not be loaded."); }
    finally { setLoading(false); setRefreshing(false); }
  }
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadRequests();
    });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit() {
    setError(""); setNotice("");
    const from = startDate.trim(), to = endDate.trim();
    if (!validDate(from) || !validDate(to)) return setError("Leave dates ko valid YYYY-MM-DD format me likho.");
    if (to < from) return setError("The end date cannot be earlier than the start date.");
    if (reason.trim().length < 5) return setError("Leave ka reason kam se kam 5 characters ka likho.");
    setSubmitting(true);
    try {
      await submitLeaveRequest({ leaveType, startDate: from, endDate: to, reason: reason.trim() });
      setReason(""); setNotice("Your leave request has been sent to HR."); await loadRequests();
    } catch (err) { setError(err.response?.data?.message || err.message || "The leave request could not be submitted."); }
    finally { setSubmitting(false); }
  }

  function handleStartDateChange(value) {
    setStartDate(value);
    if (validDate(value) && validDate(endDate) && endDate < value) {
      setEndDate(value);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setError(""); setRefreshing(true); loadRequests(); }} tintColor={c.green} />}>
        <View style={s.header}><Text style={s.eyebrow}>EMPLOYEE REQUESTS</Text><Text style={s.title}>Leave request</Text><Text style={s.subtitle}>Choose your leave dates and share the reason with HR.</Text></View>
        <View style={s.card}>
          <Text style={s.sectionTitle}>New leave request</Text>
          <Text style={s.label}>Leave type</Text>
          <View style={s.typeList}>{types.map((type) => {
            const selected = leaveType === type.value;
            return <TouchableOpacity key={type.value} accessibilityLabel={`${type.label} leave`} accessibilityState={{ selected }} onPress={() => setLeaveType(type.value)} style={[s.typeChip, selected && s.typeChipSelected]}><Text style={[s.typeText, selected && s.typeTextSelected]}>{type.label}</Text></TouchableOpacity>;
          })}</View>
          <View style={s.dateRow}>{[["Start date", startDate, handleStartDateChange], ["End date", endDate, setEndDate]].map(([label, value, update]) => <View key={label} style={s.dateField}>
            <Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={update} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} style={s.input} />
          </View>)}</View>
          <Text style={s.hint}>Use YYYY-MM-DD. Past leave can also be sent to HR for review.</Text>
          <Text style={[s.label, s.reasonLabel]}>Reason for leave</Text>
          <TextInput accessibilityLabel="Reason for leave" value={reason} onChangeText={setReason} placeholder="Share a short reason with HR" multiline maxLength={1000} textAlignVertical="top" style={[s.input, s.reasonInput]} />
          <Text style={s.counter}>{reason.length}/1000</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}{notice ? <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}
          <TouchableOpacity activeOpacity={0.85} disabled={submitting} onPress={handleSubmit} style={[s.submit, submitting && s.disabled]}>{submitting ? <ActivityIndicator color={c.white} /> : <Text style={s.submitText}>Send request to HR</Text>}</TouchableOpacity>
        </View>
        <View style={s.historyHeading}><View><Text style={s.sectionTitle}>My requests</Text><Text style={s.historySubtitle}>Track HR&apos;s decision and any review note.</Text></View><Text style={s.count}>{requests.length}</Text></View>
        {loading ? <ActivityIndicator color={c.green} style={s.loader} /> : requests.length ? requests.map((request) => <View key={request.id} style={s.requestCard}>
          <View style={s.requestTop}><View style={{ flex: 1 }}><Text style={s.requestDate}>{types.find((type) => type.value === request.leaveType)?.label || request.leaveType} · {displayDate(request.startDate)}</Text><Text style={s.requestSubmitted}>Through {displayDate(request.endDate)} · Submitted {new Date(request.createdAt).toLocaleDateString("en-IN")}</Text></View><Status value={request.status} /></View>
          <Text style={s.requestReason}>{request.reason}</Text>
          {request.reviewNote ? <View style={s.reviewNote}><Text style={s.reviewTitle}>HR note{request.reviewer?.name ? ` · ${request.reviewer.name}` : ""}</Text><Text style={s.reviewText}>{request.reviewNote}</Text></View> : null}
        </View>) : <View style={s.empty}><Text style={s.emptyTitle}>No leave requests yet</Text><Text style={s.emptyText}>Your submitted requests and HR decisions will appear here.</Text></View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg }, content: { padding: 16, paddingBottom: 26 }, header: { marginBottom: 14 },
  eyebrow: { color: c.dark, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, title: { color: c.text, fontSize: 23, fontWeight: "800", marginTop: 5 }, subtitle: { color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  card: { backgroundColor: c.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.line }, sectionTitle: { color: c.text, fontSize: 15, fontWeight: "800" }, label: { color: c.text, fontSize: 12, fontWeight: "700", marginTop: 16, marginBottom: 7 },
  typeList: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, typeChip: { borderWidth: 1, borderColor: c.line, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FBFCFD" }, typeChipSelected: { borderColor: c.green, backgroundColor: c.light }, typeText: { color: c.muted, fontSize: 11, fontWeight: "700" }, typeTextSelected: { color: c.dark },
  dateRow: { flexDirection: "row", gap: 10 }, dateField: { flex: 1 }, input: { borderWidth: 1, borderColor: c.line, backgroundColor: "#FBFCFD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: c.text, fontSize: 14 }, hint: { color: c.muted, fontSize: 10, marginTop: 6 }, reasonLabel: { marginTop: 17 }, reasonInput: { minHeight: 100 }, counter: { color: c.muted, fontSize: 10, textAlign: "right", marginTop: 4 },
  error: { color: c.red, fontSize: 12, lineHeight: 17, marginTop: 11 }, notice: { color: c.dark, fontSize: 12, lineHeight: 17, marginTop: 11 }, submit: { minHeight: 47, borderRadius: 11, backgroundColor: c.green, alignItems: "center", justifyContent: "center", marginTop: 16 }, disabled: { opacity: 0.65 }, submitText: { color: c.white, fontSize: 13, fontWeight: "800" },
  historyHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 11 }, historySubtitle: { color: c.muted, fontSize: 10, marginTop: 4 }, count: { color: c.dark, backgroundColor: c.light, overflow: "hidden", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontWeight: "800", fontSize: 12 }, loader: { paddingVertical: 28 }, requestCard: { backgroundColor: c.white, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14, marginBottom: 10 }, requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, requestDate: { color: c.text, fontSize: 14, fontWeight: "800" }, requestSubmitted: { color: c.muted, fontSize: 10, marginTop: 4 }, badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }, badgeText: { fontSize: 9, fontWeight: "800" }, requestReason: { color: c.text, fontSize: 12, lineHeight: 18, marginTop: 12 }, reviewNote: { backgroundColor: c.bg, borderRadius: 9, padding: 10, marginTop: 12 }, reviewTitle: { color: c.muted, fontSize: 10, fontWeight: "800" }, reviewText: { color: c.text, fontSize: 11, lineHeight: 16, marginTop: 4 }, empty: { backgroundColor: c.white, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: c.line, alignItems: "center" }, emptyTitle: { color: c.text, fontWeight: "800", fontSize: 13 }, emptyText: { color: c.muted, fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 6 },
});
