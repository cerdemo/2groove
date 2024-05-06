class MidiBroadcaster {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.midiQueue = [];         // Queue of MIDI files to play
        this.currentMidi = null;     // Current MIDI data being processed
        this.isRunning = false;
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
        this.nextNoteTime = 0.0;      // When the next note is due
        this.lookahead = 25;          // How frequently to call scheduling function (in milliseconds)
        this.intervalID = null;
    }

    loadMidiData(midiData) {
        const midi = new Midi(midiData);
        this.currentMidi = midi;
        this.nextNoteTime = this.audioContext.currentTime;
        this.processMidiTrack(midi.tracks[0]);
    }

    processMidiTrack(track) {
        // Process the MIDI track to prepare for scheduling
        let accumulatedTime = 0;
        track.notes.forEach(note => {
            const timeMs = note.ticks * (60 * 1000 / this.tempo) / track.header.ppq;
            accumulatedTime += timeMs / 1000; // Convert to seconds
            this.midiQueue.push({ note, time: accumulatedTime });
        });
    }

    scheduleNoteWithAudioClock(note, time) {
        const vel = this.scaleValue(note.velocity, [0, 1], [0, 127]);
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.onended = () => {
            midiOutput.send([0x90, note.midi, vel]);
        };
        osc.start(time);
        osc.stop(time + 0.001); // short duration to trigger onended
    }

    midiScheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime && this.midiQueue.length > 0) {
            const noteEvent = this.midiQueue.shift();
            this.scheduleNoteWithAudioClock(noteEvent.note, noteEvent.time);
            this.nextNoteTime = noteEvent.time;
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.intervalID = setInterval(() => this.midiScheduler(), this.lookahead);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.intervalID);
    }

    // Utility function to scale MIDI velocity
    scaleValue(value, from, to) {
        let scale = (to[1] - to[0]) / (from[1] - from[0]);
        let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
        return (capped * scale + to[0]);
    }
}

// Example usage
// const midiBroadcaster = new MidiBroadcaster();
// midiBroadcaster.loadMidiData(yourMidiData); // Load your MIDI data
// midiBroadcaster.start(); // Start broadcasting
