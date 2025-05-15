// frontend/src/features/exports/ExportComponent.tsx
import React, { useState } from "react";
import {
  View,
  Button,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import {
  ExportService,
  ProjectExportData,
} from "../../services/ApiService";

// Placeholder types for exported file info (align with backend placeholders)
interface ExportedFileInfo {
  filename: string;
  download_link_placeholder: string; // This will be the relative path for download
  track_name?: string; // For WAV stems
  message?: string; // For WAV stems
}

interface ExportResult {
  message: string;
  user_id: string;
  project_name: string;
  midi_file: ExportedFileInfo;
  wav_stems: ExportedFileInfo[];
}

const ExportComponent: React.FC = () => {
  const [projectName, setProjectName] = useState("MyCowriterSong");
  // Dummy data for export - in a real app, this would come from the project state
  const [dummyMidiTracks, setDummyMidiTracks] = useState<ProjectExportData["midi_tracks"]>([
    {
      track_name: "Vocals",
      notes: [
        { pitch: 60, start_time: 0, duration: 1, velocity: 90 },
        { pitch: 62, start_time: 1, duration: 0.5, velocity: 100 },
      ],
    },
    {
      track_name: "Drums",
      notes: [
        { pitch: 36, start_time: 0, duration: 0.25, velocity: 120 }, // Kick
        { pitch: 38, start_time: 0.5, duration: 0.25, velocity: 100 }, // Snare
      ],
    },
  ]);
  const [dummyTempo, setDummyTempo] = useState(120);

  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportProject = async () => {
    setIsLoading(true);
    setError(null);
    setExportResult(null);

    const exportData: ProjectExportData = {
      project_name: projectName || "UntitledProject",
      midi_tracks: dummyMidiTracks,
      tempo_bpm: dummyTempo,
      lyrics: "Some example lyrics for the project...", // Optional
    };

    try {
      const result = await ExportService.exportProject(exportData);
      setExportResult(result);
      Alert.alert("Export Successful", result.message || "Project export initiated.");
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to export project.";
      setError(errorMessage);
      Alert.alert("Export Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = (filename: string | undefined) => {
    if (!filename) {
        Alert.alert("Download Error", "No filename provided for download.");
        return;
    }
    const downloadUrl = ExportService.getDownloadUrl(filename);
    console.log("Attempting to download:", downloadUrl);

    if (Platform.OS === "web") {
      // For web, create a link and click it
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename); // Or let the browser determine from Content-Disposition
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For React Native, direct linking might open in browser, or need a file download library
      Linking.canOpenURL(downloadUrl).then(supported => {
        if (supported) {
          Linking.openURL(downloadUrl);
        } else {
          Alert.alert("Download Error", `Don't know how to open this URL: ${downloadUrl}. In React Native, a library like Expo FileSystem or react-native-fs is needed for direct downloads.`);
        }
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Export Project</Text>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Project Name for Export:</Text>
        <TextInput
          style={styles.input}
          value={projectName}
          onChangeText={setProjectName}
          placeholder="Enter project name"
        />
        {/* In a real app, MIDI tracks and tempo would be derived from the project state */}
      </View>

      <View style={styles.buttonContainer}>
        <Button 
            title={isLoading ? "Exporting..." : "Export Project (MIDI & WAV Stems)"} 
            onPress={handleExportProject} 
            disabled={isLoading}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {exportResult && (
        <View style={styles.resultsSection}>
          <Text style={styles.subTitle}>Exported Files:</Text>
          <Text style={styles.resultMessage}>{exportResult.message}</Text>
          
          {exportResult.midi_file && exportResult.midi_file.filename && (
            <View style={styles.fileItem}>
              <Text>MIDI File: {exportResult.midi_file.filename}</Text>
              <Button title="Download MIDI" onPress={() => handleDownloadFile(exportResult.midi_file.filename)} />
            </View>
          )}

          {exportResult.wav_stems && exportResult.wav_stems.length > 0 && (
            <View style={{marginTop: 10}}>
              <Text style={styles.subSubTitle}>WAV Stems (Placeholders):</Text>
              {exportResult.wav_stems.map((stem, index) => (
                stem.filename ? (
                    <View key={index} style={styles.fileItem}>
                    <Text>{stem.track_name || `Stem ${index + 1}`}: {stem.filename}</Text>
                    <Text style={styles.stemMessage}>({stem.message})</Text>
                    <Button title={`Download ${stem.track_name || `Stem ${index + 1}`}`} onPress={() => handleDownloadFile(stem.filename)} />
                    </View>
                ) : null
              ))}
            </View>
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
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputSection: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  resultsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e8f4f8",
    borderRadius: 8,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultMessage: {
    fontSize: 14,
    marginBottom: 10,
    fontStyle: "italic",
  },
  fileItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d0e0e8",
    marginBottom: 5,
  },
  subSubTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 5,
    marginBottom: 5,
  },
  stemMessage: {
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
    marginBottom: 3,
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#ffdddd",
    borderRadius: 5,
  },
  errorTitle: {
    color: "#D8000C",
    fontWeight: "bold",
  },
  errorText: {
    color: "#D8000C",
  },
});

export default ExportComponent;

