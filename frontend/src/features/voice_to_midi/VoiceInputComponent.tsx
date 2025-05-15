// frontend/src/features/voice_to_midi/VoiceInputComponent.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Button, Text, Alert, Platform, StyleSheet, ScrollView, Picker } from "react-native"; // Added Picker
import { VoiceProcessingService } from "../../services/ApiService";
import { useSamples } from "../../contexts/SampleContext"; // Import useSamples
import { playMidiNotesWithSample } from "../playback_engine/PlaybackEngine"; // Import playback function

// --- IMPORTANT NOTE FOR USER ---
// To enable actual microphone recording, a library like `expo-av` (for Expo projects)
// or `react-native-audio-recorder` / `react-native-voice` (for bare React Native)
// would need to be installed and integrated. The following code provides a conceptual
// structure for recording and uses a placeholder for the actual recording mechanism.
// For now, it continues to use a simulated audio file for API testing.

interface MidiNote {
  pitch: number; // MIDI note number
  start_time: number; // in seconds
  duration: number; // in seconds
  velocity: number; // MIDI velocity (0-127)
}

interface MidiData {
  filename: string;
  status: string;
  message: string;
  sample_rate_processed?: number;
  duration_seconds?: number;
  notes: MidiNote[];
  tempo_bpm?: number;
}

const VoiceInputComponent: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [midiResult, setMidiResult] = useState<MidiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { loadedSamples, getSampleBufferById } = useSamples(); // Get samples from context
  const [selectedSampleId, setSelectedSampleId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Auto-select the first available sample if none is selected
    if (!selectedSampleId && loadedSamples.length > 0) {
      setSelectedSampleId(loadedSamples[0].id);
    }
  }, [loadedSamples, selectedSampleId]);

  const startRecording = async () => {
    setIsRecording(true);
    setError(null);
    setMidiResult(null);
    console.log("Starting recording (simulated)...");
    setTimeout(() => {
        stopRecordingAndUpload(true); 
    }, 3000);
  };

  const stopRecordingAndUpload = async (isSimulatedSuccess: boolean = false) => {
    console.log("Stopping recording (simulated)...");
    setIsRecording(false);
    if(isSimulatedSuccess){
        const dummyUri = "simulated_live_recording.wav";
        console.log("Simulated recording finished, URI:", dummyUri);
        await handleUpload(dummyUri, true);
    }
  };

  const handleUpload = async (audioFileNameForSim: string, isSimulated: boolean) => {
    if (!audioFileNameForSim && isSimulated) {
      Alert.alert("No audio", "No audio recording available to upload.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setMidiResult(null);
    try {
      let audioFile: File;
      if (isSimulated) {
        const sampleRate = 16000;
        const duration = 2;
        const numChannels = 1;
        const numSamples = sampleRate * duration;
        const audioData = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          audioData[i] = Math.floor(Math.random() * 65536 - 32768);
        }
        const wavBuffer = createWavBuffer(audioData, numChannels, sampleRate);
        const simulatedAudioBlob = new Blob([wavBuffer], { type: "audio/wav" });
        audioFile = new File([simulatedAudioBlob], audioFileNameForSim, { type: "audio/wav" });
      } else {
        throw new Error("Actual file handling from recorded URI is not implemented in this placeholder. Please use simulated recording.");
      }
      
      console.log(`Uploading ${isSimulated ? "simulated" : "recorded"} audio file:`, audioFile.name);
      const result = await VoiceProcessingService.uploadVoiceForMidiConversion(audioFile);
      setMidiResult(result);
      if (result.status === "success") {
        Alert.alert("Success", result.message || "MIDI conversion successful.");
      } else {
        Alert.alert("Conversion Info", result.message || `MIDI conversion process finished with status: ${result.status}.`);
      }
    } catch (err: any) {
      console.error("MIDI Conversion Error:", err);
      const errorMessage = err.detail || err.message || "Failed to convert voice to MIDI.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  function createWavBuffer(data: Int16Array, numChannels: number, sampleRate: number) {
    const numSamples = data.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    writeString(view, 0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
    writeString(view, 36, "data"); view.setUint32(40, dataSize, true);
    for (let i = 0; i < numSamples; i++) { view.setInt16(44 + i * 2, data[i], true); }
    return buffer;
  }
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
  }

  const handlePlayMidiWithSample = () => {
    if (!midiResult || midiResult.notes.length === 0) {
      Alert.alert("No MIDI Data", "No MIDI notes available to play.");
      return;
    }
    if (!selectedSampleId) {
      Alert.alert("No Sample Selected", "Please select a sample from the Sample Manager to use for playback, or upload one.");
      // Fallback to sine wave if no sample selected
      playMidiNotesWithSample(midiResult.notes);
      return;
    }
    const sampleBuffer = getSampleBufferById(selectedSampleId);
    if (!sampleBuffer) {
      Alert.alert("Sample Not Loaded", "The selected sample is not loaded in memory. Please ensure it was uploaded and processed correctly.");
      // Fallback to sine wave
      playMidiNotesWithSample(midiResult.notes);
      return;
    }
    // Assuming a default base pitch for the sample (e.g., C4 = MIDI note 60)
    // This could be made configurable per sample in the future.
    playMidiNotesWithSample(midiResult.notes, sampleBuffer, 60);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingAndUpload(true);
    } else {
      startRecording();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Voice to MIDI Converter</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title={isLoading ? "Processing..." : (isRecording ? "Stop Recording (Simulated)" : "Start Recording (Simulated 3s)")}
          onPress={toggleRecording} 
          disabled={isLoading}
          color={isRecording ? "#FF6347" : "#4CAF50"}
        />
      </View>

      {isLoading && <Text style={styles.loadingText}>Processing audio...</Text>}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {midiResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>MIDI Conversion Result:</Text>
          <Text>File: {midiResult.filename}</Text>
          <Text>Status: {midiResult.status}</Text>
          <Text>Message: {midiResult.message}</Text>
          {midiResult.duration_seconds && <Text>Duration: {midiResult.duration_seconds.toFixed(2)}s</Text>}
          {midiResult.sample_rate_processed && <Text>Sample Rate: {midiResult.sample_rate_processed} Hz</Text>}
          {midiResult.tempo_bpm && <Text>Tempo: {midiResult.tempo_bpm} BPM (placeholder)</Text>}
          
          {midiResult.notes.length > 0 && (
            <View style={styles.playbackSection}>
              <Text style={styles.sectionTitle}>Playback with Sample:</Text>
              {Platform.OS === "web" && loadedSamples.length > 0 ? (
                 <Picker
                    selectedValue={selectedSampleId}
                    style={{ height: 50, width: "100%" }}
                    onValueChange={(itemValue) => setSelectedSampleId(itemValue as string)}
                  >
                    {loadedSamples.map(sample => (
                      <Picker.Item key={sample.id} label={sample.name} value={sample.id} />
                    ))}
                  </Picker>
              ) : Platform.OS !== "web" && loadedSamples.length > 0 ? (
                <Text>Sample Picker (React Native specific UI needed)</Text>
              ) : (
                <Text>No samples loaded. Upload samples in Sample Manager.</Text>
              )}
              <Button title="Play MIDI with Selected Sample" onPress={handlePlayMidiWithSample} disabled={!selectedSampleId && loadedSamples.length === 0} />
            </View>
          )}
          
          <Text style={styles.notesTitle}>Notes ({midiResult.notes.length}):</Text>
          {midiResult.notes.length > 0 ? (
            midiResult.notes.map((note, index) => (
              <Text key={index} style={styles.noteText}>
                - P: {note.pitch}, S: {note.start_time.toFixed(2)}s, D: {note.duration.toFixed(2)}s, V: {note.velocity}
              </Text>
            ))
          ) : (
            <Text>(No notes converted or an error occurred)</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    marginVertical: 10,
  },
  loadingText: {
    marginTop: 10,
    textAlign: "center",
    fontStyle: "italic",
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#ffdddd",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ffaaaa",
  },
  errorTitle: {
    color: "#D8000C",
    fontWeight: "bold",
  },
  errorText: {
    color: "#D8000C",
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e6ffe6",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#a6d9a6",
  },
  resultTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
  },
  playbackSection: {
    marginTop: 15,
    marginBottom:15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cccccc"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  notesTitle: {
    marginTop: 10,
    fontWeight: "bold",
    fontSize: 16,
  },
  noteText: {
    fontSize: 14,
    marginLeft: 10,
  },
});

export default VoiceInputComponent;

