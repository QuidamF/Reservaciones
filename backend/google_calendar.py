import datetime
import os.path
import secrets

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']
REDIRECT_URI = 'http://127.0.0.1:8000'

# --- User Action Required ---
# You must download your OAuth 2.0 credentials from the Google Cloud Console
# and save them as 'credentials.json' in the 'backend' directory.
# ---

CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'

def get_google_auth_flow():
    """Creates a Google Auth Flow instance."""
    if not os.path.exists(CREDENTIALS_FILE):
        raise FileNotFoundError(
            "OAuth credentials file not found. "
            "Please download 'credentials.json' from Google Cloud Console "
            "and place it in the 'backend' directory."
        )
    
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    return flow

def get_google_auth_url(flow: Flow):
    """Generates the Google Authentication URL."""
    state = secrets.token_urlsafe(16)
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        state=state
    )
    return authorization_url, state

def get_google_credentials_from_code(flow: Flow, code: str):
    """Fetches credentials from the authorization code."""
    flow.fetch_token(code=code)
    creds = flow.credentials
    # Save the credentials for the next run
    with open(TOKEN_FILE, 'w') as token:
        token.write(creds.to_json())
    return creds

def get_credentials():
    """Gets user credentials from storage."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            # Save the refreshed credentials
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
        except RefreshError:
            # Refresh token is expired or invalid, need re-authentication
            creds = None 
            if os.path.exists(TOKEN_FILE):
                os.remove(TOKEN_FILE) # Remove invalid token
            
    return creds

def get_calendar_service():
    """Returns an authorized Google Calendar service instance."""
    creds = get_credentials()
    if not creds:
        return None # Indicate that authentication is needed
    try:
        service = build('calendar', 'v3', credentials=creds)
        return service
    except HttpError:
        return None

def get_busy_times(service, start_time: datetime.datetime, end_time: datetime.datetime):
    """
    Fetches busy times from the primary calendar within a given time range.
    """
    try:
        events_result = service.freebusy().query(body={
            'timeMin': start_time.isoformat(),
            'timeMax': end_time.isoformat(),
            'items': [{'id': 'primary'}],
        }).execute()
        
        busy_intervals = []
        if 'calendars' in events_result:
            for cal, data in events_result['calendars'].items():
                for interval in data['busy']:
                    busy_intervals.append({
                        'start': datetime.datetime.fromisoformat(interval['start']),
                        'end': datetime.datetime.fromisoformat(interval['end'])
                    })
        return busy_intervals

    except HttpError as error:
        print(f'An error occurred: {error}')
        return []

def create_event(service, start_time: datetime.datetime, end_time: datetime.datetime, summary: str, description: str = '', timezone: str = 'UTC'):
    """Creates a new event in the primary calendar."""
    event = {
        'summary': summary,
        'description': description,
        'start': {
            'dateTime': start_time.isoformat(),
            'timeZone': timezone,
        },
        'end': {
            'dateTime': end_time.isoformat(),
            'timeZone': timezone,
        },
    }
    try:
        print("--- Attempting to create Google Calendar event ---")
        print("Event data being sent:")
        print(event)
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        print("--- Successfully created event ---")
        print("API Response:")
        print(created_event)
        return created_event
    except HttpError as error:
        print(f"--- An error occurred while creating the event ---")
        print(f"Error details: {error}")
        return None

def get_events(service, start_time: datetime.datetime, end_time: datetime.datetime):
    """
    Fetches events from the primary calendar within a given time range.
    """
    try:
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_time.isoformat(),
            timeMax=end_time.isoformat(),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        return events_result.get('items', [])
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []