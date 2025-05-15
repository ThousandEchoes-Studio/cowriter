// frontend/src/features/ai_suggestions/AISuggestionsComponent.tsx
import React, { useState } from "react";
import {
  View,
  Button,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import {
  AISuggestionService,
  ProjectDataContext,
} from "../../services/ApiService";

// Placeholder types for suggestions (align with backend placeholders)
interface ChordSuggestion {
  progression: string[];
  confidence: number;
  style_match: string;
}

interface LyricSuggestion {
  type: string;
  text: string;
  sentiment?: string;
  rhyme_scheme_fit?: string;
  keywords?: string[];
}

const AISuggestionsComponent: React.FC = () => {
  const [projectLyrics, setProjectLyrics] = useState("Verse 1 lyrics go here...");
  // In a real app, MIDI data and audio features would come from the project state
  const [dummyMidiData, setDummyMidiData] = useState<any[]>([
    { pitch: 60, start_time: 0, duration: 1, velocity: 90 },
  ]);
  const [dummyAudioFeatures, setDummyAudioFeatures] = useState<Record<string, any>>({
    tempo: 120,
    key: "C Major",
  });
  const [dummyUserPrefs, setDummyUserPrefs] = useState<Record<string, any>>({
    mood: "happy",
    complexity: "medium",
  });

  const [chordSuggestions, setChordSuggestions] = useState<ChordSuggestion[]>([]);
  const [lyricSuggestions, setLyricSuggestions] = useState<LyricSuggestion[]>([]);
  const [styleAnalysisResult, setStyleAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentProjectData = (): ProjectDataContext => {
    return {
      midi_data: dummyMidiData,
      audio_features: dummyAudioFeatures,
      lyrics: projectLyrics,
      user_preferences: dummyUserPrefs,
    };
  };

  const handleAnalyzeStyle = async () => {
    setIsLoading(true);
    setError(null);
    setStyleAnalysisResult(null);
    try {
      const data = getCurrentProjectData();
      const result = await AISuggestionService.analyzeStyle(data);
      setStyleAnalysisResult(result);
      Alert.alert("Style Analysis", result.message || "Style analysis complete.");
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to analyze style.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetChordSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setChordSuggestions([]);
    try {
      const data = getCurrentProjectData();
      const result = await AISuggestionService.getChordSuggestions(data);
      setChordSuggestions(result.suggestions || []);
      Alert.alert("Chord Suggestions", result.message || "Chord suggestions received.");
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to get chord suggestions.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLyricSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setLyricSuggestions([]);
    try {
      const data = getCurrentProjectData();
      const result = await AISuggestionService.getLyricSuggestions(data);
      setLyricSuggestions(result.suggestions || []);
      Alert.alert("Lyric Suggestions", result.message || "Lyric suggestions received.");
    } catch (err: any) {
      const errorMessage = err.detail || err.message || "Failed to get lyric suggestions.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AI Songwriting Assistant</Text>

      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Current Project Lyrics (Editable)</Text>
        <TextInput
          style={styles.lyricsInput}
          multiline
          value={projectLyrics}
          onChangeText={setProjectLyrics}
          placeholder="Enter your song lyrics here..."
        />
        {/* In a real app, MIDI and audio features would be displayed or implicitly used */}
      </View>

      <View style={styles.buttonContainer}>
        <Button 
            title={isLoading ? "Analyzing..." : "Analyze Project Style"} 
            onPress={handleAnalyzeStyle} 
            disabled={isLoading} 
        />
      </View>
      {styleAnalysisResult && (
        <View style={styles.resultsSection}>
          <Text style={styles.subTitle}>Style Analysis Result:</Text>
          <Text>{JSON.stringify(styleAnalysisResult.extracted_style_features, null, 2)}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button 
            title={isLoading ? "Getting Chords..." : "Get Chord Suggestions"} 
            onPress={handleGetChordSuggestions} 
            disabled={isLoading} 
        />
      </View>
      {chordSuggestions.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.subTitle}>Chord Suggestions:</Text>
          {chordSuggestions.map((s, i) => (
            <Text key={i} style={styles.suggestionItem}>
              {s.progression.join(" - ")} (Confidence: {s.confidence}, Style: {s.style_match})
            </Text>
          ))}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button 
            title={isLoading ? "Getting Lyrics..." : "Get Lyric Suggestions"} 
            onPress={handleGetLyricSuggestions} 
            disabled={isLoading} 
        />
      </View>
      {lyricSuggestions.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.subTitle}>Lyric Suggestions:</Text>
          {lyricSuggestions.map((s, i) => (
            <Text key={i} style={styles.suggestionItem}>
              [{s.type}] {s.text}
            </Text>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
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
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  lyricsInput: {
    height: 100,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: "white",
    marginBottom: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  resultsSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#eef_suggest", // A light green for results
    borderRadius: 8,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  suggestionItem: {
    fontSize: 14,
    marginBottom: 3,
    paddingLeft: 5,
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

export default AISuggestionsComponent;

