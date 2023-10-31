// dedicated thread for queueing up rhythms

let midiEvents = [];  // This will hold the queued MIDI events

self.addEventListener('message', function(event) {
    const data = event.data;

    switch (data.cmd) {
        case 'enqueue':
            midiEvents.push(data.event);
            break;
        case 'dequeue':
            // Logic to decide which event(s) should be sent next
            const nextEvent = midiEvents.shift();  // Simplified example
            self.postMessage({ cmd: 'broadcast', event: nextEvent });
            break;
        // ... other cases like clearing the queue, etc.
    }
});
