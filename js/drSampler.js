// Author: Çağrı Erdem, 2023
// Description: Browser-based Drumkit App for the tap2groove model
// drumApp2.js is the second version of the drumApp.js file, which uses Tone.js. 
import * as Tone from 'tone';



// SAMPLER
// Closed hi-hat
const closedHiHatSamples = {};
for (let i = 1; i <= 12; i++) {
  const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); // C3, C#3, D3, D#3, etc.
  const samplePath = `./src/drs/parts/closed-hihat_${i}.mp3`;
  closedHiHatSamples[noteName] = samplePath;
}
console.log(closedHiHatSamples);
const closedHiHatSampler = new Tone.Sampler({
    urls: closedHiHatSamples
}).toDestination();

// Open hi-hat
const openHiHatSamples = {}; // Open hi-hat
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote();  // Middle-C is 60
    const samplePath = `./src/drs/parts/open-hihat_${i}.mp3`;
    openHiHatSamples[noteName] = samplePath;
    // openHiHatSamples[i] = samplePath;
}
const openHiHatSampler = new Tone.Sampler({
    urls: openHiHatSamples
}).toDestination();

// Crash
const crashSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/crash_${i}.mp3`;
    crashSamples[noteName] = samplePath;
}
const crashSampler = new Tone.Sampler({
    urls: crashSamples
}).toDestination();

// Ride
const rideSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/ride_${i}.mp3`;
    rideSamples[noteName] = samplePath;
}
const rideSampler = new Tone.Sampler({
    urls: rideSamples
}).toDestination();

// Kick
const kickSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/kick_${i}.mp3`;
    kickSamples[noteName] = samplePath;
}
const kickSampler = new Tone.Sampler({
    urls: kickSamples
}).toDestination();

// Snare
const snareSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/snare_${i}.mp3`;
    snareSamples[noteName] = samplePath;
}
const snareSampler = new Tone.Sampler({
    urls: snareSamples
}).toDestination();

// High tom
const hiTomSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/hi-tom_${i}.mp3`;
    hiTomSamples[noteName] = samplePath;
}
console.log(hiTomSamples);
const hiTomSampler = new Tone.Sampler({
    urls: hiTomSamples
}).toDestination();

// Mid tom
const midTomSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/mid-tom_${i}.mp3`;
    midTomSamples[noteName] = samplePath;
}
console.log(midTomSamples);
const midTomSampler = new Tone.Sampler({
    urls: midTomSamples
}).toDestination();

// Floor tom
const floorTomSamples = {};
for (let i = 1; i <= 12; i++) {
    const noteName = Tone.Frequency(60 + i-1, "midi").toNote(); 
    const samplePath = `./src/drs/parts/floor-tom_${i}.mp3`;
    floorTomSamples[noteName] = samplePath;
}
console.log(floorTomSamples);
const floorTomSampler = new Tone.Sampler({
    urls: floorTomSamples
}).toDestination();


// Function to map MIDI velocity to the appropriate sample note
function mapVelocityToSample(velocity) {
    const numberOfSamples = 12;
    // 0–127 divided into 12 segments
    const segment = Math.ceil(128 / numberOfSamples);
    // Calculate the sample index (1–12) based on the velocity
    const sampleIndex = Math.ceil(velocity / segment);
    // Calculate the MIDI note number (60 is C3, 71 is B3)
    const noteNumber = 60 + sampleIndex - 1;
    // Convert the MIDI note number to note name (C3, C#3, D3, ...)
    return Tone.Frequency(noteNumber, "midi").toNote();
}


  // Dict to map MIDI note number to the appropriate sample note
const drumMappings = { // TODO: String or Int?
    'C1' : "kick",
    'D1' : "snare",
    'F1' : "floor-tom",
    'B1' : "mid-tom",
    'C2' : "hi-tom",
    'C#2' : "crash",
    'D#2' : "ride",
    'F#1' : "closed-hihat",
    'A#1' : "open-hihat",
};

const drumSamplers = {
    "closed-hihat": closedHiHatSampler,
    "open-hihat": openHiHatSampler,
    "crash": crashSampler,
    "ride": rideSampler,
    "kick": kickSampler,
    "snare": snareSampler,
    "hi-tom": hiTomSampler,
    "mid-tom": midTomSampler,
    "floor-tom": floorTomSampler,
};


// TODO: helper function to apply the envelope to a given sampler
const drumADSR = {
    "closed-hihat": { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1,},
    "open-hihat": { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3,},
    "crash": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "ride": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "kick": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "snare": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "hi-tom": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "mid-tom": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
    "floor-tom": { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3,},
};
function applyEnvelope(envParams, duration) {
    // Duration defaults to 0.5 if not provided TODO: Calculate the duration for each beat
    // duration = duration || 0.5;
    
    // Create the envelope with the provided parameters
    const env = new Tone.Envelope(envParams).toDestination();
    
    // Connect the envelope to the sampler
    // sampler.connect(env);

    // Trigger the envelope
    env.triggerAttackRelease(duration);
}


// When processing MIDI data in software, developers often use conditional statements like if (status === 144) to check the type of MIDI message received and to handle it accordingly. 
// In this particular case, the software would execute specific logic for "Note On" messages on channel 1.
// The MIDI message is an array of integers. The first integer is the status byte, which contains the message type and the MIDI channel.
function onMIDIMessageReceived(message, verbose = true) {
    if (isListening) {
        const [status, noteNumber, velocity] = message.data;
        const noteName = Tone.Frequency(noteNumber-12, "midi").toNote();
        const drumType = drumMappings[noteName];
        if (verbose) {
        // console.log(typeof noteName);
        console.log( noteNumber, noteName, velocity); // buraya kadar tamam.
        console.log("drumType: ", drumType);
        }
        // AR for each drum part
        const hitDuration = {
            "closed-hihat": "1n",
            "open-hihat": "2n",
            "crash": "1n",
            "ride": "1n",
            "kick": "8n",
            "snare": "2n",
            "hi-tom": "4n",
            "mid-tom": "4n",
            "floor-tom": "4n",
        };
    
        if (status === 144 && drumMappings[noteName]) {
            // const drumType = drumMappings[noteName];
            const noteToTrigger = mapVelocityToSample(velocity); // assume `velocity` is provided by MIDI
            // console.log(`Drum type and note to trigger: ${drumType} ${noteToTrigger}`);
    
            if (drumType) {
                // Lookup the appropriate sampler using the drumType
                const sampler = drumSamplers[drumType]; 
                // Trigger the sound w/ a simple Attack-Release envelope TODO: Make better envelopes!
                sampler.triggerAttackRelease(noteToTrigger, hitDuration[drumType]);
            } else {
                console.error(`No mappings found for drum type: ${drumType}`);
            }
        }
    }
}



//VARIABLES
// Variable to keep track of the playback state
let isListening = false;
// Grab the button from the UI
const toggleListeningButton = document.getElementById('togglePlaybackButton');


//EVENT LISTENERS
// Add an event listener to the button
toggleListeningButton.addEventListener('click', toggleListening);


// Handle button click
function toggleListening() {
    isListening = !isListening; // Toggle the listening state
    // Update button text based on the current state
    toggleListeningButton.textContent = isListening ? 'Stop Listening' : 'Start Listening';
  }
  if (navigator.requestMIDIAccess) { // request MIDI access
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    console.error('WebMIDI is not supported in this browser.');
  }
  
  
  // Handle successful MIDI access
  function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
      input.value.onmidimessage = onMIDIMessageReceived;
    //   console.log("Input value: ", input.value);
    }
  
    midiAccess.onstatechange = function(e) {
      if (e.port.state === 'connected') {
        e.port.onmidimessage = onMIDIMessageReceived;
      } else if (e.port.state === 'disconnected') {
        e.port.onmidimessage = null;
        // Try to refresh MIDI connections after a short delay
        setTimeout(() => {
          refreshMIDIAccess();
        }, 1000);
      }
    };
  }
  
  function refreshMIDIAccess() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
      console.error('WebMIDI is not supported in this browser.');
    }
  }
  
  function onMIDIFailure(e) {
    console.error('Could not access MIDI devices:', e);
  }

    // NOTES:
  // Uint8Array(3): This indicates the array contains three elements. MIDI messages typically consist of 1-3 bytes, so this is consistent with typical MIDI behavior.
  // [128, 36, 0]: These are the actual values (in decimal) of the MIDI message:
  // 128: This is the status byte. In MIDI, a value of 128 (0x80 in hexadecimal) typically corresponds to a "Note Off" message for channel 1.
  // 36: This is the first data byte. For "Note On" and "Note Off" messages, this represents the MIDI note number. In this case, it's 36 which might correspond to a kick drum in a typical MIDI drum map.
  // 0: This is the second data byte. For "Note On" and "Note Off" messages, this represents the velocity (or volume) of the note. A velocity of 0 for a "Note On" message is often treated as a "Note Off".
  // buffer, byteLength, byteOffset, etc.: These are properties of the Uint8Array and provide information about the underlying buffer storage and the array's size. For most MIDI applications, you won't need to worry about these.
  // For example, a MIDI message (128, 36, 0) can be interpreted as: "Note Off" for MIDI note 36 on channel 1 with a velocity of 0.
  