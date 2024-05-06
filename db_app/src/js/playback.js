// Author: Çağrı Erdem, 2023
// Description: playback script for the 2groove web app.

import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import { comp, delay, eq, reverb } from "./efx.js";
import { globalFetch } from './globalFetch.js';
import { metroTrigger } from './interface.js';
import { samples } from './samples.js';
import { Metronome } from './utils/metronome.js';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let startTime = null; // Start time for the MIDI playback
let timeouts = []; // Store timeout IDs for scheduled notes

let totalTimeMs = 0; // Initialize totalTimeMs as a global variable

const midiQueue = [];
let currentMidiForVisuals = null;
let isPlaying = false;  // to track the playback status
let processedMidiData;  // Global variable to store the processed MIDI data for download


//////////////////////////////////////////////////////////////
////////////////////// METRONOME /////////////////////////////
//////////////////////////////////////////////////////////////

const tempoSlider = document.getElementById('tempo');
const displayElement = document.getElementById('knob1Value'); // Element to display the tempo value
// Create a new Metronome instance with the initial tempo value:
const metronome = new Metronome(tempoSlider.value, uiCallback); 
metronome.audioContext = audioContext; // Use the same AudioContext as the rest of the app

// Event listener for the tempo slider (e.g., to update the tempo continuously):
tempoSlider.addEventListener("input", function() {
    const bpm = this.value;
    document.getElementById("knob1Value").textContent = bpm; // Update the knob value
    metronome.tempo = bpm; // Update the metronome tempo
});


window.addEventListener('DOMContentLoaded', (event) => {
    const metronomeToggle = document.querySelector("#toggleMetronome input[type='checkbox']");
    metronomeToggle.checked = false; // Ensure the switch is off
});


const metronomeToggle = document.querySelector("#toggleMetronome input[type='checkbox']");
const metronomeToggleLabel = document.querySelector("#toggleMetronome");
metronomeToggle.addEventListener('change', () => {
    if (metronomeToggle.checked) {
        startMetronome()
        metronome.mute = false; // Unmute the metronome
    } else {
        metronome.mute = true; // Mute the metronome
    }
});


const metronomeVolumeControl = document.getElementById('metronomeVolume');
let mainVol = 0.4; // Default volume value
metronomeVolumeControl.addEventListener('input', function(event) {
    const newVolume = parseFloat(event.target.value);
    mainVol = newVolume;
    metronome.setVolume(newVolume); // Assuming 'metronome' is your Metronome class instance
});


///////random metro at page refresh
function randomizeValue(min, max, isInteger) {
    const randomValue = Math.random() * (max - min) + min;
    return isInteger ? Math.floor(randomValue) : randomValue;
}


document.addEventListener('DOMContentLoaded', function() {
    const minTempo = 50; // Define the minimum tempo
    const maxTempo = 200; // Define the maximum tempo

    // Randomize the tempo value
    const randomTempo = randomizeValue(minTempo, maxTempo, true);

    // Update the metronome's tempo and the slider in the UI
    metronome.tempo = randomTempo; 
    tempoSlider.value = randomTempo; 
    if (displayElement) {
        displayElement.textContent = randomTempo; // display element to show the new tempo
    }
});


tempoSlider.addEventListener('input', function(event) {
    const newTempo = parseInt(event.target.value, 10); // Get the new tempo value from the slider
    metronome.tempo = newTempo; // Update the metronome's tempo
    if (displayElement) {
        displayElement.textContent = newTempo; // Also update the display element, if applicable
    }
});
//////////////////////////////////////////////////////////////



function startMetronome() {
    // Start the metronome without waiting for the groove generation
    if (!metronome.isRunning) {
        metronome.start();
        metronome.reset(); // Reset the metronome's beat counter for the new loop
    }
}

function forceMetronomeAlign(){
    const loopStartTime = audioContext.currentTime; // Determine the loop start time
    metronome.alignWithGrooveStart(loopStartTime); // Realign the metronome with the loop start
}

function toggleMetronomeVisibility(shouldHide) {
    metronomeToggleLabel.style.display = shouldHide ? 'none' : '';
  }

function turnOffSwitch(hide = true) {
    metronome.mute = true; // Mute the metronome sound
    metronomeToggle.checked = false; // Turn off the toggle switch in the UI
    if (hide) {
      toggleMetronomeVisibility(true); // Hide the metronome toggle switch
    }
  }

  if (metroTrigger() === true) {
    // console.log("test");
    //pass
}

//////////////////////////////////////////////////////////////
//////////////////////   UTILS    ///////////////////////////
////////////////////////////////////////////////////////////

// Initialize the audio context
function startAudioContext() {
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

// Scale a value from one range to another
function scaleValue(value, from, to) {
    let scale = (to[1] - to[0]) / (from[1] - from[0]);
    let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return (capped * scale + to[0]);
}

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
    const segment = Math.ceil(128 / numberOfSamples); // 0–127 divided into 12 segments
    const sampleIndex = Math.ceil(velocity / segment); // Calculate the sample index (1–12) based on the velocity
    const noteNumber = 60 + sampleIndex - 1; // Calculate the MIDI note number (60 is C3, 71 is B3)
    
    return Tone.Frequency(noteNumber, "midi").toNote(); // Convert the MIDI note number to note name (C3, C#3, D3, ...)
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

const drumAR = {
    "closed-hihat": { attack: 0.01, release: 0.1 },
    "open-hihat": { attack: 0.02, release: 0.3 },
    "crash": { attack: 0.01, release: 0.3 },
    "ride": { attack: 0.01, release: 0.3 },
    "kick": { attack: 0.01, release: 0.3 },
    "snare": { attack: 0.01, release: 0.3 },
    "hi-tom": { attack: 0.01, release: 0.3 },
    "mid-tom": { attack: 0.01, release: 0.3 },
    "floor-tom": { attack: 0.01, release: 0.3 },
};

//////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////
/////////////////////  SCHEDULING  //////////////////////////
/////////////////////////////////////////////////////////////

const notesInQueue = []; // Queue to hold notes that need to be scheduled
const lookahead = 25.0; // Look-ahead window in milliseconds for scheduling
let lastNoteDrawn = -1; // Initialize to an invalid value to ensure the first update occurs
let isFirstGroove = true; // Flag to indicate the first groove generation


// Check for new MIDI data and enqueue it
function checkAndEnqueueMidi() {
    if (globalFetch.isMidiReadyForProcessing()) {
        const midi = globalFetch.getMidiData().buffer; // convert to ArrayBuffer when fetching JSON
        midiQueue.push(midi);
        globalFetch.midiProcessed();

        // If nothing is currently playing, start the next MIDI
        if (!isPlaying) {
            playNextMidi();
        }
    }
}

// Play next MIDI in the queue and set it for visualization
function playNextMidi() {
    if (!isPlaying && midiQueue.length > 0) {
        lastNoteDrawn = -1; // Reset lastNoteDrawn for the new MIDI playback
        currentMidiForVisuals = midiQueue.shift();
        scheduleNote(currentMidiForVisuals);
        requestAnimationFrame(draw); // Start visual updates
    }
}

export function getCurrentMidiForVisuals() {
    return currentMidiForVisuals;
}

// Reset playback
function resetPlayback() {
    timeouts.forEach(clearTimeout); // Clear all scheduled notes
    timeouts = [];
    startTime = audioContext.currentTime;
    metronome.reset(); // Reset the metronome's beat counter for the new loop
}



const totalBeats = 8; // Total number of beats in the loop
const secondsPerBeat = 60 / tempoSlider.value;

const loopDurationSeconds = totalBeats * secondsPerBeat;
const loopDurationMs = loopDurationSeconds * 1000;


function scheduleNote(midiData, verbose = false) {

    //loadMidiData kismi:
    isPlaying = true;  // Set the flag indicating that a MIDI is currently playing
    resetPlayback(); // Reset playback when a new file is chosen

    try{
        const midi = new Midi(midiData); // Convert the raw data into a Midi object
        processedMidiData = midiData;  // Store the processed data in the global variable
        console.log("Parsed MIDI:", midi); // print the MIDI data

        const track = midi.tracks[0]; // the first track is for percussion
        const tempo = tempoSlider.value;
        const ticksPerBeat = midi.header.ppq;
        const msPerTick = (60 * 1000 / tempo) / ticksPerBeat;    

        // startTime = audioContesxt.currentTime; // Start time for the MIDI playback
        requestAnimationFrame(draw); // Start visual updates

        track.notes.forEach((note) => {
            // startTime = audioContext.currentTime; // Start time for the MIDI playback
            if (isFirstGroove) {
                turnOffSwitch(); // Turn off the toggle switch in the UI
                forceMetronomeAlign(); // Realign the metronome with the groove start time
                const currentTime = audioContext.currentTime;
                const timeToNextBeat = (60 / metronome.tempo) - (currentTime % (60 / metronome.tempo));
                startTime = currentTime + timeToNextBeat;  // Align with the next beat
                isFirstGroove = false; // Set the flag to false after the first groove generation
            }
            
            // requestAnimationFrame(draw); // Start visual updates
            const note_velocity = scaleValue(note.velocity, [0, 1], [0, 127]);
            const timeMs = note.ticks * msPerTick;
            const scheduledTime = startTime + timeMs / 1000; // Convert timeMs to relative context time
            const note_duration = note.durationTicks * msPerTick;

            // Store the note and scheduled time in the queue
            notesInQueue.push({ note: note, time: scheduledTime, duration: note_duration, velocity: note_velocity}); 
        });


        // Calculate totalTimeMs for looping
        totalTimeMs = track.durationTicks * (60 * 1000 / tempoSlider.value) / midi.header.ppq;
        metronome.tempo = tempoSlider.value; // Update the metronome tempo
        console.log(`Total time: ${totalTimeMs} ms`);
        console.log(`Total loop time: ${loopDurationMs} ms`);

        // isFirstGroove = false; // Set the flag to false after the first groove generation
        

    } catch (error) {
        console.error("Error processing MIDI data:", error.message);
    }

    if (verbose === true) {
        console.log(note.midi, noteName, velocity); 
      }

}


function playNote(currentNote, verbose = false){
    const velocity = currentNote.velocity;
    const duration = currentNote.duration;
    const scheduledTime = currentNote.time;
    const noteName = Tone.Frequency(currentNote.note.midi-12, "midi").toNote();
    const drumType = drumMappings[noteName];
    
    if (verbose === true) {
        console.log("Current note:", noteName, drumType, velocity, "Duration:", duration, "Schedule Time:", scheduledTime);
        //duration hep ayni cunku fixed degerler (16th nota)
      }


    // AR for each drum part
    const hitDuration = {
        "closed-hihat": "16n",
        "open-hihat": "4n",
        "crash": "2n",
        "ride": "2n",
        "kick": "16n",
        "snare": "16n",
        "hi-tom": "16n",
        "mid-tom": "16n",
        "floor-tom": "16n",
        };

    // w/ audio context
    const osc = audioContext.createOscillator();
    osc.type = 'triangle';

    const envelope = audioContext.createGain();
    envelope.gain.value = metronomeVolumeControl.value;
    // envelope.gain.exponentialRampToValueAtTime(metronomeVolumeControl.value, duration + 0.001);
    // envelope.gain.exponentialRampToValueAtTime(0.001, duration + 0.02);
    osc.connect(envelope); 

    osc.onended = () => {
        if (drumType) {
            if (isListening) {
                const noteToTrigger = mapVelocityToSample(velocity); // scale
                const sampler = samplers[drumType]; // Lookup the correct sampler
                // const attack = drumAR[drumType].attack;
                // const release = drumAR[drumType].release;
                sampler.volume.value = scaleValue(mainVol, [0, 1], [-20, 0]);    
                
                sampler.connect(comp);
                sampler.connect(eq);
                sampler.connect(delay);
                sampler.connect(reverb);
                sampler.triggerAttackRelease(noteToTrigger, hitDuration[drumType]);
                }
            }
    };
    osc.start(scheduledTime);
    osc.stop(scheduledTime + 0.001); // short duration to trigger onended
}

// Animation loop for visual updates
let elapsedTime = 0; // Initialize elapsedTime outside the draw function to track the elapsed time since playback started

function draw() {
    if (!isPlaying) return;

    let currentTime = audioContext.currentTime;
    elapsedTime = currentTime - startTime; // Update elapsed time

    let newNoteToDraw = false;
    
    // Process notes in the queue to find the ones that need to be drawn
    while (notesInQueue.length > 0 && notesInQueue[0].time <= currentTime) {
        const currentNote = notesInQueue.shift();
        // metronome.reset(); // Reset the metronome's beat counter for the new loop //TODO: this can be a wrokaround!!!
        // console.log("Current note:", currentNote.note.midi, currentNote.velocity, currentNote.note.durationTicks, currentNote.time, currentNote.duration);
        playNote(currentNote);

        // Check if this note is different from the last one drawn
        if (currentNote.note !== lastNoteDrawn) {
            newNoteToDraw = true;
            lastNoteDrawn = currentNote.note; // Update the lastNoteDrawn
        }
    }

    // If there's a new note to draw, update the UI
    // if (newNoteToDraw) {
    //     uiCallback(lastNoteDrawn);
    // }

    // Check if the total playback time has been reached
    if (elapsedTime * 1000 >= totalTimeMs) { // totalTimeMs or loopDurationMs
        loopPlayback(); // Transition to next MIDI or loop
    } else {
        // Continue the animation loop if playback is active
        requestAnimationFrame(draw);
    }
}



startAudioContext(); // Start the audio context when the page loads
// startMetronome(); // Start the metronome without waiting for the groove generation



// Loop the MIDI playback
function loopPlayback() {
    // Tone.Transport.stop();
    isPlaying = false;  // Reset the flag once the playback finishes
    
    // Check if there's another MIDI in the queue and play it
    if (midiQueue.length > 0) {
        metronome.reset(); // Reset the metronome's beat counter for the new loop
        playNextMidi();
        isPlaying = true;  // Set the flag indicating that a MIDI is currently playing
    } else {
        // If there's no new MIDI in the queue, replay the current one
        scheduleNote(currentMidiForVisuals);
    }
}



// function loopPlayback() {
//     isPlaying = false; // Mark the current playback as finished
    
//     // Check for next MIDI in the queue or loop the current
//     if (midiQueue.length > 0) {
//         metronome.reset(); // Reset the metronome's beat counter for the new loop
//         playNextMidi();
//     } else {
//         startTime = audioContext.currentTime; // Reset startTime for the new loop
//         scheduleNote(currentMidiForVisuals); // Reschedule the current MIDI for looping
//         isPlaying = true; // Restart playback
        
//     }
// }

// function loopPlayback() {
//     isPlaying = false;
    
//     // Calculate the start time for the next loop to align with the metronome beat
//     const currentTime = audioContext.currentTime;
//     const timeToNextBeat = (60 / metronome.tempo) - (currentTime % (60 / metronome.tempo));
//     const nextLoopStartTime = currentTime + timeToNextBeat;
    
//     if (midiQueue.length > 0) {
//         playNextMidi();
//     } else {
//         startTime = nextLoopStartTime; // Align the start of the new loop with the next metronome beat
//         setTimeout(() => { // Use setTimeout to delay the scheduling until the exact start time of the next loop
//             scheduleNote(currentMidiForVisuals);
//             isPlaying = true;
//         }, timeToNextBeat * 1000); // Convert to milliseconds for setTimeout
//     }
// }










// polling mechanism to regularly check globalFetch for new MIDI data:
setInterval(() => {
    checkAndEnqueueMidi(); // Check for new MIDI data and add it to the queue

    if (!isPlaying && midiQueue.length > 0) {
        playNextMidi(); // Start playback if not already playing and there are MIDI files in the queue
    }
}, lookahead); // Adjusted to check every 25 milliseconds



//////////////////////////////////////////////////////////////
///////////////////// UI Callbacks ///////////////////////////
//////////////////////////////////////////////////////////////

function uiCallback() {
    const lightElement = document.getElementById('tapTempoLight');  // Your light element's ID
    lightElement.classList.add('light-on');  // Turn the light on

    setTimeout(() => {
        lightElement.classList.remove('light-on');  // Turn the light off
    }, lookahead);  // Duration of the light being 'on' is also 25ms
}


let lastTickTime = null;

function syncLightWithMetronome() {
    if (metronome.isRunning && lastTickTime !== metronome.nextNoteTime) {
        uiCallback();  // Trigger the UI callback if the metronome ticked
        lastTickTime = metronome.nextNoteTime;  // Update the last tick time
    }

    requestAnimationFrame(syncLightWithMetronome);  // Continuously check for metronome ticks
}

syncLightWithMetronome();  // Start syncing the light with the metronome
metronome.tempo = tempoSlider.value; // Update the metronome tempo



//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

// Download the processed MIDI data
function downloadMidi() {
    if (!processedMidiData) {
        console.error("No MIDI data available for download.");
        return;
    }

    const midiBlob = new Blob([processedMidiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(midiBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = '2groove_gen.mid';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
}

const downloadButton = document.getElementById('download-btn');
downloadButton.addEventListener('click', downloadMidi);



//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////