// Author: Çağrı Erdem, 2023
// Description: Global audio EFX module for 2groove web app.

import { Compressor, EQ3, Freeverb, PingPongDelay } from "tone";



function scaleValue(value, from, to) {
  let scale = (to[1] - to[0]) / (from[1] - from[0]);
  let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
  return (capped * scale + to[0]);
}


// let amcike = 0.3;
// // Volume knob
// document.getElementById("metronomeVolume").addEventListener("input", function() {
//     const value = this.value;
//     amcike = value;
//     document.getElementById("knob2Value").textContent = value;
   
// });
//  console.log("metroVOL:", amcike);


//  let amcike2 = 0.3;
//  // Volume knob
//  document.getElementById("temp").addEventListener("input", function() {
//      const value = this.value;
//      amcike2 = value;
//      document.getElementById("knob3Value").textContent = value;
    
//  });
//   console.log("tempVOL:", amcike2);


// Compressor
const comp = new Compressor({
  threshold: -18,
  ratio: 4,
  attack: 0.3,
  release: 0.1
}).toDestination();


// 3-band EQ
const eq = new EQ3({
  low: 0.3,
  mid: -0.1,
  high: 0.1
}).toDestination(); 


// Delay
const delay = new PingPongDelay({
    delayTime: "4n",
    feedback: 0.00001,
    wet: 0.05,
    // wet: amcike,
}).toDestination(); // '.connect(eq);

// Reverb
const reverb = new Freeverb({
    roomSize: 0.75,
    dampening: 1000,
    wet: 0.5,
}).toDestination(); //.connect(delay);

export { comp, delay, eq, reverb };

