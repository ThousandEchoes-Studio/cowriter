# backend/app/api/v1/endpoints/voice_processing.py
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from typing import Any

from app.services.voice_to_midi_service import process_voice_to_midi
from app.api.deps import get_current_active_user # Import the actual dependency
from app.schemas.user import User # Import the User schema

router = APIRouter()

@router.post("/voice-to-midi/", summary="Convert voice audio to MIDI")
async def convert_voice_to_midi(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user) # Use the actual dependency
) -> Any:
    """
    Receives an audio file (e.g., WAV from voice input) and converts it to MIDI data.
    The processing is associated with the authenticated user.

    - **audio_file**: The uploaded audio file.
    - Requires authentication.
    """
    if not audio_file.content_type.startswith("audio/"):
        # A more robust check might be needed for specific formats like WAV, MP3
        raise HTTPException(status_code=400, detail=f"Invalid audio file type: {audio_file.content_type}. Please upload a supported audio format.")

    try:
        # Read audio file content
        audio_content = await audio_file.read()
        user_id = current_user.id # Get user ID for context, if needed by the service
        
        # Process the audio content using the service
        # The service might use user_id for logging, or if it stores user-specific models/data
        midi_data = await process_voice_to_midi(audio_content, audio_file.filename, user_id=user_id)
        
        if midi_data.get("status") == "error_placeholder":
            raise HTTPException(status_code=500, detail=midi_data.get("message", "Unknown error during MIDI conversion."))

        return midi_data
    except HTTPException as http_exc: # Re-raise HTTPExceptions to ensure they are not caught by the generic Exception handler
        raise http_exc
    except Exception as e:
        # Log the exception details for debugging
        print(f"Unhandled exception in convert_voice_to_midi for user {current_user.id if current_user else 'Unknown'}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")

