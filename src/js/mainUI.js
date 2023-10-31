// Author: Çağrı Erdem, 2023
// Description: Interactive GUI for 2groove web app.

import p5 from 'p5';

let sketch = function(p) {
    let knobs = [];
    let buttons = [];
    let leds = [];
    let bpmDisplay;
    let metronomeSwitch;

    p.setup = function() {
        let canvas = p.createCanvas(800, 600);
        p.background(220);

        // Knobs
        let knobNames = ['Tempo', 'Click', 'Tap', 'Variety'];
        for (let i = 0; i < 4; i++) {
            knobs.push(new Knob(100 + i * 150, 50, 50, knobNames[i], knobChanged));
        }

        // Buttons
        let buttonNames = ['Play/Pause', 'Change', 'Tap Light', 'MIDI I/O'];
        for (let i = 0; i < 4; i++) {
            buttons.push(new Button(100 + i * 150, 200, 100, 50, buttonNames[i], buttonClicked));
        }

        // LEDs
        leds.push(new LED(150, 150, 'Tap'));
        leds.push(new LED(300, 150, 'Metro'));

        // BPM Display
        bpmDisplay = new BPM(400, 100);

        // Metronome On/Off
        metronomeSwitch = new Switch(550, 100, metronomeToggled);

        // Rectangle to represent the piano roll
        p.fill(240, 240, 250);
        p.rect(50, 300, 700, 250);
    };

    p.draw = function() {
        for (let knob of knobs) {
            knob.display();
        }

        for (let button of buttons) {
            button.display();
        }

        for (let led of leds) {
            led.display();
        }

        bpmDisplay.display();
        metronomeSwitch.display();
    };

    function knobChanged(knobName, value) {
        console.log(`Knob ${knobName} changed to ${value}`);
    }

    function buttonClicked(buttonName) {
        console.log(`Button ${buttonName} clicked`);
    }

    function metronomeToggled(isOn) {
        console.log(`Metronome is now ${isOn ? 'ON' : 'OFF'}`);
    }

    class Knob {
        constructor(x, y, size, name, callback) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.name = name;
            this.callback = callback;
            this.angle = p.PI / 4;
        }

        display() {
            p.push();
            p.translate(this.x, this.y);
            p.stroke(0);
            p.fill(200);
            p.ellipse(0, 0, this.size);
            p.rotate(this.angle);
            p.line(0, 0, this.size / 2, 0);
            p.pop();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.name, this.x, this.y + this.size / 2 + 10);
        }
    }

    Knob.prototype.mouseDragged = function() {
        if (p.dist(p.mouseX, p.mouseY, this.x, this.y) < this.size / 2) {
            this.angle += (p.mouseY - p.pmouseY) * 0.01;  // change this value for sensitivity
            this.angle = p.constrain(this.angle, -p.PI / 4, p.PI / 4);
            this.callback(this.name, p.map(this.angle, -p.PI / 4, p.PI / 4, 0, 1));
        }
    };


    class Button {
        constructor(x, y, w, h, name, callback) {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.name = name;
            this.callback = callback;
        }

        display() {
            p.fill(200);
            p.rect(this.x, this.y, this.w, this.h);
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.name, this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    Button.prototype.mousePressed = function() {
        if (p.mouseX > this.x && p.mouseX < this.x + this.w &&
            p.mouseY > this.y && p.mouseY < this.y + this.h) {
            this.callback(this.name);
        }
    };

    
    class LED {
        constructor(x, y, name) {
            this.x = x;
            this.y = y;
            this.name = name;
            this.isOn = false;
        }

        display() {
            p.fill(this.isOn ? 0 : 150);
            p.ellipse(this.x, this.y, 20);
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.name, this.x, this.y + 20);
        }

        toggle(state) {
            this.isOn = state;
        }
    }

    class BPM {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.bpm = 120;  // Default BPM value
        }

        display() {
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(`BPM: ${this.bpm}`, this.x, this.y);
        }

        // Methods to set BPM will be introduced later.
    }

    class Switch {
        constructor(x, y, callback) {
            this.x = x;
            this.y = y;
            this.callback = callback;
            this.isOn = false;
        }

        display() {
            p.fill(this.isOn ? 0 : 150);
            p.rect(this.x, this.y, 40, 20);
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.isOn ? 'ON' : 'OFF', this.x + 20, this.y + 10);
        }

        mousePressed() {
            if (p.mouseX > this.x && p.mouseX < this.x + 40 &&
                p.mouseY > this.y && p.mouseY < this.y + 20) {
                this.isOn = !this.isOn;
                this.callback(this.isOn);
            }
        }
    }

};









new p5(sketch);
