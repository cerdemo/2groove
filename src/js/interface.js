// Author: Çağrı Erdem, 2023
// Description: User interface for 2groove web app.

import * as Tone from 'tone';
import { globalFetch } from './globalFetch.js';

// Initialize Web Audio API
const audioContext = new AudioContext();

// UI Elements
const tempoSlider = document.getElementById('tempo');
const metronomeVolumeSlider = document.getElementById('metronomeVolume');
const toggleMetronomeCheckbox = document.querySelector('#toggleMetronome input[type="checkbox"]');

const recIndicator = document.getElementById('recIndicator');
const arrayList = document.getElementById('arrayList');
const intervals = []; // for tap tempo

// const startButton = document.getElementById('startButton'); 

// const portInput = document.getElementById('serverPort')
// const httpIp = document.getElementById('httpIpAddress')
// const beatsInput = document.getElementById('beats');
// const quantizeSelect = document.getElementById('quantize');


// Variables
let beatsInput = 8; // 8 beats (2 bars)
let quantizeSelect = 4; // 1/16
let gateKeyActive = false;
let currentArray = [];
let recording = false;
let recordingStartedAt = 0;
let httpIp = [`158.39.200.82`, `127.0.0.1`];
let httpPort = [`5002`, `5003`];
let isHttpConnected = true; // we keep it true with the new UI
let lastTapTime = 0; // for tap tempo
let tappedRhythms = [];
let metronomeLoop;
let metronomeRunning = true;  // The metronome loop and transport is always running
let metronomeSoundOn = false; // The metronome sound is off by default
let tempVal = 0.2;
let threshVal = 0.3;
let currentTick = 1;
let clickTone = 1000;
let samplingStrategy = {'strategy': ['epsilon', 'softmax_temp'],
                        'tempRange': [[0.01, 10.0], [0.1, 2.0]],
                        'threshRange': [[0.15, 0.35], [0.1, 0.2]]};
let samplingStrategyIndex = 0;




//-------------------------------------
// Functions
//-------------------------------------



// startButton.addEventListener('click', function() {
//     initializeApp();
//     startButton.style.display = 'none'; // Hide the button after initialization
// });




async function initializeApp() {
    // Set default BPM or retrieve it from a saved setting or slider
    const defaultBPM = tempoSlider.value;
    
    // Indicate that the metronome is running
    metronomeRunning = true;

    console.log("App initialized!");
    console.log("Default BPM:", defaultBPM);
    console.log("Temperature value:", tempVal);
    console.log("Hit tolerance:", threshVal);
    console.log("Sampling strategy:", samplingStrategy['strategy'][samplingStrategyIndex]);
}

initializeApp();



//////////////////////
// GLOBAL METRONOME //
//////////////////////

// Play click sound
function playClick(volume, frequency = 1000) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
}


export async function toggleMetronome() {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log('Tone.js has started');
    }

    metronomeSoundOn = !metronomeSoundOn;

    if (metronomeSoundOn) {
        // start the metronome sound here if it's not already running
        startMetronome(tempoSlider.value); // Assuming you want to use the current value of the tempo slider
    } else {
        // stop the metronome sound if needed, depending on your requirements
        // TODO: find the need to execute additional logic when turning the sound off (like fading out, 
        // stopping any ongoing sound immediately, or any other related tasks), that's where you'd place that logic.
    }
}



export async function startMetronome(bpm) {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    
    Tone.Transport.bpm.value = bpm; // Set the transport's BPM
    if (!metronomeLoop) {
        metronomeLoop = new Tone.Loop(time => {
            // Only play the click if the audibleClick flag is true
            if (metronomeSoundOn) {
                playClick(metronomeVolumeSlider.value, clickTone);
            }
            emitTickEvent(); // Emit a tick event to be used by other modules
        }, "4n"); // "4n" stands for a quarter note

        metronomeLoop.start(0); // Start the loop immediately
    }

    Tone.Transport.start(); // Start the transport
}



// Func to count between 1-4
function count4() {
    console.log(`${currentTick}/4`);
    currentTick = (currentTick % 4) + 1;

    if (currentTick == 1) {
        clickTone = 1500;
    } else {
        clickTone = 1000;
    }
  }


function emitTickEvent() {
    count4();
    // const event = new Event('metronomeTick');
    // window.dispatchEvent(event);
    const event = new CustomEvent('metronomeTick', { detail: { tick: currentTick } });
    window.dispatchEvent(event);
    
}

export function setBPM(bpm) {
    Tone.Transport.bpm.value = bpm;
}
export function getCurrentBPM() {
    return Tone.Transport.bpm.value;
}
export function isMetronomeRunning() {
    return metronomeRunning;
}



function arrayToBinaryString(array) {
    return array.map(value => (value !== 0 ? '1' : '0')).join('');
}

function storeAndDisplayArray(array) {
    const li = document.createElement('li');
    li.textContent = arrayToBinaryString(array);
        // If the list has any items
        if (arrayList.firstChild) {
        // Insert 'li' before the first item, to the top of the list
        arrayList.insertBefore(li, arrayList.firstChild);
        } else {
        // If the list is empty, just append the 'li' as usual
        arrayList.appendChild(li);
    }
}


// Variety knob
// TODO: WOrk on it more!
document.getElementById("temp").addEventListener("input", function() {
    const value = this.value;
    tempVal = scaleValue(value, [0, 1], samplingStrategy['tempRange'][samplingStrategyIndex]); //Exponential curve?
    document.getElementById("knob3Value").textContent = value;
    // TODO: Check if it's a good idea to combine the two values. If yes, check better ways of combining.
    console.log("tempVal:", tempVal);
});


// Thresh knob
// TODO: WOrk on it more!
document.getElementById("tolerance").addEventListener("input", function() {
    const value = this.value;
    // tempVal = scaleValue(value, [0, 1], [0.01, 100]);
    threshVal = scaleValue(value, [0, 1], samplingStrategy['threshRange'][samplingStrategyIndex]);
    document.getElementById("knob4Value").textContent = value;
    // TODO: Check if it's a good idea to combine the two values. If yes, check better ways of combining.
    console.log("threshVal:", threshVal);
});




// New Web Worker setup for client-server communication
const ajaxWorker = new Worker(
    new URL('./workers/workerAjax.js', import.meta.url),
    {type: 'module'}
  );

// Listen to messages from the worker:
ajaxWorker.addEventListener('message', function(event) {
    const data = event.data;
    console.log("Setting MIDI data, length:", data.length);

    switch (data.type) {
        case 'arrayProcessed':
            // process the MIDI data as needed
            console.log("MIDI data received in bytes!", data.data);
            globalFetch.setMidiData(data.data);
            resetTappedRhythms();
            break;

        case 'error':
            console.error("Error from worker:", data.error);
            break;
    }
});

// Modify `sendArrayToServer` to post data to the worker:
function sendArrayToServer(array) {
    ajaxWorker.postMessage({
        cmd: 'sendArray',
        array: array,
        bpm: parseFloat(document.getElementById('tempo').value),
        temperatureValue: tempVal, //parseFloat(document.getElementById('temperature').value),
        hitTolerance: threshVal, //parseFloat(document.getElementById('tolerance').value),
        isHttpConnected: isHttpConnected,  
        httpIp: httpIp[0], //httpIp.value,             
        portInput: httpPort[0], //portInput.value        
        samplingStrategy: samplingStrategy['strategy'][samplingStrategyIndex]
    });
}




// TODO: Connect this to `midiBroadcast.js`
// function sendBroadcastParameters(){
//     const loop_amount = parseInt(loopsInput.value);
// }

function resetTappedRhythms() {
  // tappedRhythms = [];
  tappedRhythms.length = 0;  // This empties the array without re-declaring it
  // ... any other necessary resets or UI updates ...
}



function toggleValues(arr, numIndices = 1) {
    // TODO: Implement this function to `change` action
    /**
     * Toggle values in the input array at random indices.
     *
     * Parameters:
     * - arr (array-like): The input array containing only 0s and 1s.
     * - numIndices (int): The number of random indices to toggle (default is 1).
     *
     * Returns:
     * - Edited array with toggled values.
     */
  
    // Check if the input array is valid (contains only 0s and 1s)
    if (!arr.every(val => val === 0 || val === 1)) {
      throw new Error("Input array must consist of only 0s and 1s.");
    }
  
    // Create a copy of the input array to avoid modifying the original
    const editedArr = [...arr];
  
    // Generate random indices to toggle
    const toggleIndices = [];
  
    for (let i = 0; i < numIndices; i++) {
      const randomIndex = Math.floor(Math.random() * arr.length);
      toggleIndices.push(randomIndex);
    }
  
    // Toggle the values at the selected indices
    toggleIndices.forEach(index => {
      editedArr[index] = 1 - editedArr[index];
    });
  
    return editedArr;
  }
  


//-------------------------------------
// Event Listeners
//-------------------------------------

// WITH THE OLD UI:
// Event listeners for the metronome
// toggleMetronomeButton.addEventListener('click', () => {
//     toggleMetronomeButton.classList.toggle('toggled');
//     toggleMetronome();
// });

// WITH THE NEW UI
// TODO: Fix it because it doesn't work properly while generating 
toggleMetronomeCheckbox.addEventListener('change', toggleMetronome);

// Function to turn off the switch
function turnOffSwitch() {
    toggleMetronomeCheckbox.checked = false;
  }


// Event listener for the tempo and vol sliders
tempoSlider.addEventListener("input", function() {
    const bpm = this.value;
    document.getElementById("knob1Value").textContent = bpm; // Update the knob value
    if (metronomeRunning) {
        startMetronome(bpm);
    }
});
metronomeVolumeSlider.addEventListener("input", function() {
    const vol = this.value;
    document.getElementById("knob2Value").textContent = vol; // Update the knob value
});


// Record tapped rhythm -- event listener for when the key "A" is pressed to start recording
window.addEventListener('keydown', (e) => {
  if (e.key === 'a' && !recording) {
      e.preventDefault();
      gateKeyActive = true;
      recordingStartedAt = Date.now();
      recIndicator.innerText = 'REC ON!';
      recIndicator.classList.add('recording'); 
      
      const totalSteps = parseInt(beatsInput) * parseInt(quantizeSelect); //.value methods removed for new UI
      currentArray = new Array(totalSteps).fill(0);  // Initialize array with zeros
      
      recording = true;
  }

  if (e.key === ' ' && gateKeyActive) {
    //   playClick(tapVolumeSlider.value, 300);
      playClick(metronomeVolumeSlider.value, 300) // If same knob is used for both metronome and tap volume
      const elapsedMs = Date.now() - recordingStartedAt;
      const bpm = parseInt(tempoSlider.value);
      const quantizeValue = parseInt(quantizeSelect);
      const singleSubdivisionDuration = (60 * 1000) / (bpm * quantizeValue);
      const tappedSubdivision = Math.round(elapsedMs / singleSubdivisionDuration);
      if (tappedSubdivision < currentArray.length) {
          currentArray[tappedSubdivision] = 1;
      }
      lastTapTimestamp = Date.now();
  }

  if (e.key === ' ') { // blinking light every time space bar is hit

    e.preventDefault(); //To prevent the browser from scrolling when the spacebar is pressed
    const light = document.getElementById('tapLight');
    light.classList.remove('light-off');
    light.classList.add('light-on');
  }

  if (e.key.toUpperCase() === 'T') { // tap tempo // TODO: Something doesn't work here -- FIX!
    const currentTime = new Date().getTime();
    const interval = currentTime - lastTapTime; // in milliseconds
    const tapTempoLight = document.getElementById('tapTempoLight'); // Visual feedback for tap
    tapTempoLight.classList.remove('light-off');
    tapTempoLight.classList.add('light-on');
    // tapTempoLight.style.backgroundColor = 'red';
    playClick(metronomeVolumeSlider.value, 1500);
    
    setTimeout(() => {
        // tapLight.style.backgroundColor = '';
        tapTempoLight.classList.remove('light-on');
        tapTempoLight.classList.add('light-off');
    }, 100);  // light stays red for 100 milliseconds
    
    if (lastTapTime !== 0) { // avoid the first tap
        intervals.push(interval);
        
        // Consider only the last few taps to get a more accurate/current BPM
        if (intervals.length > 4) {
            intervals.shift();
        }

        const averageInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
        const bpm = parseInt(60000 / averageInterval); // 60,000 ms in a minute

        // Update the tempo UI elements
        const tempoElement = document.getElementById('tempo');
        const bpmDisplayElement = document.getElementById('knob1Value');
        const tempoSlider = document.getElementById('tempoSlider');
        
        if (tempoElement) tempoElement.value = bpm.toFixed(2); // toFixed(2) to limit to 2 decimal points
        if (bpmDisplayElement) bpmDisplayElement.innerText = bpm.toFixed(0);
        if (tempoSlider) tempoSlider.value = bpm.toFixed(0);
    }
    
    lastTapTime = currentTime;
}
});

// Export the tapped array for other modules to use
export function getTappedRhythms() {
    return currentArray;
}


// evet listener for when key "A" is released
window.addEventListener('keyup', (e) => {
  if (e.key === 'a') {
      gateKeyActive = false;
      recIndicator.innerText = 'REC OFF';
      recIndicator.classList.remove('recording');

      storeAndDisplayArray(currentArray);  // To display the array
      sendArrayToServer(currentArray); // To send the array via fetch (to server

      // Check if the metronome is currently active/on
      if (metronomeRunning) {
        // Toggle the metronome off
        // toggleMetronome();
        metronomeSoundOn = false;
        toggleMetronomeCheckbox.checked = false; // TODO: fix this!
    }
      recording = false;
  }

  if (e.key === ' ') {
      const light = document.getElementById('tapLight');
      light.classList.remove('light-on');
      light.classList.add('light-off');
}
});


// Incorporate the `change` action
// TODO: Make sure it works properly
document.getElementById('changeButton').addEventListener('click', function() {
    editedArray = toggleValues(currentArray, numIndices = 1)
    sendArrayToServer(editedArray);
});



/// UTILS ///

// Scale a value from one range to another
function scaleValue(value, from, to) {
    let scale = (to[1] - to[0]) / (from[1] - from[0]);
    let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return (capped * scale + to[0]);
}

function limitDecimalPoints(number, n) {
    // Check if the input is a valid number
    if (typeof number !== 'number' || isNaN(number)) {
        throw new Error('Input must be a valid number.');
    }

    // Use toFixed() to limit to n decimal points and convert back to a number
    return parseFloat(number.toFixed(n));
}

resetButton.addEventListener('click', () => {
    arrayList.innerHTML = '';
});


const imageA = require("./../../assets/images/A.png");
const imageB = require("./../../assets/images/b.png");

document.addEventListener("DOMContentLoaded", function() {
    const modelChangeButton = document.getElementById("modelChangeButton");

    modelChangeButton.addEventListener("click", function() {
        const imgElement = this.querySelector("img");

        if (imgElement.src.includes(imageA)) {
            imgElement.src = imageB;
            samplingStrategyIndex = 1;
            console.log("Sampling changed to (B) Softmax!");
        } else {
            imgElement.src = imageA;
            samplingStrategyIndex = 0;
            console.log("Model changed to (A) Epsilon!");
        }
    });
});


// Open the MIDI I/O popup
function openMidiPopup() {
    window.open(src="", "popup", 'width=450,height=450', sandbox="allow-popups");
} //./../html/midi-io.html

const midiButton = document.getElementById('midi-btn');
midiButton.addEventListener('click', openMidiPopup);