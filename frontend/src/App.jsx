import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // =====================================================
  // AUTHENTICATION STATE
  // =====================================================

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // WORKSPACE STATE
  // =====================================================

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaces, setWorkspaces] = useState([]);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [fetchingWorkspaces, setFetchingWorkspaces] = useState(false);

  // =====================================================
  // CHECK AUTHENTICATION SESSION
  // =====================================================

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setMessage(error.message);
      }

      setSession(data.session);
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;

      setSession(newSession);
      setLoading(false);

      if (event === "SIGNED_IN") {
        setMessage("");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // SIGN UP / LOGIN
  // =====================================================

  async function handleAuth(event) {
    event.preventDefault();

    setMessage("");
    setSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Account created successfully!");
        } else {
          setMessage(
            "Check your email and click the verification link."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("");
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setWorkspaces([]);
      setWorkspaceName("");
      setEmail("");
      setPassword("");
    }
  }

  // =====================================================
  // AUTHENTICATED API REQUEST
  // =====================================================

  async function authenticatedFetch(path, options = {}) {
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error || !currentSession) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        typeof errorData.detail === "string"
          ? errorData.detail
          : `Request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  // =====================================================
  // FETCH USER WORKSPACES
  // =====================================================

  async function loadWorkspaces() {
    setFetchingWorkspaces(true);

    try {
      const data = await authenticatedFetch("/api/workspaces");

      setWorkspaces(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFetchingWorkspaces(false);
    }
  }

  // =====================================================
  // LOAD WORKSPACES AFTER LOGIN
  // =====================================================

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
    }
  }, [session?.user?.id]);

  // =====================================================
  // CREATE WORKSPACE
  // =====================================================

  async function createWorkspace(event) {
    event.preventDefault();

    const name = workspaceName.trim();

    if (name.length < 3) {
      setMessage("Workspace name must contain at least 3 characters.");
      return;
    }

    setWorkspaceLoading(true);
    setMessage("");

    try {
      await authenticatedFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name,
        }),
      });

      setWorkspaceName("");

      await loadWorkspaces();

      setMessage("Workspace created successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <div className="container">
        <h1>NewsCraft AI</h1>
        <p>Loading your application...</p>
      </div>
    );
  }

  // =====================================================
  // AUTHENTICATED DASHBOARD
  // =====================================================

  if (session) {
    return (
      <div className="container">
        <h1>NewsCraft AI</h1>

        <p>AI-Powered Newsletter Automation System</p>

        {/* USER INFORMATION */}

        <div className="status-card">
          <h2>Welcome to your Dashboard!</h2>

          <p>
            Logged in as: <strong>{session.user.email}</strong>
          </p>

          <p>Your account is authenticated successfully.</p>
        </div>

        {/* CREATE WORKSPACE */}

        <div className="status-card">
          <h2>Create Newsletter Workspace</h2>

          <p>
            Create a shared workspace for your department's newsletter team.
          </p>

          <form onSubmit={createWorkspace}>
            <input
              type="text"
              placeholder="e.g. ECE Newsletter Team"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              minLength={3}
              maxLength={100}
              required
            />

            <button type="submit" disabled={workspaceLoading}>
              {workspaceLoading
                ? "Creating Workspace..."
                : "Create Workspace"}
            </button>
          </form>
        </div>

        {/* WORKSPACE LIST */}

        <div className="status-card">
          <h2>My Workspaces</h2>

          {fetchingWorkspaces ? (
            <p>Loading workspaces...</p>
          ) : workspaces.length === 0 ? (
            <p>No workspaces created yet.</p>
          ) : (
            workspaces.map((workspace) => (
              <div key={workspace.id} className="workspace-item">
                <h3>{workspace.name}</h3>

                <p>
                  Your Role: <strong>{workspace.role}</strong>
                </p>
              </div>
            ))
          )}
        </div>

        {/* STATUS MESSAGE */}

        {message && (
          <div className="status-card">
            <p>{message}</p>
          </div>
        )}

        {/* LOGOUT */}

        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  // =====================================================
  // LOGIN / SIGNUP PAGE
  // =====================================================

  return (
    <div className="container">
      <h1>NewsCraft AI</h1>

      <p>AI-Powered Newsletter Automation System</p>

      <div className="status-card">
        <h2>{isSignup ? "Create Account" : "Login"}</h2>

        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : isSignup
              ? "Sign Up"
              : "Login"}
          </button>
        </form>

        {message && <p>{message}</p>}

        <p>
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}
        </p>

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
        >
          {isSignup ? "Go to Login" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

export default App;