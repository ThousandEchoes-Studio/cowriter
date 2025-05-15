// frontend/src/contexts/SampleContext.tsx
import React, { createContext, useState, useContext, ReactNode } from "react";

export interface LoadedSample {
  id: string; // Corresponds to UserSample.sample_id
  name: string; // Corresponds to UserSample.instrument_name or filename
  audioBuffer: AudioBuffer;
}

interface SampleContextType {
  loadedSamples: LoadedSample[];
  addLoadedSample: (sample: LoadedSample) => void;
  getSampleBufferById: (id: string) => AudioBuffer | undefined;
}

const SampleContext = createContext<SampleContextType | undefined>(undefined);

export const SampleProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [loadedSamples, setLoadedSamples] = useState<LoadedSample[]>([]);

  const addLoadedSample = (sample: LoadedSample) => {
    setLoadedSamples(prevSamples => {
      // Avoid duplicates by ID
      if (prevSamples.find(s => s.id === sample.id)) {
        return prevSamples.map(s => s.id === sample.id ? sample : s);
      }
      return [...prevSamples, sample];
    });
  };

  const getSampleBufferById = (id: string): AudioBuffer | undefined => {
    const sample = loadedSamples.find(s => s.id === id);
    return sample?.audioBuffer;
  };

  return (
    <SampleContext.Provider value={{ loadedSamples, addLoadedSample, getSampleBufferById }}>
      {children}
    </SampleContext.Provider>
  );
};

export const useSamples = () => {
  const context = useContext(SampleContext);
  if (context === undefined) {
    throw new Error("useSamples must be used within a SampleProvider");
  }
  return context;
};

