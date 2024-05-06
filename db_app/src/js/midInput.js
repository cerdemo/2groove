// Author: Çağrı Erdem, 2023
// Description: MIDI mapping script for 2groove web app.

import * as Tone from "tone";
import { WebMidi } from "webmidi";


//Reset audio context
document.documentElement.addEventListener('mousedown', () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
  });


////////////////
/// MIDI I/O ///
////////////////

// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi
  .enable()
  .then(onEnabled)
  .catch(err => alert(err));


let selectedMidiInput = null; // Global variable to hold the selected MIDI device

  // Function triggered when WebMidi.js is ready
function onEnabled() {
    if (WebMidi.inputs.length < 1) {
        document.body.innerHTML+= "No device detected.";
    } 
    else {
        const deviceDropdown = document.getElementById('midiInputSelect');
        deviceDropdown.addEventListener('change', handleDeviceChange);
        
        WebMidi.inputs.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.id; // Set the value to the device ID or another unique identifier
            option.textContent = `${index}: ${device.name}`;
            deviceDropdown.appendChild(option);
        });
        // Initially set the selected MIDI device to the first one - comment this out if you want to start with no device selected
        // selectedMidiInput = WebMidi.inputs[0];
        // selectedMidiInput.addListener("noteon", "all", handleNoteOn);
    }
}
  

function handleDeviceChange(event) {
    // If there was a previously selected MIDI device, remove the "noteon" and "cc" listeners from it
    if (selectedMidiInput) {
        selectedMidiInput.removeListener("noteon", "all", handleNoteOn);
        selectedMidiInput.removeListener("controlchange", "all", handleControlChange);
    }

    // Get the selected device ID from the dropdown
    const selectedDeviceId = event.target.value;

    // Find the selected device in WebMidi.inputs
    selectedMidiInput = WebMidi.getInputById(selectedDeviceId);

    // Add a "noteon" and "cc" listeners to the selected device
    if (selectedMidiInput) {
        selectedMidiInput.addListener("noteon", "all", handleNoteOn);
        selectedMidiInput.addListener("controlchange", "all", handleControlChange);
    }
}

function blinkLight() {
    const tapLight = document.getElementById('tapLight');
    tapLight.classList.remove('light-off');
    tapLight.classList.add('light-on');

    setTimeout(() => {
        tapLight.classList.remove('light-on');
        tapLight.classList.add('light-off');
    }, 100);
}

// function handleNoteOn(e) {
//     blinkLight();
//     console.log(e.note.name);
// }
  

////////////////
/// MAPPINGS ///
////////////////
const receiveMidi = document.getElementById("midiToggle");
const bpm = document.getElementById("tempo");
let tapRhythm, tapTempo, changeGroove, metro, temp, tol, loopAmount;

// send Midi notes out when "send Midi" box checked
receiveMidi.addEventListener("change", function(){
    if (this.checked) {
      Tone.Transport.start();
      console.log("MIDI input enabled.");
    } else {
      Tone.Transport.stop();
        console.log("MIDI input disabled.");
    }
  });





// TODO: Map metronome to this:
Tone.Transport.bpm.value = 120;

//adjust BPM
bpm.addEventListener("input", function(ev){
    Tone.Transport.bpm.rampTo(bpm.value, 0.1);  
    bpmValue.innerHTML = bpm.value;
  });


//general scaling function
function scaleValue(value, from, to) {
    let scale = (to[1] - to[0]) / (from[1] - from[0]);
    let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return (capped * scale + to[0]);
}


function handleNoteOn(e) {
    const trig1Input = document.getElementById("trig1Input");
    const selTrig1Input = trig1Input.value;
    const trig1Controller = document.getElementById("trig1Controller");
    const selTrig1Controller = trig1Controller.value;
    const trig1Channel = document.getElementById("trig1Channel");
    const selTrig1Channel = trig1Channel.value;

    const trig2Input = document.getElementById("trig2Input");
    const selTrig2Input = trig2Input.value;
    const trig2Controller = document.getElementById("trig2Controller");
    const selTrig2Controller = trig2Controller.value;
    const trig2Channel = document.getElementById("trig2Channel");
    const selTrig2Channel = trig2Channel.value;

    const trig3Input = document.getElementById("trig3Input");
    const selTrig3Input = trig3Input.value;
    const trig3Controller = document.getElementById("trig3Controller");
    const selTrig3Controller = trig3Controller.value;
    const trig3Channel = document.getElementById("trig3Channel");
    const selTrig3Channel = trig3Channel.value;

    const trig4Input = document.getElementById("trig4Input");
    const selTrig4Input = trig4Input.value;
    const trig4Controller = document.getElementById("trig4Controller");
    const selTrig4Controller = trig4Controller.value;
    const trig4Channel = document.getElementById("trig4Channel");
    const selTrig4Channel = trig4Channel.value;

    const [status, note, velocity] = e.data;
    const channel = (status & 0xf) + 1; // MIDI channels are 1-indexed

    // If no MIDI input device is selected, show a message to the user and do nothing
    if (!selectedMidiInput) {
        alert("Please select a MIDI input device.");
        return;
    } else if (receiveMidi.checked) {
        // console.log(channel, note, velocity); // comment out for less verbosity
        if (channel === Number(selTrig1Channel) && note === Number(selTrig1Controller)) {
            if (selTrig1Input=== "nan") {
                console.log("Trigger 1 is not mapped to any parameter.");
            } else if (selTrig1Input === "tapRhythm") {
                console.log("Rhythm Tap!");
                blinkLight();
                // TODO: Add the mapping!
            } else if (selTrig1Input === "tapTempo") {
                console.log("Tempo Tap!");
                // TODO: Add the mapping!
            } else if (selTrig1Input === "changeGroove") {
                console.log("Groove change detected!");
                // TODO: Add the mapping!
            } else if (selTrig4Input === "pause") {
                console.log("Pause/Resume");
            }
        }
        if (channel === Number(selTrig2Channel) && note === Number(selTrig2Controller)) {
            if (selTrig2Input=== "nan") {
                console.log("Trigger 2 is not mapped to any parameter.");
            } else if (selTrig2Input === "tapRhythm") {
                console.log("Rhythm Tap!");
                blinkLight();
            } else if (selTrig2Input === "tapTempo") {
                console.log("Tempo Tap!");
            } else if (selTrig2Input === "changeGroove") {
                console.log("Groove change detected!");
            } else if (selTrig4Input === "pause") {
                console.log("Pause/Resume");
            }
        }
        if (channel === Number(selTrig3Channel) && note === Number(selTrig3Controller)) {
            if (selTrig3Input=== "nan") {
                console.log("Trigger 3 is not mapped to any parameter.");
            } else if (selTrig3Input === "tapRhythm") {
                console.log("Rhythm Tap!");
                blinkLight();
            } else if (selTrig3Input === "tapTempo") {
                console.log("Tempo Tap!");
            } else if (selTrig3Input === "changeGroove") {
                console.log("Groove change detected!");
            } else if (selTrig4Input === "pause") {
                console.log("Pause/Resume");
            }
        }
        if (channel === Number(selTrig4Channel) && note === Number(selTrig4Controller)) {
            if (selTrig4Input=== "nan") {
                console.log("Trigger 4 is not mapped to any parameter.");
            } else if (selTrig4Input === "tapRhythm") {
                console.log("Rhythm Tap!");
                blinkLight();
            } else if (selTrig4Input === "tapTempo") {
                console.log("Tempo Tap!");
            } else if (selTrig4Input === "changeGroove") {
                console.log("Groove change detected!");
            } else if (selTrig4Input === "pause") {
                console.log("Pause/Resume");
            }
        }
    } 
}


function handleControlChange(e) {
    // cc1Channel.value, cc2Channel, cc3Channel, cc4Channel --> MIDI channels selected on UI
    const cc1Input = document.getElementById("cc1Input");
    const selCC1Input = cc1Input.value;
    const cc1Controller = document.getElementById("cc1Controller");
    const selCC1Controller = cc1Controller.value;
    const cc1Channel = document.getElementById("cc1Channel");
    const selCC1Channel = cc1Channel.value;

    const cc2Input = document.getElementById("cc2Input");
    const selCC2Input = cc2Input.value;
    const cc2Controller = document.getElementById("cc2Controller");
    const selCC2Controller = cc2Controller.value;
    const cc2Channel = document.getElementById("cc2Channel");
    const selCC2Channel = cc2Channel.value;

    const cc3Input = document.getElementById("cc3Input");
    const selCC3Input = cc3Input.value;
    const cc3Controller = document.getElementById("cc3Controller");
    const selCC3Controller = cc3Controller.value;
    const cc3Channel = document.getElementById("cc3Channel");
    const selCC3Channel = cc3Channel.value;

    const cc4Input = document.getElementById("cc4Input");
    const selCC4Input = cc4Input.value;
    const cc4Controller = document.getElementById("cc4Controller");
    const selCC4Controller = cc4Controller.value;
    const cc4Channel = document.getElementById("cc4Channel");
    const selCC4Channel = cc4Channel.value;

    const controllerNumber = e.controller.number;
    const [status, cc, value] = e.data;
    const channel = (status & 0xf) + 1; // MIDI channels are 1-indexed

    if (!selectedMidiInput) {
        alert("Please select a MIDI input device.");
        return;
    } else if (receiveMidi.checked) {
        // console.log(channel, controllerNumber, value); // comment out for less verbosity
        if (channel === Number(selCC1Channel) && controllerNumber === Number(selCC1Controller)) {
            if (selCC1Input=== "nan") {
                console.log("CC1 is not mapped to any parameter.");
            } else if (selCC1Input === "metro") {
                tapTempo = scaleValue(value, [0, 127], [40, 250]);
                tapTempo = parseInt(tapTempo);
                console.log("Metronome:", tapTempo);
                // TODO: Add the mapping!
            } else if (selCC1Input === "temp") {
                temp = scaleValue(value, [0, 127], [0.01, 5.0]);
                temp = temp.toFixed(2);
                console.log("Temperature:", temp);
                // TODO: Add the mapping!
            } else if (selCC1Input === "tol") {
                tol = scaleValue(value, [0, 127], [0.01, 0.5]);
                tol = tol.toFixed(3);
                console.log("Tolerance:", tol);
                // TODO: Add the mapping!
            } else if (selCC1Input === "loopAmount") {
                loopAmount = value;
                console.log("Loop amount:", loopAmount);
                // TODO: Add the mapping!
            }
        }
        if (channel === Number(selCC2Channel) && controllerNumber === Number(selCC2Controller)) {
            if (selCC2Input=== "nan") {
                console.log("CC2 is not mapped to any parameter.");
            } else if (selCC2Input === "metro") {
                tapTempo = scaleValue(value, [0, 127], [40, 250]);
                tapTempo = parseInt(tapTempo);
                console.log("Metronome:", tapTempo);
            } else if (selCC2Input === "temp") {
                temp = scaleValue(value, [0, 127], [0.01, 5.0]);
                temp = temp.toFixed(2);
                console.log("Temperature:", temp);
            } else if (selCC2Input === "tol") {
                tol = scaleValue(value, [0, 127], [0.01, 0.5]);
                tol = tol.toFixed(3);
                console.log("Tolerance:", tol);
            } else if (selCC2Input === "loopAmount") {
                loopAmount = value;
                console.log("Loop amount:", loopAmount);
            }
        }
        if (channel === Number(selCC3Channel) && controllerNumber === Number(selCC3Controller)) {
            if (selCC3Input=== "nan") {
                console.log("CC3 is not mapped to any parameter.");
            } else if (selCC3Input === "metro") {
                tapTempo = scaleValue(value, [0, 127], [40, 250]);
                tapTempo = parseInt(tapTempo);
                console.log("Metronome:", tapTempo);
            } else if (selCC3Input === "temp") {
                temp = scaleValue(value, [0, 127], [0.01, 5.0]);
                temp = temp.toFixed(2);
                console.log("Temperature:", temp);
            } else if (selCC3Input === "tol") {
                tol = scaleValue(value, [0, 127], [0.01, 0.5]);
                tol = tol.toFixed(3);
                console.log("Tolerance:", tol);
            } else if (selCC3Input === "loopAmount") {
                loopAmount = value;
                console.log("Loop amount:", loopAmount);
            }
        }
        if (channel === Number(selCC4Channel) && controllerNumber === Number(selCC4Controller)) {
            if (selCC4Input=== "nan") {
                console.log("CC4 is not mapped to any parameter.");
            } else if (selCC4Input === "metro") {
                tapTempo = scaleValue(value, [0, 127], [40, 250]);
                tapTempo = parseInt(tapTempo);
                console.log("Metronome:", tapTempo);
            } else if (selCC4Input === "temp") {
                temp = scaleValue(value, [0, 127], [0.01, 5.0]);
                temp = temp.toFixed(2);
                console.log("Temperature:", temp);
            } else if (selCC4Input === "tol") {
                tol = scaleValue(value, [0, 127], [0.01, 0.5]);
                tol = tol.toFixed(3);
                console.log("Tolerance:", tol);
            } else if (selCC4Input === "loopAmount") {
                loopAmount = value;
                console.log("Loop amount:", loopAmount);
            }
        }
    } 
}