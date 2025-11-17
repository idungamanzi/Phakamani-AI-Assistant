export const API_BASE = import.meta.env.VITE_API || "http://localhost:8000";

export function getAuthToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || null;
}

export function saveAuthTokens({ access_token, refresh_token }, remember = true) {
  if (remember) {
    localStorage.setItem("access_token", access_token || "");
    if (refresh_token) {
      localStorage.setItem("refresh_token", refresh_token || "");
    }
  } else {
    sessionStorage.setItem("access_token", access_token || "");
    if (refresh_token) {
      sessionStorage.setItem("refresh_token", refresh_token || "");
    }
  }
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  localStorage.setItem("auth_cleared_at", Date.now().toString());
}

export function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      clearAuth();
      return false;
    }
    
    return true;
  } catch (error) {
    clearAuth();
    return false;
  }
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token
    ? { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      }
    : { "Content-Type": "application/json" };
}

export async function loginRequest(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Login failed");
  }

  const data = await res.json();
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
  };

  saveAuthTokens(tokens, true);
  return tokens;
}

export async function fetchChats() {
  const res = await fetch(`${API_BASE}/chats`, { 
    headers: getAuthHeaders() 
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function fetchChatMessages(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, { 
    headers: getAuthHeaders() 
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to fetch chat messages");
  return res.json();
}

export async function createOrAppendChat(message, chat_id = null) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, chat_id }),
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to create/update chat");
  }
  return res.json();
}

export async function generateTitle(message) {
  const res = await fetch(`${API_BASE}/chat-title`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to generate title");
  
  const json = await res.json();
  const title = (json.title || "").replace(/^Title:\s*/i, "").trim();
  return title || "New Chat";
}

export async function streamChat(chatId, message, onChunk, onError) {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/stream`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    });

    if (res.status === 401) {
      clearAuth();
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Stream failed");
    }

    if (!res.body) {
      const data = await res.json();
      onChunk(data.response || data);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let finished = false;
    
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

export async function deleteChat(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to delete chat");
  return { success: true };
}

export async function updateChatTitle(chatId, title) {
  const res = await fetch(`${API_BASE}/chats/${chatId}/title`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message: title }),
  });
  
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to update chat title");
  return res.json();
}