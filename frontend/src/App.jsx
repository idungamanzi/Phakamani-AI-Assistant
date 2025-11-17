import React, { useEffect, useState } from "react";
import ChatShell from "./components/ChatShell";
import Login from "./pages/Login";
import { getAuthToken, clearAuth } from "./api";

export default function App() {
  const [authed, setAuthed] = useState(!!getAuthToken());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for auth changes from other tabs
    function onStorage(e) {
      if (e.key === "auth_cleared_at") {
        setAuthed(false);
      }
      if (e.key === "access_token" || e.key === "auth_cleared_at") {
        setAuthed(!!getAuthToken());
      }
    }
    window.addEventListener("storage", onStorage);
    setChecking(false);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (checking) return null;

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return <ChatShell onLogout={() => { clearAuth(); setAuthed(false); window.location.reload(); }} />;
}
