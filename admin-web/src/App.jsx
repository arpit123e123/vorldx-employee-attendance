import { useEffect, useMemo, useState } from "react";
import CaptchaWidget from "./CaptchaWidget.jsx";
import "./App.css";

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthToken() {
  const keys = ["token", "authToken", "accessToken", "vorldxToken", "vorldx_token"];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

function assertSecureApiUrl() {
  if (import.meta.env.PROD && !API_BASE.startsWith("https://")) {
    throw new Error("Set VITE_API_URL to the HTTPS production API URL.");
  }
}

async function apiRequest(path, token, options = {}) {
  assertSecureApiUrl();
  const { method = "GET", body } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result;
}

function getPeriodRange(period, anchorDate) {
  const end = new Date(`${anchorDate}T12:00:00`);
  const start = new Date(end);

  if (period === "Week") start.setDate(end.getDate() - 6);
  if (period === "Month") start.setDate(1);
  if (period === "Years") {
    start.setMonth(0, 1);
  }

  const format = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return { from: format(start), to: format(end) };
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    attendance: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    employee: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.2 1-1.5 2.6-1.5-.5a7 7 0 0 1-1.6.9l-.3 1.6h-3l-.3-1.6a7 7 0 0 1-1.6-.9l-1.5.5-1.5-2.6 1.2-1a7 7 0 0 1 0-1.9l-1.2-1 1.5-2.6 1.5.5a7 7 0 0 1 1.6-.9l.3-1.6h3l.3 1.6a7 7 0 0 1 1.6.9l1.5-.5 1.5 2.6-1.2 1a7 7 0 0 1-.1 1.9Z" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1-1.7 1.4-1.7 3M12 17h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    late: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" /></>,
    absent: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    filter: <><path d="M3 5h18l-7 8v5l-4 2v-7Z" /></>,
    export: <><path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7" /></>,
    wfh: <><path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-5h6v5" /><path d="M16 5.7c1.5.2 2.3 1 2.5 2.3" /></>,
    leave: <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    home: <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7" /></>,
  };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.dashboard}
    </svg>
  );
}

function Avatar({ name }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return <div className="avatar">{initials}</div>;
}

function Status({ value }) {
  const className = value.toLowerCase().replace(" ", "-");

  return (
    <span className={`status ${className}`}>
      <span className="status-dot" />
      {value}
    </span>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <article className="metric-card">
      <div className="metric-title">
        <span className={`metric-icon ${color}`}>
          <Icon name={icon} />
        </span>
        <span>{title}</span>
      </div>
      <div className="metric-value">{value} <span>attendance days</span></div>
      <div className="metric-footer">
        <span className="growth">LIVE</span>
        <span>from the selected date range</span>
      </div>
    </article>
  );
}

export default function App() {
  const [active, setActive] = useState("Dashboard");
  const [token, setToken] = useState(getAuthToken);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vorldxUser") || "null"); }
    catch { return null; }
  });
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [registerMode, setRegisterMode] = useState(false);
  const [registerForm, setRegisterForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [captchaConfig, setCaptchaConfig] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetVersion, setCaptchaResetVersion] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePagination, setAttendancePagination] = useState({ page: 1, limit: 500, total: 0, totalPages: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [wfhFilter, setWfhFilter] = useState("all");
  const [wfhNotes, setWfhNotes] = useState({});
  const [wfhLoading, setWfhLoading] = useState(false);
  const [wfhError, setWfhError] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveFilter, setLeaveFilter] = useState("all");
  const [leaveNotes, setLeaveNotes] = useState({});
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [reportSummary, setReportSummary] = useState(null);
  const [dailySeries, setDailySeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftReportDate, setDraftReportDate] = useState(getTodayString());
  const [showAll, setShowAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState("All");
  const [period, setPeriod] = useState("Day");
  const [reportDate, setReportDate] = useState(getTodayString());
  const [attendanceFilter, setAttendanceFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiHealth, setApiHealth] = useState("Not checked");
  const [qrDisplayState, setQrDisplayState] = useState('checking');
  const qrDisplayUrl = (import.meta.env.VITE_QR_DISPLAY_URL || `${window.location.protocol}//${window.location.hostname}:51214`).replace(/\/$/, '');

  useEffect(() => {
    let cancelled = false;
    fetch(qrDisplayUrl, { mode: 'no-cors' }).then(() => { if (!cancelled) setQrDisplayState('ready'); }).catch(() => { if (!cancelled) setQrDisplayState('offline'); });
    return () => { cancelled = true; };
  }, [qrDisplayUrl]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    assignedEmployees: [],
  });

  useEffect(() => {
    let cancelled = false;
    apiRequest("/auth/captcha-config", null)
      .then((result) => {
        if (!cancelled) setCaptchaConfig(result.data);
      })
      .catch(() => {
        if (!cancelled) {
          setCaptchaConfig({ enabled: true, siteKey: "", error: true });
        }
      });
    return () => { cancelled = true; };
  }, []);

  const reportRange = useMemo(
    () => getPeriodRange(period, reportDate),
    [period, reportDate]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const rangeQuery = `from=${reportRange.from}&to=${reportRange.to}`;
        const [meResult, employeeResult, shiftResult, reportResult] = await Promise.all([
          apiRequest("/auth/me", token),
          apiRequest("/employees", token),
          apiRequest("/shifts", token),
          apiRequest(`/attendance/late-arrival/reports/range?${rangeQuery}`, token),
        ]);
        if (cancelled) return;

        const me = meResult.data?.user;
        if (!me || !["admin", "hr"].includes(me.role)) {
          throw new Error("Please sign in with an Admin or HR account.");
        }
        setCurrentUser(me);
        localStorage.setItem("vorldxUser", JSON.stringify(me));

        const rawEmployees = employeeResult.data?.employees || employeeResult.employees || [];
        const report = reportResult.data || {};
        const reportRows = report.records || [];
        const reportByEmployee = new Map(reportRows.map((record) => [
          String(record.employee?.id || ""), record,
        ]));

        const mappedEmployees = rawEmployees.map((employee) => {
          const employeeId = String(employee.id || "");
          const reportRecord = reportByEmployee.get(employeeId);
          const rawStatus = employee.isActive === false
            ? "inactive"
            : reportRecord?.status || "no-active-shift";
          const statusMap = {
            "on-time": "On time",
            late: "Late",
            absent: "Absent",
            weekend: "Weekend",
            "no-active-shift": "No shift",
            "shift-conflict": "Shift conflict",
            inactive: "Inactive",
            unknown: "Unknown",
          };
          return {
            id: employee.employeeId || employeeId,
            userId: employeeId,
            name: employee.name || "Unnamed employee",
            email: employee.email || "",
            role: employee.role || "employee",
            dept: "Not assigned",
            isActive: employee.isActive,
            status: statusMap[rawStatus] || "Unknown",
            in: formatTime(reportRecord?.checkIn),
            out: formatTime(reportRecord?.checkOut),
          };
        });

        setEmployees(mappedEmployees);
        setShifts(shiftResult.data?.shifts || []);
        setReportSummary(report.summary || null);
        setDailySeries(report.daily || []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Dashboard data could not be loaded.");
          if (/token|login|authentication|permission|admin\/hr/i.test(error.message || "")) {
            ["token", "authToken", "accessToken", "vorldxToken", "vorldx_token", "vorldxUser"]
              .forEach((key) => localStorage.removeItem(key));
            setAuthError("An Admin or HR session is required. Please sign in again.");
            setToken("");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { cancelled = true; };
  }, [token, reportRange.from, reportRange.to, reloadKey]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    async function loadAttendancePage() {
      setAttendanceLoading(true);
      try {
        const query = `from=${reportRange.from}&to=${reportRange.to}&page=${attendancePage}&limit=500`;
        const result = await apiRequest(`/attendance/records?${query}`, token);
        if (cancelled) return;
        const rows = result.data?.records || [];
        setAttendanceRecords(rows.map((record) => ({
          ...record,
          employeeName: record.employee?.name || "Unknown employee",
          employeeEmail: record.employee?.email || "",
          status: ({ "on-time": "On time", late: "Late", absent: "Absent", weekend: "Weekend", "no-active-shift": "No shift", "shift-conflict": "Shift conflict", unknown: "Unknown" })[record.arrivalStatus] || "On time",
          in: formatTime(record.checkIn),
          out: formatTime(record.checkOut),
        })));
        setAttendancePagination(result.pagination || { page: 1, limit: 500, total: rows.length, totalPages: 1 });
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "Attendance records could not be loaded.");
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    }
    loadAttendancePage();
    return () => { cancelled = true; };
  }, [token, reportRange.from, reportRange.to, attendancePage, reloadKey]);

  useEffect(() => {
    if (!token || active !== "WFH Requests") return undefined;
    let cancelled = false;

    async function loadWfhRequests() {
      setWfhLoading(true);
      setWfhError("");
      try {
        const result = await apiRequest(`/wfh-requests?status=${wfhFilter}`, token);
        if (!cancelled) setWfhRequests(result.data?.requests || []);
      } catch (error) {
        if (!cancelled) setWfhError(error.message || "Work from home requests could not be loaded.");
      } finally {
        if (!cancelled) setWfhLoading(false);
      }
    }

    loadWfhRequests();
    return () => { cancelled = true; };
  }, [token, active, wfhFilter, reloadKey]);

  useEffect(() => {
    if (!token || active !== "Leave Requests") return undefined;
    let cancelled = false;

    async function loadLeaveRequests() {
      setLeaveLoading(true);
      setLeaveError("");
      try {
        const result = await apiRequest(`/leave-requests?status=${leaveFilter}`, token);
        if (!cancelled) setLeaveRequests(result.data?.requests || []);
      } catch (error) {
        if (!cancelled) setLeaveError(error.message || "Leave requests could not be loaded.");
      } finally {
        if (!cancelled) setLeaveLoading(false);
      }
    }

    loadLeaveRequests();
    return () => { cancelled = true; };
  }, [token, active, leaveFilter, reloadKey]);

  const counts = useMemo(() => ({
    onTime: Number(reportSummary?.onTime ?? 0),
    late: Number(reportSummary?.late ?? 0),
    absent: Number(reportSummary?.absent ?? 0),
    total: employees.length,
  }), [employees, reportSummary]);

  const chartData = useMemo(() => {
    const buckets = new Map();
    for (const item of dailySeries) {
      const key = period === "Years"
        ? item.date.slice(0, 7)
        : period === "Month"
          ? `Week ${Math.ceil(Number(item.date.slice(8)) / 7)}`
          : item.date.slice(5);
      const bucket = buckets.get(key) || { day: key, onTime: 0, late: 0, absent: 0 };
      bucket.onTime += Number(item.onTime || 0);
      bucket.late += Number(item.late || 0);
      bucket.absent += Number(item.absent || 0);
      buckets.set(key, bucket);
    }
    return [...buckets.values()].map((item) => {
      const total = item.onTime + item.late + item.absent || 1;
      return {
        ...item,
        onTime: (item.onTime / total) * 100,
        late: (item.late / total) * 100,
        absent: (item.absent / total) * 100,
      };
    });
  }, [dailySeries, period]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = [
        employee.name,
        employee.email,
        employee.role,
        employee.dept,
        employee.id,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesTab =
        selectedTab === "All" ||
        (selectedTab === "On time" && employee.status === "On time") ||
        (selectedTab === "Late" && employee.status === "Late") ||
        (selectedTab === "Absent" && employee.status === "Absent");

      return matchesSearch && matchesTab;
    });
  }, [employees, search, selectedTab]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!captchaConfig) {
      setAuthError("Security check is still loading. Try again in a moment.");
      return;
    }
    if (captchaConfig.error || (captchaConfig.enabled && !captchaToken)) {
      setAuthError("Complete the CAPTCHA security check first.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await apiRequest("/auth/login", null, {
        method: "POST",
        body: {
          email: authForm.email,
          password: authForm.password,
          captchaToken,
        },
      });
      const loginToken = result.data?.token;
      const user = result.data?.user;
      if (!loginToken || !user || !["admin", "hr"].includes(user.role)) {
        throw new Error("Please sign in with an Admin or HR account.");
      }
      localStorage.setItem("token", loginToken);
      localStorage.setItem("vorldxUser", JSON.stringify(user));
      setCurrentUser(user);
      setToken(loginToken);
      setAuthForm({ email: "", password: "" });
    } catch (error) {
      setAuthError(error.message || "Sign-in failed. Please try again.");
    } finally {
      setAuthBusy(false);
      setCaptchaToken("");
      setCaptchaResetVersion((version) => version + 1);
    }
  }

  async function handleCompanyRegister(event) {
    event.preventDefault();
    if (!captchaConfig || captchaConfig.error || (captchaConfig.enabled && !captchaToken)) { setAuthError('Complete the CAPTCHA security check first.'); return; }
    setAuthBusy(true); setAuthError('');
    try {
      await apiRequest('/auth/company-register', null, { method: 'POST', body: { ...registerForm, captchaToken } });
      setAuthForm({ email: registerForm.email, password: '' }); setRegisterMode(false);
      setRegisterForm({ companyName: '', name: '', email: '', password: '' });
      setAuthError('Company registered. Please sign in with your email and password.');
    } catch (error) { setAuthError(error.message || 'Company registration failed.'); }
    finally { setAuthBusy(false); setCaptchaToken(''); setCaptchaResetVersion((version) => version + 1); }
  }

  async function handleEmployeeRole(employee, role) {
    setBusy(true);
    try {
      await apiRequest(`/employees/${employee.userId}/role`, token, { method: 'PATCH', body: { role } });
      setReloadKey((value) => value + 1); showNotice(`${employee.name} is now ${role.toUpperCase()}.`);
    } catch (error) { showNotice(error.message || 'Role update failed.'); }
    finally { setBusy(false); }
  }

  function handleLogout() {
    ["token", "authToken", "accessToken", "vorldxToken", "vorldx_token", "vorldxUser"]
      .forEach((key) => localStorage.removeItem(key));
    setToken("");
    setCurrentUser(null);
    setEmployees([]);
    setAttendanceRecords([]);
    setShifts([]);
    setActive("Dashboard");
  }

  async function handleAddEmployee(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await apiRequest(currentUser?.isCompanyOwner ? "/employees/company-user" : "/employees", token, {
        method: "POST",
        body: currentUser?.isCompanyOwner ? form : { ...form, role: 'employee' },
      });
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "employee" });
      setReloadKey((value) => value + 1);
      showNotice(`Employee created. ID: ${result.data.employee.employeeId}`);
    } catch (error) {
      showNotice(error.message || "Employee account could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmployeeStatus(employee) {
    setBusy(true);
    try {
      await apiRequest(`/employees/${employee.userId}/status`, token, {
        method: "PATCH",
        body: { isActive: !employee.isActive },
      });
      setReloadKey((value) => value + 1);
      showNotice(`Employee ${employee.isActive ? "deactivated" : "activated"}.`);
    } catch (error) {
      showNotice(error.message || "Employee status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateShift(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest("/shifts", token, {
        method: "POST",
        body: shiftForm,
      });
      setShowAddShift(false);
      setShiftForm({ name: "", startTime: "09:00", endTime: "18:00", assignedEmployees: [] });
      setReloadKey((value) => value + 1);
      showNotice("Shift created successfully.");
    } catch (error) {
      showNotice(error.message || "Shift could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function handleShiftStatus(shift) {
    setBusy(true);
    try {
      await apiRequest(`/shifts/${shift.id}/status`, token, {
        method: "PATCH",
        body: { isActive: !shift.isActive },
      });
      setReloadKey((value) => value + 1);
      showNotice(`Shift ${shift.isActive ? "deactivated" : "activated"}.`);
    } catch (error) {
      showNotice(error.message || "Shift status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWfhReview(request, status) {
    setBusy(true);
    try {
      await apiRequest(`/wfh-requests/${encodeURIComponent(request.id)}/status`, token, {
        method: "PATCH",
        body: { status, reviewNote: wfhNotes[request.id] || "" },
      });
      setWfhNotes((notes) => ({ ...notes, [request.id]: "" }));
      setReloadKey((value) => value + 1);
      showNotice(`WFH request ${status}.`);
    } catch (error) {
      showNotice(error.message || "Work from home request could not be reviewed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveReview(request, status) {
    setBusy(true);
    try {
      await apiRequest(`/leave-requests/${encodeURIComponent(request.id)}/status`, token, {
        method: "PATCH",
        body: { status, reviewNote: leaveNotes[request.id] || "" },
      });
      setLeaveNotes((notes) => ({ ...notes, [request.id]: "" }));
      setReloadKey((value) => value + 1);
      showNotice(`Leave request ${status}.`);
    } catch (error) {
      showNotice(error.message || "Leave request could not be reviewed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHealthCheck() {
    setApiHealth("Checking…");
    try {
      const result = await apiRequest("/health");
      setApiHealth(result.success ? "Connected" : "Unavailable");
    } catch (error) {
      setApiHealth(error.message || "Unavailable");
    }
  }

  async function handleExport() {
    const total = attendancePagination.total || 0;
    if (total === 0) {
      showNotice("There are no attendance records in the selected date range.");
      return;
    }
    if (total > 10000) {
      showNotice("Choose a shorter date range to export fewer than 10,000 records.");
      return;
    }

    try {
      const rows = [];
      for (let page = 1; page <= attendancePagination.totalPages; page += 1) {
        const query = `from=${reportRange.from}&to=${reportRange.to}&page=${page}&limit=500`;
        const result = await apiRequest(`/attendance/records?${query}`, token);
        rows.push(...(result.data?.records || []).map((record) => ({
          ...record,
          employeeName: record.employee?.name || "Unknown employee",
          employeeEmail: record.employee?.email || "",
          status: ({ "on-time": "On time", late: "Late", absent: "Absent", weekend: "Weekend", "no-active-shift": "No shift", "shift-conflict": "Shift conflict", unknown: "Unknown" })[record.arrivalStatus] || "On time",
          in: formatTime(record.checkIn),
          out: formatTime(record.checkOut),
        })));
      }
    const headers = ["Date", "Employee ID", "Employee", "Email", "Arrival", "Late Minutes", "Check In", "Check Out"];
    const lines = [headers.map(csvValue).join(","), ...rows.map((record) => [
      record.date,
      record.employee?.employeeId,
      record.employeeName,
      record.employeeEmail,
      record.status,
      record.lateMinutes,
      record.in,
      record.out,
    ].map(csvValue).join(","))];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vorldx-attendance-${reportRange.from}-${reportRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    } catch (error) {
      showNotice(error.message || "The CSV file could not be exported.");
    }
  }

  function navigate(item) {
    setActive(item);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changePeriod(nextPeriod) {
    setPeriod(nextPeriod);
    setAttendancePage(1);
  }

  function changeReportDate(nextDate) {
    setReportDate(nextDate);
    setAttendancePage(1);
  }

  if (!token) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f5f7f8", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`.signin-form { display:grid; gap:14px; } .signin-form label { display:grid; gap:7px; font-size:12px; font-weight:700; } .signin-form input { width:100%; padding:11px 12px; border:1px solid #dfe4ea; border-radius:8px; font:inherit; } .signin-button { width:100%; padding:11px 12px; border:0; border-radius:8px; color:#fff; background:#079b70; font:600 13px 'DM Sans',sans-serif; cursor:pointer; } .signin-button:disabled { opacity:.6; cursor:wait; }`}</style>
        <form onSubmit={registerMode ? handleCompanyRegister : handleLogin} style={{ width: "min(100%, 410px)", padding: 30, border: "1px solid #e5eaf0", borderRadius: 16, background: "white", boxShadow: "0 16px 50px #1f3a5a12" }}>
          <div style={{ color: "#079b70", fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>VORLDX ATTENDANCE</div>
          <h1 style={{ margin: "14px 0 6px", color: "#18212b", fontFamily: "Manrope, sans-serif", fontSize: 25 }}>{registerMode ? 'Register your company' : 'Admin login'}</h1>
          <p style={{ margin: "0 0 24px", color: "#818995", fontSize: 13 }}>{registerMode ? 'Create your company and owner account. Sign in after registration.' : 'Sign in with your Admin or HR account to open the dashboard.'}</p>
          <div className="signin-form">
            {registerMode && <><label>Company name<input maxLength={120} value={registerForm.companyName} onChange={(event) => setRegisterForm({ ...registerForm, companyName: event.target.value })} required /></label><label>Your name<input maxLength={80} value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} required /></label></>}
            <label>Email<input autoComplete="username" type="email" value={registerMode ? registerForm.email : authForm.email} onChange={(event) => registerMode ? setRegisterForm({ ...registerForm, email: event.target.value }) : setAuthForm({ ...authForm, email: event.target.value })} required /></label>
            <label>Password<input autoComplete={registerMode ? 'new-password' : 'current-password'} type="password" minLength={registerMode ? 12 : 1} value={registerMode ? registerForm.password : authForm.password} onChange={(event) => registerMode ? setRegisterForm({ ...registerForm, password: event.target.value }) : setAuthForm({ ...authForm, password: event.target.value })} required /></label>
          </div>
          {captchaConfig?.enabled && captchaConfig.siteKey && (
            <div style={{ marginTop: 14 }}>
              <CaptchaWidget
                siteKey={captchaConfig.siteKey}
                action="login"
                onToken={setCaptchaToken}
                resetVersion={captchaResetVersion}
              />
            </div>
          )}
          {captchaConfig?.error && <p role="alert" style={{ color: "#c43d48", fontSize: 12 }}>Security check could not load. Refresh this page or contact your administrator.</p>}
          {authError && <p role="alert" style={{ color: "#c43d48", fontSize: 12 }}>{authError}</p>}
          <button type="button" className="signin-button" style={{ marginTop: 10, background: 'transparent', color: '#079b70', border: '1px solid #dfe4ea' }} onClick={() => { setRegisterMode((value) => !value); setAuthError(''); }}>{registerMode ? 'Already registered? Sign in' : 'Register your company'}</button>
          <button className="signin-button" type="submit" disabled={authBusy || !captchaConfig || captchaConfig.error || (captchaConfig.enabled && !captchaToken)} style={{ marginTop: 18 }}>
            {authBusy ? 'Please wait...' : registerMode ? 'Register company' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; }
        button, input, select { font: inherit; }
        button { cursor: pointer; }

        .admin-app {
          --blue: #079b70;
          --blue-light: #e5f6ef;
          --cyan: #36bd8f;
          --page: #f5f7f8;
          --white: #fff;
          --text: #18212b;
          --muted: #818995;
          --line: #e5ece9;
          --green: #079b70;
          --orange: #f0a51c;
          min-height: 100vh;
          padding: 24px;
          color: var(--text);
          background: var(--page);
          font-family: 'DM Sans', sans-serif;
        }

        .app-frame {
          display: flex;
          max-width: 1800px;
          min-height: calc(100vh - 48px);
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid #e6eaf0;
          border-radius: 22px;
          background: var(--white);
          box-shadow: 0 14px 45px rgba(43, 66, 96, .06);
        }

        .sidebar {
          width: 214px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 22px 12px 16px;
          background: #fbfdfc;
          border-right: 1px solid #edf0f4;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          margin-bottom: 36px;
        }

        .brand-mark {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 50% 50% 50% 8px;
          color: #fff;
          background: var(--blue);
          font: 800 21px Manrope, sans-serif;
          transform: rotate(-5deg);
        }

        .brand-name {
          font: 800 22px Manrope, sans-serif;
          letter-spacing: -1.2px;
        }

        .brand-name span { color: var(--blue); }
        .nav-caption {
          padding: 0 12px;
          margin: 0 0 11px;
          color: #a2a9b3;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .nav-list { display: grid; gap: 6px; }
        .nav-button {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          min-height: 38px;
          padding: 9px 11px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #606976;
          background: transparent;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          transition: background .15s, color .15s;
        }

        .nav-button:hover { background: #eef7f3; }
        .nav-button.active {
          color: #fff;
          background: #e5f6ef;
          color: #087f5b;
          box-shadow: none;
        }

        .nav-button .nav-chevron { margin-left: auto; font-size: 15px; }
        .nav-spacer { height: 28px; }

        .sidebar-bottom { margin-top: auto; }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 6px 0;
          border-top: 1px solid #e8ebf0;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #079b70;
          background: #e5f6ef;
          font-size: 11px;
          font-weight: 800;
        }

        .user-name { font-size: 11px; font-weight: 700; }
        .user-role { margin-top: 3px; color: #939aa5; font-size: 10px; }

        .main { flex: 1; min-width: 0; background: #fff; }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 20px 22px 14px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #8a929d;
          font-size: 11px;
        }

        .breadcrumb .current { color: #1477e8; font-weight: 700; }
        .breadcrumb-dot { color: #c5ccd5; }
        .top-actions { display: flex; align-items: center; gap: 9px; }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 220px;
          height: 35px;
          padding: 0 10px;
          border: 1px solid #dfe4ea;
          border-radius: 9px;
          color: #8b939e;
          background: #fff;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: none;
          color: #343b46;
          background: transparent;
          font-size: 11px;
        }

        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 35px;
          padding: 8px 13px;
          border: 1px solid #dfe4ea;
          border-radius: 8px;
          color: #323943;
          background: #fff;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .button:hover { background: #f7f9fc; }
        .button.primary {
          border-color: var(--blue);
          color: #fff;
          background: linear-gradient(110deg, #079b70, #087f5b);
          box-shadow: 0 3px 7px rgba(8, 127, 91, .14);
        }

        .page-heading {
          padding: 0 22px 16px;
          font: 700 21px Manrope, sans-serif;
          letter-spacing: -.5px;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 0 22px 17px;
        }

        .period-tabs {
          display: inline-flex;
          overflow: hidden;
          border: 1px solid #dfe4ea;
          border-radius: 7px;
        }

        .period-tabs button {
          padding: 8px 14px;
          border: 0;
          border-right: 1px solid #dfe4ea;
          color: #535c68;
          background: #fff;
          font-size: 11px;
        }

        .period-tabs button:last-child { border-right: 0; }
        .period-tabs button.active { color: #fff; background: var(--blue); }

        .toolbar-actions { display: flex; gap: 8px; }

        .dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 270px;
          align-items: stretch;
          gap: 16px;
          padding: 0 20px 20px;
        }

        .left-column { min-width: 0; }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 17px;
        }

        .metric-card {
          overflow: hidden;
          min-width: 0;
          border: 1px solid #e7ebef;
          border-radius: 11px;
          background: #fff;
          box-shadow: 0 1px 4px rgba(25, 40, 60, .04);
        }

        .metric-title {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 12px 0;
          color: #777f8a;
          font-size: 12px;
        }

        .metric-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border: 1px solid #e5ece9;
          border-radius: 9px;
          color: var(--blue);
          background: #fff;
        }

        .metric-icon.cyan { color: #36bd8f; }
        .metric-icon.pale { color: #7dcce8; }
        .more-button {
          margin-left: auto;
          padding: 0 2px;
          border: 0;
          color: #525a66;
          background: transparent;
          font-size: 19px;
        }

        .metric-value {
          padding: 10px 12px 13px;
          font: 700 20px Manrope, sans-serif;
          letter-spacing: -.6px;
        }

        .metric-value span {
          font: 500 13px 'DM Sans', sans-serif;
          letter-spacing: 0;
        }

        .metric-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-top: 1px solid #eef0f3;
          color: #969da6;
          font-size: 9px;
        }

        .growth {
          padding: 3px 6px;
          border-radius: 5px;
          color: #259669;
          background: #eaf8f0;
          font-weight: 700;
        }

        .panel {
          min-width: 0;
          border: 1px solid #e2ebe7;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(24, 54, 44, .045);
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 15px 17px;
        }

        .panel-heading h2 {
          margin: 0;
          font: 700 15px Manrope, sans-serif;
          letter-spacing: -.3px;
        }

        .panel-heading .see-all {
          padding: 0;
          border: 0;
          color: #3183d9;
          background: transparent;
          font-size: 11px;
        }

        .chart-panel { margin-bottom: 17px; }
        .chart-legend { display: flex; gap: 10px; flex-wrap: wrap; }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #717986;
          font-size: 9px;
        }

        .legend-dot { width: 6px; height: 6px; border-radius: 50%; background: #079b70; }
        .legend-dot.late { background: #36bd8f; }
        .legend-dot.absent { background: #a9e1f4; }

        .chart-area { display: flex; height: 218px; padding: 8px 14px 12px; }
        .chart-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2px 10px 24px 0;
          color: #858d98;
          font-size: 9px;
        }

        .chart-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 39px,
            #edf0f4 40px
          );
        }

        .bars {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 6px;
          padding: 0 3px;
        }

        .bar-group {
          height: 100%;
          flex: 1;
          min-width: 0;
          max-width: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
        }

        .bar-stack {
          width: 100%;
          height: 174px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 3px;
        }

        .bar {
          width: 28%;
          min-width: 4px;
          max-width: 10px;
          border-radius: 5px 5px 1px 1px;
        }

        .bar.ontime { background: #079b70; }
        .bar.late { background: #36bd8f; }
        .bar.absent { background: #a9e1f4; }
        .bar-label { color: #7d8691; font-size: 9px; white-space: nowrap; }

        .department-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .department-card {
          min-width: 0;
          padding: 13px 12px 11px;
          border-top: 1px solid #e5ece9;
          border-right: 1px solid #e5ece9;
        }

        .department-card:nth-child(4n) { border-right: 0; }
        .department-name {
          overflow: hidden;
          margin-bottom: 13px;
          color: #3183d9;
          font-size: 10px;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .department-stats { display: flex; align-items: center; gap: 9px; }
        .department-total {
          font: 700 23px Manrope, sans-serif;
          letter-spacing: -.7px;
        }

        .department-breakdown {
          flex: 1;
          display: grid;
          gap: 4px;
          padding-left: 9px;
          border-left: 1px solid #e5ece9;
        }

        .department-breakdown div {
          display: flex;
          justify-content: space-between;
          gap: 5px;
          color: #858d97;
          font-size: 9px;
        }

        .department-breakdown b { color: #535c67; font-weight: 600; }

        .attendance-panel {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .attendance-panel .panel-heading { padding: 15px 15px 12px; }
        .attendance-tabs {
          display: flex;
          padding: 0 14px;
          border-bottom: 1px solid #edf0f3;
        }

        .attendance-tabs button {
          position: relative;
          flex: 1;
          padding: 11px 3px;
          border: 0;
          color: #838b95;
          background: transparent;
          font-size: 10px;
          white-space: nowrap;
        }

        .attendance-tabs button.active {
          color: #282e37;
          font-weight: 700;
        }

        .attendance-tabs button.active::after {
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 2px;
          background: var(--blue);
          content: "";
        }

        .tab-count {
          display: inline-block;
          margin-left: 3px;
          padding: 2px 4px;
          border-radius: 5px;
          color: #4287d6;
          background: #edf5ff;
          font-size: 9px;
        }

        .attendance-list { flex: 1; }
        .attendance-person {
          padding: 13px 14px 12px;
          border-bottom: 1px solid #edf0f3;
        }

        .person-top { display: flex; align-items: center; gap: 8px; }
        .person-top .avatar { width: 35px; height: 35px; }
        .person-info { flex: 1; min-width: 0; }
        .person-name {
          overflow: hidden;
          color: #303640;
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .person-role {
          overflow: hidden;
          margin-top: 4px;
          color: #8a929c;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .person-top .status { font-size: 9px; padding: 0; background: transparent; }
        .person-top .status-dot { width: 7px; height: 7px; }
        .person-times {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin: 8px 0 0 43px;
          color: #656e79;
          font-size: 9px;
        }

        .person-times span { white-space: nowrap; }
        .person-times .time-dot { color: #80cde8; font-size: 13px; }

        .attendance-footer {
          padding: 13px;
          text-align: center;
          border-top: 1px solid #edf0f3;
        }

        .attendance-footer button {
          border: 0;
          color: #267fda;
          background: transparent;
          font-size: 11px;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .status.on-time { color: #1677e8; background: #edf5ff; }
        .status.late { color: #e3a000; background: #fff8e5; }
        .status.absent { color: #d84b52; background: #fff0f0; }
        .status.pending { color: #a96b00; background: #fff4df; }
        .status.approved { color: #087f5b; background: #e5f6ef; }
        .status.rejected { color: #d93645; background: #fff0f1; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(23, 35, 50, .42);
        }

        .modal {
          width: 100%;
          max-width: 440px;
          padding: 24px;
          border: 1px solid #e7ebef;
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 18px 60px rgba(25, 40, 60, .18);
        }

        .modal h2 { margin: 0; font: 700 20px Manrope, sans-serif; }
        .modal p { margin: 7px 0 20px; color: #818995; font-size: 12px; }
        .form { display: grid; gap: 14px; }
        .form label { display: grid; gap: 7px; font-size: 11px; font-weight: 700; }
        .form input, .form select {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid #dfe4ea;
          border-radius: 8px;
          outline: none;
          color: #343b46;
          background: #fff;
          font-size: 12px;
        }

        .form input:focus, .form select:focus { border-color: var(--blue); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 7px; }
        .notice {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 150;
          padding: 13px 16px;
          border-radius: 8px;
          color: #fff;
          background: #222c39;
          box-shadow: 0 6px 20px #0002;
          font-size: 12px;
        }

        @media (min-width: 1500px) {
          .dashboard-grid { grid-template-columns: minmax(0, 1fr) 340px; }
          .sidebar { width: 235px; }
        }

        @media (max-width: 1150px) {
          .admin-app { padding: 12px; }
          .app-frame { min-height: calc(100vh - 24px); }
          .sidebar { width: 180px; }
          .dashboard-grid { grid-template-columns: minmax(0, 1fr) 250px; padding: 0 14px 15px; gap: 12px; }
          .topbar { padding-right: 15px; padding-left: 15px; }
          .toolbar, .page-heading { padding-right: 15px; padding-left: 15px; }
          .metric-grid { gap: 8px; }
          .metric-value { font-size: 17px; }
          .metric-footer { gap: 4px; font-size: 8px; }
          .department-card { padding-right: 8px; padding-left: 8px; }
          .department-stats { gap: 6px; }
          .department-total { font-size: 20px; }
        }

        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .attendance-panel { min-height: auto; }
          .attendance-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .attendance-person { border-right: 1px solid #edf0f3; }
          .department-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .department-card:nth-child(4n) { border-right: 1px solid #e5ece9; }
          .department-card:nth-child(2n) { border-right: 0; }
        }

        @media (max-width: 650px) {
          .admin-app { padding: 0; background: #fff; }
          .app-frame { display: block; min-height: 100vh; border: 0; }
          .sidebar { display: none; }
          .topbar { align-items: flex-start; flex-direction: column; padding: 15px; }
          .top-actions { width: 100%; flex-wrap: wrap; }
          .search-box { flex: 1; min-width: 130px; }
          .page-heading { padding: 0 15px 13px; font-size: 19px; }
          .toolbar { align-items: flex-start; flex-direction: column; }
          .toolbar-actions { flex-wrap: wrap; }
          .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .metric-value { font-size: 17px; }
          .metric-title { gap: 6px; font-size: 11px; }
          .metric-icon { width: 27px; height: 27px; }
          .metric-footer { flex-wrap: wrap; }
          .dashboard-grid { padding: 0 12px 15px; }
          .chart-area { height: 190px; padding-right: 8px; padding-left: 8px; }
          .bar-stack { height: 145px; }
          .chart-legend { gap: 7px; }
          .panel-heading { padding: 13px; }
          .department-card { padding: 11px 8px; }
          .department-name { font-size: 9px; }
          .department-breakdown { padding-left: 6px; }
          .department-breakdown div { font-size: 8px; }
          .attendance-list { grid-template-columns: 1fr; }
          .attendance-person { border-right: 0; }
        }

/* 3D depth and smooth motion */
.admin-app {
  perspective: none;
  color-scheme: light;
  background: radial-gradient(ellipse at 10% 0%, rgba(7, 155, 112, .07), transparent 34%), #f5f7f8 !important;
}
.admin-app, .admin-app * { color-scheme: light; }
.admin-app .main { background: #f5f7f8 !important; }
.admin-app .app-frame, .admin-app .main, .admin-app .sidebar, .admin-app .topbar,
.admin-app .panel, .admin-app .metric-card, .admin-app .attendance-panel,
.admin-app .chart-panel, .admin-app .panel-heading, .admin-app .attendance-list,
.admin-app .attendance-person, .admin-app table, .admin-app tbody, .admin-app tr,
.admin-app .metric-footer, .admin-app .metric-icon {
  background-color: #fff !important;
}
.admin-app .sidebar { background-color: #fbfdfc !important; }
.admin-app .attendance-person:hover, .admin-app .nav-button:hover { background-color: #eef7f3 !important; }
.admin-app .page-heading, .admin-app .breadcrumb, .admin-app .metric-title,
.admin-app .metric-value, .admin-app .metric-footer, .admin-app .person-name,
.admin-app .person-role, .admin-app .person-meta, .admin-app .panel-heading h2,
.admin-app .topbar, .admin-app .main { color: #18212b !important; }
.admin-app .nav-button:not(.active) { color: #667085 !important; }
.admin-app .nav-button.active { color: #087f5b !important; }
.admin-app .main { background: #fff !important; }

.admin-app .app-frame, .admin-app .panel, .admin-app .metric-card, .admin-app .attendance-panel,
.admin-app .chart-panel, .admin-app .sidebar, .admin-app .topbar {
  color: #18212b !important;
}
.admin-app .app-frame { background: #fff !important; border: 1px solid #e2ebe7 !important; border-radius: 20px !important; }
.admin-app .sidebar { background: #fbfdfc !important; border-color: #e5ece9 !important; }
.admin-app .panel, .admin-app .metric-card, .admin-app .attendance-panel, .admin-app .chart-panel { background: #fff !important; border-color: #e2ebe7 !important; border-radius: 16px !important; box-shadow: 0 8px 24px rgba(24,54,44,.045) !important; }
.admin-app h1, .admin-app h2, .admin-app h3, .admin-app b, .admin-app strong { color: #18212b; }
.admin-app .nav-button.active { color: #087f5b !important; background: #e5f6ef !important; box-shadow: none !important; }
.admin-app .nav-button { color: #667085; }
.admin-app .button.primary, .admin-app .signin-button { background: #079b70 !important; border-color: #079b70 !important; color: #fff !important; }
.admin-app .button:not(.primary) { color: #344054; background: #fff; border-color: #dfe8e3; }
.admin-app .status.on-time { color: #087f5b; background: #e5f6ef; }

.app-frame {
  transform-style: preserve-3d;
  animation: dashboardEnter 0.8s ease-out both;
  box-shadow:
    0 25px 70px rgba(32, 70, 120, 0.09),
    0 3px 10px rgba(32, 70, 120, 0.04);
}

@keyframes dashboardEnter {
  from {
    opacity: 0;
    transform: translateY(18px) rotateX(2deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0);
  }
}

/* Cards lift in 3D on hover */
.metric-card,
.panel {
  transform: translateZ(0);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.metric-card:hover,
.panel:hover {
  transform: translateY(-4px) translateZ(8px);
  border-color: rgba(8, 120, 249, 0.25);
  box-shadow:
    0 14px 28px rgba(34, 83, 145, 0.09),
    0 3px 8px rgba(34, 83, 145, 0.04);
}

/* Floating blue accent on metric icons */
.metric-icon {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.metric-card:hover .metric-icon {
  transform: translateY(-2px) rotateY(12deg) scale(1.06);
  box-shadow: 0 5px 12px rgba(8, 120, 249, 0.12);
}

/* Animated chart bars */
.bar {
  transform-origin: bottom;
  animation: barRise 0.85s cubic-bezier(.2, .8, .2, 1) both;
  transition: filter 0.2s ease;
}

.bar-group:nth-child(2) .bar { animation-delay: 0.06s; }
.bar-group:nth-child(3) .bar { animation-delay: 0.12s; }
.bar-group:nth-child(4) .bar { animation-delay: 0.18s; }
.bar-group:nth-child(5) .bar { animation-delay: 0.24s; }
.bar-group:nth-child(6) .bar { animation-delay: 0.30s; }
.bar-group:nth-child(7) .bar { animation-delay: 0.36s; }
.bar-group:nth-child(8) .bar { animation-delay: 0.42s; }
.bar-group:nth-child(9) .bar { animation-delay: 0.48s; }
.bar-group:nth-child(10) .bar { animation-delay: 0.54s; }

@keyframes barRise {
  from {
    transform: scaleY(0.05);
    opacity: 0.35;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

.bar:hover {
  filter: brightness(1.15);
}

/* Sidebar interaction */
.nav-button {
  transition:
    transform 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
}

.nav-button:hover {
  transform: translateX(3px);
}

.nav-button.active {
  box-shadow:
    0 5px 12px rgba(8, 120, 249, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* Employee rows */
.attendance-person {
  transition: background 0.22s ease, transform 0.22s ease;
}

.attendance-person:hover {
  position: relative;
  z-index: 1;
  transform: translateX(-3px);
  background: #f5f9ff;
}

.avatar,
.user-avatar {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.attendance-person:hover .avatar {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 4px 12px rgba(30, 90, 150, 0.15);
}

/* Buttons feel raised */
.button {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(35, 75, 120, 0.10);
}

.button:active {
  transform: translateY(0) scale(0.98);
}

/* Department cards */
.department-card {
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.department-card:hover {
  position: relative;
  z-index: 1;
  background: #f4f9ff;
  box-shadow: inset 0 0 0 1px rgba(8, 120, 249, 0.12);
}

/* Reduced motion accessibility */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

      `}</style>

      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">V</div>
            <div className="brand-name">vorld<span>X</span></div>
          </div>

          <div className="nav-caption">Main menu</div>
          <nav className="nav-list">
            {[
              ["Dashboard", "dashboard"],
              ["Attendance", "attendance"],
              ["Employee", "employee"],
              ["Schedule", "schedule"],
              ["WFH Requests", "wfh"],
              ["Leave Requests", "leave"],
            ].map(([label, icon]) => (
              <button
                key={label}
                className={`nav-button ${active === label ? "active" : ""}`}
                onClick={() => navigate(label)}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {label === "Dashboard" && <span className="nav-chevron">⌃</span>}
                {label === "Employee" && <span className="nav-chevron">⌄</span>}
              </button>
            ))}
          </nav>

          <div className="nav-spacer" />
          <div className="nav-caption">Settings</div>
          <nav className="nav-list">
            {[
              ["Settings", "settings"],
              ["Help Center", "help"],
            ].map(([label, icon]) => (
              <button
                key={label}
                className={`nav-button ${active === label ? "active" : ""}`}
                onClick={() => navigate(label)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="user-avatar">{(currentUser?.name || "Admin").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
              <div>
                <div className="user-name">{currentUser?.name || "Admin"}</div>
                <div className="user-role">{currentUser?.role?.toUpperCase() || "ADMIN"}</div>
              </div>
            </div>
            <button className="nav-button" onClick={handleLogout} style={{ marginTop: 8 }}>Sign out</button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="breadcrumb">
              <Icon name="home" />
              <span className="breadcrumb-dot">•</span>
              <span>Home</span>
              <span className="breadcrumb-dot">•</span>
              <span className="current">{active}</span>
            </div>

            <div className="top-actions">
              <label className="search-box">
                <Icon name="search" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees"
                  aria-label="Search employees"
                />
              </label>
              <button
                className="button primary"
                onClick={handleExport}
              >
                <Icon name="export" />
                Export
              </button>
            </div>
          </header>

          {loadError && <div role="alert" style={{ margin: "0 22px 14px", padding: "11px 13px", border: "1px solid #ffd6d6", borderRadius: 8, color: "#a8323c", background: "#fff3f3", fontSize: 12 }}>{loadError}</div>}
          {loading && <div style={{ margin: "0 22px 14px", color: "#2879d8", fontSize: 12 }}>Loading data from the backend…</div>}

          {active === "Dashboard" && <div id="dashboard-content">
            <div className="page-heading">Dashboard</div>

            <div className="toolbar">
              <div className="period-tabs">
                {["Years", "Month", "Week", "Day"].map((item) => (
                  <button
                    key={item}
                    className={period === item ? "active" : ""}
                    onClick={() => changePeriod(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="toolbar-actions">
                <button
                  className="button"
                  onClick={() => { setDraftReportDate(reportDate); setShowDatePicker(true); }}
                >
                  <Icon name="schedule" />
                  {reportDate}
                </button>
                <button
                  className="button"
                  onClick={() => setSelectedTab((value) => value === "All" ? "Late" : value === "Late" ? "Absent" : "All")}
                >
                  <Icon name="filter" />
                  Filter: {selectedTab}
                </button>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="left-column">
                <div className="metric-grid">
                  <MetricCard
                    title="On Time"
                    value={counts.onTime}
                    icon="clock"
                    color="blue"
                  />
                  <MetricCard
                    title="Late"
                    value={counts.late}
                    icon="late"
                    color="cyan"
                  />
                  <MetricCard
                    title="Absent"
                    value={counts.absent}
                    icon="absent"
                    color="pale"
                  />
                </div>

                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <h2>Attendance Status</h2>
                    <div className="chart-legend">
                      <span className="legend-item">
                        <i className="legend-dot" /> On time
                      </span>
                      <span className="legend-item">
                        <i className="legend-dot late" /> Late
                      </span>
                      <span className="legend-item">
                        <i className="legend-dot absent" /> Absent
                      </span>
                    </div>
                  </div>

                  <div className="chart-area">
                    <div className="chart-axis">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0</span>
                    </div>

                    <div className="chart-body">
                      <div className="bars">
                        {chartData.map((item) => (
                          <div className="bar-group" key={item.day}>
                            <div className="bar-stack">
                              <div
                                className="bar ontime"
                                style={{ height: `${item.onTime}%` }}
                                title={`On time: ${item.onTime}`}
                              />
                              <div
                                className="bar late"
                                style={{ height: `${item.late}%` }}
                                title={`Late: ${item.late}`}
                              />
                              <div
                                className="bar absent"
                                style={{ height: `${item.absent}%` }}
                                title={`Absent: ${item.absent}`}
                              />
                            </div>
                            <span className="bar-label">{item.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <h2>Shift overview</h2>
                    <button className="button" onClick={() => navigate("Schedule")}>Manage shifts</button>
                  </div>

                  <div style={{ padding: "8px 17px 17px", color: "#717986", fontSize: 12 }}>
                    <div><b style={{ color: "#18212b" }}>{shifts.filter((shift) => shift.isActive).length}</b> active shifts · <b style={{ color: "#18212b" }}>{employees.filter((employee) => employee.isActive).length}</b> active employees</div>
                    <a href={qrDisplayUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12, color: "#079b70", fontWeight: 700, textDecoration: "none" }}>
                      Open office QR display ↗
                    </a>
                    <div role="status" style={{ marginTop: 6, fontSize: 10, color: qrDisplayState === 'offline' ? '#b42318' : qrDisplayState === 'ready' ? '#087f5b' : '#818995' }}>{qrDisplayState === 'offline' ? 'QR display is not running. Start the QR display app first.' : qrDisplayState === 'ready' ? 'QR display is ready.' : 'Checking QR display...'}</div>
                  </div>
                </section>
              </div>

              <aside className="panel attendance-panel">
                <div className="panel-heading">
                  <h2>Attendance</h2>
                  <button
                    className="see-all"
                    onClick={() => navigate("Attendance")}
                  >
                    See all
                  </button>
                </div>

                <div className="attendance-tabs">
                  {[
                    ["All", employees.length],
                    ["On time", counts.onTime],
                    ["Late", counts.late],
                    ["Absent", counts.absent],
                  ].map(([label, count]) => (
                    <button
                      key={label}
                      className={selectedTab === label ? "active" : ""}
                      onClick={() => setSelectedTab(label)}
                    >
                      {label} <span className="tab-count">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="attendance-list">
                  {(showAll ? filteredEmployees : filteredEmployees.slice(0, 7)).map((employee) => (
                    <div className="attendance-person" key={employee.id}>
                      <div className="person-top">
                        <Avatar name={employee.name} />
                        <div className="person-info">
                          <div className="person-name">{employee.name}</div>
                          <div className="person-role">
                            {employee.role} | Regular
                          </div>
                        </div>
                        <Status value={employee.status} />
                      </div>
                      <div className="person-times">
                        <span className="time-dot">●</span>
                        <span>Clock In - {employee.in}</span>
                        <span>|</span>
                        <span>Clock Out - {employee.out}</span>
                      </div>
                    </div>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <div className="empty-state">No matching employees found.</div>
                  )}
                </div>

                <div className="attendance-footer">
                  <button
                    onClick={() => {
                      setSelectedTab("All");
                      setShowAll((value) => !value);
                    }}
                  >
                    {showAll ? "Show less" : "View all attendance"}
                  </button>
                </div>
              </aside>
            </div>
          </div>}

          {active === "Employee" && <section
            className="panel"
            id="employee-list"
            style={{ margin: "0 20px 20px" }}
          >
            <div className="panel-heading">
              <h2>Employee Directory</h2>
              <button
                className="button primary"
                onClick={() => setShowAdd(true)}
              >
                + Add Employee
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f7f9fc", color: "#7d8691", fontSize: 10 }}>
                    {["EMPLOYEE", "EMAIL", "CHECK IN", "ARRIVAL", "ACCOUNT"].map((heading) => (
                      <th key={heading} style={{ padding: "12px 15px", borderTop: "1px solid #edf0f3", borderBottom: "1px solid #edf0f3" }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter((employee) =>
                      [employee.name, employee.role, employee.dept, employee.id]
                        .some((value) => value.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((employee) => (
                      <tr key={employee.id} style={{ borderBottom: "1px solid #edf0f3", fontSize: 11 }}>
                        <td style={{ padding: "12px 15px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <Avatar name={employee.name} />
                            <div>
                              <div style={{ fontWeight: 700 }}>{employee.name}</div>
                              <div style={{ color: "#929aa5", marginTop: 3 }}>{employee.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 15px" }}>{employee.email}</td>
                        <td style={{ padding: "12px 15px" }}>{employee.in}</td>
                        <td style={{ padding: "12px 15px" }}><Status value={employee.status} /></td>
                        <td style={{ padding: "12px 15px" }}>
                          <button className="button" disabled={busy} onClick={() => handleEmployeeStatus(employee)}>
                            {employee.isActive ? "Deactivate" : "Activate"}
                          </button>
                          {currentUser?.isCompanyOwner && <select className="button" aria-label={`Role for ${employee.name}`} value={employee.role.toLowerCase()} disabled={busy} onChange={(event) => handleEmployeeRole(employee, event.target.value)} style={{ marginLeft: 6 }}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 15px", color: "#929aa5", fontSize: 10 }}>
              {loading ? "Loading employee directory..." : `${employees.length} employees loaded from backend`}
            </div>
          </section>}

          {active === "Attendance" && <section className="panel" style={{ margin: "0 20px 20px" }}>
            <div className="panel-heading">
              <div>
                <h2>Attendance records</h2>
                <div style={{ marginTop: 5, color: "#818995", fontSize: 11 }}>{reportRange.from} to {reportRange.to}</div>
              </div>
              <select className="button" value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value)} aria-label="Filter attendance">
                {["All", "On time", "Late"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            {loadError && <div role="alert" style={{ padding: 12, color: "#b33", fontSize: 12 }}>{loadError}</div>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead><tr style={{ background: "#f7f9fc", color: "#7d8691", fontSize: 10 }}>
                  {["DATE", "EMPLOYEE", "EMPLOYEE ID", "ARRIVAL", "LATE (MIN)", "CHECK IN", "CHECK OUT"].map((heading) => <th key={heading} style={{ padding: "12px 15px", borderBottom: "1px solid #edf0f3" }}>{heading}</th>)}
                </tr></thead>
                <tbody>
                  {attendanceRecords.filter((record) =>
                    (attendanceFilter === "All" || record.status === attendanceFilter) &&
                    [record.employeeName, record.employeeEmail, record.employee?.employeeId, record.date]
                      .some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
                  ).map((record) => <tr key={record.id} style={{ borderBottom: "1px solid #edf0f3", fontSize: 11 }}>
                    <td style={{ padding: "12px 15px" }}>{record.date}</td>
                    <td style={{ padding: "12px 15px" }}>{record.employeeName}</td>
                    <td style={{ padding: "12px 15px" }}>{record.employee?.employeeId || "—"}</td>
                    <td style={{ padding: "12px 15px" }}><Status value={record.status} /></td>
                    <td style={{ padding: "12px 15px" }}>{record.lateMinutes || 0}</td>
                    <td style={{ padding: "12px 15px" }}>{record.in}</td>
                    <td style={{ padding: "12px 15px" }}>{record.out}</td>
                  </tr>)}
                </tbody>
              </table>
              {!attendanceLoading && attendancePagination.total === 0 && <div style={{ padding: 20, color: "#818995", fontSize: 12 }}>No attendance records found for this date range.</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 15px", color: "#818995", fontSize: 11 }}>
              <span>
                {attendanceLoading ? "Loading records..." : attendancePagination.total
                  ? `Showing ${(attendancePage - 1) * attendancePagination.limit + 1}–${Math.min(attendancePage * attendancePagination.limit, attendancePagination.total)} of ${attendancePagination.total}`
                  : "0 records"}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={attendanceLoading || attendancePage <= 1} onClick={() => setAttendancePage((page) => Math.max(1, page - 1))}>Previous</button>
                <button className="button" disabled={attendanceLoading || attendancePage >= attendancePagination.totalPages} onClick={() => setAttendancePage((page) => page + 1)}>Next</button>
              </div>
            </div>
          </section>}

          {active === "WFH Requests" && <section className="panel" style={{ margin: "0 20px 20px" }}>
            <div className="panel-heading">
              <div>
                <h2>Work from home requests</h2>
                <div style={{ marginTop: 5, color: "#818995", fontSize: 11 }}>Review employee dates and reasons, then approve or reject.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select className="button" value={wfhFilter} onChange={(event) => setWfhFilter(event.target.value)} aria-label="Filter WFH requests">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All requests</option>
                </select>
                <button className="button" onClick={() => setReloadKey((value) => value + 1)}>Refresh</button>
              </div>
            </div>
            {wfhError && <div role="alert" style={{ margin: "0 16px 12px", padding: 12, borderRadius: 8, color: "#b33", background: "#fff4f4", fontSize: 12 }}>{wfhError}</div>}
            {wfhLoading ? <div style={{ padding: 24, color: "#818995", fontSize: 12 }}>Loading WFH requests...</div> : (
              <div style={{ display: "grid", gap: 12, padding: "0 16px 16px" }}>
                {wfhRequests.filter((request) => [
                  request.employee?.name,
                  request.employee?.email,
                  request.employee?.employeeId,
                  request.date,
                  request.reason,
                ].some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase()))).map((request) => (
                  <article key={request.id} style={{ border: "1px solid #e8edf2", borderRadius: 12, padding: 15, background: "#fff" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                      <Avatar name={request.employee?.name || "Employee"} />
                      <div style={{ flex: "1 1 220px" }}>
                        <div style={{ color: "#222831", fontSize: 13, fontWeight: 800 }}>{request.employee?.name || "Employee"}</div>
                        <div style={{ color: "#818995", fontSize: 10, marginTop: 3 }}>{request.employee?.employeeId || ""}{request.employee?.email ? ` · ${request.employee.email}` : ""}</div>
                      </div>
                      <Status value={request.status} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", marginTop: 14, color: "#505966", fontSize: 11 }}>
                      <div><b>Requested date:</b> {new Date(`${request.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div><b>Submitted:</b> {new Date(request.createdAt).toLocaleString("en-IN")}</div>
                      {request.reviewer?.name && <div><b>Reviewed by:</b> {request.reviewer.name}</div>}
                    </div>
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: "#f7f9fc", color: "#38414d", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      <b>Reason</b><br />{request.reason}
                    </div>
                    {request.reviewNote && <div style={{ marginTop: 10, color: "#59616c", fontSize: 11 }}><b>HR note:</b> {request.reviewNote}</div>}
                    {request.status === "pending" && (
                      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                        <label style={{ display: "grid", gap: 5, color: "#59616c", fontSize: 10, fontWeight: 700 }}>
                          Optional note for employee
                          <textarea
                            rows={2}
                            maxLength={500}
                            value={wfhNotes[request.id] || ""}
                            onChange={(event) => setWfhNotes((notes) => ({ ...notes, [request.id]: event.target.value }))}
                            placeholder="Add a short HR note"
                            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #dfe4ea", borderRadius: 8, padding: "9px 10px", font: "inherit", fontSize: 11 }}
                          />
                        </label>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="button" disabled={busy} onClick={() => handleWfhReview(request, "rejected")}>{busy ? "Saving..." : "Reject"}</button>
                          <button className="button primary" disabled={busy} onClick={() => handleWfhReview(request, "approved")}>{busy ? "Saving..." : "Approve"}</button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                {!wfhRequests.length && <div style={{ padding: 22, textAlign: "center", color: "#818995", fontSize: 12 }}>{wfhFilter === "pending" ? "No WFH requests waiting for review." : "No WFH requests found for this filter."}</div>}
              </div>
            )}
          </section>}

          {active === "Leave Requests" && <section className="panel" style={{ margin: "0 20px 20px" }}>
            <div className="panel-heading">
              <div>
                <h2>Leave requests</h2>
                <div style={{ marginTop: 5, color: "#818995", fontSize: 11 }}>Review leave type, requested dates and reason, then approve or reject.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select className="button" value={leaveFilter} onChange={(event) => setLeaveFilter(event.target.value)} aria-label="Filter leave requests">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All requests</option>
                </select>
                <button className="button" onClick={() => setReloadKey((value) => value + 1)}>Refresh</button>
              </div>
            </div>
            {leaveError && <div role="alert" style={{ margin: "0 16px 12px", padding: 12, borderRadius: 8, color: "#b33", background: "#fff4f4", fontSize: 12 }}>{leaveError}</div>}
            {leaveLoading ? <div style={{ padding: 24, color: "#818995", fontSize: 12 }}>Loading leave requests...</div> : (
              <div style={{ display: "grid", gap: 12, padding: "0 16px 16px" }}>
                {leaveRequests.filter((request) => [
                  request.employee?.name,
                  request.employee?.email,
                  request.employee?.employeeId,
                  request.leaveType,
                  request.startDate,
                  request.endDate,
                  request.reason,
                ].some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase()))).map((request) => (
                  <article key={request.id} style={{ border: "1px solid #e8edf2", borderRadius: 12, padding: 15, background: "#fff" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                      <Avatar name={request.employee?.name || "Employee"} />
                      <div style={{ flex: "1 1 220px" }}>
                        <div style={{ color: "#222831", fontSize: 13, fontWeight: 800 }}>{request.employee?.name || "Employee"}</div>
                        <div style={{ color: "#818995", fontSize: 10, marginTop: 3 }}>{request.employee?.employeeId || ""}{request.employee?.email ? ` · ${request.employee.email}` : ""}</div>
                      </div>
                      <Status value={request.status} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", marginTop: 14, color: "#505966", fontSize: 11 }}>
                      <div><b>Leave type:</b> {request.leaveType}</div>
                      <div><b>From:</b> {new Date(`${request.startDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div><b>Through:</b> {new Date(`${request.endDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div><b>Submitted:</b> {new Date(request.createdAt).toLocaleString("en-IN")}</div>
                      {request.reviewer?.name && <div><b>Reviewed by:</b> {request.reviewer.name}</div>}
                    </div>
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: "#f7f9fc", color: "#38414d", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      <b>Reason</b><br />{request.reason}
                    </div>
                    {request.reviewNote && <div style={{ marginTop: 10, color: "#59616c", fontSize: 11 }}><b>HR note:</b> {request.reviewNote}</div>}
                    {request.status === "pending" && <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                      <label style={{ display: "grid", gap: 5, color: "#59616c", fontSize: 10, fontWeight: 700 }}>
                        Optional note for employee
                        <textarea rows={2} maxLength={500} value={leaveNotes[request.id] || ""} onChange={(event) => setLeaveNotes((notes) => ({ ...notes, [request.id]: event.target.value }))} placeholder="Add a short HR note" style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #dfe4ea", borderRadius: 8, padding: "9px 10px", font: "inherit", fontSize: 11 }} />
                      </label>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="button" disabled={busy} onClick={() => handleLeaveReview(request, "rejected")}>{busy ? "Saving..." : "Reject"}</button>
                        <button className="button primary" disabled={busy} onClick={() => handleLeaveReview(request, "approved")}>{busy ? "Saving..." : "Approve"}</button>
                      </div>
                    </div>}
                  </article>
                ))}
                {!leaveRequests.length && <div style={{ padding: 22, textAlign: "center", color: "#818995", fontSize: 12 }}>{leaveFilter === "pending" ? "No leave requests waiting for review." : "No leave requests found for this filter."}</div>}
              </div>
            )}
          </section>}

          {active === "Schedule" && <section className="panel" style={{ margin: "0 20px 20px" }}>
            <div className="panel-heading">
              <div><h2>Shift schedule</h2><div style={{ marginTop: 5, color: "#818995", fontSize: 11 }}>Manage shifts and employee assignments</div></div>
              <button className="button primary" onClick={() => setShowAddShift(true)}>+ Create shift</button>
            </div>
            <div style={{ padding: "0 16px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="button" href={qrDisplayUrl} target="_blank" rel="noreferrer">Open office QR display</a>
              <span style={{ alignSelf: 'center', fontSize: 11, color: qrDisplayState === 'offline' ? '#b42318' : '#087f5b' }}>{qrDisplayState === 'offline' ? 'Start the QR display app to use this link.' : qrDisplayState === 'ready' ? 'QR display is ready.' : 'Checking availability...'}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead><tr style={{ background: "#f7f9fc", color: "#7d8691", fontSize: 10 }}>
                  {["SHIFT", "TIME", "ASSIGNED EMPLOYEES", "STATUS", "ACTION"].map((heading) => <th key={heading} style={{ padding: "12px 15px", borderBottom: "1px solid #edf0f3" }}>{heading}</th>)}
                </tr></thead>
                <tbody>
                  {shifts.map((shift) => <tr key={shift.id} style={{ borderBottom: "1px solid #edf0f3", fontSize: 11 }}>
                    <td style={{ padding: "12px 15px", fontWeight: 700 }}>{shift.name}</td>
                    <td style={{ padding: "12px 15px" }}>{shift.startTime} – {shift.endTime}</td>
                    <td style={{ padding: "12px 15px" }}>{(shift.assignedEmployees || []).map((employee) => employee.name || employee).join(", ") || "No employees assigned"}</td>
                    <td style={{ padding: "12px 15px" }}><Status value={shift.isActive ? "Active" : "Inactive"} /></td>
                    <td style={{ padding: "12px 15px" }}><button className="button" disabled={busy} onClick={() => handleShiftStatus(shift)}>{shift.isActive ? "Deactivate" : "Activate"}</button></td>
                  </tr>)}
                </tbody>
              </table>
              {!loading && shifts.length === 0 && <div style={{ padding: 20, color: "#818995", fontSize: 12 }}>No shifts yet. Create a shift and assign employees to enable attendance QR scans.</div>}
            </div>
          </section>}

          {active === "Settings" && <section className="panel" style={{ margin: "0 20px 20px", padding: 18 }}>
            <h2 style={{ margin: "0 0 14px", font: "700 16px Manrope, sans-serif" }}>Account & connection</h2>
            <div style={{ display: "grid", gap: 10, color: "#59616c", fontSize: 12 }}>
              <div><b>Signed in as:</b> {currentUser?.name} ({currentUser?.email})</div>
              <div><b>Role:</b> {currentUser?.role}</div>
              <div><b>API:</b> {API_BASE}</div>
              <div><b>Backend:</b> {apiHealth}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="button" onClick={handleHealthCheck}>Check connection</button>
              <button className="button primary" onClick={handleLogout}>Sign out</button>
            </div>
          </section>}

          {active === "Help Center" && <section className="panel" style={{ margin: "0 20px 20px", padding: 18 }}>
            <h2 style={{ margin: "0 0 14px", font: "700 16px Manrope, sans-serif" }}>Admin help</h2>
            <div style={{ color: "#59616c", fontSize: 12, lineHeight: 1.8 }}>
              <p>1. Create employee accounts from the Employees tab.</p>
              <p>2. Create shifts from the Schedule tab and assign employees.</p>
              <p>3. The office attendance QR refreshes every 15 seconds.</p>
              <p>4. Select a date range in Attendance, then export the records as a CSV file.</p>
              <p>Backend API: <code>{API_BASE}</code></p>
            </div>
            <button className="button" onClick={handleHealthCheck}>Check backend connection</button>
            <span style={{ marginLeft: 10, color: "#717986", fontSize: 11 }}>{apiHealth}</span>
          </section>}
        </main>
      </div>

      {showAdd && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAdd(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Add Employee</h2>
            <p>Create a secure employee sign-in account. An employee ID will be generated automatically.</p>

            <form className="form" onSubmit={handleAddEmployee}>
              {currentUser?.isCompanyOwner && <label>Account role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select></label>}
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Enter employee name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="employee@company.com"
                  required
                />
              </label>

              <label>
                Temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={8}
                  required
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={busy}>
                  {busy ? "Creating…" : "Create employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddShift && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddShift(false); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Create shift</h2>
            <p>Use 24-hour HH:mm times. Assign active employees so they can scan the attendance QR.</p>
            <form className="form" onSubmit={handleCreateShift}>
              <label>Shift name
                <input value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} maxLength={80} required />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Start time
                  <input type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} required />
                </label>
                <label>End time
                  <input type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} required />
                </label>
              </div>
              <label>Assign employees
                <select multiple value={shiftForm.assignedEmployees} onChange={(event) => setShiftForm({ ...shiftForm, assignedEmployees: [...event.target.selectedOptions].map((option) => option.value) })} style={{ minHeight: 110 }}>
                  {employees.filter((employee) => employee.isActive).map((employee) => <option key={employee.userId} value={employee.userId}>{employee.name} · {employee.id}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setShowAddShift(false)}>Cancel</button>
                <button type="submit" className="button primary" disabled={busy}>{busy ? "Creating…" : "Create shift"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDatePicker && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDatePicker(false); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Choose report date</h2>
            <p>The selected period ends on this date.</p>
            <form className="form" onSubmit={(event) => { event.preventDefault(); changeReportDate(draftReportDate); setShowDatePicker(false); }}>
              <label>Date
                <input type="date" value={draftReportDate} onChange={(event) => setDraftReportDate(event.target.value)} required />
              </label>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setShowDatePicker(false)}>Cancel</button>
                <button type="submit" className="button primary">Apply date</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && <div className="notice">{notice}</div>}
    </div>
  );
}

