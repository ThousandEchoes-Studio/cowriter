// frontend/src/features/playback_engine/PlaybackEngine.ts
import { Alert } from "react-native";

interface MidiNote {
  pitch: number; // MIDI note number
  start_time: number; // in seconds
  duration: number; // in seconds
  velocity: number; // MIDI velocity (0-127)
}

// This will hold our Web Audio API AudioContext
let audioContext: AudioContext | null = null;
if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
  audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === "suspended") {
    audioContext.resume(); // Try to resume if suspended (e.g., due to browser policy)
  }
}

/**
 * Plays a sequence of MIDI notes using a provided AudioBuffer for all notes,
 * or falls back to a sine wave if no AudioBuffer is provided.
 * @param notes Array of MIDI notes to play.
 * @param sampleBuffer Optional AudioBuffer to use for playing the notes.
 * @param sampleBasePitch Optional MIDI note number representing the original pitch of the sampleBuffer. 
 *                        If provided, playbackRate will be adjusted for pitch shifting.
 *                        If not provided, sample plays at its original pitch.
 */
export const playMidiNotesWithSample = async (
  notes: MidiNote[],
  sampleBuffer?: AudioBuffer,
  sampleBasePitch: number = 60 // Default to C4 (MIDI note 60) if not specified
) => {
  if (!audioContext) {
    Alert.alert("Playback Error", "Web Audio API not supported or initialized.");
    return;
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  if (!notes || notes.length === 0) {
    Alert.alert("Playback Info", "No notes to play.");
    return;
  }

  console.log("Attempting to play MIDI notes. Sample provided:", !!sampleBuffer);
  const overallStartTime = audioContext.currentTime + 0.1; // Start playing shortly

  notes.forEach(note => {
    const noteStartTime = overallStartTime + note.start_time;
    const noteDuration = Math.max(0.05, note.duration); // Ensure minimum duration for playback
    const velocityGain = note.velocity / 127;

    if (sampleBuffer) {
      // Play the sample
      const source = audioContext!.createBufferSource();
      source.buffer = sampleBuffer;
      
      // Pitch shifting: Adjust playbackRate to match the note's pitch
      // The formula for playbackRate is 2^(semitones_difference / 12)
      const semitones = note.pitch - sampleBasePitch;
      source.playbackRate.value = Math.pow(2, semitones / 12);

      const gainNode = audioContext!.createGain();
      // Simple envelope: quick attack, sustain, quick release
      gainNode.gain.setValueAtTime(0, noteStartTime);
      gainNode.gain.linearRampToValueAtTime(velocityGain * 0.7, noteStartTime + 0.02); // Attack
      // Hold gain until just before release
      gainNode.gain.setValueAtTime(velocityGain * 0.7, noteStartTime + noteDuration - 0.03);
      gainNode.gain.linearRampToValueAtTime(0, noteStartTime + noteDuration); // Release

      source.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      source.start(noteStartTime);
      // Stop the source slightly after the note duration to allow release to complete
      source.stop(noteStartTime + noteDuration + 0.1);

    } else {
      // Fallback to sine wave if no sample is provided
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      const frequency = 440 * Math.pow(2, (note.pitch - 69) / 12);
      oscillator.frequency.setValueAtTime(frequency, noteStartTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, noteStartTime);
      gainNode.gain.linearRampToValueAtTime(velocityGain * 0.5, noteStartTime + 0.05);
      gainNode.gain.setValueAtTime(velocityGain * 0.5, noteStartTime + noteDuration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, noteStartTime + noteDuration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      oscillator.start(noteStartTime);
      oscillator.stop(noteStartTime + noteDuration);
    }
  });
};

console.log("PlaybackEngine.ts loaded. AudioContext state:", audioContext?.state);

