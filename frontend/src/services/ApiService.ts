// frontend/src/services/ApiService.ts
import axios from "axios";
import { getAuth } from "firebase/auth"; // Import Firebase auth
import firebaseApp from "../firebaseConfig"; // Import your Firebase app initialization

// Define the base URL for your backend API
// This should be set via an environment variable during the build/deployment process (e.g., REACT_APP_API_BASE_URL)
// The placeholder below would be replaced by the actual deployed backend URL.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://cowriter-backend-placeholder.example.com/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the Firebase ID token
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting Firebase ID token:", error);
        // Handle error, e.g., redirect to login or show a message
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


interface MidiNote {
    pitch: number;
    start_time: number;
    duration: number;
    velocity: number;
}

export interface ProjectDataContext {
    midi_data: MidiNote[]; 
    audio_features: Record<string, any>; 
    lyrics: string; 
    user_preferences: Record<string, any>; 
}

// Define a type for the project data to be sent for export
export interface ProjectExportData {
    project_name: string;
    midi_tracks: Array<{ track_name?: string; notes: MidiNote[] }>;
    lyrics?: string;
    tempo_bpm: number;
}

export const VoiceProcessingService = {
  uploadVoiceForMidiConversion: async (audioFile: File) => {
    const formData = new FormData();
    formData.append("audio_file", audioFile);
    try {
      const response = await apiClient.post("/process/voice-to-midi/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error uploading audio for MIDI:", error.response.data);
        throw error.response.data;
      } else {
        console.error("Unexpected error uploading audio for MIDI:", error);
        throw new Error("Unexpected error during audio upload for MIDI conversion.");
      }
    }
  },
};

export const SampleService = {
  uploadSample: async (sampleFile: File, instrumentName: string) => {
    const formData = new FormData();
    formData.append("sample_file", sampleFile);
    formData.append("instrument_name", instrumentName);
    try {
      const response = await apiClient.post("/samples/upload-sample/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error uploading sample:", error.response.data);
        throw error.response.data;
      } else {
        console.error("Unexpected error uploading sample:", error);
        throw new Error("Unexpected error during sample upload.");
      }
    }
  },
  getUserSamples: async () => {
    try {
      const response = await apiClient.get("/samples/user-samples/");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error fetching samples:", error.response.data);
        throw error.response.data;
      } else {
        console.error("Unexpected error fetching samples:", error);
        throw new Error("Unexpected error while fetching user samples.");
      }
    }
  },
};

export const AISuggestionService = {
  analyzeStyle: async (projectData: ProjectDataContext) => {
    try {
      const response = await apiClient.post("/ai/analyze-style/", projectData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error analyzing style:", error.response.data);
        throw error.response.data;
      } else {
        console.error("An unexpected error occurred during style analysis:", error);
        throw new Error("An unexpected error occurred during style analysis.");
      }
    }
  },
  getChordSuggestions: async (projectData: ProjectDataContext) => {
    try {
      const response = await apiClient.post("/ai/chord-suggestions/", projectData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error getting chord suggestions:", error.response.data);
        throw error.response.data;
      } else {
        console.error("An unexpected error occurred while getting chord suggestions:", error);
        throw new Error("An unexpected error occurred while getting chord suggestions.");
      }
    }
  },
  getLyricSuggestions: async (projectData: ProjectDataContext) => {
    try {
      const response = await apiClient.post("/ai/lyric-suggestions/", projectData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error getting lyric suggestions:", error.response.data);
        throw error.response.data;
      } else {
        console.error("An unexpected error occurred while getting lyric suggestions:", error);
        throw new Error("An unexpected error occurred while getting lyric suggestions.");
      }
    }
  },
};

export const ExportService = {
  exportProject: async (exportData: ProjectExportData) => {
    try {
      const response = await apiClient.post("/exports/export-project/", exportData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error exporting project:", error.response.data);
        throw error.response.data;
      } else {
        console.error("An unexpected error occurred during project export:", error);
        throw new Error("An unexpected error occurred during project export.");
      }
    }
  },
  getDownloadUrl: (userId: string, filename: string): string => {
    if (!userId) {
        console.error("User ID is required to construct download URL for exports.");
        return "#error-user-id-missing";
    }
    return `${API_BASE_URL}/exports/download/${userId}/${filename}`;
  },
};

// Subscription type from backend schema (simplified for frontend use)
export interface Subscription {
    id: string;
    user_id: string;
    plan_id: string; // e.g., "free", "premium_monthly"
    status: "active" | "inactive" | "cancelled" | "past_due" | "trialing";
    current_period_start?: string; // ISO date string
    current_period_end?: string; // ISO date string
    // Add other relevant fields you might want to display
}

export const BillingService = {
  createCheckoutSession: async (planId: string): Promise<{ sessionId: string; publishableKey: string; message?: string }> => {
    try {
      const response = await apiClient.post("/billing/create-checkout-session/", { plan_id: planId });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error creating checkout session:", error.response.data);
        throw error.response.data;
      } else {
        console.error("Unexpected error creating checkout session:", error);
        throw new Error("Unexpected error during checkout session creation.");
      }
    }
  },
  getSubscriptionStatus: async (): Promise<Subscription> => {
    try {
      const response = await apiClient.get("/billing/subscription-status/");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error fetching subscription status:", error.response.data);
        // For prototype, if error, return a default free plan status to avoid UI breaking
        // In a real app, handle this more gracefully (e.g., show error, retry)
        console.warn("Defaulting to free plan status due to error.");
        return {
            id: `sub_placeholder_error`,
            user_id: "error_user",
            plan_id: "free",
            status: "active",
        } as Subscription;
        // throw error.response.data; 
      } else {
        console.error("Unexpected error fetching subscription status:", error);
        throw new Error("Unexpected error while fetching subscription status.");
      }
    }
  },
};

export default apiClient;

