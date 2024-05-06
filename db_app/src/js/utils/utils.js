// Author: Çağrı Erdem, 2023
// Description: Utils for 2groove web app.




////////////////
// METRONOME //
////////////////

// import * as Tone from 'tone';

// let metronomeLoop;
// let metronomeRunning = false;

// export function toggleMetronome() {
//     if (metronomeRunning) {
//         metronomeLoop.stop();
//         Tone.Transport.stop();
//         metronomeRunning = false;
//     } else {
//         startMetronome(tempoSlider.value);
//         metronomeRunning = true;
//     }
// }

// export function startMetronome(bpm) {
//     const beatTime = 60 / bpm;
    
//     // If there's an existing metronomeLoop, dispose of it.
//     if (metronomeLoop) {
//         metronomeLoop.dispose();
//     }

//     metronomeLoop = new Tone.Loop(time => {
//         playClick(metronomeVolumeSlider.value, 1500);
//     }, beatTime + "n"); // "n" stands for a quarter note. Adjust if you want other note values.

//     metronomeLoop.start(0); // Start the loop immediately
//     Tone.Transport.bpm.value = bpm; // Set the transport's BPM
//     Tone.Transport.start(); // Start the transport
// }

// export function setBPM(bpm) {
//     Tone.Transport.bpm.value = bpm;
// }

// export function getCurrentBPM() {
//     return Tone.Transport.bpm.value;
// }

// export function isMetronomeRunning() {
//     return metronomeRunning;
// }
