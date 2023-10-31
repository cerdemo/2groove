// Author: Çağrı Erdem, 2023
// Description: MIDI broadcasting script for 2groove web app.

import { globalFetch } from './globalFetch.js';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let midiOutput; // MIDI output device
let startTime = null; // Start time for the MIDI playback
let timeouts = []; // Store timeout IDs for scheduled notes

const midiQueue = [];
let currentMidiForVisuals = null;
let isPlaying = false;  // to track the playback status
// let currentTick = 0;  // to track the current tick for the metronome
let processedMidiData;  // Global variable to store the processed MIDI data for download




// TODO: play/pause button
// isPaused = false;
// const playPauseButton = document.getElementById('play-pause-btn');
// playPauseButton.addEventListener('click', () => {
//     isPaused = !isPaused;
//     if (isPaused) {
//         // If paused, clear all timeouts (stop all scheduled notes)
//         // timeouts.forEach(timeout => clearTimeout(timeout));
//     } else {
//         // When resumed, restart the MIDI playback from where we paused
//         // loadMidiData(currentMidiForVisuals);
//     }
// });


// TODO: Set up the main clock
// Set up an event listener for the tick event
window.addEventListener('metronomeTick', handleMidiForTick);

function handleMidiForTick(event) {
    // currentTick++;
    // console.log(`\rClick ${(currentTick%4)+1}/4`);
}





// const tickToMidiEventsMap = {};
// function handleMidiForTick(event) {
//     if (event && event.detail && typeof event.detail.tick !== 'undefined') {
//         const currentTick = event.detail.tick;
//         if (tickToMidiEventsMap[currentTick]) {
//             tickToMidiEventsMap[currentTick].forEach((note) => {
//                 scheduleNote(note, Tone.Time(Tone.Transport.position).toMilliseconds());
//             });
//         }
//     } else {
//         console.warn('Received an unexpected event structure:', event);
//     }
//     currentTick++;
//     console.log(`\rClick ${(currentTick%4)+1}/4`);
// }



// Convert ticks to time in seconds
function ticksToTime(ticks, ticksPerBeat, bpm) {
    const secondsPerTick = 60 / (bpm * ticksPerBeat);
    return ticks * secondsPerTick;
}

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
    // Only start playing the next MIDI if the current one has finished
    if (!isPlaying && midiQueue.length > 0) {
        currentMidiForVisuals = midiQueue.shift();
        Tone.Transport.start("@1m");  // Ensure playback starts at the beginning of a measure //TODO: Check if this is necessary or useful
        loadMidiData(currentMidiForVisuals);
    }
}

export function getCurrentMidiForVisuals() {
    return currentMidiForVisuals;
}

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


// MIDI initialization
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

function onMIDISuccess(midiAccess) {
    const outputs = Array.from(midiAccess.outputs.values());
    if (outputs.length === 0) {
        console.warn("No MIDI outputs found");
        return;
    }
    populateMidiOutputs(outputs);
}

function onMIDIFailure() {
    console.error("Could not access your MIDI devices.");
}

function populateMidiOutputs(outputs) {
    const select = document.getElementById('midiOutputs');
    outputs.forEach((output, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = output.name;
        select.appendChild(option);
    });
    select.addEventListener('change', (event) => {
        midiOutput = outputs[event.target.value];
    });
    midiOutput = outputs[0]; // Default to the first output
}


// Reset playback
function resetPlayback() {
    timeouts.forEach(clearTimeout); // Clear all scheduled notes
    timeouts = [];
    currentNoteIndex = 0;
    startTime = audioContext.currentTime;
    currentTick = 0;  // Reset to the first tick
}


// // Schedule a note to be played
// // without Transport
function scheduleNote(note, timeMs, index) {
    const vel = scaleValue(note.velocity, [0, 1], [0, 127]);
    const scheduledTime = startTime + timeMs / 1000;

    const timeoutId = setTimeout(() => {
        midiOutput.send([0x90, note.midi, vel]);
        // console.log(`Note Number: ${note.midi}, Velocity: ${vel}, Scheduled Time: ${scheduledTime}`);
        currentNoteIndex = index + 1;
        // console.log(`${currentNoteIndex}: ${note.midi}, ${vel}`);
    }, (scheduledTime - audioContext.currentTime) * 1000);
    timeouts.push(timeoutId);
}


// //Main function that is responsible of retrieving the MIDI bytes, converting them into a MIDI object, parsing it, and scheduling the notes
// //without Transport
async function loadMidiData(midiData) {
    isPlaying = true;  // Set the flag indicating that a MIDI is currently playing
    resetPlayback(); // Reset playback when a new file is chosen

    try {
        const midi = new Midi(midiData); // Convert the raw data into a Midi object
        processedMidiData = midiData;  // Store the processed data in the global variable

        // Adjust negative delta values
        midi.tracks.forEach(track => {
            let accumulatedDelta = 0;
            track.notes.forEach(note => {
                if (note.ticks < 0) {
                    accumulatedDelta += note.ticks;  // Accumulate the negative delta
                    note.ticks = 0;  // Reset the current note's ticks to 0
                } else if (accumulatedDelta < 0) {
                    const adjustment = Math.min(note.ticks, -accumulatedDelta);  // Calculate the possible adjustment
                    note.ticks -= adjustment;  // Deduct the adjustment from the current note's ticks
                    accumulatedDelta += adjustment;  // Adjust the accumulated delta
                }
            });
        });

        console.log("Parsed MIDI:", midi);
        const track = midi.tracks[0];
        Tone.Transport.start(); // Start the transport

        if (!midiOutput) {
            console.warn("MIDI output not available");
            return;
        }

        const tempo = (midi.header.tempos && midi.header.tempos[0]) ? midi.header.tempos[0].bpm : 120; // Fallback to a default tempo if not defined ???
        const ticksPerBeat = midi.header.ppq;
        const msPerTick = (60 * 1000 / tempo) / ticksPerBeat;

        track.notes.forEach((note, index) => {
            const timeMs = note.ticks * msPerTick;
            const timeInTicks = note.ticks; // TODO: for transport
            scheduleNote(note, timeMs, index);
        });

        const totalTimeMs = track.durationTicks * msPerTick;
        const totalTransportTime = track.durationTicks * msPerTick / 1000;
        console.log(`Total time: ${totalTimeMs} ms`);
        console.log(`Total transport time: ${track.durationTicks * msPerTick / 1000} s`);
        setTimeout(() => {
            loopPlayback();
        }, totalTimeMs);

    } catch (error) {
        console.error("Error processing MIDI data:", error.message);
    }
}


// Loop the MIDI playback
function loopPlayback() {
    // Tone.Transport.stop();
    isPlaying = false;  // Reset the flag once the playback finishes
    
    // Check if there's another MIDI in the queue and play it
    if (midiQueue.length > 0) {
        playNextMidi();
    } else {
        // If there's no new MIDI in the queue, replay the current one
        loadMidiData(currentMidiForVisuals);
    }
}



// Initialize the audio context on page load
startAudioContext();


// polling mechanism to regularly check globalFetch for new MIDI data:
setInterval(() => {
    checkAndEnqueueMidi();
    playNextMidi();
}, 500);
 // Check every 500 milliseconds. Adjust this value as necessary


//  document.getElementById('play-pause-btn').addEventListener('click', function() {
//     /// play pause button
//     console.log("Play/pause button clicked but not working yet :))");
// });


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



////////////////////////////
////////////////////////////
////////////////////////////

