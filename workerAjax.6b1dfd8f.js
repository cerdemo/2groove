// worker for client-side ajax requests
self.addEventListener("message",function(e){let t=e.data;"sendArray"===t.cmd&&// function sendArrayToServer(array, bpm, temperatureValue, hitTolerance, isHttpConnected, httpIp, portInput, samplingStrategy) {
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
function(e,t,r,s,a,o,n,l){if(!a)return;let p=`http://${o}:${n}/send_array`;console.log("Sending request to:",p);let c={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({array:e,bpm:t,temp:r,thresh:s,samplingStrategy:l})};fetch(p,c).then(e=>e.json())// Process as JSON first
// checking the success field of the response, and if it's true, you're converting the data field (base64 encoded string of the MIDI binary) 
// back to a byte array, and then you're posting this byte array back to the main thread:
.then(e=>{if(e.success){console.log("Processing tapped rhythms...");// const midiData = new Uint8Array(data.data);  // Convert base64 string to byte array
let t=atob(e.data),r=new Uint8Array(t.length).map((e,r)=>t.charCodeAt(r));console.log("Received MIDI data length:",r.length),self.postMessage({type:"arrayProcessed",data:r})}else console.warn(e.message),self.postMessage({type:"error",error:Error(e.message)})}).catch(e=>{console.error("Error:",e),self.postMessage({type:"error",error:e})})}(t.array,t.bpm,t.temperatureValue,t.hitTolerance,t.isHttpConnected,t.httpIp,t.portInput,t.samplingStrategy)});//# sourceMappingURL=workerAjax.6b1dfd8f.js.map

//# sourceMappingURL=workerAjax.6b1dfd8f.js.map
