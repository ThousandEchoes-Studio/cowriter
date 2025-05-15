// frontend/src/App.tsx
import React from "react";
import { SafeAreaView, StyleSheet, StatusBar, View, ScrollView } from "react-native";
import VoiceInputComponent from "./features/voice_to_midi/VoiceInputComponent";
import SampleManagerComponent from "./features/sample_uploader/SampleManagerComponent";
import AISuggestionsComponent from "./features/ai_suggestions/AISuggestionsComponent";
import ExportComponent from "./features/exports/ExportComponent"; // Import Export Component
import { SampleProvider } from "./contexts/SampleContext";

const App: React.FC = () => {
  return (
    <SampleProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.featureContainer}>
            <VoiceInputComponent />
          </View>
          <View style={styles.separator} />
          <View style={styles.featureContainer}>
            <SampleManagerComponent />
          </View>
          <View style={styles.separator} />
          <View style={styles.featureContainer}>
            <AISuggestionsComponent />
          </View>
          <View style={styles.separator} />
          <View style={styles.featureContainer}>
            <ExportComponent /> { /* Add Export Component */ }
          </View>
        </ScrollView>
      </SafeAreaView>
    </SampleProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E8EAED",
  },
  scrollViewContent: {
    paddingVertical: 10,
  },
  featureContainer: {
    marginBottom: 20,
    marginHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#D1D1D1",
    marginVertical: 15,
    marginHorizontal: 25,
  },
});

export default App;

