# Changelog

This file documents the step-by-step development process of the Appointment Scheduler application.

## 2025-11-24

### v0.7.1: Fix Frontend Application Crash

- **Frontend (Dependencies):**
    - Corrected the version of `react-router-dom` in `package.json` from `^7.9.6` (a non-functional version) to `^6.24.0`.
    - This resolves a critical runtime error that prevented the entire frontend application from rendering.

### v0.7.0: Extend User Management Functionality

- **Backend (API & CRUD):**
    - Implemented CRUD (Create, Read, Update, Delete) operations for users in `backend/crud.py`.
    - Added new API endpoints in `backend/main.py` to manage users:
        - `GET /users`: Retrieves a list of all registered users.
        - `PUT /users/{user_id}`: Updates a user's information (admin status or password).
        - `DELETE /users/{user_id}`: Deletes a user.
    - All new endpoints are protected and require administrator privileges.

- **Frontend (UI/UX):**
    - Completely revamped `frontend/src/components/UserManagementView.jsx`.
    - The "Create User" form was moved into a modal.
    - A table now lists all registered users with their username and admin status.
    - Added actions for each user:
        - **Edit:** Opens a modal to toggle the user's admin status.
        - **Change Password:** Opens a modal to set a new password for the user.
        - **Delete:** Uses a confirmation pop-up before deleting the user.
    - The UI is now a complete management dashboard for users.

- **Testing:**
    - Due to limitations in the execution environment, end-to-end testing of the new functionality could not be completed. Manual verification is recommended.

## 2025-11-21

### v0.6.5: Add Detailed Logging to Google Calendar Event Creation

- **Backend (Google Calendar Integration):**
    - Added detailed `print` statements within the `create_event` function in `google_calendar.py`.
    - These logs now show the event data being sent to the Google Calendar API, the API's response upon successful event creation, and any `HttpError` exceptions encountered, greatly assisting in debugging appointment booking issues.

### v0.6.4: Add __init__.py to Backend Package

- **Backend (Python Packaging):**
    - Added an empty `__init__.py` file to the `backend/` directory.
    - This explicitly marks the `backend` directory as a Python package, resolving `ModuleNotFoundError` issues for internal imports (e.g., `from models import ...`) during application startup, especially when run with `uvicorn`.

### v0.6.3: Add .gitignore File

- **Project Configuration:**
    - Created a comprehensive `.gitignore` file in the project root.
    - Includes common exclusions for Python environments (`venv/`, `__pycache__`), Node.js modules (`node_modules/`), build directories, IDE-specific files, OS-generated files, and sensitive credentials (`credentials.json`, `token.json`).

### v0.6.2: Add CORS Middleware

- **Backend (FastAPI):**
    - Implemented `CORSMiddleware` in `main.py` to enable Cross-Origin Resource Sharing.
    - Configured to allow requests from `http://localhost:5173` (Vite's default frontend development server) to facilitate frontend-backend communication.

### v0.6.1: Adapt Google OAuth to Redirect URI Restriction

- **Backend (FastAPI & Google Auth):**
    - Modified `google_calendar.py`: Updated `REDIRECT_URI` to `http://127.0.0.1:8000` to comply with Google Cloud Console's restriction on redirect URIs (allowing only base URL + port).
    - Modified `main.py`:
        - Removed the dedicated `/auth/google/callback` endpoint.
        - The root endpoint (`@app.get("/")`) now conditionally handles the OAuth callback by checking for `code` and `state` query parameters. If present, it processes the authentication; otherwise, it returns the standard welcome message.
- **Documentation:**
    - Updated `google_auth.md` to reflect the new `http://127.0.0.1:8000` redirect URI for Google Cloud Console configuration.

### v0.6.0: Refactor Google Authentication to Web Flow

- **Backend (FastAPI & Google Auth):**
    - Refactored the entire Google Authentication mechanism from a desktop/CLI flow to a proper web-based OAuth 2.0 flow.
    - Modified `google_calendar.py` to use `google_auth_oauthlib.flow.Flow` instead of `InstalledAppFlow`.
    - Implemented functions to generate an authorization URL and to process the a callback from Google.
    - Modified `main.py`:
        - The `/auth/google` endpoint now redirects the user to the Google consent screen.
        - Added a new `/auth/google/callback` endpoint to handle the authorization code, fetch the token, and save it.
        - The `get_calendar_service` dependency now raises a 401 error if the user is not authenticated, guiding them to the auth URL.
- **Documentation:**
    - Updated `google_auth.md` to instruct the user to create a "Web application" credential in Google Cloud and to add the correct redirect URI (`http://127.0.0.1:8000/auth/google/callback`).

### v0.5.1: Backend Fix

- **Backend (FastAPI):**
    - Fixed relative import errors in `main.py` that prevented the server from starting. Changed `from .models` to `from models` and `from . import google_calendar` to `import google_calendar`.
    - The backend server now starts successfully using `uvicorn`.

### v0.5.0: Google Calendar Integration

- **Backend Dependencies:** Added `google-api-python-client` and `google-auth-oauthlib` to `requirements.txt`.
- **Google Calendar Module:**
    - Created `backend/google_calendar.py` to handle all interactions with the Google Calendar API.
    - Implemented OAuth 2.0 flow for desktop applications to get user credentials.
    - Added functions to `get_busy_times` and `create_event`.
- **Backend Integration:**
    - Updated `GET /availability` to use `get_busy_times`, ensuring that slots conflicting with existing Google Calendar events are filtered out.
    - Updated `POST /book` to use `create_event`, allowing new appointments to be created directly in the user's primary calendar.
    - Added a `GET /auth/google` endpoint to initiate the authentication process.
- **Documentation:**
    - Created `google_auth.md` with detailed instructions for users on how to obtain their `credentials.json` file.
    - Updated `README.md` with comprehensive instructions covering the full application setup, including the new authentication step.

### v0.4.0: Frontend UI Implementation (Booking)

- **Booking View:**
    - Created `BookingView.jsx`, a component for clients.
    - Features a `DatePicker` to select a day.
    - On date selection, it calls the backend's `GET /availability` endpoint to fetch available slots.
    - Displays the returned slots in a list.
    - Includes a "Book" button for each slot (with placeholder confirmation logic).
- **View Switching:** Added a `Segmented` control in `App.jsx` to allow easy switching between the "Configure" view and the "Book Appointment" view.

### v0.3.0: Core Availability Logic

- **Backend Enhancement:**
    - Replaced the placeholder logic in the `GET /availability` endpoint in `backend/main.py`.
    - The new logic calculates all potential appointment slots based on the owner's rules (work hours, appointment duration) and filters out any slots that conflict with defined break times.

### v0.2.0: Frontend UI Implementation (Configuration)

- **UI Library:** Added Ant Design (`antd`) and `dayjs` to the frontend dependencies to accelerate UI development.
- **Configuration View:**
    - Implemented `ConfigurationView.jsx`, a component with a form built using Ant Design components (`Form`, `InputNumber`, `Select`, `TimePicker`, etc.).
    - This form allows the calendar owner to visually set their weekly availability, define break times, and specify appointment duration.
    - The form sends the configuration data to the backend's `POST /config` endpoint.
- **App Structure:** Updated `App.jsx` to render the new `ConfigurationView`.

### v0.1.0: Initial Project Setup & Core Backend Logic

- **Project Structure:** Created a monorepo structure with a `backend` folder for the FastAPI application and a `frontend` folder for the React application.
- **Backend (FastAPI):**
    - Initialized a FastAPI application (`main.py`).
    - Created Pydantic models (`models.py`) to define the data structures for availability rules, breaks, and general configuration.
    - Implemented API endpoints with placeholder logic:
        - `POST /config`: To save availability rules.
        - `GET /availability`: To retrieve available slots.
        - `POST /book`: To create a new appointment.
- **Frontend (React):**
    - Manually scaffolded a basic React project structure using Vite.
    - Created `index.html`, `package.json`, `src/main.jsx`, and `src/App.jsx`.
- **Documentation:** Created an initial `README.md` with setup instructions.