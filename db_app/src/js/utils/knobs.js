// Author: Çağrı Erdem, 2023
// Description: Knobs for 2groove web app UI.

import p5 from "p5";

let KnobSketch = function(p) {

    class Knob {
        constructor(x, y, r, callback) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.dragging = false;
            this.angle = 0;
            this.offsetAngle = 0;
            this.callback = callback; // callback function for mapping knob val to sthing
        }

        display() {
            if (this.dragging) {
                let dx = p.mouseX - this.x;
                let dy = p.mouseY - this.y;
                let mouseAngle = p.atan2(dy, dx);
                this.angle = mouseAngle - this.offsetAngle;
            }

            if (this.dragging) {
                p.fill(175);
            } else {
                p.fill(255);
            }

            p.push();
            p.strokeWeight(2);
            p.translate(this.x, this.y);
            p.rotate(this.angle);
            p.circle(0, 0, this.r * 2);
            p.line(0, 0, this.r, 0);
            p.pop();

            let calcAngle = 0;
            if (this.angle < 0) {
                calcAngle = p.map(this.angle, -p.PI, 0, p.PI, 0);
            } else if (this.angle > 0) {
                calcAngle = p.map(this.angle, 0, p.PI, p.TWO_PI, p.PI);
            }

            p.fill(0);
            p.textAlign(p.CENTER);
            p.text(p.int(p.degrees(calcAngle)), this.x, this.y + this.r + 20);
        }


        invokeCallback() { // the callback method for mapping
            if (this.callback) {
                let calcAngle = 0;
                if (this.angle < 0) {
                    calcAngle = p.map(this.angle, -p.PI, 0, p.PI, 0);
                } else if (this.angle > 0) {
                    calcAngle = p.map(this.angle, 0, p.PI, p.TWO_PI, p.PI);
                }
                this.callback(calcAngle); // Call the callback with the current angle
            }
        }

        handlePress() {
            if (p.dist(p.mouseX, p.mouseY, this.x, this.y) < this.r) {
                this.dragging = true;
                let dx = p.mouseX - this.x;
                let dy = p.mouseY - this.y;
                this.offsetAngle = p.atan2(dy, dx) - this.angle;
            }
        }

        handleRelease() {
            this.dragging = false;
        }
    }

    let knobs = [];

    p.knobChanged = function(angleValue) {
        console.log("Knob angle changed to:", angleValue);
    };

    p.setup = function() {
        // p.createCanvas(640, 360);
        let canvas = p.createCanvas(640, 360);
        canvas.parent('knobContainer');  // Parent the canvas to the div container
        knobs.push(new Knob(160, 180, 40, p.knobChanged)); // Create knob instances
        // ... add more knobs as needed
    };

    p.draw = function() {
        p.background(255);
        for (let knob of knobs) {
            knob.display();
        }
    };

    p.mousePressed = function() {
        for (let knob of knobs) {
            knob.handlePress();
        }
    };

    p.mouseReleased = function() {
        for (let knob of knobs) {
            knob.handleRelease();
        }
    };

};

let myKnobSketch = new p5(KnobSketch);
