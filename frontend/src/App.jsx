import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // WORKSPACES
  // ==========================================

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceName, setWorkspaceName] = useState("");

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [fetchingWorkspaces, setFetchingWorkspaces] = useState(false);

  // ==========================================
  // SELECTED WORKSPACE
  // ==========================================

  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [members, setMembers] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // ==========================================
  // INITIAL AUTHENTICATION
  // ==========================================

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

      if (event === "SIGNED_OUT") {
        setSelectedWorkspace(null);
        setMembers([]);
        setWorkspaces([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // AUTHENTICATED API REQUESTS
  // ==========================================

  async function authenticatedFetch(path, options = {}) {
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error || !currentSession) {
      throw new Error("Session expired. Please log in again.");
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
          : `Request failed (${response.status})`
      );
    }

    return response.json();
  }

  // ==========================================
  // LOGIN / SIGNUP
  // ==========================================

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

        if (!data.session) {
          setMessage(
            "Registration successful! Check your email for verification."
          );
        } else {
          setMessage("Account created successfully!");
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
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedWorkspace(null);
    setMembers([]);
    setWorkspaces([]);
    setEmail("");
    setPassword("");
    setMessage("");
  }

  // ==========================================
  // LOAD WORKSPACES
  // ==========================================

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

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
    }
  }, [session?.user?.id]);

  // ==========================================
  // CREATE WORKSPACE
  // ==========================================

  async function createWorkspace(event) {
    event.preventDefault();

    const name = workspaceName.trim();

    if (name.length < 3) {
      setMessage("Workspace name must have at least 3 characters.");
      return;
    }

    setWorkspaceLoading(true);
    setMessage("");

    try {
      await authenticatedFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
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

  // ==========================================
  // OPEN WORKSPACE
  // ==========================================

  async function openWorkspace(workspaceId) {
    setLoadingWorkspace(true);
    setMessage("");
    setMembers([]);

    try {
      const [workspaceData, membersData] = await Promise.all([
        authenticatedFetch(`/api/workspaces/${workspaceId}`),
        authenticatedFetch(`/api/workspaces/${workspaceId}/members`),
      ]);

      setSelectedWorkspace(workspaceData);
      setMembers(membersData);
      setActiveTab("overview");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingWorkspace(false);
    }
  }

  // ==========================================
  // BACK TO WORKSPACES
  // ==========================================

  function backToWorkspaces() {
    setSelectedWorkspace(null);
    setMembers([]);
    setActiveTab("overview");
    setMessage("");
  }

  // ==========================================
  // MEMBER DISPLAY NAME
  // ==========================================

  function getMemberName(member) {
    if (member.user_id === session?.user?.id) {
      return "You";
    }

    return `Member ${member.user_id.substring(0, 8)}...`;
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="container">
        <h1>NewsCraft AI</h1>
        <p>Loading application...</p>
      </div>
    );
  }

  // ==========================================
  // LOGIN / SIGNUP PAGE
  // ==========================================

  if (!session) {
    return (
      <div className="container auth-container">
        <h1>NewsCraft AI</h1>

        <p className="subtitle">
          AI-Powered Newsletter Automation System
        </p>

        <div className="status-card">
          <h2>{isSignup ? "Create Account" : "Login"}</h2>

          <form onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : isSignup
                ? "Create Account"
                : "Login"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <p>
            {isSignup
              ? "Already have an account?"
              : "Don't have an account?"}
          </p>

          <button
            className="secondary-btn"
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

  // ==========================================
  // WORKSPACE DASHBOARD
  // ==========================================

  if (selectedWorkspace) {
    return (
      <div className="container dashboard-container">
        <header className="app-header">
          <div>
            <h1>NewsCraft AI</h1>
            <p className="subtitle">
              AI-Powered Newsletter Automation System
            </p>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <button className="back-btn" onClick={backToWorkspaces}>
          ← Back to Workspaces
        </button>

        <div className="workspace-header">
          <h2>{selectedWorkspace.name}</h2>

          <span className="role-badge">
            {selectedWorkspace.role}
          </span>
        </div>

        {/* NAVIGATION TABS */}

        <div className="tabs">
          <button
            className={activeTab === "overview" ? "active-tab" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>

          <button
            className={activeTab === "members" ? "active-tab" : ""}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>

          <button
            className={activeTab === "newsletters" ? "active-tab" : ""}
            onClick={() => setActiveTab("newsletters")}
          >
            Newsletters
          </button>
        </div>

        {/* OVERVIEW */}

        {activeTab === "overview" && (
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Team Members</h3>
              <p className="stat-number">{members.length}</p>
              <p>Members in this workspace</p>
            </div>

            <div className="dashboard-card">
              <h3>Newsletters</h3>
              <p className="stat-number">—</p>
              <p>Newsletter management coming soon</p>
            </div>

            <div className="dashboard-card">
              <h3>Your Role</h3>
              <p className="stat-number role-text">
                {selectedWorkspace.role}
              </p>
              <p>Workspace permissions</p>
            </div>
          </div>
        )}

        {/* MEMBERS */}

        {activeTab === "members" && (
          <div className="dashboard-card">
            <div className="section-header">
              <h3>Workspace Members</h3>

              {selectedWorkspace.role === "admin" && (
                <button disabled>
                  + Invite Member — Coming Soon
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <p>No members found.</p>
            ) : (
              <div className="members-list">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="member-item"
                  >
                    <div>
                      <strong>{getMemberName(member)}</strong>
                      <p>
                        Joined:{" "}
                        {member.joined_at
                          ? new Date(
                              member.joined_at
                            ).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>

                    <span className="role-badge">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEWSLETTERS */}

        {activeTab === "newsletters" && (
          <div className="dashboard-card">
            <h3>Newsletters</h3>

            <p>
              No newsletters created yet.
            </p>

            <button disabled>
              + Create Newsletter — Coming Soon
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <div className="container dashboard-container">
      <header className="app-header">
        <div>
          <h1>NewsCraft AI</h1>

          <p className="subtitle">
            AI-Powered Newsletter Automation System
          </p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="welcome-card">
        <h2>Welcome to your Dashboard!</h2>

        <p>
          Logged in as: <strong>{session.user.email}</strong>
        </p>
      </div>

      {/* CREATE WORKSPACE */}

      <div className="dashboard-card">
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
              ? "Creating..."
              : "Create Workspace"}
          </button>
        </form>
      </div>

      {/* WORKSPACES */}

      <div className="dashboard-card">
        <h2>My Workspaces</h2>

        {fetchingWorkspaces ? (
          <p>Loading workspaces...</p>
        ) : workspaces.length === 0 ? (
          <p>No workspaces created yet.</p>
        ) : (
          <div className="workspace-list">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className="workspace-item"
                onClick={() => openWorkspace(workspace.id)}
                disabled={loadingWorkspace}
              >
                <div>
                  <h3>{workspace.name}</h3>

                  <p>
                    Your Role: <strong>{workspace.role}</strong>
                  </p>
                </div>

                <span className="workspace-arrow">→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingWorkspace && (
        <p className="message">Opening workspace...</p>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default App;