// Author: Çağrı Erdem, 2023
// Description: Global audio EFX module for 2groove web app.

import { EQ3, Freeverb, PingPongDelay } from "tone";

// 3-band EQ
const eq = new EQ3({
  low: 0,
  mid: 0,
  high: 0
}).toDestination(); 

// Delay
const delay = new PingPongDelay({
    delayTime: "8n",
    feedback: 0.000005,
    wet: 0.03,
}).toDestination(); // '.connect(eq);

// Reverb
const reverb = new Freeverb({
    roomSize: 0.4,
    dampening: 1000,
    wet: 0.4,
}).toDestination(); //.connect(delay);

export { delay, eq, reverb };

