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
// NEWSLETTERS
// ==========================================

const [newsletters, setNewsletters] = useState([]);
const [newsletterTitle, setNewsletterTitle] = useState("");

const [showNewsletterForm, setShowNewsletterForm] = useState(false);
const [creatingNewsletter, setCreatingNewsletter] = useState(false);
const [loadingNewsletters, setLoadingNewsletters] = useState(false);

const [selectedNewsletter, setSelectedNewsletter] = useState(null);

// ==========================================
// ARTICLES
// ==========================================

const [articles, setArticles] = useState([]);
const [articleHeading, setArticleHeading] = useState("");
const [articleContent, setArticleContent] = useState("");

const [showArticleForm, setShowArticleForm] = useState(false);
const [creatingArticle, setCreatingArticle] = useState(false);
const [loadingArticles, setLoadingArticles] = useState(false);
  // ==========================================
  // INVITATIONS
  // ==========================================

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");

  const [inviting, setInviting] = useState(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);

  // Read invitation token from URL.
  const [inviteToken, setInviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite") || "";
  });
// ==========================================
// GMAIL INTEGRATION
// ==========================================

const [gmailStatus, setGmailStatus] = useState({
  connected: false,
  email: null,
});

const [gmailLoading, setGmailLoading] = useState(false);
const [gmailConnecting, setGmailConnecting] = useState(false);
const [gmailMessage, setGmailMessage] = useState("");

// ==========================================
// GMAIL INBOX
// ==========================================

const [gmailMessages, setGmailMessages] = useState([]);
const [showGmailInbox, setShowGmailInbox] = useState(false);
const [loadingGmailMessages, setLoadingGmailMessages] = useState(false);
const [selectedEmails, setSelectedEmails] = useState([]);
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
            // Preserve invitation token during email verification.
            emailRedirectTo: window.location.href,
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


// ==========================================
// LOAD WORKSPACES AND GMAIL STATUS
// ==========================================

useEffect(() => {
  if (session?.user?.id) {
    loadWorkspaces();
    checkGmailStatus();
  } else {
    setWorkspaces([]);
    setGmailStatus({
      connected: false,
      email: null,
    });
  }
}, [session?.user?.id]);


// ==========================================
// HANDLE GMAIL OAUTH CALLBACK
// ==========================================

useEffect(() => {
  if (!session?.user?.id) return;

  const params = new URLSearchParams(window.location.search);
  const result = params.get("gmail");

  if (!result) return;

  if (result === "connected") {
    setGmailMessage("Gmail connected successfully!");
    checkGmailStatus();
  } else {
    setGmailMessage(
      "Gmail connection was not completed. Please try again."
    );
  }

  params.delete("gmail");

  const remainingQuery = params.toString();

  window.history.replaceState(
    {},
    "",
    window.location.pathname +
      (remainingQuery ? `?${remainingQuery}` : "")
  );
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
  setNewsletters([]);

  try {
    const [workspaceData, membersData, newslettersData] =
      await Promise.all([
        authenticatedFetch(`/api/workspaces/${workspaceId}`),

        authenticatedFetch(
          `/api/workspaces/${workspaceId}/members`
        ),

        authenticatedFetch(
          `/api/workspaces/${workspaceId}/newsletters`
        ),
      ]);

    setSelectedWorkspace(workspaceData);
    setMembers(membersData);
    setNewsletters(newslettersData);

    setSelectedNewsletter(null);
    setActiveTab("overview");

    setShowInviteForm(false);
    setInvitationLink("");
    setShowNewsletterForm(false);
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
  setSelectedNewsletter(null);

  setMembers([]);
  setNewsletters([]);

  setActiveTab("overview");

  setShowInviteForm(false);
  setInvitationLink("");

  setShowNewsletterForm(false);
  setNewsletterTitle("");

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
// LOAD NEWSLETTERS
// ==========================================

async function loadNewsletters(workspaceId) {
  setLoadingNewsletters(true);

  try {
    const data = await authenticatedFetch(
      `/api/workspaces/${workspaceId}/newsletters`
    );

    setNewsletters(data);
  } catch (error) {
    setMessage(error.message);
  } finally {
    setLoadingNewsletters(false);
  }
}


// ==========================================
// CREATE NEWSLETTER
// ==========================================

async function createNewsletter(event) {
  event.preventDefault();

  if (!selectedWorkspace) return;

  const title = newsletterTitle.trim();

  if (title.length < 3) {
    setMessage("Newsletter title must contain at least 3 characters.");
    return;
  }

  setCreatingNewsletter(true);
  setMessage("");

  try {
    await authenticatedFetch(
      `/api/workspaces/${selectedWorkspace.id}/newsletters`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      }
    );

    setNewsletterTitle("");
    setShowNewsletterForm(false);

    await loadNewsletters(selectedWorkspace.id);

    setMessage("Newsletter created successfully!");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setCreatingNewsletter(false);
  }
}


// ==========================================
// OPEN NEWSLETTER
// ==========================================

// ==========================================
// LOAD ARTICLES
// ==========================================

async function loadArticles(newsletterId) {
  setLoadingArticles(true);

  try {
    const data = await authenticatedFetch(
      `/api/newsletters/${newsletterId}/articles`
    );

    setArticles(data);
  } catch (error) {
    setMessage(error.message);
  } finally {
    setLoadingArticles(false);
  }
}


// ==========================================
// OPEN NEWSLETTER
// ==========================================

async function openNewsletter(newsletter) {
  setSelectedNewsletter(newsletter);
  setArticles([]);
  setShowArticleForm(false);
  setMessage("");

  await loadArticles(newsletter.id);
}


// ==========================================
// CREATE ARTICLE
// ==========================================

async function createArticle(event) {
  event.preventDefault();

  if (!selectedNewsletter) return;

  const heading = articleHeading.trim();
  const content = articleContent.trim();

  if (heading.length < 3 || content.length < 10) {
    setMessage(
      "Article heading must have at least 3 characters and content at least 10."
    );
    return;
  }

  setCreatingArticle(true);
  setMessage("");

  try {
    await authenticatedFetch(
      `/api/newsletters/${selectedNewsletter.id}/articles`,
      {
        method: "POST",
        body: JSON.stringify({
          heading,
          content,
        }),
      }
    );

    setArticleHeading("");
    setArticleContent("");
    setShowArticleForm(false);

    await loadArticles(selectedNewsletter.id);

    setMessage("Article created successfully!");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setCreatingArticle(false);
  }
}
  // ==========================================
  // GENERATE INVITATION
  // ==========================================

  async function createInvitation(event) {
    event.preventDefault();

    if (!selectedWorkspace || selectedWorkspace.role !== "admin") {
      setMessage("Only workspace administrators can invite members.");
      return;
    }

    setInviting(true);
    setMessage("");
    setInvitationLink("");

    try {
      const data = await authenticatedFetch(
        `/api/workspaces/${selectedWorkspace.id}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
          }),
        }
      );

      setInvitationLink(data.invitation_link);
      setInviteEmail("");

      setMessage(
        "Invitation created successfully! Copy the link and share it."
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setInviting(false);
    }
  }

  // ==========================================
  // COPY INVITATION LINK
  // ==========================================

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setMessage("Invitation link copied to clipboard!");
    } catch {
      setMessage(
        "Unable to copy automatically. Select the link and copy it manually."
      );
    }
  }

  // ==========================================
  // ACCEPT INVITATION
  // ==========================================

  async function acceptInvitation() {
    if (!inviteToken || acceptingInvitation) return;

    setAcceptingInvitation(true);
    setMessage("");

    try {
      const data = await authenticatedFetch(
        `/api/invitations/accept?token=${encodeURIComponent(inviteToken)}`,
        {
          method: "POST",
        }
      );

      // Remove token from URL after successful acceptance.
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");

      window.history.replaceState({}, "", url.toString());

      setInviteToken("");
      setMessage(data.message);

      // Refresh workspace list.
      await loadWorkspaces();

      // Open the workspace the user just joined.
      await openWorkspace(data.workspace_id);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAcceptingInvitation(false);
    }
  }
// ==========================================
// CHECK GMAIL CONNECTION
// ==========================================

async function checkGmailStatus() {
  setGmailLoading(true);

  try {
    const data = await authenticatedFetch("/api/gmail/status");

    setGmailStatus(data);
  } catch (error) {
    setGmailMessage(error.message);
  } finally {
    setGmailLoading(false);
  }
}


// ==========================================
// CONNECT GMAIL
// ==========================================

async function connectGmail() {
  setGmailConnecting(true);
  setGmailMessage("");

  try {
    const data = await authenticatedFetch("/api/gmail/connect");

    if (!data.authorization_url) {
      throw new Error("Google authorization URL was not returned.");
    }

    window.location.assign(data.authorization_url);
  } catch (error) {
    setGmailMessage(error.message);
    setGmailConnecting(false);
  }
}

// ==========================================
// FETCH GMAIL MESSAGES
// ==========================================

async function loadGmailMessages() {
  setLoadingGmailMessages(true);
  setGmailMessage("");

  try {
    const data = await authenticatedFetch("/api/gmail/messages");

    setGmailMessages(data.messages || []);
    setShowGmailInbox(true);
  } catch (error) {
    setGmailMessage(error.message);
  } finally {
    setLoadingGmailMessages(false);
  }
}

// ==========================================
// SELECT / DESELECT EMAILS
// ==========================================

function toggleEmailSelection(emailId) {
  setSelectedEmails((previous) =>
    previous.includes(emailId)
      ? previous.filter((id) => id !== emailId)
      : [...previous, emailId]
  );
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

          {inviteToken && (
            <p className="message">
              You've been invited to join a NewsCraft AI workspace.
              Please log in or create an account to continue.
            </p>
          )}

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
  // INVITATION ACCEPTANCE SCREEN
  // ==========================================

  if (inviteToken) {
    return (
      <div className="container auth-container">
        <h1>NewsCraft AI</h1>

        <p className="subtitle">
          Workspace Invitation
        </p>

        <div className="status-card">
          <h2>You've Been Invited!</h2>

          <p>
            You're logged in as:
          </p>

          <p>
            <strong>{session.user.email}</strong>
          </p>

          <p>
            Click below to accept the invitation and join the workspace.
          </p>

          <button
            onClick={acceptInvitation}
            disabled={acceptingInvitation}
          >
            {acceptingInvitation
              ? "Joining Workspace..."
              : "Accept Invitation"}
          </button>

          <button
            className="secondary-btn"
            onClick={handleLogout}
          >
            Switch Account
          </button>

          {message && <p className="message">{message}</p>}
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

              <p className="stat-number">
                {newsletters.length}
              </p>

              <p>Total newsletters in this workspace</p>
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
                <button
                  onClick={() => {
                    setShowInviteForm(!showInviteForm);
                    setInvitationLink("");
                    setMessage("");
                  }}
                >
                  {showInviteForm
                    ? "Cancel"
                    : "+ Invite Member"}
                </button>
              )}
            </div>

            {/* INVITATION FORM */}

            {showInviteForm && selectedWorkspace.role === "admin" && (
              <div className="invite-panel">
                <h3>Invite a Team Member</h3>

                <p>
                  Invite faculty members or student editors to collaborate
                  on your department newsletter.
                </p>

                <form onSubmit={createInvitation}>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(event) =>
                      setInviteEmail(event.target.value)
                    }
                    required
                  />

                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value)
                    }
                  >
                    <option value="editor">Editor</option>
                    <option value="faculty">Faculty</option>
                  </select>

                  <button type="submit" disabled={inviting}>
                    {inviting
                      ? "Generating..."
                      : "Generate Invitation"}
                  </button>
                </form>

                {invitationLink && (
                  <div className="invitation-result">
                    <h4>Invitation Link Generated</h4>

                    <p>
                      Share this link with the invited person.
                      It expires after seven days.
                    </p>

                    <input
                      type="text"
                      value={invitationLink}
                      readOnly
                    />

                    <button onClick={copyInvitationLink}>
                      Copy Invitation Link
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MEMBERS LIST */}

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

            {message && <p className="message">{message}</p>}
          </div>
        )}

{/* ==========================================
    NEWSLETTERS
========================================== */}

{activeTab === "newsletters" && (
  <div className="dashboard-card">

    {selectedNewsletter ? (

      // ======================================
      // SELECTED NEWSLETTER
      // ======================================

      <div className="newsletter-details">

        <button
          className="back-btn"
          onClick={() => setSelectedNewsletter(null)}
        >
          ← Back to Newsletters
        </button>

        <h2>{selectedNewsletter.title}</h2>

        <div className="newsletter-info">

          <p>
            <strong>Status:</strong>{" "}
            <span className="newsletter-status">
              {selectedNewsletter.status}
            </span>
          </p>

          <p>
            <strong>Created:</strong>{" "}
            {selectedNewsletter.created_at
              ? new Date(
                  selectedNewsletter.created_at
                ).toLocaleDateString()
              : "Unknown"}
          </p>

        </div>

<div className="articles-section">

  <div className="section-header">
    <h3>Newsletter Articles</h3>

    {["admin", "editor"].includes(selectedWorkspace.role) && (
      <button
        onClick={() => {
          setShowArticleForm(!showArticleForm);
          setMessage("");
        }}
      >
        {showArticleForm ? "Cancel" : "+ Add Article"}
      </button>
    )}
  </div>

  {/* ADD ARTICLE FORM */}

  {showArticleForm && (
    <div className="article-form">
      <h3>Add New Article</h3>

      <form onSubmit={createArticle}>
        <label>Article Heading</label>

        <input
          type="text"
          placeholder="e.g. Students Win National Hackathon"
          value={articleHeading}
          onChange={(event) =>
            setArticleHeading(event.target.value)
          }
          minLength={3}
          maxLength={200}
          required
        />

        <label>Article Content</label>

        <textarea
          placeholder="Write the article paragraph here..."
          value={articleContent}
          onChange={(event) =>
            setArticleContent(event.target.value)
          }
          rows={7}
          minLength={10}
          required
        />

        <button type="submit" disabled={creatingArticle}>
          {creatingArticle ? "Saving..." : "Save Article"}
        </button>
      </form>
    </div>
  )}

  {/* ARTICLE LIST */}

  {loadingArticles ? (
    <p>Loading articles...</p>
  ) : articles.length === 0 ? (
    <div className="newsletter-empty">
      <h3>No Articles Yet</h3>
      <p>Add your first article to this newsletter.</p>
    </div>
  ) : (
    <div className="article-list">
      {articles.map((article) => (
        <div key={article.id} className="article-item">
          <div className="article-item-header">
            <h3>{article.heading}</h3>

            <span className="newsletter-status">
              {article.status}
            </span>
          </div>

          <p className="article-content">
            {article.content}
          </p>

          <p className="article-date">
            Created:{" "}
            {article.created_at
              ? new Date(article.created_at).toLocaleDateString()
              : "Unknown"}
          </p>
        </div>
      ))}
    </div>
  )}

  {message && <p className="message">{message}</p>}
</div>

      </div>

    ) : (

      // ======================================
      // NEWSLETTER LIST
      // ======================================

      <>

        <div className="section-header">

          <h3>Newsletters</h3>

          {["admin", "editor"].includes(
            selectedWorkspace.role
          ) && (

            <button
              onClick={() => {
                setShowNewsletterForm(
                  !showNewsletterForm
                );

                setMessage("");
              }}
            >
              {showNewsletterForm
                ? "Cancel"
                : "+ Create Newsletter"}
            </button>

          )}

        </div>

        {/* CREATE NEWSLETTER FORM */}

        {showNewsletterForm && (
          <div className="newsletter-form">

            <h3>Create New Newsletter</h3>

            <p>
              Create a newsletter for your department.
              You can add articles and photographs later.
            </p>

            <form onSubmit={createNewsletter}>

              <input
                type="text"
                placeholder="e.g. ECE Department Newsletter — November 2026"
                value={newsletterTitle}
                onChange={(event) =>
                  setNewsletterTitle(event.target.value)
                }
                minLength={3}
                maxLength={200}
                required
              />

              <button
                type="submit"
                disabled={creatingNewsletter}
              >
                {creatingNewsletter
                  ? "Creating..."
                  : "Create Newsletter"}
              </button>

            </form>

          </div>
        )}

        {/* NEWSLETTER LIST */}

        {loadingNewsletters ? (

          <p>Loading newsletters...</p>

        ) : newsletters.length === 0 ? (

          <div className="newsletter-empty">

            <h3>No Newsletters Yet</h3>

            <p>
              Create your first newsletter to get started.
            </p>

          </div>

        ) : (

          <div className="newsletter-list">

            {newsletters.map((newsletter) => (

              <div
                key={newsletter.id}
                className="newsletter-item"
              >

                <div>

                  <h3>{newsletter.title}</h3>

                  <p>
                    Created:{" "}
                    {newsletter.created_at
                      ? new Date(
                          newsletter.created_at
                        ).toLocaleDateString()
                      : "Unknown"}
                  </p>

                  <span className="newsletter-status">
                    {newsletter.status}
                  </span>

                </div>

                <button
                  onClick={() =>
                    openNewsletter(newsletter)
                  }
                >
                  Open Newsletter →
                </button>

              </div>

            ))}

          </div>

        )}

        {message && (
          <p className="message">{message}</p>
        )}

      </>

    )}

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
      {/* ==========================================
    GMAIL INTEGRATION
========================================== */}

<div className="dashboard-card gmail-card">
  <div className="section-header">
    <h2>Gmail Integration</h2>

    <span
      className={
        gmailStatus.connected
          ? "gmail-badge connected"
          : "gmail-badge disconnected"
      }
    >
      {gmailStatus.connected ? "Connected" : "Not Connected"}
    </span>
  </div>

  {gmailLoading ? (
    <p>Checking Gmail connection...</p>
  ) : gmailStatus.connected ? (
    <>
      <p>Your Gmail account is connected to NewsCraft AI.</p>

      <p>
        <strong>Connected account:</strong>{" "}
        {gmailStatus.email}
      </p>

      <p>
  Browse emails from your connected Gmail account.
</p>

<button
  onClick={() => {
    if (showGmailInbox) {
      setShowGmailInbox(false);
    } else {
      loadGmailMessages();
    }
  }}
  disabled={loadingGmailMessages}
>
  {loadingGmailMessages
    ? "Loading Emails..."
    : showGmailInbox
    ? "Hide Gmail Inbox"
    : "View Gmail Inbox"}
</button>
    </>
  ) : (
    <>
      <p>
        Connect your Gmail account to import department
        achievements, faculty updates, and event emails
        directly into your newsletters.
      </p>

      <button
        onClick={connectGmail}
        disabled={gmailConnecting}
      >
        {gmailConnecting ? "Connecting..." : "Connect Gmail"}
      </button>
    </>
  )}

  {gmailMessage && (
    <p className="message">{gmailMessage}</p>
  )}
</div>

{/* ==========================================
    GMAIL INBOX
========================================== */}

{gmailStatus.connected && showGmailInbox && (
  <div className="dashboard-card gmail-inbox">
    <div className="section-header">
      <h2>Gmail Inbox</h2>

      <button
        onClick={loadGmailMessages}
        disabled={loadingGmailMessages}
      >
        {loadingGmailMessages ? "Refreshing..." : "Refresh"}
      </button>
    </div>

    <p>
      Select the emails you want to include in your newsletter.
    </p>

    {gmailMessages.length === 0 ? (
      <p>No emails found.</p>
    ) : (
      <div className="gmail-message-list">
        {gmailMessages.map((email) => (
          <label key={email.id} className="gmail-message">
            <input
              type="checkbox"
              checked={selectedEmails.includes(email.id)}
              onChange={() => toggleEmailSelection(email.id)}
            />

            <div className="gmail-message-content">
              <h3>{email.subject}</h3>

              <p>
                <strong>From:</strong> {email.from}
              </p>

              <p>
                <strong>Date:</strong> {email.date}
              </p>

              <p className="gmail-snippet">
                {email.snippet}
              </p>
            </div>
          </label>
        ))}
      </div>
    )}

    {selectedEmails.length > 0 && (
      <div className="gmail-selection">
        <p>
          <strong>{selectedEmails.length}</strong> email(s) selected
        </p>

        <button disabled>
          Import Selected Emails — Coming Soon
        </button>
      </div>
    )}
  </div>
)}
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