// Author: Çağrı Erdem, 2023
// Description: Main bundler script for 2groove web app.

// Importing packages
import { Midi } from '@tonejs/midi';
import p5 from 'p5';
import * as Tone from 'tone';
import { WebMidi } from 'webmidi';

// init them
Tone.start();
console.log(`p5.js ${p5.VERSION}`);
const midi = new Midi()
console.log(WebMidi.inputs);


// Importing modules
// ----------------------------
import "./../styles/mainUI.css";
// ----------------------------
import "./efx.js";
import "./globalFetch.js";
import "./interface.js";
import "./pRoll.js";
import "./playback.js";
import "./utils/metronome.js";
import "./workers/workerAjax.js";
import "./workers/workerQueue.js";
// ----------------------------

