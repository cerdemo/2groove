// Author: Çağrı Erdem, 2023
// Description: Defining a global state module to fetch MIDI (bytes) 
// data from the server and make it available to all modules of the 2groove web app.

export const globalFetch = {
  midiData: null,
  midiReadyForProcessing: false,  // The gate

  setMidiData(data) {
      console.log("MIDI data received in bytes!", data);
      this.midiData = data;
      this.midiReadyForProcessing = true;  // Open the gate
  },

  getMidiData() {
      return this.midiData;
  },

  isMidiReadyForProcessing() {
      return this.midiReadyForProcessing;
  },

  midiProcessed() { 
      this.midiReadyForProcessing = false;  // Close the gate
  },
  
};

