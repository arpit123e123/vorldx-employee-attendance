import api from "./api";
import { getAuthToken } from "./authService";

async function getAuthHeaders() {
  const token = await getAuthToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

export async function getMyWfhRequests() {
  const response = await api.get("/wfh-requests/me", { headers: await getAuthHeaders() });
  if (!response.data?.success) {
    throw new Error(response.data?.message || "Work from home requests could not be loaded.");
  }
  return response.data.data?.requests || [];
}

export async function submitWfhRequest({ date, reason }) {
  const response = await api.post(
    "/wfh-requests",
    { date, reason },
    { headers: await getAuthHeaders() },
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || "The work from home request could not be submitted.");
  }
  return response.data.data?.request;
}
