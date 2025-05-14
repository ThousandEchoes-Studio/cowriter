# backend/app/api/v1/endpoints/exports.py
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import FileResponse # For sending files
from typing import Any, List, Dict
import os
import mido # For MIDI file creation
from pydantic import BaseModel # Import BaseModel

from app.api.deps import get_current_active_user # Import the actual dependency
from app.schemas.user import User # Import the User schema

# For WAV export, a more complex library like librosa/soundfile or even a headless DAW/synth might be needed.
# For MVP, we might simulate WAV export or use a very simple synth.

router = APIRouter()

# Placeholder for ProjectData model (Pydantic model)
# This would define the structure of MIDI, lyrics, and potentially sample usage data
class ProjectExportData(BaseModel): # Inherit from BaseModel
    project_name: str = "MyCowriterProject"
    midi_tracks: List[Dict[str, Any]] # e.g., { "track_name": "Vocals", "notes": [{"pitch": 60, ...}] }
    lyrics: str | None = None
    tempo_bpm: int = 120
    # Potentially include information about which samples are used on which tracks
    # sample_assignments: Dict[str, str] # e.g., { "track_name_or_id": "sample_id" }

TEMP_EXPORT_DIR = "/tmp/cowriter_exports"
if not os.path.exists(TEMP_EXPORT_DIR):
    os.makedirs(TEMP_EXPORT_DIR)

@router.post("/export-project/", summary="Export project as MIDI and WAV stems")
async def export_project(
    export_data: ProjectExportData = Body(...),
    current_user: User = Depends(get_current_active_user) # Use the actual dependency
) -> Any:
    """
    Exports the current project data as a MIDI file and placeholder WAV audio stems.

    - **export_data**: Project name, MIDI tracks, lyrics, tempo.
    - Requires authentication.
    """
    user_id = current_user.id # Use user ID from authenticated user
    project_name_safe = "".join(c if c.isalnum() else "_" for c in export_data.project_name)
    # Create a user-specific subdirectory within TEMP_EXPORT_DIR to avoid filename clashes if multiple users export same project name
    user_export_dir = os.path.join(TEMP_EXPORT_DIR, user_id)
    if not os.path.exists(user_export_dir):
        os.makedirs(user_export_dir)

    # Using a more unique session ID that includes user_id to prevent potential clashes if multiple users export at the exact same microsecond
    # However, placing files in user_export_dir already mitigates this for file paths.
    export_session_id = f"{project_name_safe}_{int(mido.second2tick(0, 480, export_data.tempo_bpm))}"

    # --- MIDI Export --- 
    try:
        mid = mido.MidiFile(ticks_per_beat=480) # Standard ticks per beat

        for track_data in export_data.midi_tracks:
            track = mido.MidiTrack()
            mid.tracks.append(track)
            track.append(mido.MetaMessage("track_name", name=track_data.get("track_name", "Unnamed Track")))
            track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(export_data.tempo_bpm)))
            
            current_time_ticks = 0
            sorted_notes = sorted(track_data.get("notes", []), key=lambda x: x.get("start_time", 0))

            for note_info in sorted_notes:
                start_time_seconds = note_info.get("start_time", 0)
                duration_seconds = note_info.get("duration", 0.5)
                pitch = note_info.get("pitch", 60)
                velocity = note_info.get("velocity", 90)

                start_time_ticks = int(mido.second2tick(start_time_seconds, mid.ticks_per_beat, mido.bpm2tempo(export_data.tempo_bpm)))
                duration_ticks = int(mido.second2tick(duration_seconds, mid.ticks_per_beat, mido.bpm2tempo(export_data.tempo_bpm)))
                
                delta_on = start_time_ticks - current_time_ticks
                track.append(mido.Message("note_on", note=pitch, velocity=velocity, time=max(0, delta_on)))
                current_time_ticks += max(0, delta_on)
                
                delta_off = duration_ticks
                track.append(mido.Message("note_off", note=pitch, velocity=0, time=delta_off))
                current_time_ticks += delta_off
            
            track.append(mido.MetaMessage("end_of_track", time=0))

        midi_filename = f"{export_session_id}.mid"
        midi_filepath = os.path.join(user_export_dir, midi_filename) # Save in user-specific dir
        mid.save(midi_filepath)
        print(f"MIDI file saved to: {midi_filepath}")

    except Exception as e:
        print(f"Error creating MIDI file: {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate MIDI file: {e}")

    # --- WAV Export (Placeholder) ---
    wav_files_info = []
    for i, track_data in enumerate(export_data.midi_tracks):
        track_name = track_data.get("track_name", f"Track_{i+1}")
        wav_filename_placeholder = f"{export_session_id}_{track_name.replace(" ", "_")}.wav"
        wav_filepath_placeholder = os.path.join(user_export_dir, wav_filename_placeholder) # Save in user-specific dir
        
        try:
            with open(wav_filepath_placeholder, "w") as f:
                f.write(f"Placeholder WAV for {track_name} - User: {user_id}")
            wav_files_info.append({
                "track_name": track_name,
                "filename": wav_filename_placeholder, # This is just the name, not full path
                "message": "Placeholder WAV stem. Actual rendering TBD."
            })
        except Exception as e:
            print(f"Error creating placeholder WAV for {track_name}: {e}")
            wav_files_info.append({
                "track_name": track_name,
                "filename": None,
                "message": f"Failed to create placeholder WAV: {e}"
            })

    return {
        "message": "Project export initiated. MIDI file generated. WAV stems are placeholders.",
        "user_id": user_id,
        "project_name": export_data.project_name,
        "midi_file": {
            "filename": midi_filename,
            "download_link_placeholder": f"/api/v1/exports/download/{user_id}/{midi_filename}" # Include user_id in download path
        },
        "wav_stems": [
            {
                **info,
                "download_link_placeholder": f"/api/v1/exports/download/{user_id}/{info["filename"]}" if info["filename"] else None # Include user_id
            } for info in wav_files_info
        ]
    }

# The download endpoint now needs to know the user_id to construct the correct path
# This also implies that the download endpoint itself should be authenticated to ensure
# a user can only download their own files, or files from projects they have access to.
# For simplicity here, we assume the user_id is part of the path and the frontend constructs this path correctly.
# A more robust solution would involve checking permissions based on the authenticated user.
@router.get("/download/{user_id_from_path}/{filename}", summary="Download an exported file")
async def download_exported_file(user_id_from_path: str, filename: str, current_user: User = Depends(get_current_active_user)):
    # Security check: Ensure the authenticated user is the one whose files are being requested
    if current_user.id != user_id_from_path:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this file.")

    filepath = os.path.join(TEMP_EXPORT_DIR, user_id_from_path, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found or export session expired.")
    
    media_type = "application/octet-stream"
    if filename.lower().endswith(".mid") or filename.lower().endswith(".midi"):
        media_type = "audio/midi"
    elif filename.lower().endswith(".wav"):
        media_type = "audio/wav"
        
    return FileResponse(filepath, media_type=media_type, filename=filename)

