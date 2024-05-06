// Author: Çağrı Erdem, 2023
// Description: Interactive "piano roll" visualization for 2groove web app.

import { Midi } from '@tonejs/midi';
import p5 from 'p5';
import { getTappedRhythms } from './interface.js';
import { getCurrentMidiForVisuals } from './playback.js'; // import from broadcasting script instead of globalFetch.js



// Wrap entire sketch inside a function and use p5 instance mode to adapt it for module-based bundling 
// (functions become methods of the instance)
const sketch = (s) => {
    // MIDI Handling
    s.loadMidiFile = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();  // Removed s. prefix
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                s.parseMidi(arrayBuffer);  // Removed s. prefix from arrayBuffer
            };
            reader.readAsArrayBuffer(file);
        }
    }

    // MIDI parse function without quantization
    s.parseMidi = function(arrayBuffer, verbose = false) { 
        // Preliminary check for unexpected data format
        if (typeof arrayBuffer === 'string' && arrayBuffer.startsWith('<!do')) {
            console.error("Received unexpected HTML data instead of MIDI");
            return;  // exit function early
        }
    
        try {
            const midi = new Midi(arrayBuffer);  // Assuming that `new Midi` can handle the raw arrayBuffer
    
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
    
            s.noteSequences = midi.tracks.map(track => {
                if (verbose) {
                    track.notes.forEach(note => {
                        console.log(note);
                    });
                }
                return { 
                    notes: track.notes.map(note => {
                        return {
                            pitch: note.midi,
                            startTime: note.time,
                            endTime: note.time + note.duration,
                            velocity: note.velocity // Include velocity in the note object
                        };
                    })
                };
            });
        } catch (error) {
            console.error("Error processing MIDI data in pRoll.js:", error.message);
        }
    }

    // Constants and global variables
    s.NUM_STEPS = 32; // Number of quantized steps; this must be equal to the length of the array
    s.SUBDIVISIONS = 4; // quarter note = 1, eighth note = 2, etc.
    s.NUM_NOTES = 20; // total number of notes of the piano roll
    s.LOWEST_MIDI_NOTE = 34; // -1 worked better on the canvas
    s.noteSequences;
    s.resizingWidth = false;
    s.resizingHeight = false;
    s.WIDTH = 550;
    s.HEIGHT = 250;
    s.EDGE_THRESHOLD = 10; // Distance from edge to enable resizing
    s.offset_x = 1.3; // offset for the vertical lines and/or notes (if necessary)
    s.offset_y = 1.5;

    s.drumMappings = {
        35: "acoustic bass drum",
        36: "kick",
        37: "side-stick",
        38: "snare",
        39: "clap",
        40: "electric snare",
        41: "floor-tom",
        42: "closed-hihat",
        43: "high-tom",
        44: "pedal-hihat",
        45: "low-tom",
        46: "open-hihat",
        47: "mid-tom",
        48: "hi-tom",
        49: "crash",
        50: "high-tom",
        51: "ride",
        52: "chinese cymbal",
        // 53: "ride bell",
        // 54: "tambourine",
        // 55: "splash cymbal",
        // 56: "cowbell",
    };

    // theme-related variables
    s.isDarkTheme = false;
    let backgroundColor = '#fae';
    // let textColor;
    // let accentColor;

    // check the theme switch state and update colors
    s.updateThemeColors = function() {
        s.isDarkTheme = document.getElementById('themeToggleCheckbox').checked;

        if (s.isDarkTheme) {
            // Dark theme 
            backgroundColor = s.color('#B39DDB');
            // textColor = s.color('#E0E0E0');
            // accentColor = s.color('#D81B60');
        } else {
            // Light theme 
            backgroundColor = s.color('#fae');
            // textColor = s.color('#000');
            // accentColor = s.color('#ffa5e9');
        }
    };

    // main setup func
    s.setup = function() {

        s.createCanvas(s.WIDTH, s.HEIGHT).parent('pianoRollContainer');
        // pRollCanvas.parent('pianoRollContainer'); // attach to the specific div
        // file input //no file input with the new UI
        // const midiInput = document.getElementById('fileInput'); // Get the input element by its ID
        // midiInput.addEventListener('change', s.loadMidiFile); // Add an event listener for when a user selects a file
        // // fetch button
        // let fetchButton = s.createButton('Fetch MIDI Data');
        // fetchButton.mousePressed(s.triggerMidiFetch); 
        s.updateThemeColors(); // Initialize theme colors based on the switch state
    
    }

    s.draw = function() {
        s.background(backgroundColor); // Set the background color of the entire canvas

        s.tappedRhythm = getTappedRhythms(); // Get the tapped rhythms from the interface module


        // Fetch MIDI data from the server
        const midi = getCurrentMidiForVisuals();
        if (midi) {
            s.parseMidi(midi);
        }
        
        var x = 0 + s.offset_x;
        var y = 0 + s.offset_y;
        // var y = s.HEIGHT - s.WIDTH;
        s.drawTappedRhythm(s.tappedRhythm, x, y, s.WIDTH, s.WIDTH);
        if (s.noteSequences) {
            s.drawNotes(s.noteSequences[0].notes, x, y, s.WIDTH, s.WIDTH);
        }
        s.fill(255, 64);
    
        // Draw vertical lines for subdivisions
        s.stroke('white'); // Set line color to black
        const lineInterval = s.WIDTH / (s.NUM_STEPS / 4 * s.SUBDIVISIONS);
        for (let i = 0; i < s.WIDTH; i += lineInterval) {
            s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        }
        // Draw vertical lines for beats
        s.stroke('rgba(0,255,0,0.25)');     
        s.strokeWeight(1.2);
        const beatInterval = s.WIDTH / (s.NUM_STEPS / 4);
        for (let i = 0; i < s.WIDTH; i += beatInterval) {
            s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        }
        // Draw vertical lines for bars
        s.stroke('rgb(0,255,0)');
        s.strokeWeight(0.8);
        const barInterval = s.WIDTH / (s.NUM_STEPS / (4 * 4));
        for (let i = 0; i < s.WIDTH; i += barInterval) {
            s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        }
        s.showPopup(); // Show popup when mouse is near the edge of the note cell-sections
    }

    // TODO: define a function to toggle the theme if needed
    s.toggleTheme = function() {
        // Toggle the checkbox state
        const themeSwitch = document.getElementById('themeToggleCheckbox');
        themeSwitch.checked = !themeSwitch.checked;

        // Update theme colors based on the new state
        s.updateThemeColors();
    }

    // Draw function for quantized tapped rhythm 
    s.drawTappedRhythm = function(tappedRhythm, x, y, width, height) {
        const totalDuration = tappedRhythm.length;
    
        s.push();
        s.translate(x, y);
        var cellWidth = width / totalDuration;
        var cellHeight = height / s.NUM_NOTES; // Assuming each tap corresponds to a note
        tappedRhythm.forEach(function(tap, index) {
            if (tap === 1) { // If there's a tap at this position
                var noteColor = s.color(219, 247, 19, 120); // Less opaque
                s.fill(noteColor);
                s.rect(cellWidth * index, 0, cellWidth, cellHeight);
            }
        });
        s.pop();
    }
    

    // Draw function without quantization
    s.drawNotes = function(notes, x, y, width, height) {
        const totalDuration = s.noteSequences.reduce((max, seq) => {
            const endTimes = seq.notes.map(note => note.endTime);
            return Math.max(max, ...endTimes);
        }, 0);

        s.push();
        s.translate(x, y);
        var cellWidth = s.WIDTH / totalDuration; // Update cellWidth based on the new width
        var cellHeight = s.HEIGHT / s.NUM_NOTES; // Update cellHeight based on the new height
        notes.forEach(function(note) {
            var emptyNoteSpacer = 10;
            var noteColor = s.color(255, 0, 191, note.velocity * 255);
            s.stroke('black'); // strokes for the notes
            s.strokeWeight(0.6);
            s.fill(noteColor);
            s.rect(emptyNoteSpacer + cellWidth * note.startTime, s.HEIGHT - cellHeight * (note.pitch - s.LOWEST_MIDI_NOTE),
                cellWidth * (note.endTime - note.startTime) - emptyNoteSpacer, cellHeight);
        });
        s.pop();
    }

    // For example:
    s.mousePressed = function() {
        // Check if mouse is near the right edge of the canvas
        if (s.abs(s.mouseX - s.WIDTH) < s.EDGE_THRESHOLD) {
            s.resizingWidth = true;
        }
        // Check if mouse is near the bottom edge of the canvas
        if (s.abs(s.mouseY - s.HEIGHT) < s.EDGE_THRESHOLD) {
            s.resizingHeight = true;
        }
    }

    s.mouseDragged = function() {
        // If resizing width, update WIDTH based on mouseX
        if (s.resizingWidth) {
            s.WIDTH = s.mouseX;
        }
        // If resizing height, update HEIGHT based on mouseY
        if (s.resizingHeight) {
            s.HEIGHT = s.mouseY;
        }
        // Apply the new width and height to the canvas
        s.resizeCanvas(s.WIDTH, s.HEIGHT);
    }

    s.mouseReleased = function() {
        // Reset resizing flags
        s.resizingWidth = false;
        s.resizingHeight = false;
    }

    s.showPopup = function() {
        if (s.mouseX > s.offset_x && s.mouseX < s.WIDTH + s.offset_x && s.mouseY > 0 && s.mouseY < s.HEIGHT) {
            const cellHeight = s.HEIGHT / s.NUM_NOTES;
            const section = Math.floor((s.HEIGHT - s.mouseY) / cellHeight);
            const midiNote = parseInt(Object.keys(s.drumMappings)[section]);
            
            if (midiNote >= s.LOWEST_MIDI_NOTE && midiNote != 35) { // 35 is the acoustic bass drum - you can ignore parts this way
                const drumPart = s.drumMappings[midiNote];
                const popupWidth = s.textWidth(drumPart) + 10;
    
                // Decide the x position of the popup based on mouseX
                let popupX = s.mouseX + 5;
                if (s.mouseX > (s.WIDTH + s.offset_x) / 2) {
                    popupX = s.mouseX - popupWidth - 5;
                }
    
                s.fill(255);
                s.rect(popupX, s.mouseY, popupWidth, 20);
                s.fill(0);
                s.text(drumPart, popupX + 5, s.mouseY + 15);
            }
        }
    }
}

// Run the sketch:
let myp5 = new p5(sketch);


// If you want to update the theme based on an external event or interaction
document.getElementById('themeToggleCheckbox').addEventListener('change', function() {
    myp5.updateThemeColors(); // Update colors when the switch state changes
});

