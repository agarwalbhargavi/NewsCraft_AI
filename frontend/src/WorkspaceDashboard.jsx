import React from "react";

export default function WorkspaceDashboard({
  workspace,
  onBack,
}) {
  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: "10px 18px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ← Back to Workspaces
      </button>

      <h1 style={{ marginTop: "30px", color: "#243b53" }}>
        {workspace.name}
      </h1>

      <p style={{ color: "#64748b" }}>
        Workspace Dashboard
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginTop: "35px",
        }}
      >
        <DashboardCard
          title="Articles"
          description="Collect and manage newsletter articles."
        />

        <DashboardCard
          title="AI Summaries"
          description="Generate AI-powered article summaries."
        />

        <DashboardCard
          title="Newsletter Builder"
          description="Create newsletters using selected articles."
        />

        <DashboardCard
          title="Team Members"
          description="Manage workspace contributors."
        />
      </div>
    </div>
  );
}

function DashboardCard({ title, description }) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        padding: "25px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <h2 style={{ color: "#243b53" }}>{title}</h2>

      <p style={{ color: "#64748b" }}>
        {description}
      </p>
    </div>
  );
}