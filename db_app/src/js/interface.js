// Author: Çağrı Erdem, 2023
// Description: User interface for 2groove web app.

import { globalFetch } from './globalFetch.js';

// Initialize Web Audio API
const audioContext = new AudioContext();

// UI Elements
const tempoSlider = document.getElementById('tempo');
const metronomeVolumeSlider = document.getElementById('metronomeVolume');


const recIndicator = document.getElementById('recIndicator');
const arrayList = document.getElementById('arrayList');
const intervals = []; // for tap tempo


// Variables
let beatsInput = 8; // 8 beats (2 bars)
let quantizeSelect = 4; // 1/16
let gateKeyActive = false;
let currentArray = [];
let recording = false;
let recordingStartedAt = 0;
// let httpIp = [`158.39.200.82`, `127.0.0.1`];
// let httpPort = [`5002`, `5003`];
let isHttpConnected = true; // we keep it true with the new UI
let lastTapTime = 0; // for tap tempo
let tappedRhythms = [];

let tempoBpm = tempoSlider.value;
let tempVal = 0.2;
let threshVal = 0.3;
let currentTick = 1;
let clickTone = 1000;
let samplingStrategy = {'strategy': ['epsilon', 'softmax_temp'],
                        'tempRange': [[0.01, 5.0], [0.1, 1.9]],
                        'threshRange': [[0.15, 0.35], [0.099, 0.135]]};
// 0.8 temp ve 1.47 thresh B sampling icin iyi baslangic
let samplingStrategyIndex = 1; //Now we made it fixed to softmax sampling
// variables that arose problems after build
let lastTapTimestamp = Date.now();
let numIndices = 1;
let editedArray;



//-------------------------------------
// Functions
//-------------------------------------

async function initializeApp() {
    // Set default BPM or retrieve it from a saved setting or slider
    const defaultBPM = tempoSlider.value;

    console.log("App initialized!");
    // console.log("Default BPM:", defaultBPM);
}


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



document.addEventListener('DOMContentLoaded', function() {
    const inputElement = document.getElementById('temp');
    const displayElement = document.getElementById('knob3Value');
    const min = 0.1; // parseFloat(inputElement.min);
    const max = 1.9; //parseFloat(inputElement.max);

    const randomValue = Math.random() * (max - min) + min;
    tempVal = randomValue;
    // console.log("Temperture:", tempVal);
    const paramScaled = scaleValue(tempVal, [min, max], [0, 1]);

    // console.log("Sampling Temperature:", paramScaled);

    // Update the text
    const formattedValue = paramScaled.toFixed(2); // decimal points
    inputElement.value = formattedValue;
    displayElement.textContent = formattedValue; // Update display to match the input value
});

document.addEventListener('DOMContentLoaded', function() {
    const inputElement = document.getElementById('tolerance');
    const displayElement = document.getElementById('knob4Value');
    const min = 0.11;
    const max = 0.135;

    const randomValue = Math.random() * (max - min) + min;
    threshVal = randomValue;
    // console.log("Threshold:", threshVal);
    const paramScaled = scaleValue(randomValue, [min, max], [0, 1]);

    // Update the text
    const formattedValue = paramScaled.toFixed(2); // decimal points
    inputElement.value = formattedValue;
    displayElement.textContent = formattedValue; // Update display to match the input value
});


initializeApp();
// console.log("Temperature value:", tempVal);
// console.log("Hit tolerance:", threshVal);


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


// function emitTickEvent() {
//     // count4();
//     // const event = new Event('metronomeTick');
//     // window.dispatchEvent(event);
//     const event = new CustomEvent('metronomeTick', { detail: { tick: currentTick } });
//     window.dispatchEvent(event);
    
// }

export function metroTrigger() {
    return true;
  }



///////////////////////
/////// tap2arr ///////
///////////////////////



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
    // console.log("tempVal:", tempVal);
});


// Thresh knob
// TODO: WOrk on it more!
document.getElementById("tolerance").addEventListener("input", function() {
    const value = this.value;
    // tempVal = scaleValue(value, [0, 1], [0.01, 100]);
    threshVal = scaleValue(value, [0, 1], samplingStrategy['threshRange'][samplingStrategyIndex]);
    document.getElementById("knob4Value").textContent = value;
    // TODO: Check if it's a good idea to combine the two values. If yes, check better ways of combining.
    // console.log("threshVal:", threshVal);
});



// Uyari sistemi
function showNotification(message) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.classList.add('error_notification'); // Add a class to style the notification
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000); // Remove the notification after 3 seconds
}




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
            showNotification("Ooops! I messed it up." + "\n" + "Modify some parameters a bit or just refresh the page to try again.");
            break;
    }
});

// Modify `sendArrayToServer` to post data to the worker:
function sendArrayToServer(array) {

    tempoBpm = parseFloat(document.getElementById('tempo').value);
    // console.log("BPM:", tempoBpm);
    // console.log("tempVal:", tempVal);
    // console.log("threshVal:", threshVal);

    ajaxWorker.postMessage({
        cmd: 'sendArray',
        array: array,
        bpm: tempoBpm,
        temperatureValue: tempVal, //parseFloat(document.getElementById('temperature').value),
        hitTolerance: threshVal, //parseFloat(document.getElementById('tolerance').value),
        isHttpConnected: isHttpConnected,  
        // httpIp: httpIp[0], //httpIp.value,             
        // portInput: httpPort[0], //portInput.value        
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


// Event listener for the tempo and vol sliders
tempoSlider.addEventListener("input", function() {
    const bpm = this.value;
    document.getElementById("knob1Value").textContent = bpm; // Update the knob value
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
      recIndicator.innerText = 'ON AIR!';
      recIndicator.classList.add('recording'); 
      
      const totalSteps = parseInt(beatsInput) * parseInt(quantizeSelect); //.value methods removed for new UI
      currentArray = new Array(totalSteps).fill(0);  // Initialize array with zeros
      
      recording = true;
  }

  if (e.key === ' ' && gateKeyActive) {
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
    recIndicator.innerText = ' '; //REC OFF
    recIndicator.classList.remove('recording');

    storeAndDisplayArray(currentArray);  // To display the array
    sendArrayToServer(currentArray); // To send the array via fetch (to server

    const notification = document.getElementById('notification_tapping');
    notification.style.display = 'block'; // notification for tapped rhythm
    // Hide it after 2000ms
    setTimeout(function() {
        notification.style.display = 'none';
    }, 500);

    recording = false;
  }

  if (e.key === ' ') {
    metroTrigger(); // To trigger the metronome in playback.js
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


///////////
///HELP///
///////////
// Functions to show notifications and help instructions


// A map linking GUI element IDs to notification IDs
const helpMap = {
    'db_app': 'notificationForApp', 
    'db_app2': 'notificationForApp2',
    'playbackSubContainer': 'notificationForplaybackSubContainer',
    'tempo': 'notificationForTempo',
    'metronomeVolume': 'notificationForVolume',
    'tapTempoLight': 'notificationForTapTempoLight',
    'metroFeedback': 'notificationForMetronomeToggle',
    'temp': 'notificationForTempKnob',
    'tolerance': 'notificationForToleranceKnob',
    'invisibleAnchor_pRoll': 'notificationForPianoRoll',
    'changeButton': 'notificationForChangeBtn',
    'togglePlaybackButton': 'notificationForTogglePlaybackBtn',
    'tapLight': 'notificationForTapLight',
    'recIndicator': 'notificationForRecIndicator',
    'download-btn': 'notificationForDownloadBtn',
    'helpToggle': 'notificationForFinal',
};

let currentStep = 0;
const helpEntries = Object.entries(helpMap);

document.getElementById('helpToggle').addEventListener('change', function(event) {
    if (event.target.checked) {
        currentStep = 0; // Start from the first help item
        populateHelpDots();
        showHelpStep(currentStep);
    } else {
        document.getElementById('helpOverlay').style.display = 'none';
    }
});

function populateHelpDots() {
    const dotsContainer = document.getElementById('helpDotsContainer');
    dotsContainer.innerHTML = ''; // Clear existing dots

    helpEntries.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('help-dot');
        if (index === currentStep) {
            dot.classList.add('active'); // Mark the current step's dot as active
        }
        dot.addEventListener('click', () => {
            currentStep = index; // Update currentStep to the clicked dot's index
            showHelpStep(currentStep);
        });
        dotsContainer.appendChild(dot);
    });
}

document.getElementById('nextHelp').addEventListener('click', function() {
    if (currentStep < helpEntries.length - 1) {
        currentStep++;
        showHelpStep(currentStep);
        populateHelpDots(); // Refresh the dots to update the active state
    }
});

document.getElementById('prevHelp').addEventListener('click', function() {
    if (currentStep > 0) {
        currentStep--;
        showHelpStep(currentStep);
        populateHelpDots(); // Refresh the dots to update the active state
    }
});

document.getElementById('closeHelp').addEventListener('click', function() {
    document.getElementById('helpOverlay').style.display = 'none';
    document.getElementById('helpToggle').checked = false;
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
        // Simulate clicking the "Prev" button
        document.getElementById('prevHelp').click();
    } else if (event.key === 'ArrowRight') {
        // Simulate clicking the "Next" button
        document.getElementById('nextHelp').click();
    } else if (event.key === 'Escape') {
        // Simulate clicking the "Close" button
        document.getElementById('closeHelp').click();
    }
});



function showHelpStep(step) {
    const [itemId, notificationId] = helpEntries[step];
    const itemElement = document.getElementById(itemId);
    const notificationElement = document.getElementById(notificationId);
    const helpContent = document.getElementById('helpContent');

    // Set dynamic content
    const contentArea = helpContent.querySelector('.content-area') || document.createElement('div');
    contentArea.className = 'content-area'; // For additional styling if needed
    contentArea.innerHTML = notificationElement.innerHTML; // Copy the content from your notification element
    if (!contentArea.parentNode) {
        helpContent.insertBefore(contentArea, helpContent.querySelector('.help-nav'));
    }

    // Calculate and set position next to the GUI item
    const rect = itemElement.getBoundingClientRect();
    helpContent.style.top = `${window.scrollY - 10 + rect.top}px`; // adjust Y as needed
    helpContent.style.left = `${rect.right + 3 + window.scrollX}px`; // Position to the right of the item - again adjust X as needed

    // Update active dot
    document.querySelectorAll('.help-dot').forEach((dot, index) => {
        if (index === step) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    document.getElementById('helpOverlay').style.display = 'flex'; // Show the overlay
}


// theme tests
document.getElementById('themeToggleCheckbox').addEventListener('change', function() {
    if (this.checked) {
        // Apply dark theme
        document.body.classList.add('dark-theme');
    } else {
        // Revert to light theme
        document.body.classList.remove('dark-theme');
    }
});

