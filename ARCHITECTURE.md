# Architecture & Design

This document outlines the architecture, technologies, and design patterns used in the Appointment Scheduler application.

## 1. Technology Stack

- **Backend:**
  - **Framework:** FastAPI (Python 3)
  - **Data Validation:** Pydantic
  - **Server:** Uvicorn (ASGI server)
  - **Calendar Integration:** Google API Client Library for Python (`google-api-python-client`, `google-auth-oauthlib`)

- **Frontend:**
  - **Library:** React.js
  - **Build Tool:** Vite
  - **UI Components:** Ant Design (`antd`)
  - **Date/Time Handling:** Day.js

## 2. Architecture Overview

The application follows a **client-server architecture**, with a clear separation between the frontend (client) and the backend (server).

-   **Backend (Server):** A RESTful API built with FastAPI. It is organized with versioning (`/api/v1`) for its core endpoints and is responsible for all business logic, including:
    -   Storing and managing availability configurations.
    -   Calculating available appointment slots.
    -   Interacting with the external Google Calendar API.
    -   Handling user authentication.
    -   Providing endpoints for initial application setup and user management.

-   **Frontend (Client):** A Single-Page Application (SPA) built with React. It is responsible for the user interface and user experience:
    -   Manages the initial application state (checking if admin setup is needed).
    -   Handles user authentication and session management.
    -   Provides a configuration panel for the calendar owner.
    -   Provides a booking interface for clients.
    -   Communicates with the backend via versioned HTTP requests (e.g., `/api/v1/users`, `/api/v1/config`) to fetch data and trigger actions.

## 3. Design Patterns & Concepts

-   **API Routing and Versioning (FastAPI):** Core API endpoints are organized using FastAPI's `APIRouter` with a `/api/v1` prefix, located in `backend/api.py`. This promotes modularity and allows for future API versioning without breaking existing clients.
-   **Global State Management:** A simple `globals.py` module is used in the backend to manage application-wide flags, such as `initial_admin_setup_needed`, which helps in controlling the initial setup flow.
- **Dependency Injection (FastAPI):** FastAPI's dependency injection system is used to manage the Google Calendar service instance (`get_calendar_service`) and database sessions (`get_db`). This makes the API endpoints more modular and easier to test, as dependencies are provided rather than being hard-coded.
- **In-memory Database (for now):** The availability configuration is stored in a simple in-memory Python dictionary. This is a simplification for the current version. In a production environment, this would be replaced by a persistent database (e.g., PostgreSQL, MongoDB, or a simple file-based DB like SQLite).
- **Component-Based UI (React):** The frontend is built using a component-based architecture. The UI is broken down into reusable components like `ConfigurationView` and `BookingView`.

## 4. System Diagrams

### Component & Flow Diagram

This diagram shows the main components of the system and the flow of information between them.

```mermaid
graph TD
    subgraph Browser
        A[React Frontend]
    end

    subgraph Server
        B[FastAPI Backend]
    end

    subgraph Google
        C[Google Calendar API]
    end

    A -- HTTP Request (GET /api/v1/availability) --> B
    B -- Fetches config, calculates slots --> B
    B -- Fetches busy times --> C
    C -- Returns busy times --> B
    B -- Returns available slots --> A

    A -- HTTP Request (POST /api/v1/book) --> B
    B -- Creates event --> C
    C -- Confirms event creation --> B
    B -- Returns confirmation --> A

    A -- HTTP Request (POST /api/v1/config) --> B
```

### Initial Setup and Authentication Flow

This diagram illustrates the initial application setup and subsequent authentication process.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Google

    User->>Frontend: Accesses App (e.g., /)
    Frontend->>Backend: GET /api/v1/initial-setup
    Backend-->>Frontend: Returns {"setup_needed": true}
    Frontend->>Frontend: Displays Initial Setup View
    User->>Frontend: Creates Admin User (via form)
    Frontend->>Backend: POST /api/v1/initial-setup {username, password}
    Backend-->>Frontend: Admin User Created
    Frontend->>Frontend: Redirects to /login

    Frontend->>Backend: POST /api/v1/token {username, password}
    Backend-->>Frontend: Returns {access_token}
    Frontend->>Backend: GET /api/v1/users/me {Authorization: Bearer <token>}
    Backend-->>Frontend: Returns {user_data}
    Frontend->>Frontend: Stores token, sets user state
    Frontend->>Frontend: Redirects (e.g., to /admin/config)

    alt Admin needs to authorize Google Calendar
        User->>Frontend: Clicks "Authorize Google"
        Frontend->>Backend: GET /auth/google
        Backend->>Google: Initiates OAuth 2.0 Flow
        Google-->>Browser: Redirects to Google Login & Consent screen
        User->>Browser: Logs in and grants permissions
        Browser-->>Google: Sends authorization code
        Google-->>Backend: Provides credentials (via GET /?code=...&state=...)
        Backend->>Backend: Saves `token.json` for future use
        Backend-->>Frontend: Returns "Authentication successful" or redirects
    end
```
