import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LeaveRequestsScreen from "./LeaveRequestsScreen";
import WFHRequestsScreen from "./WFHRequestsScreen";

const colors = { green: "#079B70", white: "#FFFFFF", bg: "#F5F7F8", muted: "#7A8491", line: "#E8ECEF" };
export default function EmployeeRequestsScreen() {
  const [selected, setSelected] = useState("wfh");
  return <View style={styles.screen}>
    <View style={styles.switcher}>
      {[["wfh", "Work from home"], ["leave", "Leave"]].map(([id, label]) => <TouchableOpacity key={id} accessibilityLabel={`${label} requests`} accessibilityState={{ selected: selected === id }} onPress={() => setSelected(id)} style={[styles.tab, selected === id && styles.activeTab]}>
        <Text style={[styles.tabText, selected === id && styles.activeText]}>{label}</Text>
      </TouchableOpacity>)}
    </View>
    {selected === "leave" ? <LeaveRequestsScreen /> : <WFHRequestsScreen />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  switcher: { flexDirection: "row", backgroundColor: colors.white, padding: 5, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  tab: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  activeTab: { backgroundColor: colors.green }, tabText: { color: colors.muted, fontSize: 12, fontWeight: "700" }, activeText: { color: colors.white },
});
