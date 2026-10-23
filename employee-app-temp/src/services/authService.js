
import * as SecureStore from "expo-secure-store";
import api, { API_BASE_URL } from "./api";

const TOKEN_KEY = "vorldx_auth_token";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

async function readToken() {
  const storage = getBrowserStorage();
  return storage
    ? storage.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY);
}

async function saveToken(token) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken() {
  const storage = getBrowserStorage();

  if (storage) {
    storage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function loginEmployee(employeeId, password, captchaToken) {
  try {
    const response = await api.post("/auth/login", {
      employeeId: employeeId.trim(),
      password,
      captchaToken,
    });

    const data = response.data;
    const token = data?.data?.token;
    const user = data?.data?.user;

    if (!data?.success || !token || !user) {
      throw new Error("The sign-in response did not include a user or token.");
    }

    if (user.role !== "employee") {
      throw new Error("This sign-in is for employee accounts. Use your Admin/HR dashboard to sign in.");
    }
    if (!user.isActive) {
      throw new Error("This employee account is inactive.");
    }

    await saveToken(token);

    return user;
  } catch (error) {
    console.log("LOGIN ERROR:", error.message);
    console.log(
      "LOGIN URL:",
      `${error.config?.baseURL || API_BASE_URL}${error.config?.url || "/auth/login"}`,
    );
    console.log("LOGIN CODE:", error.code);
    console.log("LOGIN STATUS:", error.response?.status);
    throw error;
  }
}

export async function getSavedSession() {
  const token = await readToken();

  if (!token) return null;

  try {
    const response = await api.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const user = response.data?.data?.user;

    if (
      !response.data?.success ||
      !user ||
      user.role !== "employee" ||
      !user.isActive
    ) {
      await logoutEmployee();
      return null;
    }

    return user;
  } catch (error) {
    if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      await logoutEmployee();
    }

    return null;
  }
}

export async function logoutEmployee() {
  await clearToken();
}

export async function getAuthToken() {
  return readToken();
}
