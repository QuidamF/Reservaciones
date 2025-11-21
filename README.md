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

Follow these steps to get the application running locally.

### Step 1: Google Calendar API Setup

Before running the application, you must get credentials for the Google Calendar API.

**-> For detailed instructions, please see the `google_auth.md` file.**

After following the instructions, you should have a `credentials.json` file placed inside the `backend` directory.

### Step 2: Backend Setup (FastAPI)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **(Recommended)** Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # On Windows
    # source venv/bin/activate  # On macOS/Linux
    ```
3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the FastAPI server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be running at `http://127.0.0.1:8000`.

### Step 3: Frontend Setup (React)

1.  **Open a new terminal** and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  **Install Node.js dependencies:**
    *(If you haven't installed `antd` and `dayjs` yet, this is the time.)*
    ```bash
    npm install
    ```
3.  **Run the React development server:**
    ```bash
    npm run dev
    ```
    The frontend application will be accessible at `http://localhost:5173` (or another port if 5173 is busy).

### Step 4: First-time Google Authentication

1.  Once the backend is running, open your browser and go to:
    `http://127.0.0.1:8000/auth/google`
2.  This will start the authentication process. Your browser will open a new tab asking you to log in with your Google account and grant the application permission to access your calendar.
3.  After you grant permission, the application will store a `token.json` file in the `backend` directory. This will keep you authenticated for future sessions.

### Step 5: Using the Application

1.  **Open the frontend application** in your browser (`http://localhost:5173`).
2.  **Configure your availability:**
    *   Use the "Configure" view to set your weekly work hours, breaks, and the duration of appointments.
    *   Click "Save Configuration".
3.  **Book an appointment:**
    *   Switch to the "Book Appointment" view.
    *   Select a date. The application will fetch available slots that don't conflict with your rules or existing events in your Google Calendar.
    *   Choose a slot and click "Book". The event will be created in your Google Calendar automatically.
