// Author: Çağrı Erdem, 2023
// Description: EFX UI for 2groove web app.

// import p5 from "p5";
// import { delay, eq, reverb } from "./efx.js";

// const sketchUi = (u) => {

//     u.lowSlider; 
//     u.midSlider;
//     u.highSlider;
//     u.delayTimeSlider;
//     u.delayFeedbackSlider;
//     u.delayWetSlider;
//     u.reverbRoomSizeSlider;
//     u.reverbDampeningSlider;
//     u.reverbWetSlider;
//     u.x;
//     u.y;
//     u.offset_y = 100; // offset for the vertical push for the UI array-menu

//     u.setup = () => {
//         let efxCanvas = u.createCanvas(550, 200) .parent('efxCanvasContainer');
//         let x = efxCanvas.position().x;
//         let y = efxCanvas.position().y + u.offset_y;
//         u.x = x;
//         u.y = y;
//         efxCanvas.parent('efxCanvasContainer'); // attach to the specific div

//         // Check if eq is properly imported
//         if (!eq) {
//             console.error("EQ is not correctly imported!");
//             return;
//         }

//         // Creating sliders for EQ
//         u.lowSlider = u.createSlider(-10, 10, eq.low.value, 0.1);
//         u.lowSlider.parent('efxCanvasContainer');
//         u.midSlider = u.createSlider(-10, 10, eq.mid.value, 0.1);
//         u.midSlider.parent('efxCanvasContainer');
//         u.highSlider = u.createSlider(-10, 10, eq.high.value, 0.1);
//         u.highSlider.parent('efxCanvasContainer');
//         // Positioning sliders
//         u.lowSlider.position(x,  y + 40);
//         u.midSlider.position(x,  y + 80);
//         u.highSlider.position(x, y + 120);

//         // Creating sliders for Delay
//         u.delayTimeSlider = u.createSlider(0, 1, delay.delayTime.value, 0.01);
//         u.delayTimeSlider.parent('efxCanvasContainer');
//         u.delayFeedbackSlider = u.createSlider(0, 1, delay.feedback.value, 0.01);
//         u.delayFeedbackSlider.parent('efxCanvasContainer');
//         u.delayWetSlider = u.createSlider(0, 1, delay.wet.value, 0.01);
//         u.delayWetSlider.parent('efxCanvasContainer');
//         // Positioning sliders
//         u.delayTimeSlider.position(x + 200,     y + 40);
//         u.delayFeedbackSlider.position(x + 200, y + 80);
//         u.delayWetSlider.position(x + 200,      y + 120);

//         // Creating sliders for Reverb
//         u.reverbRoomSizeSlider = u.createSlider(0, 1, reverb.roomSize.value, 0.01);
//         u.reverbRoomSizeSlider.parent('efxCanvasContainer');
//         u.reverbDampeningSlider = u.createSlider(50, 15000, reverb.dampening, 1);
//         u.reverbDampeningSlider.parent('efxCanvasContainer');
//         u.reverbWetSlider = u.createSlider(0, 1, reverb.wet.value, 0.01);
//         u.reverbWetSlider.parent('efxCanvasContainer');
//         // Positioning sliders
//         u.reverbRoomSizeSlider.position(x + 400,  y + 40);
//         u.reverbDampeningSlider.position(x + 400, y + 80);
//         u.reverbWetSlider.position(x + 400,       y + 120);
//     };

//     u.draw = () => {
//         // Update EQ values based on slider values
//         eq.low.value = u.lowSlider.value();
//         eq.mid.value = u.midSlider.value();
//         eq.high.value = u.highSlider.value();

//         // Update Delay values based on slider values
//         delay.delayTime.value = u.delayTimeSlider.value();
//         delay.feedback.value = u.delayFeedbackSlider.value();
//         delay.wet.value = u.delayWetSlider.value();

//         // Update Reverb values based on slider values
//         reverb.roomSize.value = u.reverbRoomSizeSlider.value();
//         reverb.dampening.value = u.reverbDampeningSlider.value();
//         reverb.wet.value = u.reverbWetSlider.value();

//         // Create text elements
//         let textLow = u.createP('Low: ' + eq.low.value).position(u.x + 10, u.y + 30);
//         let textMid = u.createP('Mid: ' + eq.mid.value).position(u.x + 10, u.y + 70);
//         let textHigh = u.createP('High: ' + eq.high.value).position(u.x + 10, u.y + 110);

//         let textDelayTime = u.createP('Delay Time: ' + delay.delayTime.value).position(u.x + 200, u.y + 30);
//         let textFeedback = u.createP('Feedback: ' + delay.feedback.value).position(u.x + 200, u.y + 70);
//         let textWetDelay = u.createP('Wet: ' + delay.wet.value).position(u.x + 200, u.y + 110);

//         let textRoomSize = u.createP('Room Size: ' + reverb.roomSize.value).position(u.x + 400, u.y + 30);
//         let textDampening = u.createP('Dampening: ' + reverb.dampening).position(u.x + 400, u.y + 70);
//         let textWetReverb = u.createP('Wet: ' + reverb.wet.value).position(u.x + 400, u.y + 110);

//         let texts = [textLow, textMid, textHigh, textDelayTime, textFeedback, textWetDelay, textRoomSize, textDampening, textWetReverb];
//         for (let t of texts) {
//             t.parent('efxCanvasContainer'); // Assign all these text elements to the efxCanvasContainer
//             t.style('font-size', '11px');
//             t.style('font-weight', '100');
//             t.style('color', '#A0A0A0');
//             t.class('custom-font'); // in css
//         }

//     }
// };

// // Initialize p5 instance
// new p5(sketchUi);









// // Global (regular) mode sketch
// import { delay, eq, reverb } from "./efx.js";

// let lowSlider; 
// let midSlider;
// let highSlider;
// let delayTimeSlider;
// let delayFeedbackSlider;
// let delayWetSlider;
// let reverbRoomSizeSlider;
// let reverbDampeningSlider;
// let reverbWetSlider;

// function setup() {
//     createCanvas(400, 200).parent('efxCanvasContainer');

//     // Check if eq is properly imported
//     if (!eq) {
//         console.error("EQ is not correctly imported!");
//         return;
//     }

//     // Creating sliders for EQ
//     lowSlider = createSlider(-10, 10, eq.low.value, 0.1);
//     lowSlider.parent('efxCanvasContainer');
//     midSlider = createSlider(-10, 10, eq.mid.value, 0.1);
//     midSlider.parent('efxCanvasContainer');
//     highSlider = createSlider(-10, 10, eq.high.value, 0.1);
//     highSlider.parent('efxCanvasContainer');

//     // Creating sliders for Delay
//     delayTimeSlider = createSlider(0, 1, delay.delayTime.value, 0.01);
//     delayTimeSlider.parent('efxCanvasContainer');
//     delayFeedbackSlider = createSlider(0, 1, delay.feedback.value, 0.01);
//     delayFeedbackSlider.parent('efxCanvasContainer');
//     delayWetSlider = createSlider(0, 1, delay.wet.value, 0.01);
//     delayWetSlider.parent('efxCanvasContainer');

//     // Creating sliders for Reverb
//     reverbRoomSizeSlider = createSlider(0, 1, reverb.roomSize.value, 0.01);
//     reverbRoomSizeSlider.parent('efxCanvasContainer');
//     reverbDampeningSlider = createSlider(0, 1, reverb.dampening.value, 0.01);
//     reverbDampeningSlider.parent('efxCanvasContainer');
//     reverbWetSlider = createSlider(0, 1, reverb.wet.value, 0.01);
//     reverbWetSlider.parent('efxCanvasContainer');
// }

// function draw() {
//     // Update EQ values based on slider values
//     eq.low.value = lowSlider.value();
//     eq.mid.value = midSlider.value();
//     eq.high.value = highSlider.value();

//     // Update Delay values based on slider values
//     delay.delayTime.value = delayTimeSlider.value();
//     delay.feedback.value = delayFeedbackSlider.value();
//     delay.wet.value = delayWetSlider.value();

//     // Update Reverb values based on slider values
//     reverb.roomSize.value = reverbRoomSizeSlider.value();
//     reverb.dampening.value = reverbDampeningSlider.value();
//     reverb.wet.value = reverbWetSlider.value();
// }
