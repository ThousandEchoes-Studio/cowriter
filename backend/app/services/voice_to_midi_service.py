# backend/app/services/voice_to_midi_service.py
import librosa
import numpy as np
import crepe # Import crepe
from typing import List, Dict, Any
import io

# Helper function to convert frequency to MIDI note number
def freq_to_midi(freq):
    if freq <= 0:
        return 0 # Or handle as a rest or invalid note
    return int(round(69 + 12 * np.log2(freq / 440.0)))

async def process_voice_to_midi(audio_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Processes the raw audio content using CREPE for pitch detection and converts it to MIDI-like data.
    """
    print(f"Received audio for MIDI conversion: {filename}, size: {len(audio_content)} bytes")

    try:
        audio_stream = io.BytesIO(audio_content)
        y, sr = librosa.load(audio_stream, sr=16000) # CREPE expects 16kHz sample rate
        duration = librosa.get_duration(y=y, sr=sr)
        print(f"Audio loaded and resampled to 16kHz. Duration: {duration:.2f}s, Sample Rate: {sr} Hz")

        # Perform pitch detection using CREPE
        # time: timestamps of the analysis frames
        # frequency: instantaneous frequency at each frame
        # confidence: confidence of the pitch estimation (0 to 1)
        # activation: raw model output
        time, frequency, confidence, activation = crepe.predict(y, sr, viterbi=True, model_capacity="tiny", step_size=10) # Using "tiny" model for speed, step_size in ms

        print(f"CREPE analysis complete. Found {len(frequency)} frequency points.")

        # Convert frequency contour to MIDI-like notes
        # This is a simplified conversion. A more robust solution would involve note segmentation, 
        # onset/offset detection, and potentially velocity estimation.
        midi_notes = []
        min_confidence = 0.6 # Minimum confidence to consider a pitch valid
        min_note_duration_ms = 50 # Minimum duration for a note in milliseconds
        
        current_note = None
        for i in range(len(time)):
            t = time[i]
            f = frequency[i]
            c = confidence[i]

            if c >= min_confidence and f > 0:
                midi_pitch = freq_to_midi(f)
                if current_note is None:
                    current_note = {"pitch": midi_pitch, "start_time": t, "velocity": int(c * 100) + 27, "raw_confidence": c}
                elif current_note["pitch"] != midi_pitch: # New note pitch
                    note_duration = t - current_note["start_time"]
                    if note_duration * 1000 >= min_note_duration_ms:
                        midi_notes.append({
                            "pitch": current_note["pitch"],
                            "start_time": round(current_note["start_time"], 3),
                            "duration": round(note_duration, 3),
                            "velocity": current_note["velocity"]
                        })
                    current_note = {"pitch": midi_pitch, "start_time": t, "velocity": int(c * 100) + 27, "raw_confidence": c}
                # else: continue current note (implicit)
            elif current_note is not None: # End of a note due to low confidence or silence
                note_duration = t - current_note["start_time"]
                if note_duration * 1000 >= min_note_duration_ms:
                    midi_notes.append({
                        "pitch": current_note["pitch"],
                        "start_time": round(current_note["start_time"], 3),
                        "duration": round(note_duration, 3),
                        "velocity": current_note["velocity"]
                    })
                current_note = None
        
        # Add the last note if it was still active
        if current_note is not None:
            note_duration = time[-1] - current_note["start_time"]
            if note_duration * 1000 >= min_note_duration_ms:
                 midi_notes.append({
                    "pitch": current_note["pitch"],
                    "start_time": round(current_note["start_time"], 3),
                    "duration": round(note_duration, 3),
                    "velocity": current_note["velocity"]
                })

        print(f"Converted to {len(midi_notes)} MIDI-like notes.")

        return {
            "filename": filename,
            "status": "success",
            "message": "MIDI conversion using CREPE complete.",
            "sample_rate_processed": sr,
            "duration_seconds": round(duration, 2),
            "notes": midi_notes,
            "tempo_bpm": 120 # Placeholder tempo, could be estimated later
        }

    except Exception as e:
        print(f"Error during CREPE processing or MIDI conversion: {str(e)}")
        # import traceback
        # traceback.print_exc()
        return {
            "filename": filename,
            "status": "error",
            "message": f"Failed to process audio with CREPE or convert to MIDI: {str(e)}",
            "notes": []
        }

