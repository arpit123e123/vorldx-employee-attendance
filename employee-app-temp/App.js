import { Alert } from "react-native";
import QRScannerScreen from "./src/screens/QRScannerScreen";
import React, { useState, useEffect, useRef } from "react";
import {
  getDashboardAttendance,
  getMyShift,
  formatAttendanceTime,
  formatWorkingHours,
  getMyDailyLateStatus,
  getMyMonthlyLateSummary,
} from "./src/services/attendanceService";
import {
  ActivityIndicator,
  Animated,
  Easing,
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from  'react-native-safe-area-context';
import LoginScreen from "./src/screens/LoginScreen";
import {
  getSavedSession,
  logoutEmployee,
} from "./src/services/authService";
import AttendanceHistoryScreen from "./src/screens/AttendanceHistoryScreen";
import ShiftCard from "./src/components/ShiftCard";
import EmployeeRequestsScreen from "./src/screens/EmployeeRequestsScreen";
const C = {
  green: "#079B70",
  greenDark: "#087F5B",
  greenLight: "#E5F6EF",
  white: "#FFFFFF",
  bg: "#F5F7F8",
  text: "#18212B",
  muted: "#7A8491",
  line: "#E8ECEF",
  red: "#E34D59",
  orange: "#E99B2D",
  blue: "#3877D6",
};

function Heading({ children, right }) {
  return (
    <View style={s.sectionHeading}>
      <Text style={s.sectionTitle}>{children}</Text>
      {right ? <Text style={s.link}>{right}</Text> : null}
    </View>
  );
}

function Panel({ children, style }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

function SummaryItem({ value, label, color }) {
  return (
    <View style={s.summaryItem}>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function HomeScreen({ onOpenScanner }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [shift, setShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState("");
  const [lateDaily, setLateDaily] = useState(null);
const [lateMonthly, setLateMonthly] = useState(null);
const ringSpin = useRef(new Animated.Value(0)).current;

useEffect(() => {
  const animation = Animated.loop(
    Animated.timing(ringSpin, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );

  animation.start();

  return () => animation.stop();
}, [ringSpin]);

const ringRotation = ringSpin.interpolate({
  inputRange: [0, 1],
  outputRange: ["15deg", "375deg"],
});

const ringCounterRotation = ringSpin.interpolate({
  inputRange: [0, 1],
  outputRange: ["-15deg", "-375deg"],
});
  async function loadAttendance(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setShiftLoading(true);
      setShiftError("");
      setError("");

      const [dashboardResult, shiftResult] = await Promise.allSettled([
        getDashboardAttendance(),
        getMyShift(),
      ]);

      if (dashboardResult.status === "rejected") {
        throw dashboardResult.reason;
      }

      setAttendance(dashboardResult.value);

      if (shiftResult.status === "fulfilled") {
        setShift(shiftResult.value);
      } else {
        setShift(null);
        setShiftError(
          shiftResult.reason?.response?.data?.message ||
            shiftResult.reason?.message ||
            "The assigned shift could not be loaded."
        );
      }

      const [dailyResult, monthlyResult] = await Promise.allSettled([
        getMyDailyLateStatus(),
        getMyMonthlyLateSummary(),
      ]);

      if (dailyResult.status === "fulfilled") {
        setLateDaily(dailyResult.value);
      }

      if (monthlyResult.status === "fulfilled") {
        setLateMonthly(monthlyResult.value);
      }
    } catch (err) {
      console.log(
        "Dashboard attendance error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Attendance data could not be loaded from the server."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShiftLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);
function handlePunch() {
  if (loading || refreshing || shiftLoading) return;

  if (shiftError) {
    Alert.alert("Shift unavailable", shiftError);
    return;
  }

  if (!shift) {
    Alert.alert(
      "No active shift assigned",
      "Please contact HR to get an active shift before marking attendance."
    );
    return;
  }

  onOpenScanner();
}


  const record = attendance?.todayRecord;
  const summary = attendance?.summary;

  const checkIn = record?.checkIn
    ? formatAttendanceTime(record.checkIn)
    : "--:--";

  const checkOut = record?.checkOut
    ? formatAttendanceTime(record.checkOut)
    : "--:--";

  const workedMinutes =
    record?.checkIn
      ? Math.max(
          0,
          Math.floor(
            ((record.checkOut
              ? new Date(record.checkOut).getTime()
              : Date.now()) -
              new Date(record.checkIn).getTime()) /
              60000
          )
        )
      : 0;

  const workedHours = Math.floor(workedMinutes / 60);
  const remainingMinutes = workedMinutes % 60;

  const statusText = !record
    ? "Not checked in"
    : record.checkOut
      ? "Attendance completed"
      : "Currently checked in";
      
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
    >
      <Panel style={s.todayPanel}>
        <View style={s.todayHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).toUpperCase()}
            </Text>

            <Text style={s.todayTitle}>Today's Status</Text>

            <View style={s.statusBadge}>
              <View style={s.greenDot} />
              <Text style={s.statusText}>
                {loading ? "Loading attendance..." : statusText}
              </Text>
            </View>
          </View>

          
<Animated.View
  style={[
    s.ring,
    { transform: [{ rotate: ringRotation }] },
  ]}
>
  <Animated.View
    style={[
      s.ringInner,
      { transform: [{ rotate: ringCounterRotation }] },
    ]}
  >
    <Text style={s.ringCaption}>Working Hours</Text>

    <Text style={s.ringTime}>
      {loading
        ? "--:--"
        : `${String(workedHours).padStart(2, "0")}:${String(
            remainingMinutes
          ).padStart(2, "0")}`}
    </Text>

    <Text style={s.ringUnit}>Hrs today</Text>
  </Animated.View>
</Animated.View>

        </View>

        <View style={s.timeDivider} />

        <View style={s.checkTimes}>
          <View style={s.checkTimeBlock}>
            <Text style={s.smallLabel}>CHECK IN</Text>
            <Text style={s.checkTimeValue}>
              {loading ? "--:--" : checkIn}
            </Text>
          </View>

          <View style={s.checkTimeBlock}>
            <Text style={s.smallLabel}>CHECK OUT</Text>
            <Text style={s.checkTimeValue}>
              {loading ? "--:--" : checkOut}
            </Text>
          </View>
        </View>

     <TouchableOpacity
  activeOpacity={0.85}
  style={[
    s.punchButton,
    (loading || refreshing || shiftLoading) && { opacity: 0.6 },
  ]}
  onPress={handlePunch}
  disabled={loading || refreshing || shiftLoading}
>
  <Text style={s.punchIcon}>◎</Text>

  <Text style={s.punchButtonText}>
    {shiftLoading
      ? "Checking shift..."
      : shiftError
        ? "Shift unavailable"
        : !shift
          ? "No active shift assigned"
          : record?.checkIn && !record?.checkOut
        ? "Punch Out"
        : record?.checkOut
          ? "Attendance Completed"
          : "Punch In"}
  </Text>

  <Text style={s.buttonArrow}>›</Text>
</TouchableOpacity>

        <Text style={s.secureNote}>
          Attendance verified by the server.
        </Text>
      </Panel>

      {error ? (
        <Panel style={{ marginTop: 12 }}>
          <Text style={{ color: C.red, fontSize: 12 }}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={() => loadAttendance(true)}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: C.green, fontWeight: "700" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </Panel>
      ) : null}

      <ShiftCard
        shift={shift}
        loading={shiftLoading}
        error={shiftError}
      />

      <View style={s.quickGrid}>
        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>Punch In</Text>
          <Text style={s.quickValue}>{loading ? "--:--" : checkIn}</Text>
        </Panel>

        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>Punch Out</Text>
          <Text style={s.quickValue}>{loading ? "--:--" : checkOut}</Text>
        </Panel>

        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>Total Hours Today</Text>
          <Text style={s.quickValue}>
            {loading
              ? "--"
              : formatWorkingHours(workedHours, remainingMinutes)}
          </Text>
        </Panel>
      </View>

      <Heading>This Month Summary</Heading>

      <Panel style={s.summaryPanel}>
        <SummaryItem
          value={loading ? "--" : summary?.present ?? 0}
          label="Present"
          color={C.green}
        />

        <View style={s.summaryDivider} />

        <SummaryItem
          value={loading ? "--" : summary?.absent ?? 0}
          label="Absent"
          color={C.red}
        />

        <View style={s.summaryDivider} />

        <SummaryItem
          value={loading ? "--" : summary?.halfDay ?? 0}
          label="Half Day"
          color={C.orange}
        />

        <View style={s.summaryDivider} />

        <SummaryItem
          value={
            loading
              ? "--"
              : formatWorkingHours(
                  summary?.totalHours,
                  summary?.remainingMinutes
                )
          }
          label="Total Hours"
          color={C.blue}
        />
      </Panel>

      <Heading>Late Arrival Tracking</Heading>

      <Panel style={{ marginTop: 2 }}>
        <Text style={s.quickTitle}>Today's Arrival Status</Text>

        <Text
          style={{
            color:
              lateDaily?.status === "late"
                ? C.red
                : lateDaily?.status === "on-time"
                  ? C.green
                  : C.orange,
            fontSize: 21,
            fontWeight: "800",
            marginTop: 8,
            textTransform: "capitalize",
          }}
        >
          {loading
            ? "Loading..."
            : (lateDaily?.status || "Unavailable").replaceAll("-", " ")}
        </Text>

        {lateDaily?.status === "late" ? (
          <Text style={{ color: C.red, fontSize: 12, marginTop: 5 }}>
            {lateDaily.lateMinutes || 0} minutes late after the 15-minute grace period
          </Text>
        ) : lateDaily?.status === "on-time" ? (
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 5 }}>
            You arrived within the allowed grace period.
          </Text>
        ) : null}
      </Panel>

      <View style={s.quickGrid}>
        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>On Time</Text>
          <Text style={[s.quickValue, { color: C.green, fontWeight: "800" }]}>
            {lateMonthly?.onTimeDays ?? "--"}
          </Text>
        </Panel>

        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>Late Days</Text>
          <Text style={[s.quickValue, { color: C.red, fontWeight: "800" }]}>
            {lateMonthly?.lateDays ?? "--"}
          </Text>
        </Panel>

        <Panel style={s.quickCard}>
          <Text style={s.quickTitle}>Absent Days</Text>
          <Text style={[s.quickValue, { color: C.orange, fontWeight: "800" }]}>
            {lateMonthly?.absentDays ?? "--"}
          </Text>
        </Panel>
      </View>

      <Panel style={{ marginTop: 10 }}>
        <Text style={s.quickTitle}>Monthly Late Minutes</Text>
        <Text
          style={{
            color: C.text,
            fontSize: 24,
            fontWeight: "800",
            marginTop: 7,
          }}
        >
          {lateMonthly?.totalLateMinutes ?? "--"} min
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
          Late minutes are counted after the 15-minute grace period.
        </Text>
      </Panel>

      <Heading>Recent Activities</Heading>

      <Panel style={s.activityPanel}>
        <View style={s.activityIcon}>
          <Text style={{ color: C.green, fontSize: 21 }}>◷</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.activityTitle}>
            {loading
              ? "Loading attendance..."
              : record
                ? `Attendance: ${record.status || "Recorded"}`
                : "No attendance recorded today"}
          </Text>

          <Text style={s.activitySubtitle}>
            {record
              ? `Check-in: ${checkIn} · Check-out: ${checkOut}`
              : "Your attendance record for today will appear here."}
          </Text>
        </View>
      </Panel>
    </ScrollView>
  );
}

function ReportsScreen() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getDashboardAttendance();
      setReport(result);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load attendance reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const summary = report?.summary;
  const today = report?.todayRecord;

  const reportCards = [
    {
      label: "Present",
      value: summary?.present ?? 0,
      color: "#079B70",
    },
    {
      label: "Absent",
      value: summary?.absent ?? 0,
      color: "#E34D59",
    },
    {
      label: "Half Day",
      value: summary?.halfDay ?? 0,
      color: "#E99B2D",
    },
    {
      label: "Total Hours",
      value: formatWorkingHours(
        summary?.totalHours ?? 0,
        summary?.remainingMinutes ?? 0
      ),
      color: "#3877D6",
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: C.text,
          marginBottom: 6,
        }}
      >
        Attendance Reports
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: C.muted,
          marginBottom: 22,
        }}
      >
        Your attendance overview
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={C.green} />
      ) : error ? (
        <View style={{ paddingVertical: 20 }}>
          <Text style={{ color: C.red, marginBottom: 14 }}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={loadReports}
            style={{
              backgroundColor: C.green,
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: C.white, fontWeight: "700" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {reportCards.map((item) => (
              <View
                key={item.label}
                style={{
                  width: "48%",
                  backgroundColor: C.white,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: C.line,
                }}
              >
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  {item.label}
                </Text>

                <Text
                  style={{
                    color: item.color,
                    fontSize: 24,
                    fontWeight: "800",
                    marginTop: 10,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={{
              backgroundColor: C.white,
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: C.line,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: C.text,
                marginBottom: 16,
              }}
            >
              Today's Attendance
            </Text>

            <Text style={{ color: C.muted, marginBottom: 8 }}>
              Status:{" "}
              <Text style={{ color: C.text, fontWeight: "700" }}>
                {today?.status || "No attendance record"}
              </Text>
            </Text>

            <Text style={{ color: C.muted, marginBottom: 8 }}>
              Check-in:{" "}
              <Text style={{ color: C.text, fontWeight: "600" }}>
                {today?.checkIn
                  ? formatAttendanceTime(today.checkIn)
                  : "--"}
              </Text>
            </Text>

            <Text style={{ color: C.muted }}>
              Check-out:{" "}
              <Text style={{ color: C.text, fontWeight: "600" }}>
                {today?.checkOut
                  ? formatAttendanceTime(today.checkOut)
                  : "--"}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            onPress={loadReports}
            activeOpacity={0.8}
            style={{
              backgroundColor: C.green,
              padding: 15,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 18,
            }}
          >
            <Text style={{ color: C.white, fontWeight: "700" }}>
              Refresh Reports
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";

  return "Good Night";
}
function DashboardApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [greeting, setGreeting] = useState(getGreeting);

useEffect(() => {
  const interval = setInterval(() => {
    setGreeting(getGreeting());
  }, 60000);

  return () => clearInterval(interval);
}, []);
if (activeTab === "Scanner") {
  return (
   <QRScannerScreen
  onClose={() => setActiveTab("Dashboard")}
  onQRScanned={(result) => {
    if (!result?.success) {
      Alert.alert(
        "Attendance Failed",
        result?.message || "QR verification failed. Please try again."
      );
      return;
    }

    setActiveTab("Dashboard");

    const action =
      result.action === "check-in" ? "Check-in" : "Check-out";

    Alert.alert(
      "Attendance Updated",
      result.message || `${action} successful.`
    );
  }}
/>
  );
}
  const tabs = [
    { name: "Requests", icon: "▣" },
    { name: "Dashboard", icon: "⌂" },
    { name: "History", icon: "◷" },
    { name: "Punch", icon: "◎" },
    { name: "Reports", icon: "▥" },
    { name: "Profile", icon: "♙" },
  ];

  if (activeTab === "History") {
    return (
      <AttendanceHistoryScreen
        navigation={{
          goBack: () => setActiveTab("Dashboard"),
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={s.safeArea}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.green}
      />

      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>V</Text>
          </View>

          <View style={{ flex: 1 }}>
          <Text style={s.greeting}>
  {greeting}, {user?.name || "there"}! 👋
</Text>
            <Text style={s.headerSubtitle}>
              Have a productive day ahead.
            </Text>
          </View>

          <TouchableOpacity
            style={s.bellButton}
            onPress={() => Alert.alert("Notifications", "No new notifications.")}
          >
            <Text style={s.bellIcon}>♧</Text>
          </TouchableOpacity>
        </View>
      </View>

      
<View style={s.body}>
  {activeTab === "Requests" ? (
    <EmployeeRequestsScreen />
  ) : activeTab === "Dashboard" || activeTab === "Punch" ? (
    <HomeScreen
      onOpenScanner={() => setActiveTab("Scanner")}
    />
  ) : activeTab === "Reports" ? (
    <ReportsScreen />
  ) : activeTab === "Profile" ? (
    <View style={s.placeholder}>
      <Text style={s.placeholderTitle}>Profile</Text>

      <Text style={s.profileName}>
        {user?.name || "Employee"}
      </Text>

      <Text style={s.helperText}>
        Employee ID: {user?.employeeId || "Not available"}
      </Text>

      <Text style={s.helperText}>
        {user?.email || ""}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          Alert.alert(
            "Log out",
            "Are you sure you want to log out?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Log Out",
                style: "destructive",
                onPress: onLogout,
              },
            ]
          );
        }}
        style={s.logoutButton}
      >
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={s.placeholder}>
      <Text style={s.placeholderTitle}>{activeTab}</Text>
      <Text style={s.helperText}>
        This screen will be connected in the next step.
      </Text>
    </View>
  )}
</View>


      <View style={s.bottomBar}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.name;
          const punch = tab.name === "Punch";

          return (
            
<TouchableOpacity
  key={tab.name}
  style={s.navItem}
  onPress={() =>
    setActiveTab(tab.name === "Punch" ? "Scanner" : tab.name)
  }
  activeOpacity={0.75}
>

              <View
                style={[
                  s.navIconWrap,
                  punch && s.punchNav,
                ]}
              >
                <Text
                  style={[
                    s.navIcon,
                    selected && !punch && s.navSelected,
                    punch && s.punchNavText,
                  ]}
                >
                  {tab.icon}
                </Text>
              </View>

              <Text
                style={[
                  s.navLabel,
                  selected && s.navSelected,
                  punch && s.punchLabel,
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.green,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 25,
    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 20,
  },
  greeting: {
    color: C.white,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#D9F5EB",
    fontSize: 12,
    marginTop: 4,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    color: C.white,
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 26,
  },
  panel: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDF0F2",
    padding: 15,
    shadowColor: "#152A22",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 9,
    elevation: 2,
  },
  todayPanel: {
    marginTop: -7,
    padding: 16,
  },
  todayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  todayTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.orange,
  },
  statusText: {
    color: C.muted,
    fontSize: 10,
  },
  ring: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: "#DDF0E8",
    borderTopColor: C.green,
    borderRightColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "15deg" }],
  },
  ringInner: {
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-15deg" }],
  },
  ringCaption: {
    color: C.muted,
    fontSize: 9,
  },
  ringTime: {
    color: C.text,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 2,
  },
  ringUnit: {
    color: C.muted,
    fontSize: 9,
    marginTop: 1,
  },
  timeDivider: {
    height: 1,
    backgroundColor: C.line,
    marginVertical: 16,
  },
  checkTimes: {
    flexDirection: "row",
  },
  checkTimeBlock: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  checkTimeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: C.greenDark,
    marginTop: 5,
  },
  punchButton: {
    backgroundColor: C.green,
    minHeight: 51,
    borderRadius: 13,
    marginTop: 17,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  punchIcon: {
    color: C.white,
    fontSize: 23,
  },
  punchButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  buttonArrow: {
    color: C.white,
    fontSize: 25,
  },
  secureNote: {
    color: C.muted,
    textAlign: "center",
    fontSize: 9,
    marginTop: 11,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  quickCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 15,
  },
  quickIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickTitle: {
    color: C.text,
    fontSize: 10,
    fontWeight: "700",
  },
  quickValue: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 11,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
  },
  link: {
    color: C.green,
    fontSize: 11,
    fontWeight: "700",
  },
  weekPanel: {
    padding: 10,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 3,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
  },
  selectedDayCell: {
    backgroundColor: C.green,
  },
  dayName: {
    fontSize: 9,
    color: C.muted,
  },
  dayDate: {
    fontSize: 13,
    fontWeight: "800",
    color: C.text,
    marginTop: 5,
  },
  selectedDayText: {
    color: C.white,
  },
  dayStatus: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 8,
  },
  dayTime: {
    fontSize: 9,
    color: C.text,
    marginTop: 6,
  },
  helperText: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
  },
  summaryPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 17,
    paddingHorizontal: 7,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 9,
    marginTop: 5,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.line,
  },
  activityPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 12,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
  },
  activitySubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },
  activityArrow: {
    color: C.muted,
    fontSize: 24,
  },
  bottomBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingHorizontal: 5,
    paddingBottom: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconWrap: {
    width: 35,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    fontSize: 22,
    color: "#8C96A2",
  },
  navSelected: {
    color: C.green,
    fontWeight: "800",
  },
  navLabel: {
    color: "#8C96A2",
    fontSize: 9,
    marginTop: 2,
  },
  punchNav: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.green,
    marginTop: -27,
    borderWidth: 4,
    borderColor: C.bg,
  },
  punchNavText: {
    color: C.white,
    fontSize: 28,
  },
  punchLabel: {
    color: C.green,
    fontWeight: "700",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  placeholderTitle: {
    color: C.text,
    fontSize: 23,
    fontWeight: "800",
  },
  profileName: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 18,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: "#FFF0F1",
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  logoutText: {
    color: "#D93645",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const savedUser = await getSavedSession();

        if (mounted) {
          setUser(savedUser);
        }
      } catch (error) {
        console.log("Session restore error:", error.message);
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await logoutEmployee();
    } catch (error) {
      console.log("Logout error:", error.message);
    } finally {
      setUser(null);
    }
  }

  if (checkingSession) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: C.bg,
        }}
      >
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ marginTop: 12, color: C.muted }}>
          Checking session...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={setUser} />;
  }

  return <DashboardApp user={user} onLogout={handleLogout} />;
}
