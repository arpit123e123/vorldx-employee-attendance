import api from "./api";
import { getAuthToken } from "./authService";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthString(date = new Date()) {
  return getLocalDateString(date).slice(0, 7);
}

export async function getDashboardAttendance(month = getMonthString()) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session expired. Please log in again.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const today = getLocalDateString();


  const [summaryResponse, historyResponse] = await Promise.all([
    api.get("/attendance/summary", {
      headers,
      params: { month },
    }),
    api.get("/attendance/history", {
      headers,
      params: { from: today, to: today },
    }),
  ]);

  if (!summaryResponse.data?.success) {
    throw new Error("Attendance summary could not be loaded.");
  }

  if (!historyResponse.data?.success) {
    throw new Error("Today's attendance could not be loaded.");
  }

  const summary = summaryResponse.data.data;
  const records = historyResponse.data.data?.records || [];

  return {
    summary,
    todayRecord: records[0] || null,
    today,
  };
}

export async function getMyShift() {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session expired. Please log in again.");
  }

  const response = await api.get("/shifts/my-shift", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.data?.success) {
    throw new Error(
      response.data?.message || "The assigned shift could not be loaded."
    );
  }

  return response.data.data?.shift || null;
}

export function formatAttendanceTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatWorkingHours(hours, minutes) {
  return `${Number(hours || 0)}h ${Number(minutes || 0)}m`;
}

export async function verifyScannedQR(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("This QR code is invalid. Please scan it again.");
  }

  const authToken = await getAuthToken();

  if (!authToken) {
    throw new Error("Your login session has expired. Please sign in again.");
  }

  const response = await api.post(
    "/qr/verify",
    { token: token.trim() },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.data?.success) {
    throw new Error(
      response.data?.message || "QR verification failed."
    );
  }

  return response.data;
}

export async function getMyDailyLateStatus(date) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await api.get(
    "/attendance/late-arrival/me/daily",
    {
      params: date ? { date } : {},
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.data?.success) {
    throw new Error("Daily late arrival status could not be loaded.");
  }

  return response.data.data;
}

export async function getMyMonthlyLateSummary(month) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await api.get(
    "/attendance/late-arrival/me/monthly",
    {
      params: month ? { month } : {},
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.data?.success) {
    throw new Error("Monthly late arrival summary could not be loaded.");
  }

  return response.data.data;
}

export async function getAttendanceHistory(from, to) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session expired. Please log in again.");
  }

  const response = await api.get("/attendance/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { from, to },
  });

  if (!response.data?.success) {
    throw new Error(
      response.data?.message || "Attendance history could not be loaded."
    );
  }

  return response.data.data?.records || [];
}

