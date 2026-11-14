<h1 align="center">
  📰 <strong>NEWSCRAFT AI</strong>
</h1>

<h2 align="center">
  <strong>AI-Powered Newsletter Automation Platform</strong>
</h2>

<p align="center">
  <strong>From Scattered Emails to Professional Newsletters — Powered by AI</strong>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Cloud-3FCF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Status-In%20Development-orange" />
</p>

⸻

📌 Overview

NewsCraft AI is a full-stack, AI-powered newsletter automation platform designed to simplify the process of collecting, organizing, and transforming information from emails into professionally formatted newsletters.

The project originated from a real-world problem: creating departmental newsletters requires manually reviewing emails, identifying important announcements, rewriting content, organizing articles, and formatting everything into a document.

NewsCraft AI aims to automate this workflow through Gmail integration, collaborative workspaces, structured content management, and LLM-powered article generation.

Instead of manually copying information from multiple emails into Word documents, users will be able to select relevant emails, generate newsletter-ready content, review articles, and export a formatted newsletter.

🎯 Project Objectives

* Reduce repetitive manual newsletter preparation.
* Centralize email-based content collection.
* Support multiple users through collaborative workspaces.
* Automate article drafting using Large Language Models.
* Maintain structured newsletter and article records.
* Generate professionally formatted DOCX and PDF newsletters.

Development Status: The React frontend, FastAPI backend, PostgreSQL database, and initial workspace API integration are operational. Gmail integration, AI-powered article generation, and document export are being developed.

⸻

✨ Key Features

1. Full-Stack Web Application

NewsCraft AI uses a modern client-server architecture.

* React-based frontend built with Vite.
* FastAPI backend for REST API development.
* PostgreSQL relational database.
* SQLAlchemy ORM for database operations.
* Supabase-hosted PostgreSQL infrastructure.

2. Workspace Management

The platform is designed around collaborative workspaces.

Each workspace can organize its own newsletters, articles, and members.

The database includes:

* Workspaces
* Workspace Members
* Newsletters
* Articles

This provides the foundation for workspace-based data organization and future access control.

3. Gmail Integration — In Development

The planned Gmail integration will allow users to:

* Connect their Gmail account.
* Retrieve emails through Gmail APIs.
* Search emails using keywords.
* Filter emails by date.
* Browse emails using pagination.
* Select relevant emails for newsletter creation.

4. AI-Powered Article Generation — Planned

NewsCraft AI is being designed to use Large Language Models to transform selected emails into newsletter-ready articles.

The intended workflow includes:

* Extracting relevant information from selected emails.
* Generating concise article titles.
* Converting informal email content into professional paragraphs.
* Using prompt engineering to maintain consistent writing styles.
* Producing structured outputs for newsletter templates.
* Allowing users to review and edit generated content.

5. Newsletter Export — Planned

The final platform aims to support:

* Customizable newsletter templates.
* Article organization and editing.
* DOCX document generation.
* PDF export.
* Downloadable, publication-ready newsletters.

⸻

🛠️ Tech Stack

Layer	Technologies
Frontend	React.js, JavaScript, Vite, CSS
Backend	Python, FastAPI
Database	PostgreSQL
ORM	SQLAlchemy
Database Hosting	Supabase
Database Driver	psycopg
API Architecture	REST APIs
Email Integration	Gmail API (In Development)
AI Integration	LLM APIs, Prompt Engineering (Planned)
Document Generation	DOCX/PDF Export (Planned)
Development Tools	Git, GitHub, VS Code

⸻

🏗️ System Architecture

NewsCraft AI follows a layered architecture that separates the user interface, backend services, and database.

                    ┌───────────────────────┐
                    │         USER          │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │     REACT FRONTEND    │
                    │                       │
                    │  • Workspace UI       │
                    │  • Newsletter UI      │
                    │  • Email Selection    │
                    └───────────┬───────────┘
                                │
                         HTTP / REST
                                │
                                ▼
                    ┌───────────────────────┐
                    │    FASTAPI BACKEND    │
                    │                       │
                    │  • API Endpoints      │
                    │  • Business Logic     │
                    │  • Database Access    │
                    └───────────┬───────────┘
                                │
                          SQLAlchemy
                                │
                                ▼
                    ┌───────────────────────┐
                    │      POSTGRESQL       │
                    │       SUPABASE        │
                    │                       │
                    │  • Workspaces         │
                    │  • Members            │
                    │  • Newsletters        │
                    │  • Articles           │
                    └───────────────────────┘

Planned Integrations

             ┌───────────────────┐
             │     Gmail API     │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │   Email Selection │
             │ Search / Filters  │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │   LLM Processing  │
             │ Prompt Engineering│
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │ Structured Article│
             │    Generation     │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │ Newsletter Editor │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │    DOCX / PDF     │
             │      Export       │
             └───────────────────┘

⸻

🗄️ Database Design

NewsCraft AI uses PostgreSQL to maintain structured application data.

The database currently contains four core tables.

1. Workspaces

Stores workspace information.

2. Workspace Members

Maintains the relationship between users and workspaces.

3. Newsletters

Stores newsletter records associated with workspaces.

4. Articles

Stores articles and content associated with newsletters.

Conceptual Database Relationships

WORKSPACES
    │
    ├──────── WORKSPACE_MEMBERS
    │
    └──────── NEWSLETTERS
                  │
                  └──────── ARTICLES

This is a conceptual representation of the data model. Exact columns, foreign keys, and constraints should be referenced from the SQLAlchemy models.

Why PostgreSQL?

PostgreSQL was selected because it provides:

* Relational data modeling.
* SQL-based querying.
* Support for multi-user applications.
* Transaction management.
* Data integrity through relational constraints.
* Indexing and query optimization capabilities.

SQLAlchemy provides an abstraction layer between Python application code and the database.

⸻

📂 Project Structure

The project uses a simple frontend-backend structure.

NewsCraft_AI/
│
├── backend/
│   ├── main.py
│   ├── ...
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── WorkspaceDashboard.jsx
│   │   └── supabaseClient.js
│   │
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md

The structure above shows the principal files used during development. Additional configuration, model, and dependency files may be present.

⸻

⚙️ Getting Started

Prerequisites

Ensure the following tools are installed:

* Python 3.10 or later
* Node.js and npm
* PostgreSQL or a Supabase project
* Git
* VS Code or another code editor

Step 1: Clone the Repository

git clone <YOUR_REPOSITORY_URL>
cd NewsCraft_AI

Replace <YOUR_REPOSITORY_URL> with your repository’s clone URL.

Step 2: Backend Setup

Navigate to the backend directory.

cd backend

Create a virtual environment.

python3 -m venv venv

Activate it.

macOS/Linux:

source venv/bin/activate

Windows:

venv\Scripts\activate

Install the core backend dependencies.

pip install fastapi uvicorn sqlalchemy psycopg python-dotenv

If the repository contains a requirements.txt file, install its pinned dependencies instead:

pip install -r requirements.txt

Step 3: Configure the Database

Create a Supabase project and obtain the PostgreSQL connection string.

Configure the backend database connection using the environment variable expected by your application.

For example, if your backend reads DATABASE_URL, your local .env file would contain:

DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE

Replace the placeholders with your database credentials.

Important: Never commit database passwords, API keys, or .env files to GitHub.

Step 4: Start the Backend

From the backend directory, run:

uvicorn main:app --reload

The backend should start locally at:

http://127.0.0.1:8000

FastAPI automatically provides interactive API documentation at:

http://127.0.0.1:8000/docs

Step 5: Frontend Setup

Open another terminal.

Navigate to the frontend directory.

cd frontend

Install dependencies.

npm install

Step 6: Configure Supabase

Create a .env file inside the frontend directory.

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_public_key

These variable names must match those used by your frontend configuration.

Only use the public Supabase key in frontend code. Never expose a Supabase service-role or secret key.

Step 7: Run the Frontend

npm run dev

Vite will display the local development URL, typically:

http://localhost:5173

Open the URL in your browser.

The frontend and backend should now be running locally.

⸻

🔌 REST API Development

The backend uses FastAPI to expose HTTP endpoints for application functionality.

Current API Integration

The workspace endpoint has been used successfully during development.

Method	Endpoint	Purpose	Status
GET	/api/workspaces	Retrieve workspaces	Implemented

The application has successfully returned an HTTP 200 OK response for workspace retrieval.

Planned API Capabilities

Future endpoints will support:

* Workspace creation and management.
* Workspace membership operations.
* Newsletter creation and editing.
* Article management.
* Gmail email retrieval.
* Email search and filtering.
* Pagination.
* AI-generated article creation.
* Document export.

API Engineering Improvements

The development roadmap includes:

* Request validation using Pydantic.
* Appropriate HTTP response codes.
* Structured error handling.
* Pagination for list endpoints.
* Database query optimization.
* API testing.
* Authentication and authorization checks.

⸻

🤖 AI Integration Strategy

NewsCraft AI is designed to use LLMs as a content transformation layer.

The goal is not simply to summarize emails, but to convert unstructured email content into consistent, publication-ready newsletter articles.

Planned Processing Pipeline

Step 1 — Email Retrieval

Retrieve selected messages through Gmail integration.

Step 2 — Content Extraction

Extract useful information such as:

* Event name
* Date
* Participants
* Achievements
* Important announcements
* Event descriptions

Step 3 — Prompt Engineering

Send the extracted content to an LLM with instructions defining:

* Writing style
* Article length
* Required information
* Newsletter format
* Output structure

Step 4 — Structured Output

The intended AI response will follow a predictable schema.

Example:

{
  "title": "Students Participate in Technical Workshop",
  "category": "Student Activities",
  "content": "Students participated in a technical workshop focused on emerging technologies and practical applications.",
  "status": "draft"
}

Step 5 — Human Review

Users will review and edit generated content before publication.

Step 6 — Newsletter Generation

Approved articles will be organized into the selected newsletter template.

AI Design Principles

The planned AI workflow prioritizes:

* Factual consistency with source emails.
* Structured JSON responses.
* Consistent editorial tone.
* Human review before publication.
* Clear separation between source content and generated text.

⸻

🧪 Testing and Debugging

During development, the application has been tested through local frontend and backend execution.

Development Checks Performed

* Verified FastAPI server startup.
* Confirmed successful PostgreSQL connectivity.
* Verified database table creation.
* Checked workspace API responses.
* Confirmed React/Vite frontend execution.
* Debugged frontend module import errors.
* Resolved database connection configuration issues.
* Validated initial frontend-backend communication.

Planned Automated Testing

Future testing improvements include:

* Unit tests for backend functions.
* Integration tests for REST APIs.
* Database operation tests.
* Request validation tests.
* Error response verification.
* Gmail integration tests.
* LLM output validation.

⸻

🔐 Security Considerations

The platform’s development roadmap includes several security measures.

Environment Variables

Sensitive credentials should be stored outside the source code.

Examples include:

* Database passwords.
* Gmail OAuth credentials.
* LLM API keys.
* Supabase secret keys.

Authentication and Authorization

Workspace-based access control is planned to ensure users can access only authorized resources.

Secure API Design

Future backend improvements will include:

* Input validation.
* Consistent error responses.
* Authorization checks.
* Secure handling of external API credentials.

⸻

🚀 Development Roadmap

Phase 1 — Core Application Foundation

* Initialize FastAPI backend.
* Configure React frontend with Vite.
* Connect PostgreSQL through Supabase.
* Configure SQLAlchemy.
* Create core database tables.
* Implement initial workspace API.
* Establish frontend-backend connectivity.

Phase 2 — Gmail Integration

* Implement Gmail OAuth authentication.
* Retrieve emails through Gmail API.
* Add email search functionality.
* Implement date-based filtering.
* Add pagination.
* Enable email selection.

Phase 3 — AI-Powered Content Generation

* Integrate an LLM API.
* Develop article-generation prompts.
* Implement structured JSON outputs.
* Generate newsletter titles and paragraphs.
* Add article review and editing.

Phase 4 — Newsletter Management

* Build newsletter creation workflows.
* Implement article organization.
* Add customizable newsletter templates.
* Support collaborative editing workflows.

Phase 5 — Export and Reliability

* Generate DOCX files.
* Implement PDF export.
* Add backend input validation.
* Improve API error handling.
* Implement automated testing.
* Optimize database queries.

Phase 6 — Deployment

* Deploy the frontend.
* Deploy the FastAPI backend.
* Configure production environment variables.
* Add logging and monitoring.
* Perform end-to-end testing.

⸻

📸 Screenshots

Screenshots of the application will be added as development progresses.

Suggested screenshots:

1. Workspace Dashboard
2. Gmail Inbox Integration
3. Email Search and Filtering
4. Newsletter Editor
5. AI-Generated Article Preview
6. Final Newsletter Export

⸻

💡 What I Learned

Building NewsCraft AI provides practical experience in:

Backend Engineering

* Designing REST APIs with FastAPI.
* Understanding HTTP requests and responses.
* Connecting backend services to relational databases.
* Debugging API and database connectivity issues.

Frontend Development

* Building interfaces with React.
* Managing application state.
* Integrating frontend components with backend APIs.
* Debugging JavaScript module and import errors.

Database Engineering

* Designing relational database structures.
* Working with PostgreSQL.
* Using SQLAlchemy ORM.
* Managing database connections.

AI Engineering

* Designing LLM-powered application workflows.
* Understanding prompt engineering.
* Planning structured AI outputs.
* Incorporating human review into AI-generated content.

Software Engineering

* Building an end-to-end application.
* Separating frontend and backend responsibilities.
* Troubleshooting integration issues.
* Developing features incrementally.

⸻

🔮 Future Scope

Potential future enhancements include:

* Multiple email provider integrations.
* AI-assisted article categorization.
* Duplicate announcement detection.
* Automatic newsletter layout suggestions.
* Collaborative editing and approvals.
* Newsletter version history.
* Scheduled newsletter generation.
* Automated content quality checks.
* Production deployment and monitoring.

⸻

👩‍💻 Author

Bhargavi Agarwal

B.E. — Electronics and Communication Engineering
Dayananda Sagar College of Engineering, Bengaluru

GitHub: agarwalbhargavi

LinkedIn: Bhargavi Agarwal

⸻

<p align="center">
  <strong>NewsCraft AI</strong><br>
  Turning emails into organized, publication-ready newsletters.
</p>
