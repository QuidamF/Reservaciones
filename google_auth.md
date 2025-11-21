# Action Required: Google Calendar API Credentials

To connect your Google Calendar, you need to provide API credentials.

1.  **Go to the Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a new project** (or select an existing one).
3.  **Enable the Google Calendar API:**
    *   Go to "APIs & Services" > "Library".
    *   Search for "Google Calendar API" and enable it.
4.  **Create OAuth 2.0 Credentials:**
    *   Go to "APIs & Services" > "Credentials".
    *   Click "Create Credentials" > "OAuth client ID".
    *   Select "**Web application**" for the application type.
    *   Give it a name (e.g., "Appointment Scheduler").
    *   Under "**Authorized redirect URIs**", click "**ADD URI**" and enter:
        ```
        http://127.0.0.1:8000
        ```
    *   Click "Create".
5.  **Download the Credentials:**
    *   After creating the client ID, a modal will appear. Click "DOWNLOAD JSON".
    *   Rename the downloaded file to `credentials.json`.
    *   **Place this `credentials.json` file inside the `backend` directory of this project.**

Once the file is in place and the redirect URI is configured, the application can ask you to authenticate when needed.
