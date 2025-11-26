# Appointment Scheduler

This project is a web application that allows a user to define their availability and lets others book appointments directly into their Google Calendar.

## Features

- **Backend:** Python, FastAPI
- **Frontend:** React (with Vite), Ant Design
- **Calendar Integration:** Google Calendar API
- **Owner Configuration:** A UI for the calendar owner to define their weekly availability, work hours, and breaks.
- **Client Booking:** A UI for clients to see available slots in real-time and book an appointment.
- **Real-time Availability:** The application cross-references the owner's rules with their actual Google Calendar to show only genuinely free slots.
- **Direct Booking:** Appointments booked by clients are created directly as events in the owner's Google Calendar.

## How to Run the Application

This project uses Docker for the backend to ensure a consistent environment and simplify setup. The frontend is a standard React application.

### Prerequisites

- **Docker and Docker Compose:** Make sure you have Docker installed and running on your system. You can get it from the [official Docker website](https://www.docker.com/products/docker-desktop).
- **Node.js:** You will need Node.js (and npm) to run the frontend. You can download it from [nodejs.org](https://nodejs.org/).

### Step 1: Google Calendar API Setup

Before running the application, you must get credentials for the Google Calendar API.

**-> For detailed instructions, please see the `google_auth.md` file.**

After following the instructions, you should have a `credentials.json` file placed inside the `backend` directory.

### Step 2: Backend Setup (Docker & FastAPI)

1.  **Open a terminal** and navigate to the root directory of this project.
2.  **Run the Docker Compose command:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    - Build the Docker image for the backend service (the first time you run it).
    - Start a container for the backend service.
    - The backend API will be running at `http://127.0.0.1:8000`.

    You can add the `-d` flag (`docker-compose up --build -d`) to run the container in detached mode (in the background).

### Step 3: Frontend Setup (React)

1.  **Configure API URL:**
    Create a `.env.development` file in the `frontend/` directory with the following content:
    ```
    VITE_API_URL=http://127.0.0.1:8000/api/v1
    ```
    For production, create a `.env.production` file with your production API URL.

2.  **Open a new terminal** and navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
3.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
4.  **Run the React development server:**
    ```bash
    npm run dev
    ```
    The frontend application will be accessible at `http://localhost:5173` (or another port if 5173 is busy).

### Step 4: First-time Google Authentication

1.  Once the backend is running, open your browser and go to:
    `http://127.0.0.1:8000/auth/google`
2.  This will start the authentication process. Your browser will open a new tab asking you to log in with your Google account and grant the application permission to access your calendar.
3.  After you grant permission, the application will store a `token.json` file in the `backend` directory. This file will keep you authenticated for future sessions.

### Step 5: Using the Application

1.  **Initial Setup:** Access `http://localhost:5173` (the root of the frontend). If no admin user is configured, you will be redirected to an initial setup page to create one.
2.  **Login and Navigation:**
    *   **Admin Users:** After logging in, administrators are redirected to `/admin/config`. They can also navigate to `/book` to view the public booking page.
    *   **Public Booking:** The public booking page is available at `/book`.

## Changes

### 2025-11-26 (Latest Updates)

This section summarizes the key changes and improvements made to the project.

**Backend Refactoring:**
*   **API Versioning:** Introduced `/api/v1` prefix for all core API endpoints (e.g., `/token`, `/users`, `/config`, `/availability`, `/book`, `/events`) by creating `backend/api.py` and integrating it via `APIRouter` in `backend/main.py`.
*   **Initial Setup Endpoint:** Refined `GET /api/v1/initial-setup` to consistently return a `200 OK` status with a `{"setup_needed": true/false}` JSON body, improving clarity and preventing misinterpretation as an error.
*   **Global State Management:** Implemented `backend/globals.py` to manage `initial_admin_setup_needed` flag, centralizing its control.
*   **Root Endpoint Streamlining:** Cleaned up `GET /` in `backend/main.py`, removing `initial-setup` checks to focus on its role as a welcome/OAuth callback.

**Frontend Improvements:**
*   **Environment Variables:** Migrated hardcoded API URLs to `VITE_API_URL` environment variables (`.env.development`, `.env.production`) for flexible configuration.
*   **React Router Warnings:** Addressed future compatibility warnings by enabling `v7_startTransition` and `v7_relativeSplatPath` flags in `BrowserRouter`.
*   **Robust Authentication:**
    *   Enhanced `AuthContext.jsx` for reliable state management, ensuring `user` and `token` are correctly set and `loading` state resolves accurately.
    *   Implemented graceful handling of `401 Unauthorized` responses in authenticated views (`AgendaView`, `ConfigurationView`, `UserManagementView`) by triggering logout and displaying messages.
*   **Centralized Redirection:**
    *   Moved `BookingView` to `/book` for clearer public access.
    *   Refactored initial routing logic into `AppRouter`'s root route element to intelligently redirect users based on authentication status and initial setup needs (to `/initial-setup`, `/admin/config`, or `/book`).
    *   Removed imperative `navigate` calls from `LoginView` to centralize redirection.
*   **UI/UX Enhancements:** Updated Ant Design `Modal` components in `UserManagementView.jsx` to use the `open` prop instead of the deprecated `visible`.
*   **Debugging Cleanup:** Systematically removed all temporary `console.log` and `console.error` statements used during development and debugging, ensuring a clean console output.