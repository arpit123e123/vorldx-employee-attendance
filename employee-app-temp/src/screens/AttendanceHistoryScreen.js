

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import {
  getAttendanceHistory,
  getDashboardAttendance,
  formatAttendanceTime,
} from "../services/attendanceService";
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

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
function getRecordDate(record) {
  const value =
    record.date ||
    record.attendanceDate ||
    record.checkIn ||
    record.checkInTime ||
    record.createdAt;

  if (!value) return null;

  // Date-only strings ko timezone conversion se bachao.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isLateRecord(record) {
  return (
    record?.arrivalStatus === "late" ||
    record?.status === "late" ||
    Number(record?.lateMinutes || 0) > 0
  );
}

function getRecordStatus(record) {
  if (!record) return "Absent";
  if (isLateRecord(record)) return "Late";
  return record.status || record.arrivalStatus || "Present";
}

function formatDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export default function AttendanceHistoryScreen({ navigation }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
const [records, setRecords] = useState([]);
const [summary, setSummary] = useState(null);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
  const now = new Date();
  const visibleMonth = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    1
  );

  const monthName = visibleMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  ).getDate();
useEffect(() => {
  let cancelled = false;

  async function loadMonth() {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const year = visibleMonth.getFullYear();
      const monthNumber = String(
        visibleMonth.getMonth() + 1
      ).padStart(2, "0");

      const from = `${year}-${monthNumber}-01`;
      const to = `${year}-${monthNumber}-${String(daysInMonth).padStart(2, "0")}`;
      const month = `${year}-${monthNumber}`;

      const [history, dashboard] = await Promise.all([
        getAttendanceHistory(from, to),
        getDashboardAttendance(month),
      ]);

      if (!cancelled) {
        setRecords(history);
        setSummary(dashboard.summary);
      }
    } catch (error) {
      if (!cancelled) {
        setHistoryError(
          error?.response?.data?.message ||
          error?.message ||
          "Attendance history could not be loaded."
        );
      }
    } finally {
      if (!cancelled) setHistoryLoading(false);
    }
  }

  loadMonth();

  return () => {
    cancelled = true;
  };
}, [monthOffset, visibleMonth.getFullYear(), visibleMonth.getMonth()]);
  // Monday-first calendar
  const firstWeekday = (visibleMonth.getDay() + 6) % 7;

  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isCurrentMonth = monthOffset === 0;
  const today = now.getDate();

  const previousMonth = () => {
    setMonthOffset((value) => value - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (monthOffset < 0) {
      setMonthOffset((value) => value + 1);
      setSelectedDate(null);
    }
  };
const recordByDate = {};

records.forEach((record) => {
  const dateKey = getRecordDate(record);
  if (dateKey) recordByDate[dateKey] = record;
});

const selectedDateKey =
  selectedDate != null
    ? formatDateKey(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        selectedDate
      )
    : null;

const selectedRecord = selectedDateKey
  ? recordByDate[selectedDateKey]
  : null;

const todayKey = formatDateKey(
  now.getFullYear(),
  now.getMonth(),
  now.getDate()
);
  return (
    <SafeAreaView style={s.safeArea} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation?.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={s.headerTitle}>Attendance History</Text>

        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.monthHeader}>
          <TouchableOpacity
            onPress={previousMonth}
            style={s.monthArrow}
            accessibilityLabel="Previous month"
          >
            <Text style={s.arrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={s.monthTitle}>{monthName}</Text>

          <TouchableOpacity
            onPress={nextMonth}
            style={s.monthArrow}
            disabled={monthOffset >= 0}
            accessibilityLabel="Next month"
          >
            <Text
              style={[
                s.arrowText,
                monthOffset >= 0 && s.disabledArrow,
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.calendarCard}>
          <View style={s.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={s.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={s.calendarGrid}>
            {calendarCells.map((day, index) => {
              const selected =
                day !== null &&
                selectedDate === day;

              const isToday =
                day !== null &&
                isCurrentMonth &&
                day === today;
const dateKey =
  day !== null
    ? formatDateKey(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        day
      )
    : null;

const dayRecord = dateKey ? recordByDate[dateKey] : null;

const dayDate = day !== null
  ? new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      day
    )
  : null;

const isPastWorkingDay =
  dayDate &&
  dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) &&
  dayDate.getDay() !== 0 &&
  dayDate.getDay() !== 6;

const dayStatus = dayRecord
  ? isLateRecord(dayRecord)
    ? "late"
    : "present"
  : isPastWorkingDay
    ? "absent"
    : null;
              return (
                <TouchableOpacity
                  key={`${monthOffset}-${index}`}
                  disabled={day === null}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    s.dateCell,
                    selected && s.selectedDateCell,
                    !selected && isToday && s.todayCell,
                  ]}
                >
                  {day !== null && (
                    <>
                      <Text
                        style={[
                          s.dateText,
                          selected && s.selectedDateText,
                          !selected && isToday && s.todayText,
                        ]}
                      >
                        {day}
                      </Text>
                     {dayStatus && (
  <View
    style={[
      s.attendanceDot,
      dayStatus === "present" && s.presentDot,
      dayStatus === "late" && s.lateDot,
      dayStatus === "absent" && s.absentDot,
    ]}
  />
)}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.calendarHint}>
            Select a date to view its attendance.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Monthly Summary</Text>

        <View style={s.summaryCard}>
          <Summary
  value={historyLoading ? "..." : summary?.present ?? records.length}
  label="Present"
  color={C.green}
/>
<View style={s.divider} />
<Summary
  value={historyLoading ? "..." : summary?.absent ?? "--"}
  label="Absent"
  color={C.red}
/>
<View style={s.divider} />
<Summary
  value={historyLoading ? "..." : summary?.halfDay ?? 0}
  label="Half Day"
  color={C.orange}
/>
<View style={s.divider} />
<Summary
  value={
    historyLoading
      ? "..."
      : `${summary?.totalHours ?? 0}h ${summary?.remainingMinutes ?? 0}m`
  }
  label="Total Hours"
  color={C.blue}
/>
        </View>

        <Text style={s.sectionTitle}>Daily Records</Text>

      <View style={s.emptyCard}>
  {historyLoading ? (
    <Text style={s.emptyDescription}>Loading attendance...</Text>
  ) : historyError ? (
    <>
      <Text style={s.emptyTitle}>Could not load attendance</Text>
      <Text style={s.emptyDescription}>{historyError}</Text>
    </>
  ) : !selectedDate ? (
    <>
      <View style={s.emptyIcon}>
        <Text style={s.emptyIconText}>◷</Text>
      </View>
      <Text style={s.emptyTitle}>Select a date</Text>
      <Text style={s.emptyDescription}>
        Choose a date from the calendar to view attendance.
      </Text>
    </>
  ) : selectedRecord ? (
    <>
      <Text style={s.emptyTitle}>
        {selectedDate} {monthName}
      </Text>

      <Text style={s.emptyDescription}>
        Status: {getRecordStatus(selectedRecord)}
      </Text>

      <Text style={s.emptyDescription}>
        Check-in:{" "}
        {formatAttendanceTime(
          selectedRecord.checkIn || selectedRecord.checkInTime
        )}
      </Text>

      <Text style={s.emptyDescription}>
        Check-out:{" "}
        {formatAttendanceTime(
          selectedRecord.checkOut || selectedRecord.checkOutTime
        )}
      </Text>

      {isLateRecord(selectedRecord) && (
        <Text style={{ color: C.orange, marginTop: 8, fontWeight: "700" }}>
          Late by {selectedRecord.lateMinutes ?? 0} minutes
        </Text>
      )}
    </>
  ) : (
    <>
      <View style={s.emptyIcon}>
        <Text style={s.emptyIconText}>×</Text>
      </View>
      <Text style={s.emptyTitle}>
        {new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth(),
          selectedDate
        ).getDay() === 0 ||
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth(),
          selectedDate
        ).getDay() === 6
          ? "No attendance record"
          : selectedDateKey < todayKey
            ? "Absent"
            : "No attendance recorded"}
      </Text>
      <Text style={s.emptyDescription}>
        No attendance record found for this date.
      </Text>
    </>
  )}
</View>

        <Text style={s.footerNote}>
          Times will follow your company&apos;s configured timezone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ value, label, color }) {
  return (
    <View style={s.summaryItem}>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    minHeight: 58,
    backgroundColor: C.green,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 40,
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 32,
    color: C.white,
    lineHeight: 36,
  },
  headerTitle: {
    flex: 1,
    color: C.white,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  monthTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  
  arrowText: {
    color: C.text,
    fontSize: 25,
  },
  disabledArrow: {
    color: "#CBD1D6",
  },
  calendarCard: {
    backgroundColor: C.white,
    borderRadius: 19,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dateCell: {
    
    width: `${100 / 7}%`,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    marginBottom: 3,
    
  },
  selectedDateCell: {
    backgroundColor: C.green,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: C.green,
  },
  dateText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600",
  },
  selectedDateText: {
    color: C.white,
  },
  attendanceDot: {
  width: 5,
  height: 5,
  borderRadius: 3,
  marginTop: 2,
},
presentDot: {
  backgroundColor: C.green,
},
lateDot: {
  backgroundColor: C.orange,
},
absentDot: {
  backgroundColor: C.red,
},
  todayText: {
    color: C.greenDark,
  },
  calendarHint: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 23,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 19,
    paddingHorizontal: 5,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 9,
    color: C.muted,
    marginTop: 6,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: C.line,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: {
    color: C.green,
    fontSize: 28,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  footerNote: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 18,
    textAlign: "center",
  },
});
