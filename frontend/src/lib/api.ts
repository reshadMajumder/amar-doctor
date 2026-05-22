export const API_BASE_URL = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin)
  : (process.env.NEXT_PUBLIC_API_URL || "http://app:8000");


export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

interface RequestOptions extends RequestInit {
  body?: any;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function handleTokenRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      const newAccess = data.access;
      const newRefresh = data.refresh || refresh;
      setTokens(newAccess, newRefresh);
      return newAccess;
    }
  } catch (err) {
    console.error("Failed to refresh token", err);
  }

  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/auth";
  }
  return null;
}

export async function fetchWithAuth(endpoint: string, options: RequestOptions = {}): Promise<any> {
  // Ensure trailing slash for DRF
  let cleanEndpoint = endpoint;
  if (!cleanEndpoint.startsWith("http")) {
    const pathAndQuery = cleanEndpoint.split("?");
    let path = pathAndQuery[0];
    if (!path.endsWith("/")) {
      path += "/";
    }
    cleanEndpoint = `${API_BASE_URL}/${path.replace(/^\//, "")}`;
    if (pathAndQuery[1]) {
      cleanEndpoint += `?${pathAndQuery[1]}`;
    }
  }

  const headers = new Headers(options.headers || {});
  
  // Set Auth Header
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set Content-Type header if body is JSON
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  };

  try {
    const response = await fetch(cleanEndpoint, fetchOptions);

    if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            headers.set("Authorization", `Bearer ${newToken}`);
            resolve(fetch(cleanEndpoint, fetchOptions).then((r) => r.json()));
          });
        });
      }

      isRefreshing = true;
      const newToken = await handleTokenRefresh();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryOptions = {
          ...fetchOptions,
          headers,
        };
        const retryRes = await fetch(cleanEndpoint, retryOptions);
        return await retryRes.json();
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || "An error occurred",
        errors: errorData.errors || null,
        raw: errorData,
      };
    }

    return await response.json();
  } catch (error: any) {
    if (error.status) throw error;
    throw {
      status: 500,
      message: error.message || "Network Error",
      errors: null,
    };
  }
}

export const api = {
  get: (endpoint: string, options?: RequestOptions) => fetchWithAuth(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body?: any, options?: RequestOptions) => fetchWithAuth(endpoint, { ...options, method: "POST", body }),
  patch: (endpoint: string, body?: any, options?: RequestOptions) => fetchWithAuth(endpoint, { ...options, method: "PATCH", body }),
  put: (endpoint: string, body?: any, options?: RequestOptions) => fetchWithAuth(endpoint, { ...options, method: "PUT", body }),
  delete: (endpoint: string, options?: RequestOptions) => fetchWithAuth(endpoint, { ...options, method: "DELETE" }),
};
