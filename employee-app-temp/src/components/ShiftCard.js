
import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

const GREEN = "#079B70";

export default function ShiftCard({
  shift,
  loading = false,
  error = "",
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>MY SHIFT</Text>

      {loading ? (
        <Text style={styles.message}>
          Loading shift details...
        </Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !shift ? (
        <Text style={styles.message}>
          No shift assigned. Please contact HR.
        </Text>
      ) : (
        <>
          <Text style={styles.name}>{shift.name}</Text>

          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.label}>START TIME</Text>
              <Text style={styles.time}>
                {shift.startTime}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.timeBlock}>
              <Text style={styles.label}>END TIME</Text>
              <Text style={styles.time}>
                {shift.endTime}
              </Text>
            </View>
          </View>

          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>
              Active shift
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8ECEF",
    padding: 16,
    marginBottom: 14,
  },
  eyebrow: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  name: {
    color: "#18212B",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  timeBlock: {
    flex: 1,
  },
  label: {
    color: "#7A8491",
    fontSize: 10,
    fontWeight: "700",
  },
  time: {
    color: "#18212B",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: 35,
    backgroundColor: "#E8ECEF",
    marginHorizontal: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E5F6EF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
    marginRight: 6,
  },
  badgeText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "700",
  },
  message: {
    color: "#7A8491",
    fontSize: 13,
    marginTop: 12,
  },
  error: {
    color: "#E34D59",
    fontSize: 13,
    marginTop: 12,
  },
});
