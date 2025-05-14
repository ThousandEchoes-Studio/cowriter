# backend/app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import firebase_admin
from firebase_admin import auth, credentials
from app.core.config import settings # Assuming settings.py contains Firebase config
from app.schemas.user import User # Pydantic model for User

# Initialize Firebase Admin SDK if not already initialized
# This should ideally happen once at application startup in main.py
# For deps.py, we ensure it's configured.
if not firebase_admin._apps:
    # Check if FIREBASE_CREDENTIALS_PATH is set, otherwise expect GOOGLE_APPLICATION_CREDENTIALS env var
    if settings.FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    else:
        # If no specific path, Firebase Admin SDK will try to use GOOGLE_APPLICATION_CREDENTIALS
        # or attempt to find credentials in a standard location.
        # For Railway/Render, service account JSON might be set via env var directly.
        # For now, let's assume it's handled or will be handled during deployment setup.
        cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token") # Placeholder, actual token URL might differ

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Dependency to get the current user from a Firebase ID token.
    The token is expected to be passed in the Authorization header as a Bearer token.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        # You might want to fetch more user details from your Firestore user collection
        # For now, we'll create a User object with UID and email.
        if not uid or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials (missing UID or email)",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Here, you could fetch the user from your database if you store more user info
        # user_data_from_db = await get_user_from_db(uid) 
        # return User(**user_data_from_db.dict())
        return User(id=uid, email=email) # Assuming User Pydantic model has id and email
    except firebase_admin.auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_admin.auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials (invalid token)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Catch any other Firebase Admin SDK errors or issues
        print(f"Error during token verification: {e}") # Log this for server-side debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not validate credentials due to an internal error.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to get the current active user.
    This can be expanded to check if the user is active (e.g., not disabled).
    For now, it just returns the user obtained from get_current_user.
    """
    # if not current_user.is_active: # Assuming User model has an is_active field
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# You might add more dependencies here, e.g., for checking roles/permissions
# async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
#     if not current_user.is_superuser: # Assuming User model has an is_superuser field
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges"
#         )
#     return current_user

