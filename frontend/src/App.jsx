import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Checking...");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function connectBackend() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/health"
        );

        if (!response.ok) {
          throw new Error("Backend connection failed");
        }

        const data = await response.json();

        setStatus("🟢 Online");
        setMessage(data.message);
      } catch (error) {
        setStatus("🔴 Offline");
        setMessage("Unable to connect to FastAPI backend");
      }
    }

    connectBackend();
  }, []);

  return (
    <div className="container">
      <h1>NewsCraft AI</h1>

      <p>AI-Powered Newsletter Automation System</p>

      <div className="status-card">
        <h2>Backend Connection</h2>

        <p>
          Status: <strong>{status}</strong>
        </p>

        <p>{message}</p>
      </div>

      <button disabled>Create Newsletter — Coming Soon</button>
    </div>
  );
}

export default App;