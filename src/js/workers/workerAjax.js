// worker for client-side ajax requests

self.addEventListener('message', function(event) {
    const data = event.data;

    if (data.cmd === 'sendArray') {
        sendArrayToServer(data.array, data.bpm, data.temperatureValue, data.hitTolerance, data.isHttpConnected, data.httpIp, data.portInput, data.samplingStrategy);
    }
});


// function sendArrayToServer(array, bpm, temperatureValue, hitTolerance, isHttpConnected, httpIp, portInput, samplingStrategy) {
//     if (!isHttpConnected) return;

//     const data_url = `http://${httpIp}:${portInput}/send_array`;
//     console.log("Sending request to:", data_url);

//     const payload = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             array: array,
//             bpm: bpm,
//             temp: temperatureValue,
//             thresh: hitTolerance,
//             samplingStrategy: samplingStrategy
//         })
//     };

//     fetch(data_url, payload)
//     .then(response => response.arrayBuffer())
//     .then(data => {
//         console.log("Processing tapped rhythms...");
//         // send a message back to the main thread if necessary
//         self.postMessage({type: 'arrayProcessed', data: data});
//     })
//     .catch(error => {
//         console.error("Error:", error);
//         self.postMessage({type: 'error', error: error});
//     });
// }


function sendArrayToServer(array, bpm, temperatureValue, hitTolerance, isHttpConnected, httpIp, portInput, samplingStrategy) {
    if (!isHttpConnected) return;

    const data_url = `http://${httpIp}:${portInput}/send_array`;
    console.log("Sending request to:", data_url);

    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            array: array,
            bpm: bpm,
            temp: temperatureValue,
            thresh: hitTolerance,
            samplingStrategy: samplingStrategy
        })
    };

    fetch(data_url, payload)
    .then(response => response.json())  // Process as JSON first
    // checking the success field of the response, and if it's true, you're converting the data field (base64 encoded string of the MIDI binary) 
    // back to a byte array, and then you're posting this byte array back to the main thread:
    .then(data => {
        if (data.success) {
            console.log("Processing tapped rhythms...");
            // const midiData = new Uint8Array(data.data);  // Convert base64 string to byte array
            const base64decoded = atob(data.data);
            const midiData = new Uint8Array(base64decoded.length).map((_, i) => base64decoded.charCodeAt(i));

            console.log("Received MIDI data length:", midiData.length);
            self.postMessage({type: 'arrayProcessed', data: midiData});
        } else {
            console.warn(data.message);
            self.postMessage({type: 'error', error: new Error(data.message)});
        }
    })    
    .catch(error => {
        console.error("Error:", error);
        self.postMessage({type: 'error', error: error});
    });
}
