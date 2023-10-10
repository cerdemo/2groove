// Initialize Web Audio API
const audioContext = new AudioContext();

// UI Elements
const tempoSlider = document.getElementById('tempo');
const metronomeVolumeSlider = document.getElementById('metronomeVolume');
const tapVolumeSlider = document.getElementById('tapVolume');
const toggleMetronomeButton = document.getElementById('toggleMetronome');
const recIndicator = document.getElementById('recIndicator');
const beatsInput = document.getElementById('beats');
const quantizeSelect = document.getElementById('quantize');
const loopsInput = document.getElementById('loops');
const arrayList = document.getElementById('arrayList');
const resetButton = document.getElementById('resetButton');
const bpmDisplay = document.getElementById('bpmDisplay');
const portInput = document.getElementById('serverPort')
const httpIp = document.getElementById('httpIpAddress')
const connectButton = document.getElementById('connectButton');
const toggleServerButton = document.getElementById('toggleServerButton');
const intervals = []; // for tap tempo


// Variables
let rhythmBuffer = [];
let metronomeInterval;
let metronomeRunning = false;
let gateKeyActive = false;
let currentArray = [];
let recording = false;
let recordingStartedAt = 0;
let lastTapTimestamp = 0;
let midiAccess;
let isOscConnected = false; // osc server connection state
let isHttpConnected = false; // http server connection state
let lastTapTime = 0; // for tap tempo
let tappedRhythms = [];

//-------------------------------------
// Functions
//-------------------------------------

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

// Toggle Metronome On/Off
function toggleMetronome() {
    if (metronomeRunning) {
        clearInterval(metronomeInterval);
        metronomeRunning = false;
    } else {
        startMetronome(tempoSlider.value);
        metronomeRunning = true;
    }
}

// Start Metronome
function startMetronome(bpm) {
    const beatTime = 60 / bpm;
    clearInterval(metronomeInterval);
    metronomeInterval = setInterval(() => {
        playClick(metronomeVolumeSlider.value, 1500);
    }, beatTime * 1000);
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


// the Fetch API (native in modern browsers) to send arrays:
function sendArrayToServer(array) {

  // Only proceed if the checkbox is checked
  if (!isHttpConnected) return;

  const bpm = parseFloat(document.getElementById('tempo').value);
  const temperatureValue = parseFloat(document.getElementById('temperature').value);
  const data_url = `http://${httpIp.value}:${portInput.value}/send_array`;
  console.log("Sending request to:", data_url);  // log the URL

  const payload = {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        array: array, 
        bpm: bpm, 
        temp: temperatureValue,
      })
  };

  fetch(data_url, payload)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        resetTappedRhythms();  // Reset the tapped rhythms after sending
      })
      .catch(error => {
          console.error("Error:", error);
      });
}


function sendControlSignal(action) {
  // TODO: In the frontend interface, buttons or controls can call the sendControlSignal() function with the respective action, 
  // e.g., sendControlSignal('pause').
  const control_url = `http://${httpIp.value}:${portInput.value}/control`;
  console.log("Sending request to:", control_url);  // log the URL
  
  let change_param = {
      action: action
  };

  // If the action is 'change', add the temperature value to the change_param
  if (action === 'change') {
      const tempValue = parseFloat(document.getElementById('temperature').value);
      change_param.newTemp = tempValue;
      const bpmValue = parseInt(document.getElementById('tempo').value);
      change_param.newBpm = bpmValue;
  }

  fetch(control_url, {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify(change_param)
  })
  .then(response => response.json())
  .then(data => console.log(data));
}



function sendGenParameters(){

  const loop_amount = parseInt(loopsInput.value);
  const hitTolerance = parseFloat(document.getElementById('tolerance').value);
  const param_url = `http://${httpIp.value}:${portInput.value}/set_params`;

  fetch(param_url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        loops: loop_amount,
        tolerance: hitTolerance
    })
})
.then(response => response.json())
.then(data => console.log(data));
}


function resetTappedRhythms() {
  // tappedRhythms = [];
  tappedRhythms.length = 0;  // This empties the array without re-declaring it
  // ... any other necessary resets or UI updates ...
}


//-------------------------------------
// Event Listeners
//-------------------------------------

toggleMetronomeButton.addEventListener('click', () => {
    toggleMetronomeButton.classList.toggle('toggled');
    toggleMetronome();
});

// button to connect to HTTP server
toggleServerButton.addEventListener('click', () => {
  isHttpConnected = !isHttpConnected; // Toggle the state
  if (isHttpConnected) {
      toggleServerButton.classList.remove('disconnected');
      toggleServerButton.classList.add('connected');
      toggleServerButton.textContent = 'Disconnect from HTTP Server';
  } else {
      toggleServerButton.classList.remove('connected');
      toggleServerButton.classList.add('disconnected');
      toggleServerButton.textContent = 'Connect to HTTP Server';
  }
});

tempoSlider.addEventListener('input', (e) => {
    const bpm = e.target.value;
    bpmDisplay.innerText = `${bpm} BPM`;
    if (metronomeRunning) {
        startMetronome(bpm);
    }
});

// Record tapped rhythm
window.addEventListener('keydown', (e) => {
  if (e.key === 'a' && !recording) {
      gateKeyActive = true;
      recordingStartedAt = Date.now();
      recIndicator.innerText = 'REC ON!';
      recIndicator.classList.add('recording');
      
      const totalSteps = parseInt(beatsInput.value) * parseInt(quantizeSelect.value);
      currentArray = new Array(totalSteps).fill(0);  // Initialize array with zeros
      
      recording = true;
  }

  if (e.key === ' ' && gateKeyActive) {
      playClick(tapVolumeSlider.value, 300);
      const elapsedMs = Date.now() - recordingStartedAt;
      const bpm = parseInt(tempoSlider.value);
      const quantizeValue = parseInt(quantizeSelect.value);
      const singleSubdivisionDuration = (60 * 1000) / (bpm * quantizeValue);
      const tappedSubdivision = Math.round(elapsedMs / singleSubdivisionDuration);
      if (tappedSubdivision < currentArray.length) {
          currentArray[tappedSubdivision] = 1;
      }
      lastTapTimestamp = Date.now();
  }

  if (e.key === ' ') { // blinking light every time space bar is hit
      const light = document.getElementById('light');
      light.classList.remove('light-off');
      light.classList.add('light-on');
  }

  if (e.key.toUpperCase() === 'T') { // tap tempo
    const currentTime = new Date().getTime();
    const interval = currentTime - lastTapTime; // in milliseconds
    const tapLight = document.getElementById('tapLight'); // Visual feedback for tap
    tapLight.classList.remove('light-off');
    tapLight.classList.add('light-on');
    // tapLight.style.backgroundColor = 'red';
    playClick(metronomeVolumeSlider.value, 1500);
    
    setTimeout(() => {
        // tapLight.style.backgroundColor = '';
        tapLight.classList.remove('light-on');
        tapLight.classList.add('light-off');
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
        const bpmDisplayElement = document.getElementById('bpmDisplay');
        const tempoSlider = document.getElementById('tempoSlider');
        
        if (tempoElement) tempoElement.value = bpm.toFixed(2); 
        if (bpmDisplayElement) bpmDisplayElement.innerText = bpm.toFixed(2);
        if (tempoSlider) tempoSlider.value = bpm.toFixed(0);
    }
    
    lastTapTime = currentTime;
}
});


window.addEventListener('keyup', (e) => {
  if (e.key === 'a') {
      gateKeyActive = false;
      recIndicator.innerText = 'REC OFF';
      recIndicator.classList.remove('recording');

      storeAndDisplayArray(currentArray);  // To display the array
      sendArrayToServer(currentArray); // To send the array via fetch (to server
      // sendArrayViaOSC(currentArray); // TODO: To send the array via OSC
      // sendControlSignal('change'); //to send ctrl sig
      sendGenParameters();
      // Check if the metronome is currently active/on
      if (metronomeRunning) {
        // Toggle the metronome off
        toggleMetronome();

        // Modify the button visually to reflect the off state
        toggleMetronomeButton.classList.remove('toggled');
    }
      recording = false;
  }

  if (e.key === ' ') {
      const light = document.getElementById('light');
      light.classList.remove('light-on');
      light.classList.add('light-off');
}
});

resetButton.addEventListener('click', () => {
    arrayList.innerHTML = '';
});

// Buttons to send control signals
document.getElementById('startButton').addEventListener('click', function() {
  sendControlSignal('start');
});
document.getElementById('changeButton').addEventListener('click', function() {
  sendControlSignal('change');
  sendGenParameters();
});
document.getElementById('pauseButton').addEventListener('click', function() {
  sendControlSignal('pause');
});
document.getElementById('resumeButton').addEventListener('click', function() {
  sendControlSignal('resume');
});
document.getElementById('stopButton').addEventListener('click', function() {
  sendControlSignal('stop');
});

// Initialize BPM display with initial value
bpmDisplay.innerText = `${tempoSlider.value} BPM`;
// console.clear();
