// Author: Çağrı Erdem, 2023
// Description: MIDI Drum Sampler for 2groove web app.

import * as Tone from 'tone';
// import { delay, eq, reverb } from "./efx.js";
import { samples } from './samples.js';


const drumParts = ['closed-hihat', 'open-hihat', 'crash', 'ride', 'kick', 'snare', 'hi-tom', 'mid-tom', 'floor-tom'];
const samplers = {};
drumParts.forEach(drum => {
    const drumSamples = {};
    samples[drum].forEach((samplePath, index) => {
        const noteName = Tone.Frequency(60 + index, "midi").toNote();
        drumSamples[noteName] = samplePath;
    });
    samplers[drum] = new Tone.Sampler({
        urls: drumSamples
    }).toDestination();
});


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
function onMIDIMessageReceived(message, verbose = false) {
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
                const sampler = samplers[drumType]; 
                // Trigger the sound w/ a simple Attack-Release envelope TODO: Make better envelopes!
                sampler.triggerAttackRelease(noteToTrigger, hitDuration[drumType]);
                // sampler.chain(eq, delay, reverb); // EFX chain

            } else {
                console.error(`No mappings found for drum type: ${drumType}`);
            }
        }
    }
}


// // WITH THE OLD UI:
//VARIABLES
// // Variable to keep track of the playback state
// let isListening = false;
// // Grab the button from the UI
// const toggleListeningButton = document.getElementById('togglePlaybackButton');


// //EVENT LISTENERS
// // Add an event listener to the button
// toggleListeningButton.addEventListener('click', toggleListening);


// // Handle button click
// function toggleListening() {
//     isListening = !isListening; // Toggle the listening state
//     // Update button text based on the current state // Note that we are not doing it anymore with the new GUI
//     // toggleListeningButton.textContent = isListening ? 'Stop Listening' : 'Start Listening';
//   }
//   if (navigator.requestMIDIAccess) { // request MIDI access
//     navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
//   } else {
//     console.error('WebMIDI is not supported in this browser.');
//   }





// WITH THE NEW UI:
// Instead of using the click event on the button, 
// we will use the change event on the checkbox (since that's what you have now).
// Instead of toggling button text (since there's no text now), 
// we'll toggle the checkbox's checked state.

// Variable to keep track of the playback state
let isListening = false;

// Grab the checkbox from the UI
const toggleListeningCheckbox = document.querySelector('#togglePlaybackButton input[type="checkbox"]');

//EVENT LISTENERS
// Add an event listener to the checkbox
toggleListeningCheckbox.addEventListener('change', toggleListening);

// Handle checkbox state change
function toggleListening() {
    isListening = toggleListeningCheckbox.checked;  // Update listening state based on checkbox
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
