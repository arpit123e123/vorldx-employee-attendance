
import axios from "axios";
import Constants from "expo-constants";

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  // Expo provides hostUri as host:port. Keep its host and use the backend port.
  const host = hostUri
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, "")
    .split("/")[0]
    .replace(/:\d+$/, "");

  return host ? `http://${host}:5000/api` : null;
}

// Set EXPO_PUBLIC_API_URL in employee-app-temp/.env for a remote or deployed API.
// During Expo Go development, reuse the reachable host Expo uses for this device.
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? getExpoHost() || "" : "");

if (!configuredBaseUrl) {
  throw new Error("Set EXPO_PUBLIC_API_URL or launch Expo on the same network as the API.");
}

if (!__DEV__ && !/^https:\/\//i.test(configuredBaseUrl)) {
  throw new Error("Set EXPO_PUBLIC_API_URL to the HTTPS production API URL.");
}

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
