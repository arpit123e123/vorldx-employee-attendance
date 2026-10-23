import api from "./api";
import { getAuthToken } from "./authService";

async function authHeaders() {
  const token = await getAuthToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

export async function getMyLeaveRequests() {
  const response = await api.get("/leave-requests/me", { headers: await authHeaders() });
  if (!response.data?.success) throw new Error(response.data?.message || "Leave requests could not be loaded.");
  return response.data.data?.requests || [];
}

export async function submitLeaveRequest({ leaveType, startDate, endDate, reason }) {
  const response = await api.post("/leave-requests", { leaveType, startDate, endDate, reason }, { headers: await authHeaders() });
  if (!response.data?.success) throw new Error(response.data?.message || "The leave request could not be submitted.");
  return response.data.data?.request;
}
