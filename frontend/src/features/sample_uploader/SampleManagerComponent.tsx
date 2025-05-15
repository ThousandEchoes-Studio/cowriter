// frontend/src/features/sample_uploader/SampleManagerComponent.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Button,
  Text,
  Alert,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
} from "react-native";
import { SampleService } from "../../services/ApiService";
import { useSamples, LoadedSample } from "../../contexts/SampleContext"; // Import useSamples

// --- IMPORTANT NOTE FOR USER ---
// Actual file picking from device storage in React Native
// requires a library like `react-native-document-picker` or `expo-document-picker`.
// This component will use a simulated file for the upload functionality for now.

interface UserSample {
  sample_id: string;
  filename: string;
  instrument_name: string;
  user_id: string;
  upload_date: string;
  // This would be the URL from backend storage to fetch the actual sample data
  url?: string; 
}

let audioContextInstance: AudioContext | null = null;
if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
  audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
}

const SampleManagerComponent: React.FC = () => {
  const [instrumentName, setInstrumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userSamples, setUserSamples] = useState<UserSample[]>([]); // Samples fetched from backend
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { addLoadedSample, loadedSamples: contextLoadedSamples } = useSamples(); // Use context

  const fetchUserSamples = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const samplesFromApi = await SampleService.getUserSamples();
      setUserSamples(samplesFromApi);
      // Optionally, auto-load samples into AudioBuffers here if they have URLs
      // For now, loading will be manual via a button or upon selection for playback
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to fetch user samples.";
      setFetchError(errorMessage);
      Alert.alert("Error Fetching Samples", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserSamples();
  }, [fetchUserSamples]);

  const handleFileSelection = () => {
    const sampleRate = 44100;
    const duration = 1; 
    const numChannels = 1;
    const numSamples = sampleRate * duration;
    const audioData = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      audioData[i] = Math.floor(Math.random() * 65536 - 32768);
    }
    const wavBuffer = createWavBuffer(audioData, numChannels, sampleRate);
    const simulatedSampleBlob = new Blob([wavBuffer], { type: "audio/wav" });
    const filename = `simulated_sample_${Date.now()}.wav`;
    const simulatedFile = new File([simulatedSampleBlob], filename, { type: "audio/wav" });
    setSelectedFile(simulatedFile);
    Alert.alert("File Selected (Simulated)", `Selected: ${simulatedFile.name}. Enter an instrument name and upload.`);
  };

  const loadAndCacheSample = async (file: File, sampleId: string, name: string) => {
    if (!audioContextInstance) {
      Alert.alert("Audio Error", "AudioContext not available.");
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextInstance.decodeAudioData(arrayBuffer);
      addLoadedSample({ id: sampleId, name: name, audioBuffer });
      Alert.alert("Sample Loaded", `Sample '${name}' loaded into memory for playback.`);
    } catch (error) {
      console.error("Error loading sample into AudioBuffer:", error);
      Alert.alert("Sample Load Error", `Could not decode or cache sample: ${name}`);
    }
  };

  const handleUploadSample = async () => {
    if (!selectedFile) {
      Alert.alert("No File", "Please select a sample file first (simulated).");
      return;
    }
    if (!instrumentName.trim()) {
      Alert.alert("No Instrument Name", "Please enter a name for this instrument sample.");
      return;
    }

    setIsLoading(true);
    setUploadError(null);
    try {
      // Simulate backend upload returning a sample_id
      const resultFromUpload = await SampleService.uploadSample(selectedFile, instrumentName);
      Alert.alert("Upload Success", resultFromUpload.message || `Sample '${resultFromUpload.filename}' uploaded as '${resultFromUpload.instrument_name}'.`);
      
      // After successful (simulated) upload, load it into context for immediate use
      if (resultFromUpload.sample_id) {
        await loadAndCacheSample(selectedFile, resultFromUpload.sample_id, resultFromUpload.instrument_name || selectedFile.name);
      }

      setSelectedFile(null);
      setInstrumentName("");
      fetchUserSamples(); // Refresh the list from backend
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to upload sample.";
      setUploadError(errorMessage);
      Alert.alert("Upload Error", errorMessage);
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

  const renderSampleItem = ({ item }: { item: UserSample }) => {
    const isCached = contextLoadedSamples.some(s => s.id === item.sample_id);
    return (
      <View style={styles.sampleItemContainer}>
        <Text style={styles.sampleFilename}>{item.filename}</Text>
        <Text style={styles.sampleInstrumentName}>Instrument: {item.instrument_name}</Text>
        <Text style={styles.sampleDate}>Uploaded: {new Date(item.upload_date).toLocaleDateString()}</Text>
        {/* Button to load sample if not already cached - assuming URL is available */}
        {/* This part is more conceptual as the backend placeholder doesn't return URLs */}
        {!isCached && item.url && (
            <Button title="Load to Memory" onPress={async () => {
                if (!audioContextInstance) return;
                try {
                    const response = await fetch(item.url!);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContextInstance.decodeAudioData(arrayBuffer);
                    addLoadedSample({ id: item.sample_id, name: item.instrument_name || item.filename, audioBuffer });
                    Alert.alert("Loaded", `${item.instrument_name} loaded.`);
                } catch (e) { console.error("Failed to load sample from URL", e); Alert.alert("Error", "Could not load sample from URL.");}
            }} />
        )}
        {isCached && <Text style={styles.cachedText}> (In Memory)</Text>}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sample Manager</Text>

      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Upload New Sample (Simulated WAV)</Text>
        <Button title={selectedFile ? `Selected: ${selectedFile.name}` : "Select Sample File (Simulated)"} onPress={handleFileSelection} />
        <TextInput
          style={styles.input}
          placeholder="Instrument Name (e.g., Kick, Synth Pad)"
          value={instrumentName}
          onChangeText={setInstrumentName}
        />
        <Button 
          title={isLoading ? "Uploading..." : "Upload & Load to Memory"} 
          onPress={handleUploadSample} 
          disabled={!selectedFile || isLoading || !instrumentName.trim()}
        />
        {uploadError && <Text style={styles.errorText}>Upload Error: {uploadError}</Text>}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Your Uploaded Samples (from API)</Text>
        {fetchError && <Text style={styles.errorText}>Fetch Error: {fetchError}</Text>}
        {isLoading && !userSamples.length && <Text>Loading samples...</Text>}
        {userSamples.length > 0 ? (
          <FlatList
            data={userSamples}
            renderItem={renderSampleItem}
            keyExtractor={(item) => item.sample_id}
          />
        ) : (
          !isLoading && <Text>No samples uploaded yet (according to API).</Text>
        )}
         <Button title="Refresh Samples List" onPress={fetchUserSamples} disabled={isLoading} />
      </View>
      
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Samples Currently in Memory (Context)</Text>
        {contextLoadedSamples.length > 0 ? (
            contextLoadedSamples.map(s => <Text key={s.id}>- {s.name} (ID: {s.id})</Text>)
        ) : (
            <Text>No samples loaded into memory via context yet.</Text>
        )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  uploadSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  listSection: {
    marginBottom: 20, // Added margin for separation
    padding: 15,
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
    backgroundColor: "white",
  },
  errorText: {
    color: "red",
    marginTop: 5,
  },
  sampleItemContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  sampleFilename: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sampleInstrumentName: {
    fontSize: 14,
    color: "#333",
  },
  sampleDate: {
    fontSize: 12,
    color: "#666",
  },
  cachedText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "green",
  }
});

export default SampleManagerComponent;

