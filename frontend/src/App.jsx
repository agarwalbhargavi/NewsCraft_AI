import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setMessage(error.message);
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN") {

    setMessage("");

  }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    }
  }

  if (loading) {
    return <div className="container">Loading NewsCraft AI...</div>;
  }

  if (session) {
    return (
      <div className="container">
        <h1>NewsCraft AI</h1>
        <p>AI-Powered Newsletter Automation System</p>

        <div className="status-card">
          <h2>Welcome to your Dashboard!</h2>

          <p>
            Logged in as: <strong>{session.user.email}</strong>
          </p>

          <p>Your account is authenticated successfully.</p>
        </div>

        <button disabled>Create Newsletter — Coming Soon</button>

        <br />
        <br />

        <button onClick={handleLogout}>Logout</button>

        {message && <p>{message}</p>}
      </div>
    );
  }

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

        <p>{message}</p>

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