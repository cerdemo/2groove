!function(t1, e) {
    "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.Tone = e() : t1.Tone = e();
}("undefined" != typeof self ? self : this, function() {
    return function(t1) {
        var e = {};
        function s1(n) {
            if (e[n]) return e[n].exports;
            var i = e[n] = {
                i: n,
                l: !1,
                exports: {}
            };
            return t1[n].call(i.exports, i, i.exports, s1), i.l = !0, i.exports;
        }
        return s1.m = t1, s1.c = e, s1.d = function(t1, e, n) {
            s1.o(t1, e) || Object.defineProperty(t1, e, {
                enumerable: !0,
                get: n
            });
        }, s1.r = function(t1) {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t1, Symbol.toStringTag, {
                value: "Module"
            }), Object.defineProperty(t1, "__esModule", {
                value: !0
            });
        }, s1.t = function(t1, e) {
            if (1 & e && (t1 = s1(t1)), 8 & e) return t1;
            if (4 & e && "object" == typeof t1 && t1 && t1.__esModule) return t1;
            var n = Object.create(null);
            if (s1.r(n), Object.defineProperty(n, "default", {
                enumerable: !0,
                value: t1
            }), 2 & e && "string" != typeof t1) for(var i in t1)s1.d(n, i, (function(e) {
                return t1[e];
            }).bind(null, i));
            return n;
        }, s1.n = function(t1) {
            var e = t1 && t1.__esModule ? function() {
                return t1.default;
            } : function() {
                return t1;
            };
            return s1.d(e, "a", e), e;
        }, s1.o = function(t1, e) {
            return Object.prototype.hasOwnProperty.call(t1, e);
        }, s1.p = "", s1(s1.s = 9);
    }([
        function(t1, e, s1) {
            !function(t1, e, s1, n) {
                "use strict";
                function i(t1) {
                    return t1 && "object" == typeof t1 && "default" in t1 ? t1 : {
                        default: t1
                    };
                }
                var o = i(e), r = i(s1), a = i(n), c = function(t1, e, s1) {
                    return {
                        endTime: e,
                        insertTime: s1,
                        type: "exponentialRampToValue",
                        value: t1
                    };
                }, h = function(t1, e, s1) {
                    return {
                        endTime: e,
                        insertTime: s1,
                        type: "linearRampToValue",
                        value: t1
                    };
                }, u = function(t1, e) {
                    return {
                        startTime: e,
                        type: "setValue",
                        value: t1
                    };
                }, l = function(t1, e, s1) {
                    return {
                        duration: s1,
                        startTime: e,
                        type: "setValueCurve",
                        values: t1
                    };
                }, p = function(t1, e, s1) {
                    var n = s1.startTime, i = s1.target, o = s1.timeConstant;
                    return i + (e - i) * Math.exp((n - t1) / o);
                }, d = function(t1) {
                    return "exponentialRampToValue" === t1.type;
                }, f = function(t1) {
                    return "linearRampToValue" === t1.type;
                }, _ = function(t1) {
                    return d(t1) || f(t1);
                }, m = function(t1) {
                    return "setValue" === t1.type;
                }, g = function(t1) {
                    return "setValueCurve" === t1.type;
                }, v = function t1(e, s1, n, i) {
                    var o = e[s1];
                    return void 0 === o ? i : _(o) || m(o) ? o.value : g(o) ? o.values[o.values.length - 1] : p(n, t1(e, s1 - 1, o.startTime, i), o);
                }, y = function(t1, e, s1, n, i) {
                    return void 0 === s1 ? [
                        n.insertTime,
                        i
                    ] : _(s1) ? [
                        s1.endTime,
                        s1.value
                    ] : m(s1) ? [
                        s1.startTime,
                        s1.value
                    ] : g(s1) ? [
                        s1.startTime + s1.duration,
                        s1.values[s1.values.length - 1]
                    ] : [
                        s1.startTime,
                        v(t1, e - 1, s1.startTime, i)
                    ];
                }, x = function(t1) {
                    return "cancelAndHold" === t1.type;
                }, w = function(t1) {
                    return "cancelScheduledValues" === t1.type;
                }, b = function(t1) {
                    return x(t1) || w(t1) ? t1.cancelTime : d(t1) || f(t1) ? t1.endTime : t1.startTime;
                }, T = function(t1, e, s1, n) {
                    var i = n.endTime, o = n.value;
                    return s1 === o ? o : 0 < s1 && 0 < o || s1 < 0 && o < 0 ? s1 * Math.pow(o / s1, (t1 - e) / (i - e)) : 0;
                }, S = function(t1, e, s1, n) {
                    return s1 + (t1 - e) / (n.endTime - e) * (n.value - s1);
                }, k = function(t1, e) {
                    var s1 = e.duration, n = e.startTime, i = e.values;
                    return function(t1, e) {
                        var s1 = Math.floor(e), n = Math.ceil(e);
                        return s1 === n ? t1[s1] : (1 - (e - s1)) * t1[s1] + (1 - (n - e)) * t1[n];
                    }(i, (t1 - n) / s1 * (i.length - 1));
                }, C = function(t1) {
                    return "setTarget" === t1.type;
                }, A = function() {
                    function t1(e) {
                        r.default(this, t1), this._automationEvents = [], this._currenTime = 0, this._defaultValue = e;
                    }
                    return a.default(t1, [
                        {
                            key: Symbol.iterator,
                            value: function() {
                                return this._automationEvents[Symbol.iterator]();
                            }
                        },
                        {
                            key: "add",
                            value: function(t1) {
                                var e = b(t1);
                                if (x(t1) || w(t1)) {
                                    var s1 = this._automationEvents.findIndex(function(s1) {
                                        return w(t1) && g(s1) ? s1.startTime + s1.duration >= e : b(s1) >= e;
                                    }), n = this._automationEvents[s1];
                                    if (-1 !== s1 && (this._automationEvents = this._automationEvents.slice(0, s1)), x(t1)) {
                                        var i = this._automationEvents[this._automationEvents.length - 1];
                                        if (void 0 !== n && _(n)) {
                                            if (C(i)) throw new Error("The internal list is malformed.");
                                            var o = g(i) ? i.startTime + i.duration : b(i), r = g(i) ? i.values[i.values.length - 1] : i.value, a = d(n) ? T(e, o, r, n) : S(e, o, r, n), p = d(n) ? c(a, e, this._currenTime) : h(a, e, this._currenTime);
                                            this._automationEvents.push(p);
                                        }
                                        void 0 !== i && C(i) && this._automationEvents.push(u(this.getValue(e), e)), void 0 !== i && g(i) && i.startTime + i.duration > e && (this._automationEvents[this._automationEvents.length - 1] = l(new Float32Array([
                                            6,
                                            7
                                        ]), i.startTime, e - i.startTime));
                                    }
                                } else {
                                    var m = this._automationEvents.findIndex(function(t1) {
                                        return b(t1) > e;
                                    }), v = -1 === m ? this._automationEvents[this._automationEvents.length - 1] : this._automationEvents[m - 1];
                                    if (void 0 !== v && g(v) && b(v) + v.duration > e) return !1;
                                    var y = d(t1) ? c(t1.value, t1.endTime, this._currenTime) : f(t1) ? h(t1.value, e, this._currenTime) : t1;
                                    if (-1 === m) this._automationEvents.push(y);
                                    else {
                                        if (g(t1) && e + t1.duration > b(this._automationEvents[m])) return !1;
                                        this._automationEvents.splice(m, 0, y);
                                    }
                                }
                                return !0;
                            }
                        },
                        {
                            key: "flush",
                            value: function(t1) {
                                var e = this._automationEvents.findIndex(function(e) {
                                    return b(e) > t1;
                                });
                                if (e > 1) {
                                    var s1 = this._automationEvents.slice(e - 1), n = s1[0];
                                    C(n) && s1.unshift(u(v(this._automationEvents, e - 2, n.startTime, this._defaultValue), n.startTime)), this._automationEvents = s1;
                                }
                            }
                        },
                        {
                            key: "getValue",
                            value: function(t1) {
                                if (0 === this._automationEvents.length) return this._defaultValue;
                                var e = this._automationEvents[this._automationEvents.length - 1], s1 = this._automationEvents.findIndex(function(e) {
                                    return b(e) > t1;
                                }), n = this._automationEvents[s1], i = b(e) <= t1 ? e : this._automationEvents[s1 - 1];
                                if (void 0 !== i && C(i) && (void 0 === n || !_(n) || n.insertTime > t1)) return p(t1, v(this._automationEvents, s1 - 2, i.startTime, this._defaultValue), i);
                                if (void 0 !== i && m(i) && (void 0 === n || !_(n))) return i.value;
                                if (void 0 !== i && g(i) && (void 0 === n || !_(n) || i.startTime + i.duration > t1)) return t1 < i.startTime + i.duration ? k(t1, i) : i.values[i.values.length - 1];
                                if (void 0 !== i && _(i) && (void 0 === n || !_(n))) return i.value;
                                if (void 0 !== n && d(n)) {
                                    var r = y(this._automationEvents, s1 - 1, i, n, this._defaultValue), a = o.default(r, 2), c = a[0], h = a[1];
                                    return T(t1, c, h, n);
                                }
                                if (void 0 !== n && f(n)) {
                                    var u = y(this._automationEvents, s1 - 1, i, n, this._defaultValue), l = o.default(u, 2), x = l[0], w = l[1];
                                    return S(t1, x, w, n);
                                }
                                return this._defaultValue;
                            }
                        }
                    ]), t1;
                }();
                t1.AutomationEventList = A, t1.createCancelAndHoldAutomationEvent = function(t1) {
                    return {
                        cancelTime: t1,
                        type: "cancelAndHold"
                    };
                }, t1.createCancelScheduledValuesAutomationEvent = function(t1) {
                    return {
                        cancelTime: t1,
                        type: "cancelScheduledValues"
                    };
                }, t1.createExponentialRampToValueAutomationEvent = function(t1, e) {
                    return {
                        endTime: e,
                        type: "exponentialRampToValue",
                        value: t1
                    };
                }, t1.createLinearRampToValueAutomationEvent = function(t1, e) {
                    return {
                        endTime: e,
                        type: "linearRampToValue",
                        value: t1
                    };
                }, t1.createSetTargetAutomationEvent = function(t1, e, s1) {
                    return {
                        startTime: e,
                        target: t1,
                        timeConstant: s1,
                        type: "setTarget"
                    };
                }, t1.createSetValueAutomationEvent = u, t1.createSetValueCurveAutomationEvent = l, Object.defineProperty(t1, "__esModule", {
                    value: !0
                });
            }(e, s1(1), s1(7), s1(8));
        },
        function(t1, e, s1) {
            var n = s1(2), i = s1(3), o = s1(4), r = s1(6);
            t1.exports = function(t1, e) {
                return n(t1) || i(t1, e) || o(t1, e) || r();
            };
        },
        function(t1, e) {
            t1.exports = function(t1) {
                if (Array.isArray(t1)) return t1;
            };
        },
        function(t1, e) {
            t1.exports = function(t1, e) {
                if ("undefined" != typeof Symbol && Symbol.iterator in Object(t1)) {
                    var s1 = [], n = !0, i = !1, o = void 0;
                    try {
                        for(var r, a = t1[Symbol.iterator](); !(n = (r = a.next()).done) && (s1.push(r.value), !e || s1.length !== e); n = !0);
                    } catch (t1) {
                        i = !0, o = t1;
                    } finally{
                        try {
                            n || null == a.return || a.return();
                        } finally{
                            if (i) throw o;
                        }
                    }
                    return s1;
                }
            };
        },
        function(t1, e, s1) {
            var n = s1(5);
            t1.exports = function(t1, e) {
                if (t1) {
                    if ("string" == typeof t1) return n(t1, e);
                    var s1 = Object.prototype.toString.call(t1).slice(8, -1);
                    return "Object" === s1 && t1.constructor && (s1 = t1.constructor.name), "Map" === s1 || "Set" === s1 ? Array.from(t1) : "Arguments" === s1 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(s1) ? n(t1, e) : void 0;
                }
            };
        },
        function(t1, e) {
            t1.exports = function(t1, e) {
                (null == e || e > t1.length) && (e = t1.length);
                for(var s1 = 0, n = new Array(e); s1 < e; s1++)n[s1] = t1[s1];
                return n;
            };
        },
        function(t1, e) {
            t1.exports = function() {
                throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
            };
        },
        function(t1, e) {
            t1.exports = function(t1, e) {
                if (!(t1 instanceof e)) throw new TypeError("Cannot call a class as a function");
            };
        },
        function(t1, e) {
            function s1(t1, e) {
                for(var s1 = 0; s1 < e.length; s1++){
                    var n = e[s1];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t1, n.key, n);
                }
            }
            t1.exports = function(t1, e, n) {
                return e && s1(t1.prototype, e), n && s1(t1, n), t1;
            };
        },
        function(t1, e, s1) {
            "use strict";
            s1.r(e), s1.d(e, "getContext", function() {
                return Ji;
            }), s1.d(e, "setContext", function() {
                return Ki;
            }), s1.d(e, "Clock", function() {
                return qo;
            }), s1.d(e, "Context", function() {
                return Gi;
            }), s1.d(e, "BaseContext", function() {
                return Wi;
            }), s1.d(e, "Delay", function() {
                return Fo;
            }), s1.d(e, "Gain", function() {
                return ko;
            }), s1.d(e, "Offline", function() {
                return Io;
            }), s1.d(e, "OfflineContext", function() {
                return Yi;
            }), s1.d(e, "Param", function() {
                return xo;
            }), s1.d(e, "ToneAudioBuffer", function() {
                return Xi;
            }), s1.d(e, "ToneAudioBuffers", function() {
                return Vo;
            }), s1.d(e, "ToneAudioNode", function() {
                return wo;
            }), s1.d(e, "connectSeries", function() {
                return bo;
            }), s1.d(e, "connect", function() {
                return To;
            }), s1.d(e, "disconnect", function() {
                return So;
            }), s1.d(e, "FrequencyClass", function() {
                return lo;
            }), s1.d(e, "Frequency", function() {
                return _o;
            }), s1.d(e, "MidiClass", function() {
                return No;
            }), s1.d(e, "Midi", function() {
                return Po;
            }), s1.d(e, "TimeClass", function() {
                return ho;
            }), s1.d(e, "Time", function() {
                return uo;
            }), s1.d(e, "TicksClass", function() {
                return jo;
            }), s1.d(e, "Ticks", function() {
                return Lo;
            }), s1.d(e, "TransportTimeClass", function() {
                return mo;
            }), s1.d(e, "TransportTime", function() {
                return go;
            }), s1.d(e, "Emitter", function() {
                return Bi;
            }), s1.d(e, "IntervalTimeline", function() {
                return Bo;
            }), s1.d(e, "StateTimeline", function() {
                return yo;
            }), s1.d(e, "Timeline", function() {
                return Ni;
            }), s1.d(e, "isUndef", function() {
                return ai;
            }), s1.d(e, "isDefined", function() {
                return ci;
            }), s1.d(e, "isFunction", function() {
                return hi;
            }), s1.d(e, "isNumber", function() {
                return ui;
            }), s1.d(e, "isObject", function() {
                return li;
            }), s1.d(e, "isBoolean", function() {
                return pi;
            }), s1.d(e, "isArray", function() {
                return di;
            }), s1.d(e, "isString", function() {
                return fi;
            }), s1.d(e, "isNote", function() {
                return _i;
            }), s1.d(e, "dbToGain", function() {
                return eo;
            }), s1.d(e, "gainToDb", function() {
                return so;
            }), s1.d(e, "intervalToFrequencyRatio", function() {
                return no;
            }), s1.d(e, "ftom", function() {
                return oo;
            }), s1.d(e, "mtof", function() {
                return ao;
            }), s1.d(e, "optionsFromArguments", function() {
                return Di;
            }), s1.d(e, "defaultArg", function() {
                return Oi;
            }), s1.d(e, "Unit", function() {
                return i;
            }), s1.d(e, "debug", function() {
                return n;
            }), s1.d(e, "Noise", function() {
                return Jo;
            }), s1.d(e, "UserMedia", function() {
                return er;
            }), s1.d(e, "Oscillator", function() {
                return ir;
            }), s1.d(e, "AMOscillator", function() {
                return hr;
            }), s1.d(e, "FMOscillator", function() {
                return ur;
            }), s1.d(e, "PulseOscillator", function() {
                return lr;
            }), s1.d(e, "FatOscillator", function() {
                return pr;
            }), s1.d(e, "PWMOscillator", function() {
                return dr;
            }), s1.d(e, "OmniOscillator", function() {
                return _r;
            }), s1.d(e, "ToneOscillatorNode", function() {
                return nr;
            }), s1.d(e, "LFO", function() {
                return yr;
            }), s1.d(e, "ToneBufferSource", function() {
                return $o;
            }), s1.d(e, "Player", function() {
                return br;
            }), s1.d(e, "Players", function() {
                return Tr;
            }), s1.d(e, "GrainPlayer", function() {
                return Sr;
            }), s1.d(e, "Add", function() {
                return mr;
            }), s1.d(e, "Abs", function() {
                return kr;
            }), s1.d(e, "AudioToGain", function() {
                return ar;
            }), s1.d(e, "GainToAudio", function() {
                return Cr;
            }), s1.d(e, "GreaterThan", function() {
                return Mr;
            }), s1.d(e, "GreaterThanZero", function() {
                return Or;
            }), s1.d(e, "Multiply", function() {
                return cr;
            }), s1.d(e, "Negate", function() {
                return Ar;
            }), s1.d(e, "Pow", function() {
                return Er;
            }), s1.d(e, "Signal", function() {
                return Do;
            }), s1.d(e, "connectSignal", function() {
                return Oo;
            }), s1.d(e, "Scale", function() {
                return gr;
            }), s1.d(e, "ScaleExp", function() {
                return Rr;
            }), s1.d(e, "Subtract", function() {
                return Dr;
            }), s1.d(e, "SyncedSignal", function() {
                return qr;
            }), s1.d(e, "WaveShaper", function() {
                return rr;
            }), s1.d(e, "Zero", function() {
                return vr;
            }), s1.d(e, "AMSynth", function() {
                return zr;
            }), s1.d(e, "DuoSynth", function() {
                return Qr;
            }), s1.d(e, "FMSynth", function() {
                return Zr;
            }), s1.d(e, "MetalSynth", function() {
                return Yr;
            }), s1.d(e, "MembraneSynth", function() {
                return Hr;
            }), s1.d(e, "MonoSynth", function() {
                return Ur;
            }), s1.d(e, "NoiseSynth", function() {
                return $r;
            }), s1.d(e, "PluckSynth", function() {
                return oa;
            }), s1.d(e, "PolySynth", function() {
                return ra;
            }), s1.d(e, "Sampler", function() {
                return aa;
            }), s1.d(e, "Synth", function() {
                return jr;
            }), s1.d(e, "Loop", function() {
                return ha;
            }), s1.d(e, "Part", function() {
                return ua;
            }), s1.d(e, "Pattern", function() {
                return xa;
            }), s1.d(e, "Sequence", function() {
                return wa;
            }), s1.d(e, "ToneEvent", function() {
                return ca;
            }), s1.d(e, "AutoFilter", function() {
                return ka;
            }), s1.d(e, "AutoPanner", function() {
                return Aa;
            }), s1.d(e, "AutoWah", function() {
                return Oa;
            }), s1.d(e, "BitCrusher", function() {
                return Ma;
            }), s1.d(e, "Chebyshev", function() {
                return Ra;
            }), s1.d(e, "Chorus", function() {
                return Na;
            }), s1.d(e, "Distortion", function() {
                return Pa;
            }), s1.d(e, "FeedbackDelay", function() {
                return La;
            }), s1.d(e, "FrequencyShifter", function() {
                return Ba;
            }), s1.d(e, "Freeverb", function() {
                return Ua;
            }), s1.d(e, "JCReverb", function() {
                return Ya;
            }), s1.d(e, "PingPongDelay", function() {
                return $a;
            }), s1.d(e, "PitchShift", function() {
                return Ja;
            }), s1.d(e, "Phaser", function() {
                return Ka;
            }), s1.d(e, "Reverb", function() {
                return tc;
            }), s1.d(e, "StereoWidener", function() {
                return ic;
            }), s1.d(e, "Tremolo", function() {
                return oc;
            }), s1.d(e, "Vibrato", function() {
                return rc;
            }), s1.d(e, "Analyser", function() {
                return ac;
            }), s1.d(e, "Meter", function() {
                return hc;
            }), s1.d(e, "FFT", function() {
                return uc;
            }), s1.d(e, "DCMeter", function() {
                return lc;
            }), s1.d(e, "Waveform", function() {
                return pc;
            }), s1.d(e, "Follower", function() {
                return Da;
            }), s1.d(e, "Channel", function() {
                return _c;
            }), s1.d(e, "CrossFade", function() {
                return ba;
            }), s1.d(e, "Merge", function() {
                return Fa;
            }), s1.d(e, "MidSideMerge", function() {
                return sc;
            }), s1.d(e, "MidSideSplit", function() {
                return ec;
            }), s1.d(e, "Mono", function() {
                return mc;
            }), s1.d(e, "MultibandSplit", function() {
                return gc;
            }), s1.d(e, "Panner", function() {
                return Ca;
            }), s1.d(e, "Panner3D", function() {
                return yc;
            }), s1.d(e, "PanVol", function() {
                return fc;
            }), s1.d(e, "Recorder", function() {
                return xc;
            }), s1.d(e, "Solo", function() {
                return dc;
            }), s1.d(e, "Split", function() {
                return qa;
            }), s1.d(e, "Volume", function() {
                return Go;
            }), s1.d(e, "Compressor", function() {
                return wc;
            }), s1.d(e, "Gate", function() {
                return bc;
            }), s1.d(e, "Limiter", function() {
                return Tc;
            }), s1.d(e, "MidSideCompressor", function() {
                return Sc;
            }), s1.d(e, "MultibandCompressor", function() {
                return kc;
            }), s1.d(e, "AmplitudeEnvelope", function() {
                return Pr;
            }), s1.d(e, "Envelope", function() {
                return Fr;
            }), s1.d(e, "FrequencyEnvelope", function() {
                return Gr;
            }), s1.d(e, "EQ3", function() {
                return Cc;
            }), s1.d(e, "Filter", function() {
                return Wr;
            }), s1.d(e, "OnePoleFilter", function() {
                return na;
            }), s1.d(e, "FeedbackCombFilter", function() {
                return sa;
            }), s1.d(e, "LowpassCombFilter", function() {
                return ia;
            }), s1.d(e, "Convolver", function() {
                return Ac;
            }), s1.d(e, "BiquadFilter", function() {
                return Br;
            }), s1.d(e, "version", function() {
                return o;
            }), s1.d(e, "start", function() {
                return to;
            }), s1.d(e, "supported", function() {
                return Kn;
            }), s1.d(e, "now", function() {
                return Dc;
            }), s1.d(e, "immediate", function() {
                return Oc;
            }), s1.d(e, "Transport", function() {
                return Mc;
            }), s1.d(e, "getTransport", function() {
                return Ec;
            }), s1.d(e, "Destination", function() {
                return Rc;
            }), s1.d(e, "Master", function() {
                return qc;
            }), s1.d(e, "getDestination", function() {
                return Fc;
            }), s1.d(e, "Listener", function() {
                return Ic;
            }), s1.d(e, "getListener", function() {
                return Vc;
            }), s1.d(e, "Draw", function() {
                return Nc;
            }), s1.d(e, "getDraw", function() {
                return Pc;
            }), s1.d(e, "context", function() {
                return jc;
            }), s1.d(e, "loaded", function() {
                return Lc;
            }), s1.d(e, "Buffer", function() {
                return zc;
            }), s1.d(e, "Buffers", function() {
                return Bc;
            }), s1.d(e, "BufferSource", function() {
                return Wc;
            });
            var n = {};
            s1.r(n), s1.d(n, "assert", function() {
                return ti;
            }), s1.d(n, "assertRange", function() {
                return ei;
            }), s1.d(n, "assertContextRunning", function() {
                return si;
            }), s1.d(n, "setLogger", function() {
                return ii;
            }), s1.d(n, "log", function() {
                return oi;
            }), s1.d(n, "warn", function() {
                return ri;
            });
            var i = {};
            s1.r(i);
            const o = "14.7.77";
            var r = s1(0);
            const a = new WeakSet, c = new WeakMap, h = new WeakMap, u = new WeakMap, l = new WeakMap, p = new WeakMap, d = new WeakMap, f = new WeakMap, _ = new WeakMap, m = new WeakMap, g = {
                construct: ()=>g
            }, v = /^import(?:(?:[\s]+[\w]+|(?:[\s]+[\w]+[\s]*,)?[\s]*\{[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?(?:[\s]*,[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?)*[\s]*}|(?:[\s]+[\w]+[\s]*,)?[\s]*\*[\s]+as[\s]+[\w]+)[\s]+from)?(?:[\s]*)("([^"\\]|\\.)+"|'([^'\\]|\\.)+')(?:[\s]*);?/, y = (t1, e)=>{
                const s1 = [];
                let n = t1.replace(/^[\s]+/, ""), i = n.match(v);
                for(; null !== i;){
                    const t1 = i[1].slice(1, -1), o = i[0].replace(/([\s]+)?;?$/, "").replace(t1, new URL(t1, e).toString());
                    s1.push(o), n = n.slice(i[0].length).replace(/^[\s]+/, ""), i = n.match(v);
                }
                return [
                    s1.join(";"),
                    n
                ];
            }, x = (t1)=>{
                if (void 0 !== t1 && !Array.isArray(t1)) throw new TypeError("The parameterDescriptors property of given value for processorCtor is not an array.");
            }, w = (t1)=>{
                if (!((t1)=>{
                    try {
                        new new Proxy(t1, g);
                    } catch  {
                        return !1;
                    }
                    return !0;
                })(t1)) throw new TypeError("The given value for processorCtor should be a constructor.");
                if (null === t1.prototype || "object" != typeof t1.prototype) throw new TypeError("The given value for processorCtor should have a prototype.");
            }, b = (t1, e)=>{
                const s1 = t1.get(e);
                if (void 0 === s1) throw new Error("A value with the given key could not be found.");
                return s1;
            }, T = (t1, e)=>{
                const s1 = Array.from(t1).filter(e);
                if (s1.length > 1) throw Error("More than one element was found.");
                if (0 === s1.length) throw Error("No element was found.");
                const [n] = s1;
                return t1.delete(n), n;
            }, S = (t1, e, s1, n)=>{
                const i = b(t1, e), o = T(i, (t1)=>t1[0] === s1 && t1[1] === n);
                return 0 === i.size && t1.delete(e), o;
            }, k = (t1)=>b(d, t1), C = (t1)=>{
                if (a.has(t1)) throw new Error("The AudioNode is already stored.");
                a.add(t1), k(t1).forEach((t1)=>t1(!0));
            }, A = (t1)=>"port" in t1, D = (t1)=>{
                if (!a.has(t1)) throw new Error("The AudioNode is not stored.");
                a.delete(t1), k(t1).forEach((t1)=>t1(!1));
            }, O = (t1, e)=>{
                !A(t1) && e.every((t1)=>0 === t1.size) && D(t1);
            }, M = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                fftSize: 2048,
                maxDecibels: -30,
                minDecibels: -100,
                smoothingTimeConstant: .8
            }, E = (t1, e)=>t1.context === e, R = (t1)=>{
                try {
                    t1.copyToChannel(new Float32Array(1), 0, -1);
                } catch  {
                    return !1;
                }
                return !0;
            }, q = ()=>new DOMException("", "IndexSizeError"), F = (t1)=>{
                var e;
                t1.getChannelData = (e = t1.getChannelData, (s1)=>{
                    try {
                        return e.call(t1, s1);
                    } catch (t1) {
                        if (12 === t1.code) throw q();
                        throw t1;
                    }
                });
            }, I = {
                numberOfChannels: 1
            }, V = -340282346638528860000000000000000000000, N = -V, P = (t1)=>a.has(t1), j = {
                buffer: null,
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                loop: !1,
                loopEnd: 0,
                loopStart: 0,
                playbackRate: 1
            }, L = (t1)=>b(c, t1), z = (t1)=>b(u, t1), B = (t1, e)=>{
                const { activeInputs: s1 } = L(t1);
                s1.forEach((s1)=>s1.forEach(([s1])=>{
                        e.includes(t1) || B(s1, [
                            ...e,
                            t1
                        ]);
                    }));
                const n = ((t1)=>"playbackRate" in t1)(t1) ? [
                    t1.playbackRate
                ] : A(t1) ? Array.from(t1.parameters.values()) : ((t1)=>"frequency" in t1 && "gain" in t1)(t1) ? [
                    t1.Q,
                    t1.detune,
                    t1.frequency,
                    t1.gain
                ] : ((t1)=>"offset" in t1)(t1) ? [
                    t1.offset
                ] : ((t1)=>!("frequency" in t1) && "gain" in t1)(t1) ? [
                    t1.gain
                ] : ((t1)=>"detune" in t1 && "frequency" in t1)(t1) ? [
                    t1.detune,
                    t1.frequency
                ] : ((t1)=>"pan" in t1)(t1) ? [
                    t1.pan
                ] : [];
                for (const t1 of n){
                    const s1 = z(t1);
                    void 0 !== s1 && s1.activeInputs.forEach(([t1])=>B(t1, e));
                }
                P(t1) && D(t1);
            }, W = (t1)=>{
                B(t1.destination, []);
            }, G = (t1)=>void 0 === t1 || "number" == typeof t1 || "string" == typeof t1 && ("balanced" === t1 || "interactive" === t1 || "playback" === t1), U = (t1)=>"context" in t1, Q = (t1)=>U(t1[0]), Z = (t1, e, s1, n)=>{
                for (const e of t1)if (s1(e)) {
                    if (n) return !1;
                    throw Error("The set contains at least one similar element.");
                }
                return t1.add(e), !0;
            }, X = (t1, e, [s1, n], i)=>{
                Z(t1, [
                    e,
                    s1,
                    n
                ], (t1)=>t1[0] === e && t1[1] === s1, i);
            }, Y = (t1, [e, s1, n], i)=>{
                const o = t1.get(e);
                void 0 === o ? t1.set(e, new Set([
                    [
                        s1,
                        n
                    ]
                ])) : Z(o, [
                    s1,
                    n
                ], (t1)=>t1[0] === s1, i);
            }, H = (t1)=>"inputs" in t1, $ = (t1, e, s1, n)=>{
                if (H(e)) {
                    const i = e.inputs[n];
                    return t1.connect(i, s1, 0), [
                        i,
                        s1,
                        0
                    ];
                }
                return t1.connect(e, s1, n), [
                    e,
                    s1,
                    n
                ];
            }, J = (t1, e, s1)=>{
                for (const n of t1)if (n[0] === e && n[1] === s1) return t1.delete(n), n;
                return null;
            }, K = (t1, e)=>{
                if (!k(t1).delete(e)) throw new Error("Missing the expected event listener.");
            }, tt = (t1, e, s1)=>{
                const n = b(t1, e), i = T(n, (t1)=>t1[0] === s1);
                return 0 === n.size && t1.delete(e), i;
            }, et = (t1, e, s1, n)=>{
                H(e) ? t1.disconnect(e.inputs[n], s1, 0) : t1.disconnect(e, s1, n);
            }, st = (t1)=>b(h, t1), nt = (t1)=>b(l, t1), it = (t1)=>f.has(t1), ot = (t1)=>!a.has(t1), rt = (t1)=>new Promise((e)=>{
                    const s1 = t1.createScriptProcessor(256, 1, 1), n = t1.createGain(), i = t1.createBuffer(1, 2, 44100), o = i.getChannelData(0);
                    o[0] = 1, o[1] = 1;
                    const r = t1.createBufferSource();
                    r.buffer = i, r.loop = !0, r.connect(s1).connect(t1.destination), r.connect(n), r.disconnect(n), s1.onaudioprocess = (n)=>{
                        const i = n.inputBuffer.getChannelData(0);
                        Array.prototype.some.call(i, (t1)=>1 === t1) ? e(!0) : e(!1), r.stop(), s1.onaudioprocess = null, r.disconnect(s1), s1.disconnect(t1.destination);
                    }, r.start();
                }), at = (t1, e)=>{
                const s1 = new Map;
                for (const e of t1)for (const t1 of e){
                    const e = s1.get(t1);
                    s1.set(t1, void 0 === e ? 1 : e + 1);
                }
                s1.forEach((t1, s1)=>e(s1, t1));
            }, ct = (t1)=>"context" in t1, ht = (t1, e, s1, n)=>{
                const { activeInputs: i, passiveInputs: o } = z(e), { outputs: r } = L(t1), a = k(t1), c = (r)=>{
                    const a = st(t1), c = nt(e);
                    if (r) {
                        const e = tt(o, t1, s1);
                        X(i, t1, e, !1), n || it(t1) || a.connect(c, s1);
                    } else {
                        const e = ((t1, e, s1)=>T(t1, (t1)=>t1[0] === e && t1[1] === s1))(i, t1, s1);
                        Y(o, e, !1), n || it(t1) || a.disconnect(c, s1);
                    }
                };
                return !!Z(r, [
                    e,
                    s1
                ], (t1)=>t1[0] === e && t1[1] === s1, !0) && (a.add(c), P(t1) ? X(i, t1, [
                    s1,
                    c
                ], !0) : Y(o, [
                    t1,
                    s1,
                    c
                ], !0), !0);
            }, ut = (t1, e, s1, n, i)=>{
                const [o, r] = ((t1, e, s1, n)=>{
                    const { activeInputs: i, passiveInputs: o } = L(e), r = J(i[n], t1, s1);
                    if (null === r) return [
                        S(o, t1, s1, n)[2],
                        !1
                    ];
                    return [
                        r[2],
                        !0
                    ];
                })(t1, s1, n, i);
                if (null !== o && (K(t1, o), !r || e || it(t1) || et(st(t1), st(s1), n, i)), P(s1)) {
                    const { activeInputs: t1 } = L(s1);
                    O(s1, t1);
                }
            }, lt = (t1, e, s1, n)=>{
                const [i, o] = ((t1, e, s1)=>{
                    const { activeInputs: n, passiveInputs: i } = z(e), o = J(n, t1, s1);
                    if (null === o) return [
                        tt(i, t1, s1)[1],
                        !1
                    ];
                    return [
                        o[2],
                        !0
                    ];
                })(t1, s1, n);
                null !== i && (K(t1, i), !o || e || it(t1) || st(t1).disconnect(nt(s1), n));
            };
            class pt {
                constructor(t1){
                    this._map = new Map(t1);
                }
                get size() {
                    return this._map.size;
                }
                entries() {
                    return this._map.entries();
                }
                forEach(t1, e = null) {
                    return this._map.forEach((s1, n)=>t1.call(e, s1, n, this));
                }
                get(t1) {
                    return this._map.get(t1);
                }
                has(t1) {
                    return this._map.has(t1);
                }
                keys() {
                    return this._map.keys();
                }
                values() {
                    return this._map.values();
                }
            }
            const dt = {
                channelCount: 2,
                channelCountMode: "explicit",
                channelInterpretation: "speakers",
                numberOfInputs: 1,
                numberOfOutputs: 1,
                parameterData: {},
                processorOptions: {}
            };
            function ft(t1, e, s1, n, i) {
                if ("function" == typeof t1.copyFromChannel) 0 === e[s1].byteLength && (e[s1] = new Float32Array(128)), t1.copyFromChannel(e[s1], n, i);
                else {
                    const o = t1.getChannelData(n);
                    if (0 === e[s1].byteLength) e[s1] = o.slice(i, i + 128);
                    else {
                        const t1 = new Float32Array(o.buffer, i * Float32Array.BYTES_PER_ELEMENT, 128);
                        e[s1].set(t1);
                    }
                }
            }
            const _t = (t1, e, s1, n, i)=>{
                "function" == typeof t1.copyToChannel ? 0 !== e[s1].byteLength && t1.copyToChannel(e[s1], n, i) : 0 !== e[s1].byteLength && t1.getChannelData(n).set(e[s1], i);
            }, mt = (t1, e)=>{
                const s1 = [];
                for(let n = 0; n < t1; n += 1){
                    const t1 = [], i = "number" == typeof e ? e : e[n];
                    for(let e = 0; e < i; e += 1)t1.push(new Float32Array(128));
                    s1.push(t1);
                }
                return s1;
            }, gt = async (t1, e, s1, n, i, o, r)=>{
                const a = null === e ? 128 * Math.ceil(t1.context.length / 128) : e.length, c = n.channelCount * n.numberOfInputs, h = i.reduce((t1, e)=>t1 + e, 0), u = 0 === h ? null : s1.createBuffer(h, a, s1.sampleRate);
                if (void 0 === o) throw new Error("Missing the processor constructor.");
                const l = L(t1), p = await ((t1, e)=>{
                    const s1 = b(m, t1), n = st(e);
                    return b(s1, n);
                })(s1, t1), d = mt(n.numberOfInputs, n.channelCount), f = mt(n.numberOfOutputs, i), _ = Array.from(t1.parameters.keys()).reduce((t1, e)=>({
                        ...t1,
                        [e]: new Float32Array(128)
                    }), {});
                for(let h = 0; h < a; h += 128){
                    if (n.numberOfInputs > 0 && null !== e) for(let t1 = 0; t1 < n.numberOfInputs; t1 += 1)for(let s1 = 0; s1 < n.channelCount; s1 += 1)ft(e, d[t1], s1, s1, h);
                    void 0 !== o.parameterDescriptors && null !== e && o.parameterDescriptors.forEach(({ name: t1 }, s1)=>{
                        ft(e, _, t1, c + s1, h);
                    });
                    for(let t1 = 0; t1 < n.numberOfInputs; t1 += 1)for(let e = 0; e < i[t1]; e += 1)0 === f[t1][e].byteLength && (f[t1][e] = new Float32Array(128));
                    try {
                        const t1 = d.map((t1, e)=>0 === l.activeInputs[e].size ? [] : t1), e = r(h / s1.sampleRate, s1.sampleRate, ()=>p.process(t1, f, _));
                        if (null !== u) for(let t1 = 0, e = 0; t1 < n.numberOfOutputs; t1 += 1){
                            for(let s1 = 0; s1 < i[t1]; s1 += 1)_t(u, f[t1], s1, e + s1, h);
                            e += i[t1];
                        }
                        if (!e) break;
                    } catch (e) {
                        t1.dispatchEvent(new ErrorEvent("processorerror", {
                            colno: e.colno,
                            filename: e.filename,
                            lineno: e.lineno,
                            message: e.message
                        }));
                        break;
                    }
                }
                return u;
            }, vt = {
                Q: 1,
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                detune: 0,
                frequency: 350,
                gain: 0,
                type: "lowpass"
            }, yt = {
                channelCount: 1,
                channelCountMode: "explicit",
                channelInterpretation: "speakers",
                numberOfInputs: 6
            }, xt = {
                channelCount: 6,
                channelCountMode: "explicit",
                channelInterpretation: "discrete",
                numberOfOutputs: 6
            }, wt = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                offset: 1
            }, bt = {
                buffer: null,
                channelCount: 2,
                channelCountMode: "clamped-max",
                channelInterpretation: "speakers",
                disableNormalization: !1
            }, Tt = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                delayTime: 0,
                maxDelayTime: 1
            }, St = (t1, e, s1)=>{
                const n = e[s1];
                if (void 0 === n) throw t1();
                return n;
            }, kt = {
                attack: .003,
                channelCount: 2,
                channelCountMode: "clamped-max",
                channelInterpretation: "speakers",
                knee: 30,
                ratio: 12,
                release: .25,
                threshold: -24
            }, Ct = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                gain: 1
            }, At = ()=>new DOMException("", "InvalidStateError"), Dt = ()=>new DOMException("", "InvalidAccessError"), Ot = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers"
            }, Mt = (t1, e, s1, n, i, o, r, a, c, h, u)=>{
                const l = h.length;
                let p = a;
                for(let a = 0; a < l; a += 1){
                    let l = s1[0] * h[a];
                    for(let e = 1; e < i; e += 1){
                        const n = p - e & c - 1;
                        l += s1[e] * o[n], l -= t1[e] * r[n];
                    }
                    for(let t1 = i; t1 < n; t1 += 1)l += s1[t1] * o[p - t1 & c - 1];
                    for(let s1 = i; s1 < e; s1 += 1)l -= t1[s1] * r[p - s1 & c - 1];
                    o[p] = h[a], r[p] = l, p = p + 1 & c - 1, u[a] = l;
                }
                return p;
            }, Et = {
                channelCount: 2,
                channelCountMode: "explicit",
                channelInterpretation: "speakers"
            }, Rt = (t1)=>{
                const e = new Uint32Array([
                    1179011410,
                    40,
                    1163280727,
                    544501094,
                    16,
                    131073,
                    44100,
                    176400,
                    1048580,
                    1635017060,
                    4,
                    0
                ]);
                try {
                    const s1 = t1.decodeAudioData(e.buffer, ()=>{});
                    return void 0 !== s1 && (s1.catch(()=>{}), !0);
                } catch  {}
                return !1;
            }, qt = {
                numberOfChannels: 1
            }, Ft = (t1, e, s1)=>{
                const n = e[s1];
                void 0 !== n && n !== t1[s1] && (t1[s1] = n);
            }, It = (t1, e)=>{
                Ft(t1, e, "channelCount"), Ft(t1, e, "channelCountMode"), Ft(t1, e, "channelInterpretation");
            }, Vt = (t1)=>"function" == typeof t1.getFloatTimeDomainData, Nt = (t1, e, s1)=>{
                const n = e[s1];
                void 0 !== n && n !== t1[s1].value && (t1[s1].value = n);
            }, Pt = (t1)=>{
                var e;
                t1.start = (e = t1.start, (s1 = 0, n = 0, i)=>{
                    if ("number" == typeof i && i < 0 || n < 0 || s1 < 0) throw new RangeError("The parameters can't be negative.");
                    e.call(t1, s1, n, i);
                });
            }, jt = (t1)=>{
                var e;
                t1.stop = (e = t1.stop, (s1 = 0)=>{
                    if (s1 < 0) throw new RangeError("The parameter can't be negative.");
                    e.call(t1, s1);
                });
            }, Lt = (t1, e)=>null === t1 ? 512 : Math.max(512, Math.min(16384, Math.pow(2, Math.round(Math.log2(t1 * e))))), zt = async (t1, e)=>new t1(await ((t1)=>new Promise((e, s1)=>{
                        const { port1: n, port2: i } = new MessageChannel;
                        n.onmessage = ({ data: t1 })=>{
                            n.close(), i.close(), e(t1);
                        }, n.onmessageerror = ({ data: t1 })=>{
                            n.close(), i.close(), s1(t1);
                        }, i.postMessage(t1);
                    }))(e)), Bt = (t1, e)=>{
                const s1 = t1.createBiquadFilter();
                return It(s1, e), Nt(s1, e, "Q"), Nt(s1, e, "detune"), Nt(s1, e, "frequency"), Nt(s1, e, "gain"), Ft(s1, e, "type"), s1;
            }, Wt = (t1, e)=>{
                const s1 = t1.createChannelSplitter(e.numberOfOutputs);
                return It(s1, e), ((t1)=>{
                    const e = t1.numberOfOutputs;
                    Object.defineProperty(t1, "channelCount", {
                        get: ()=>e,
                        set: (t1)=>{
                            if (t1 !== e) throw At();
                        }
                    }), Object.defineProperty(t1, "channelCountMode", {
                        get: ()=>"explicit",
                        set: (t1)=>{
                            if ("explicit" !== t1) throw At();
                        }
                    }), Object.defineProperty(t1, "channelInterpretation", {
                        get: ()=>"discrete",
                        set: (t1)=>{
                            if ("discrete" !== t1) throw At();
                        }
                    });
                })(s1), s1;
            }, Gt = (t1, e)=>(t1.connect = e.connect.bind(e), t1.disconnect = e.disconnect.bind(e), t1), Ut = (t1, e)=>{
                const s1 = t1.createDelay(e.maxDelayTime);
                return It(s1, e), Nt(s1, e, "delayTime"), s1;
            }, Qt = (t1, e)=>{
                const s1 = t1.createGain();
                return It(s1, e), Nt(s1, e, "gain"), s1;
            };
            function Zt(t1, e) {
                const s1 = e[0] * e[0] + e[1] * e[1];
                return [
                    (t1[0] * e[0] + t1[1] * e[1]) / s1,
                    (t1[1] * e[0] - t1[0] * e[1]) / s1
                ];
            }
            function Xt(t1, e) {
                let s1 = [
                    0,
                    0
                ];
                for(let o = t1.length - 1; o >= 0; o -= 1)i = e, s1 = [
                    (n = s1)[0] * i[0] - n[1] * i[1],
                    n[0] * i[1] + n[1] * i[0]
                ], s1[0] += t1[o];
                var n, i;
                return s1;
            }
            const Yt = (t1, e, s1, n)=>t1.createScriptProcessor(e, s1, n), Ht = ()=>new DOMException("", "NotSupportedError"), $t = {
                numberOfChannels: 1
            }, Jt = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                detune: 0,
                frequency: 440,
                periodicWave: void 0,
                type: "sine"
            }, Kt = {
                channelCount: 2,
                channelCountMode: "clamped-max",
                channelInterpretation: "speakers",
                coneInnerAngle: 360,
                coneOuterAngle: 360,
                coneOuterGain: 0,
                distanceModel: "inverse",
                maxDistance: 1e4,
                orientationX: 1,
                orientationY: 0,
                orientationZ: 0,
                panningModel: "equalpower",
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                refDistance: 1,
                rolloffFactor: 1
            }, te = {
                disableNormalization: !1
            }, ee = {
                channelCount: 2,
                channelCountMode: "explicit",
                channelInterpretation: "speakers",
                pan: 0
            }, se = ()=>new DOMException("", "UnknownError"), ne = {
                channelCount: 2,
                channelCountMode: "max",
                channelInterpretation: "speakers",
                curve: null,
                oversample: "none"
            }, ie = (t1)=>{
                if (null === t1) return !1;
                const e = t1.length;
                return e % 2 != 0 ? 0 !== t1[Math.floor(e / 2)] : t1[e / 2 - 1] + t1[e / 2] !== 0;
            }, oe = (t1, e, s1, n)=>{
                let i = Object.getPrototypeOf(t1);
                for(; !i.hasOwnProperty(e);)i = Object.getPrototypeOf(i);
                const { get: o, set: r } = Object.getOwnPropertyDescriptor(i, e);
                Object.defineProperty(t1, e, {
                    get: s1(o),
                    set: n(r)
                });
            }, re = (t1, e, s1)=>{
                try {
                    t1.setValueAtTime(e, s1);
                } catch (n) {
                    if (9 !== n.code) throw n;
                    re(t1, e, s1 + 1e-7);
                }
            }, ae = (t1)=>{
                const e = t1.createOscillator();
                try {
                    e.start(-1);
                } catch (t1) {
                    return t1 instanceof RangeError;
                }
                return !1;
            }, ce = (t1)=>{
                const e = t1.createBuffer(1, 1, 44100), s1 = t1.createBufferSource();
                s1.buffer = e, s1.start(), s1.stop();
                try {
                    return s1.stop(), !0;
                } catch  {
                    return !1;
                }
            }, he = (t1)=>{
                const e = t1.createOscillator();
                try {
                    e.stop(-1);
                } catch (t1) {
                    return t1 instanceof RangeError;
                }
                return !1;
            }, ue = ()=>{
                try {
                    new DOMException;
                } catch  {
                    return !1;
                }
                return !0;
            }, le = ()=>new Promise((t1)=>{
                    const e = new ArrayBuffer(0), { port1: s1, port2: n } = new MessageChannel;
                    s1.onmessage = ({ data: e })=>t1(null !== e), n.postMessage(e, [
                        e
                    ]);
                }), pe = (t1, e)=>{
                const s1 = e.createGain();
                t1.connect(s1);
                const n = (i = t1.disconnect, ()=>{
                    i.call(t1, s1), t1.removeEventListener("ended", n);
                });
                var i;
                t1.addEventListener("ended", n), Gt(t1, s1), t1.stop = ((e)=>{
                    let n = !1;
                    return (i = 0)=>{
                        if (n) try {
                            e.call(t1, i);
                        } catch  {
                            s1.gain.setValueAtTime(0, i);
                        }
                        else e.call(t1, i), n = !0;
                    };
                })(t1.stop);
            }, de = (t1, e)=>(s1)=>{
                    const n = {
                        value: t1
                    };
                    return Object.defineProperties(s1, {
                        currentTarget: n,
                        target: n
                    }), "function" == typeof e ? e.call(t1, s1) : e.handleEvent.call(t1, s1);
                }, fe = (_e = Z, (t1, e, [s1, n, i], o)=>{
                _e(t1[n], [
                    e,
                    s1,
                    i
                ], (t1)=>t1[0] === e && t1[1] === s1, o);
            });
            var _e;
            const me = ((t1)=>(e, s1, [n, i, o], r)=>{
                    const a = e.get(n);
                    void 0 === a ? e.set(n, new Set([
                        [
                            i,
                            s1,
                            o
                        ]
                    ])) : t1(a, [
                        i,
                        s1,
                        o
                    ], (t1)=>t1[0] === i && t1[1] === s1, r);
                })(Z), ge = ((t1)=>(e, s1, n, i)=>t1(e[i], (t1)=>t1[0] === s1 && t1[1] === n))(T), ve = new WeakMap, ye = ((t1)=>(e)=>{
                    var s1;
                    return null !== (s1 = t1.get(e)) && void 0 !== s1 ? s1 : 0;
                })(ve), xe = (we = new Map, be = new WeakMap, (t1, e)=>{
                const s1 = be.get(t1);
                if (void 0 !== s1) return s1;
                const n = we.get(t1);
                if (void 0 !== n) return n;
                try {
                    const s1 = e();
                    return s1 instanceof Promise ? (we.set(t1, s1), s1.catch(()=>!1).then((e)=>(we.delete(t1), be.set(t1, e), e))) : (be.set(t1, s1), s1);
                } catch  {
                    return be.set(t1, !1), !1;
                }
            });
            var we, be;
            const Te = "undefined" == typeof window ? null : window, Se = (ke = xe, Ce = q, (t1, e)=>{
                const s1 = t1.createAnalyser();
                if (It(s1, e), !(e.maxDecibels > e.minDecibels)) throw Ce();
                return Ft(s1, e, "fftSize"), Ft(s1, e, "maxDecibels"), Ft(s1, e, "minDecibels"), Ft(s1, e, "smoothingTimeConstant"), ke(Vt, ()=>Vt(s1)) || ((t1)=>{
                    t1.getFloatTimeDomainData = (e)=>{
                        const s1 = new Uint8Array(e.length);
                        t1.getByteTimeDomainData(s1);
                        const n = Math.max(s1.length, t1.fftSize);
                        for(let t1 = 0; t1 < n; t1 += 1)e[t1] = .0078125 * (s1[t1] - 128);
                        return e;
                    };
                })(s1), s1;
            });
            var ke, Ce;
            const Ae = (De = L, (t1)=>{
                const e = De(t1);
                if (null === e.renderer) throw new Error("Missing the renderer of the given AudioNode in the audio graph.");
                return e.renderer;
            });
            var De;
            const Oe = ((t1, e, s1)=>async (n, i, o, r)=>{
                    const a = t1(n), c = [
                        ...r,
                        n
                    ];
                    await Promise.all(a.activeInputs.map((t1, r)=>Array.from(t1).filter(([t1])=>!c.includes(t1)).map(async ([t1, a])=>{
                            const h = e(t1), u = await h.render(t1, i, c), l = n.context.destination;
                            s1(t1) || n === l && s1(n) || u.connect(o, a, r);
                        })).reduce((t1, e)=>[
                            ...t1,
                            ...e
                        ], []));
                })(L, Ae, it), Me = (Ee = Se, Re = st, qe = Oe, ()=>{
                const t1 = new WeakMap;
                return {
                    render (e, s1, n) {
                        const i = t1.get(s1);
                        return void 0 !== i ? Promise.resolve(i) : (async (e, s1, n)=>{
                            let i = Re(e);
                            if (!E(i, s1)) {
                                const t1 = {
                                    channelCount: i.channelCount,
                                    channelCountMode: i.channelCountMode,
                                    channelInterpretation: i.channelInterpretation,
                                    fftSize: i.fftSize,
                                    maxDecibels: i.maxDecibels,
                                    minDecibels: i.minDecibels,
                                    smoothingTimeConstant: i.smoothingTimeConstant
                                };
                                i = Ee(s1, t1);
                            }
                            return t1.set(s1, i), await qe(e, s1, i, n), i;
                        })(e, s1, n);
                    }
                };
            });
            var Ee, Re, qe;
            const Fe = (Ie = p, (t1)=>{
                const e = Ie.get(t1);
                if (void 0 === e) throw At();
                return e;
            });
            var Ie;
            const Ve = ((t1)=>null === t1 ? null : t1.hasOwnProperty("OfflineAudioContext") ? t1.OfflineAudioContext : t1.hasOwnProperty("webkitOfflineAudioContext") ? t1.webkitOfflineAudioContext : null)(Te), Ne = (Pe = Ve, (t1)=>null !== Pe && t1 instanceof Pe);
            var Pe;
            const je = new WeakMap, Le = (ze = de, class {
                constructor(t1){
                    this._nativeEventTarget = t1, this._listeners = new WeakMap;
                }
                addEventListener(t1, e, s1) {
                    if (null !== e) {
                        let n = this._listeners.get(e);
                        void 0 === n && (n = ze(this, e), "function" == typeof e && this._listeners.set(e, n)), this._nativeEventTarget.addEventListener(t1, n, s1);
                    }
                }
                dispatchEvent(t1) {
                    return this._nativeEventTarget.dispatchEvent(t1);
                }
                removeEventListener(t1, e, s1) {
                    const n = null === e ? void 0 : this._listeners.get(e);
                    this._nativeEventTarget.removeEventListener(t1, void 0 === n ? null : n, s1);
                }
            });
            var ze;
            const Be = ((t1)=>null === t1 ? null : t1.hasOwnProperty("AudioContext") ? t1.AudioContext : t1.hasOwnProperty("webkitAudioContext") ? t1.webkitAudioContext : null)(Te), We = (Ge = Be, (t1)=>null !== Ge && t1 instanceof Ge);
            var Ge;
            const Ue = ((t1)=>(e)=>null !== t1 && "function" == typeof t1.AudioNode && e instanceof t1.AudioNode)(Te), Qe = ((t1)=>(e)=>null !== t1 && "function" == typeof t1.AudioParam && e instanceof t1.AudioParam)(Te), Ze = ((t1, e, s1, n, i, o, r, a, c, u, l, p, f, _, m)=>class extends u {
                    constructor(e, n, i, o){
                        super(i), this._context = e, this._nativeAudioNode = i;
                        const r = l(e);
                        p(r) && !0 !== s1(rt, ()=>rt(r)) && ((t1)=>{
                            const e = new Map;
                            var s1, n;
                            t1.connect = (s1 = t1.connect.bind(t1), (t1, n = 0, i = 0)=>{
                                const o = ct(t1) ? s1(t1, n, i) : s1(t1, n), r = e.get(t1);
                                return void 0 === r ? e.set(t1, [
                                    {
                                        input: i,
                                        output: n
                                    }
                                ]) : r.every((t1)=>t1.input !== i || t1.output !== n) && r.push({
                                    input: i,
                                    output: n
                                }), o;
                            }), t1.disconnect = (n = t1.disconnect, (s1, i, o)=>{
                                if (n.apply(t1), void 0 === s1) e.clear();
                                else if ("number" == typeof s1) for (const [t1, n] of e){
                                    const i = n.filter((t1)=>t1.output !== s1);
                                    0 === i.length ? e.delete(t1) : e.set(t1, i);
                                }
                                else if (e.has(s1)) {
                                    if (void 0 === i) e.delete(s1);
                                    else {
                                        const t1 = e.get(s1);
                                        if (void 0 !== t1) {
                                            const n = t1.filter((t1)=>t1.output !== i && (t1.input !== o || void 0 === o));
                                            0 === n.length ? e.delete(s1) : e.set(s1, n);
                                        }
                                    }
                                }
                                for (const [s1, n] of e)n.forEach((e)=>{
                                    ct(s1) ? t1.connect(s1, e.output, e.input) : t1.connect(s1, e.output);
                                });
                            });
                        })(i), h.set(this, i), d.set(this, new Set), "closed" !== e.state && n && C(this), t1(this, o, i);
                    }
                    get channelCount() {
                        return this._nativeAudioNode.channelCount;
                    }
                    set channelCount(t1) {
                        this._nativeAudioNode.channelCount = t1;
                    }
                    get channelCountMode() {
                        return this._nativeAudioNode.channelCountMode;
                    }
                    set channelCountMode(t1) {
                        this._nativeAudioNode.channelCountMode = t1;
                    }
                    get channelInterpretation() {
                        return this._nativeAudioNode.channelInterpretation;
                    }
                    set channelInterpretation(t1) {
                        this._nativeAudioNode.channelInterpretation = t1;
                    }
                    get context() {
                        return this._context;
                    }
                    get numberOfInputs() {
                        return this._nativeAudioNode.numberOfInputs;
                    }
                    get numberOfOutputs() {
                        return this._nativeAudioNode.numberOfOutputs;
                    }
                    connect(t1, s1 = 0, a = 0) {
                        if (s1 < 0 || s1 >= this._nativeAudioNode.numberOfOutputs) throw i();
                        const h = l(this._context), u = m(h);
                        if (f(t1) || _(t1)) throw o();
                        if (U(t1)) {
                            const i = st(t1);
                            try {
                                const e = $(this._nativeAudioNode, i, s1, a), n = ot(this);
                                (u || n) && this._nativeAudioNode.disconnect(...e), "closed" !== this.context.state && !n && ot(t1) && C(t1);
                            } catch (t1) {
                                if (12 === t1.code) throw o();
                                throw t1;
                            }
                            if (e(this, t1, s1, a, u)) {
                                const e = c([
                                    this
                                ], t1);
                                at(e, n(u));
                            }
                            return t1;
                        }
                        const p = nt(t1);
                        if ("playbackRate" === p.name) throw r();
                        try {
                            this._nativeAudioNode.connect(p, s1), (u || ot(this)) && this._nativeAudioNode.disconnect(p, s1);
                        } catch (t1) {
                            if (12 === t1.code) throw o();
                            throw t1;
                        }
                        if (ht(this, t1, s1, u)) {
                            const e = c([
                                this
                            ], t1);
                            at(e, n(u));
                        }
                    }
                    disconnect(t1, e, s1) {
                        let n;
                        const r = l(this._context), h = m(r);
                        if (void 0 === t1) n = ((t1, e)=>{
                            const s1 = L(t1), n = [];
                            for (const i of s1.outputs)Q(i) ? ut(t1, e, ...i) : lt(t1, e, ...i), n.push(i[0]);
                            return s1.outputs.clear(), n;
                        })(this, h);
                        else if ("number" == typeof t1) {
                            if (t1 < 0 || t1 >= this.numberOfOutputs) throw i();
                            n = ((t1, e, s1)=>{
                                const n = L(t1), i = [];
                                for (const o of n.outputs)o[1] === s1 && (Q(o) ? ut(t1, e, ...o) : lt(t1, e, ...o), i.push(o[0]), n.outputs.delete(o));
                                return i;
                            })(this, h, t1);
                        } else {
                            if (void 0 !== e && (e < 0 || e >= this.numberOfOutputs)) throw i();
                            if (U(t1) && void 0 !== s1 && (s1 < 0 || s1 >= t1.numberOfInputs)) throw i();
                            if (n = ((t1, e, s1, n, i)=>{
                                const o = L(t1);
                                return Array.from(o.outputs).filter((t1)=>!(t1[0] !== s1 || void 0 !== n && t1[1] !== n || void 0 !== i && t1[2] !== i)).map((s1)=>(Q(s1) ? ut(t1, e, ...s1) : lt(t1, e, ...s1), o.outputs.delete(s1), s1[0]));
                            })(this, h, t1, e, s1), 0 === n.length) throw o();
                        }
                        for (const t1 of n){
                            const e = c([
                                this
                            ], t1);
                            at(e, a);
                        }
                    }
                })((Xe = c, (t1, e, s1)=>{
                const n = [];
                for(let t1 = 0; t1 < s1.numberOfInputs; t1 += 1)n.push(new Set);
                Xe.set(t1, {
                    activeInputs: n,
                    outputs: new Set,
                    passiveInputs: new WeakMap,
                    renderer: e
                });
            }), ((t1, e, s1, n, i, o, r, a, c, h, u, l, p)=>(d, f, _, m, g)=>{
                    const { activeInputs: v, passiveInputs: y } = o(f), { outputs: x } = o(d), w = a(d), b = (o)=>{
                        const a = c(f), h = c(d);
                        if (o) {
                            const e = S(y, d, _, m);
                            t1(v, d, e, !1), g || l(d) || s1(h, a, _, m), p(f) && C(f);
                        } else {
                            const t1 = n(v, d, _, m);
                            e(y, m, t1, !1), g || l(d) || i(h, a, _, m);
                            const s1 = r(f);
                            0 === s1 ? u(f) && O(f, v) : setTimeout(()=>{
                                u(f) && O(f, v);
                            }, 1e3 * s1);
                        }
                    };
                    return !!h(x, [
                        f,
                        _,
                        m
                    ], (t1)=>t1[0] === f && t1[1] === _ && t1[2] === m, !0) && (w.add(b), u(d) ? t1(v, d, [
                        _,
                        m,
                        b
                    ], !0) : e(y, m, [
                        d,
                        _,
                        b
                    ], !0), !0);
                })(fe, me, $, ge, et, L, ye, k, st, Z, P, it, ot), xe, ((t1, e, s1, n, i, o)=>(r)=>(a, c)=>{
                        const h = t1.get(a);
                        if (void 0 === h) {
                            if (!r && o(a)) {
                                const t1 = n(a), { outputs: o } = s1(a);
                                for (const s1 of o)if (Q(s1)) {
                                    const i = n(s1[0]);
                                    e(t1, i, s1[1], s1[2]);
                                } else {
                                    const e = i(s1[0]);
                                    t1.disconnect(e, s1[1]);
                                }
                            }
                            t1.set(a, c);
                        } else t1.set(a, h + c);
                    })(f, et, L, st, nt, P), q, Dt, Ht, ((t1, e, s1, n, i, o, r, a)=>(c, h)=>{
                    const u = e.get(c);
                    if (void 0 === u) throw new Error("Missing the expected cycle count.");
                    const l = o(c.context), p = a(l);
                    if (u === h) {
                        if (e.delete(c), !p && r(c)) {
                            const e = n(c), { outputs: o } = s1(c);
                            for (const s1 of o)if (Q(s1)) {
                                const i = n(s1[0]);
                                t1(e, i, s1[1], s1[2]);
                            } else {
                                const t1 = i(s1[0]);
                                e.connect(t1, s1[1]);
                            }
                        }
                    } else e.set(c, u - h);
                })($, f, L, st, nt, Fe, P, Ne), ((t1, e, s1)=>function n(i, o) {
                    const r = U(o) ? o : s1(t1, o);
                    if (((t1)=>"delayTime" in t1)(r)) return [];
                    if (i[0] === r) return [
                        i
                    ];
                    if (i.includes(r)) return [];
                    const { outputs: a } = e(r);
                    return Array.from(a).map((t1)=>n([
                            ...i,
                            r
                        ], t1[0])).reduce((t1, e)=>t1.concat(e), []);
                })(je, L, b), Le, Fe, We, Ue, Qe, Ne);
            var Xe;
            const Ye = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, s1){
                        const r = i(t1), a = {
                            ...M,
                            ...s1
                        }, c = n(r, a);
                        super(t1, !1, c, o(r) ? e() : null), this._nativeAnalyserNode = c;
                    }
                    get fftSize() {
                        return this._nativeAnalyserNode.fftSize;
                    }
                    set fftSize(t1) {
                        this._nativeAnalyserNode.fftSize = t1;
                    }
                    get frequencyBinCount() {
                        return this._nativeAnalyserNode.frequencyBinCount;
                    }
                    get maxDecibels() {
                        return this._nativeAnalyserNode.maxDecibels;
                    }
                    set maxDecibels(t1) {
                        const e = this._nativeAnalyserNode.maxDecibels;
                        if (this._nativeAnalyserNode.maxDecibels = t1, !(t1 > this._nativeAnalyserNode.minDecibels)) throw this._nativeAnalyserNode.maxDecibels = e, s1();
                    }
                    get minDecibels() {
                        return this._nativeAnalyserNode.minDecibels;
                    }
                    set minDecibels(t1) {
                        const e = this._nativeAnalyserNode.minDecibels;
                        if (this._nativeAnalyserNode.minDecibels = t1, !(this._nativeAnalyserNode.maxDecibels > t1)) throw this._nativeAnalyserNode.minDecibels = e, s1();
                    }
                    get smoothingTimeConstant() {
                        return this._nativeAnalyserNode.smoothingTimeConstant;
                    }
                    set smoothingTimeConstant(t1) {
                        this._nativeAnalyserNode.smoothingTimeConstant = t1;
                    }
                    getByteFrequencyData(t1) {
                        this._nativeAnalyserNode.getByteFrequencyData(t1);
                    }
                    getByteTimeDomainData(t1) {
                        this._nativeAnalyserNode.getByteTimeDomainData(t1);
                    }
                    getFloatFrequencyData(t1) {
                        this._nativeAnalyserNode.getFloatFrequencyData(t1);
                    }
                    getFloatTimeDomainData(t1) {
                        this._nativeAnalyserNode.getFloatTimeDomainData(t1);
                    }
                })(Ze, Me, q, Se, Fe, Ne), He = new WeakSet, $e = ((t1)=>null === t1 ? null : t1.hasOwnProperty("AudioBuffer") ? t1.AudioBuffer : null)(Te), Je = (Ke = new Uint32Array(1), (t1)=>(Ke[0] = t1, Ke[0]));
            var Ke;
            const ts = ((t1, e)=>(s1)=>{
                    s1.copyFromChannel = (n, i, o = 0)=>{
                        const r = t1(o), a = t1(i);
                        if (a >= s1.numberOfChannels) throw e();
                        const c = s1.length, h = s1.getChannelData(a), u = n.length;
                        for(let t1 = r < 0 ? -r : 0; t1 + r < c && t1 < u; t1 += 1)n[t1] = h[t1 + r];
                    }, s1.copyToChannel = (n, i, o = 0)=>{
                        const r = t1(o), a = t1(i);
                        if (a >= s1.numberOfChannels) throw e();
                        const c = s1.length, h = s1.getChannelData(a), u = n.length;
                        for(let t1 = r < 0 ? -r : 0; t1 + r < c && t1 < u; t1 += 1)h[t1 + r] = n[t1];
                    };
                })(Je, q), es = ((t1)=>(e)=>{
                    e.copyFromChannel = ((s1)=>(n, i, o = 0)=>{
                            const r = t1(o), a = t1(i);
                            if (r < e.length) return s1.call(e, n, a, r);
                        })(e.copyFromChannel), e.copyToChannel = ((s1)=>(n, i, o = 0)=>{
                            const r = t1(o), a = t1(i);
                            if (r < e.length) return s1.call(e, n, a, r);
                        })(e.copyToChannel);
                })(Je), ss = ((t1, e, s1, n, i, o, r, a)=>{
                let c = null;
                return class h {
                    constructor(h){
                        if (null === i) throw new Error("Missing the native OfflineAudioContext constructor.");
                        const { length: u, numberOfChannels: l, sampleRate: p } = {
                            ...I,
                            ...h
                        };
                        null === c && (c = new i(1, 1, 44100));
                        const d = null !== n && e(o, o) ? new n({
                            length: u,
                            numberOfChannels: l,
                            sampleRate: p
                        }) : c.createBuffer(l, u, p);
                        if (0 === d.numberOfChannels) throw s1();
                        return "function" != typeof d.copyFromChannel ? (r(d), F(d)) : e(R, ()=>R(d)) || a(d), t1.add(d), d;
                    }
                    static [Symbol.hasInstance](e) {
                        return null !== e && "object" == typeof e && Object.getPrototypeOf(e) === h.prototype || t1.has(e);
                    }
                };
            })(He, xe, Ht, $e, Ve, (ns = $e, ()=>{
                if (null === ns) return !1;
                try {
                    new ns({
                        length: 1,
                        sampleRate: 44100
                    });
                } catch  {
                    return !1;
                }
                return !0;
            }), ts, es);
            var ns;
            const is = (os = Qt, (t1, e)=>{
                const s1 = os(t1, {
                    channelCount: 1,
                    channelCountMode: "explicit",
                    channelInterpretation: "discrete",
                    gain: 0
                });
                e.connect(s1).connect(t1.destination);
                const n = ()=>{
                    e.removeEventListener("ended", n), e.disconnect(s1), s1.disconnect();
                };
                e.addEventListener("ended", n);
            });
            var os;
            const rs = ((t1, e, s1)=>async (n, i, o, r)=>{
                    const a = e(n);
                    await Promise.all(Array.from(a.activeInputs).map(async ([e, n])=>{
                        const a = t1(e), c = await a.render(e, i, r);
                        s1(e) || c.connect(o, n);
                    }));
                })(Ae, z, it), as = ((t1)=>(e, s1, n, i)=>t1(s1, e, n, i))(rs), cs = ((t1, e, s1, n, i, o, r, a, c, h, u)=>(l, p)=>{
                    const d = l.createBufferSource();
                    return It(d, p), Nt(d, p, "playbackRate"), Ft(d, p, "buffer"), Ft(d, p, "loop"), Ft(d, p, "loopEnd"), Ft(d, p, "loopStart"), e(s1, ()=>s1(l)) || ((t1)=>{
                        t1.start = ((e)=>{
                            let s1 = !1;
                            return (n = 0, i = 0, o)=>{
                                if (s1) throw At();
                                e.call(t1, n, i, o), s1 = !0;
                            };
                        })(t1.start);
                    })(d), e(n, ()=>n(l)) || c(d), e(i, ()=>i(l)) || h(d, l), e(o, ()=>o(l)) || Pt(d), e(r, ()=>r(l)) || u(d, l), e(a, ()=>a(l)) || jt(d), t1(l, d), d;
                })(is, xe, (t1)=>{
                const e = t1.createBufferSource();
                e.start();
                try {
                    e.start();
                } catch  {
                    return !0;
                }
                return !1;
            }, (t1)=>{
                const e = t1.createBufferSource(), s1 = t1.createBuffer(1, 1, 44100);
                e.buffer = s1;
                try {
                    e.start(0, 1);
                } catch  {
                    return !1;
                }
                return !0;
            }, (t1)=>{
                const e = t1.createBufferSource();
                e.start();
                try {
                    e.stop();
                } catch  {
                    return !1;
                }
                return !0;
            }, ae, ce, he, (t1)=>{
                var e;
                t1.start = (e = t1.start, (s1 = 0, n = 0, i)=>{
                    const o = t1.buffer, r = null === o ? n : Math.min(o.duration, n);
                    null !== o && r > o.duration - .5 / t1.context.sampleRate ? e.call(t1, s1, 0, 0) : e.call(t1, s1, r, i);
                });
            }, (hs = oe, (t1, e)=>{
                const s1 = e.createBuffer(1, 1, 44100);
                null === t1.buffer && (t1.buffer = s1), hs(t1, "buffer", (e)=>()=>{
                        const n = e.call(t1);
                        return n === s1 ? null : n;
                    }, (e)=>(n)=>e.call(t1, null === n ? s1 : n));
            }), pe);
            var hs;
            const us = ((t1, e)=>(s1, n, i, o)=>(t1(n).replay(i), e(n, s1, i, o)))(((t1)=>(e)=>{
                    const s1 = t1(e);
                    if (null === s1.renderer) throw new Error("Missing the renderer of the given AudioParam in the audio graph.");
                    return s1.renderer;
                })(z), rs), ls = ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    let r = null, a = null;
                    return {
                        set start (t){
                            r = t;
                        },
                        set stop (t){
                            a = t;
                        },
                        render (c, h, u) {
                            const l = o.get(h);
                            return void 0 !== l ? Promise.resolve(l) : (async (c, h, u)=>{
                                let l = s1(c);
                                const p = E(l, h);
                                if (!p) {
                                    const t1 = {
                                        buffer: l.buffer,
                                        channelCount: l.channelCount,
                                        channelCountMode: l.channelCountMode,
                                        channelInterpretation: l.channelInterpretation,
                                        loop: l.loop,
                                        loopEnd: l.loopEnd,
                                        loopStart: l.loopStart,
                                        playbackRate: l.playbackRate.value
                                    };
                                    l = e(h, t1), null !== r && l.start(...r), null !== a && l.stop(a);
                                }
                                return o.set(h, l), p ? await t1(h, c.playbackRate, l.playbackRate, u) : await n(h, c.playbackRate, l.playbackRate, u), await i(c, h, l, u), l;
                            })(c, h, u);
                        }
                    };
                })(as, cs, st, us, Oe), ps = ((t1, e, s1, n, i, o, a, c, h, u, l, p, d)=>(f, _, m, g = null, v = null)=>{
                    const y = new r.AutomationEventList(m.defaultValue), x = _ ? n(y) : null, w = {
                        get defaultValue () {
                            return m.defaultValue;
                        },
                        get maxValue () {
                            return null === g ? m.maxValue : g;
                        },
                        get minValue () {
                            return null === v ? m.minValue : v;
                        },
                        get value () {
                            return m.value;
                        },
                        set value (t){
                            m.value = t, w.setValueAtTime(t, f.context.currentTime);
                        },
                        cancelAndHoldAtTime (t1) {
                            if ("function" == typeof m.cancelAndHoldAtTime) null === x && y.flush(f.context.currentTime), y.add(i(t1)), m.cancelAndHoldAtTime(t1);
                            else {
                                const e = Array.from(y).pop();
                                null === x && y.flush(f.context.currentTime), y.add(i(t1));
                                const s1 = Array.from(y).pop();
                                m.cancelScheduledValues(t1), e !== s1 && void 0 !== s1 && ("exponentialRampToValue" === s1.type ? m.exponentialRampToValueAtTime(s1.value, s1.endTime) : "linearRampToValue" === s1.type ? m.linearRampToValueAtTime(s1.value, s1.endTime) : "setValue" === s1.type ? m.setValueAtTime(s1.value, s1.startTime) : "setValueCurve" === s1.type && m.setValueCurveAtTime(s1.values, s1.startTime, s1.duration));
                            }
                            return w;
                        },
                        cancelScheduledValues: (t1)=>(null === x && y.flush(f.context.currentTime), y.add(o(t1)), m.cancelScheduledValues(t1), w),
                        exponentialRampToValueAtTime (t1, e) {
                            if (0 === t1) throw new RangeError;
                            if (!Number.isFinite(e) || e < 0) throw new RangeError;
                            return null === x && y.flush(f.context.currentTime), y.add(a(t1, e)), m.exponentialRampToValueAtTime(t1, e), w;
                        },
                        linearRampToValueAtTime: (t1, e)=>(null === x && y.flush(f.context.currentTime), y.add(c(t1, e)), m.linearRampToValueAtTime(t1, e), w),
                        setTargetAtTime: (t1, e, s1)=>(null === x && y.flush(f.context.currentTime), y.add(h(t1, e, s1)), m.setTargetAtTime(t1, e, s1), w),
                        setValueAtTime: (t1, e)=>(null === x && y.flush(f.context.currentTime), y.add(u(t1, e)), m.setValueAtTime(t1, e), w),
                        setValueCurveAtTime (t1, e, s1) {
                            const n = t1 instanceof Float32Array ? t1 : new Float32Array(t1);
                            if (null !== p && "webkitAudioContext" === p.name) {
                                const t1 = e + s1, i = f.context.sampleRate, o = Math.ceil(e * i), r = Math.floor(t1 * i), a = r - o, c = new Float32Array(a);
                                for(let t1 = 0; t1 < a; t1 += 1){
                                    const r = (n.length - 1) / s1 * ((o + t1) / i - e), a = Math.floor(r), h = Math.ceil(r);
                                    c[t1] = a === h ? n[a] : (1 - (r - a)) * n[a] + (1 - (h - r)) * n[h];
                                }
                                null === x && y.flush(f.context.currentTime), y.add(l(c, e, s1)), m.setValueCurveAtTime(c, e, s1);
                                const h = r / i;
                                h < t1 && d(w, c[c.length - 1], h), d(w, n[n.length - 1], t1);
                            } else null === x && y.flush(f.context.currentTime), y.add(l(n, e, s1)), m.setValueCurveAtTime(n, e, s1);
                            return w;
                        }
                    };
                    return s1.set(w, m), e.set(w, f), t1(w, x), w;
                })((ds = u, (t1, e)=>{
                ds.set(t1, {
                    activeInputs: new Set,
                    passiveInputs: new WeakMap,
                    renderer: e
                });
            }), je, l, (t1)=>({
                    replay (e) {
                        for (const s1 of t1)if ("exponentialRampToValue" === s1.type) {
                            const { endTime: t1, value: n } = s1;
                            e.exponentialRampToValueAtTime(n, t1);
                        } else if ("linearRampToValue" === s1.type) {
                            const { endTime: t1, value: n } = s1;
                            e.linearRampToValueAtTime(n, t1);
                        } else if ("setTarget" === s1.type) {
                            const { startTime: t1, target: n, timeConstant: i } = s1;
                            e.setTargetAtTime(n, t1, i);
                        } else if ("setValue" === s1.type) {
                            const { startTime: t1, value: n } = s1;
                            e.setValueAtTime(n, t1);
                        } else {
                            if ("setValueCurve" !== s1.type) throw new Error("Can't apply an unknown automation.");
                            {
                                const { duration: t1, startTime: n, values: i } = s1;
                                e.setValueCurveAtTime(i, n, t1);
                            }
                        }
                    }
                }), r.createCancelAndHoldAutomationEvent, r.createCancelScheduledValuesAutomationEvent, r.createExponentialRampToValueAutomationEvent, r.createLinearRampToValueAutomationEvent, r.createSetTargetAutomationEvent, r.createSetValueAutomationEvent, r.createSetValueCurveAutomationEvent, Be, re);
            var ds;
            const fs = ((t1, e, s1, n, i, o, r, a)=>class extends t1 {
                    constructor(t1, n){
                        const a = o(t1), c = {
                            ...j,
                            ...n
                        }, h = i(a, c), u = r(a), l = u ? e() : null;
                        super(t1, !1, h, l), this._audioBufferSourceNodeRenderer = l, this._isBufferNullified = !1, this._isBufferSet = null !== c.buffer, this._nativeAudioBufferSourceNode = h, this._onended = null, this._playbackRate = s1(this, u, h.playbackRate, N, V);
                    }
                    get buffer() {
                        return this._isBufferNullified ? null : this._nativeAudioBufferSourceNode.buffer;
                    }
                    set buffer(t1) {
                        if (this._nativeAudioBufferSourceNode.buffer = t1, null !== t1) {
                            if (this._isBufferSet) throw n();
                            this._isBufferSet = !0;
                        }
                    }
                    get loop() {
                        return this._nativeAudioBufferSourceNode.loop;
                    }
                    set loop(t1) {
                        this._nativeAudioBufferSourceNode.loop = t1;
                    }
                    get loopEnd() {
                        return this._nativeAudioBufferSourceNode.loopEnd;
                    }
                    set loopEnd(t1) {
                        this._nativeAudioBufferSourceNode.loopEnd = t1;
                    }
                    get loopStart() {
                        return this._nativeAudioBufferSourceNode.loopStart;
                    }
                    set loopStart(t1) {
                        this._nativeAudioBufferSourceNode.loopStart = t1;
                    }
                    get onended() {
                        return this._onended;
                    }
                    set onended(t1) {
                        const e = "function" == typeof t1 ? a(this, t1) : null;
                        this._nativeAudioBufferSourceNode.onended = e;
                        const s1 = this._nativeAudioBufferSourceNode.onended;
                        this._onended = null !== s1 && s1 === e ? t1 : s1;
                    }
                    get playbackRate() {
                        return this._playbackRate;
                    }
                    start(t1 = 0, e = 0, s1) {
                        if (this._nativeAudioBufferSourceNode.start(t1, e, s1), null !== this._audioBufferSourceNodeRenderer && (this._audioBufferSourceNodeRenderer.start = void 0 === s1 ? [
                            t1,
                            e
                        ] : [
                            t1,
                            e,
                            s1
                        ]), "closed" !== this.context.state) {
                            C(this);
                            const t1 = ()=>{
                                this._nativeAudioBufferSourceNode.removeEventListener("ended", t1), P(this) && D(this);
                            };
                            this._nativeAudioBufferSourceNode.addEventListener("ended", t1);
                        }
                    }
                    stop(t1 = 0) {
                        this._nativeAudioBufferSourceNode.stop(t1), null !== this._audioBufferSourceNodeRenderer && (this._audioBufferSourceNodeRenderer.stop = t1);
                    }
                })(Ze, ls, ps, At, cs, Fe, Ne, de), _s = ((t1, e, s1, n, i, o, r, a)=>class extends t1 {
                    constructor(t1, s1){
                        const n = o(t1), c = r(n), h = i(n, s1, c);
                        super(t1, !1, h, c ? e(a) : null), this._isNodeOfNativeOfflineAudioContext = c, this._nativeAudioDestinationNode = h;
                    }
                    get channelCount() {
                        return this._nativeAudioDestinationNode.channelCount;
                    }
                    set channelCount(t1) {
                        if (this._isNodeOfNativeOfflineAudioContext) throw n();
                        if (t1 > this._nativeAudioDestinationNode.maxChannelCount) throw s1();
                        this._nativeAudioDestinationNode.channelCount = t1;
                    }
                    get channelCountMode() {
                        return this._nativeAudioDestinationNode.channelCountMode;
                    }
                    set channelCountMode(t1) {
                        if (this._isNodeOfNativeOfflineAudioContext) throw n();
                        this._nativeAudioDestinationNode.channelCountMode = t1;
                    }
                    get maxChannelCount() {
                        return this._nativeAudioDestinationNode.maxChannelCount;
                    }
                })(Ze, (t1)=>{
                let e = null;
                return {
                    render: (s1, n, i)=>(null === e && (e = (async (e, s1, n)=>{
                            const i = s1.destination;
                            return await t1(e, s1, i, n), i;
                        })(s1, n, i)), e)
                };
            }, q, At, ((t1, e)=>(s1, n, i)=>{
                    const o = s1.destination;
                    if (o.channelCount !== n) try {
                        o.channelCount = n;
                    } catch  {}
                    i && "explicit" !== o.channelCountMode && (o.channelCountMode = "explicit"), 0 === o.maxChannelCount && Object.defineProperty(o, "maxChannelCount", {
                        value: n
                    });
                    const r = t1(s1, {
                        channelCount: n,
                        channelCountMode: o.channelCountMode,
                        channelInterpretation: o.channelInterpretation,
                        gain: 1
                    });
                    return e(r, "channelCount", (t1)=>()=>t1.call(r), (t1)=>(e)=>{
                            t1.call(r, e);
                            try {
                                o.channelCount = e;
                            } catch (t1) {
                                if (e > o.maxChannelCount) throw t1;
                            }
                        }), e(r, "channelCountMode", (t1)=>()=>t1.call(r), (t1)=>(e)=>{
                            t1.call(r, e), o.channelCountMode = e;
                        }), e(r, "channelInterpretation", (t1)=>()=>t1.call(r), (t1)=>(e)=>{
                            t1.call(r, e), o.channelInterpretation = e;
                        }), Object.defineProperty(r, "maxChannelCount", {
                        get: ()=>o.maxChannelCount
                    }), r.connect(o), r;
                })(Qt, oe), Fe, Ne, Oe), ms = ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    return {
                        render (r, a, c) {
                            const h = o.get(a);
                            return void 0 !== h ? Promise.resolve(h) : (async (r, a, c)=>{
                                let h = s1(r);
                                const u = E(h, a);
                                if (!u) {
                                    const t1 = {
                                        Q: h.Q.value,
                                        channelCount: h.channelCount,
                                        channelCountMode: h.channelCountMode,
                                        channelInterpretation: h.channelInterpretation,
                                        detune: h.detune.value,
                                        frequency: h.frequency.value,
                                        gain: h.gain.value,
                                        type: h.type
                                    };
                                    h = e(a, t1);
                                }
                                return o.set(a, h), u ? (await t1(a, r.Q, h.Q, c), await t1(a, r.detune, h.detune, c), await t1(a, r.frequency, h.frequency, c), await t1(a, r.gain, h.gain, c)) : (await n(a, r.Q, h.Q, c), await n(a, r.detune, h.detune, c), await n(a, r.frequency, h.frequency, c), await n(a, r.gain, h.gain, c)), await i(r, a, h, c), h;
                            })(r, a, c);
                        }
                    };
                })(as, Bt, st, us, Oe), gs = ((t1)=>(e, s1)=>t1.set(e, s1))(ve), vs = (ys = Ze, xs = ps, ws = ms, bs = Dt, Ts = Bt, Ss = Fe, ks = Ne, Cs = gs, class extends ys {
                constructor(t1, e){
                    const s1 = Ss(t1), n = {
                        ...vt,
                        ...e
                    }, i = Ts(s1, n), o = ks(s1);
                    super(t1, !1, i, o ? ws() : null), this._Q = xs(this, o, i.Q, N, V), this._detune = xs(this, o, i.detune, 1200 * Math.log2(N), -1200 * Math.log2(N)), this._frequency = xs(this, o, i.frequency, t1.sampleRate / 2, 0), this._gain = xs(this, o, i.gain, 40 * Math.log10(N), V), this._nativeBiquadFilterNode = i, Cs(this, 1);
                }
                get detune() {
                    return this._detune;
                }
                get frequency() {
                    return this._frequency;
                }
                get gain() {
                    return this._gain;
                }
                get Q() {
                    return this._Q;
                }
                get type() {
                    return this._nativeBiquadFilterNode.type;
                }
                set type(t1) {
                    this._nativeBiquadFilterNode.type = t1;
                }
                getFrequencyResponse(t1, e, s1) {
                    try {
                        this._nativeBiquadFilterNode.getFrequencyResponse(t1, e, s1);
                    } catch (t1) {
                        if (11 === t1.code) throw bs();
                        throw t1;
                    }
                    if (t1.length !== e.length || e.length !== s1.length) throw bs();
                }
            });
            var ys, xs, ws, bs, Ts, Ss, ks, Cs;
            const As = ((t1, e)=>(s1, n, i)=>{
                    const o = new Set;
                    var r, a;
                    return s1.connect = (r = s1.connect, (i, a = 0, c = 0)=>{
                        const h = 0 === o.size;
                        if (e(i)) return r.call(s1, i, a, c), t1(o, [
                            i,
                            a,
                            c
                        ], (t1)=>t1[0] === i && t1[1] === a && t1[2] === c, !0), h && n(), i;
                        r.call(s1, i, a), t1(o, [
                            i,
                            a
                        ], (t1)=>t1[0] === i && t1[1] === a, !0), h && n();
                    }), s1.disconnect = (a = s1.disconnect, (t1, n, r)=>{
                        const c = o.size > 0;
                        if (void 0 === t1) a.apply(s1), o.clear();
                        else if ("number" == typeof t1) {
                            a.call(s1, t1);
                            for (const e of o)e[1] === t1 && o.delete(e);
                        } else {
                            e(t1) ? a.call(s1, t1, n, r) : a.call(s1, t1, n);
                            for (const e of o)e[0] !== t1 || void 0 !== n && e[1] !== n || void 0 !== r && e[2] !== r || o.delete(e);
                        }
                        const h = 0 === o.size;
                        c && h && i();
                    }), s1;
                })(Z, Ue), Ds = (Os = At, Ms = As, (t1, e)=>{
                e.channelCount = 1, e.channelCountMode = "explicit", Object.defineProperty(e, "channelCount", {
                    get: ()=>1,
                    set: ()=>{
                        throw Os();
                    }
                }), Object.defineProperty(e, "channelCountMode", {
                    get: ()=>"explicit",
                    set: ()=>{
                        throw Os();
                    }
                });
                const s1 = t1.createBufferSource();
                Ms(e, ()=>{
                    const t1 = e.numberOfInputs;
                    for(let n = 0; n < t1; n += 1)s1.connect(e, 0, n);
                }, ()=>s1.disconnect(e));
            });
            var Os, Ms;
            const Es = ((t1, e)=>(s1, n)=>{
                    const i = s1.createChannelMerger(n.numberOfInputs);
                    return null !== t1 && "webkitAudioContext" === t1.name && e(s1, i), It(i, n), i;
                })(Be, Ds), Rs = ((t1, e, s1, n, i)=>class extends t1 {
                    constructor(t1, o){
                        const r = n(t1), a = {
                            ...yt,
                            ...o
                        };
                        super(t1, !1, s1(r, a), i(r) ? e() : null);
                    }
                })(Ze, ((t1, e, s1)=>()=>{
                    const n = new WeakMap;
                    return {
                        render (i, o, r) {
                            const a = n.get(o);
                            return void 0 !== a ? Promise.resolve(a) : (async (i, o, r)=>{
                                let a = e(i);
                                if (!E(a, o)) {
                                    const e = {
                                        channelCount: a.channelCount,
                                        channelCountMode: a.channelCountMode,
                                        channelInterpretation: a.channelInterpretation,
                                        numberOfInputs: a.numberOfInputs
                                    };
                                    a = t1(o, e);
                                }
                                return n.set(o, a), await s1(i, o, a, r), a;
                            })(i, o, r);
                        }
                    };
                })(Es, st, Oe), Es, Fe, Ne), qs = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, r){
                        const a = n(t1), c = o({
                            ...xt,
                            ...r
                        });
                        super(t1, !1, s1(a, c), i(a) ? e() : null);
                    }
                })(Ze, ((t1, e, s1)=>()=>{
                    const n = new WeakMap;
                    return {
                        render (i, o, r) {
                            const a = n.get(o);
                            return void 0 !== a ? Promise.resolve(a) : (async (i, o, r)=>{
                                let a = e(i);
                                if (!E(a, o)) {
                                    const e = {
                                        channelCount: a.channelCount,
                                        channelCountMode: a.channelCountMode,
                                        channelInterpretation: a.channelInterpretation,
                                        numberOfOutputs: a.numberOfOutputs
                                    };
                                    a = t1(o, e);
                                }
                                return n.set(o, a), await s1(i, o, a, r), a;
                            })(i, o, r);
                        }
                    };
                })(Wt, st, Oe), Wt, Fe, Ne, (t1)=>({
                    ...t1,
                    channelCount: t1.numberOfOutputs
                })), Fs = ((t1, e, s1, n)=>(i, { offset: o, ...r })=>{
                    const a = i.createBuffer(1, 2, 44100), c = e(i, {
                        buffer: null,
                        channelCount: 2,
                        channelCountMode: "max",
                        channelInterpretation: "speakers",
                        loop: !1,
                        loopEnd: 0,
                        loopStart: 0,
                        playbackRate: 1
                    }), h = s1(i, {
                        ...r,
                        gain: o
                    }), u = a.getChannelData(0);
                    u[0] = 1, u[1] = 1, c.buffer = a, c.loop = !0;
                    const l = {
                        get bufferSize () {},
                        get channelCount () {
                            return h.channelCount;
                        },
                        set channelCount (t){
                            h.channelCount = t;
                        },
                        get channelCountMode () {
                            return h.channelCountMode;
                        },
                        set channelCountMode (t){
                            h.channelCountMode = t;
                        },
                        get channelInterpretation () {
                            return h.channelInterpretation;
                        },
                        set channelInterpretation (t){
                            h.channelInterpretation = t;
                        },
                        get context () {
                            return h.context;
                        },
                        get inputs () {
                            return [];
                        },
                        get numberOfInputs () {
                            return c.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return h.numberOfOutputs;
                        },
                        get offset () {
                            return h.gain;
                        },
                        get onended () {
                            return c.onended;
                        },
                        set onended (t){
                            c.onended = t;
                        },
                        addEventListener: (...t1)=>c.addEventListener(t1[0], t1[1], t1[2]),
                        dispatchEvent: (...t1)=>c.dispatchEvent(t1[0]),
                        removeEventListener: (...t1)=>c.removeEventListener(t1[0], t1[1], t1[2]),
                        start (t1 = 0) {
                            c.start.call(c, t1);
                        },
                        stop (t1 = 0) {
                            c.stop.call(c, t1);
                        }
                    };
                    return t1(i, c), n(Gt(l, h), ()=>c.connect(h), ()=>c.disconnect(h));
                })(is, cs, Qt, As), Is = ((t1, e, s1, n, i)=>(o, r)=>{
                    if (void 0 === o.createConstantSource) return s1(o, r);
                    const a = o.createConstantSource();
                    return It(a, r), Nt(a, r, "offset"), e(n, ()=>n(o)) || Pt(a), e(i, ()=>i(o)) || jt(a), t1(o, a), a;
                })(is, xe, Fs, ae, he), Vs = ((t1, e, s1, n, i, o, r)=>class extends t1 {
                    constructor(t1, r){
                        const a = i(t1), c = {
                            ...wt,
                            ...r
                        }, h = n(a, c), u = o(a), l = u ? s1() : null;
                        super(t1, !1, h, l), this._constantSourceNodeRenderer = l, this._nativeConstantSourceNode = h, this._offset = e(this, u, h.offset, N, V), this._onended = null;
                    }
                    get offset() {
                        return this._offset;
                    }
                    get onended() {
                        return this._onended;
                    }
                    set onended(t1) {
                        const e = "function" == typeof t1 ? r(this, t1) : null;
                        this._nativeConstantSourceNode.onended = e;
                        const s1 = this._nativeConstantSourceNode.onended;
                        this._onended = null !== s1 && s1 === e ? t1 : s1;
                    }
                    start(t1 = 0) {
                        if (this._nativeConstantSourceNode.start(t1), null !== this._constantSourceNodeRenderer && (this._constantSourceNodeRenderer.start = t1), "closed" !== this.context.state) {
                            C(this);
                            const t1 = ()=>{
                                this._nativeConstantSourceNode.removeEventListener("ended", t1), P(this) && D(this);
                            };
                            this._nativeConstantSourceNode.addEventListener("ended", t1);
                        }
                    }
                    stop(t1 = 0) {
                        this._nativeConstantSourceNode.stop(t1), null !== this._constantSourceNodeRenderer && (this._constantSourceNodeRenderer.stop = t1);
                    }
                })(Ze, ps, ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    let r = null, a = null;
                    return {
                        set start (t){
                            r = t;
                        },
                        set stop (t){
                            a = t;
                        },
                        render (c, h, u) {
                            const l = o.get(h);
                            return void 0 !== l ? Promise.resolve(l) : (async (c, h, u)=>{
                                let l = s1(c);
                                const p = E(l, h);
                                if (!p) {
                                    const t1 = {
                                        channelCount: l.channelCount,
                                        channelCountMode: l.channelCountMode,
                                        channelInterpretation: l.channelInterpretation,
                                        offset: l.offset.value
                                    };
                                    l = e(h, t1), null !== r && l.start(r), null !== a && l.stop(a);
                                }
                                return o.set(h, l), p ? await t1(h, c.offset, l.offset, u) : await n(h, c.offset, l.offset, u), await i(c, h, l, u), l;
                            })(c, h, u);
                        }
                    };
                })(as, Is, st, us, Oe), Is, Fe, Ne, de), Ns = ((t1, e)=>(s1, n)=>{
                    const i = s1.createConvolver();
                    if (It(i, n), n.disableNormalization === i.normalize && (i.normalize = !n.disableNormalization), Ft(i, n, "buffer"), n.channelCount > 2) throw t1();
                    if (e(i, "channelCount", (t1)=>()=>t1.call(i), (e)=>(s1)=>{
                            if (s1 > 2) throw t1();
                            return e.call(i, s1);
                        }), "max" === n.channelCountMode) throw t1();
                    return e(i, "channelCountMode", (t1)=>()=>t1.call(i), (e)=>(s1)=>{
                            if ("max" === s1) throw t1();
                            return e.call(i, s1);
                        }), i;
                })(Ht, oe), Ps = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, r){
                        const a = n(t1), c = {
                            ...bt,
                            ...r
                        }, h = s1(a, c);
                        super(t1, !1, h, i(a) ? e() : null), this._isBufferNullified = !1, this._nativeConvolverNode = h, null !== c.buffer && o(this, c.buffer.duration);
                    }
                    get buffer() {
                        return this._isBufferNullified ? null : this._nativeConvolverNode.buffer;
                    }
                    set buffer(t1) {
                        if (this._nativeConvolverNode.buffer = t1, null === t1 && null !== this._nativeConvolverNode.buffer) {
                            const t1 = this._nativeConvolverNode.context;
                            this._nativeConvolverNode.buffer = t1.createBuffer(1, 1, 44100), this._isBufferNullified = !0, o(this, 0);
                        } else this._isBufferNullified = !1, o(this, null === this._nativeConvolverNode.buffer ? 0 : this._nativeConvolverNode.buffer.duration);
                    }
                    get normalize() {
                        return this._nativeConvolverNode.normalize;
                    }
                    set normalize(t1) {
                        this._nativeConvolverNode.normalize = t1;
                    }
                })(Ze, ((t1, e, s1)=>()=>{
                    const n = new WeakMap;
                    return {
                        render (i, o, r) {
                            const a = n.get(o);
                            return void 0 !== a ? Promise.resolve(a) : (async (i, o, r)=>{
                                let a = e(i);
                                if (!E(a, o)) {
                                    const e = {
                                        buffer: a.buffer,
                                        channelCount: a.channelCount,
                                        channelCountMode: a.channelCountMode,
                                        channelInterpretation: a.channelInterpretation,
                                        disableNormalization: !a.normalize
                                    };
                                    a = t1(o, e);
                                }
                                return n.set(o, a), H(a) ? await s1(i, o, a.inputs[0], r) : await s1(i, o, a, r), a;
                            })(i, o, r);
                        }
                    };
                })(Ns, st, Oe), Ns, Fe, Ne, gs), js = ((t1, e, s1, n, i, o, r)=>class extends t1 {
                    constructor(t1, a){
                        const c = i(t1), h = {
                            ...Tt,
                            ...a
                        }, u = n(c, h), l = o(c);
                        super(t1, !1, u, l ? s1(h.maxDelayTime) : null), this._delayTime = e(this, l, u.delayTime), r(this, h.maxDelayTime);
                    }
                    get delayTime() {
                        return this._delayTime;
                    }
                })(Ze, ps, ((t1, e, s1, n, i)=>(o)=>{
                    const r = new WeakMap;
                    return {
                        render (a, c, h) {
                            const u = r.get(c);
                            return void 0 !== u ? Promise.resolve(u) : (async (a, c, h)=>{
                                let u = s1(a);
                                const l = E(u, c);
                                if (!l) {
                                    const t1 = {
                                        channelCount: u.channelCount,
                                        channelCountMode: u.channelCountMode,
                                        channelInterpretation: u.channelInterpretation,
                                        delayTime: u.delayTime.value,
                                        maxDelayTime: o
                                    };
                                    u = e(c, t1);
                                }
                                return r.set(c, u), l ? await t1(c, a.delayTime, u.delayTime, h) : await n(c, a.delayTime, u.delayTime, h), await i(a, c, u, h), u;
                            })(a, c, h);
                        }
                    };
                })(as, Ut, st, us, Oe), Ut, Fe, Ne, gs), Ls = (zs = Ht, (t1, e)=>{
                const s1 = t1.createDynamicsCompressor();
                if (It(s1, e), e.channelCount > 2) throw zs();
                if ("max" === e.channelCountMode) throw zs();
                return Nt(s1, e, "attack"), Nt(s1, e, "knee"), Nt(s1, e, "ratio"), Nt(s1, e, "release"), Nt(s1, e, "threshold"), s1;
            });
            var zs;
            const Bs = ((t1, e, s1, n, i, o, r, a)=>class extends t1 {
                    constructor(t1, i){
                        const c = o(t1), h = {
                            ...kt,
                            ...i
                        }, u = n(c, h), l = r(c);
                        super(t1, !1, u, l ? s1() : null), this._attack = e(this, l, u.attack), this._knee = e(this, l, u.knee), this._nativeDynamicsCompressorNode = u, this._ratio = e(this, l, u.ratio), this._release = e(this, l, u.release), this._threshold = e(this, l, u.threshold), a(this, .006);
                    }
                    get attack() {
                        return this._attack;
                    }
                    get channelCount() {
                        return this._nativeDynamicsCompressorNode.channelCount;
                    }
                    set channelCount(t1) {
                        const e = this._nativeDynamicsCompressorNode.channelCount;
                        if (this._nativeDynamicsCompressorNode.channelCount = t1, t1 > 2) throw this._nativeDynamicsCompressorNode.channelCount = e, i();
                    }
                    get channelCountMode() {
                        return this._nativeDynamicsCompressorNode.channelCountMode;
                    }
                    set channelCountMode(t1) {
                        const e = this._nativeDynamicsCompressorNode.channelCountMode;
                        if (this._nativeDynamicsCompressorNode.channelCountMode = t1, "max" === t1) throw this._nativeDynamicsCompressorNode.channelCountMode = e, i();
                    }
                    get knee() {
                        return this._knee;
                    }
                    get ratio() {
                        return this._ratio;
                    }
                    get reduction() {
                        return "number" == typeof this._nativeDynamicsCompressorNode.reduction.value ? this._nativeDynamicsCompressorNode.reduction.value : this._nativeDynamicsCompressorNode.reduction;
                    }
                    get release() {
                        return this._release;
                    }
                    get threshold() {
                        return this._threshold;
                    }
                })(Ze, ps, ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    return {
                        render (r, a, c) {
                            const h = o.get(a);
                            return void 0 !== h ? Promise.resolve(h) : (async (r, a, c)=>{
                                let h = s1(r);
                                const u = E(h, a);
                                if (!u) {
                                    const t1 = {
                                        attack: h.attack.value,
                                        channelCount: h.channelCount,
                                        channelCountMode: h.channelCountMode,
                                        channelInterpretation: h.channelInterpretation,
                                        knee: h.knee.value,
                                        ratio: h.ratio.value,
                                        release: h.release.value,
                                        threshold: h.threshold.value
                                    };
                                    h = e(a, t1);
                                }
                                return o.set(a, h), u ? (await t1(a, r.attack, h.attack, c), await t1(a, r.knee, h.knee, c), await t1(a, r.ratio, h.ratio, c), await t1(a, r.release, h.release, c), await t1(a, r.threshold, h.threshold, c)) : (await n(a, r.attack, h.attack, c), await n(a, r.knee, h.knee, c), await n(a, r.ratio, h.ratio, c), await n(a, r.release, h.release, c), await n(a, r.threshold, h.threshold, c)), await i(r, a, h, c), h;
                            })(r, a, c);
                        }
                    };
                })(as, Ls, st, us, Oe), Ls, Ht, Fe, Ne, gs), Ws = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, r){
                        const a = i(t1), c = {
                            ...Ct,
                            ...r
                        }, h = n(a, c), u = o(a);
                        super(t1, !1, h, u ? s1() : null), this._gain = e(this, u, h.gain, N, V);
                    }
                    get gain() {
                        return this._gain;
                    }
                })(Ze, ps, ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    return {
                        render (r, a, c) {
                            const h = o.get(a);
                            return void 0 !== h ? Promise.resolve(h) : (async (r, a, c)=>{
                                let h = s1(r);
                                const u = E(h, a);
                                if (!u) {
                                    const t1 = {
                                        channelCount: h.channelCount,
                                        channelCountMode: h.channelCountMode,
                                        channelInterpretation: h.channelInterpretation,
                                        gain: h.gain.value
                                    };
                                    h = e(a, t1);
                                }
                                return o.set(a, h), u ? await t1(a, r.gain, h.gain, c) : await n(a, r.gain, h.gain, c), await i(r, a, h, c), h;
                            })(r, a, c);
                        }
                    };
                })(as, Qt, st, us, Oe), Qt, Fe, Ne), Gs = ((t1, e, s1, n)=>(i, o, { channelCount: r, channelCountMode: a, channelInterpretation: c, feedback: h, feedforward: u })=>{
                    const l = Lt(o, i.sampleRate), p = h instanceof Float64Array ? h : new Float64Array(h), d = u instanceof Float64Array ? u : new Float64Array(u), f = p.length, _ = d.length, m = Math.min(f, _);
                    if (0 === f || f > 20) throw n();
                    if (0 === p[0]) throw e();
                    if (0 === _ || _ > 20) throw n();
                    if (0 === d[0]) throw e();
                    if (1 !== p[0]) {
                        for(let t1 = 0; t1 < _; t1 += 1)d[t1] /= p[0];
                        for(let t1 = 1; t1 < f; t1 += 1)p[t1] /= p[0];
                    }
                    const g = s1(i, l, r, r);
                    g.channelCount = r, g.channelCountMode = a, g.channelInterpretation = c;
                    const v = [], y = [], x = [];
                    for(let t1 = 0; t1 < r; t1 += 1){
                        v.push(0);
                        const t1 = new Float32Array(32), e = new Float32Array(32);
                        t1.fill(0), e.fill(0), y.push(t1), x.push(e);
                    }
                    g.onaudioprocess = (t1)=>{
                        const e = t1.inputBuffer, s1 = t1.outputBuffer, n = e.numberOfChannels;
                        for(let t1 = 0; t1 < n; t1 += 1){
                            const n = e.getChannelData(t1), i = s1.getChannelData(t1);
                            v[t1] = Mt(p, f, d, _, m, y[t1], x[t1], v[t1], 32, n, i);
                        }
                    };
                    const w = i.sampleRate / 2;
                    return Gt({
                        get bufferSize () {
                            return l;
                        },
                        get channelCount () {
                            return g.channelCount;
                        },
                        set channelCount (t){
                            g.channelCount = t;
                        },
                        get channelCountMode () {
                            return g.channelCountMode;
                        },
                        set channelCountMode (t){
                            g.channelCountMode = t;
                        },
                        get channelInterpretation () {
                            return g.channelInterpretation;
                        },
                        set channelInterpretation (t){
                            g.channelInterpretation = t;
                        },
                        get context () {
                            return g.context;
                        },
                        get inputs () {
                            return [
                                g
                            ];
                        },
                        get numberOfInputs () {
                            return g.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return g.numberOfOutputs;
                        },
                        addEventListener: (...t1)=>g.addEventListener(t1[0], t1[1], t1[2]),
                        dispatchEvent: (...t1)=>g.dispatchEvent(t1[0]),
                        getFrequencyResponse (e, s1, n) {
                            if (e.length !== s1.length || s1.length !== n.length) throw t1();
                            const i = e.length;
                            for(let t1 = 0; t1 < i; t1 += 1){
                                const i = -Math.PI * (e[t1] / w), o = [
                                    Math.cos(i),
                                    Math.sin(i)
                                ], r = Zt(Xt(d, o), Xt(p, o));
                                s1[t1] = Math.sqrt(r[0] * r[0] + r[1] * r[1]), n[t1] = Math.atan2(r[1], r[0]);
                            }
                        },
                        removeEventListener: (...t1)=>g.removeEventListener(t1[0], t1[1], t1[2])
                    }, g);
                })(Dt, At, Yt, Ht), Us = ((t1, e, s1, n)=>(i)=>t1(Rt, ()=>Rt(i)) ? Promise.resolve(t1(n, n)).then((t1)=>{
                        if (!t1) {
                            const t1 = s1(i, 512, 0, 1);
                            i.oncomplete = ()=>{
                                t1.onaudioprocess = null, t1.disconnect();
                            }, t1.onaudioprocess = ()=>i.currentTime, t1.connect(i.destination);
                        }
                        return i.startRendering();
                    }) : new Promise((t1)=>{
                        const s1 = e(i, {
                            channelCount: 1,
                            channelCountMode: "explicit",
                            channelInterpretation: "discrete",
                            gain: 0
                        });
                        i.oncomplete = (e)=>{
                            s1.disconnect(), t1(e.renderedBuffer);
                        }, s1.connect(i.destination), i.startRendering();
                    }))(xe, Qt, Yt, ((t1, e)=>()=>{
                    if (null === e) return Promise.resolve(!1);
                    const s1 = new e(1, 1, 44100), n = t1(s1, {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete",
                        gain: 0
                    });
                    return new Promise((t1)=>{
                        s1.oncomplete = ()=>{
                            n.disconnect(), t1(0 !== s1.currentTime);
                        }, s1.startRendering();
                    });
                })(Qt, Ve)), Qs = ((t1, e, s1, n, i)=>(o, r)=>{
                    const a = new WeakMap;
                    let c = null;
                    const h = async (h, u, l)=>{
                        let p = null, d = e(h);
                        const f = E(d, u);
                        if (void 0 === u.createIIRFilter ? p = t1(u, {
                            buffer: null,
                            channelCount: 2,
                            channelCountMode: "max",
                            channelInterpretation: "speakers",
                            loop: !1,
                            loopEnd: 0,
                            loopStart: 0,
                            playbackRate: 1
                        }) : f || (d = u.createIIRFilter(r, o)), a.set(u, null === p ? d : p), null !== p) {
                            if (null === c) {
                                if (null === s1) throw new Error("Missing the native OfflineAudioContext constructor.");
                                const t1 = new s1(h.context.destination.channelCount, h.context.length, u.sampleRate);
                                c = (async ()=>{
                                    await n(h, t1, t1.destination, l);
                                    return ((t1, e, s1, n)=>{
                                        const i = s1 instanceof Float64Array ? s1 : new Float64Array(s1), o = n instanceof Float64Array ? n : new Float64Array(n), r = i.length, a = o.length, c = Math.min(r, a);
                                        if (1 !== i[0]) {
                                            for(let t1 = 0; t1 < r; t1 += 1)o[t1] /= i[0];
                                            for(let t1 = 1; t1 < a; t1 += 1)i[t1] /= i[0];
                                        }
                                        const h = new Float32Array(32), u = new Float32Array(32), l = e.createBuffer(t1.numberOfChannels, t1.length, t1.sampleRate), p = t1.numberOfChannels;
                                        for(let e = 0; e < p; e += 1){
                                            const s1 = t1.getChannelData(e), n = l.getChannelData(e);
                                            h.fill(0), u.fill(0), Mt(i, r, o, a, c, h, u, 0, 32, s1, n);
                                        }
                                        return l;
                                    })(await i(t1), u, o, r);
                                })();
                            }
                            const t1 = await c;
                            return p.buffer = t1, p.start(0), p;
                        }
                        return await n(h, u, d, l), d;
                    };
                    return {
                        render (t1, e, s1) {
                            const n = a.get(e);
                            return void 0 !== n ? Promise.resolve(n) : h(t1, e, s1);
                        }
                    };
                })(cs, st, Ve, Oe, Us);
            var Zs;
            const Xs = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, r){
                        const a = n(t1), c = i(a), h = {
                            ...Ot,
                            ...r
                        }, u = e(a, c ? null : t1.baseLatency, h);
                        super(t1, !1, u, c ? s1(h.feedback, h.feedforward) : null), ((t1)=>{
                            var e;
                            t1.getFrequencyResponse = (e = t1.getFrequencyResponse, (s1, n, i)=>{
                                if (s1.length !== n.length || n.length !== i.length) throw Dt();
                                return e.call(t1, s1, n, i);
                            });
                        })(u), this._nativeIIRFilterNode = u, o(this, 1);
                    }
                    getFrequencyResponse(t1, e, s1) {
                        return this._nativeIIRFilterNode.getFrequencyResponse(t1, e, s1);
                    }
                })(Ze, (Zs = Gs, (t1, e, s1)=>{
                if (void 0 === t1.createIIRFilter) return Zs(t1, e, s1);
                const n = t1.createIIRFilter(s1.feedforward, s1.feedback);
                return It(n, s1), n;
            }), Qs, Fe, Ne, gs), Ys = ((t1, e, s1, n, i)=>(o, r)=>{
                    const a = r.listener, { forwardX: c, forwardY: h, forwardZ: u, positionX: l, positionY: p, positionZ: d, upX: f, upY: _, upZ: m } = void 0 === a.forwardX ? (()=>{
                        const c = e(r, {
                            channelCount: 1,
                            channelCountMode: "explicit",
                            channelInterpretation: "speakers",
                            numberOfInputs: 9
                        }), h = i(r), u = n(r, 256, 9, 0), l = (e, n)=>{
                            const i = s1(r, {
                                channelCount: 1,
                                channelCountMode: "explicit",
                                channelInterpretation: "discrete",
                                offset: n
                            });
                            return i.connect(c, 0, e), i.start(), Object.defineProperty(i.offset, "defaultValue", {
                                get: ()=>n
                            }), t1({
                                context: o
                            }, h, i.offset, N, V);
                        };
                        let p = [
                            0,
                            0,
                            -1,
                            0,
                            1,
                            0
                        ], d = [
                            0,
                            0,
                            0
                        ];
                        return u.onaudioprocess = ({ inputBuffer: t1 })=>{
                            const e = [
                                t1.getChannelData(0)[0],
                                t1.getChannelData(1)[0],
                                t1.getChannelData(2)[0],
                                t1.getChannelData(3)[0],
                                t1.getChannelData(4)[0],
                                t1.getChannelData(5)[0]
                            ];
                            e.some((t1, e)=>t1 !== p[e]) && (a.setOrientation(...e), p = e);
                            const s1 = [
                                t1.getChannelData(6)[0],
                                t1.getChannelData(7)[0],
                                t1.getChannelData(8)[0]
                            ];
                            s1.some((t1, e)=>t1 !== d[e]) && (a.setPosition(...s1), d = s1);
                        }, c.connect(u), {
                            forwardX: l(0, 0),
                            forwardY: l(1, 0),
                            forwardZ: l(2, -1),
                            positionX: l(6, 0),
                            positionY: l(7, 0),
                            positionZ: l(8, 0),
                            upX: l(3, 0),
                            upY: l(4, 1),
                            upZ: l(5, 0)
                        };
                    })() : a;
                    return {
                        get forwardX () {
                            return c;
                        },
                        get forwardY () {
                            return h;
                        },
                        get forwardZ () {
                            return u;
                        },
                        get positionX () {
                            return l;
                        },
                        get positionY () {
                            return p;
                        },
                        get positionZ () {
                            return d;
                        },
                        get upX () {
                            return f;
                        },
                        get upY () {
                            return _;
                        },
                        get upZ () {
                            return m;
                        }
                    };
                })(ps, Es, Is, Yt, Ne), Hs = new WeakMap, $s = ((t1, e, s1, n, i, o)=>class extends s1 {
                    constructor(s1, o){
                        super(s1), this._nativeContext = s1, p.set(this, s1), n(s1) && i.set(s1, new Set), this._destination = new t1(this, o), this._listener = e(this, s1), this._onstatechange = null;
                    }
                    get currentTime() {
                        return this._nativeContext.currentTime;
                    }
                    get destination() {
                        return this._destination;
                    }
                    get listener() {
                        return this._listener;
                    }
                    get onstatechange() {
                        return this._onstatechange;
                    }
                    set onstatechange(t1) {
                        const e = "function" == typeof t1 ? o(this, t1) : null;
                        this._nativeContext.onstatechange = e;
                        const s1 = this._nativeContext.onstatechange;
                        this._onstatechange = null !== s1 && s1 === e ? t1 : s1;
                    }
                    get sampleRate() {
                        return this._nativeContext.sampleRate;
                    }
                    get state() {
                        return this._nativeContext.state;
                    }
                })(_s, Ys, Le, Ne, Hs, de), Js = ((t1, e, s1, n, i, o)=>(r, a)=>{
                    const c = r.createOscillator();
                    return It(c, a), Nt(c, a, "detune"), Nt(c, a, "frequency"), void 0 !== a.periodicWave ? c.setPeriodicWave(a.periodicWave) : Ft(c, a, "type"), e(s1, ()=>s1(r)) || Pt(c), e(n, ()=>n(r)) || o(c, r), e(i, ()=>i(r)) || jt(c), t1(r, c), c;
                })(is, xe, ae, ce, he, pe), Ks = ((t1, e, s1, n, i, o, r)=>class extends t1 {
                    constructor(t1, r){
                        const a = i(t1), c = {
                            ...Jt,
                            ...r
                        }, h = s1(a, c), u = o(a), l = u ? n() : null, p = t1.sampleRate / 2;
                        super(t1, !1, h, l), this._detune = e(this, u, h.detune, 153600, -153600), this._frequency = e(this, u, h.frequency, p, -p), this._nativeOscillatorNode = h, this._onended = null, this._oscillatorNodeRenderer = l, null !== this._oscillatorNodeRenderer && void 0 !== c.periodicWave && (this._oscillatorNodeRenderer.periodicWave = c.periodicWave);
                    }
                    get detune() {
                        return this._detune;
                    }
                    get frequency() {
                        return this._frequency;
                    }
                    get onended() {
                        return this._onended;
                    }
                    set onended(t1) {
                        const e = "function" == typeof t1 ? r(this, t1) : null;
                        this._nativeOscillatorNode.onended = e;
                        const s1 = this._nativeOscillatorNode.onended;
                        this._onended = null !== s1 && s1 === e ? t1 : s1;
                    }
                    get type() {
                        return this._nativeOscillatorNode.type;
                    }
                    set type(t1) {
                        this._nativeOscillatorNode.type = t1, null !== this._oscillatorNodeRenderer && (this._oscillatorNodeRenderer.periodicWave = null);
                    }
                    setPeriodicWave(t1) {
                        this._nativeOscillatorNode.setPeriodicWave(t1), null !== this._oscillatorNodeRenderer && (this._oscillatorNodeRenderer.periodicWave = t1);
                    }
                    start(t1 = 0) {
                        if (this._nativeOscillatorNode.start(t1), null !== this._oscillatorNodeRenderer && (this._oscillatorNodeRenderer.start = t1), "closed" !== this.context.state) {
                            C(this);
                            const t1 = ()=>{
                                this._nativeOscillatorNode.removeEventListener("ended", t1), P(this) && D(this);
                            };
                            this._nativeOscillatorNode.addEventListener("ended", t1);
                        }
                    }
                    stop(t1 = 0) {
                        this._nativeOscillatorNode.stop(t1), null !== this._oscillatorNodeRenderer && (this._oscillatorNodeRenderer.stop = t1);
                    }
                })(Ze, ps, Js, ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    let r = null, a = null, c = null;
                    return {
                        set periodicWave (t){
                            r = t;
                        },
                        set start (t){
                            a = t;
                        },
                        set stop (t){
                            c = t;
                        },
                        render (h, u, l) {
                            const p = o.get(u);
                            return void 0 !== p ? Promise.resolve(p) : (async (h, u, l)=>{
                                let p = s1(h);
                                const d = E(p, u);
                                if (!d) {
                                    const t1 = {
                                        channelCount: p.channelCount,
                                        channelCountMode: p.channelCountMode,
                                        channelInterpretation: p.channelInterpretation,
                                        detune: p.detune.value,
                                        frequency: p.frequency.value,
                                        periodicWave: null === r ? void 0 : r,
                                        type: p.type
                                    };
                                    p = e(u, t1), null !== a && p.start(a), null !== c && p.stop(c);
                                }
                                return o.set(u, p), d ? (await t1(u, h.detune, p.detune, l), await t1(u, h.frequency, p.frequency, l)) : (await n(u, h.detune, p.detune, l), await n(u, h.frequency, p.frequency, l)), await i(h, u, p, l), p;
                            })(h, u, l);
                        }
                    };
                })(as, Js, st, us, Oe), Fe, Ne, de), tn = (en = cs, (t1, e)=>{
                const s1 = en(t1, {
                    buffer: null,
                    channelCount: 2,
                    channelCountMode: "max",
                    channelInterpretation: "speakers",
                    loop: !1,
                    loopEnd: 0,
                    loopStart: 0,
                    playbackRate: 1
                }), n = t1.createBuffer(1, 2, 44100);
                return s1.buffer = n, s1.loop = !0, s1.connect(e), s1.start(), ()=>{
                    s1.stop(), s1.disconnect(e);
                };
            });
            var en;
            const sn = ((t1, e, s1, n, i)=>(o, { curve: r, oversample: a, ...c })=>{
                    const h = o.createWaveShaper(), u = o.createWaveShaper();
                    It(h, c), It(u, c);
                    const l = s1(o, {
                        ...c,
                        gain: 1
                    }), p = s1(o, {
                        ...c,
                        gain: -1
                    }), d = s1(o, {
                        ...c,
                        gain: 1
                    }), f = s1(o, {
                        ...c,
                        gain: -1
                    });
                    let _ = null, m = !1, g = null;
                    const v = {
                        get bufferSize () {},
                        get channelCount () {
                            return h.channelCount;
                        },
                        set channelCount (t){
                            l.channelCount = t, p.channelCount = t, h.channelCount = t, d.channelCount = t, u.channelCount = t, f.channelCount = t;
                        },
                        get channelCountMode () {
                            return h.channelCountMode;
                        },
                        set channelCountMode (t){
                            l.channelCountMode = t, p.channelCountMode = t, h.channelCountMode = t, d.channelCountMode = t, u.channelCountMode = t, f.channelCountMode = t;
                        },
                        get channelInterpretation () {
                            return h.channelInterpretation;
                        },
                        set channelInterpretation (t){
                            l.channelInterpretation = t, p.channelInterpretation = t, h.channelInterpretation = t, d.channelInterpretation = t, u.channelInterpretation = t, f.channelInterpretation = t;
                        },
                        get context () {
                            return h.context;
                        },
                        get curve () {
                            return g;
                        },
                        set curve (s){
                            if (null !== s && s.length < 2) throw e();
                            if (null === s) h.curve = s, u.curve = s;
                            else {
                                const t1 = s.length, e = new Float32Array(t1 + 2 - t1 % 2), n = new Float32Array(t1 + 2 - t1 % 2);
                                e[0] = s[0], n[0] = -s[t1 - 1];
                                const i = Math.ceil((t1 + 1) / 2), o = (t1 + 1) / 2 - 1;
                                for(let r = 1; r < i; r += 1){
                                    const a = r / i * o, c = Math.floor(a), h = Math.ceil(a);
                                    e[r] = c === h ? s[c] : (1 - (a - c)) * s[c] + (1 - (h - a)) * s[h], n[r] = c === h ? -s[t1 - 1 - c] : -(1 - (a - c)) * s[t1 - 1 - c] - (1 - (h - a)) * s[t1 - 1 - h];
                                }
                                e[i] = t1 % 2 == 1 ? s[i - 1] : (s[i - 2] + s[i - 1]) / 2, h.curve = e, u.curve = n;
                            }
                            g = s, m && (n(g) && null === _ ? _ = t1(o, l) : null !== _ && (_(), _ = null));
                        },
                        get inputs () {
                            return [
                                l
                            ];
                        },
                        get numberOfInputs () {
                            return h.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return h.numberOfOutputs;
                        },
                        get oversample () {
                            return h.oversample;
                        },
                        set oversample (t){
                            h.oversample = t, u.oversample = t;
                        },
                        addEventListener: (...t1)=>l.addEventListener(t1[0], t1[1], t1[2]),
                        dispatchEvent: (...t1)=>l.dispatchEvent(t1[0]),
                        removeEventListener: (...t1)=>l.removeEventListener(t1[0], t1[1], t1[2])
                    };
                    null !== r && (v.curve = r instanceof Float32Array ? r : new Float32Array(r)), a !== v.oversample && (v.oversample = a);
                    return i(Gt(v, d), ()=>{
                        l.connect(h).connect(d), l.connect(p).connect(u).connect(f).connect(d), m = !0, n(g) && (_ = t1(o, l));
                    }, ()=>{
                        l.disconnect(h), h.disconnect(d), l.disconnect(p), p.disconnect(u), u.disconnect(f), f.disconnect(d), m = !1, null !== _ && (_(), _ = null);
                    });
                })(tn, At, Qt, ie, As), nn = ((t1, e, s1, n, i, o, r)=>(a, c)=>{
                    const h = a.createWaveShaper();
                    if (null !== o && "webkitAudioContext" === o.name && void 0 === a.createGain().gain.automationRate) return s1(a, c);
                    It(h, c);
                    const u = null === c.curve || c.curve instanceof Float32Array ? c.curve : new Float32Array(c.curve);
                    if (null !== u && u.length < 2) throw e();
                    Ft(h, {
                        curve: u
                    }, "curve"), Ft(h, c, "oversample");
                    let l = null, p = !1;
                    r(h, "curve", (t1)=>()=>t1.call(h), (e)=>(s1)=>(e.call(h, s1), p && (n(s1) && null === l ? l = t1(a, h) : n(s1) || null === l || (l(), l = null)), s1));
                    return i(h, ()=>{
                        p = !0, n(h.curve) && (l = t1(a, h));
                    }, ()=>{
                        p = !1, null !== l && (l(), l = null);
                    });
                })(tn, At, sn, ie, As, Be, oe), on = ((t1, e, s1, n, i, o, r, a, c)=>(h, { coneInnerAngle: u, coneOuterAngle: l, coneOuterGain: p, distanceModel: d, maxDistance: f, orientationX: _, orientationY: m, orientationZ: g, panningModel: v, positionX: y, positionY: x, positionZ: w, refDistance: b, rolloffFactor: T, ...S })=>{
                    const k = h.createPanner();
                    if (S.channelCount > 2) throw r();
                    if ("max" === S.channelCountMode) throw r();
                    It(k, S);
                    const C = {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete"
                    }, A = s1(h, {
                        ...C,
                        channelInterpretation: "speakers",
                        numberOfInputs: 6
                    }), D = n(h, {
                        ...S,
                        gain: 1
                    }), O = n(h, {
                        ...C,
                        gain: 1
                    }), M = n(h, {
                        ...C,
                        gain: 0
                    }), E = n(h, {
                        ...C,
                        gain: 0
                    }), R = n(h, {
                        ...C,
                        gain: 0
                    }), q = n(h, {
                        ...C,
                        gain: 0
                    }), F = n(h, {
                        ...C,
                        gain: 0
                    }), I = i(h, 256, 6, 1), V = o(h, {
                        ...C,
                        curve: new Float32Array([
                            1,
                            1
                        ]),
                        oversample: "none"
                    });
                    let N = [
                        _,
                        m,
                        g
                    ], P = [
                        y,
                        x,
                        w
                    ];
                    I.onaudioprocess = ({ inputBuffer: t1 })=>{
                        const e = [
                            t1.getChannelData(0)[0],
                            t1.getChannelData(1)[0],
                            t1.getChannelData(2)[0]
                        ];
                        e.some((t1, e)=>t1 !== N[e]) && (k.setOrientation(...e), N = e);
                        const s1 = [
                            t1.getChannelData(3)[0],
                            t1.getChannelData(4)[0],
                            t1.getChannelData(5)[0]
                        ];
                        s1.some((t1, e)=>t1 !== P[e]) && (k.setPosition(...s1), P = s1);
                    }, Object.defineProperty(M.gain, "defaultValue", {
                        get: ()=>0
                    }), Object.defineProperty(E.gain, "defaultValue", {
                        get: ()=>0
                    }), Object.defineProperty(R.gain, "defaultValue", {
                        get: ()=>0
                    }), Object.defineProperty(q.gain, "defaultValue", {
                        get: ()=>0
                    }), Object.defineProperty(F.gain, "defaultValue", {
                        get: ()=>0
                    });
                    const j = {
                        get bufferSize () {},
                        get channelCount () {
                            return k.channelCount;
                        },
                        set channelCount (t){
                            if (t > 2) throw r();
                            D.channelCount = t, k.channelCount = t;
                        },
                        get channelCountMode () {
                            return k.channelCountMode;
                        },
                        set channelCountMode (t){
                            if ("max" === t) throw r();
                            D.channelCountMode = t, k.channelCountMode = t;
                        },
                        get channelInterpretation () {
                            return k.channelInterpretation;
                        },
                        set channelInterpretation (t){
                            D.channelInterpretation = t, k.channelInterpretation = t;
                        },
                        get coneInnerAngle () {
                            return k.coneInnerAngle;
                        },
                        set coneInnerAngle (t){
                            k.coneInnerAngle = t;
                        },
                        get coneOuterAngle () {
                            return k.coneOuterAngle;
                        },
                        set coneOuterAngle (t){
                            k.coneOuterAngle = t;
                        },
                        get coneOuterGain () {
                            return k.coneOuterGain;
                        },
                        set coneOuterGain (t){
                            if (t < 0 || t > 1) throw e();
                            k.coneOuterGain = t;
                        },
                        get context () {
                            return k.context;
                        },
                        get distanceModel () {
                            return k.distanceModel;
                        },
                        set distanceModel (t){
                            k.distanceModel = t;
                        },
                        get inputs () {
                            return [
                                D
                            ];
                        },
                        get maxDistance () {
                            return k.maxDistance;
                        },
                        set maxDistance (t){
                            if (t < 0) throw new RangeError;
                            k.maxDistance = t;
                        },
                        get numberOfInputs () {
                            return k.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return k.numberOfOutputs;
                        },
                        get orientationX () {
                            return O.gain;
                        },
                        get orientationY () {
                            return M.gain;
                        },
                        get orientationZ () {
                            return E.gain;
                        },
                        get panningModel () {
                            return k.panningModel;
                        },
                        set panningModel (t){
                            k.panningModel = t;
                        },
                        get positionX () {
                            return R.gain;
                        },
                        get positionY () {
                            return q.gain;
                        },
                        get positionZ () {
                            return F.gain;
                        },
                        get refDistance () {
                            return k.refDistance;
                        },
                        set refDistance (t){
                            if (t < 0) throw new RangeError;
                            k.refDistance = t;
                        },
                        get rolloffFactor () {
                            return k.rolloffFactor;
                        },
                        set rolloffFactor (t){
                            if (t < 0) throw new RangeError;
                            k.rolloffFactor = t;
                        },
                        addEventListener: (...t1)=>D.addEventListener(t1[0], t1[1], t1[2]),
                        dispatchEvent: (...t1)=>D.dispatchEvent(t1[0]),
                        removeEventListener: (...t1)=>D.removeEventListener(t1[0], t1[1], t1[2])
                    };
                    u !== j.coneInnerAngle && (j.coneInnerAngle = u), l !== j.coneOuterAngle && (j.coneOuterAngle = l), p !== j.coneOuterGain && (j.coneOuterGain = p), d !== j.distanceModel && (j.distanceModel = d), f !== j.maxDistance && (j.maxDistance = f), _ !== j.orientationX.value && (j.orientationX.value = _), m !== j.orientationY.value && (j.orientationY.value = m), g !== j.orientationZ.value && (j.orientationZ.value = g), v !== j.panningModel && (j.panningModel = v), y !== j.positionX.value && (j.positionX.value = y), x !== j.positionY.value && (j.positionY.value = x), w !== j.positionZ.value && (j.positionZ.value = w), b !== j.refDistance && (j.refDistance = b), T !== j.rolloffFactor && (j.rolloffFactor = T), 1 === N[0] && 0 === N[1] && 0 === N[2] || k.setOrientation(...N), 0 === P[0] && 0 === P[1] && 0 === P[2] || k.setPosition(...P);
                    return c(Gt(j, k), ()=>{
                        D.connect(k), t1(D, V, 0, 0), V.connect(O).connect(A, 0, 0), V.connect(M).connect(A, 0, 1), V.connect(E).connect(A, 0, 2), V.connect(R).connect(A, 0, 3), V.connect(q).connect(A, 0, 4), V.connect(F).connect(A, 0, 5), A.connect(I).connect(h.destination);
                    }, ()=>{
                        D.disconnect(k), a(D, V, 0, 0), V.disconnect(O), O.disconnect(A), V.disconnect(M), M.disconnect(A), V.disconnect(E), E.disconnect(A), V.disconnect(R), R.disconnect(A), V.disconnect(q), q.disconnect(A), V.disconnect(F), F.disconnect(A), A.disconnect(I), I.disconnect(h.destination);
                    });
                })($, At, Es, Qt, Yt, nn, Ht, et, As), rn = (an = on, (t1, e)=>{
                const s1 = t1.createPanner();
                return void 0 === s1.orientationX ? an(t1, e) : (It(s1, e), Nt(s1, e, "orientationX"), Nt(s1, e, "orientationY"), Nt(s1, e, "orientationZ"), Nt(s1, e, "positionX"), Nt(s1, e, "positionY"), Nt(s1, e, "positionZ"), Ft(s1, e, "coneInnerAngle"), Ft(s1, e, "coneOuterAngle"), Ft(s1, e, "coneOuterGain"), Ft(s1, e, "distanceModel"), Ft(s1, e, "maxDistance"), Ft(s1, e, "panningModel"), Ft(s1, e, "refDistance"), Ft(s1, e, "rolloffFactor"), s1);
            });
            var an;
            const cn = ((t1, e, s1, n, i, o, r)=>class extends t1 {
                    constructor(t1, a){
                        const c = i(t1), h = {
                            ...Kt,
                            ...a
                        }, u = s1(c, h), l = o(c);
                        super(t1, !1, u, l ? n() : null), this._nativePannerNode = u, this._orientationX = e(this, l, u.orientationX, N, V), this._orientationY = e(this, l, u.orientationY, N, V), this._orientationZ = e(this, l, u.orientationZ, N, V), this._positionX = e(this, l, u.positionX, N, V), this._positionY = e(this, l, u.positionY, N, V), this._positionZ = e(this, l, u.positionZ, N, V), r(this, 1);
                    }
                    get coneInnerAngle() {
                        return this._nativePannerNode.coneInnerAngle;
                    }
                    set coneInnerAngle(t1) {
                        this._nativePannerNode.coneInnerAngle = t1;
                    }
                    get coneOuterAngle() {
                        return this._nativePannerNode.coneOuterAngle;
                    }
                    set coneOuterAngle(t1) {
                        this._nativePannerNode.coneOuterAngle = t1;
                    }
                    get coneOuterGain() {
                        return this._nativePannerNode.coneOuterGain;
                    }
                    set coneOuterGain(t1) {
                        this._nativePannerNode.coneOuterGain = t1;
                    }
                    get distanceModel() {
                        return this._nativePannerNode.distanceModel;
                    }
                    set distanceModel(t1) {
                        this._nativePannerNode.distanceModel = t1;
                    }
                    get maxDistance() {
                        return this._nativePannerNode.maxDistance;
                    }
                    set maxDistance(t1) {
                        this._nativePannerNode.maxDistance = t1;
                    }
                    get orientationX() {
                        return this._orientationX;
                    }
                    get orientationY() {
                        return this._orientationY;
                    }
                    get orientationZ() {
                        return this._orientationZ;
                    }
                    get panningModel() {
                        return this._nativePannerNode.panningModel;
                    }
                    set panningModel(t1) {
                        this._nativePannerNode.panningModel = t1;
                    }
                    get positionX() {
                        return this._positionX;
                    }
                    get positionY() {
                        return this._positionY;
                    }
                    get positionZ() {
                        return this._positionZ;
                    }
                    get refDistance() {
                        return this._nativePannerNode.refDistance;
                    }
                    set refDistance(t1) {
                        this._nativePannerNode.refDistance = t1;
                    }
                    get rolloffFactor() {
                        return this._nativePannerNode.rolloffFactor;
                    }
                    set rolloffFactor(t1) {
                        this._nativePannerNode.rolloffFactor = t1;
                    }
                })(Ze, ps, rn, ((t1, e, s1, n, i, o, r, a, c, h)=>()=>{
                    const u = new WeakMap;
                    let l = null;
                    return {
                        render (p, d, f) {
                            const _ = u.get(d);
                            return void 0 !== _ ? Promise.resolve(_) : (async (p, d, f)=>{
                                let _ = null, m = o(p);
                                const g = {
                                    channelCount: m.channelCount,
                                    channelCountMode: m.channelCountMode,
                                    channelInterpretation: m.channelInterpretation
                                }, v = {
                                    ...g,
                                    coneInnerAngle: m.coneInnerAngle,
                                    coneOuterAngle: m.coneOuterAngle,
                                    coneOuterGain: m.coneOuterGain,
                                    distanceModel: m.distanceModel,
                                    maxDistance: m.maxDistance,
                                    panningModel: m.panningModel,
                                    refDistance: m.refDistance,
                                    rolloffFactor: m.rolloffFactor
                                }, y = E(m, d);
                                if ("bufferSize" in m) _ = n(d, {
                                    ...g,
                                    gain: 1
                                });
                                else if (!y) {
                                    const t1 = {
                                        ...v,
                                        orientationX: m.orientationX.value,
                                        orientationY: m.orientationY.value,
                                        orientationZ: m.orientationZ.value,
                                        positionX: m.positionX.value,
                                        positionY: m.positionY.value,
                                        positionZ: m.positionZ.value
                                    };
                                    m = i(d, t1);
                                }
                                if (u.set(d, null === _ ? m : _), null !== _) {
                                    if (null === l) {
                                        if (null === r) throw new Error("Missing the native OfflineAudioContext constructor.");
                                        const t1 = new r(6, p.context.length, d.sampleRate), n = e(t1, {
                                            channelCount: 1,
                                            channelCountMode: "explicit",
                                            channelInterpretation: "speakers",
                                            numberOfInputs: 6
                                        });
                                        n.connect(t1.destination), l = (async ()=>{
                                            const e = await Promise.all([
                                                p.orientationX,
                                                p.orientationY,
                                                p.orientationZ,
                                                p.positionX,
                                                p.positionY,
                                                p.positionZ
                                            ].map(async (e, n)=>{
                                                const i = s1(t1, {
                                                    channelCount: 1,
                                                    channelCountMode: "explicit",
                                                    channelInterpretation: "discrete",
                                                    offset: 0 === n ? 1 : 0
                                                });
                                                return await a(t1, e, i.offset, f), i;
                                            }));
                                            for(let t1 = 0; t1 < 6; t1 += 1)e[t1].connect(n, 0, t1), e[t1].start(0);
                                            return h(t1);
                                        })();
                                    }
                                    const t1 = await l, o = n(d, {
                                        ...g,
                                        gain: 1
                                    });
                                    await c(p, d, o, f);
                                    const u = [];
                                    for(let e = 0; e < t1.numberOfChannels; e += 1)u.push(t1.getChannelData(e));
                                    let m = [
                                        u[0][0],
                                        u[1][0],
                                        u[2][0]
                                    ], y = [
                                        u[3][0],
                                        u[4][0],
                                        u[5][0]
                                    ], x = n(d, {
                                        ...g,
                                        gain: 1
                                    }), w = i(d, {
                                        ...v,
                                        orientationX: m[0],
                                        orientationY: m[1],
                                        orientationZ: m[2],
                                        positionX: y[0],
                                        positionY: y[1],
                                        positionZ: y[2]
                                    });
                                    o.connect(x).connect(w.inputs[0]), w.connect(_);
                                    for(let e = 128; e < t1.length; e += 128){
                                        const t1 = [
                                            u[0][e],
                                            u[1][e],
                                            u[2][e]
                                        ], s1 = [
                                            u[3][e],
                                            u[4][e],
                                            u[5][e]
                                        ];
                                        if (t1.some((t1, e)=>t1 !== m[e]) || s1.some((t1, e)=>t1 !== y[e])) {
                                            m = t1, y = s1;
                                            const r = e / d.sampleRate;
                                            x.gain.setValueAtTime(0, r), x = n(d, {
                                                ...g,
                                                gain: 0
                                            }), w = i(d, {
                                                ...v,
                                                orientationX: m[0],
                                                orientationY: m[1],
                                                orientationZ: m[2],
                                                positionX: y[0],
                                                positionY: y[1],
                                                positionZ: y[2]
                                            }), x.gain.setValueAtTime(1, r), o.connect(x).connect(w.inputs[0]), w.connect(_);
                                        }
                                    }
                                    return _;
                                }
                                return y ? (await t1(d, p.orientationX, m.orientationX, f), await t1(d, p.orientationY, m.orientationY, f), await t1(d, p.orientationZ, m.orientationZ, f), await t1(d, p.positionX, m.positionX, f), await t1(d, p.positionY, m.positionY, f), await t1(d, p.positionZ, m.positionZ, f)) : (await a(d, p.orientationX, m.orientationX, f), await a(d, p.orientationY, m.orientationY, f), await a(d, p.orientationZ, m.orientationZ, f), await a(d, p.positionX, m.positionX, f), await a(d, p.positionY, m.positionY, f), await a(d, p.positionZ, m.positionZ, f)), H(m) ? await c(p, d, m.inputs[0], f) : await c(p, d, m, f), m;
                            })(p, d, f);
                        }
                    };
                })(as, Es, Is, Qt, rn, st, Ve, us, Oe, Us), Fe, Ne, gs), hn = ((t1, e, s1, n)=>class i {
                    constructor(i, o){
                        const r = e(i), a = n({
                            ...te,
                            ...o
                        }), c = t1(r, a);
                        return s1.add(c), c;
                    }
                    static [Symbol.hasInstance](t1) {
                        return null !== t1 && "object" == typeof t1 && Object.getPrototypeOf(t1) === i.prototype || s1.has(t1);
                    }
                })(((t1)=>(e, { disableNormalization: s1, imag: n, real: i })=>{
                    const o = n instanceof Float32Array ? n : new Float32Array(n), r = i instanceof Float32Array ? i : new Float32Array(i), a = e.createPeriodicWave(r, o, {
                        disableNormalization: s1
                    });
                    if (Array.from(n).length < 2) throw t1();
                    return a;
                })(q), Fe, new WeakSet, (t1)=>{
                const { imag: e, real: s1 } = t1;
                return void 0 === e ? void 0 === s1 ? {
                    ...t1,
                    imag: [
                        0,
                        0
                    ],
                    real: [
                        0,
                        0
                    ]
                } : {
                    ...t1,
                    imag: Array.from(s1, ()=>0),
                    real: s1
                } : void 0 === s1 ? {
                    ...t1,
                    imag: e,
                    real: Array.from(e, ()=>0)
                } : {
                    ...t1,
                    imag: e,
                    real: s1
                };
            }), un = ((t1, e)=>(s1, n)=>{
                    const i = n.channelCountMode;
                    if ("clamped-max" === i) throw e();
                    if (void 0 === s1.createStereoPanner) return t1(s1, n);
                    const o = s1.createStereoPanner();
                    return It(o, n), Nt(o, n, "pan"), Object.defineProperty(o, "channelCountMode", {
                        get: ()=>i,
                        set: (t1)=>{
                            if (t1 !== i) throw e();
                        }
                    }), o;
                })(((t1, e, s1, n, i, o)=>{
                const r = new Float32Array([
                    1,
                    1
                ]), a = Math.PI / 2, c = {
                    channelCount: 1,
                    channelCountMode: "explicit",
                    channelInterpretation: "discrete"
                }, h = {
                    ...c,
                    oversample: "none"
                }, u = (t1, o, u, l, p)=>{
                    if (1 === o) return ((t1, e, i, o)=>{
                        const u = new Float32Array(16385), l = new Float32Array(16385);
                        for(let t1 = 0; t1 < 16385; t1 += 1){
                            const e = t1 / 16384 * a;
                            u[t1] = Math.cos(e), l[t1] = Math.sin(e);
                        }
                        const p = s1(t1, {
                            ...c,
                            gain: 0
                        }), d = n(t1, {
                            ...h,
                            curve: u
                        }), f = n(t1, {
                            ...h,
                            curve: r
                        }), _ = s1(t1, {
                            ...c,
                            gain: 0
                        }), m = n(t1, {
                            ...h,
                            curve: l
                        });
                        return {
                            connectGraph () {
                                e.connect(p), e.connect(void 0 === f.inputs ? f : f.inputs[0]), e.connect(_), f.connect(i), i.connect(void 0 === d.inputs ? d : d.inputs[0]), i.connect(void 0 === m.inputs ? m : m.inputs[0]), d.connect(p.gain), m.connect(_.gain), p.connect(o, 0, 0), _.connect(o, 0, 1);
                            },
                            disconnectGraph () {
                                e.disconnect(p), e.disconnect(void 0 === f.inputs ? f : f.inputs[0]), e.disconnect(_), f.disconnect(i), i.disconnect(void 0 === d.inputs ? d : d.inputs[0]), i.disconnect(void 0 === m.inputs ? m : m.inputs[0]), d.disconnect(p.gain), m.disconnect(_.gain), p.disconnect(o, 0, 0), _.disconnect(o, 0, 1);
                            }
                        };
                    })(t1, u, l, p);
                    if (2 === o) return ((t1, i, o, u)=>{
                        const l = new Float32Array(16385), p = new Float32Array(16385), d = new Float32Array(16385), f = new Float32Array(16385), _ = Math.floor(8192.5);
                        for(let t1 = 0; t1 < 16385; t1 += 1)if (t1 > _) {
                            const e = (t1 - _) / (16384 - _) * a;
                            l[t1] = Math.cos(e), p[t1] = Math.sin(e), d[t1] = 0, f[t1] = 1;
                        } else {
                            const e = t1 / (16384 - _) * a;
                            l[t1] = 1, p[t1] = 0, d[t1] = Math.cos(e), f[t1] = Math.sin(e);
                        }
                        const m = e(t1, {
                            channelCount: 2,
                            channelCountMode: "explicit",
                            channelInterpretation: "discrete",
                            numberOfOutputs: 2
                        }), g = s1(t1, {
                            ...c,
                            gain: 0
                        }), v = n(t1, {
                            ...h,
                            curve: l
                        }), y = s1(t1, {
                            ...c,
                            gain: 0
                        }), x = n(t1, {
                            ...h,
                            curve: p
                        }), w = n(t1, {
                            ...h,
                            curve: r
                        }), b = s1(t1, {
                            ...c,
                            gain: 0
                        }), T = n(t1, {
                            ...h,
                            curve: d
                        }), S = s1(t1, {
                            ...c,
                            gain: 0
                        }), k = n(t1, {
                            ...h,
                            curve: f
                        });
                        return {
                            connectGraph () {
                                i.connect(m), i.connect(void 0 === w.inputs ? w : w.inputs[0]), m.connect(g, 0), m.connect(y, 0), m.connect(b, 1), m.connect(S, 1), w.connect(o), o.connect(void 0 === v.inputs ? v : v.inputs[0]), o.connect(void 0 === x.inputs ? x : x.inputs[0]), o.connect(void 0 === T.inputs ? T : T.inputs[0]), o.connect(void 0 === k.inputs ? k : k.inputs[0]), v.connect(g.gain), x.connect(y.gain), T.connect(b.gain), k.connect(S.gain), g.connect(u, 0, 0), b.connect(u, 0, 0), y.connect(u, 0, 1), S.connect(u, 0, 1);
                            },
                            disconnectGraph () {
                                i.disconnect(m), i.disconnect(void 0 === w.inputs ? w : w.inputs[0]), m.disconnect(g, 0), m.disconnect(y, 0), m.disconnect(b, 1), m.disconnect(S, 1), w.disconnect(o), o.disconnect(void 0 === v.inputs ? v : v.inputs[0]), o.disconnect(void 0 === x.inputs ? x : x.inputs[0]), o.disconnect(void 0 === T.inputs ? T : T.inputs[0]), o.disconnect(void 0 === k.inputs ? k : k.inputs[0]), v.disconnect(g.gain), x.disconnect(y.gain), T.disconnect(b.gain), k.disconnect(S.gain), g.disconnect(u, 0, 0), b.disconnect(u, 0, 0), y.disconnect(u, 0, 1), S.disconnect(u, 0, 1);
                            }
                        };
                    })(t1, u, l, p);
                    throw i();
                };
                return (e, { channelCount: n, channelCountMode: r, pan: a, ...c })=>{
                    if ("max" === r) throw i();
                    const h = t1(e, {
                        ...c,
                        channelCount: 1,
                        channelCountMode: r,
                        numberOfInputs: 2
                    }), l = s1(e, {
                        ...c,
                        channelCount: n,
                        channelCountMode: r,
                        gain: 1
                    }), p = s1(e, {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete",
                        gain: a
                    });
                    let { connectGraph: d, disconnectGraph: f } = u(e, n, l, p, h);
                    Object.defineProperty(p.gain, "defaultValue", {
                        get: ()=>0
                    }), Object.defineProperty(p.gain, "maxValue", {
                        get: ()=>1
                    }), Object.defineProperty(p.gain, "minValue", {
                        get: ()=>-1
                    });
                    const _ = {
                        get bufferSize () {},
                        get channelCount () {
                            return l.channelCount;
                        },
                        set channelCount (t){
                            l.channelCount !== t && (m && f(), { connectGraph: d, disconnectGraph: f } = u(e, t, l, p, h), m && d()), l.channelCount = t;
                        },
                        get channelCountMode () {
                            return l.channelCountMode;
                        },
                        set channelCountMode (t){
                            if ("clamped-max" === t || "max" === t) throw i();
                            l.channelCountMode = t;
                        },
                        get channelInterpretation () {
                            return l.channelInterpretation;
                        },
                        set channelInterpretation (t){
                            l.channelInterpretation = t;
                        },
                        get context () {
                            return l.context;
                        },
                        get inputs () {
                            return [
                                l
                            ];
                        },
                        get numberOfInputs () {
                            return l.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return l.numberOfOutputs;
                        },
                        get pan () {
                            return p.gain;
                        },
                        addEventListener: (...t1)=>l.addEventListener(t1[0], t1[1], t1[2]),
                        dispatchEvent: (...t1)=>l.dispatchEvent(t1[0]),
                        removeEventListener: (...t1)=>l.removeEventListener(t1[0], t1[1], t1[2])
                    };
                    let m = !1;
                    return o(Gt(_, h), ()=>{
                        d(), m = !0;
                    }, ()=>{
                        f(), m = !1;
                    });
                };
            })(Es, Wt, Qt, nn, Ht, As), Ht), ln = ((t1, e, s1, n, i, o)=>class extends t1 {
                    constructor(t1, r){
                        const a = i(t1), c = {
                            ...ee,
                            ...r
                        }, h = s1(a, c), u = o(a);
                        super(t1, !1, h, u ? n() : null), this._pan = e(this, u, h.pan);
                    }
                    get pan() {
                        return this._pan;
                    }
                })(Ze, ps, un, ((t1, e, s1, n, i)=>()=>{
                    const o = new WeakMap;
                    return {
                        render (r, a, c) {
                            const h = o.get(a);
                            return void 0 !== h ? Promise.resolve(h) : (async (r, a, c)=>{
                                let h = s1(r);
                                const u = E(h, a);
                                if (!u) {
                                    const t1 = {
                                        channelCount: h.channelCount,
                                        channelCountMode: h.channelCountMode,
                                        channelInterpretation: h.channelInterpretation,
                                        pan: h.pan.value
                                    };
                                    h = e(a, t1);
                                }
                                return o.set(a, h), u ? await t1(a, r.pan, h.pan, c) : await n(a, r.pan, h.pan, c), H(h) ? await i(r, a, h.inputs[0], c) : await i(r, a, h, c), h;
                            })(r, a, c);
                        }
                    };
                })(as, un, st, us, Oe), Fe, Ne), pn = ((t1, e, s1)=>()=>{
                    const n = new WeakMap;
                    return {
                        render (i, o, r) {
                            const a = n.get(o);
                            return void 0 !== a ? Promise.resolve(a) : (async (i, o, r)=>{
                                let a = e(i);
                                if (!E(a, o)) {
                                    const e = {
                                        channelCount: a.channelCount,
                                        channelCountMode: a.channelCountMode,
                                        channelInterpretation: a.channelInterpretation,
                                        curve: a.curve,
                                        oversample: a.oversample
                                    };
                                    a = t1(o, e);
                                }
                                return n.set(o, a), H(a) ? await s1(i, o, a.inputs[0], r) : await s1(i, o, a, r), a;
                            })(i, o, r);
                        }
                    };
                })(nn, st, Oe), dn = ((t1, e, s1, n, i, o, r)=>class extends t1 {
                    constructor(t1, e){
                        const a = i(t1), c = {
                            ...ne,
                            ...e
                        }, h = s1(a, c);
                        super(t1, !0, h, o(a) ? n() : null), this._isCurveNullified = !1, this._nativeWaveShaperNode = h, r(this, 1);
                    }
                    get curve() {
                        return this._isCurveNullified ? null : this._nativeWaveShaperNode.curve;
                    }
                    set curve(t1) {
                        if (null === t1) this._isCurveNullified = !0, this._nativeWaveShaperNode.curve = new Float32Array([
                            0,
                            0
                        ]);
                        else {
                            if (t1.length < 2) throw e();
                            this._isCurveNullified = !1, this._nativeWaveShaperNode.curve = t1;
                        }
                    }
                    get oversample() {
                        return this._nativeWaveShaperNode.oversample;
                    }
                    set oversample(t1) {
                        this._nativeWaveShaperNode.oversample = t1;
                    }
                })(Ze, At, nn, pn, Fe, Ne, gs), fn = ((t1)=>null !== t1 && t1.isSecureContext)(Te), _n = ((t1)=>(e, s1, n)=>{
                    Object.defineProperties(t1, {
                        currentFrame: {
                            configurable: !0,
                            get: ()=>Math.round(e * s1)
                        },
                        currentTime: {
                            configurable: !0,
                            get: ()=>e
                        }
                    });
                    try {
                        return n();
                    } finally{
                        null !== t1 && (delete t1.currentFrame, delete t1.currentTime);
                    }
                })(Te), mn = new WeakMap, gn = ((t1, e)=>(s1)=>{
                    let n = t1.get(s1);
                    if (void 0 !== n) return n;
                    if (null === e) throw new Error("Missing the native OfflineAudioContext constructor.");
                    return n = new e(1, 1, 8e3), t1.set(s1, n), n;
                })(mn, Ve), vn = ((t1)=>null === t1 ? null : t1.hasOwnProperty("AudioWorkletNode") ? t1.AudioWorkletNode : null)(Te), yn = fn ? ((t1, e, s1, n, i, o, r, a, c, h, u, l)=>(p, d, f = {
                    credentials: "omit"
                })=>{
                    const m = o(p);
                    if (void 0 !== m.audioWorklet) return Promise.all([
                        i(d),
                        Promise.resolve(t1(u, u))
                    ]).then(([[t1, e], s1])=>{
                        const [n, i] = y(t1, e), o = s1 ? i : i.replace(/\s+extends\s+AudioWorkletProcessor\s*{/, " extends (class extends AudioWorkletProcessor {__b=new WeakSet();constructor(){super();(p=>p.postMessage=(q=>(m,t)=>q.call(p,m,t?t.filter(u=>!this.__b.has(u)):t))(p.postMessage))(this.port)}}){"), c = new Blob([
                            `${n};(registerProcessor=>{${o}\n})((n,p)=>registerProcessor(n,class extends p{${s1 ? "" : "__c = (a) => a.forEach(e=>this.__b.add(e.buffer));"}process(i,o,p){${s1 ? "" : "i.forEach(this.__c);o.forEach(this.__c);this.__c(Object.values(p));"}return super.process(i.map(j=>j.some(k=>k.length===0)?[]:j),o,p)}}))`
                        ], {
                            type: "application/javascript; charset=utf-8"
                        }), h = URL.createObjectURL(c);
                        return m.audioWorklet.addModule(h, f).then(()=>{
                            if (a(m)) return;
                            return r(m).audioWorklet.addModule(h, f);
                        }).finally(()=>URL.revokeObjectURL(h));
                    });
                    const g = h.get(p);
                    if (void 0 !== g && g.has(d)) return Promise.resolve();
                    const v = c.get(p);
                    if (void 0 !== v) {
                        const t1 = v.get(d);
                        if (void 0 !== t1) return t1;
                    }
                    const b = i(d).then(([t1, e])=>{
                        const [n, i] = y(t1, e);
                        return s1(`${n};((a,b)=>{(a[b]=a[b]||[]).push((AudioWorkletProcessor,global,registerProcessor,sampleRate,self,window)=>{${i}\n})})(window,'_AWGS')`);
                    }).then(()=>{
                        const t1 = l._AWGS.pop();
                        if (void 0 === t1) throw new SyntaxError;
                        n(m.currentTime, m.sampleRate, ()=>t1(class {
                            }, void 0, (t1, s1)=>{
                                if ("" === t1.trim()) throw e();
                                const n = _.get(m);
                                if (void 0 !== n) {
                                    if (n.has(t1)) throw e();
                                    w(s1), x(s1.parameterDescriptors), n.set(t1, s1);
                                } else w(s1), x(s1.parameterDescriptors), _.set(m, new Map([
                                    [
                                        t1,
                                        s1
                                    ]
                                ]));
                            }, m.sampleRate, void 0, void 0));
                    });
                    return void 0 === v ? c.set(p, new Map([
                        [
                            d,
                            b
                        ]
                    ])) : v.set(d, b), b.then(()=>{
                        const t1 = h.get(p);
                        void 0 === t1 ? h.set(p, new Set([
                            d
                        ])) : t1.add(d);
                    }).finally(()=>{
                        const t1 = c.get(p);
                        void 0 !== t1 && t1.delete(d);
                    }), b;
                })(xe, Ht, ((t1)=>(e)=>new Promise((s1, n)=>{
                        if (null === t1) return void n(new SyntaxError);
                        const i = t1.document.head;
                        if (null === i) n(new SyntaxError);
                        else {
                            const o = t1.document.createElement("script"), r = new Blob([
                                e
                            ], {
                                type: "application/javascript"
                            }), a = URL.createObjectURL(r), c = t1.onerror, h = ()=>{
                                t1.onerror = c, URL.revokeObjectURL(a);
                            };
                            t1.onerror = (e, s1, i, o, r)=>s1 === a || s1 === t1.location.href && 1 === i && 1 === o ? (h(), n(r), !1) : null !== c ? c(e, s1, i, o, r) : void 0, o.onerror = ()=>{
                                h(), n(new SyntaxError);
                            }, o.onload = ()=>{
                                h(), s1();
                            }, o.src = a, o.type = "module", i.appendChild(o);
                        }
                    }))(Te), _n, ((t1)=>async (e)=>{
                    try {
                        const t1 = await fetch(e);
                        if (t1.ok) return [
                            await t1.text(),
                            t1.url
                        ];
                    } catch  {}
                    throw t1();
                })(()=>new DOMException("", "AbortError")), Fe, gn, Ne, new WeakMap, new WeakMap, ((t1, e)=>async ()=>{
                    if (null === t1) return !0;
                    if (null === e) return !1;
                    const s1 = new Blob([
                        'class A extends AudioWorkletProcessor{process(i){this.port.postMessage(i,[i[0][0].buffer])}}registerProcessor("a",A)'
                    ], {
                        type: "application/javascript; charset=utf-8"
                    }), n = new e(1, 128, 8e3), i = URL.createObjectURL(s1);
                    let o = !1, r = !1;
                    try {
                        await n.audioWorklet.addModule(i);
                        const e = new t1(n, "a", {
                            numberOfOutputs: 0
                        }), s1 = n.createOscillator();
                        e.port.onmessage = ()=>o = !0, e.onprocessorerror = ()=>r = !0, s1.connect(e), await n.startRendering();
                    } catch  {} finally{
                        URL.revokeObjectURL(i);
                    }
                    return o && !r;
                })(vn, Ve), Te) : void 0, xn = ((t1, e)=>(s1)=>t1(s1) || e(s1))(We, Ne), wn = ((t1, e, s1, n, i, o, r, a, c, h, u, l, p, d, f, _, m, g, v, y)=>class extends f {
                    constructor(e, s1){
                        super(e, s1), this._nativeContext = e, this._audioWorklet = void 0 === t1 ? void 0 : {
                            addModule: (e, s1)=>t1(this, e, s1)
                        };
                    }
                    get audioWorklet() {
                        return this._audioWorklet;
                    }
                    createAnalyser() {
                        return new e(this);
                    }
                    createBiquadFilter() {
                        return new i(this);
                    }
                    createBuffer(t1, e, n) {
                        return new s1({
                            length: e,
                            numberOfChannels: t1,
                            sampleRate: n
                        });
                    }
                    createBufferSource() {
                        return new n(this);
                    }
                    createChannelMerger(t1 = 6) {
                        return new o(this, {
                            numberOfInputs: t1
                        });
                    }
                    createChannelSplitter(t1 = 6) {
                        return new r(this, {
                            numberOfOutputs: t1
                        });
                    }
                    createConstantSource() {
                        return new a(this);
                    }
                    createConvolver() {
                        return new c(this);
                    }
                    createDelay(t1 = 1) {
                        return new u(this, {
                            maxDelayTime: t1
                        });
                    }
                    createDynamicsCompressor() {
                        return new l(this);
                    }
                    createGain() {
                        return new p(this);
                    }
                    createIIRFilter(t1, e) {
                        return new d(this, {
                            feedback: e,
                            feedforward: t1
                        });
                    }
                    createOscillator() {
                        return new _(this);
                    }
                    createPanner() {
                        return new m(this);
                    }
                    createPeriodicWave(t1, e, s1 = {
                        disableNormalization: !1
                    }) {
                        return new g(this, {
                            ...s1,
                            imag: e,
                            real: t1
                        });
                    }
                    createStereoPanner() {
                        return new v(this);
                    }
                    createWaveShaper() {
                        return new y(this);
                    }
                    decodeAudioData(t1, e, s1) {
                        return h(this._nativeContext, t1).then((t1)=>("function" == typeof e && e(t1), t1)).catch((t1)=>{
                            throw "function" == typeof s1 && s1(t1), t1;
                        });
                    }
                })(yn, Ye, ss, fs, vs, Rs, qs, Vs, Ps, ((t1, e, s1, n, i, o, r, a, c, h, u)=>(l, p)=>{
                    const d = r(l) ? l : o(l);
                    if (i.has(p)) {
                        const t1 = s1();
                        return Promise.reject(t1);
                    }
                    try {
                        i.add(p);
                    } catch  {}
                    return e(c, ()=>c(d)) ? d.decodeAudioData(p).then((s1)=>(e(a, ()=>a(s1)) || u(s1), t1.add(s1), s1)) : new Promise((e, s1)=>{
                        const i = ()=>{
                            try {
                                ((t1)=>{
                                    const { port1: e } = new MessageChannel;
                                    e.postMessage(t1, [
                                        t1
                                    ]);
                                })(p);
                            } catch  {}
                        }, o = (t1)=>{
                            s1(t1), i();
                        };
                        try {
                            d.decodeAudioData(p, (s1)=>{
                                "function" != typeof s1.copyFromChannel && (h(s1), F(s1)), t1.add(s1), i(), e(s1);
                            }, (t1)=>{
                                o(null === t1 ? n() : t1);
                            });
                        } catch (t1) {
                            o(t1);
                        }
                    });
                })(He, xe, ()=>new DOMException("", "DataCloneError"), ()=>new DOMException("", "EncodingError"), new WeakSet, Fe, xn, R, Rt, ts, es), js, Bs, Ws, Xs, $s, Ks, cn, hn, ln, dn), bn = ((t1, e, s1, n)=>class extends t1 {
                    constructor(t1, i){
                        const o = s1(t1), r = e(o, i);
                        if (n(o)) throw TypeError();
                        super(t1, !0, r, null), this._nativeMediaElementAudioSourceNode = r;
                    }
                    get mediaElement() {
                        return this._nativeMediaElementAudioSourceNode.mediaElement;
                    }
                })(Ze, (t1, e)=>t1.createMediaElementSource(e.mediaElement), Fe, Ne), Tn = ((t1, e, s1, n)=>class extends t1 {
                    constructor(t1, i){
                        const o = s1(t1);
                        if (n(o)) throw new TypeError;
                        const r = {
                            ...Et,
                            ...i
                        }, a = e(o, r);
                        super(t1, !1, a, null), this._nativeMediaStreamAudioDestinationNode = a;
                    }
                    get stream() {
                        return this._nativeMediaStreamAudioDestinationNode.stream;
                    }
                })(Ze, (t1, e)=>{
                const s1 = t1.createMediaStreamDestination();
                return It(s1, e), 1 === s1.numberOfOutputs && Object.defineProperty(s1, "numberOfOutputs", {
                    get: ()=>0
                }), s1;
            }, Fe, Ne), Sn = ((t1, e, s1, n)=>class extends t1 {
                    constructor(t1, i){
                        const o = s1(t1), r = e(o, i);
                        if (n(o)) throw new TypeError;
                        super(t1, !0, r, null), this._nativeMediaStreamAudioSourceNode = r;
                    }
                    get mediaStream() {
                        return this._nativeMediaStreamAudioSourceNode.mediaStream;
                    }
                })(Ze, (t1, { mediaStream: e })=>{
                const s1 = e.getAudioTracks();
                s1.sort((t1, e)=>t1.id < e.id ? -1 : t1.id > e.id ? 1 : 0);
                const n = s1.slice(0, 1), i = t1.createMediaStreamSource(new MediaStream(n));
                return Object.defineProperty(i, "mediaStream", {
                    value: e
                }), i;
            }, Fe, Ne), kn = ((t1, e, s1)=>class extends t1 {
                    constructor(t1, n){
                        const i = s1(t1);
                        super(t1, !0, e(i, n), null);
                    }
                })(Ze, ((t1, e)=>(s1, { mediaStreamTrack: n })=>{
                    if ("function" == typeof s1.createMediaStreamTrackSource) return s1.createMediaStreamTrackSource(n);
                    const i = new MediaStream([
                        n
                    ]), o = s1.createMediaStreamSource(i);
                    if ("audio" !== n.kind) throw t1();
                    if (e(s1)) throw new TypeError;
                    return o;
                })(At, Ne), Fe), Cn = ((t1, e, s1, n, i, o, r, a, c)=>class extends t1 {
                    constructor(t1 = {}){
                        if (null === c) throw new Error("Missing the native AudioContext constructor.");
                        const e = new c(t1);
                        if (null === e) throw n();
                        if (!G(t1.latencyHint)) throw new TypeError(`The provided value '${t1.latencyHint}' is not a valid enum value of type AudioContextLatencyCategory.`);
                        if (void 0 !== t1.sampleRate && e.sampleRate !== t1.sampleRate) throw s1();
                        super(e, 2);
                        const { latencyHint: i } = t1, { sampleRate: o } = e;
                        if (this._baseLatency = "number" == typeof e.baseLatency ? e.baseLatency : "balanced" === i ? 512 / o : "interactive" === i || void 0 === i ? 256 / o : "playback" === i ? 1024 / o : 128 * Math.max(2, Math.min(128, Math.round(i * o / 128))) / o, this._nativeAudioContext = e, "webkitAudioContext" === c.name ? (this._nativeGainNode = e.createGain(), this._nativeOscillatorNode = e.createOscillator(), this._nativeGainNode.gain.value = 1e-37, this._nativeOscillatorNode.connect(this._nativeGainNode).connect(e.destination), this._nativeOscillatorNode.start()) : (this._nativeGainNode = null, this._nativeOscillatorNode = null), this._state = null, "running" === e.state) {
                            this._state = "suspended";
                            const t1 = ()=>{
                                "suspended" === this._state && (this._state = null), e.removeEventListener("statechange", t1);
                            };
                            e.addEventListener("statechange", t1);
                        }
                    }
                    get baseLatency() {
                        return this._baseLatency;
                    }
                    get state() {
                        return null !== this._state ? this._state : this._nativeAudioContext.state;
                    }
                    close() {
                        return "closed" === this.state ? this._nativeAudioContext.close().then(()=>{
                            throw e();
                        }) : ("suspended" === this._state && (this._state = null), this._nativeAudioContext.close().then(()=>{
                            null !== this._nativeGainNode && null !== this._nativeOscillatorNode && (this._nativeOscillatorNode.stop(), this._nativeGainNode.disconnect(), this._nativeOscillatorNode.disconnect()), W(this);
                        }));
                    }
                    createMediaElementSource(t1) {
                        return new i(this, {
                            mediaElement: t1
                        });
                    }
                    createMediaStreamDestination() {
                        return new o(this);
                    }
                    createMediaStreamSource(t1) {
                        return new r(this, {
                            mediaStream: t1
                        });
                    }
                    createMediaStreamTrackSource(t1) {
                        return new a(this, {
                            mediaStreamTrack: t1
                        });
                    }
                    resume() {
                        return "suspended" === this._state ? new Promise((t1, e)=>{
                            const s1 = ()=>{
                                this._nativeAudioContext.removeEventListener("statechange", s1), "running" === this._nativeAudioContext.state ? t1() : this.resume().then(t1, e);
                            };
                            this._nativeAudioContext.addEventListener("statechange", s1);
                        }) : this._nativeAudioContext.resume().catch((t1)=>{
                            if (void 0 === t1 || 15 === t1.code) throw e();
                            throw t1;
                        });
                    }
                    suspend() {
                        return this._nativeAudioContext.suspend().catch((t1)=>{
                            if (void 0 === t1) throw e();
                            throw t1;
                        });
                    }
                })(wn, At, Ht, se, bn, Tn, Sn, kn, Be), An = (Dn = Hs, (t1)=>{
                const e = Dn.get(t1);
                if (void 0 === e) throw new Error("The context has no set of AudioWorkletNodes.");
                return e;
            });
            var Dn;
            const On = (Mn = An, (t1, e)=>{
                Mn(t1).add(e);
            });
            var Mn;
            const En = ((t1)=>(e, s1, n = 0, i = 0)=>{
                    const o = e[n];
                    if (void 0 === o) throw t1();
                    return ct(s1) ? o.connect(s1, 0, i) : o.connect(s1, 0);
                })(q), Rn = ((t1)=>(e, s1)=>{
                    t1(e).delete(s1);
                })(An), qn = ((t1)=>(e, s1, n, i = 0)=>void 0 === s1 ? e.forEach((t1)=>t1.disconnect()) : "number" == typeof s1 ? St(t1, e, s1).disconnect() : ct(s1) ? void 0 === n ? e.forEach((t1)=>t1.disconnect(s1)) : void 0 === i ? St(t1, e, n).disconnect(s1, 0) : St(t1, e, n).disconnect(s1, 0, i) : void 0 === n ? e.forEach((t1)=>t1.disconnect(s1)) : St(t1, e, n).disconnect(s1, 0))(q), Fn = new WeakMap, In = ((t1, e)=>(s1)=>e(t1, s1))(Fn, b), Vn = ((t1, e, s1, n, i, o, r, a, c, h, u, l, p)=>(d, f, _, g)=>{
                    if (0 === g.numberOfInputs && 0 === g.numberOfOutputs) throw c();
                    const v = Array.isArray(g.outputChannelCount) ? g.outputChannelCount : Array.from(g.outputChannelCount);
                    if (v.some((t1)=>t1 < 1)) throw c();
                    if (v.length !== g.numberOfOutputs) throw e();
                    if ("explicit" !== g.channelCountMode) throw c();
                    const y = g.channelCount * g.numberOfInputs, x = v.reduce((t1, e)=>t1 + e, 0), w = void 0 === _.parameterDescriptors ? 0 : _.parameterDescriptors.length;
                    if (y + w > 6 || x > 6) throw c();
                    const b = new MessageChannel, T = [], S = [];
                    for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1)T.push(r(d, {
                        channelCount: g.channelCount,
                        channelCountMode: g.channelCountMode,
                        channelInterpretation: g.channelInterpretation,
                        gain: 1
                    })), S.push(i(d, {
                        channelCount: g.channelCount,
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete",
                        numberOfOutputs: g.channelCount
                    }));
                    const k = [];
                    if (void 0 !== _.parameterDescriptors) for (const { defaultValue: t1, maxValue: e, minValue: s1, name: n } of _.parameterDescriptors){
                        const i = o(d, {
                            channelCount: 1,
                            channelCountMode: "explicit",
                            channelInterpretation: "discrete",
                            offset: void 0 !== g.parameterData[n] ? g.parameterData[n] : void 0 === t1 ? 0 : t1
                        });
                        Object.defineProperties(i.offset, {
                            defaultValue: {
                                get: ()=>void 0 === t1 ? 0 : t1
                            },
                            maxValue: {
                                get: ()=>void 0 === e ? N : e
                            },
                            minValue: {
                                get: ()=>void 0 === s1 ? V : s1
                            }
                        }), k.push(i);
                    }
                    const C = n(d, {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "speakers",
                        numberOfInputs: Math.max(1, y + w)
                    }), A = Lt(f, d.sampleRate), D = a(d, A, y + w, Math.max(1, x)), O = i(d, {
                        channelCount: Math.max(1, x),
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete",
                        numberOfOutputs: Math.max(1, x)
                    }), M = [];
                    for(let t1 = 0; t1 < g.numberOfOutputs; t1 += 1)M.push(n(d, {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "speakers",
                        numberOfInputs: v[t1]
                    }));
                    for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1){
                        T[t1].connect(S[t1]);
                        for(let e = 0; e < g.channelCount; e += 1)S[t1].connect(C, e, t1 * g.channelCount + e);
                    }
                    const E = new pt(void 0 === _.parameterDescriptors ? [] : _.parameterDescriptors.map(({ name: t1 }, e)=>{
                        const s1 = k[e];
                        return s1.connect(C, 0, y + e), s1.start(0), [
                            t1,
                            s1.offset
                        ];
                    }));
                    C.connect(D);
                    let R = g.channelInterpretation, q = null;
                    const F = 0 === g.numberOfOutputs ? [
                        D
                    ] : M, I = {
                        get bufferSize () {
                            return A;
                        },
                        get channelCount () {
                            return g.channelCount;
                        },
                        set channelCount (t){
                            throw s1();
                        },
                        get channelCountMode () {
                            return g.channelCountMode;
                        },
                        set channelCountMode (t){
                            throw s1();
                        },
                        get channelInterpretation () {
                            return R;
                        },
                        set channelInterpretation (t){
                            for (const e of T)e.channelInterpretation = t;
                            R = t;
                        },
                        get context () {
                            return D.context;
                        },
                        get inputs () {
                            return T;
                        },
                        get numberOfInputs () {
                            return g.numberOfInputs;
                        },
                        get numberOfOutputs () {
                            return g.numberOfOutputs;
                        },
                        get onprocessorerror () {
                            return q;
                        },
                        set onprocessorerror (t){
                            "function" == typeof q && I.removeEventListener("processorerror", q), q = "function" == typeof t ? t : null, "function" == typeof q && I.addEventListener("processorerror", q);
                        },
                        get parameters () {
                            return E;
                        },
                        get port () {
                            return b.port2;
                        },
                        addEventListener: (...t1)=>D.addEventListener(t1[0], t1[1], t1[2]),
                        connect: t1.bind(null, F),
                        disconnect: h.bind(null, F),
                        dispatchEvent: (...t1)=>D.dispatchEvent(t1[0]),
                        removeEventListener: (...t1)=>D.removeEventListener(t1[0], t1[1], t1[2])
                    }, P = new Map;
                    var j, L;
                    b.port1.addEventListener = (j = b.port1.addEventListener, (...t1)=>{
                        if ("message" === t1[0]) {
                            const e = "function" == typeof t1[1] ? t1[1] : "object" == typeof t1[1] && null !== t1[1] && "function" == typeof t1[1].handleEvent ? t1[1].handleEvent : null;
                            if (null !== e) {
                                const s1 = P.get(t1[1]);
                                void 0 !== s1 ? t1[1] = s1 : (t1[1] = (t1)=>{
                                    u(d.currentTime, d.sampleRate, ()=>e(t1));
                                }, P.set(e, t1[1]));
                            }
                        }
                        return j.call(b.port1, t1[0], t1[1], t1[2]);
                    }), b.port1.removeEventListener = (L = b.port1.removeEventListener, (...t1)=>{
                        if ("message" === t1[0]) {
                            const e = P.get(t1[1]);
                            void 0 !== e && (P.delete(t1[1]), t1[1] = e);
                        }
                        return L.call(b.port1, t1[0], t1[1], t1[2]);
                    });
                    let z = null;
                    Object.defineProperty(b.port1, "onmessage", {
                        get: ()=>z,
                        set: (t1)=>{
                            "function" == typeof z && b.port1.removeEventListener("message", z), z = "function" == typeof t1 ? t1 : null, "function" == typeof z && (b.port1.addEventListener("message", z), b.port1.start());
                        }
                    }), _.prototype.port = b.port1;
                    let B = null;
                    ((t1, e, s1, n)=>{
                        let i = m.get(t1);
                        void 0 === i && (i = new WeakMap, m.set(t1, i));
                        const o = zt(s1, n);
                        return i.set(e, o), o;
                    })(d, I, _, g).then((t1)=>B = t1);
                    const W = mt(g.numberOfInputs, g.channelCount), G = mt(g.numberOfOutputs, v), U = void 0 === _.parameterDescriptors ? [] : _.parameterDescriptors.reduce((t1, { name: e })=>({
                            ...t1,
                            [e]: new Float32Array(128)
                        }), {});
                    let Q = !0;
                    const Z = ()=>{
                        g.numberOfOutputs > 0 && D.disconnect(O);
                        for(let t1 = 0, e = 0; t1 < g.numberOfOutputs; t1 += 1){
                            const s1 = M[t1];
                            for(let n = 0; n < v[t1]; n += 1)O.disconnect(s1, e + n, n);
                            e += v[t1];
                        }
                    }, X = new Map;
                    D.onaudioprocess = ({ inputBuffer: t1, outputBuffer: e })=>{
                        if (null !== B) {
                            const s1 = l(I);
                            for(let n = 0; n < A; n += 128){
                                for(let e = 0; e < g.numberOfInputs; e += 1)for(let s1 = 0; s1 < g.channelCount; s1 += 1)ft(t1, W[e], s1, s1, n);
                                void 0 !== _.parameterDescriptors && _.parameterDescriptors.forEach(({ name: e }, s1)=>{
                                    ft(t1, U, e, y + s1, n);
                                });
                                for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1)for(let e = 0; e < v[t1]; e += 1)0 === G[t1][e].byteLength && (G[t1][e] = new Float32Array(128));
                                try {
                                    const t1 = W.map((t1, e)=>{
                                        if (s1[e].size > 0) return X.set(e, A / 128), t1;
                                        const n = X.get(e);
                                        return void 0 === n ? [] : (t1.every((t1)=>t1.every((t1)=>0 === t1)) && (1 === n ? X.delete(e) : X.set(e, n - 1)), t1);
                                    }), i = u(d.currentTime + n / d.sampleRate, d.sampleRate, ()=>B.process(t1, G, U));
                                    Q = i;
                                    for(let t1 = 0, s1 = 0; t1 < g.numberOfOutputs; t1 += 1){
                                        for(let i = 0; i < v[t1]; i += 1)_t(e, G[t1], i, s1 + i, n);
                                        s1 += v[t1];
                                    }
                                } catch (t1) {
                                    Q = !1, I.dispatchEvent(new ErrorEvent("processorerror", {
                                        colno: t1.colno,
                                        filename: t1.filename,
                                        lineno: t1.lineno,
                                        message: t1.message
                                    }));
                                }
                                if (!Q) {
                                    for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1){
                                        T[t1].disconnect(S[t1]);
                                        for(let e = 0; e < g.channelCount; e += 1)S[n].disconnect(C, e, t1 * g.channelCount + e);
                                    }
                                    if (void 0 !== _.parameterDescriptors) {
                                        const t1 = _.parameterDescriptors.length;
                                        for(let e = 0; e < t1; e += 1){
                                            const t1 = k[e];
                                            t1.disconnect(C, 0, y + e), t1.stop();
                                        }
                                    }
                                    C.disconnect(D), D.onaudioprocess = null, Y ? Z() : J();
                                    break;
                                }
                            }
                        }
                    };
                    let Y = !1;
                    const H = r(d, {
                        channelCount: 1,
                        channelCountMode: "explicit",
                        channelInterpretation: "discrete",
                        gain: 0
                    }), $ = ()=>D.connect(H).connect(d.destination), J = ()=>{
                        D.disconnect(H), H.disconnect();
                    };
                    return $(), p(I, ()=>{
                        if (Q) {
                            J(), g.numberOfOutputs > 0 && D.connect(O);
                            for(let t1 = 0, e = 0; t1 < g.numberOfOutputs; t1 += 1){
                                const s1 = M[t1];
                                for(let n = 0; n < v[t1]; n += 1)O.connect(s1, e + n, n);
                                e += v[t1];
                            }
                        }
                        Y = !0;
                    }, ()=>{
                        Q && ($(), Z()), Y = !1;
                    });
                })(En, q, At, Es, Wt, Is, Qt, Yt, Ht, qn, _n, In, As), Nn = ((t1, e, s1, n, i)=>(o, r, a, c, h, u)=>{
                    if (null !== a) try {
                        const e = new a(o, c, u), n = new Map;
                        let r = null;
                        if (Object.defineProperties(e, {
                            channelCount: {
                                get: ()=>u.channelCount,
                                set: ()=>{
                                    throw t1();
                                }
                            },
                            channelCountMode: {
                                get: ()=>"explicit",
                                set: ()=>{
                                    throw t1();
                                }
                            },
                            onprocessorerror: {
                                get: ()=>r,
                                set: (t1)=>{
                                    "function" == typeof r && e.removeEventListener("processorerror", r), r = "function" == typeof t1 ? t1 : null, "function" == typeof r && e.addEventListener("processorerror", r);
                                }
                            }
                        }), e.addEventListener = (p = e.addEventListener, (...t1)=>{
                            if ("processorerror" === t1[0]) {
                                const e = "function" == typeof t1[1] ? t1[1] : "object" == typeof t1[1] && null !== t1[1] && "function" == typeof t1[1].handleEvent ? t1[1].handleEvent : null;
                                if (null !== e) {
                                    const s1 = n.get(t1[1]);
                                    void 0 !== s1 ? t1[1] = s1 : (t1[1] = (s1)=>{
                                        "error" === s1.type ? (Object.defineProperties(s1, {
                                            type: {
                                                value: "processorerror"
                                            }
                                        }), e(s1)) : e(new ErrorEvent(t1[0], {
                                            ...s1
                                        }));
                                    }, n.set(e, t1[1]));
                                }
                            }
                            return p.call(e, "error", t1[1], t1[2]), p.call(e, ...t1);
                        }), e.removeEventListener = (l = e.removeEventListener, (...t1)=>{
                            if ("processorerror" === t1[0]) {
                                const e = n.get(t1[1]);
                                void 0 !== e && (n.delete(t1[1]), t1[1] = e);
                            }
                            return l.call(e, "error", t1[1], t1[2]), l.call(e, t1[0], t1[1], t1[2]);
                        }), 0 !== u.numberOfOutputs) {
                            const t1 = s1(o, {
                                channelCount: 1,
                                channelCountMode: "explicit",
                                channelInterpretation: "discrete",
                                gain: 0
                            });
                            e.connect(t1).connect(o.destination);
                            return i(e, ()=>t1.disconnect(), ()=>t1.connect(o.destination));
                        }
                        return e;
                    } catch (t1) {
                        if (11 === t1.code) throw n();
                        throw t1;
                    }
                    var l, p;
                    if (void 0 === h) throw n();
                    return ((t1)=>{
                        const { port1: e } = new MessageChannel;
                        try {
                            e.postMessage(t1);
                        } finally{
                            e.close();
                        }
                    })(u), e(o, r, h, u);
                })(At, Vn, Qt, Ht, As), Pn = ((t1, e, s1, n, i, o, r, a, c, h, u, l, p, d, f, _)=>(m, g, v)=>{
                    const y = new WeakMap;
                    let x = null;
                    return {
                        render (w, b, T) {
                            a(b, w);
                            const S = y.get(b);
                            return void 0 !== S ? Promise.resolve(S) : (async (a, w, b)=>{
                                let T = u(a), S = null;
                                const k = E(T, w), C = Array.isArray(g.outputChannelCount) ? g.outputChannelCount : Array.from(g.outputChannelCount);
                                if (null === l) {
                                    const t1 = C.reduce((t1, e)=>t1 + e, 0), s1 = i(w, {
                                        channelCount: Math.max(1, t1),
                                        channelCountMode: "explicit",
                                        channelInterpretation: "discrete",
                                        numberOfOutputs: Math.max(1, t1)
                                    }), o = [];
                                    for(let t1 = 0; t1 < a.numberOfOutputs; t1 += 1)o.push(n(w, {
                                        channelCount: 1,
                                        channelCountMode: "explicit",
                                        channelInterpretation: "speakers",
                                        numberOfInputs: C[t1]
                                    }));
                                    const h = r(w, {
                                        channelCount: g.channelCount,
                                        channelCountMode: g.channelCountMode,
                                        channelInterpretation: g.channelInterpretation,
                                        gain: 1
                                    });
                                    h.connect = e.bind(null, o), h.disconnect = c.bind(null, o), S = [
                                        s1,
                                        o,
                                        h
                                    ];
                                } else k || (T = new l(w, m));
                                if (y.set(w, null === S ? T : S[2]), null !== S) {
                                    if (null === x) {
                                        if (void 0 === v) throw new Error("Missing the processor constructor.");
                                        if (null === p) throw new Error("Missing the native OfflineAudioContext constructor.");
                                        const t1 = a.channelCount * a.numberOfInputs, e = void 0 === v.parameterDescriptors ? 0 : v.parameterDescriptors.length, s1 = t1 + e, c = async ()=>{
                                            const c = new p(s1, 128 * Math.ceil(a.context.length / 128), w.sampleRate), h = [], u = [];
                                            for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1)h.push(r(c, {
                                                channelCount: g.channelCount,
                                                channelCountMode: g.channelCountMode,
                                                channelInterpretation: g.channelInterpretation,
                                                gain: 1
                                            })), u.push(i(c, {
                                                channelCount: g.channelCount,
                                                channelCountMode: "explicit",
                                                channelInterpretation: "discrete",
                                                numberOfOutputs: g.channelCount
                                            }));
                                            const l = await Promise.all(Array.from(a.parameters.values()).map(async (t1)=>{
                                                const e = o(c, {
                                                    channelCount: 1,
                                                    channelCountMode: "explicit",
                                                    channelInterpretation: "discrete",
                                                    offset: t1.value
                                                });
                                                return await d(c, t1, e.offset, b), e;
                                            })), m = n(c, {
                                                channelCount: 1,
                                                channelCountMode: "explicit",
                                                channelInterpretation: "speakers",
                                                numberOfInputs: Math.max(1, t1 + e)
                                            });
                                            for(let t1 = 0; t1 < g.numberOfInputs; t1 += 1){
                                                h[t1].connect(u[t1]);
                                                for(let e = 0; e < g.channelCount; e += 1)u[t1].connect(m, e, t1 * g.channelCount + e);
                                            }
                                            for (const [e, s1] of l.entries())s1.connect(m, 0, t1 + e), s1.start(0);
                                            return m.connect(c.destination), await Promise.all(h.map((t1)=>f(a, c, t1, b))), _(c);
                                        };
                                        x = gt(a, 0 === s1 ? null : await c(), w, g, C, v, h);
                                    }
                                    const t1 = await x, e = s1(w, {
                                        buffer: null,
                                        channelCount: 2,
                                        channelCountMode: "max",
                                        channelInterpretation: "speakers",
                                        loop: !1,
                                        loopEnd: 0,
                                        loopStart: 0,
                                        playbackRate: 1
                                    }), [c, u, l] = S;
                                    null !== t1 && (e.buffer = t1, e.start(0)), e.connect(c);
                                    for(let t1 = 0, e = 0; t1 < a.numberOfOutputs; t1 += 1){
                                        const s1 = u[t1];
                                        for(let n = 0; n < C[t1]; n += 1)c.connect(s1, e + n, n);
                                        e += C[t1];
                                    }
                                    return l;
                                }
                                if (k) for (const [e, s1] of a.parameters.entries())await t1(w, s1, T.parameters.get(e), b);
                                else for (const [t1, e] of a.parameters.entries())await d(w, e, T.parameters.get(t1), b);
                                return await f(a, w, T, b), T;
                            })(w, b, T);
                        }
                    };
                })(as, En, cs, Es, Wt, Is, Qt, Rn, qn, _n, st, vn, Ve, us, Oe, Us), jn = ((t1)=>(e)=>t1.get(e))(mn), Ln = ((t1)=>(e, s1)=>{
                    t1.set(e, s1);
                })(Fn), zn = fn ? ((t1, e, s1, n, i, o, r, a, c, h, u, l, p)=>class extends e {
                    constructor(e, p, d){
                        var f;
                        const m = a(e), g = c(m), v = u({
                            ...dt,
                            ...d
                        }), y = _.get(m), x = null == y ? void 0 : y.get(p), w = g || "closed" !== m.state ? m : null !== (f = r(m)) && void 0 !== f ? f : m, b = i(w, g ? null : e.baseLatency, h, p, x, v);
                        super(e, !0, b, g ? n(p, v, x) : null);
                        const T = [];
                        b.parameters.forEach((t1, e)=>{
                            const n = s1(this, g, t1);
                            T.push([
                                e,
                                n
                            ]);
                        }), this._nativeAudioWorkletNode = b, this._onprocessorerror = null, this._parameters = new pt(T), g && t1(m, this);
                        const { activeInputs: S } = o(this);
                        l(b, S);
                    }
                    get onprocessorerror() {
                        return this._onprocessorerror;
                    }
                    set onprocessorerror(t1) {
                        const e = "function" == typeof t1 ? p(this, t1) : null;
                        this._nativeAudioWorkletNode.onprocessorerror = e;
                        const s1 = this._nativeAudioWorkletNode.onprocessorerror;
                        this._onprocessorerror = null !== s1 && s1 === e ? t1 : s1;
                    }
                    get parameters() {
                        return null === this._parameters ? this._nativeAudioWorkletNode.parameters : this._parameters;
                    }
                    get port() {
                        return this._nativeAudioWorkletNode.port;
                    }
                })(On, Ze, ps, Pn, Nn, L, jn, Fe, Ne, vn, (t1)=>({
                    ...t1,
                    outputChannelCount: void 0 !== t1.outputChannelCount ? t1.outputChannelCount : 1 === t1.numberOfInputs && 1 === t1.numberOfOutputs ? [
                        t1.channelCount
                    ] : Array.from({
                        length: t1.numberOfOutputs
                    }, ()=>1)
                }), Ln, de) : void 0, Bn = (((t1, e, s1, n, i)=>{})(At, Ht, se, $s, Be), ((t1, e)=>(s1, n, i)=>{
                    if (null === e) throw new Error("Missing the native OfflineAudioContext constructor.");
                    try {
                        return new e(s1, n, i);
                    } catch (e) {
                        if ("SyntaxError" === e.name) throw t1();
                        throw e;
                    }
                })(Ht, Ve)), Wn = ((t1, e, s1, n, i, o, r, a)=>{
                const c = [];
                return (h, u)=>s1(h).render(h, u, c).then(()=>Promise.all(Array.from(n(u)).map((t1)=>s1(t1).render(t1, u, c)))).then(()=>i(u)).then((s1)=>("function" != typeof s1.copyFromChannel ? (r(s1), F(s1)) : e(o, ()=>o(s1)) || a(s1), t1.add(s1), s1));
            })(He, xe, Ae, An, Us, R, ts, es), Gn = (((t1, e, s1, n, i)=>{})(xe, At, Bn, $s, Wn), ((t1, e, s1, n, i)=>class extends t1 {
                    constructor(t1, s1, i){
                        let o;
                        if ("number" == typeof t1 && void 0 !== s1 && void 0 !== i) o = {
                            length: s1,
                            numberOfChannels: t1,
                            sampleRate: i
                        };
                        else {
                            if ("object" != typeof t1) throw new Error("The given parameters are not valid.");
                            o = t1;
                        }
                        const { length: r, numberOfChannels: a, sampleRate: c } = {
                            ...$t,
                            ...o
                        }, h = n(a, r, c);
                        e(Rt, ()=>Rt(h)) || h.addEventListener("statechange", (()=>{
                            let t1 = 0;
                            const e = (s1)=>{
                                "running" === this._state && (t1 > 0 ? (h.removeEventListener("statechange", e), s1.stopImmediatePropagation(), this._waitForThePromiseToSettle(s1)) : t1 += 1);
                            };
                            return e;
                        })()), super(h, a), this._length = r, this._nativeOfflineAudioContext = h, this._state = null;
                    }
                    get length() {
                        return void 0 === this._nativeOfflineAudioContext.length ? this._length : this._nativeOfflineAudioContext.length;
                    }
                    get state() {
                        return null === this._state ? this._nativeOfflineAudioContext.state : this._state;
                    }
                    startRendering() {
                        return "running" === this._state ? Promise.reject(s1()) : (this._state = "running", i(this.destination, this._nativeOfflineAudioContext).finally(()=>{
                            this._state = null, W(this);
                        }));
                    }
                    _waitForThePromiseToSettle(t1) {
                        null === this._state ? this._nativeOfflineAudioContext.dispatchEvent(t1) : setTimeout(()=>this._waitForThePromiseToSettle(t1));
                    }
                })(wn, xe, At, Bn, Wn)), Un = ((t1, e)=>(s1)=>{
                    const n = t1.get(s1);
                    return e(n) || e(s1);
                })(p, We), Qn = (Zn = h, Xn = Ue, (t1)=>Zn.has(t1) || Xn(t1));
            var Zn, Xn;
            const Yn = (Hn = l, $n = Qe, (t1)=>Hn.has(t1) || $n(t1));
            var Hn, $n;
            const Jn = ((t1, e)=>(s1)=>{
                    const n = t1.get(s1);
                    return e(n) || e(s1);
                })(p, Ne), Kn = ()=>(async (t1, e, s1, n, i, o, r, a, c, h, u, l, p, d, f, _)=>{
                    if (t1(e, e) && t1(s1, s1) && t1(i, i) && t1(o, o) && t1(a, a) && t1(c, c) && t1(h, h) && t1(u, u) && t1(l, l) && t1(p, p) && t1(d, d)) return (await Promise.all([
                        t1(n, n),
                        t1(r, r),
                        t1(f, f),
                        t1(_, _)
                    ])).every((t1)=>t1);
                    return !1;
                })(xe, ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100).createBuffer(1, 1, 44100);
                        if (void 0 === e.copyToChannel) return !0;
                        const s1 = new Float32Array(2);
                        try {
                            e.copyFromChannel(s1, 0, 0);
                        } catch  {
                            return !1;
                        }
                        return !0;
                    })(Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        if (void 0 !== t1.prototype && void 0 !== t1.prototype.close) return !0;
                        const e = new t1, s1 = void 0 !== e.close;
                        try {
                            e.close();
                        } catch  {}
                        return s1;
                    })(Be), ((t1)=>()=>{
                        if (null === t1) return Promise.resolve(!1);
                        const e = new t1(1, 1, 44100);
                        return new Promise((t1)=>{
                            let s1 = !0;
                            const n = (n)=>{
                                s1 && (s1 = !1, e.startRendering(), t1(n instanceof TypeError));
                            };
                            let i;
                            try {
                                i = e.decodeAudioData(null, ()=>{}, n);
                            } catch (t1) {
                                n(t1);
                            }
                            void 0 !== i && i.catch(n);
                        });
                    })(Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        let e;
                        try {
                            e = new t1({
                                latencyHint: "balanced"
                            });
                        } catch  {
                            return !1;
                        }
                        return e.close(), !0;
                    })(Be), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100).createGain(), s1 = e.connect(e) === e;
                        return e.disconnect(e), s1;
                    })(Ve), ((t1, e)=>async ()=>{
                        if (null === t1) return !0;
                        if (null === e) return !1;
                        const s1 = new Blob([
                            'class A extends AudioWorkletProcessor{process(){this.port.postMessage(0)}}registerProcessor("a",A)'
                        ], {
                            type: "application/javascript; charset=utf-8"
                        }), n = new e(1, 128, 8e3), i = URL.createObjectURL(s1);
                        let o = !1;
                        try {
                            await n.audioWorklet.addModule(i);
                            const e = new t1(n, "a", {
                                numberOfOutputs: 0
                            }), s1 = n.createOscillator();
                            e.port.onmessage = ()=>o = !0, s1.connect(e), s1.start(0), await n.startRendering(), o || await new Promise((t1)=>setTimeout(t1, 5));
                        } catch  {} finally{
                            URL.revokeObjectURL(i);
                        }
                        return o;
                    })(vn, Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100).createChannelMerger();
                        if ("max" === e.channelCountMode) return !0;
                        try {
                            e.channelCount = 2;
                        } catch  {
                            return !0;
                        }
                        return !1;
                    })(Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100);
                        if (void 0 === e.createConstantSource) return !0;
                        return e.createConstantSource().offset.maxValue !== Number.POSITIVE_INFINITY;
                    })(Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100), s1 = e.createConvolver();
                        s1.buffer = e.createBuffer(1, 1, e.sampleRate);
                        try {
                            s1.buffer = e.createBuffer(1, 1, e.sampleRate);
                        } catch  {
                            return !1;
                        }
                        return !0;
                    })(Ve), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1(1, 1, 44100).createConvolver();
                        try {
                            e.channelCount = 1;
                        } catch  {
                            return !1;
                        }
                        return !0;
                    })(Ve), ue, ((t1)=>()=>null !== t1 && t1.hasOwnProperty("isSecureContext"))(Te), ((t1)=>()=>{
                        if (null === t1) return !1;
                        const e = new t1;
                        try {
                            return e.createMediaStreamSource(new MediaStream), !1;
                        } catch (t1) {
                            return !0;
                        }
                    })(Be), ((t1)=>()=>{
                        if (null === t1) return Promise.resolve(!1);
                        const e = new t1(1, 1, 44100);
                        if (void 0 === e.createStereoPanner) return Promise.resolve(!0);
                        if (void 0 === e.createConstantSource) return Promise.resolve(!0);
                        const s1 = e.createConstantSource(), n = e.createStereoPanner();
                        return s1.channelCount = 1, s1.offset.value = 1, n.channelCount = 1, s1.start(), s1.connect(n).connect(e.destination), e.startRendering().then((t1)=>1 !== t1.getChannelData(0)[0]);
                    })(Ve), le);
            function ti(t1, e) {
                if (!t1) throw new Error(e);
            }
            function ei(t1, e, s1 = 1 / 0) {
                if (!(e <= t1 && t1 <= s1)) throw new RangeError(`Value must be within [${e}, ${s1}], got: ${t1}`);
            }
            function si(t1) {
                t1.isOffline || "running" === t1.state || ri('The AudioContext is "suspended". Invoke Tone.start() from a user action to start the audio.');
            }
            let ni = console;
            function ii(t1) {
                ni = t1;
            }
            function oi(...t1) {
                ni.log(...t1);
            }
            function ri(...t1) {
                ni.warn(...t1);
            }
            function ai(t1) {
                return void 0 === t1;
            }
            function ci(t1) {
                return !ai(t1);
            }
            function hi(t1) {
                return "function" == typeof t1;
            }
            function ui(t1) {
                return "number" == typeof t1;
            }
            function li(t1) {
                return "[object Object]" === Object.prototype.toString.call(t1) && t1.constructor === Object;
            }
            function pi(t1) {
                return "boolean" == typeof t1;
            }
            function di(t1) {
                return Array.isArray(t1);
            }
            function fi(t1) {
                return "string" == typeof t1;
            }
            function _i(t1) {
                return fi(t1) && /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i.test(t1);
            }
            const mi = "object" == typeof self ? self : null, gi = mi && (mi.hasOwnProperty("AudioContext") || mi.hasOwnProperty("webkitAudioContext"));
            function vi(t1, e, s1, n) {
                var i, o = arguments.length, r = o < 3 ? e : null === n ? n = Object.getOwnPropertyDescriptor(e, s1) : n;
                if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) r = Reflect.decorate(t1, e, s1, n);
                else for(var a = t1.length - 1; a >= 0; a--)(i = t1[a]) && (r = (o < 3 ? i(r) : o > 3 ? i(e, s1, r) : i(e, s1)) || r);
                return o > 3 && r && Object.defineProperty(e, s1, r), r;
            }
            function yi(t1, e, s1, n) {
                return new (s1 || (s1 = Promise))(function(i, o) {
                    function r(t1) {
                        try {
                            c(n.next(t1));
                        } catch (t1) {
                            o(t1);
                        }
                    }
                    function a(t1) {
                        try {
                            c(n.throw(t1));
                        } catch (t1) {
                            o(t1);
                        }
                    }
                    function c(t1) {
                        var e;
                        t1.done ? i(t1.value) : (e = t1.value, e instanceof s1 ? e : new s1(function(t1) {
                            t1(e);
                        })).then(r, a);
                    }
                    c((n = n.apply(t1, e || [])).next());
                });
            }
            Object.create;
            Object.create;
            class xi {
                constructor(t1, e, s1){
                    this._callback = t1, this._type = e, this._updateInterval = s1, this._createClock();
                }
                _createWorker() {
                    const t1 = new Blob([
                        `\n\t\t\t// the initial timeout time\n\t\t\tlet timeoutTime =  ${(1e3 * this._updateInterval).toFixed(1)};\n\t\t\t// onmessage callback\n\t\t\tself.onmessage = function(msg){\n\t\t\t\ttimeoutTime = parseInt(msg.data);\n\t\t\t};\n\t\t\t// the tick function which posts a message\n\t\t\t// and schedules a new tick\n\t\t\tfunction tick(){\n\t\t\t\tsetTimeout(tick, timeoutTime);\n\t\t\t\tself.postMessage('tick');\n\t\t\t}\n\t\t\t// call tick initially\n\t\t\ttick();\n\t\t\t`
                    ], {
                        type: "text/javascript"
                    }), e = URL.createObjectURL(t1), s1 = new Worker(e);
                    s1.onmessage = this._callback.bind(this), this._worker = s1;
                }
                _createTimeout() {
                    this._timeout = setTimeout(()=>{
                        this._createTimeout(), this._callback();
                    }, 1e3 * this._updateInterval);
                }
                _createClock() {
                    if ("worker" === this._type) try {
                        this._createWorker();
                    } catch (t1) {
                        this._type = "timeout", this._createClock();
                    }
                    else "timeout" === this._type && this._createTimeout();
                }
                _disposeClock() {
                    this._timeout && (clearTimeout(this._timeout), this._timeout = 0), this._worker && (this._worker.terminate(), this._worker.onmessage = null);
                }
                get updateInterval() {
                    return this._updateInterval;
                }
                set updateInterval(t1) {
                    this._updateInterval = Math.max(t1, 128 / 44100), "worker" === this._type && this._worker.postMessage(Math.max(1e3 * t1, 1));
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    this._disposeClock(), this._type = t1, this._createClock();
                }
                dispose() {
                    this._disposeClock();
                }
            }
            function wi(t1) {
                return Yn(t1);
            }
            function bi(t1) {
                return Qn(t1);
            }
            function Ti(t1) {
                return Jn(t1);
            }
            function Si(t1) {
                return Un(t1);
            }
            function ki(t1) {
                return t1 instanceof AudioBuffer;
            }
            function Ci(t1, e) {
                return "value" === t1 || wi(e) || bi(e) || ki(e);
            }
            function Ai(t1, ...e) {
                if (!e.length) return t1;
                const s1 = e.shift();
                if (li(t1) && li(s1)) for(const e in s1)Ci(e, s1[e]) ? t1[e] = s1[e] : li(s1[e]) ? (t1[e] || Object.assign(t1, {
                    [e]: {}
                }), Ai(t1[e], s1[e])) : Object.assign(t1, {
                    [e]: s1[e]
                });
                return Ai(t1, ...e);
            }
            function Di(t1, e, s1 = [], n) {
                const i = {}, o = Array.from(e);
                if (li(o[0]) && n && !Reflect.has(o[0], n)) Object.keys(o[0]).some((e)=>Reflect.has(t1, e)) || (Ai(i, {
                    [n]: o[0]
                }), s1.splice(s1.indexOf(n), 1), o.shift());
                if (1 === o.length && li(o[0])) Ai(i, o[0]);
                else for(let t1 = 0; t1 < s1.length; t1++)ci(o[t1]) && (i[s1[t1]] = o[t1]);
                return Ai(t1, i);
            }
            function Oi(t1, e) {
                return ai(t1) ? e : t1;
            }
            function Mi(t1, e) {
                return e.forEach((e)=>{
                    Reflect.has(t1, e) && delete t1[e];
                }), t1;
            }
            /**
 * Tone.js
 * @author Yotam Mann
 * @license http://opensource.org/licenses/MIT MIT License
 * @copyright 2014-2019 Yotam Mann
 */ class Ei {
                constructor(){
                    this.debug = !1, this._wasDisposed = !1;
                }
                static getDefaults() {
                    return {};
                }
                log(...t1) {
                    (this.debug || mi && this.toString() === mi.TONE_DEBUG_CLASS) && oi(this, ...t1);
                }
                dispose() {
                    return this._wasDisposed = !0, this;
                }
                get disposed() {
                    return this._wasDisposed;
                }
                toString() {
                    return this.name;
                }
            }
            Ei.version = o;
            function Ri(t1, e) {
                return t1 > e + 1e-6;
            }
            function qi(t1, e) {
                return Ri(t1, e) || Ii(t1, e);
            }
            function Fi(t1, e) {
                return t1 + 1e-6 < e;
            }
            function Ii(t1, e) {
                return Math.abs(t1 - e) < 1e-6;
            }
            function Vi(t1, e, s1) {
                return Math.max(Math.min(t1, s1), e);
            }
            class Ni extends Ei {
                constructor(){
                    super(), this.name = "Timeline", this._timeline = [];
                    const t1 = Di(Ni.getDefaults(), arguments, [
                        "memory"
                    ]);
                    this.memory = t1.memory, this.increasing = t1.increasing;
                }
                static getDefaults() {
                    return {
                        memory: 1 / 0,
                        increasing: !1
                    };
                }
                get length() {
                    return this._timeline.length;
                }
                add(t1) {
                    if (ti(Reflect.has(t1, "time"), "Timeline: events must have a time attribute"), t1.time = t1.time.valueOf(), this.increasing && this.length) {
                        const e = this._timeline[this.length - 1];
                        ti(qi(t1.time, e.time), "The time must be greater than or equal to the last scheduled time"), this._timeline.push(t1);
                    } else {
                        const e = this._search(t1.time);
                        this._timeline.splice(e + 1, 0, t1);
                    }
                    if (this.length > this.memory) {
                        const t1 = this.length - this.memory;
                        this._timeline.splice(0, t1);
                    }
                    return this;
                }
                remove(t1) {
                    const e = this._timeline.indexOf(t1);
                    return -1 !== e && this._timeline.splice(e, 1), this;
                }
                get(t1, e = "time") {
                    const s1 = this._search(t1, e);
                    return -1 !== s1 ? this._timeline[s1] : null;
                }
                peek() {
                    return this._timeline[0];
                }
                shift() {
                    return this._timeline.shift();
                }
                getAfter(t1, e = "time") {
                    const s1 = this._search(t1, e);
                    return s1 + 1 < this._timeline.length ? this._timeline[s1 + 1] : null;
                }
                getBefore(t1) {
                    const e = this._timeline.length;
                    if (e > 0 && this._timeline[e - 1].time < t1) return this._timeline[e - 1];
                    const s1 = this._search(t1);
                    return s1 - 1 >= 0 ? this._timeline[s1 - 1] : null;
                }
                cancel(t1) {
                    if (this._timeline.length > 1) {
                        let e = this._search(t1);
                        if (e >= 0) {
                            if (Ii(this._timeline[e].time, t1)) {
                                for(let s1 = e; s1 >= 0 && Ii(this._timeline[s1].time, t1); s1--)e = s1;
                                this._timeline = this._timeline.slice(0, e);
                            } else this._timeline = this._timeline.slice(0, e + 1);
                        } else this._timeline = [];
                    } else 1 === this._timeline.length && qi(this._timeline[0].time, t1) && (this._timeline = []);
                    return this;
                }
                cancelBefore(t1) {
                    const e = this._search(t1);
                    return e >= 0 && (this._timeline = this._timeline.slice(e + 1)), this;
                }
                previousEvent(t1) {
                    const e = this._timeline.indexOf(t1);
                    return e > 0 ? this._timeline[e - 1] : null;
                }
                _search(t1, e = "time") {
                    if (0 === this._timeline.length) return -1;
                    let s1 = 0;
                    const n = this._timeline.length;
                    let i = n;
                    if (n > 0 && this._timeline[n - 1][e] <= t1) return n - 1;
                    for(; s1 < i;){
                        let n = Math.floor(s1 + (i - s1) / 2);
                        const o = this._timeline[n], r = this._timeline[n + 1];
                        if (Ii(o[e], t1)) {
                            for(let s1 = n; s1 < this._timeline.length; s1++){
                                if (!Ii(this._timeline[s1][e], t1)) break;
                                n = s1;
                            }
                            return n;
                        }
                        if (Fi(o[e], t1) && Ri(r[e], t1)) return n;
                        Ri(o[e], t1) ? i = n : s1 = n + 1;
                    }
                    return -1;
                }
                _iterate(t1, e = 0, s1 = this._timeline.length - 1) {
                    this._timeline.slice(e, s1 + 1).forEach(t1);
                }
                forEach(t1) {
                    return this._iterate(t1), this;
                }
                forEachBefore(t1, e) {
                    const s1 = this._search(t1);
                    return -1 !== s1 && this._iterate(e, 0, s1), this;
                }
                forEachAfter(t1, e) {
                    const s1 = this._search(t1);
                    return this._iterate(e, s1 + 1), this;
                }
                forEachBetween(t1, e, s1) {
                    let n = this._search(t1), i = this._search(e);
                    return -1 !== n && -1 !== i ? (this._timeline[n].time !== t1 && (n += 1), this._timeline[i].time === e && (i -= 1), this._iterate(s1, n, i)) : -1 === n && this._iterate(s1, 0, i), this;
                }
                forEachFrom(t1, e) {
                    let s1 = this._search(t1);
                    for(; s1 >= 0 && this._timeline[s1].time >= t1;)s1--;
                    return this._iterate(e, s1 + 1), this;
                }
                forEachAtTime(t1, e) {
                    const s1 = this._search(t1);
                    if (-1 !== s1 && Ii(this._timeline[s1].time, t1)) {
                        let n = s1;
                        for(let e = s1; e >= 0 && Ii(this._timeline[e].time, t1); e--)n = e;
                        this._iterate((t1)=>{
                            e(t1);
                        }, n, s1);
                    }
                    return this;
                }
                dispose() {
                    return super.dispose(), this._timeline = [], this;
                }
            }
            const Pi = [];
            function ji(t1) {
                Pi.push(t1);
            }
            const Li = [];
            function zi(t1) {
                Li.push(t1);
            }
            class Bi extends Ei {
                constructor(){
                    super(...arguments), this.name = "Emitter";
                }
                on(t1, e) {
                    return t1.split(/\W+/).forEach((t1)=>{
                        ai(this._events) && (this._events = {}), this._events.hasOwnProperty(t1) || (this._events[t1] = []), this._events[t1].push(e);
                    }), this;
                }
                once(t1, e) {
                    const s1 = (...n)=>{
                        e(...n), this.off(t1, s1);
                    };
                    return this.on(t1, s1), this;
                }
                off(t1, e) {
                    return t1.split(/\W+/).forEach((s1)=>{
                        if (ai(this._events) && (this._events = {}), this._events.hasOwnProperty(t1)) {
                            if (ai(e)) this._events[t1] = [];
                            else {
                                const s1 = this._events[t1];
                                for(let t1 = s1.length - 1; t1 >= 0; t1--)s1[t1] === e && s1.splice(t1, 1);
                            }
                        }
                    }), this;
                }
                emit(t1, ...e) {
                    if (this._events && this._events.hasOwnProperty(t1)) {
                        const s1 = this._events[t1].slice(0);
                        for(let t1 = 0, n = s1.length; t1 < n; t1++)s1[t1].apply(this, e);
                    }
                    return this;
                }
                static mixin(t1) {
                    [
                        "on",
                        "once",
                        "off",
                        "emit"
                    ].forEach((e)=>{
                        const s1 = Object.getOwnPropertyDescriptor(Bi.prototype, e);
                        Object.defineProperty(t1.prototype, e, s1);
                    });
                }
                dispose() {
                    return super.dispose(), this._events = void 0, this;
                }
            }
            class Wi extends Bi {
                constructor(){
                    super(...arguments), this.isOffline = !1;
                }
                toJSON() {
                    return {};
                }
            }
            class Gi extends Wi {
                constructor(){
                    super(), this.name = "Context", this._constants = new Map, this._timeouts = new Ni, this._timeoutIds = 0, this._initialized = !1, this.isOffline = !1, this._workletModules = new Map;
                    const t1 = Di(Gi.getDefaults(), arguments, [
                        "context"
                    ]);
                    t1.context ? this._context = t1.context : this._context = function(t1) {
                        return new Cn(t1);
                    }({
                        latencyHint: t1.latencyHint
                    }), this._ticker = new xi(this.emit.bind(this, "tick"), t1.clockSource, t1.updateInterval), this.on("tick", this._timeoutLoop.bind(this)), this._context.onstatechange = ()=>{
                        this.emit("statechange", this.state);
                    }, this._setLatencyHint(t1.latencyHint), this.lookAhead = t1.lookAhead;
                }
                static getDefaults() {
                    return {
                        clockSource: "worker",
                        latencyHint: "interactive",
                        lookAhead: .1,
                        updateInterval: .05
                    };
                }
                initialize() {
                    var t1;
                    return this._initialized || (t1 = this, Pi.forEach((e)=>e(t1)), this._initialized = !0), this;
                }
                createAnalyser() {
                    return this._context.createAnalyser();
                }
                createOscillator() {
                    return this._context.createOscillator();
                }
                createBufferSource() {
                    return this._context.createBufferSource();
                }
                createBiquadFilter() {
                    return this._context.createBiquadFilter();
                }
                createBuffer(t1, e, s1) {
                    return this._context.createBuffer(t1, e, s1);
                }
                createChannelMerger(t1) {
                    return this._context.createChannelMerger(t1);
                }
                createChannelSplitter(t1) {
                    return this._context.createChannelSplitter(t1);
                }
                createConstantSource() {
                    return this._context.createConstantSource();
                }
                createConvolver() {
                    return this._context.createConvolver();
                }
                createDelay(t1) {
                    return this._context.createDelay(t1);
                }
                createDynamicsCompressor() {
                    return this._context.createDynamicsCompressor();
                }
                createGain() {
                    return this._context.createGain();
                }
                createIIRFilter(t1, e) {
                    return this._context.createIIRFilter(t1, e);
                }
                createPanner() {
                    return this._context.createPanner();
                }
                createPeriodicWave(t1, e, s1) {
                    return this._context.createPeriodicWave(t1, e, s1);
                }
                createStereoPanner() {
                    return this._context.createStereoPanner();
                }
                createWaveShaper() {
                    return this._context.createWaveShaper();
                }
                createMediaStreamSource(t1) {
                    ti(Si(this._context), "Not available if OfflineAudioContext");
                    return this._context.createMediaStreamSource(t1);
                }
                createMediaElementSource(t1) {
                    ti(Si(this._context), "Not available if OfflineAudioContext");
                    return this._context.createMediaElementSource(t1);
                }
                createMediaStreamDestination() {
                    ti(Si(this._context), "Not available if OfflineAudioContext");
                    return this._context.createMediaStreamDestination();
                }
                decodeAudioData(t1) {
                    return this._context.decodeAudioData(t1);
                }
                get currentTime() {
                    return this._context.currentTime;
                }
                get state() {
                    return this._context.state;
                }
                get sampleRate() {
                    return this._context.sampleRate;
                }
                get listener() {
                    return this.initialize(), this._listener;
                }
                set listener(t1) {
                    ti(!this._initialized, "The listener cannot be set after initialization."), this._listener = t1;
                }
                get transport() {
                    return this.initialize(), this._transport;
                }
                set transport(t1) {
                    ti(!this._initialized, "The transport cannot be set after initialization."), this._transport = t1;
                }
                get draw() {
                    return this.initialize(), this._draw;
                }
                set draw(t1) {
                    ti(!this._initialized, "Draw cannot be set after initialization."), this._draw = t1;
                }
                get destination() {
                    return this.initialize(), this._destination;
                }
                set destination(t1) {
                    ti(!this._initialized, "The destination cannot be set after initialization."), this._destination = t1;
                }
                createAudioWorkletNode(t1, e) {
                    return function(t1, e, s1) {
                        return ti(ci(zn), "This node only works in a secure context (https or localhost)"), new zn(t1, e, s1);
                    }(this.rawContext, t1, e);
                }
                addAudioWorkletModule(t1, e) {
                    return yi(this, void 0, void 0, function*() {
                        ti(ci(this.rawContext.audioWorklet), "AudioWorkletNode is only available in a secure context (https or localhost)"), this._workletModules.has(e) || this._workletModules.set(e, this.rawContext.audioWorklet.addModule(t1)), yield this._workletModules.get(e);
                    });
                }
                workletsAreReady() {
                    return yi(this, void 0, void 0, function*() {
                        const t1 = [];
                        this._workletModules.forEach((e)=>t1.push(e)), yield Promise.all(t1);
                    });
                }
                get updateInterval() {
                    return this._ticker.updateInterval;
                }
                set updateInterval(t1) {
                    this._ticker.updateInterval = t1;
                }
                get clockSource() {
                    return this._ticker.type;
                }
                set clockSource(t1) {
                    this._ticker.type = t1;
                }
                get latencyHint() {
                    return this._latencyHint;
                }
                _setLatencyHint(t1) {
                    let e = 0;
                    if (this._latencyHint = t1, fi(t1)) switch(t1){
                        case "interactive":
                            e = .1;
                            break;
                        case "playback":
                            e = .5;
                            break;
                        case "balanced":
                            e = .25;
                    }
                    this.lookAhead = e, this.updateInterval = e / 2;
                }
                get rawContext() {
                    return this._context;
                }
                now() {
                    return this._context.currentTime + this.lookAhead;
                }
                immediate() {
                    return this._context.currentTime;
                }
                resume() {
                    return Si(this._context) ? this._context.resume() : Promise.resolve();
                }
                close() {
                    return yi(this, void 0, void 0, function*() {
                        var t1;
                        Si(this._context) && (yield this._context.close()), this._initialized && (t1 = this, Li.forEach((e)=>e(t1)));
                    });
                }
                getConstant(t1) {
                    if (this._constants.has(t1)) return this._constants.get(t1);
                    {
                        const e = this._context.createBuffer(1, 128, this._context.sampleRate), s1 = e.getChannelData(0);
                        for(let e = 0; e < s1.length; e++)s1[e] = t1;
                        const n = this._context.createBufferSource();
                        return n.channelCount = 1, n.channelCountMode = "explicit", n.buffer = e, n.loop = !0, n.start(0), this._constants.set(t1, n), n;
                    }
                }
                dispose() {
                    return super.dispose(), this._ticker.dispose(), this._timeouts.dispose(), Object.keys(this._constants).map((t1)=>this._constants[t1].disconnect()), this;
                }
                _timeoutLoop() {
                    const t1 = this.now();
                    let e = this._timeouts.peek();
                    for(; this._timeouts.length && e && e.time <= t1;)e.callback(), this._timeouts.shift(), e = this._timeouts.peek();
                }
                setTimeout(t1, e) {
                    this._timeoutIds++;
                    const s1 = this.now();
                    return this._timeouts.add({
                        callback: t1,
                        id: this._timeoutIds,
                        time: s1 + e
                    }), this._timeoutIds;
                }
                clearTimeout(t1) {
                    return this._timeouts.forEach((e)=>{
                        e.id === t1 && this._timeouts.remove(e);
                    }), this;
                }
                clearInterval(t1) {
                    return this.clearTimeout(t1);
                }
                setInterval(t1, e) {
                    const s1 = ++this._timeoutIds, n = ()=>{
                        const i = this.now();
                        this._timeouts.add({
                            callback: ()=>{
                                t1(), n();
                            },
                            id: s1,
                            time: i + e
                        });
                    };
                    return n(), s1;
                }
            }
            function Ui(t1, e) {
                di(e) ? e.forEach((e)=>Ui(t1, e)) : Object.defineProperty(t1, e, {
                    enumerable: !0,
                    writable: !1
                });
            }
            function Qi(t1, e) {
                di(e) ? e.forEach((e)=>Qi(t1, e)) : Object.defineProperty(t1, e, {
                    writable: !0
                });
            }
            const Zi = ()=>{};
            class Xi extends Ei {
                constructor(){
                    super(), this.name = "ToneAudioBuffer", this.onload = Zi;
                    const t1 = Di(Xi.getDefaults(), arguments, [
                        "url",
                        "onload",
                        "onerror"
                    ]);
                    this.reverse = t1.reverse, this.onload = t1.onload, t1.url && ki(t1.url) || t1.url instanceof Xi ? this.set(t1.url) : fi(t1.url) && this.load(t1.url).catch(t1.onerror);
                }
                static getDefaults() {
                    return {
                        onerror: Zi,
                        onload: Zi,
                        reverse: !1
                    };
                }
                get sampleRate() {
                    return this._buffer ? this._buffer.sampleRate : Ji().sampleRate;
                }
                set(t1) {
                    return t1 instanceof Xi ? t1.loaded ? this._buffer = t1.get() : t1.onload = ()=>{
                        this.set(t1), this.onload(this);
                    } : this._buffer = t1, this._reversed && this._reverse(), this;
                }
                get() {
                    return this._buffer;
                }
                load(t1) {
                    return yi(this, void 0, void 0, function*() {
                        const e = Xi.load(t1).then((t1)=>{
                            this.set(t1), this.onload(this);
                        });
                        Xi.downloads.push(e);
                        try {
                            yield e;
                        } finally{
                            const t1 = Xi.downloads.indexOf(e);
                            Xi.downloads.splice(t1, 1);
                        }
                        return this;
                    });
                }
                dispose() {
                    return super.dispose(), this._buffer = void 0, this;
                }
                fromArray(t1) {
                    const e = di(t1) && t1[0].length > 0, s1 = e ? t1.length : 1, n = e ? t1[0].length : t1.length, i = Ji(), o = i.createBuffer(s1, n, i.sampleRate), r = e || 1 !== s1 ? t1 : [
                        t1
                    ];
                    for(let t1 = 0; t1 < s1; t1++)o.copyToChannel(r[t1], t1);
                    return this._buffer = o, this;
                }
                toMono(t1) {
                    if (ui(t1)) this.fromArray(this.toArray(t1));
                    else {
                        let t1 = new Float32Array(this.length);
                        const e = this.numberOfChannels;
                        for(let s1 = 0; s1 < e; s1++){
                            const e = this.toArray(s1);
                            for(let s1 = 0; s1 < e.length; s1++)t1[s1] += e[s1];
                        }
                        t1 = t1.map((t1)=>t1 / e), this.fromArray(t1);
                    }
                    return this;
                }
                toArray(t1) {
                    if (ui(t1)) return this.getChannelData(t1);
                    if (1 === this.numberOfChannels) return this.toArray(0);
                    {
                        const t1 = [];
                        for(let e = 0; e < this.numberOfChannels; e++)t1[e] = this.getChannelData(e);
                        return t1;
                    }
                }
                getChannelData(t1) {
                    return this._buffer ? this._buffer.getChannelData(t1) : new Float32Array(0);
                }
                slice(t1, e = this.duration) {
                    const s1 = Math.floor(t1 * this.sampleRate), n = Math.floor(e * this.sampleRate);
                    ti(s1 < n, "The start time must be less than the end time");
                    const i = n - s1, o = Ji().createBuffer(this.numberOfChannels, i, this.sampleRate);
                    for(let t1 = 0; t1 < this.numberOfChannels; t1++)o.copyToChannel(this.getChannelData(t1).subarray(s1, n), t1);
                    return new Xi(o);
                }
                _reverse() {
                    if (this.loaded) for(let t1 = 0; t1 < this.numberOfChannels; t1++)this.getChannelData(t1).reverse();
                    return this;
                }
                get loaded() {
                    return this.length > 0;
                }
                get duration() {
                    return this._buffer ? this._buffer.duration : 0;
                }
                get length() {
                    return this._buffer ? this._buffer.length : 0;
                }
                get numberOfChannels() {
                    return this._buffer ? this._buffer.numberOfChannels : 0;
                }
                get reverse() {
                    return this._reversed;
                }
                set reverse(t1) {
                    this._reversed !== t1 && (this._reversed = t1, this._reverse());
                }
                static fromArray(t1) {
                    return (new Xi).fromArray(t1);
                }
                static fromUrl(t1) {
                    return yi(this, void 0, void 0, function*() {
                        const e = new Xi;
                        return yield e.load(t1);
                    });
                }
                static load(t1) {
                    return yi(this, void 0, void 0, function*() {
                        const e = t1.match(/\[([^\]\[]+\|.+)\]$/);
                        if (e) {
                            const s1 = e[1].split("|");
                            let n = s1[0];
                            for (const t1 of s1)if (Xi.supportsType(t1)) {
                                n = t1;
                                break;
                            }
                            t1 = t1.replace(e[0], n);
                        }
                        const s1 = "" === Xi.baseUrl || Xi.baseUrl.endsWith("/") ? Xi.baseUrl : Xi.baseUrl + "/", n = yield fetch(s1 + t1);
                        if (!n.ok) throw new Error("could not load url: " + t1);
                        const i = yield n.arrayBuffer();
                        return yield Ji().decodeAudioData(i);
                    });
                }
                static supportsType(t1) {
                    const e = t1.split("."), s1 = e[e.length - 1];
                    return "" !== document.createElement("audio").canPlayType("audio/" + s1);
                }
                static loaded() {
                    return yi(this, void 0, void 0, function*() {
                        for(yield Promise.resolve(); Xi.downloads.length;)yield Xi.downloads[0];
                    });
                }
            }
            Xi.baseUrl = "", Xi.downloads = [];
            class Yi extends Gi {
                constructor(){
                    var t1, e, s1;
                    super({
                        clockSource: "offline",
                        context: Ti(arguments[0]) ? arguments[0] : (t1 = arguments[0], e = arguments[1] * arguments[2], s1 = arguments[2], new Gn(t1, e, s1)),
                        lookAhead: 0,
                        updateInterval: Ti(arguments[0]) ? 128 / arguments[0].sampleRate : 128 / arguments[2]
                    }), this.name = "OfflineContext", this._currentTime = 0, this.isOffline = !0, this._duration = Ti(arguments[0]) ? arguments[0].length / arguments[0].sampleRate : arguments[1];
                }
                now() {
                    return this._currentTime;
                }
                get currentTime() {
                    return this._currentTime;
                }
                _renderClock(t1) {
                    return yi(this, void 0, void 0, function*() {
                        let e = 0;
                        for(; this._duration - this._currentTime >= 0;){
                            this.emit("tick"), this._currentTime += 128 / this.sampleRate, e++;
                            const s1 = Math.floor(this.sampleRate / 128);
                            t1 && e % s1 == 0 && (yield new Promise((t1)=>setTimeout(t1, 1)));
                        }
                    });
                }
                render(t1 = !0) {
                    return yi(this, void 0, void 0, function*() {
                        yield this.workletsAreReady(), yield this._renderClock(t1);
                        const e = yield this._context.startRendering();
                        return new Xi(e);
                    });
                }
                close() {
                    return Promise.resolve();
                }
            }
            const Hi = new class extends Wi {
                constructor(){
                    super(...arguments), this.lookAhead = 0, this.latencyHint = 0, this.isOffline = !1;
                }
                createAnalyser() {
                    return {};
                }
                createOscillator() {
                    return {};
                }
                createBufferSource() {
                    return {};
                }
                createBiquadFilter() {
                    return {};
                }
                createBuffer(t1, e, s1) {
                    return {};
                }
                createChannelMerger(t1) {
                    return {};
                }
                createChannelSplitter(t1) {
                    return {};
                }
                createConstantSource() {
                    return {};
                }
                createConvolver() {
                    return {};
                }
                createDelay(t1) {
                    return {};
                }
                createDynamicsCompressor() {
                    return {};
                }
                createGain() {
                    return {};
                }
                createIIRFilter(t1, e) {
                    return {};
                }
                createPanner() {
                    return {};
                }
                createPeriodicWave(t1, e, s1) {
                    return {};
                }
                createStereoPanner() {
                    return {};
                }
                createWaveShaper() {
                    return {};
                }
                createMediaStreamSource(t1) {
                    return {};
                }
                createMediaElementSource(t1) {
                    return {};
                }
                createMediaStreamDestination() {
                    return {};
                }
                decodeAudioData(t1) {
                    return Promise.resolve({});
                }
                createAudioWorkletNode(t1, e) {
                    return {};
                }
                get rawContext() {
                    return {};
                }
                addAudioWorkletModule(t1, e) {
                    return yi(this, void 0, void 0, function*() {
                        return Promise.resolve();
                    });
                }
                resume() {
                    return Promise.resolve();
                }
                setTimeout(t1, e) {
                    return 0;
                }
                clearTimeout(t1) {
                    return this;
                }
                setInterval(t1, e) {
                    return 0;
                }
                clearInterval(t1) {
                    return this;
                }
                getConstant(t1) {
                    return {};
                }
                get currentTime() {
                    return 0;
                }
                get state() {
                    return {};
                }
                get sampleRate() {
                    return 0;
                }
                get listener() {
                    return {};
                }
                get transport() {
                    return {};
                }
                get draw() {
                    return {};
                }
                set draw(t1) {}
                get destination() {
                    return {};
                }
                set destination(t1) {}
                now() {
                    return 0;
                }
                immediate() {
                    return 0;
                }
            };
            let $i = Hi;
            function Ji() {
                return $i === Hi && gi && Ki(new Gi), $i;
            }
            function Ki(t1) {
                $i = Si(t1) ? new Gi(t1) : Ti(t1) ? new Yi(t1) : t1;
            }
            function to() {
                return $i.resume();
            }
            if (mi && !mi.TONE_SILENCE_LOGGING) {
                let t1 = "v";
                "dev" === o && (t1 = "");
                const e = ` * Tone.js ${t1}${o} * `;
                console.log("%c" + e, "background: #000; color: #fff");
            }
            function eo(t1) {
                return Math.pow(10, t1 / 20);
            }
            function so(t1) {
                return Math.log(t1) / Math.LN10 * 20;
            }
            function no(t1) {
                return Math.pow(2, t1 / 12);
            }
            let io = 440;
            function oo(t1) {
                return Math.round(ro(t1));
            }
            function ro(t1) {
                return 69 + 12 * Math.log2(t1 / io);
            }
            function ao(t1) {
                return io * Math.pow(2, (t1 - 69) / 12);
            }
            class co extends Ei {
                constructor(t1, e, s1){
                    super(), this.defaultUnits = "s", this._val = e, this._units = s1, this.context = t1, this._expressions = this._getExpressions();
                }
                _getExpressions() {
                    return {
                        hz: {
                            method: (t1)=>this._frequencyToUnits(parseFloat(t1)),
                            regexp: /^(\d+(?:\.\d+)?)hz$/i
                        },
                        i: {
                            method: (t1)=>this._ticksToUnits(parseInt(t1, 10)),
                            regexp: /^(\d+)i$/i
                        },
                        m: {
                            method: (t1)=>this._beatsToUnits(parseInt(t1, 10) * this._getTimeSignature()),
                            regexp: /^(\d+)m$/i
                        },
                        n: {
                            method: (t1, e)=>{
                                const s1 = parseInt(t1, 10), n = "." === e ? 1.5 : 1;
                                return 1 === s1 ? this._beatsToUnits(this._getTimeSignature()) * n : this._beatsToUnits(4 / s1) * n;
                            },
                            regexp: /^(\d+)n(\.?)$/i
                        },
                        number: {
                            method: (t1)=>this._expressions[this.defaultUnits].method.call(this, t1),
                            regexp: /^(\d+(?:\.\d+)?)$/
                        },
                        s: {
                            method: (t1)=>this._secondsToUnits(parseFloat(t1)),
                            regexp: /^(\d+(?:\.\d+)?)s$/
                        },
                        samples: {
                            method: (t1)=>parseInt(t1, 10) / this.context.sampleRate,
                            regexp: /^(\d+)samples$/
                        },
                        t: {
                            method: (t1)=>{
                                const e = parseInt(t1, 10);
                                return this._beatsToUnits(8 / (3 * Math.floor(e)));
                            },
                            regexp: /^(\d+)t$/i
                        },
                        tr: {
                            method: (t1, e, s1)=>{
                                let n = 0;
                                return t1 && "0" !== t1 && (n += this._beatsToUnits(this._getTimeSignature() * parseFloat(t1))), e && "0" !== e && (n += this._beatsToUnits(parseFloat(e))), s1 && "0" !== s1 && (n += this._beatsToUnits(parseFloat(s1) / 4)), n;
                            },
                            regexp: /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):?(\d+(?:\.\d+)?)?$/
                        }
                    };
                }
                valueOf() {
                    if (this._val instanceof co && this.fromType(this._val), ai(this._val)) return this._noArg();
                    if (fi(this._val) && ai(this._units)) {
                        for(const t1 in this._expressions)if (this._expressions[t1].regexp.test(this._val.trim())) {
                            this._units = t1;
                            break;
                        }
                    } else if (li(this._val)) {
                        let t1 = 0;
                        for(const e in this._val)if (ci(this._val[e])) {
                            const s1 = this._val[e];
                            t1 += new this.constructor(this.context, e).valueOf() * s1;
                        }
                        return t1;
                    }
                    if (ci(this._units)) {
                        const t1 = this._expressions[this._units], e = this._val.toString().trim().match(t1.regexp);
                        return e ? t1.method.apply(this, e.slice(1)) : t1.method.call(this, this._val);
                    }
                    return fi(this._val) ? parseFloat(this._val) : this._val;
                }
                _frequencyToUnits(t1) {
                    return 1 / t1;
                }
                _beatsToUnits(t1) {
                    return 60 / this._getBpm() * t1;
                }
                _secondsToUnits(t1) {
                    return t1;
                }
                _ticksToUnits(t1) {
                    return t1 * this._beatsToUnits(1) / this._getPPQ();
                }
                _noArg() {
                    return this._now();
                }
                _getBpm() {
                    return this.context.transport.bpm.value;
                }
                _getTimeSignature() {
                    return this.context.transport.timeSignature;
                }
                _getPPQ() {
                    return this.context.transport.PPQ;
                }
                fromType(t1) {
                    switch(this._units = void 0, this.defaultUnits){
                        case "s":
                            this._val = t1.toSeconds();
                            break;
                        case "i":
                            this._val = t1.toTicks();
                            break;
                        case "hz":
                            this._val = t1.toFrequency();
                            break;
                        case "midi":
                            this._val = t1.toMidi();
                    }
                    return this;
                }
                toFrequency() {
                    return 1 / this.toSeconds();
                }
                toSamples() {
                    return this.toSeconds() * this.context.sampleRate;
                }
                toMilliseconds() {
                    return 1e3 * this.toSeconds();
                }
            }
            class ho extends co {
                constructor(){
                    super(...arguments), this.name = "TimeClass";
                }
                _getExpressions() {
                    return Object.assign(super._getExpressions(), {
                        now: {
                            method: (t1)=>this._now() + new this.constructor(this.context, t1).valueOf(),
                            regexp: /^\+(.+)/
                        },
                        quantize: {
                            method: (t1)=>{
                                const e = new ho(this.context, t1).valueOf();
                                return this._secondsToUnits(this.context.transport.nextSubdivision(e));
                            },
                            regexp: /^@(.+)/
                        }
                    });
                }
                quantize(t1, e = 1) {
                    const s1 = new this.constructor(this.context, t1).valueOf(), n = this.valueOf();
                    return n + (Math.round(n / s1) * s1 - n) * e;
                }
                toNotation() {
                    const t1 = this.toSeconds(), e = [
                        "1m"
                    ];
                    for(let t1 = 1; t1 < 9; t1++){
                        const s1 = Math.pow(2, t1);
                        e.push(s1 + "n."), e.push(s1 + "n"), e.push(s1 + "t");
                    }
                    e.push("0");
                    let s1 = e[0], n = new ho(this.context, e[0]).toSeconds();
                    return e.forEach((e)=>{
                        const i = new ho(this.context, e).toSeconds();
                        Math.abs(i - t1) < Math.abs(n - t1) && (s1 = e, n = i);
                    }), s1;
                }
                toBarsBeatsSixteenths() {
                    const t1 = this._beatsToUnits(1);
                    let e = this.valueOf() / t1;
                    e = parseFloat(e.toFixed(4));
                    const s1 = Math.floor(e / this._getTimeSignature());
                    let n = e % 1 * 4;
                    e = Math.floor(e) % this._getTimeSignature();
                    const i = n.toString();
                    i.length > 3 && (n = parseFloat(parseFloat(i).toFixed(3)));
                    return [
                        s1,
                        e,
                        n
                    ].join(":");
                }
                toTicks() {
                    const t1 = this._beatsToUnits(1), e = this.valueOf() / t1;
                    return Math.round(e * this._getPPQ());
                }
                toSeconds() {
                    return this.valueOf();
                }
                toMidi() {
                    return oo(this.toFrequency());
                }
                _now() {
                    return this.context.now();
                }
            }
            function uo(t1, e) {
                return new ho(Ji(), t1, e);
            }
            class lo extends ho {
                constructor(){
                    super(...arguments), this.name = "Frequency", this.defaultUnits = "hz";
                }
                static get A4() {
                    return io;
                }
                static set A4(t1) {
                    !function(t1) {
                        io = t1;
                    }(t1);
                }
                _getExpressions() {
                    return Object.assign({}, super._getExpressions(), {
                        midi: {
                            regexp: /^(\d+(?:\.\d+)?midi)/,
                            method (t1) {
                                return "midi" === this.defaultUnits ? t1 : lo.mtof(t1);
                            }
                        },
                        note: {
                            regexp: /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i,
                            method (t1, e) {
                                const s1 = po[t1.toLowerCase()] + 12 * (parseInt(e, 10) + 1);
                                return "midi" === this.defaultUnits ? s1 : lo.mtof(s1);
                            }
                        },
                        tr: {
                            regexp: /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):?(\d+(?:\.\d+)?)?/,
                            method (t1, e, s1) {
                                let n = 1;
                                return t1 && "0" !== t1 && (n *= this._beatsToUnits(this._getTimeSignature() * parseFloat(t1))), e && "0" !== e && (n *= this._beatsToUnits(parseFloat(e))), s1 && "0" !== s1 && (n *= this._beatsToUnits(parseFloat(s1) / 4)), n;
                            }
                        }
                    });
                }
                transpose(t1) {
                    return new lo(this.context, this.valueOf() * no(t1));
                }
                harmonize(t1) {
                    return t1.map((t1)=>this.transpose(t1));
                }
                toMidi() {
                    return oo(this.valueOf());
                }
                toNote() {
                    const t1 = this.toFrequency(), e = Math.log2(t1 / lo.A4);
                    let s1 = Math.round(12 * e) + 57;
                    const n = Math.floor(s1 / 12);
                    n < 0 && (s1 += -12 * n);
                    return fo[s1 % 12] + n.toString();
                }
                toSeconds() {
                    return 1 / super.toSeconds();
                }
                toTicks() {
                    const t1 = this._beatsToUnits(1), e = this.valueOf() / t1;
                    return Math.floor(e * this._getPPQ());
                }
                _noArg() {
                    return 0;
                }
                _frequencyToUnits(t1) {
                    return t1;
                }
                _ticksToUnits(t1) {
                    return 1 / (60 * t1 / (this._getBpm() * this._getPPQ()));
                }
                _beatsToUnits(t1) {
                    return 1 / super._beatsToUnits(t1);
                }
                _secondsToUnits(t1) {
                    return 1 / t1;
                }
                static mtof(t1) {
                    return ao(t1);
                }
                static ftom(t1) {
                    return oo(t1);
                }
            }
            const po = {
                cbb: -2,
                cb: -1,
                c: 0,
                "c#": 1,
                cx: 2,
                dbb: 0,
                db: 1,
                d: 2,
                "d#": 3,
                dx: 4,
                ebb: 2,
                eb: 3,
                e: 4,
                "e#": 5,
                ex: 6,
                fbb: 3,
                fb: 4,
                f: 5,
                "f#": 6,
                fx: 7,
                gbb: 5,
                gb: 6,
                g: 7,
                "g#": 8,
                gx: 9,
                abb: 7,
                ab: 8,
                a: 9,
                "a#": 10,
                ax: 11,
                bbb: 9,
                bb: 10,
                b: 11,
                "b#": 12,
                bx: 13
            }, fo = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B"
            ];
            function _o(t1, e) {
                return new lo(Ji(), t1, e);
            }
            class mo extends ho {
                constructor(){
                    super(...arguments), this.name = "TransportTime";
                }
                _now() {
                    return this.context.transport.seconds;
                }
            }
            function go(t1, e) {
                return new mo(Ji(), t1, e);
            }
            class vo extends Ei {
                constructor(){
                    super();
                    const t1 = Di(vo.getDefaults(), arguments, [
                        "context"
                    ]);
                    this.defaultContext ? this.context = this.defaultContext : this.context = t1.context;
                }
                static getDefaults() {
                    return {
                        context: Ji()
                    };
                }
                now() {
                    return this.context.currentTime + this.context.lookAhead;
                }
                immediate() {
                    return this.context.currentTime;
                }
                get sampleTime() {
                    return 1 / this.context.sampleRate;
                }
                get blockTime() {
                    return 128 / this.context.sampleRate;
                }
                toSeconds(t1) {
                    return new ho(this.context, t1).toSeconds();
                }
                toFrequency(t1) {
                    return new lo(this.context, t1).toFrequency();
                }
                toTicks(t1) {
                    return new mo(this.context, t1).toTicks();
                }
                _getPartialProperties(t1) {
                    const e = this.get();
                    return Object.keys(e).forEach((s1)=>{
                        ai(t1[s1]) && delete e[s1];
                    }), e;
                }
                get() {
                    const t1 = this.constructor.getDefaults();
                    return Object.keys(t1).forEach((e)=>{
                        if (Reflect.has(this, e)) {
                            const s1 = this[e];
                            ci(s1) && ci(s1.value) && ci(s1.setValueAtTime) ? t1[e] = s1.value : s1 instanceof vo ? t1[e] = s1._getPartialProperties(t1[e]) : di(s1) || ui(s1) || fi(s1) || pi(s1) ? t1[e] = s1 : delete t1[e];
                        }
                    }), t1;
                }
                set(t1) {
                    return Object.keys(t1).forEach((e)=>{
                        Reflect.has(this, e) && ci(this[e]) && (this[e] && ci(this[e].value) && ci(this[e].setValueAtTime) ? this[e].value !== t1[e] && (this[e].value = t1[e]) : this[e] instanceof vo ? this[e].set(t1[e]) : this[e] = t1[e]);
                    }), this;
                }
            }
            class yo extends Ni {
                constructor(t1 = "stopped"){
                    super(), this.name = "StateTimeline", this._initial = t1, this.setStateAtTime(this._initial, 0);
                }
                getValueAtTime(t1) {
                    const e = this.get(t1);
                    return null !== e ? e.state : this._initial;
                }
                setStateAtTime(t1, e, s1) {
                    return ei(e, 0), this.add(Object.assign({}, s1, {
                        state: t1,
                        time: e
                    })), this;
                }
                getLastState(t1, e) {
                    for(let s1 = this._search(e); s1 >= 0; s1--){
                        const e = this._timeline[s1];
                        if (e.state === t1) return e;
                    }
                }
                getNextState(t1, e) {
                    const s1 = this._search(e);
                    if (-1 !== s1) for(let e = s1; e < this._timeline.length; e++){
                        const s1 = this._timeline[e];
                        if (s1.state === t1) return s1;
                    }
                }
            }
            class xo extends vo {
                constructor(){
                    super(Di(xo.getDefaults(), arguments, [
                        "param",
                        "units",
                        "convert"
                    ])), this.name = "Param", this.overridden = !1, this._minOutput = 1e-7;
                    const t1 = Di(xo.getDefaults(), arguments, [
                        "param",
                        "units",
                        "convert"
                    ]);
                    for(ti(ci(t1.param) && (wi(t1.param) || t1.param instanceof xo), "param must be an AudioParam"); !wi(t1.param);)t1.param = t1.param._param;
                    this._swappable = !!ci(t1.swappable) && t1.swappable, this._swappable ? (this.input = this.context.createGain(), this._param = t1.param, this.input.connect(this._param)) : this._param = this.input = t1.param, this._events = new Ni(1e3), this._initialValue = this._param.defaultValue, this.units = t1.units, this.convert = t1.convert, this._minValue = t1.minValue, this._maxValue = t1.maxValue, ci(t1.value) && t1.value !== this._toType(this._initialValue) && this.setValueAtTime(t1.value, 0);
                }
                static getDefaults() {
                    return Object.assign(vo.getDefaults(), {
                        convert: !0,
                        units: "number"
                    });
                }
                get value() {
                    const t1 = this.now();
                    return this.getValueAtTime(t1);
                }
                set value(t1) {
                    this.cancelScheduledValues(this.now()), this.setValueAtTime(t1, this.now());
                }
                get minValue() {
                    return ci(this._minValue) ? this._minValue : "time" === this.units || "frequency" === this.units || "normalRange" === this.units || "positive" === this.units || "transportTime" === this.units || "ticks" === this.units || "bpm" === this.units || "hertz" === this.units || "samples" === this.units ? 0 : "audioRange" === this.units ? -1 : "decibels" === this.units ? -1 / 0 : this._param.minValue;
                }
                get maxValue() {
                    return ci(this._maxValue) ? this._maxValue : "normalRange" === this.units || "audioRange" === this.units ? 1 : this._param.maxValue;
                }
                _is(t1, e) {
                    return this.units === e;
                }
                _assertRange(t1) {
                    return ci(this.maxValue) && ci(this.minValue) && ei(t1, this._fromType(this.minValue), this._fromType(this.maxValue)), t1;
                }
                _fromType(t1) {
                    return this.convert && !this.overridden ? this._is(t1, "time") ? this.toSeconds(t1) : this._is(t1, "decibels") ? eo(t1) : this._is(t1, "frequency") ? this.toFrequency(t1) : t1 : this.overridden ? 0 : t1;
                }
                _toType(t1) {
                    return this.convert && "decibels" === this.units ? so(t1) : t1;
                }
                setValueAtTime(t1, e) {
                    const s1 = this.toSeconds(e), n = this._fromType(t1);
                    return ti(isFinite(n) && isFinite(s1), `Invalid argument(s) to setValueAtTime: ${JSON.stringify(t1)}, ${JSON.stringify(e)}`), this._assertRange(n), this.log(this.units, "setValueAtTime", t1, s1), this._events.add({
                        time: s1,
                        type: "setValueAtTime",
                        value: n
                    }), this._param.setValueAtTime(n, s1), this;
                }
                getValueAtTime(t1) {
                    const e = Math.max(this.toSeconds(t1), 0), s1 = this._events.getAfter(e), n = this._events.get(e);
                    let i = this._initialValue;
                    if (null === n) i = this._initialValue;
                    else if ("setTargetAtTime" !== n.type || null !== s1 && "setValueAtTime" !== s1.type) {
                        if (null === s1) i = n.value;
                        else if ("linearRampToValueAtTime" === s1.type || "exponentialRampToValueAtTime" === s1.type) {
                            let t1 = n.value;
                            if ("setTargetAtTime" === n.type) {
                                const e = this._events.getBefore(n.time);
                                t1 = null === e ? this._initialValue : e.value;
                            }
                            i = "linearRampToValueAtTime" === s1.type ? this._linearInterpolate(n.time, t1, s1.time, s1.value, e) : this._exponentialInterpolate(n.time, t1, s1.time, s1.value, e);
                        } else i = n.value;
                    } else {
                        const t1 = this._events.getBefore(n.time);
                        let s1;
                        s1 = null === t1 ? this._initialValue : t1.value, "setTargetAtTime" === n.type && (i = this._exponentialApproach(n.time, s1, n.value, n.constant, e));
                    }
                    return this._toType(i);
                }
                setRampPoint(t1) {
                    t1 = this.toSeconds(t1);
                    let e = this.getValueAtTime(t1);
                    return this.cancelAndHoldAtTime(t1), 0 === this._fromType(e) && (e = this._toType(this._minOutput)), this.setValueAtTime(e, t1), this;
                }
                linearRampToValueAtTime(t1, e) {
                    const s1 = this._fromType(t1), n = this.toSeconds(e);
                    return ti(isFinite(s1) && isFinite(n), `Invalid argument(s) to linearRampToValueAtTime: ${JSON.stringify(t1)}, ${JSON.stringify(e)}`), this._assertRange(s1), this._events.add({
                        time: n,
                        type: "linearRampToValueAtTime",
                        value: s1
                    }), this.log(this.units, "linearRampToValueAtTime", t1, n), this._param.linearRampToValueAtTime(s1, n), this;
                }
                exponentialRampToValueAtTime(t1, e) {
                    let s1 = this._fromType(t1);
                    s1 = Ii(s1, 0) ? this._minOutput : s1, this._assertRange(s1);
                    const n = this.toSeconds(e);
                    return ti(isFinite(s1) && isFinite(n), `Invalid argument(s) to exponentialRampToValueAtTime: ${JSON.stringify(t1)}, ${JSON.stringify(e)}`), this._events.add({
                        time: n,
                        type: "exponentialRampToValueAtTime",
                        value: s1
                    }), this.log(this.units, "exponentialRampToValueAtTime", t1, n), this._param.exponentialRampToValueAtTime(s1, n), this;
                }
                exponentialRampTo(t1, e, s1) {
                    return s1 = this.toSeconds(s1), this.setRampPoint(s1), this.exponentialRampToValueAtTime(t1, s1 + this.toSeconds(e)), this;
                }
                linearRampTo(t1, e, s1) {
                    return s1 = this.toSeconds(s1), this.setRampPoint(s1), this.linearRampToValueAtTime(t1, s1 + this.toSeconds(e)), this;
                }
                targetRampTo(t1, e, s1) {
                    return s1 = this.toSeconds(s1), this.setRampPoint(s1), this.exponentialApproachValueAtTime(t1, s1, e), this;
                }
                exponentialApproachValueAtTime(t1, e, s1) {
                    e = this.toSeconds(e), s1 = this.toSeconds(s1);
                    const n = Math.log(s1 + 1) / Math.log(200);
                    return this.setTargetAtTime(t1, e, n), this.cancelAndHoldAtTime(e + .9 * s1), this.linearRampToValueAtTime(t1, e + s1), this;
                }
                setTargetAtTime(t1, e, s1) {
                    const n = this._fromType(t1);
                    ti(isFinite(s1) && s1 > 0, "timeConstant must be a number greater than 0");
                    const i = this.toSeconds(e);
                    return this._assertRange(n), ti(isFinite(n) && isFinite(i), `Invalid argument(s) to setTargetAtTime: ${JSON.stringify(t1)}, ${JSON.stringify(e)}`), this._events.add({
                        constant: s1,
                        time: i,
                        type: "setTargetAtTime",
                        value: n
                    }), this.log(this.units, "setTargetAtTime", t1, i, s1), this._param.setTargetAtTime(n, i, s1), this;
                }
                setValueCurveAtTime(t1, e, s1, n = 1) {
                    s1 = this.toSeconds(s1), e = this.toSeconds(e);
                    const i = this._fromType(t1[0]) * n;
                    this.setValueAtTime(this._toType(i), e);
                    const o = s1 / (t1.length - 1);
                    for(let s1 = 1; s1 < t1.length; s1++){
                        const i = this._fromType(t1[s1]) * n;
                        this.linearRampToValueAtTime(this._toType(i), e + s1 * o);
                    }
                    return this;
                }
                cancelScheduledValues(t1) {
                    const e = this.toSeconds(t1);
                    return ti(isFinite(e), "Invalid argument to cancelScheduledValues: " + JSON.stringify(t1)), this._events.cancel(e), this._param.cancelScheduledValues(e), this.log(this.units, "cancelScheduledValues", e), this;
                }
                cancelAndHoldAtTime(t1) {
                    const e = this.toSeconds(t1), s1 = this._fromType(this.getValueAtTime(e));
                    ti(isFinite(e), "Invalid argument to cancelAndHoldAtTime: " + JSON.stringify(t1)), this.log(this.units, "cancelAndHoldAtTime", e, "value=" + s1);
                    const n = this._events.get(e), i = this._events.getAfter(e);
                    return n && Ii(n.time, e) ? i ? (this._param.cancelScheduledValues(i.time), this._events.cancel(i.time)) : (this._param.cancelAndHoldAtTime(e), this._events.cancel(e + this.sampleTime)) : i && (this._param.cancelScheduledValues(i.time), this._events.cancel(i.time), "linearRampToValueAtTime" === i.type ? this.linearRampToValueAtTime(this._toType(s1), e) : "exponentialRampToValueAtTime" === i.type && this.exponentialRampToValueAtTime(this._toType(s1), e)), this._events.add({
                        time: e,
                        type: "setValueAtTime",
                        value: s1
                    }), this._param.setValueAtTime(s1, e), this;
                }
                rampTo(t1, e = .1, s1) {
                    return "frequency" === this.units || "bpm" === this.units || "decibels" === this.units ? this.exponentialRampTo(t1, e, s1) : this.linearRampTo(t1, e, s1), this;
                }
                apply(t1) {
                    const e = this.context.currentTime;
                    t1.setValueAtTime(this.getValueAtTime(e), e);
                    const s1 = this._events.get(e);
                    if (s1 && "setTargetAtTime" === s1.type) {
                        const n = this._events.getAfter(s1.time), i = n ? n.time : e + 2, o = (i - e) / 10;
                        for(let s1 = e; s1 < i; s1 += o)t1.linearRampToValueAtTime(this.getValueAtTime(s1), s1);
                    }
                    return this._events.forEachAfter(this.context.currentTime, (e)=>{
                        "cancelScheduledValues" === e.type ? t1.cancelScheduledValues(e.time) : "setTargetAtTime" === e.type ? t1.setTargetAtTime(e.value, e.time, e.constant) : t1[e.type](e.value, e.time);
                    }), this;
                }
                setParam(t1) {
                    ti(this._swappable, "The Param must be assigned as 'swappable' in the constructor");
                    const e = this.input;
                    return e.disconnect(this._param), this.apply(t1), this._param = t1, e.connect(this._param), this;
                }
                dispose() {
                    return super.dispose(), this._events.dispose(), this;
                }
                get defaultValue() {
                    return this._toType(this._param.defaultValue);
                }
                _exponentialApproach(t1, e, s1, n, i) {
                    return s1 + (e - s1) * Math.exp(-(i - t1) / n);
                }
                _linearInterpolate(t1, e, s1, n, i) {
                    return e + (i - t1) / (s1 - t1) * (n - e);
                }
                _exponentialInterpolate(t1, e, s1, n, i) {
                    return e * Math.pow(n / e, (i - t1) / (s1 - t1));
                }
            }
            class wo extends vo {
                constructor(){
                    super(...arguments), this.name = "ToneAudioNode", this._internalChannels = [];
                }
                get numberOfInputs() {
                    return ci(this.input) ? wi(this.input) || this.input instanceof xo ? 1 : this.input.numberOfInputs : 0;
                }
                get numberOfOutputs() {
                    return ci(this.output) ? this.output.numberOfOutputs : 0;
                }
                _isAudioNode(t1) {
                    return ci(t1) && (t1 instanceof wo || bi(t1));
                }
                _getInternalNodes() {
                    const t1 = this._internalChannels.slice(0);
                    return this._isAudioNode(this.input) && t1.push(this.input), this._isAudioNode(this.output) && this.input !== this.output && t1.push(this.output), t1;
                }
                _setChannelProperties(t1) {
                    this._getInternalNodes().forEach((e)=>{
                        e.channelCount = t1.channelCount, e.channelCountMode = t1.channelCountMode, e.channelInterpretation = t1.channelInterpretation;
                    });
                }
                _getChannelProperties() {
                    const t1 = this._getInternalNodes();
                    ti(t1.length > 0, "ToneAudioNode does not have any internal nodes");
                    const e = t1[0];
                    return {
                        channelCount: e.channelCount,
                        channelCountMode: e.channelCountMode,
                        channelInterpretation: e.channelInterpretation
                    };
                }
                get channelCount() {
                    return this._getChannelProperties().channelCount;
                }
                set channelCount(t1) {
                    const e = this._getChannelProperties();
                    this._setChannelProperties(Object.assign(e, {
                        channelCount: t1
                    }));
                }
                get channelCountMode() {
                    return this._getChannelProperties().channelCountMode;
                }
                set channelCountMode(t1) {
                    const e = this._getChannelProperties();
                    this._setChannelProperties(Object.assign(e, {
                        channelCountMode: t1
                    }));
                }
                get channelInterpretation() {
                    return this._getChannelProperties().channelInterpretation;
                }
                set channelInterpretation(t1) {
                    const e = this._getChannelProperties();
                    this._setChannelProperties(Object.assign(e, {
                        channelInterpretation: t1
                    }));
                }
                connect(t1, e = 0, s1 = 0) {
                    return To(this, t1, e, s1), this;
                }
                toDestination() {
                    return this.connect(this.context.destination), this;
                }
                toMaster() {
                    return ri("toMaster() has been renamed toDestination()"), this.toDestination();
                }
                disconnect(t1, e = 0, s1 = 0) {
                    return So(this, t1, e, s1), this;
                }
                chain(...t1) {
                    return bo(this, ...t1), this;
                }
                fan(...t1) {
                    return t1.forEach((t1)=>this.connect(t1)), this;
                }
                dispose() {
                    return super.dispose(), ci(this.input) && (this.input instanceof wo ? this.input.dispose() : bi(this.input) && this.input.disconnect()), ci(this.output) && (this.output instanceof wo ? this.output.dispose() : bi(this.output) && this.output.disconnect()), this._internalChannels = [], this;
                }
            }
            function bo(...t1) {
                const e = t1.shift();
                t1.reduce((t1, e)=>(t1 instanceof wo ? t1.connect(e) : bi(t1) && To(t1, e), e), e);
            }
            function To(t1, e, s1 = 0, n = 0) {
                for(ti(ci(t1), "Cannot connect from undefined node"), ti(ci(e), "Cannot connect to undefined node"), (e instanceof wo || bi(e)) && ti(e.numberOfInputs > 0, "Cannot connect to node with no inputs"), ti(t1.numberOfOutputs > 0, "Cannot connect from node with no outputs"); e instanceof wo || e instanceof xo;)ci(e.input) && (e = e.input);
                for(; t1 instanceof wo;)ci(t1.output) && (t1 = t1.output);
                wi(e) ? t1.connect(e, s1) : t1.connect(e, s1, n);
            }
            function So(t1, e, s1 = 0, n = 0) {
                if (ci(e)) for(; e instanceof wo;)e = e.input;
                for(; !bi(t1);)ci(t1.output) && (t1 = t1.output);
                wi(e) ? t1.disconnect(e, s1) : bi(e) ? t1.disconnect(e, s1, n) : t1.disconnect();
            }
            class ko extends wo {
                constructor(){
                    super(Di(ko.getDefaults(), arguments, [
                        "gain",
                        "units"
                    ])), this.name = "Gain", this._gainNode = this.context.createGain(), this.input = this._gainNode, this.output = this._gainNode;
                    const t1 = Di(ko.getDefaults(), arguments, [
                        "gain",
                        "units"
                    ]);
                    this.gain = new xo({
                        context: this.context,
                        convert: t1.convert,
                        param: this._gainNode.gain,
                        units: t1.units,
                        value: t1.gain,
                        minValue: t1.minValue,
                        maxValue: t1.maxValue
                    }), Ui(this, "gain");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        convert: !0,
                        gain: 1,
                        units: "gain"
                    });
                }
                dispose() {
                    return super.dispose(), this._gainNode.disconnect(), this.gain.dispose(), this;
                }
            }
            class Co extends wo {
                constructor(t1){
                    super(t1), this.onended = Zi, this._startTime = -1, this._stopTime = -1, this._timeout = -1, this.output = new ko({
                        context: this.context,
                        gain: 0
                    }), this._gainNode = this.output, this.getStateAtTime = function(t1) {
                        const e = this.toSeconds(t1);
                        return -1 !== this._startTime && e >= this._startTime && (-1 === this._stopTime || e <= this._stopTime) ? "started" : "stopped";
                    }, this._fadeIn = t1.fadeIn, this._fadeOut = t1.fadeOut, this._curve = t1.curve, this.onended = t1.onended;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        curve: "linear",
                        fadeIn: 0,
                        fadeOut: 0,
                        onended: Zi
                    });
                }
                _startGain(t1, e = 1) {
                    ti(-1 === this._startTime, "Source cannot be started more than once");
                    const s1 = this.toSeconds(this._fadeIn);
                    return this._startTime = t1 + s1, this._startTime = Math.max(this._startTime, this.context.currentTime), s1 > 0 ? (this._gainNode.gain.setValueAtTime(0, t1), "linear" === this._curve ? this._gainNode.gain.linearRampToValueAtTime(e, t1 + s1) : this._gainNode.gain.exponentialApproachValueAtTime(e, t1, s1)) : this._gainNode.gain.setValueAtTime(e, t1), this;
                }
                stop(t1) {
                    return this.log("stop", t1), this._stopGain(this.toSeconds(t1)), this;
                }
                _stopGain(t1) {
                    ti(-1 !== this._startTime, "'start' must be called before 'stop'"), this.cancelStop();
                    const e = this.toSeconds(this._fadeOut);
                    return this._stopTime = this.toSeconds(t1) + e, this._stopTime = Math.max(this._stopTime, this.context.currentTime), e > 0 ? "linear" === this._curve ? this._gainNode.gain.linearRampTo(0, e, t1) : this._gainNode.gain.targetRampTo(0, e, t1) : (this._gainNode.gain.cancelAndHoldAtTime(t1), this._gainNode.gain.setValueAtTime(0, t1)), this.context.clearTimeout(this._timeout), this._timeout = this.context.setTimeout(()=>{
                        const t1 = "exponential" === this._curve ? 2 * e : 0;
                        this._stopSource(this.now() + t1), this._onended();
                    }, this._stopTime - this.context.currentTime), this;
                }
                _onended() {
                    if (this.onended !== Zi && (this.onended(this), this.onended = Zi, !this.context.isOffline)) {
                        const t1 = ()=>this.dispose();
                        void 0 !== window.requestIdleCallback ? window.requestIdleCallback(t1) : setTimeout(t1, 1e3);
                    }
                }
                get state() {
                    return this.getStateAtTime(this.now());
                }
                cancelStop() {
                    return this.log("cancelStop"), ti(-1 !== this._startTime, "Source is not started"), this._gainNode.gain.cancelScheduledValues(this._startTime + this.sampleTime), this.context.clearTimeout(this._timeout), this._stopTime = -1, this;
                }
                dispose() {
                    return super.dispose(), this._gainNode.disconnect(), this;
                }
            }
            class Ao extends Co {
                constructor(){
                    super(Di(Ao.getDefaults(), arguments, [
                        "offset"
                    ])), this.name = "ToneConstantSource", this._source = this.context.createConstantSource();
                    const t1 = Di(Ao.getDefaults(), arguments, [
                        "offset"
                    ]);
                    To(this._source, this._gainNode), this.offset = new xo({
                        context: this.context,
                        convert: t1.convert,
                        param: this._source.offset,
                        units: t1.units,
                        value: t1.offset,
                        minValue: t1.minValue,
                        maxValue: t1.maxValue
                    });
                }
                static getDefaults() {
                    return Object.assign(Co.getDefaults(), {
                        convert: !0,
                        offset: 1,
                        units: "number"
                    });
                }
                start(t1) {
                    const e = this.toSeconds(t1);
                    return this.log("start", e), this._startGain(e), this._source.start(e), this;
                }
                _stopSource(t1) {
                    this._source.stop(t1);
                }
                dispose() {
                    return super.dispose(), "started" === this.state && this.stop(), this._source.disconnect(), this.offset.dispose(), this;
                }
            }
            class Do extends wo {
                constructor(){
                    super(Di(Do.getDefaults(), arguments, [
                        "value",
                        "units"
                    ])), this.name = "Signal", this.override = !0;
                    const t1 = Di(Do.getDefaults(), arguments, [
                        "value",
                        "units"
                    ]);
                    this.output = this._constantSource = new Ao({
                        context: this.context,
                        convert: t1.convert,
                        offset: t1.value,
                        units: t1.units,
                        minValue: t1.minValue,
                        maxValue: t1.maxValue
                    }), this._constantSource.start(0), this.input = this._param = this._constantSource.offset;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        convert: !0,
                        units: "number",
                        value: 0
                    });
                }
                connect(t1, e = 0, s1 = 0) {
                    return Oo(this, t1, e, s1), this;
                }
                dispose() {
                    return super.dispose(), this._param.dispose(), this._constantSource.dispose(), this;
                }
                setValueAtTime(t1, e) {
                    return this._param.setValueAtTime(t1, e), this;
                }
                getValueAtTime(t1) {
                    return this._param.getValueAtTime(t1);
                }
                setRampPoint(t1) {
                    return this._param.setRampPoint(t1), this;
                }
                linearRampToValueAtTime(t1, e) {
                    return this._param.linearRampToValueAtTime(t1, e), this;
                }
                exponentialRampToValueAtTime(t1, e) {
                    return this._param.exponentialRampToValueAtTime(t1, e), this;
                }
                exponentialRampTo(t1, e, s1) {
                    return this._param.exponentialRampTo(t1, e, s1), this;
                }
                linearRampTo(t1, e, s1) {
                    return this._param.linearRampTo(t1, e, s1), this;
                }
                targetRampTo(t1, e, s1) {
                    return this._param.targetRampTo(t1, e, s1), this;
                }
                exponentialApproachValueAtTime(t1, e, s1) {
                    return this._param.exponentialApproachValueAtTime(t1, e, s1), this;
                }
                setTargetAtTime(t1, e, s1) {
                    return this._param.setTargetAtTime(t1, e, s1), this;
                }
                setValueCurveAtTime(t1, e, s1, n) {
                    return this._param.setValueCurveAtTime(t1, e, s1, n), this;
                }
                cancelScheduledValues(t1) {
                    return this._param.cancelScheduledValues(t1), this;
                }
                cancelAndHoldAtTime(t1) {
                    return this._param.cancelAndHoldAtTime(t1), this;
                }
                rampTo(t1, e, s1) {
                    return this._param.rampTo(t1, e, s1), this;
                }
                get value() {
                    return this._param.value;
                }
                set value(t1) {
                    this._param.value = t1;
                }
                get convert() {
                    return this._param.convert;
                }
                set convert(t1) {
                    this._param.convert = t1;
                }
                get units() {
                    return this._param.units;
                }
                get overridden() {
                    return this._param.overridden;
                }
                set overridden(t1) {
                    this._param.overridden = t1;
                }
                get maxValue() {
                    return this._param.maxValue;
                }
                get minValue() {
                    return this._param.minValue;
                }
                apply(t1) {
                    return this._param.apply(t1), this;
                }
            }
            function Oo(t1, e, s1, n) {
                (e instanceof xo || wi(e) || e instanceof Do && e.override) && (e.cancelScheduledValues(0), e.setValueAtTime(0, 0), e instanceof Do && (e.overridden = !0)), To(t1, e, s1, n);
            }
            class Mo extends xo {
                constructor(){
                    super(Di(Mo.getDefaults(), arguments, [
                        "value"
                    ])), this.name = "TickParam", this._events = new Ni(1 / 0), this._multiplier = 1;
                    const t1 = Di(Mo.getDefaults(), arguments, [
                        "value"
                    ]);
                    this._multiplier = t1.multiplier, this._events.cancel(0), this._events.add({
                        ticks: 0,
                        time: 0,
                        type: "setValueAtTime",
                        value: this._fromType(t1.value)
                    }), this.setValueAtTime(t1.value, 0);
                }
                static getDefaults() {
                    return Object.assign(xo.getDefaults(), {
                        multiplier: 1,
                        units: "hertz",
                        value: 1
                    });
                }
                setTargetAtTime(t1, e, s1) {
                    e = this.toSeconds(e), this.setRampPoint(e);
                    const n = this._fromType(t1), i = this._events.get(e), o = Math.round(Math.max(1 / s1, 1));
                    for(let t1 = 0; t1 <= o; t1++){
                        const o = s1 * t1 + e, r = this._exponentialApproach(i.time, i.value, n, s1, o);
                        this.linearRampToValueAtTime(this._toType(r), o);
                    }
                    return this;
                }
                setValueAtTime(t1, e) {
                    const s1 = this.toSeconds(e);
                    super.setValueAtTime(t1, e);
                    const n = this._events.get(s1), i = this._events.previousEvent(n), o = this._getTicksUntilEvent(i, s1);
                    return n.ticks = Math.max(o, 0), this;
                }
                linearRampToValueAtTime(t1, e) {
                    const s1 = this.toSeconds(e);
                    super.linearRampToValueAtTime(t1, e);
                    const n = this._events.get(s1), i = this._events.previousEvent(n), o = this._getTicksUntilEvent(i, s1);
                    return n.ticks = Math.max(o, 0), this;
                }
                exponentialRampToValueAtTime(t1, e) {
                    e = this.toSeconds(e);
                    const s1 = this._fromType(t1), n = this._events.get(e), i = Math.round(Math.max(10 * (e - n.time), 1)), o = (e - n.time) / i;
                    for(let t1 = 0; t1 <= i; t1++){
                        const i = o * t1 + n.time, r = this._exponentialInterpolate(n.time, n.value, e, s1, i);
                        this.linearRampToValueAtTime(this._toType(r), i);
                    }
                    return this;
                }
                _getTicksUntilEvent(t1, e) {
                    if (null === t1) t1 = {
                        ticks: 0,
                        time: 0,
                        type: "setValueAtTime",
                        value: 0
                    };
                    else if (ai(t1.ticks)) {
                        const e = this._events.previousEvent(t1);
                        t1.ticks = this._getTicksUntilEvent(e, t1.time);
                    }
                    const s1 = this._fromType(this.getValueAtTime(t1.time));
                    let n = this._fromType(this.getValueAtTime(e));
                    const i = this._events.get(e);
                    return i && i.time === e && "setValueAtTime" === i.type && (n = this._fromType(this.getValueAtTime(e - this.sampleTime))), .5 * (e - t1.time) * (s1 + n) + t1.ticks;
                }
                getTicksAtTime(t1) {
                    const e = this.toSeconds(t1), s1 = this._events.get(e);
                    return Math.max(this._getTicksUntilEvent(s1, e), 0);
                }
                getDurationOfTicks(t1, e) {
                    const s1 = this.toSeconds(e), n = this.getTicksAtTime(e);
                    return this.getTimeOfTick(n + t1) - s1;
                }
                getTimeOfTick(t1) {
                    const e = this._events.get(t1, "ticks"), s1 = this._events.getAfter(t1, "ticks");
                    if (e && e.ticks === t1) return e.time;
                    if (e && s1 && "linearRampToValueAtTime" === s1.type && e.value !== s1.value) {
                        const n = this._fromType(this.getValueAtTime(e.time)), i = (this._fromType(this.getValueAtTime(s1.time)) - n) / (s1.time - e.time), o = Math.sqrt(Math.pow(n, 2) - 2 * i * (e.ticks - t1)), r = (-n + o) / i, a = (-n - o) / i;
                        return (r > 0 ? r : a) + e.time;
                    }
                    return e ? 0 === e.value ? 1 / 0 : e.time + (t1 - e.ticks) / e.value : t1 / this._initialValue;
                }
                ticksToTime(t1, e) {
                    return this.getDurationOfTicks(t1, e);
                }
                timeToTicks(t1, e) {
                    const s1 = this.toSeconds(e), n = this.toSeconds(t1), i = this.getTicksAtTime(s1);
                    return this.getTicksAtTime(s1 + n) - i;
                }
                _fromType(t1) {
                    return "bpm" === this.units && this.multiplier ? 1 / (60 / t1 / this.multiplier) : super._fromType(t1);
                }
                _toType(t1) {
                    return "bpm" === this.units && this.multiplier ? t1 / this.multiplier * 60 : super._toType(t1);
                }
                get multiplier() {
                    return this._multiplier;
                }
                set multiplier(t1) {
                    const e = this.value;
                    this._multiplier = t1, this.cancelScheduledValues(0), this.setValueAtTime(e, 0);
                }
            }
            class Eo extends Do {
                constructor(){
                    super(Di(Eo.getDefaults(), arguments, [
                        "value"
                    ])), this.name = "TickSignal";
                    const t1 = Di(Eo.getDefaults(), arguments, [
                        "value"
                    ]);
                    this.input = this._param = new Mo({
                        context: this.context,
                        convert: t1.convert,
                        multiplier: t1.multiplier,
                        param: this._constantSource.offset,
                        units: t1.units,
                        value: t1.value
                    });
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        multiplier: 1,
                        units: "hertz",
                        value: 1
                    });
                }
                ticksToTime(t1, e) {
                    return this._param.ticksToTime(t1, e);
                }
                timeToTicks(t1, e) {
                    return this._param.timeToTicks(t1, e);
                }
                getTimeOfTick(t1) {
                    return this._param.getTimeOfTick(t1);
                }
                getDurationOfTicks(t1, e) {
                    return this._param.getDurationOfTicks(t1, e);
                }
                getTicksAtTime(t1) {
                    return this._param.getTicksAtTime(t1);
                }
                get multiplier() {
                    return this._param.multiplier;
                }
                set multiplier(t1) {
                    this._param.multiplier = t1;
                }
                dispose() {
                    return super.dispose(), this._param.dispose(), this;
                }
            }
            class Ro extends vo {
                constructor(){
                    super(Di(Ro.getDefaults(), arguments, [
                        "frequency"
                    ])), this.name = "TickSource", this._state = new yo, this._tickOffset = new Ni;
                    const t1 = Di(Ro.getDefaults(), arguments, [
                        "frequency"
                    ]);
                    this.frequency = new Eo({
                        context: this.context,
                        units: t1.units,
                        value: t1.frequency
                    }), Ui(this, "frequency"), this._state.setStateAtTime("stopped", 0), this.setTicksAtTime(0, 0);
                }
                static getDefaults() {
                    return Object.assign({
                        frequency: 1,
                        units: "hertz"
                    }, vo.getDefaults());
                }
                get state() {
                    return this.getStateAtTime(this.now());
                }
                start(t1, e) {
                    const s1 = this.toSeconds(t1);
                    return "started" !== this._state.getValueAtTime(s1) && (this._state.setStateAtTime("started", s1), ci(e) && this.setTicksAtTime(e, s1)), this;
                }
                stop(t1) {
                    const e = this.toSeconds(t1);
                    if ("stopped" === this._state.getValueAtTime(e)) {
                        const t1 = this._state.get(e);
                        t1 && t1.time > 0 && (this._tickOffset.cancel(t1.time), this._state.cancel(t1.time));
                    }
                    return this._state.cancel(e), this._state.setStateAtTime("stopped", e), this.setTicksAtTime(0, e), this;
                }
                pause(t1) {
                    const e = this.toSeconds(t1);
                    return "started" === this._state.getValueAtTime(e) && this._state.setStateAtTime("paused", e), this;
                }
                cancel(t1) {
                    return t1 = this.toSeconds(t1), this._state.cancel(t1), this._tickOffset.cancel(t1), this;
                }
                getTicksAtTime(t1) {
                    const e = this.toSeconds(t1), s1 = this._state.getLastState("stopped", e), n = {
                        state: "paused",
                        time: e
                    };
                    this._state.add(n);
                    let i = s1, o = 0;
                    return this._state.forEachBetween(s1.time, e + this.sampleTime, (t1)=>{
                        let e = i.time;
                        const s1 = this._tickOffset.get(t1.time);
                        s1 && s1.time >= i.time && (o = s1.ticks, e = s1.time), "started" === i.state && "started" !== t1.state && (o += this.frequency.getTicksAtTime(t1.time) - this.frequency.getTicksAtTime(e)), i = t1;
                    }), this._state.remove(n), o;
                }
                get ticks() {
                    return this.getTicksAtTime(this.now());
                }
                set ticks(t1) {
                    this.setTicksAtTime(t1, this.now());
                }
                get seconds() {
                    return this.getSecondsAtTime(this.now());
                }
                set seconds(t1) {
                    const e = this.now(), s1 = this.frequency.timeToTicks(t1, e);
                    this.setTicksAtTime(s1, e);
                }
                getSecondsAtTime(t1) {
                    t1 = this.toSeconds(t1);
                    const e = this._state.getLastState("stopped", t1), s1 = {
                        state: "paused",
                        time: t1
                    };
                    this._state.add(s1);
                    let n = e, i = 0;
                    return this._state.forEachBetween(e.time, t1 + this.sampleTime, (t1)=>{
                        let e = n.time;
                        const s1 = this._tickOffset.get(t1.time);
                        s1 && s1.time >= n.time && (i = s1.seconds, e = s1.time), "started" === n.state && "started" !== t1.state && (i += t1.time - e), n = t1;
                    }), this._state.remove(s1), i;
                }
                setTicksAtTime(t1, e) {
                    return e = this.toSeconds(e), this._tickOffset.cancel(e), this._tickOffset.add({
                        seconds: this.frequency.getDurationOfTicks(t1, e),
                        ticks: t1,
                        time: e
                    }), this;
                }
                getStateAtTime(t1) {
                    return t1 = this.toSeconds(t1), this._state.getValueAtTime(t1);
                }
                getTimeOfTick(t1, e = this.now()) {
                    const s1 = this._tickOffset.get(e), n = this._state.get(e), i = Math.max(s1.time, n.time), o = this.frequency.getTicksAtTime(i) + t1 - s1.ticks;
                    return this.frequency.getTimeOfTick(o);
                }
                forEachTickBetween(t1, e, s1) {
                    let n = this._state.get(t1);
                    this._state.forEachBetween(t1, e, (e)=>{
                        n && "started" === n.state && "started" !== e.state && this.forEachTickBetween(Math.max(n.time, t1), e.time - this.sampleTime, s1), n = e;
                    });
                    let i = null;
                    if (n && "started" === n.state) {
                        const o = Math.max(n.time, t1), r = this.frequency.getTicksAtTime(o), a = r - this.frequency.getTicksAtTime(n.time);
                        let c = Math.ceil(a) - a;
                        c = Ii(c, 1) ? 0 : c;
                        let h = this.frequency.getTimeOfTick(r + c);
                        for(; h < e;){
                            try {
                                s1(h, Math.round(this.getTicksAtTime(h)));
                            } catch (t1) {
                                i = t1;
                                break;
                            }
                            h += this.frequency.getDurationOfTicks(1, h);
                        }
                    }
                    if (i) throw i;
                    return this;
                }
                dispose() {
                    return super.dispose(), this._state.dispose(), this._tickOffset.dispose(), this.frequency.dispose(), this;
                }
            }
            class qo extends vo {
                constructor(){
                    super(Di(qo.getDefaults(), arguments, [
                        "callback",
                        "frequency"
                    ])), this.name = "Clock", this.callback = Zi, this._lastUpdate = 0, this._state = new yo("stopped"), this._boundLoop = this._loop.bind(this);
                    const t1 = Di(qo.getDefaults(), arguments, [
                        "callback",
                        "frequency"
                    ]);
                    this.callback = t1.callback, this._tickSource = new Ro({
                        context: this.context,
                        frequency: t1.frequency,
                        units: t1.units
                    }), this._lastUpdate = 0, this.frequency = this._tickSource.frequency, Ui(this, "frequency"), this._state.setStateAtTime("stopped", 0), this.context.on("tick", this._boundLoop);
                }
                static getDefaults() {
                    return Object.assign(vo.getDefaults(), {
                        callback: Zi,
                        frequency: 1,
                        units: "hertz"
                    });
                }
                get state() {
                    return this._state.getValueAtTime(this.now());
                }
                start(t1, e) {
                    si(this.context);
                    const s1 = this.toSeconds(t1);
                    return this.log("start", s1), "started" !== this._state.getValueAtTime(s1) && (this._state.setStateAtTime("started", s1), this._tickSource.start(s1, e), s1 < this._lastUpdate && this.emit("start", s1, e)), this;
                }
                stop(t1) {
                    const e = this.toSeconds(t1);
                    return this.log("stop", e), this._state.cancel(e), this._state.setStateAtTime("stopped", e), this._tickSource.stop(e), e < this._lastUpdate && this.emit("stop", e), this;
                }
                pause(t1) {
                    const e = this.toSeconds(t1);
                    return "started" === this._state.getValueAtTime(e) && (this._state.setStateAtTime("paused", e), this._tickSource.pause(e), e < this._lastUpdate && this.emit("pause", e)), this;
                }
                get ticks() {
                    return Math.ceil(this.getTicksAtTime(this.now()));
                }
                set ticks(t1) {
                    this._tickSource.ticks = t1;
                }
                get seconds() {
                    return this._tickSource.seconds;
                }
                set seconds(t1) {
                    this._tickSource.seconds = t1;
                }
                getSecondsAtTime(t1) {
                    return this._tickSource.getSecondsAtTime(t1);
                }
                setTicksAtTime(t1, e) {
                    return this._tickSource.setTicksAtTime(t1, e), this;
                }
                getTimeOfTick(t1, e = this.now()) {
                    return this._tickSource.getTimeOfTick(t1, e);
                }
                getTicksAtTime(t1) {
                    return this._tickSource.getTicksAtTime(t1);
                }
                nextTickTime(t1, e) {
                    const s1 = this.toSeconds(e), n = this.getTicksAtTime(s1);
                    return this._tickSource.getTimeOfTick(n + t1, s1);
                }
                _loop() {
                    const t1 = this._lastUpdate, e = this.now();
                    this._lastUpdate = e, this.log("loop", t1, e), t1 !== e && (this._state.forEachBetween(t1, e, (t1)=>{
                        switch(t1.state){
                            case "started":
                                const e = this._tickSource.getTicksAtTime(t1.time);
                                this.emit("start", t1.time, e);
                                break;
                            case "stopped":
                                0 !== t1.time && this.emit("stop", t1.time);
                                break;
                            case "paused":
                                this.emit("pause", t1.time);
                        }
                    }), this._tickSource.forEachTickBetween(t1, e, (t1, e)=>{
                        this.callback(t1, e);
                    }));
                }
                getStateAtTime(t1) {
                    const e = this.toSeconds(t1);
                    return this._state.getValueAtTime(e);
                }
                dispose() {
                    return super.dispose(), this.context.off("tick", this._boundLoop), this._tickSource.dispose(), this._state.dispose(), this;
                }
            }
            Bi.mixin(qo);
            class Fo extends wo {
                constructor(){
                    super(Di(Fo.getDefaults(), arguments, [
                        "delayTime",
                        "maxDelay"
                    ])), this.name = "Delay";
                    const t1 = Di(Fo.getDefaults(), arguments, [
                        "delayTime",
                        "maxDelay"
                    ]), e = this.toSeconds(t1.maxDelay);
                    this._maxDelay = Math.max(e, this.toSeconds(t1.delayTime)), this._delayNode = this.input = this.output = this.context.createDelay(e), this.delayTime = new xo({
                        context: this.context,
                        param: this._delayNode.delayTime,
                        units: "time",
                        value: t1.delayTime,
                        minValue: 0,
                        maxValue: this.maxDelay
                    }), Ui(this, "delayTime");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        delayTime: 0,
                        maxDelay: 1
                    });
                }
                get maxDelay() {
                    return this._maxDelay;
                }
                dispose() {
                    return super.dispose(), this._delayNode.disconnect(), this.delayTime.dispose(), this;
                }
            }
            function Io(t1, e, s1 = 2, n = Ji().sampleRate) {
                return yi(this, void 0, void 0, function*() {
                    const i = Ji(), o = new Yi(s1, e, n);
                    Ki(o), yield t1(o);
                    const r = o.render();
                    Ki(i);
                    const a = yield r;
                    return new Xi(a);
                });
            }
            class Vo extends Ei {
                constructor(){
                    super(), this.name = "ToneAudioBuffers", this._buffers = new Map, this._loadingCount = 0;
                    const t1 = Di(Vo.getDefaults(), arguments, [
                        "urls",
                        "onload",
                        "baseUrl"
                    ], "urls");
                    this.baseUrl = t1.baseUrl, Object.keys(t1.urls).forEach((e)=>{
                        this._loadingCount++;
                        const s1 = t1.urls[e];
                        this.add(e, s1, this._bufferLoaded.bind(this, t1.onload), t1.onerror);
                    });
                }
                static getDefaults() {
                    return {
                        baseUrl: "",
                        onerror: Zi,
                        onload: Zi,
                        urls: {}
                    };
                }
                has(t1) {
                    return this._buffers.has(t1.toString());
                }
                get(t1) {
                    return ti(this.has(t1), "ToneAudioBuffers has no buffer named: " + t1), this._buffers.get(t1.toString());
                }
                _bufferLoaded(t1) {
                    this._loadingCount--, 0 === this._loadingCount && t1 && t1();
                }
                get loaded() {
                    return Array.from(this._buffers).every(([t1, e])=>e.loaded);
                }
                add(t1, e, s1 = Zi, n = Zi) {
                    return fi(e) ? this._buffers.set(t1.toString(), new Xi(this.baseUrl + e, s1, n)) : this._buffers.set(t1.toString(), new Xi(e, s1, n)), this;
                }
                dispose() {
                    return super.dispose(), this._buffers.forEach((t1)=>t1.dispose()), this._buffers.clear(), this;
                }
            }
            class No extends lo {
                constructor(){
                    super(...arguments), this.name = "MidiClass", this.defaultUnits = "midi";
                }
                _frequencyToUnits(t1) {
                    return oo(super._frequencyToUnits(t1));
                }
                _ticksToUnits(t1) {
                    return oo(super._ticksToUnits(t1));
                }
                _beatsToUnits(t1) {
                    return oo(super._beatsToUnits(t1));
                }
                _secondsToUnits(t1) {
                    return oo(super._secondsToUnits(t1));
                }
                toMidi() {
                    return this.valueOf();
                }
                toFrequency() {
                    return ao(this.toMidi());
                }
                transpose(t1) {
                    return new No(this.context, this.toMidi() + t1);
                }
            }
            function Po(t1, e) {
                return new No(Ji(), t1, e);
            }
            class jo extends mo {
                constructor(){
                    super(...arguments), this.name = "Ticks", this.defaultUnits = "i";
                }
                _now() {
                    return this.context.transport.ticks;
                }
                _beatsToUnits(t1) {
                    return this._getPPQ() * t1;
                }
                _secondsToUnits(t1) {
                    return Math.floor(t1 / (60 / this._getBpm()) * this._getPPQ());
                }
                _ticksToUnits(t1) {
                    return t1;
                }
                toTicks() {
                    return this.valueOf();
                }
                toSeconds() {
                    return this.valueOf() / this._getPPQ() * (60 / this._getBpm());
                }
            }
            function Lo(t1, e) {
                return new jo(Ji(), t1, e);
            }
            class zo extends vo {
                constructor(){
                    super(...arguments), this.name = "Draw", this.expiration = .25, this.anticipation = .008, this._events = new Ni, this._boundDrawLoop = this._drawLoop.bind(this), this._animationFrame = -1;
                }
                schedule(t1, e) {
                    return this._events.add({
                        callback: t1,
                        time: this.toSeconds(e)
                    }), 1 === this._events.length && (this._animationFrame = requestAnimationFrame(this._boundDrawLoop)), this;
                }
                cancel(t1) {
                    return this._events.cancel(this.toSeconds(t1)), this;
                }
                _drawLoop() {
                    const t1 = this.context.currentTime;
                    for(; this._events.length && this._events.peek().time - this.anticipation <= t1;){
                        const e = this._events.shift();
                        e && t1 - e.time <= this.expiration && e.callback();
                    }
                    this._events.length > 0 && (this._animationFrame = requestAnimationFrame(this._boundDrawLoop));
                }
                dispose() {
                    return super.dispose(), this._events.dispose(), cancelAnimationFrame(this._animationFrame), this;
                }
            }
            ji((t1)=>{
                t1.draw = new zo({
                    context: t1
                });
            }), zi((t1)=>{
                t1.draw.dispose();
            });
            class Bo extends Ei {
                constructor(){
                    super(...arguments), this.name = "IntervalTimeline", this._root = null, this._length = 0;
                }
                add(t1) {
                    ti(ci(t1.time), "Events must have a time property"), ti(ci(t1.duration), "Events must have a duration parameter"), t1.time = t1.time.valueOf();
                    let e = new Wo(t1.time, t1.time + t1.duration, t1);
                    for(null === this._root ? this._root = e : this._root.insert(e), this._length++; null !== e;)e.updateHeight(), e.updateMax(), this._rebalance(e), e = e.parent;
                    return this;
                }
                remove(t1) {
                    if (null !== this._root) {
                        const e = [];
                        this._root.search(t1.time, e);
                        for (const s1 of e)if (s1.event === t1) {
                            this._removeNode(s1), this._length--;
                            break;
                        }
                    }
                    return this;
                }
                get length() {
                    return this._length;
                }
                cancel(t1) {
                    return this.forEachFrom(t1, (t1)=>this.remove(t1)), this;
                }
                _setRoot(t1) {
                    this._root = t1, null !== this._root && (this._root.parent = null);
                }
                _replaceNodeInParent(t1, e) {
                    null !== t1.parent ? (t1.isLeftChild() ? t1.parent.left = e : t1.parent.right = e, this._rebalance(t1.parent)) : this._setRoot(e);
                }
                _removeNode(t1) {
                    if (null === t1.left && null === t1.right) this._replaceNodeInParent(t1, null);
                    else if (null === t1.right) this._replaceNodeInParent(t1, t1.left);
                    else if (null === t1.left) this._replaceNodeInParent(t1, t1.right);
                    else {
                        let e, s1 = null;
                        if (t1.getBalance() > 0) {
                            if (null === t1.left.right) e = t1.left, e.right = t1.right, s1 = e;
                            else {
                                for(e = t1.left.right; null !== e.right;)e = e.right;
                                e.parent && (e.parent.right = e.left, s1 = e.parent, e.left = t1.left, e.right = t1.right);
                            }
                        } else if (null === t1.right.left) e = t1.right, e.left = t1.left, s1 = e;
                        else {
                            for(e = t1.right.left; null !== e.left;)e = e.left;
                            e.parent && (e.parent.left = e.right, s1 = e.parent, e.left = t1.left, e.right = t1.right);
                        }
                        null !== t1.parent ? t1.isLeftChild() ? t1.parent.left = e : t1.parent.right = e : this._setRoot(e), s1 && this._rebalance(s1);
                    }
                    t1.dispose();
                }
                _rotateLeft(t1) {
                    const e = t1.parent, s1 = t1.isLeftChild(), n = t1.right;
                    n && (t1.right = n.left, n.left = t1), null !== e ? s1 ? e.left = n : e.right = n : this._setRoot(n);
                }
                _rotateRight(t1) {
                    const e = t1.parent, s1 = t1.isLeftChild(), n = t1.left;
                    n && (t1.left = n.right, n.right = t1), null !== e ? s1 ? e.left = n : e.right = n : this._setRoot(n);
                }
                _rebalance(t1) {
                    const e = t1.getBalance();
                    e > 1 && t1.left ? t1.left.getBalance() < 0 ? this._rotateLeft(t1.left) : this._rotateRight(t1) : e < -1 && t1.right && (t1.right.getBalance() > 0 ? this._rotateRight(t1.right) : this._rotateLeft(t1));
                }
                get(t1) {
                    if (null !== this._root) {
                        const e = [];
                        if (this._root.search(t1, e), e.length > 0) {
                            let t1 = e[0];
                            for(let s1 = 1; s1 < e.length; s1++)e[s1].low > t1.low && (t1 = e[s1]);
                            return t1.event;
                        }
                    }
                    return null;
                }
                forEach(t1) {
                    if (null !== this._root) {
                        const e = [];
                        this._root.traverse((t1)=>e.push(t1)), e.forEach((e)=>{
                            e.event && t1(e.event);
                        });
                    }
                    return this;
                }
                forEachAtTime(t1, e) {
                    if (null !== this._root) {
                        const s1 = [];
                        this._root.search(t1, s1), s1.forEach((t1)=>{
                            t1.event && e(t1.event);
                        });
                    }
                    return this;
                }
                forEachFrom(t1, e) {
                    if (null !== this._root) {
                        const s1 = [];
                        this._root.searchAfter(t1, s1), s1.forEach((t1)=>{
                            t1.event && e(t1.event);
                        });
                    }
                    return this;
                }
                dispose() {
                    return super.dispose(), null !== this._root && this._root.traverse((t1)=>t1.dispose()), this._root = null, this;
                }
            }
            class Wo {
                constructor(t1, e, s1){
                    this._left = null, this._right = null, this.parent = null, this.height = 0, this.event = s1, this.low = t1, this.high = e, this.max = this.high;
                }
                insert(t1) {
                    t1.low <= this.low ? null === this.left ? this.left = t1 : this.left.insert(t1) : null === this.right ? this.right = t1 : this.right.insert(t1);
                }
                search(t1, e) {
                    t1 > this.max || (null !== this.left && this.left.search(t1, e), this.low <= t1 && this.high > t1 && e.push(this), this.low > t1 || null !== this.right && this.right.search(t1, e));
                }
                searchAfter(t1, e) {
                    this.low >= t1 && (e.push(this), null !== this.left && this.left.searchAfter(t1, e)), null !== this.right && this.right.searchAfter(t1, e);
                }
                traverse(t1) {
                    t1(this), null !== this.left && this.left.traverse(t1), null !== this.right && this.right.traverse(t1);
                }
                updateHeight() {
                    null !== this.left && null !== this.right ? this.height = Math.max(this.left.height, this.right.height) + 1 : null !== this.right ? this.height = this.right.height + 1 : null !== this.left ? this.height = this.left.height + 1 : this.height = 0;
                }
                updateMax() {
                    this.max = this.high, null !== this.left && (this.max = Math.max(this.max, this.left.max)), null !== this.right && (this.max = Math.max(this.max, this.right.max));
                }
                getBalance() {
                    let t1 = 0;
                    return null !== this.left && null !== this.right ? t1 = this.left.height - this.right.height : null !== this.left ? t1 = this.left.height + 1 : null !== this.right && (t1 = -(this.right.height + 1)), t1;
                }
                isLeftChild() {
                    return null !== this.parent && this.parent.left === this;
                }
                get left() {
                    return this._left;
                }
                set left(t1) {
                    this._left = t1, null !== t1 && (t1.parent = this), this.updateHeight(), this.updateMax();
                }
                get right() {
                    return this._right;
                }
                set right(t1) {
                    this._right = t1, null !== t1 && (t1.parent = this), this.updateHeight(), this.updateMax();
                }
                dispose() {
                    this.parent = null, this._left = null, this._right = null, this.event = null;
                }
            }
            class Go extends wo {
                constructor(){
                    super(Di(Go.getDefaults(), arguments, [
                        "volume"
                    ])), this.name = "Volume";
                    const t1 = Di(Go.getDefaults(), arguments, [
                        "volume"
                    ]);
                    this.input = this.output = new ko({
                        context: this.context,
                        gain: t1.volume,
                        units: "decibels"
                    }), this.volume = this.output.gain, Ui(this, "volume"), this._unmutedVolume = t1.volume, this.mute = t1.mute;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mute: !1,
                        volume: 0
                    });
                }
                get mute() {
                    return this.volume.value === -1 / 0;
                }
                set mute(t1) {
                    !this.mute && t1 ? (this._unmutedVolume = this.volume.value, this.volume.value = -1 / 0) : this.mute && !t1 && (this.volume.value = this._unmutedVolume);
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this.volume.dispose(), this;
                }
            }
            class Uo extends wo {
                constructor(){
                    super(Di(Uo.getDefaults(), arguments)), this.name = "Destination", this.input = new Go({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this.volume = this.input.volume;
                    const t1 = Di(Uo.getDefaults(), arguments);
                    bo(this.input, this.output, this.context.rawContext.destination), this.mute = t1.mute, this._internalChannels = [
                        this.input,
                        this.context.rawContext.destination,
                        this.output
                    ];
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mute: !1,
                        volume: 0
                    });
                }
                get mute() {
                    return this.input.mute;
                }
                set mute(t1) {
                    this.input.mute = t1;
                }
                chain(...t1) {
                    return this.input.disconnect(), t1.unshift(this.input), t1.push(this.output), bo(...t1), this;
                }
                get maxChannelCount() {
                    return this.context.rawContext.destination.maxChannelCount;
                }
                dispose() {
                    return super.dispose(), this.volume.dispose(), this;
                }
            }
            ji((t1)=>{
                t1.destination = new Uo({
                    context: t1
                });
            }), zi((t1)=>{
                t1.destination.dispose();
            });
            class Qo extends Ei {
                constructor(t1){
                    super(), this.name = "TimelineValue", this._timeline = new Ni({
                        memory: 10
                    }), this._initialValue = t1;
                }
                set(t1, e) {
                    return this._timeline.add({
                        value: t1,
                        time: e
                    }), this;
                }
                get(t1) {
                    const e = this._timeline.get(t1);
                    return e ? e.value : this._initialValue;
                }
            }
            class Zo {
                constructor(t1, e){
                    this.id = Zo._eventId++;
                    const s1 = Object.assign(Zo.getDefaults(), e);
                    this.transport = t1, this.callback = s1.callback, this._once = s1.once, this.time = s1.time;
                }
                static getDefaults() {
                    return {
                        callback: Zi,
                        once: !1,
                        time: 0
                    };
                }
                invoke(t1) {
                    this.callback && (this.callback(t1), this._once && this.transport.clear(this.id));
                }
                dispose() {
                    return this.callback = void 0, this;
                }
            }
            Zo._eventId = 0;
            class Xo extends Zo {
                constructor(t1, e){
                    super(t1, e), this._currentId = -1, this._nextId = -1, this._nextTick = this.time, this._boundRestart = this._restart.bind(this);
                    const s1 = Object.assign(Xo.getDefaults(), e);
                    this.duration = new jo(t1.context, s1.duration).valueOf(), this._interval = new jo(t1.context, s1.interval).valueOf(), this._nextTick = s1.time, this.transport.on("start", this._boundRestart), this.transport.on("loopStart", this._boundRestart), this.context = this.transport.context, this._restart();
                }
                static getDefaults() {
                    return Object.assign({}, Zo.getDefaults(), {
                        duration: 1 / 0,
                        interval: 1,
                        once: !1
                    });
                }
                invoke(t1) {
                    this._createEvents(t1), super.invoke(t1);
                }
                _createEvents(t1) {
                    const e = this.transport.getTicksAtTime(t1);
                    e >= this.time && e >= this._nextTick && this._nextTick + this._interval < this.time + this.duration && (this._nextTick += this._interval, this._currentId = this._nextId, this._nextId = this.transport.scheduleOnce(this.invoke.bind(this), new jo(this.context, this._nextTick).toSeconds()));
                }
                _restart(t1) {
                    this.transport.clear(this._currentId), this.transport.clear(this._nextId), this._nextTick = this.time;
                    const e = this.transport.getTicksAtTime(t1);
                    e > this.time && (this._nextTick = this.time + Math.ceil((e - this.time) / this._interval) * this._interval), this._currentId = this.transport.scheduleOnce(this.invoke.bind(this), new jo(this.context, this._nextTick).toSeconds()), this._nextTick += this._interval, this._nextId = this.transport.scheduleOnce(this.invoke.bind(this), new jo(this.context, this._nextTick).toSeconds());
                }
                dispose() {
                    return super.dispose(), this.transport.clear(this._currentId), this.transport.clear(this._nextId), this.transport.off("start", this._boundRestart), this.transport.off("loopStart", this._boundRestart), this;
                }
            }
            class Yo extends vo {
                constructor(){
                    super(Di(Yo.getDefaults(), arguments)), this.name = "Transport", this._loop = new Qo(!1), this._loopStart = 0, this._loopEnd = 0, this._scheduledEvents = {}, this._timeline = new Ni, this._repeatedEvents = new Bo, this._syncedSignals = [], this._swingAmount = 0;
                    const t1 = Di(Yo.getDefaults(), arguments);
                    this._ppq = t1.ppq, this._clock = new qo({
                        callback: this._processTick.bind(this),
                        context: this.context,
                        frequency: 0,
                        units: "bpm"
                    }), this._bindClockEvents(), this.bpm = this._clock.frequency, this._clock.frequency.multiplier = t1.ppq, this.bpm.setValueAtTime(t1.bpm, 0), Ui(this, "bpm"), this._timeSignature = t1.timeSignature, this._swingTicks = t1.ppq / 2;
                }
                static getDefaults() {
                    return Object.assign(vo.getDefaults(), {
                        bpm: 120,
                        loopEnd: "4m",
                        loopStart: 0,
                        ppq: 192,
                        swing: 0,
                        swingSubdivision: "8n",
                        timeSignature: 4
                    });
                }
                _processTick(t1, e) {
                    if (this._loop.get(t1) && e >= this._loopEnd && (this.emit("loopEnd", t1), this._clock.setTicksAtTime(this._loopStart, t1), e = this._loopStart, this.emit("loopStart", t1, this._clock.getSecondsAtTime(t1)), this.emit("loop", t1)), this._swingAmount > 0 && e % this._ppq != 0 && e % (2 * this._swingTicks) != 0) {
                        const s1 = e % (2 * this._swingTicks) / (2 * this._swingTicks), n = Math.sin(s1 * Math.PI) * this._swingAmount;
                        t1 += new jo(this.context, 2 * this._swingTicks / 3).toSeconds() * n;
                    }
                    this._timeline.forEachAtTime(e, (e)=>e.invoke(t1));
                }
                schedule(t1, e) {
                    const s1 = new Zo(this, {
                        callback: t1,
                        time: new mo(this.context, e).toTicks()
                    });
                    return this._addEvent(s1, this._timeline);
                }
                scheduleRepeat(t1, e, s1, n = 1 / 0) {
                    const i = new Xo(this, {
                        callback: t1,
                        duration: new ho(this.context, n).toTicks(),
                        interval: new ho(this.context, e).toTicks(),
                        time: new mo(this.context, s1).toTicks()
                    });
                    return this._addEvent(i, this._repeatedEvents);
                }
                scheduleOnce(t1, e) {
                    const s1 = new Zo(this, {
                        callback: t1,
                        once: !0,
                        time: new mo(this.context, e).toTicks()
                    });
                    return this._addEvent(s1, this._timeline);
                }
                clear(t1) {
                    if (this._scheduledEvents.hasOwnProperty(t1)) {
                        const e = this._scheduledEvents[t1.toString()];
                        e.timeline.remove(e.event), e.event.dispose(), delete this._scheduledEvents[t1.toString()];
                    }
                    return this;
                }
                _addEvent(t1, e) {
                    return this._scheduledEvents[t1.id.toString()] = {
                        event: t1,
                        timeline: e
                    }, e.add(t1), t1.id;
                }
                cancel(t1 = 0) {
                    const e = this.toTicks(t1);
                    return this._timeline.forEachFrom(e, (t1)=>this.clear(t1.id)), this._repeatedEvents.forEachFrom(e, (t1)=>this.clear(t1.id)), this;
                }
                _bindClockEvents() {
                    this._clock.on("start", (t1, e)=>{
                        e = new jo(this.context, e).toSeconds(), this.emit("start", t1, e);
                    }), this._clock.on("stop", (t1)=>{
                        this.emit("stop", t1);
                    }), this._clock.on("pause", (t1)=>{
                        this.emit("pause", t1);
                    });
                }
                get state() {
                    return this._clock.getStateAtTime(this.now());
                }
                start(t1, e) {
                    let s1;
                    return ci(e) && (s1 = this.toTicks(e)), this._clock.start(t1, s1), this;
                }
                stop(t1) {
                    return this._clock.stop(t1), this;
                }
                pause(t1) {
                    return this._clock.pause(t1), this;
                }
                toggle(t1) {
                    return t1 = this.toSeconds(t1), "started" !== this._clock.getStateAtTime(t1) ? this.start(t1) : this.stop(t1), this;
                }
                get timeSignature() {
                    return this._timeSignature;
                }
                set timeSignature(t1) {
                    di(t1) && (t1 = t1[0] / t1[1] * 4), this._timeSignature = t1;
                }
                get loopStart() {
                    return new ho(this.context, this._loopStart, "i").toSeconds();
                }
                set loopStart(t1) {
                    this._loopStart = this.toTicks(t1);
                }
                get loopEnd() {
                    return new ho(this.context, this._loopEnd, "i").toSeconds();
                }
                set loopEnd(t1) {
                    this._loopEnd = this.toTicks(t1);
                }
                get loop() {
                    return this._loop.get(this.now());
                }
                set loop(t1) {
                    this._loop.set(t1, this.now());
                }
                setLoopPoints(t1, e) {
                    return this.loopStart = t1, this.loopEnd = e, this;
                }
                get swing() {
                    return this._swingAmount;
                }
                set swing(t1) {
                    this._swingAmount = t1;
                }
                get swingSubdivision() {
                    return new jo(this.context, this._swingTicks).toNotation();
                }
                set swingSubdivision(t1) {
                    this._swingTicks = this.toTicks(t1);
                }
                get position() {
                    const t1 = this.now(), e = this._clock.getTicksAtTime(t1);
                    return new jo(this.context, e).toBarsBeatsSixteenths();
                }
                set position(t1) {
                    const e = this.toTicks(t1);
                    this.ticks = e;
                }
                get seconds() {
                    return this._clock.seconds;
                }
                set seconds(t1) {
                    const e = this.now(), s1 = this._clock.frequency.timeToTicks(t1, e);
                    this.ticks = s1;
                }
                get progress() {
                    if (this.loop) {
                        const t1 = this.now();
                        return (this._clock.getTicksAtTime(t1) - this._loopStart) / (this._loopEnd - this._loopStart);
                    }
                    return 0;
                }
                get ticks() {
                    return this._clock.ticks;
                }
                set ticks(t1) {
                    if (this._clock.ticks !== t1) {
                        const e = this.now();
                        if ("started" === this.state) {
                            const s1 = this._clock.getTicksAtTime(e), n = e + this._clock.frequency.getDurationOfTicks(Math.ceil(s1) - s1, e);
                            this.emit("stop", n), this._clock.setTicksAtTime(t1, n), this.emit("start", n, this._clock.getSecondsAtTime(n));
                        } else this._clock.setTicksAtTime(t1, e);
                    }
                }
                getTicksAtTime(t1) {
                    return Math.round(this._clock.getTicksAtTime(t1));
                }
                getSecondsAtTime(t1) {
                    return this._clock.getSecondsAtTime(t1);
                }
                get PPQ() {
                    return this._clock.frequency.multiplier;
                }
                set PPQ(t1) {
                    this._clock.frequency.multiplier = t1;
                }
                nextSubdivision(t1) {
                    if (t1 = this.toTicks(t1), "started" !== this.state) return 0;
                    {
                        const e = this.now(), s1 = t1 - this.getTicksAtTime(e) % t1;
                        return this._clock.nextTickTime(s1, e);
                    }
                }
                syncSignal(t1, e) {
                    if (!e) {
                        const s1 = this.now();
                        if (0 !== t1.getValueAtTime(s1)) {
                            const n = 1 / (60 / this.bpm.getValueAtTime(s1) / this.PPQ);
                            e = t1.getValueAtTime(s1) / n;
                        } else e = 0;
                    }
                    const s1 = new ko(e);
                    return this.bpm.connect(s1), s1.connect(t1._param), this._syncedSignals.push({
                        initial: t1.value,
                        ratio: s1,
                        signal: t1
                    }), t1.value = 0, this;
                }
                unsyncSignal(t1) {
                    for(let e = this._syncedSignals.length - 1; e >= 0; e--){
                        const s1 = this._syncedSignals[e];
                        s1.signal === t1 && (s1.ratio.dispose(), s1.signal.value = s1.initial, this._syncedSignals.splice(e, 1));
                    }
                    return this;
                }
                dispose() {
                    return super.dispose(), this._clock.dispose(), Qi(this, "bpm"), this._timeline.dispose(), this._repeatedEvents.dispose(), this;
                }
            }
            Bi.mixin(Yo), ji((t1)=>{
                t1.transport = new Yo({
                    context: t1
                });
            }), zi((t1)=>{
                t1.transport.dispose();
            });
            class Ho extends wo {
                constructor(t1){
                    super(t1), this.input = void 0, this._state = new yo("stopped"), this._synced = !1, this._scheduled = [], this._syncedStart = Zi, this._syncedStop = Zi, this._state.memory = 100, this._state.increasing = !0, this._volume = this.output = new Go({
                        context: this.context,
                        mute: t1.mute,
                        volume: t1.volume
                    }), this.volume = this._volume.volume, Ui(this, "volume"), this.onstop = t1.onstop;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mute: !1,
                        onstop: Zi,
                        volume: 0
                    });
                }
                get state() {
                    return this._synced ? "started" === this.context.transport.state ? this._state.getValueAtTime(this.context.transport.seconds) : "stopped" : this._state.getValueAtTime(this.now());
                }
                get mute() {
                    return this._volume.mute;
                }
                set mute(t1) {
                    this._volume.mute = t1;
                }
                _clampToCurrentTime(t1) {
                    return this._synced ? t1 : Math.max(t1, this.context.currentTime);
                }
                start(t1, e, s1) {
                    let n = ai(t1) && this._synced ? this.context.transport.seconds : this.toSeconds(t1);
                    if (n = this._clampToCurrentTime(n), this._synced || "started" !== this._state.getValueAtTime(n)) {
                        if (this.log("start", n), this._state.setStateAtTime("started", n), this._synced) {
                            const t1 = this._state.get(n);
                            t1 && (t1.offset = this.toSeconds(Oi(e, 0)), t1.duration = s1 ? this.toSeconds(s1) : void 0);
                            const i = this.context.transport.schedule((t1)=>{
                                this._start(t1, e, s1);
                            }, n);
                            this._scheduled.push(i), "started" === this.context.transport.state && this.context.transport.getSecondsAtTime(this.immediate()) > n && this._syncedStart(this.now(), this.context.transport.seconds);
                        } else si(this.context), this._start(n, e, s1);
                    } else ti(Ri(n, this._state.get(n).time), "Start time must be strictly greater than previous start time"), this._state.cancel(n), this._state.setStateAtTime("started", n), this.log("restart", n), this.restart(n, e, s1);
                    return this;
                }
                stop(t1) {
                    let e = ai(t1) && this._synced ? this.context.transport.seconds : this.toSeconds(t1);
                    if (e = this._clampToCurrentTime(e), "started" === this._state.getValueAtTime(e) || ci(this._state.getNextState("started", e))) {
                        if (this.log("stop", e), this._synced) {
                            const t1 = this.context.transport.schedule(this._stop.bind(this), e);
                            this._scheduled.push(t1);
                        } else this._stop(e);
                        this._state.cancel(e), this._state.setStateAtTime("stopped", e);
                    }
                    return this;
                }
                restart(t1, e, s1) {
                    return t1 = this.toSeconds(t1), "started" === this._state.getValueAtTime(t1) && (this._state.cancel(t1), this._restart(t1, e, s1)), this;
                }
                sync() {
                    return this._synced || (this._synced = !0, this._syncedStart = (t1, e)=>{
                        if (e > 0) {
                            const s1 = this._state.get(e);
                            if (s1 && "started" === s1.state && s1.time !== e) {
                                const n = e - this.toSeconds(s1.time);
                                let i;
                                s1.duration && (i = this.toSeconds(s1.duration) - n), this._start(t1, this.toSeconds(s1.offset) + n, i);
                            }
                        }
                    }, this._syncedStop = (t1)=>{
                        const e = this.context.transport.getSecondsAtTime(Math.max(t1 - this.sampleTime, 0));
                        "started" === this._state.getValueAtTime(e) && this._stop(t1);
                    }, this.context.transport.on("start", this._syncedStart), this.context.transport.on("loopStart", this._syncedStart), this.context.transport.on("stop", this._syncedStop), this.context.transport.on("pause", this._syncedStop), this.context.transport.on("loopEnd", this._syncedStop)), this;
                }
                unsync() {
                    return this._synced && (this.context.transport.off("stop", this._syncedStop), this.context.transport.off("pause", this._syncedStop), this.context.transport.off("loopEnd", this._syncedStop), this.context.transport.off("start", this._syncedStart), this.context.transport.off("loopStart", this._syncedStart)), this._synced = !1, this._scheduled.forEach((t1)=>this.context.transport.clear(t1)), this._scheduled = [], this._state.cancel(0), this._stop(0), this;
                }
                dispose() {
                    return super.dispose(), this.onstop = Zi, this.unsync(), this._volume.dispose(), this._state.dispose(), this;
                }
            }
            class $o extends Co {
                constructor(){
                    super(Di($o.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ])), this.name = "ToneBufferSource", this._source = this.context.createBufferSource(), this._internalChannels = [
                        this._source
                    ], this._sourceStarted = !1, this._sourceStopped = !1;
                    const t1 = Di($o.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ]);
                    To(this._source, this._gainNode), this._source.onended = ()=>this._stopSource(), this.playbackRate = new xo({
                        context: this.context,
                        param: this._source.playbackRate,
                        units: "positive",
                        value: t1.playbackRate
                    }), this.loop = t1.loop, this.loopStart = t1.loopStart, this.loopEnd = t1.loopEnd, this._buffer = new Xi(t1.url, t1.onload, t1.onerror), this._internalChannels.push(this._source);
                }
                static getDefaults() {
                    return Object.assign(Co.getDefaults(), {
                        url: new Xi,
                        loop: !1,
                        loopEnd: 0,
                        loopStart: 0,
                        onload: Zi,
                        onerror: Zi,
                        playbackRate: 1
                    });
                }
                get fadeIn() {
                    return this._fadeIn;
                }
                set fadeIn(t1) {
                    this._fadeIn = t1;
                }
                get fadeOut() {
                    return this._fadeOut;
                }
                set fadeOut(t1) {
                    this._fadeOut = t1;
                }
                get curve() {
                    return this._curve;
                }
                set curve(t1) {
                    this._curve = t1;
                }
                start(t1, e, s1, n = 1) {
                    ti(this.buffer.loaded, "buffer is either not set or not loaded");
                    const i = this.toSeconds(t1);
                    this._startGain(i, n), e = this.loop ? Oi(e, this.loopStart) : Oi(e, 0);
                    let o = Math.max(this.toSeconds(e), 0);
                    if (this.loop) {
                        const t1 = this.toSeconds(this.loopEnd) || this.buffer.duration, e = this.toSeconds(this.loopStart), s1 = t1 - e;
                        qi(o, t1) && (o = (o - e) % s1 + e), Ii(o, this.buffer.duration) && (o = 0);
                    }
                    if (this._source.buffer = this.buffer.get(), this._source.loopEnd = this.toSeconds(this.loopEnd) || this.buffer.duration, Fi(o, this.buffer.duration) && (this._sourceStarted = !0, this._source.start(i, o)), ci(s1)) {
                        let t1 = this.toSeconds(s1);
                        t1 = Math.max(t1, 0), this.stop(i + t1);
                    }
                    return this;
                }
                _stopSource(t1) {
                    !this._sourceStopped && this._sourceStarted && (this._sourceStopped = !0, this._source.stop(this.toSeconds(t1)), this._onended());
                }
                get loopStart() {
                    return this._source.loopStart;
                }
                set loopStart(t1) {
                    this._source.loopStart = this.toSeconds(t1);
                }
                get loopEnd() {
                    return this._source.loopEnd;
                }
                set loopEnd(t1) {
                    this._source.loopEnd = this.toSeconds(t1);
                }
                get buffer() {
                    return this._buffer;
                }
                set buffer(t1) {
                    this._buffer.set(t1);
                }
                get loop() {
                    return this._source.loop;
                }
                set loop(t1) {
                    this._source.loop = t1, this._sourceStarted && this.cancelStop();
                }
                dispose() {
                    return super.dispose(), this._source.onended = null, this._source.disconnect(), this._buffer.dispose(), this.playbackRate.dispose(), this;
                }
            }
            class Jo extends Ho {
                constructor(){
                    super(Di(Jo.getDefaults(), arguments, [
                        "type"
                    ])), this.name = "Noise", this._source = null;
                    const t1 = Di(Jo.getDefaults(), arguments, [
                        "type"
                    ]);
                    this._playbackRate = t1.playbackRate, this.type = t1.type, this._fadeIn = t1.fadeIn, this._fadeOut = t1.fadeOut;
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        fadeIn: 0,
                        fadeOut: 0,
                        playbackRate: 1,
                        type: "white"
                    });
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    if (ti(t1 in tr, "Noise: invalid type: " + t1), this._type !== t1 && (this._type = t1, "started" === this.state)) {
                        const t1 = this.now();
                        this._stop(t1), this._start(t1);
                    }
                }
                get playbackRate() {
                    return this._playbackRate;
                }
                set playbackRate(t1) {
                    this._playbackRate = t1, this._source && (this._source.playbackRate.value = t1);
                }
                _start(t1) {
                    const e = tr[this._type];
                    this._source = new $o({
                        url: e,
                        context: this.context,
                        fadeIn: this._fadeIn,
                        fadeOut: this._fadeOut,
                        loop: !0,
                        onended: ()=>this.onstop(this),
                        playbackRate: this._playbackRate
                    }).connect(this.output), this._source.start(this.toSeconds(t1), Math.random() * (e.duration - .001));
                }
                _stop(t1) {
                    this._source && (this._source.stop(this.toSeconds(t1)), this._source = null);
                }
                get fadeIn() {
                    return this._fadeIn;
                }
                set fadeIn(t1) {
                    this._fadeIn = t1, this._source && (this._source.fadeIn = this._fadeIn);
                }
                get fadeOut() {
                    return this._fadeOut;
                }
                set fadeOut(t1) {
                    this._fadeOut = t1, this._source && (this._source.fadeOut = this._fadeOut);
                }
                _restart(t1) {
                    this._stop(t1), this._start(t1);
                }
                dispose() {
                    return super.dispose(), this._source && this._source.disconnect(), this;
                }
            }
            const Ko = {
                brown: null,
                pink: null,
                white: null
            }, tr = {
                get brown () {
                    if (!Ko.brown) {
                        const t1 = [];
                        for(let e = 0; e < 2; e++){
                            const s1 = new Float32Array(220500);
                            t1[e] = s1;
                            let n = 0;
                            for(let t1 = 0; t1 < 220500; t1++){
                                const e = 2 * Math.random() - 1;
                                s1[t1] = (n + .02 * e) / 1.02, n = s1[t1], s1[t1] *= 3.5;
                            }
                        }
                        Ko.brown = (new Xi).fromArray(t1);
                    }
                    return Ko.brown;
                },
                get pink () {
                    if (!Ko.pink) {
                        const t1 = [];
                        for(let e = 0; e < 2; e++){
                            const s1 = new Float32Array(220500);
                            let n, i, o, r, a, c, h;
                            t1[e] = s1, n = i = o = r = a = c = h = 0;
                            for(let t1 = 0; t1 < 220500; t1++){
                                const e = 2 * Math.random() - 1;
                                n = .99886 * n + .0555179 * e, i = .99332 * i + .0750759 * e, o = .969 * o + .153852 * e, r = .8665 * r + .3104856 * e, a = .55 * a + .5329522 * e, c = -0.7616 * c - .016898 * e, s1[t1] = n + i + o + r + a + c + h + .5362 * e, s1[t1] *= .11, h = .115926 * e;
                            }
                        }
                        Ko.pink = (new Xi).fromArray(t1);
                    }
                    return Ko.pink;
                },
                get white () {
                    if (!Ko.white) {
                        const t1 = [];
                        for(let e = 0; e < 2; e++){
                            const s1 = new Float32Array(220500);
                            t1[e] = s1;
                            for(let t1 = 0; t1 < 220500; t1++)s1[t1] = 2 * Math.random() - 1;
                        }
                        Ko.white = (new Xi).fromArray(t1);
                    }
                    return Ko.white;
                }
            };
            class er extends wo {
                constructor(){
                    super(Di(er.getDefaults(), arguments, [
                        "volume"
                    ])), this.name = "UserMedia";
                    const t1 = Di(er.getDefaults(), arguments, [
                        "volume"
                    ]);
                    this._volume = this.output = new Go({
                        context: this.context,
                        volume: t1.volume
                    }), this.volume = this._volume.volume, Ui(this, "volume"), this.mute = t1.mute;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mute: !1,
                        volume: 0
                    });
                }
                open(t1) {
                    return yi(this, void 0, void 0, function*() {
                        ti(er.supported, "UserMedia is not supported"), "started" === this.state && this.close();
                        const e = yield er.enumerateDevices();
                        ui(t1) ? this._device = e[t1] : (this._device = e.find((e)=>e.label === t1 || e.deviceId === t1), !this._device && e.length > 0 && (this._device = e[0]), ti(ci(this._device), "No matching device " + t1));
                        const s1 = {
                            audio: {
                                echoCancellation: !1,
                                sampleRate: this.context.sampleRate,
                                noiseSuppression: !1,
                                mozNoiseSuppression: !1
                            }
                        };
                        this._device && (s1.audio.deviceId = this._device.deviceId);
                        const n = yield navigator.mediaDevices.getUserMedia(s1);
                        if (!this._stream) {
                            this._stream = n;
                            const t1 = this.context.createMediaStreamSource(n);
                            To(t1, this.output), this._mediaStream = t1;
                        }
                        return this;
                    });
                }
                close() {
                    return this._stream && this._mediaStream && (this._stream.getAudioTracks().forEach((t1)=>{
                        t1.stop();
                    }), this._stream = void 0, this._mediaStream.disconnect(), this._mediaStream = void 0), this._device = void 0, this;
                }
                static enumerateDevices() {
                    return yi(this, void 0, void 0, function*() {
                        return (yield navigator.mediaDevices.enumerateDevices()).filter((t1)=>"audioinput" === t1.kind);
                    });
                }
                get state() {
                    return this._stream && this._stream.active ? "started" : "stopped";
                }
                get deviceId() {
                    return this._device ? this._device.deviceId : void 0;
                }
                get groupId() {
                    return this._device ? this._device.groupId : void 0;
                }
                get label() {
                    return this._device ? this._device.label : void 0;
                }
                get mute() {
                    return this._volume.mute;
                }
                set mute(t1) {
                    this._volume.mute = t1;
                }
                dispose() {
                    return super.dispose(), this.close(), this._volume.dispose(), this.volume.dispose(), this;
                }
                static get supported() {
                    return ci(navigator.mediaDevices) && ci(navigator.mediaDevices.getUserMedia);
                }
            }
            function sr(t1, e) {
                return yi(this, void 0, void 0, function*() {
                    const s1 = e / t1.context.sampleRate, n = new Yi(1, s1, t1.context.sampleRate);
                    new t1.constructor(Object.assign(t1.get(), {
                        frequency: 2 / s1,
                        detune: 0,
                        context: n
                    })).toDestination().start(0);
                    return (yield n.render()).getChannelData(0);
                });
            }
            class nr extends Co {
                constructor(){
                    super(Di(nr.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ])), this.name = "ToneOscillatorNode", this._oscillator = this.context.createOscillator(), this._internalChannels = [
                        this._oscillator
                    ];
                    const t1 = Di(nr.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ]);
                    To(this._oscillator, this._gainNode), this.type = t1.type, this.frequency = new xo({
                        context: this.context,
                        param: this._oscillator.frequency,
                        units: "frequency",
                        value: t1.frequency
                    }), this.detune = new xo({
                        context: this.context,
                        param: this._oscillator.detune,
                        units: "cents",
                        value: t1.detune
                    }), Ui(this, [
                        "frequency",
                        "detune"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Co.getDefaults(), {
                        detune: 0,
                        frequency: 440,
                        type: "sine"
                    });
                }
                start(t1) {
                    const e = this.toSeconds(t1);
                    return this.log("start", e), this._startGain(e), this._oscillator.start(e), this;
                }
                _stopSource(t1) {
                    this._oscillator.stop(t1);
                }
                setPeriodicWave(t1) {
                    return this._oscillator.setPeriodicWave(t1), this;
                }
                get type() {
                    return this._oscillator.type;
                }
                set type(t1) {
                    this._oscillator.type = t1;
                }
                dispose() {
                    return super.dispose(), "started" === this.state && this.stop(), this._oscillator.disconnect(), this.frequency.dispose(), this.detune.dispose(), this;
                }
            }
            class ir extends Ho {
                constructor(){
                    super(Di(ir.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ])), this.name = "Oscillator", this._oscillator = null;
                    const t1 = Di(ir.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ]);
                    this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency
                    }), Ui(this, "frequency"), this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), Ui(this, "detune"), this._partials = t1.partials, this._partialCount = t1.partialCount, this._type = t1.type, t1.partialCount && "custom" !== t1.type && (this._type = this.baseType + t1.partialCount.toString()), this.phase = t1.phase;
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        detune: 0,
                        frequency: 440,
                        partialCount: 0,
                        partials: [],
                        phase: 0,
                        type: "sine"
                    });
                }
                _start(t1) {
                    const e = this.toSeconds(t1), s1 = new nr({
                        context: this.context,
                        onended: ()=>this.onstop(this)
                    });
                    this._oscillator = s1, this._wave ? this._oscillator.setPeriodicWave(this._wave) : this._oscillator.type = this._type, this._oscillator.connect(this.output), this.frequency.connect(this._oscillator.frequency), this.detune.connect(this._oscillator.detune), this._oscillator.start(e);
                }
                _stop(t1) {
                    const e = this.toSeconds(t1);
                    this._oscillator && this._oscillator.stop(e);
                }
                _restart(t1) {
                    const e = this.toSeconds(t1);
                    return this.log("restart", e), this._oscillator && this._oscillator.cancelStop(), this._state.cancel(e), this;
                }
                syncFrequency() {
                    return this.context.transport.syncSignal(this.frequency), this;
                }
                unsyncFrequency() {
                    return this.context.transport.unsyncSignal(this.frequency), this;
                }
                _getCachedPeriodicWave() {
                    if ("custom" === this._type) return ir._periodicWaveCache.find((t1)=>{
                        var e, s1;
                        return t1.phase === this._phase && (e = t1.partials, s1 = this._partials, e.length === s1.length && e.every((t1, e)=>s1[e] === t1));
                    });
                    {
                        const t1 = ir._periodicWaveCache.find((t1)=>t1.type === this._type && t1.phase === this._phase);
                        return this._partialCount = t1 ? t1.partialCount : this._partialCount, t1;
                    }
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    this._type = t1;
                    const e = -1 !== [
                        "sine",
                        "square",
                        "sawtooth",
                        "triangle"
                    ].indexOf(t1);
                    if (0 === this._phase && e) this._wave = void 0, this._partialCount = 0, null !== this._oscillator && (this._oscillator.type = t1);
                    else {
                        const e = this._getCachedPeriodicWave();
                        if (ci(e)) {
                            const { partials: t1, wave: s1 } = e;
                            this._wave = s1, this._partials = t1, null !== this._oscillator && this._oscillator.setPeriodicWave(this._wave);
                        } else {
                            const [e, s1] = this._getRealImaginary(t1, this._phase), n = this.context.createPeriodicWave(e, s1);
                            this._wave = n, null !== this._oscillator && this._oscillator.setPeriodicWave(this._wave), ir._periodicWaveCache.push({
                                imag: s1,
                                partialCount: this._partialCount,
                                partials: this._partials,
                                phase: this._phase,
                                real: e,
                                type: this._type,
                                wave: this._wave
                            }), ir._periodicWaveCache.length > 100 && ir._periodicWaveCache.shift();
                        }
                    }
                }
                get baseType() {
                    return this._type.replace(this.partialCount.toString(), "");
                }
                set baseType(t1) {
                    this.partialCount && "custom" !== this._type && "custom" !== t1 ? this.type = t1 + this.partialCount : this.type = t1;
                }
                get partialCount() {
                    return this._partialCount;
                }
                set partialCount(t1) {
                    ei(t1, 0);
                    let e = this._type;
                    const s1 = /^(sine|triangle|square|sawtooth)(\d+)$/.exec(this._type);
                    if (s1 && (e = s1[1]), "custom" !== this._type) this.type = 0 === t1 ? e : e + t1.toString();
                    else {
                        const e = new Float32Array(t1);
                        this._partials.forEach((t1, s1)=>e[s1] = t1), this._partials = Array.from(e), this.type = this._type;
                    }
                }
                _getRealImaginary(t1, e) {
                    let s1 = 2048;
                    const n = new Float32Array(s1), i = new Float32Array(s1);
                    let o = 1;
                    if ("custom" === t1) {
                        if (o = this._partials.length + 1, this._partialCount = this._partials.length, s1 = o, 0 === this._partials.length) return [
                            n,
                            i
                        ];
                    } else {
                        const e = /^(sine|triangle|square|sawtooth)(\d+)$/.exec(t1);
                        e ? (o = parseInt(e[2], 10) + 1, this._partialCount = parseInt(e[2], 10), t1 = e[1], o = Math.max(o, 2), s1 = o) : this._partialCount = 0, this._partials = [];
                    }
                    for(let r = 1; r < s1; ++r){
                        const s1 = 2 / (r * Math.PI);
                        let a;
                        switch(t1){
                            case "sine":
                                a = r <= o ? 1 : 0, this._partials[r - 1] = a;
                                break;
                            case "square":
                                a = 1 & r ? 2 * s1 : 0, this._partials[r - 1] = a;
                                break;
                            case "sawtooth":
                                a = s1 * (1 & r ? 1 : -1), this._partials[r - 1] = a;
                                break;
                            case "triangle":
                                a = 1 & r ? s1 * s1 * 2 * (r - 1 >> 1 & 1 ? -1 : 1) : 0, this._partials[r - 1] = a;
                                break;
                            case "custom":
                                a = this._partials[r - 1];
                                break;
                            default:
                                throw new TypeError("Oscillator: invalid type: " + t1);
                        }
                        0 !== a ? (n[r] = -a * Math.sin(e * r), i[r] = a * Math.cos(e * r)) : (n[r] = 0, i[r] = 0);
                    }
                    return [
                        n,
                        i
                    ];
                }
                _inverseFFT(t1, e, s1) {
                    let n = 0;
                    const i = t1.length;
                    for(let o = 0; o < i; o++)n += t1[o] * Math.cos(o * s1) + e[o] * Math.sin(o * s1);
                    return n;
                }
                getInitialValue() {
                    const [t1, e] = this._getRealImaginary(this._type, 0);
                    let s1 = 0;
                    const n = 2 * Math.PI;
                    for(let i = 0; i < 32; i++)s1 = Math.max(this._inverseFFT(t1, e, i / 32 * n), s1);
                    return Vi(-this._inverseFFT(t1, e, this._phase) / s1, -1, 1);
                }
                get partials() {
                    return this._partials.slice(0, this.partialCount);
                }
                set partials(t1) {
                    this._partials = t1, this._partialCount = this._partials.length, t1.length && (this.type = "custom");
                }
                get phase() {
                    return this._phase * (180 / Math.PI);
                }
                set phase(t1) {
                    this._phase = t1 * Math.PI / 180, this.type = this._type;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), null !== this._oscillator && this._oscillator.dispose(), this._wave = void 0, this.frequency.dispose(), this.detune.dispose(), this;
                }
            }
            ir._periodicWaveCache = [];
            class or extends wo {
                constructor(){
                    super(Object.assign(Di(or.getDefaults(), arguments, [
                        "context"
                    ])));
                }
                connect(t1, e = 0, s1 = 0) {
                    return Oo(this, t1, e, s1), this;
                }
            }
            class rr extends or {
                constructor(){
                    super(Object.assign(Di(rr.getDefaults(), arguments, [
                        "mapping",
                        "length"
                    ]))), this.name = "WaveShaper", this._shaper = this.context.createWaveShaper(), this.input = this._shaper, this.output = this._shaper;
                    const t1 = Di(rr.getDefaults(), arguments, [
                        "mapping",
                        "length"
                    ]);
                    di(t1.mapping) || t1.mapping instanceof Float32Array ? this.curve = Float32Array.from(t1.mapping) : hi(t1.mapping) && this.setMap(t1.mapping, t1.length);
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        length: 1024
                    });
                }
                setMap(t1, e = 1024) {
                    const s1 = new Float32Array(e);
                    for(let n = 0, i = e; n < i; n++){
                        const e = n / (i - 1) * 2 - 1;
                        s1[n] = t1(e, n);
                    }
                    return this.curve = s1, this;
                }
                get curve() {
                    return this._shaper.curve;
                }
                set curve(t1) {
                    this._shaper.curve = t1;
                }
                get oversample() {
                    return this._shaper.oversample;
                }
                set oversample(t1) {
                    ti([
                        "none",
                        "2x",
                        "4x"
                    ].some((e)=>e.includes(t1)), "oversampling must be either 'none', '2x', or '4x'"), this._shaper.oversample = t1;
                }
                dispose() {
                    return super.dispose(), this._shaper.disconnect(), this;
                }
            }
            class ar extends or {
                constructor(){
                    super(...arguments), this.name = "AudioToGain", this._norm = new rr({
                        context: this.context,
                        mapping: (t1)=>(t1 + 1) / 2
                    }), this.input = this._norm, this.output = this._norm;
                }
                dispose() {
                    return super.dispose(), this._norm.dispose(), this;
                }
            }
            class cr extends Do {
                constructor(){
                    super(Object.assign(Di(cr.getDefaults(), arguments, [
                        "value"
                    ]))), this.name = "Multiply", this.override = !1;
                    const t1 = Di(cr.getDefaults(), arguments, [
                        "value"
                    ]);
                    this._mult = this.input = this.output = new ko({
                        context: this.context,
                        minValue: t1.minValue,
                        maxValue: t1.maxValue
                    }), this.factor = this._param = this._mult.gain, this.factor.setValueAtTime(t1.value, 0);
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        value: 0
                    });
                }
                dispose() {
                    return super.dispose(), this._mult.dispose(), this;
                }
            }
            class hr extends Ho {
                constructor(){
                    super(Di(hr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "modulationType"
                    ])), this.name = "AMOscillator", this._modulationScale = new ar({
                        context: this.context
                    }), this._modulationNode = new ko({
                        context: this.context
                    });
                    const t1 = Di(hr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "modulationType"
                    ]);
                    this._carrier = new ir({
                        context: this.context,
                        detune: t1.detune,
                        frequency: t1.frequency,
                        onstop: ()=>this.onstop(this),
                        phase: t1.phase,
                        type: t1.type
                    }), this.frequency = this._carrier.frequency, this.detune = this._carrier.detune, this._modulator = new ir({
                        context: this.context,
                        phase: t1.phase,
                        type: t1.modulationType
                    }), this.harmonicity = new cr({
                        context: this.context,
                        units: "positive",
                        value: t1.harmonicity
                    }), this.frequency.chain(this.harmonicity, this._modulator.frequency), this._modulator.chain(this._modulationScale, this._modulationNode.gain), this._carrier.chain(this._modulationNode, this.output), Ui(this, [
                        "frequency",
                        "detune",
                        "harmonicity"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(ir.getDefaults(), {
                        harmonicity: 1,
                        modulationType: "square"
                    });
                }
                _start(t1) {
                    this._modulator.start(t1), this._carrier.start(t1);
                }
                _stop(t1) {
                    this._modulator.stop(t1), this._carrier.stop(t1);
                }
                _restart(t1) {
                    this._modulator.restart(t1), this._carrier.restart(t1);
                }
                get type() {
                    return this._carrier.type;
                }
                set type(t1) {
                    this._carrier.type = t1;
                }
                get baseType() {
                    return this._carrier.baseType;
                }
                set baseType(t1) {
                    this._carrier.baseType = t1;
                }
                get partialCount() {
                    return this._carrier.partialCount;
                }
                set partialCount(t1) {
                    this._carrier.partialCount = t1;
                }
                get modulationType() {
                    return this._modulator.type;
                }
                set modulationType(t1) {
                    this._modulator.type = t1;
                }
                get phase() {
                    return this._carrier.phase;
                }
                set phase(t1) {
                    this._carrier.phase = t1, this._modulator.phase = t1;
                }
                get partials() {
                    return this._carrier.partials;
                }
                set partials(t1) {
                    this._carrier.partials = t1;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this.frequency.dispose(), this.detune.dispose(), this.harmonicity.dispose(), this._carrier.dispose(), this._modulator.dispose(), this._modulationNode.dispose(), this._modulationScale.dispose(), this;
                }
            }
            class ur extends Ho {
                constructor(){
                    super(Di(ur.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "modulationType"
                    ])), this.name = "FMOscillator", this._modulationNode = new ko({
                        context: this.context,
                        gain: 0
                    });
                    const t1 = Di(ur.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "modulationType"
                    ]);
                    this._carrier = new ir({
                        context: this.context,
                        detune: t1.detune,
                        frequency: 0,
                        onstop: ()=>this.onstop(this),
                        phase: t1.phase,
                        type: t1.type
                    }), this.detune = this._carrier.detune, this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency
                    }), this._modulator = new ir({
                        context: this.context,
                        phase: t1.phase,
                        type: t1.modulationType
                    }), this.harmonicity = new cr({
                        context: this.context,
                        units: "positive",
                        value: t1.harmonicity
                    }), this.modulationIndex = new cr({
                        context: this.context,
                        units: "positive",
                        value: t1.modulationIndex
                    }), this.frequency.connect(this._carrier.frequency), this.frequency.chain(this.harmonicity, this._modulator.frequency), this.frequency.chain(this.modulationIndex, this._modulationNode), this._modulator.connect(this._modulationNode.gain), this._modulationNode.connect(this._carrier.frequency), this._carrier.connect(this.output), this.detune.connect(this._modulator.detune), Ui(this, [
                        "modulationIndex",
                        "frequency",
                        "detune",
                        "harmonicity"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(ir.getDefaults(), {
                        harmonicity: 1,
                        modulationIndex: 2,
                        modulationType: "square"
                    });
                }
                _start(t1) {
                    this._modulator.start(t1), this._carrier.start(t1);
                }
                _stop(t1) {
                    this._modulator.stop(t1), this._carrier.stop(t1);
                }
                _restart(t1) {
                    return this._modulator.restart(t1), this._carrier.restart(t1), this;
                }
                get type() {
                    return this._carrier.type;
                }
                set type(t1) {
                    this._carrier.type = t1;
                }
                get baseType() {
                    return this._carrier.baseType;
                }
                set baseType(t1) {
                    this._carrier.baseType = t1;
                }
                get partialCount() {
                    return this._carrier.partialCount;
                }
                set partialCount(t1) {
                    this._carrier.partialCount = t1;
                }
                get modulationType() {
                    return this._modulator.type;
                }
                set modulationType(t1) {
                    this._modulator.type = t1;
                }
                get phase() {
                    return this._carrier.phase;
                }
                set phase(t1) {
                    this._carrier.phase = t1, this._modulator.phase = t1;
                }
                get partials() {
                    return this._carrier.partials;
                }
                set partials(t1) {
                    this._carrier.partials = t1;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this.frequency.dispose(), this.harmonicity.dispose(), this._carrier.dispose(), this._modulator.dispose(), this._modulationNode.dispose(), this.modulationIndex.dispose(), this;
                }
            }
            class lr extends Ho {
                constructor(){
                    super(Di(lr.getDefaults(), arguments, [
                        "frequency",
                        "width"
                    ])), this.name = "PulseOscillator", this._widthGate = new ko({
                        context: this.context,
                        gain: 0
                    }), this._thresh = new rr({
                        context: this.context,
                        mapping: (t1)=>t1 <= 0 ? -1 : 1
                    });
                    const t1 = Di(lr.getDefaults(), arguments, [
                        "frequency",
                        "width"
                    ]);
                    this.width = new Do({
                        context: this.context,
                        units: "audioRange",
                        value: t1.width
                    }), this._triangle = new ir({
                        context: this.context,
                        detune: t1.detune,
                        frequency: t1.frequency,
                        onstop: ()=>this.onstop(this),
                        phase: t1.phase,
                        type: "triangle"
                    }), this.frequency = this._triangle.frequency, this.detune = this._triangle.detune, this._triangle.chain(this._thresh, this.output), this.width.chain(this._widthGate, this._thresh), Ui(this, [
                        "width",
                        "frequency",
                        "detune"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        detune: 0,
                        frequency: 440,
                        phase: 0,
                        type: "pulse",
                        width: .2
                    });
                }
                _start(t1) {
                    t1 = this.toSeconds(t1), this._triangle.start(t1), this._widthGate.gain.setValueAtTime(1, t1);
                }
                _stop(t1) {
                    t1 = this.toSeconds(t1), this._triangle.stop(t1), this._widthGate.gain.cancelScheduledValues(t1), this._widthGate.gain.setValueAtTime(0, t1);
                }
                _restart(t1) {
                    this._triangle.restart(t1), this._widthGate.gain.cancelScheduledValues(t1), this._widthGate.gain.setValueAtTime(1, t1);
                }
                get phase() {
                    return this._triangle.phase;
                }
                set phase(t1) {
                    this._triangle.phase = t1;
                }
                get type() {
                    return "pulse";
                }
                get baseType() {
                    return "pulse";
                }
                get partials() {
                    return [];
                }
                get partialCount() {
                    return 0;
                }
                set carrierType(t1) {
                    this._triangle.type = t1;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this._triangle.dispose(), this.width.dispose(), this._widthGate.dispose(), this._thresh.dispose(), this;
                }
            }
            class pr extends Ho {
                constructor(){
                    super(Di(pr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "spread"
                    ])), this.name = "FatOscillator", this._oscillators = [];
                    const t1 = Di(pr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "spread"
                    ]);
                    this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency
                    }), this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), this._spread = t1.spread, this._type = t1.type, this._phase = t1.phase, this._partials = t1.partials, this._partialCount = t1.partialCount, this.count = t1.count, Ui(this, [
                        "frequency",
                        "detune"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(ir.getDefaults(), {
                        count: 3,
                        spread: 20,
                        type: "sawtooth"
                    });
                }
                _start(t1) {
                    t1 = this.toSeconds(t1), this._forEach((e)=>e.start(t1));
                }
                _stop(t1) {
                    t1 = this.toSeconds(t1), this._forEach((e)=>e.stop(t1));
                }
                _restart(t1) {
                    this._forEach((e)=>e.restart(t1));
                }
                _forEach(t1) {
                    for(let e = 0; e < this._oscillators.length; e++)t1(this._oscillators[e], e);
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    this._type = t1, this._forEach((e)=>e.type = t1);
                }
                get spread() {
                    return this._spread;
                }
                set spread(t1) {
                    if (this._spread = t1, this._oscillators.length > 1) {
                        const e = -t1 / 2, s1 = t1 / (this._oscillators.length - 1);
                        this._forEach((t1, n)=>t1.detune.value = e + s1 * n);
                    }
                }
                get count() {
                    return this._oscillators.length;
                }
                set count(t1) {
                    if (ei(t1, 1), this._oscillators.length !== t1) {
                        this._forEach((t1)=>t1.dispose()), this._oscillators = [];
                        for(let e = 0; e < t1; e++){
                            const s1 = new ir({
                                context: this.context,
                                volume: -6 - 1.1 * t1,
                                type: this._type,
                                phase: this._phase + e / t1 * 360,
                                partialCount: this._partialCount,
                                onstop: 0 === e ? ()=>this.onstop(this) : Zi
                            });
                            "custom" === this.type && (s1.partials = this._partials), this.frequency.connect(s1.frequency), this.detune.connect(s1.detune), s1.detune.overridden = !1, s1.connect(this.output), this._oscillators[e] = s1;
                        }
                        this.spread = this._spread, "started" === this.state && this._forEach((t1)=>t1.start());
                    }
                }
                get phase() {
                    return this._phase;
                }
                set phase(t1) {
                    this._phase = t1, this._forEach((t1, e)=>t1.phase = this._phase + e / this.count * 360);
                }
                get baseType() {
                    return this._oscillators[0].baseType;
                }
                set baseType(t1) {
                    this._forEach((e)=>e.baseType = t1), this._type = this._oscillators[0].type;
                }
                get partials() {
                    return this._oscillators[0].partials;
                }
                set partials(t1) {
                    this._partials = t1, this._partialCount = this._partials.length, t1.length && (this._type = "custom", this._forEach((e)=>e.partials = t1));
                }
                get partialCount() {
                    return this._oscillators[0].partialCount;
                }
                set partialCount(t1) {
                    this._partialCount = t1, this._forEach((e)=>e.partialCount = t1), this._type = this._oscillators[0].type;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this.frequency.dispose(), this.detune.dispose(), this._forEach((t1)=>t1.dispose()), this;
                }
            }
            class dr extends Ho {
                constructor(){
                    super(Di(dr.getDefaults(), arguments, [
                        "frequency",
                        "modulationFrequency"
                    ])), this.name = "PWMOscillator", this.sourceType = "pwm", this._scale = new cr({
                        context: this.context,
                        value: 2
                    });
                    const t1 = Di(dr.getDefaults(), arguments, [
                        "frequency",
                        "modulationFrequency"
                    ]);
                    this._pulse = new lr({
                        context: this.context,
                        frequency: t1.modulationFrequency
                    }), this._pulse.carrierType = "sine", this.modulationFrequency = this._pulse.frequency, this._modulator = new ir({
                        context: this.context,
                        detune: t1.detune,
                        frequency: t1.frequency,
                        onstop: ()=>this.onstop(this),
                        phase: t1.phase
                    }), this.frequency = this._modulator.frequency, this.detune = this._modulator.detune, this._modulator.chain(this._scale, this._pulse.width), this._pulse.connect(this.output), Ui(this, [
                        "modulationFrequency",
                        "frequency",
                        "detune"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        detune: 0,
                        frequency: 440,
                        modulationFrequency: .4,
                        phase: 0,
                        type: "pwm"
                    });
                }
                _start(t1) {
                    t1 = this.toSeconds(t1), this._modulator.start(t1), this._pulse.start(t1);
                }
                _stop(t1) {
                    t1 = this.toSeconds(t1), this._modulator.stop(t1), this._pulse.stop(t1);
                }
                _restart(t1) {
                    this._modulator.restart(t1), this._pulse.restart(t1);
                }
                get type() {
                    return "pwm";
                }
                get baseType() {
                    return "pwm";
                }
                get partials() {
                    return [];
                }
                get partialCount() {
                    return 0;
                }
                get phase() {
                    return this._modulator.phase;
                }
                set phase(t1) {
                    this._modulator.phase = t1;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this._pulse.dispose(), this._scale.dispose(), this._modulator.dispose(), this;
                }
            }
            const fr = {
                am: hr,
                fat: pr,
                fm: ur,
                oscillator: ir,
                pulse: lr,
                pwm: dr
            };
            class _r extends Ho {
                constructor(){
                    super(Di(_r.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ])), this.name = "OmniOscillator";
                    const t1 = Di(_r.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ]);
                    this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency
                    }), this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), Ui(this, [
                        "frequency",
                        "detune"
                    ]), this.set(t1);
                }
                static getDefaults() {
                    return Object.assign(ir.getDefaults(), ur.getDefaults(), hr.getDefaults(), pr.getDefaults(), lr.getDefaults(), dr.getDefaults());
                }
                _start(t1) {
                    this._oscillator.start(t1);
                }
                _stop(t1) {
                    this._oscillator.stop(t1);
                }
                _restart(t1) {
                    return this._oscillator.restart(t1), this;
                }
                get type() {
                    let t1 = "";
                    return [
                        "am",
                        "fm",
                        "fat"
                    ].some((t1)=>this._sourceType === t1) && (t1 = this._sourceType), t1 + this._oscillator.type;
                }
                set type(t1) {
                    "fm" === t1.substr(0, 2) ? (this._createNewOscillator("fm"), this._oscillator = this._oscillator, this._oscillator.type = t1.substr(2)) : "am" === t1.substr(0, 2) ? (this._createNewOscillator("am"), this._oscillator = this._oscillator, this._oscillator.type = t1.substr(2)) : "fat" === t1.substr(0, 3) ? (this._createNewOscillator("fat"), this._oscillator = this._oscillator, this._oscillator.type = t1.substr(3)) : "pwm" === t1 ? (this._createNewOscillator("pwm"), this._oscillator = this._oscillator) : "pulse" === t1 ? this._createNewOscillator("pulse") : (this._createNewOscillator("oscillator"), this._oscillator = this._oscillator, this._oscillator.type = t1);
                }
                get partials() {
                    return this._oscillator.partials;
                }
                set partials(t1) {
                    this._getOscType(this._oscillator, "pulse") || this._getOscType(this._oscillator, "pwm") || (this._oscillator.partials = t1);
                }
                get partialCount() {
                    return this._oscillator.partialCount;
                }
                set partialCount(t1) {
                    this._getOscType(this._oscillator, "pulse") || this._getOscType(this._oscillator, "pwm") || (this._oscillator.partialCount = t1);
                }
                set(t1) {
                    return Reflect.has(t1, "type") && t1.type && (this.type = t1.type), super.set(t1), this;
                }
                _createNewOscillator(t1) {
                    if (t1 !== this._sourceType) {
                        this._sourceType = t1;
                        const e = fr[t1], s1 = this.now();
                        if (this._oscillator) {
                            const t1 = this._oscillator;
                            t1.stop(s1), this.context.setTimeout(()=>t1.dispose(), this.blockTime);
                        }
                        this._oscillator = new e({
                            context: this.context
                        }), this.frequency.connect(this._oscillator.frequency), this.detune.connect(this._oscillator.detune), this._oscillator.connect(this.output), this._oscillator.onstop = ()=>this.onstop(this), "started" === this.state && this._oscillator.start(s1);
                    }
                }
                get phase() {
                    return this._oscillator.phase;
                }
                set phase(t1) {
                    this._oscillator.phase = t1;
                }
                get sourceType() {
                    return this._sourceType;
                }
                set sourceType(t1) {
                    let e = "sine";
                    "pwm" !== this._oscillator.type && "pulse" !== this._oscillator.type && (e = this._oscillator.type), "fm" === t1 ? this.type = "fm" + e : "am" === t1 ? this.type = "am" + e : "fat" === t1 ? this.type = "fat" + e : "oscillator" === t1 ? this.type = e : "pulse" === t1 ? this.type = "pulse" : "pwm" === t1 && (this.type = "pwm");
                }
                _getOscType(t1, e) {
                    return t1 instanceof fr[e];
                }
                get baseType() {
                    return this._oscillator.baseType;
                }
                set baseType(t1) {
                    this._getOscType(this._oscillator, "pulse") || this._getOscType(this._oscillator, "pwm") || "pulse" === t1 || "pwm" === t1 || (this._oscillator.baseType = t1);
                }
                get width() {
                    return this._getOscType(this._oscillator, "pulse") ? this._oscillator.width : void 0;
                }
                get count() {
                    return this._getOscType(this._oscillator, "fat") ? this._oscillator.count : void 0;
                }
                set count(t1) {
                    this._getOscType(this._oscillator, "fat") && ui(t1) && (this._oscillator.count = t1);
                }
                get spread() {
                    return this._getOscType(this._oscillator, "fat") ? this._oscillator.spread : void 0;
                }
                set spread(t1) {
                    this._getOscType(this._oscillator, "fat") && ui(t1) && (this._oscillator.spread = t1);
                }
                get modulationType() {
                    return this._getOscType(this._oscillator, "fm") || this._getOscType(this._oscillator, "am") ? this._oscillator.modulationType : void 0;
                }
                set modulationType(t1) {
                    (this._getOscType(this._oscillator, "fm") || this._getOscType(this._oscillator, "am")) && fi(t1) && (this._oscillator.modulationType = t1);
                }
                get modulationIndex() {
                    return this._getOscType(this._oscillator, "fm") ? this._oscillator.modulationIndex : void 0;
                }
                get harmonicity() {
                    return this._getOscType(this._oscillator, "fm") || this._getOscType(this._oscillator, "am") ? this._oscillator.harmonicity : void 0;
                }
                get modulationFrequency() {
                    return this._getOscType(this._oscillator, "pwm") ? this._oscillator.modulationFrequency : void 0;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        return sr(this, t1);
                    });
                }
                dispose() {
                    return super.dispose(), this.detune.dispose(), this.frequency.dispose(), this._oscillator.dispose(), this;
                }
            }
            class mr extends Do {
                constructor(){
                    super(Object.assign(Di(mr.getDefaults(), arguments, [
                        "value"
                    ]))), this.override = !1, this.name = "Add", this._sum = new ko({
                        context: this.context
                    }), this.input = this._sum, this.output = this._sum, this.addend = this._param, bo(this._constantSource, this._sum);
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        value: 0
                    });
                }
                dispose() {
                    return super.dispose(), this._sum.dispose(), this;
                }
            }
            class gr extends or {
                constructor(){
                    super(Object.assign(Di(gr.getDefaults(), arguments, [
                        "min",
                        "max"
                    ]))), this.name = "Scale";
                    const t1 = Di(gr.getDefaults(), arguments, [
                        "min",
                        "max"
                    ]);
                    this._mult = this.input = new cr({
                        context: this.context,
                        value: t1.max - t1.min
                    }), this._add = this.output = new mr({
                        context: this.context,
                        value: t1.min
                    }), this._min = t1.min, this._max = t1.max, this.input.connect(this.output);
                }
                static getDefaults() {
                    return Object.assign(or.getDefaults(), {
                        max: 1,
                        min: 0
                    });
                }
                get min() {
                    return this._min;
                }
                set min(t1) {
                    this._min = t1, this._setRange();
                }
                get max() {
                    return this._max;
                }
                set max(t1) {
                    this._max = t1, this._setRange();
                }
                _setRange() {
                    this._add.value = this._min, this._mult.value = this._max - this._min;
                }
                dispose() {
                    return super.dispose(), this._add.dispose(), this._mult.dispose(), this;
                }
            }
            class vr extends or {
                constructor(){
                    super(Object.assign(Di(vr.getDefaults(), arguments))), this.name = "Zero", this._gain = new ko({
                        context: this.context
                    }), this.output = this._gain, this.input = void 0, To(this.context.getConstant(0), this._gain);
                }
                dispose() {
                    return super.dispose(), So(this.context.getConstant(0), this._gain), this;
                }
            }
            class yr extends wo {
                constructor(){
                    super(Di(yr.getDefaults(), arguments, [
                        "frequency",
                        "min",
                        "max"
                    ])), this.name = "LFO", this._stoppedValue = 0, this._units = "number", this.convert = !0, this._fromType = xo.prototype._fromType, this._toType = xo.prototype._toType, this._is = xo.prototype._is, this._clampValue = xo.prototype._clampValue;
                    const t1 = Di(yr.getDefaults(), arguments, [
                        "frequency",
                        "min",
                        "max"
                    ]);
                    this._oscillator = new ir(t1), this.frequency = this._oscillator.frequency, this._amplitudeGain = new ko({
                        context: this.context,
                        gain: t1.amplitude,
                        units: "normalRange"
                    }), this.amplitude = this._amplitudeGain.gain, this._stoppedSignal = new Do({
                        context: this.context,
                        units: "audioRange",
                        value: 0
                    }), this._zeros = new vr({
                        context: this.context
                    }), this._a2g = new ar({
                        context: this.context
                    }), this._scaler = this.output = new gr({
                        context: this.context,
                        max: t1.max,
                        min: t1.min
                    }), this.units = t1.units, this.min = t1.min, this.max = t1.max, this._oscillator.chain(this._amplitudeGain, this._a2g, this._scaler), this._zeros.connect(this._a2g), this._stoppedSignal.connect(this._a2g), Ui(this, [
                        "amplitude",
                        "frequency"
                    ]), this.phase = t1.phase;
                }
                static getDefaults() {
                    return Object.assign(ir.getDefaults(), {
                        amplitude: 1,
                        frequency: "4n",
                        max: 1,
                        min: 0,
                        type: "sine",
                        units: "number"
                    });
                }
                start(t1) {
                    return t1 = this.toSeconds(t1), this._stoppedSignal.setValueAtTime(0, t1), this._oscillator.start(t1), this;
                }
                stop(t1) {
                    return t1 = this.toSeconds(t1), this._stoppedSignal.setValueAtTime(this._stoppedValue, t1), this._oscillator.stop(t1), this;
                }
                sync() {
                    return this._oscillator.sync(), this._oscillator.syncFrequency(), this;
                }
                unsync() {
                    return this._oscillator.unsync(), this._oscillator.unsyncFrequency(), this;
                }
                _setStoppedValue() {
                    this._stoppedValue = this._oscillator.getInitialValue(), this._stoppedSignal.value = this._stoppedValue;
                }
                get min() {
                    return this._toType(this._scaler.min);
                }
                set min(t1) {
                    t1 = this._fromType(t1), this._scaler.min = t1;
                }
                get max() {
                    return this._toType(this._scaler.max);
                }
                set max(t1) {
                    t1 = this._fromType(t1), this._scaler.max = t1;
                }
                get type() {
                    return this._oscillator.type;
                }
                set type(t1) {
                    this._oscillator.type = t1, this._setStoppedValue();
                }
                get partials() {
                    return this._oscillator.partials;
                }
                set partials(t1) {
                    this._oscillator.partials = t1, this._setStoppedValue();
                }
                get phase() {
                    return this._oscillator.phase;
                }
                set phase(t1) {
                    this._oscillator.phase = t1, this._setStoppedValue();
                }
                get units() {
                    return this._units;
                }
                set units(t1) {
                    const e = this.min, s1 = this.max;
                    this._units = t1, this.min = e, this.max = s1;
                }
                get state() {
                    return this._oscillator.state;
                }
                connect(t1, e, s1) {
                    return (t1 instanceof xo || t1 instanceof Do) && (this.convert = t1.convert, this.units = t1.units), Oo(this, t1, e, s1), this;
                }
                dispose() {
                    return super.dispose(), this._oscillator.dispose(), this._stoppedSignal.dispose(), this._zeros.dispose(), this._scaler.dispose(), this._a2g.dispose(), this._amplitudeGain.dispose(), this.amplitude.dispose(), this;
                }
            }
            function xr(t1, e = 1 / 0) {
                const s1 = new WeakMap;
                return function(n, i) {
                    Reflect.defineProperty(n, i, {
                        configurable: !0,
                        enumerable: !0,
                        get: function() {
                            return s1.get(this);
                        },
                        set: function(n) {
                            ei(n, t1, e), s1.set(this, n);
                        }
                    });
                };
            }
            function wr(t1, e = 1 / 0) {
                const s1 = new WeakMap;
                return function(n, i) {
                    Reflect.defineProperty(n, i, {
                        configurable: !0,
                        enumerable: !0,
                        get: function() {
                            return s1.get(this);
                        },
                        set: function(n) {
                            ei(this.toSeconds(n), t1, e), s1.set(this, n);
                        }
                    });
                };
            }
            class br extends Ho {
                constructor(){
                    super(Di(br.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ])), this.name = "Player", this._activeSources = new Set;
                    const t1 = Di(br.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ]);
                    this._buffer = new Xi({
                        onload: this._onload.bind(this, t1.onload),
                        onerror: t1.onerror,
                        reverse: t1.reverse,
                        url: t1.url
                    }), this.autostart = t1.autostart, this._loop = t1.loop, this._loopStart = t1.loopStart, this._loopEnd = t1.loopEnd, this._playbackRate = t1.playbackRate, this.fadeIn = t1.fadeIn, this.fadeOut = t1.fadeOut;
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        autostart: !1,
                        fadeIn: 0,
                        fadeOut: 0,
                        loop: !1,
                        loopEnd: 0,
                        loopStart: 0,
                        onload: Zi,
                        onerror: Zi,
                        playbackRate: 1,
                        reverse: !1
                    });
                }
                load(t1) {
                    return yi(this, void 0, void 0, function*() {
                        return yield this._buffer.load(t1), this._onload(), this;
                    });
                }
                _onload(t1 = Zi) {
                    t1(), this.autostart && this.start();
                }
                _onSourceEnd(t1) {
                    this.onstop(this), this._activeSources.delete(t1), 0 !== this._activeSources.size || this._synced || "started" !== this._state.getValueAtTime(this.now()) || (this._state.cancel(this.now()), this._state.setStateAtTime("stopped", this.now()));
                }
                start(t1, e, s1) {
                    return super.start(t1, e, s1), this;
                }
                _start(t1, e, s1) {
                    e = this._loop ? Oi(e, this._loopStart) : Oi(e, 0);
                    const n = this.toSeconds(e), i = s1;
                    s1 = Oi(s1, Math.max(this._buffer.duration - n, 0));
                    let o = this.toSeconds(s1);
                    o /= this._playbackRate, t1 = this.toSeconds(t1);
                    const r = new $o({
                        url: this._buffer,
                        context: this.context,
                        fadeIn: this.fadeIn,
                        fadeOut: this.fadeOut,
                        loop: this._loop,
                        loopEnd: this._loopEnd,
                        loopStart: this._loopStart,
                        onended: this._onSourceEnd.bind(this),
                        playbackRate: this._playbackRate
                    }).connect(this.output);
                    this._loop || this._synced || (this._state.cancel(t1 + o), this._state.setStateAtTime("stopped", t1 + o, {
                        implicitEnd: !0
                    })), this._activeSources.add(r), this._loop && ai(i) ? r.start(t1, n) : r.start(t1, n, o - this.toSeconds(this.fadeOut));
                }
                _stop(t1) {
                    const e = this.toSeconds(t1);
                    this._activeSources.forEach((t1)=>t1.stop(e));
                }
                restart(t1, e, s1) {
                    return super.restart(t1, e, s1), this;
                }
                _restart(t1, e, s1) {
                    this._stop(t1), this._start(t1, e, s1);
                }
                seek(t1, e) {
                    const s1 = this.toSeconds(e);
                    if ("started" === this._state.getValueAtTime(s1)) {
                        const e = this.toSeconds(t1);
                        this._stop(s1), this._start(s1, e);
                    }
                    return this;
                }
                setLoopPoints(t1, e) {
                    return this.loopStart = t1, this.loopEnd = e, this;
                }
                get loopStart() {
                    return this._loopStart;
                }
                set loopStart(t1) {
                    this._loopStart = t1, this.buffer.loaded && ei(this.toSeconds(t1), 0, this.buffer.duration), this._activeSources.forEach((e)=>{
                        e.loopStart = t1;
                    });
                }
                get loopEnd() {
                    return this._loopEnd;
                }
                set loopEnd(t1) {
                    this._loopEnd = t1, this.buffer.loaded && ei(this.toSeconds(t1), 0, this.buffer.duration), this._activeSources.forEach((e)=>{
                        e.loopEnd = t1;
                    });
                }
                get buffer() {
                    return this._buffer;
                }
                set buffer(t1) {
                    this._buffer.set(t1);
                }
                get loop() {
                    return this._loop;
                }
                set loop(t1) {
                    if (this._loop !== t1 && (this._loop = t1, this._activeSources.forEach((e)=>{
                        e.loop = t1;
                    }), t1)) {
                        const t1 = this._state.getNextState("stopped", this.now());
                        t1 && this._state.cancel(t1.time);
                    }
                }
                get playbackRate() {
                    return this._playbackRate;
                }
                set playbackRate(t1) {
                    this._playbackRate = t1;
                    const e = this.now(), s1 = this._state.getNextState("stopped", e);
                    s1 && s1.implicitEnd && (this._state.cancel(s1.time), this._activeSources.forEach((t1)=>t1.cancelStop())), this._activeSources.forEach((s1)=>{
                        s1.playbackRate.setValueAtTime(t1, e);
                    });
                }
                get reverse() {
                    return this._buffer.reverse;
                }
                set reverse(t1) {
                    this._buffer.reverse = t1;
                }
                get loaded() {
                    return this._buffer.loaded;
                }
                dispose() {
                    return super.dispose(), this._activeSources.forEach((t1)=>t1.dispose()), this._activeSources.clear(), this._buffer.dispose(), this;
                }
            }
            vi([
                wr(0)
            ], br.prototype, "fadeIn", void 0), vi([
                wr(0)
            ], br.prototype, "fadeOut", void 0);
            class Tr extends wo {
                constructor(){
                    super(Di(Tr.getDefaults(), arguments, [
                        "urls",
                        "onload"
                    ], "urls")), this.name = "Players", this.input = void 0, this._players = new Map;
                    const t1 = Di(Tr.getDefaults(), arguments, [
                        "urls",
                        "onload"
                    ], "urls");
                    this._volume = this.output = new Go({
                        context: this.context,
                        volume: t1.volume
                    }), this.volume = this._volume.volume, Ui(this, "volume"), this._buffers = new Vo({
                        urls: t1.urls,
                        onload: t1.onload,
                        baseUrl: t1.baseUrl,
                        onerror: t1.onerror
                    }), this.mute = t1.mute, this._fadeIn = t1.fadeIn, this._fadeOut = t1.fadeOut;
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        baseUrl: "",
                        fadeIn: 0,
                        fadeOut: 0,
                        mute: !1,
                        onload: Zi,
                        onerror: Zi,
                        urls: {},
                        volume: 0
                    });
                }
                get mute() {
                    return this._volume.mute;
                }
                set mute(t1) {
                    this._volume.mute = t1;
                }
                get fadeIn() {
                    return this._fadeIn;
                }
                set fadeIn(t1) {
                    this._fadeIn = t1, this._players.forEach((e)=>{
                        e.fadeIn = t1;
                    });
                }
                get fadeOut() {
                    return this._fadeOut;
                }
                set fadeOut(t1) {
                    this._fadeOut = t1, this._players.forEach((e)=>{
                        e.fadeOut = t1;
                    });
                }
                get state() {
                    return Array.from(this._players).some(([t1, e])=>"started" === e.state) ? "started" : "stopped";
                }
                has(t1) {
                    return this._buffers.has(t1);
                }
                player(t1) {
                    if (ti(this.has(t1), `No Player with the name ${t1} exists on this object`), !this._players.has(t1)) {
                        const e = new br({
                            context: this.context,
                            fadeIn: this._fadeIn,
                            fadeOut: this._fadeOut,
                            url: this._buffers.get(t1)
                        }).connect(this.output);
                        this._players.set(t1, e);
                    }
                    return this._players.get(t1);
                }
                get loaded() {
                    return this._buffers.loaded;
                }
                add(t1, e, s1) {
                    return ti(!this._buffers.has(t1), "A buffer with that name already exists on this object"), this._buffers.add(t1, e, s1), this;
                }
                stopAll(t1) {
                    return this._players.forEach((e)=>e.stop(t1)), this;
                }
                dispose() {
                    return super.dispose(), this._volume.dispose(), this.volume.dispose(), this._players.forEach((t1)=>t1.dispose()), this._buffers.dispose(), this;
                }
            }
            class Sr extends Ho {
                constructor(){
                    super(Di(Sr.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ])), this.name = "GrainPlayer", this._loopStart = 0, this._loopEnd = 0, this._activeSources = [];
                    const t1 = Di(Sr.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ]);
                    this.buffer = new Xi({
                        onload: t1.onload,
                        onerror: t1.onerror,
                        reverse: t1.reverse,
                        url: t1.url
                    }), this._clock = new qo({
                        context: this.context,
                        callback: this._tick.bind(this),
                        frequency: 1 / t1.grainSize
                    }), this._playbackRate = t1.playbackRate, this._grainSize = t1.grainSize, this._overlap = t1.overlap, this.detune = t1.detune, this.overlap = t1.overlap, this.loop = t1.loop, this.playbackRate = t1.playbackRate, this.grainSize = t1.grainSize, this.loopStart = t1.loopStart, this.loopEnd = t1.loopEnd, this.reverse = t1.reverse, this._clock.on("stop", this._onstop.bind(this));
                }
                static getDefaults() {
                    return Object.assign(Ho.getDefaults(), {
                        onload: Zi,
                        onerror: Zi,
                        overlap: .1,
                        grainSize: .2,
                        playbackRate: 1,
                        detune: 0,
                        loop: !1,
                        loopStart: 0,
                        loopEnd: 0,
                        reverse: !1
                    });
                }
                _start(t1, e, s1) {
                    e = Oi(e, 0), e = this.toSeconds(e), t1 = this.toSeconds(t1);
                    const n = 1 / this._clock.frequency.getValueAtTime(t1);
                    this._clock.start(t1, e / n), s1 && this.stop(t1 + this.toSeconds(s1));
                }
                restart(t1, e, s1) {
                    return super.restart(t1, e, s1), this;
                }
                _restart(t1, e, s1) {
                    this._stop(t1), this._start(t1, e, s1);
                }
                _stop(t1) {
                    this._clock.stop(t1);
                }
                _onstop(t1) {
                    this._activeSources.forEach((e)=>{
                        e.fadeOut = 0, e.stop(t1);
                    }), this.onstop(this);
                }
                _tick(t1) {
                    const e = this._clock.getTicksAtTime(t1), s1 = e * this._grainSize;
                    if (this.log("offset", s1), !this.loop && s1 > this.buffer.duration) return void this.stop(t1);
                    const n = s1 < this._overlap ? 0 : this._overlap, i = new $o({
                        context: this.context,
                        url: this.buffer,
                        fadeIn: n,
                        fadeOut: this._overlap,
                        loop: this.loop,
                        loopStart: this._loopStart,
                        loopEnd: this._loopEnd,
                        playbackRate: no(this.detune / 100)
                    }).connect(this.output);
                    i.start(t1, this._grainSize * e), i.stop(t1 + this._grainSize / this.playbackRate), this._activeSources.push(i), i.onended = ()=>{
                        const t1 = this._activeSources.indexOf(i);
                        -1 !== t1 && this._activeSources.splice(t1, 1);
                    };
                }
                get playbackRate() {
                    return this._playbackRate;
                }
                set playbackRate(t1) {
                    ei(t1, .001), this._playbackRate = t1, this.grainSize = this._grainSize;
                }
                get loopStart() {
                    return this._loopStart;
                }
                set loopStart(t1) {
                    this.buffer.loaded && ei(this.toSeconds(t1), 0, this.buffer.duration), this._loopStart = this.toSeconds(t1);
                }
                get loopEnd() {
                    return this._loopEnd;
                }
                set loopEnd(t1) {
                    this.buffer.loaded && ei(this.toSeconds(t1), 0, this.buffer.duration), this._loopEnd = this.toSeconds(t1);
                }
                get reverse() {
                    return this.buffer.reverse;
                }
                set reverse(t1) {
                    this.buffer.reverse = t1;
                }
                get grainSize() {
                    return this._grainSize;
                }
                set grainSize(t1) {
                    this._grainSize = this.toSeconds(t1), this._clock.frequency.setValueAtTime(this._playbackRate / this._grainSize, this.now());
                }
                get overlap() {
                    return this._overlap;
                }
                set overlap(t1) {
                    const e = this.toSeconds(t1);
                    ei(e, 0), this._overlap = e;
                }
                get loaded() {
                    return this.buffer.loaded;
                }
                dispose() {
                    return super.dispose(), this.buffer.dispose(), this._clock.dispose(), this._activeSources.forEach((t1)=>t1.dispose()), this;
                }
            }
            class kr extends or {
                constructor(){
                    super(...arguments), this.name = "Abs", this._abs = new rr({
                        context: this.context,
                        mapping: (t1)=>Math.abs(t1) < .001 ? 0 : Math.abs(t1)
                    }), this.input = this._abs, this.output = this._abs;
                }
                dispose() {
                    return super.dispose(), this._abs.dispose(), this;
                }
            }
            class Cr extends or {
                constructor(){
                    super(...arguments), this.name = "GainToAudio", this._norm = new rr({
                        context: this.context,
                        mapping: (t1)=>2 * Math.abs(t1) - 1
                    }), this.input = this._norm, this.output = this._norm;
                }
                dispose() {
                    return super.dispose(), this._norm.dispose(), this;
                }
            }
            class Ar extends or {
                constructor(){
                    super(...arguments), this.name = "Negate", this._multiply = new cr({
                        context: this.context,
                        value: -1
                    }), this.input = this._multiply, this.output = this._multiply;
                }
                dispose() {
                    return super.dispose(), this._multiply.dispose(), this;
                }
            }
            class Dr extends Do {
                constructor(){
                    super(Object.assign(Di(Dr.getDefaults(), arguments, [
                        "value"
                    ]))), this.override = !1, this.name = "Subtract", this._sum = new ko({
                        context: this.context
                    }), this.input = this._sum, this.output = this._sum, this._neg = new Ar({
                        context: this.context
                    }), this.subtrahend = this._param, bo(this._constantSource, this._neg, this._sum);
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        value: 0
                    });
                }
                dispose() {
                    return super.dispose(), this._neg.dispose(), this._sum.dispose(), this;
                }
            }
            class Or extends or {
                constructor(){
                    super(Object.assign(Di(Or.getDefaults(), arguments))), this.name = "GreaterThanZero", this._thresh = this.output = new rr({
                        context: this.context,
                        length: 127,
                        mapping: (t1)=>t1 <= 0 ? 0 : 1
                    }), this._scale = this.input = new cr({
                        context: this.context,
                        value: 1e4
                    }), this._scale.connect(this._thresh);
                }
                dispose() {
                    return super.dispose(), this._scale.dispose(), this._thresh.dispose(), this;
                }
            }
            class Mr extends Do {
                constructor(){
                    super(Object.assign(Di(Mr.getDefaults(), arguments, [
                        "value"
                    ]))), this.name = "GreaterThan", this.override = !1;
                    const t1 = Di(Mr.getDefaults(), arguments, [
                        "value"
                    ]);
                    this._subtract = this.input = new Dr({
                        context: this.context,
                        value: t1.value
                    }), this._gtz = this.output = new Or({
                        context: this.context
                    }), this.comparator = this._param = this._subtract.subtrahend, Ui(this, "comparator"), this._subtract.connect(this._gtz);
                }
                static getDefaults() {
                    return Object.assign(Do.getDefaults(), {
                        value: 0
                    });
                }
                dispose() {
                    return super.dispose(), this._gtz.dispose(), this._subtract.dispose(), this.comparator.dispose(), this;
                }
            }
            class Er extends or {
                constructor(){
                    super(Object.assign(Di(Er.getDefaults(), arguments, [
                        "value"
                    ]))), this.name = "Pow";
                    const t1 = Di(Er.getDefaults(), arguments, [
                        "value"
                    ]);
                    this._exponentScaler = this.input = this.output = new rr({
                        context: this.context,
                        mapping: this._expFunc(t1.value),
                        length: 8192
                    }), this._exponent = t1.value;
                }
                static getDefaults() {
                    return Object.assign(or.getDefaults(), {
                        value: 1
                    });
                }
                _expFunc(t1) {
                    return (e)=>Math.pow(Math.abs(e), t1);
                }
                get value() {
                    return this._exponent;
                }
                set value(t1) {
                    this._exponent = t1, this._exponentScaler.setMap(this._expFunc(this._exponent));
                }
                dispose() {
                    return super.dispose(), this._exponentScaler.dispose(), this;
                }
            }
            class Rr extends gr {
                constructor(){
                    super(Object.assign(Di(Rr.getDefaults(), arguments, [
                        "min",
                        "max",
                        "exponent"
                    ]))), this.name = "ScaleExp";
                    const t1 = Di(Rr.getDefaults(), arguments, [
                        "min",
                        "max",
                        "exponent"
                    ]);
                    this.input = this._exp = new Er({
                        context: this.context,
                        value: t1.exponent
                    }), this._exp.connect(this._mult);
                }
                static getDefaults() {
                    return Object.assign(gr.getDefaults(), {
                        exponent: 1
                    });
                }
                get exponent() {
                    return this._exp.value;
                }
                set exponent(t1) {
                    this._exp.value = t1;
                }
                dispose() {
                    return super.dispose(), this._exp.dispose(), this;
                }
            }
            class qr extends Do {
                constructor(){
                    super(Di(Do.getDefaults(), arguments, [
                        "value",
                        "units"
                    ])), this.name = "SyncedSignal", this.override = !1;
                    const t1 = Di(Do.getDefaults(), arguments, [
                        "value",
                        "units"
                    ]);
                    this._lastVal = t1.value, this._synced = this.context.transport.scheduleRepeat(this._onTick.bind(this), "1i"), this._syncedCallback = this._anchorValue.bind(this), this.context.transport.on("start", this._syncedCallback), this.context.transport.on("pause", this._syncedCallback), this.context.transport.on("stop", this._syncedCallback), this._constantSource.disconnect(), this._constantSource.stop(0), this._constantSource = this.output = new Ao({
                        context: this.context,
                        offset: t1.value,
                        units: t1.units
                    }).start(0), this.setValueAtTime(t1.value, 0);
                }
                _onTick(t1) {
                    const e = super.getValueAtTime(this.context.transport.seconds);
                    this._lastVal !== e && (this._lastVal = e, this._constantSource.offset.setValueAtTime(e, t1));
                }
                _anchorValue(t1) {
                    const e = super.getValueAtTime(this.context.transport.seconds);
                    this._lastVal = e, this._constantSource.offset.cancelAndHoldAtTime(t1), this._constantSource.offset.setValueAtTime(e, t1);
                }
                getValueAtTime(t1) {
                    const e = new mo(this.context, t1).toSeconds();
                    return super.getValueAtTime(e);
                }
                setValueAtTime(t1, e) {
                    const s1 = new mo(this.context, e).toSeconds();
                    return super.setValueAtTime(t1, s1), this;
                }
                linearRampToValueAtTime(t1, e) {
                    const s1 = new mo(this.context, e).toSeconds();
                    return super.linearRampToValueAtTime(t1, s1), this;
                }
                exponentialRampToValueAtTime(t1, e) {
                    const s1 = new mo(this.context, e).toSeconds();
                    return super.exponentialRampToValueAtTime(t1, s1), this;
                }
                setTargetAtTime(t1, e, s1) {
                    const n = new mo(this.context, e).toSeconds();
                    return super.setTargetAtTime(t1, n, s1), this;
                }
                cancelScheduledValues(t1) {
                    const e = new mo(this.context, t1).toSeconds();
                    return super.cancelScheduledValues(e), this;
                }
                setValueCurveAtTime(t1, e, s1, n) {
                    const i = new mo(this.context, e).toSeconds();
                    return s1 = this.toSeconds(s1), super.setValueCurveAtTime(t1, i, s1, n), this;
                }
                cancelAndHoldAtTime(t1) {
                    const e = new mo(this.context, t1).toSeconds();
                    return super.cancelAndHoldAtTime(e), this;
                }
                setRampPoint(t1) {
                    const e = new mo(this.context, t1).toSeconds();
                    return super.setRampPoint(e), this;
                }
                exponentialRampTo(t1, e, s1) {
                    const n = new mo(this.context, s1).toSeconds();
                    return super.exponentialRampTo(t1, e, n), this;
                }
                linearRampTo(t1, e, s1) {
                    const n = new mo(this.context, s1).toSeconds();
                    return super.linearRampTo(t1, e, n), this;
                }
                targetRampTo(t1, e, s1) {
                    const n = new mo(this.context, s1).toSeconds();
                    return super.targetRampTo(t1, e, n), this;
                }
                dispose() {
                    return super.dispose(), this.context.transport.clear(this._synced), this.context.transport.off("start", this._syncedCallback), this.context.transport.off("pause", this._syncedCallback), this.context.transport.off("stop", this._syncedCallback), this._constantSource.dispose(), this;
                }
            }
            class Fr extends wo {
                constructor(){
                    super(Di(Fr.getDefaults(), arguments, [
                        "attack",
                        "decay",
                        "sustain",
                        "release"
                    ])), this.name = "Envelope", this._sig = new Do({
                        context: this.context,
                        value: 0
                    }), this.output = this._sig, this.input = void 0;
                    const t1 = Di(Fr.getDefaults(), arguments, [
                        "attack",
                        "decay",
                        "sustain",
                        "release"
                    ]);
                    this.attack = t1.attack, this.decay = t1.decay, this.sustain = t1.sustain, this.release = t1.release, this.attackCurve = t1.attackCurve, this.releaseCurve = t1.releaseCurve, this.decayCurve = t1.decayCurve;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        attack: .01,
                        attackCurve: "linear",
                        decay: .1,
                        decayCurve: "exponential",
                        release: 1,
                        releaseCurve: "exponential",
                        sustain: .5
                    });
                }
                get value() {
                    return this.getValueAtTime(this.now());
                }
                _getCurve(t1, e) {
                    if (fi(t1)) return t1;
                    {
                        let s1;
                        for(s1 in Ir)if (Ir[s1][e] === t1) return s1;
                        return t1;
                    }
                }
                _setCurve(t1, e, s1) {
                    if (fi(s1) && Reflect.has(Ir, s1)) {
                        const n = Ir[s1];
                        li(n) ? "_decayCurve" !== t1 && (this[t1] = n[e]) : this[t1] = n;
                    } else {
                        if (!di(s1) || "_decayCurve" === t1) throw new Error("Envelope: invalid curve: " + s1);
                        this[t1] = s1;
                    }
                }
                get attackCurve() {
                    return this._getCurve(this._attackCurve, "In");
                }
                set attackCurve(t1) {
                    this._setCurve("_attackCurve", "In", t1);
                }
                get releaseCurve() {
                    return this._getCurve(this._releaseCurve, "Out");
                }
                set releaseCurve(t1) {
                    this._setCurve("_releaseCurve", "Out", t1);
                }
                get decayCurve() {
                    return this._decayCurve;
                }
                set decayCurve(t1) {
                    ti([
                        "linear",
                        "exponential"
                    ].some((e)=>e === t1), "Invalid envelope curve: " + t1), this._decayCurve = t1;
                }
                triggerAttack(t1, e = 1) {
                    this.log("triggerAttack", t1, e), t1 = this.toSeconds(t1);
                    let s1 = this.toSeconds(this.attack);
                    const n = this.toSeconds(this.decay), i = this.getValueAtTime(t1);
                    if (i > 0) s1 = (1 - i) / (1 / s1);
                    if (s1 < this.sampleTime) this._sig.cancelScheduledValues(t1), this._sig.setValueAtTime(e, t1);
                    else if ("linear" === this._attackCurve) this._sig.linearRampTo(e, s1, t1);
                    else if ("exponential" === this._attackCurve) this._sig.targetRampTo(e, s1, t1);
                    else {
                        this._sig.cancelAndHoldAtTime(t1);
                        let n = this._attackCurve;
                        for(let t1 = 1; t1 < n.length; t1++)if (n[t1 - 1] <= i && i <= n[t1]) {
                            n = this._attackCurve.slice(t1), n[0] = i;
                            break;
                        }
                        this._sig.setValueCurveAtTime(n, t1, s1, e);
                    }
                    if (n && this.sustain < 1) {
                        const i = e * this.sustain, o = t1 + s1;
                        this.log("decay", o), "linear" === this._decayCurve ? this._sig.linearRampToValueAtTime(i, n + o) : this._sig.exponentialApproachValueAtTime(i, o, n);
                    }
                    return this;
                }
                triggerRelease(t1) {
                    this.log("triggerRelease", t1), t1 = this.toSeconds(t1);
                    const e = this.getValueAtTime(t1);
                    if (e > 0) {
                        const s1 = this.toSeconds(this.release);
                        s1 < this.sampleTime ? this._sig.setValueAtTime(0, t1) : "linear" === this._releaseCurve ? this._sig.linearRampTo(0, s1, t1) : "exponential" === this._releaseCurve ? this._sig.targetRampTo(0, s1, t1) : (ti(di(this._releaseCurve), "releaseCurve must be either 'linear', 'exponential' or an array"), this._sig.cancelAndHoldAtTime(t1), this._sig.setValueCurveAtTime(this._releaseCurve, t1, s1, e));
                    }
                    return this;
                }
                getValueAtTime(t1) {
                    return this._sig.getValueAtTime(t1);
                }
                triggerAttackRelease(t1, e, s1 = 1) {
                    return e = this.toSeconds(e), this.triggerAttack(e, s1), this.triggerRelease(e + this.toSeconds(t1)), this;
                }
                cancel(t1) {
                    return this._sig.cancelScheduledValues(this.toSeconds(t1)), this;
                }
                connect(t1, e = 0, s1 = 0) {
                    return Oo(this, t1, e, s1), this;
                }
                asArray(t1 = 1024) {
                    return yi(this, void 0, void 0, function*() {
                        const e = t1 / this.context.sampleRate, s1 = new Yi(1, e, this.context.sampleRate), n = this.toSeconds(this.attack) + this.toSeconds(this.decay), i = n + this.toSeconds(this.release), o = .1 * i, r = i + o, a = new this.constructor(Object.assign(this.get(), {
                            attack: e * this.toSeconds(this.attack) / r,
                            decay: e * this.toSeconds(this.decay) / r,
                            release: e * this.toSeconds(this.release) / r,
                            context: s1
                        }));
                        a._sig.toDestination(), a.triggerAttackRelease(e * (n + o) / r, 0);
                        return (yield s1.render()).getChannelData(0);
                    });
                }
                dispose() {
                    return super.dispose(), this._sig.dispose(), this;
                }
            }
            vi([
                wr(0)
            ], Fr.prototype, "attack", void 0), vi([
                wr(0)
            ], Fr.prototype, "decay", void 0), vi([
                xr(0, 1)
            ], Fr.prototype, "sustain", void 0), vi([
                wr(0)
            ], Fr.prototype, "release", void 0);
            const Ir = (()=>{
                let t1, e;
                const s1 = [];
                for(t1 = 0; t1 < 128; t1++)s1[t1] = Math.sin(t1 / 127 * (Math.PI / 2));
                const n = [];
                for(t1 = 0; t1 < 127; t1++){
                    e = t1 / 127;
                    const s1 = Math.sin(e * (2 * Math.PI) * 6.4 - Math.PI / 2) + 1;
                    n[t1] = s1 / 10 + .83 * e;
                }
                n[127] = 1;
                const i = [];
                for(t1 = 0; t1 < 128; t1++)i[t1] = Math.ceil(t1 / 127 * 5) / 5;
                const o = [];
                for(t1 = 0; t1 < 128; t1++)e = t1 / 127, o[t1] = .5 * (1 - Math.cos(Math.PI * e));
                const r = [];
                for(t1 = 0; t1 < 128; t1++){
                    e = t1 / 127;
                    const s1 = 4 * Math.pow(e, 3) + .2, n = Math.cos(s1 * Math.PI * 2 * e);
                    r[t1] = Math.abs(n * (1 - e));
                }
                function a(t1) {
                    const e = new Array(t1.length);
                    for(let s1 = 0; s1 < t1.length; s1++)e[s1] = 1 - t1[s1];
                    return e;
                }
                var c;
                return {
                    bounce: {
                        In: a(r),
                        Out: r
                    },
                    cosine: {
                        In: s1,
                        Out: (c = s1, c.slice(0).reverse())
                    },
                    exponential: "exponential",
                    linear: "linear",
                    ripple: {
                        In: n,
                        Out: a(n)
                    },
                    sine: {
                        In: o,
                        Out: a(o)
                    },
                    step: {
                        In: i,
                        Out: a(i)
                    }
                };
            })();
            class Vr extends wo {
                constructor(){
                    super(Di(Vr.getDefaults(), arguments)), this._scheduledEvents = [], this._synced = !1, this._original_triggerAttack = this.triggerAttack, this._original_triggerRelease = this.triggerRelease;
                    const t1 = Di(Vr.getDefaults(), arguments);
                    this._volume = this.output = new Go({
                        context: this.context,
                        volume: t1.volume
                    }), this.volume = this._volume.volume, Ui(this, "volume");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        volume: 0
                    });
                }
                sync() {
                    return this._syncState() && (this._syncMethod("triggerAttack", 1), this._syncMethod("triggerRelease", 0)), this;
                }
                _syncState() {
                    let t1 = !1;
                    return this._synced || (this._synced = !0, t1 = !0), t1;
                }
                _syncMethod(t1, e) {
                    const s1 = this["_original_" + t1] = this[t1];
                    this[t1] = (...t1)=>{
                        const n = t1[e], i = this.context.transport.schedule((n)=>{
                            t1[e] = n, s1.apply(this, t1);
                        }, n);
                        this._scheduledEvents.push(i);
                    };
                }
                unsync() {
                    return this._scheduledEvents.forEach((t1)=>this.context.transport.clear(t1)), this._scheduledEvents = [], this._synced && (this._synced = !1, this.triggerAttack = this._original_triggerAttack, this.triggerRelease = this._original_triggerRelease), this;
                }
                triggerAttackRelease(t1, e, s1, n) {
                    const i = this.toSeconds(s1), o = this.toSeconds(e);
                    return this.triggerAttack(t1, i, n), this.triggerRelease(i + o), this;
                }
                dispose() {
                    return super.dispose(), this._volume.dispose(), this.unsync(), this._scheduledEvents = [], this;
                }
            }
            class Nr extends Vr {
                constructor(){
                    super(Di(Nr.getDefaults(), arguments));
                    const t1 = Di(Nr.getDefaults(), arguments);
                    this.portamento = t1.portamento, this.onsilence = t1.onsilence;
                }
                static getDefaults() {
                    return Object.assign(Vr.getDefaults(), {
                        detune: 0,
                        onsilence: Zi,
                        portamento: 0
                    });
                }
                triggerAttack(t1, e, s1 = 1) {
                    this.log("triggerAttack", t1, e, s1);
                    const n = this.toSeconds(e);
                    return this._triggerEnvelopeAttack(n, s1), this.setNote(t1, n), this;
                }
                triggerRelease(t1) {
                    this.log("triggerRelease", t1);
                    const e = this.toSeconds(t1);
                    return this._triggerEnvelopeRelease(e), this;
                }
                setNote(t1, e) {
                    const s1 = this.toSeconds(e), n = t1 instanceof lo ? t1.toFrequency() : t1;
                    if (this.portamento > 0 && this.getLevelAtTime(s1) > .05) {
                        const t1 = this.toSeconds(this.portamento);
                        this.frequency.exponentialRampTo(n, t1, s1);
                    } else this.frequency.setValueAtTime(n, s1);
                    return this;
                }
            }
            vi([
                wr(0)
            ], Nr.prototype, "portamento", void 0);
            class Pr extends Fr {
                constructor(){
                    super(Di(Pr.getDefaults(), arguments, [
                        "attack",
                        "decay",
                        "sustain",
                        "release"
                    ])), this.name = "AmplitudeEnvelope", this._gainNode = new ko({
                        context: this.context,
                        gain: 0
                    }), this.output = this._gainNode, this.input = this._gainNode, this._sig.connect(this._gainNode.gain), this.output = this._gainNode, this.input = this._gainNode;
                }
                dispose() {
                    return super.dispose(), this._gainNode.dispose(), this;
                }
            }
            class jr extends Nr {
                constructor(){
                    super(Di(jr.getDefaults(), arguments)), this.name = "Synth";
                    const t1 = Di(jr.getDefaults(), arguments);
                    this.oscillator = new _r(Object.assign({
                        context: this.context,
                        detune: t1.detune,
                        onstop: ()=>this.onsilence(this)
                    }, t1.oscillator)), this.frequency = this.oscillator.frequency, this.detune = this.oscillator.detune, this.envelope = new Pr(Object.assign({
                        context: this.context
                    }, t1.envelope)), this.oscillator.chain(this.envelope, this.output), Ui(this, [
                        "oscillator",
                        "frequency",
                        "detune",
                        "envelope"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Nr.getDefaults(), {
                        envelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .005,
                            decay: .1,
                            release: 1,
                            sustain: .3
                        }),
                        oscillator: Object.assign(Mi(_r.getDefaults(), [
                            ...Object.keys(Ho.getDefaults()),
                            "frequency",
                            "detune"
                        ]), {
                            type: "triangle"
                        })
                    });
                }
                _triggerEnvelopeAttack(t1, e) {
                    if (this.envelope.triggerAttack(t1, e), this.oscillator.start(t1), 0 === this.envelope.sustain) {
                        const e = this.toSeconds(this.envelope.attack), s1 = this.toSeconds(this.envelope.decay);
                        this.oscillator.stop(t1 + e + s1);
                    }
                }
                _triggerEnvelopeRelease(t1) {
                    this.envelope.triggerRelease(t1), this.oscillator.stop(t1 + this.toSeconds(this.envelope.release));
                }
                getLevelAtTime(t1) {
                    return t1 = this.toSeconds(t1), this.envelope.getValueAtTime(t1);
                }
                dispose() {
                    return super.dispose(), this.oscillator.dispose(), this.envelope.dispose(), this;
                }
            }
            class Lr extends Nr {
                constructor(){
                    super(Di(Lr.getDefaults(), arguments)), this.name = "ModulationSynth";
                    const t1 = Di(Lr.getDefaults(), arguments);
                    this._carrier = new jr({
                        context: this.context,
                        oscillator: t1.oscillator,
                        envelope: t1.envelope,
                        onsilence: ()=>this.onsilence(this),
                        volume: -10
                    }), this._modulator = new jr({
                        context: this.context,
                        oscillator: t1.modulation,
                        envelope: t1.modulationEnvelope,
                        volume: -10
                    }), this.oscillator = this._carrier.oscillator, this.envelope = this._carrier.envelope, this.modulation = this._modulator.oscillator, this.modulationEnvelope = this._modulator.envelope, this.frequency = new Do({
                        context: this.context,
                        units: "frequency"
                    }), this.detune = new Do({
                        context: this.context,
                        value: t1.detune,
                        units: "cents"
                    }), this.harmonicity = new cr({
                        context: this.context,
                        value: t1.harmonicity,
                        minValue: 0
                    }), this._modulationNode = new ko({
                        context: this.context,
                        gain: 0
                    }), Ui(this, [
                        "frequency",
                        "harmonicity",
                        "oscillator",
                        "envelope",
                        "modulation",
                        "modulationEnvelope",
                        "detune"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Nr.getDefaults(), {
                        harmonicity: 3,
                        oscillator: Object.assign(Mi(_r.getDefaults(), [
                            ...Object.keys(Ho.getDefaults()),
                            "frequency",
                            "detune"
                        ]), {
                            type: "sine"
                        }),
                        envelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .01,
                            decay: .01,
                            sustain: 1,
                            release: .5
                        }),
                        modulation: Object.assign(Mi(_r.getDefaults(), [
                            ...Object.keys(Ho.getDefaults()),
                            "frequency",
                            "detune"
                        ]), {
                            type: "square"
                        }),
                        modulationEnvelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .5,
                            decay: 0,
                            sustain: 1,
                            release: .5
                        })
                    });
                }
                _triggerEnvelopeAttack(t1, e) {
                    this._carrier._triggerEnvelopeAttack(t1, e), this._modulator._triggerEnvelopeAttack(t1, e);
                }
                _triggerEnvelopeRelease(t1) {
                    return this._carrier._triggerEnvelopeRelease(t1), this._modulator._triggerEnvelopeRelease(t1), this;
                }
                getLevelAtTime(t1) {
                    return t1 = this.toSeconds(t1), this.envelope.getValueAtTime(t1);
                }
                dispose() {
                    return super.dispose(), this._carrier.dispose(), this._modulator.dispose(), this.frequency.dispose(), this.detune.dispose(), this.harmonicity.dispose(), this._modulationNode.dispose(), this;
                }
            }
            class zr extends Lr {
                constructor(){
                    super(Di(zr.getDefaults(), arguments)), this.name = "AMSynth", this._modulationScale = new ar({
                        context: this.context
                    }), this.frequency.connect(this._carrier.frequency), this.frequency.chain(this.harmonicity, this._modulator.frequency), this.detune.fan(this._carrier.detune, this._modulator.detune), this._modulator.chain(this._modulationScale, this._modulationNode.gain), this._carrier.chain(this._modulationNode, this.output);
                }
                dispose() {
                    return super.dispose(), this._modulationScale.dispose(), this;
                }
            }
            class Br extends wo {
                constructor(){
                    super(Di(Br.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ])), this.name = "BiquadFilter";
                    const t1 = Di(Br.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ]);
                    this._filter = this.context.createBiquadFilter(), this.input = this.output = this._filter, this.Q = new xo({
                        context: this.context,
                        units: "number",
                        value: t1.Q,
                        param: this._filter.Q
                    }), this.frequency = new xo({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency,
                        param: this._filter.frequency
                    }), this.detune = new xo({
                        context: this.context,
                        units: "cents",
                        value: t1.detune,
                        param: this._filter.detune
                    }), this.gain = new xo({
                        context: this.context,
                        units: "decibels",
                        convert: !1,
                        value: t1.gain,
                        param: this._filter.gain
                    }), this.type = t1.type;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        Q: 1,
                        type: "lowpass",
                        frequency: 350,
                        detune: 0,
                        gain: 0
                    });
                }
                get type() {
                    return this._filter.type;
                }
                set type(t1) {
                    ti(-1 !== [
                        "lowpass",
                        "highpass",
                        "bandpass",
                        "lowshelf",
                        "highshelf",
                        "notch",
                        "allpass",
                        "peaking"
                    ].indexOf(t1), "Invalid filter type: " + t1), this._filter.type = t1;
                }
                getFrequencyResponse(t1 = 128) {
                    const e = new Float32Array(t1);
                    for(let s1 = 0; s1 < t1; s1++){
                        const n = 19980 * Math.pow(s1 / t1, 2) + 20;
                        e[s1] = n;
                    }
                    const s1 = new Float32Array(t1), n = new Float32Array(t1), i = this.context.createBiquadFilter();
                    return i.type = this.type, i.Q.value = this.Q.value, i.frequency.value = this.frequency.value, i.gain.value = this.gain.value, i.getFrequencyResponse(e, s1, n), s1;
                }
                dispose() {
                    return super.dispose(), this._filter.disconnect(), this.Q.dispose(), this.frequency.dispose(), this.gain.dispose(), this.detune.dispose(), this;
                }
            }
            class Wr extends wo {
                constructor(){
                    super(Di(Wr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "rolloff"
                    ])), this.name = "Filter", this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this._filters = [];
                    const t1 = Di(Wr.getDefaults(), arguments, [
                        "frequency",
                        "type",
                        "rolloff"
                    ]);
                    this._filters = [], this.Q = new Do({
                        context: this.context,
                        units: "positive",
                        value: t1.Q
                    }), this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency
                    }), this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), this.gain = new Do({
                        context: this.context,
                        units: "decibels",
                        convert: !1,
                        value: t1.gain
                    }), this._type = t1.type, this.rolloff = t1.rolloff, Ui(this, [
                        "detune",
                        "frequency",
                        "gain",
                        "Q"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        Q: 1,
                        detune: 0,
                        frequency: 350,
                        gain: 0,
                        rolloff: -12,
                        type: "lowpass"
                    });
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    ti(-1 !== [
                        "lowpass",
                        "highpass",
                        "bandpass",
                        "lowshelf",
                        "highshelf",
                        "notch",
                        "allpass",
                        "peaking"
                    ].indexOf(t1), "Invalid filter type: " + t1), this._type = t1, this._filters.forEach((e)=>e.type = t1);
                }
                get rolloff() {
                    return this._rolloff;
                }
                set rolloff(t1) {
                    const e = ui(t1) ? t1 : parseInt(t1, 10), s1 = [
                        -12,
                        -24,
                        -48,
                        -96
                    ];
                    let n = s1.indexOf(e);
                    ti(-1 !== n, "rolloff can only be " + s1.join(", ")), n += 1, this._rolloff = e, this.input.disconnect(), this._filters.forEach((t1)=>t1.disconnect()), this._filters = new Array(n);
                    for(let t1 = 0; t1 < n; t1++){
                        const e = new Br({
                            context: this.context
                        });
                        e.type = this._type, this.frequency.connect(e.frequency), this.detune.connect(e.detune), this.Q.connect(e.Q), this.gain.connect(e.gain), this._filters[t1] = e;
                    }
                    this._internalChannels = this._filters, bo(this.input, ...this._internalChannels, this.output);
                }
                getFrequencyResponse(t1 = 128) {
                    const e = new Br({
                        frequency: this.frequency.value,
                        gain: this.gain.value,
                        Q: this.Q.value,
                        type: this._type,
                        detune: this.detune.value
                    }), s1 = new Float32Array(t1).map(()=>1);
                    return this._filters.forEach(()=>{
                        e.getFrequencyResponse(t1).forEach((t1, e)=>s1[e] *= t1);
                    }), e.dispose(), s1;
                }
                dispose() {
                    return super.dispose(), this._filters.forEach((t1)=>{
                        t1.dispose();
                    }), Qi(this, [
                        "detune",
                        "frequency",
                        "gain",
                        "Q"
                    ]), this.frequency.dispose(), this.Q.dispose(), this.detune.dispose(), this.gain.dispose(), this;
                }
            }
            class Gr extends Fr {
                constructor(){
                    super(Di(Gr.getDefaults(), arguments, [
                        "attack",
                        "decay",
                        "sustain",
                        "release"
                    ])), this.name = "FrequencyEnvelope";
                    const t1 = Di(Gr.getDefaults(), arguments, [
                        "attack",
                        "decay",
                        "sustain",
                        "release"
                    ]);
                    this._octaves = t1.octaves, this._baseFrequency = this.toFrequency(t1.baseFrequency), this._exponent = this.input = new Er({
                        context: this.context,
                        value: t1.exponent
                    }), this._scale = this.output = new gr({
                        context: this.context,
                        min: this._baseFrequency,
                        max: this._baseFrequency * Math.pow(2, this._octaves)
                    }), this._sig.chain(this._exponent, this._scale);
                }
                static getDefaults() {
                    return Object.assign(Fr.getDefaults(), {
                        baseFrequency: 200,
                        exponent: 1,
                        octaves: 4
                    });
                }
                get baseFrequency() {
                    return this._baseFrequency;
                }
                set baseFrequency(t1) {
                    const e = this.toFrequency(t1);
                    ei(e, 0), this._baseFrequency = e, this._scale.min = this._baseFrequency, this.octaves = this._octaves;
                }
                get octaves() {
                    return this._octaves;
                }
                set octaves(t1) {
                    this._octaves = t1, this._scale.max = this._baseFrequency * Math.pow(2, t1);
                }
                get exponent() {
                    return this._exponent.value;
                }
                set exponent(t1) {
                    this._exponent.value = t1;
                }
                dispose() {
                    return super.dispose(), this._exponent.dispose(), this._scale.dispose(), this;
                }
            }
            class Ur extends Nr {
                constructor(){
                    super(Di(Ur.getDefaults(), arguments)), this.name = "MonoSynth";
                    const t1 = Di(Ur.getDefaults(), arguments);
                    this.oscillator = new _r(Object.assign(t1.oscillator, {
                        context: this.context,
                        detune: t1.detune,
                        onstop: ()=>this.onsilence(this)
                    })), this.frequency = this.oscillator.frequency, this.detune = this.oscillator.detune, this.filter = new Wr(Object.assign(t1.filter, {
                        context: this.context
                    })), this.filterEnvelope = new Gr(Object.assign(t1.filterEnvelope, {
                        context: this.context
                    })), this.envelope = new Pr(Object.assign(t1.envelope, {
                        context: this.context
                    })), this.oscillator.chain(this.filter, this.envelope, this.output), this.filterEnvelope.connect(this.filter.frequency), Ui(this, [
                        "oscillator",
                        "frequency",
                        "detune",
                        "filter",
                        "filterEnvelope",
                        "envelope"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Nr.getDefaults(), {
                        envelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .005,
                            decay: .1,
                            release: 1,
                            sustain: .9
                        }),
                        filter: Object.assign(Mi(Wr.getDefaults(), Object.keys(wo.getDefaults())), {
                            Q: 1,
                            rolloff: -12,
                            type: "lowpass"
                        }),
                        filterEnvelope: Object.assign(Mi(Gr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .6,
                            baseFrequency: 200,
                            decay: .2,
                            exponent: 2,
                            octaves: 3,
                            release: 2,
                            sustain: .5
                        }),
                        oscillator: Object.assign(Mi(_r.getDefaults(), Object.keys(Ho.getDefaults())), {
                            type: "sawtooth"
                        })
                    });
                }
                _triggerEnvelopeAttack(t1, e = 1) {
                    if (this.envelope.triggerAttack(t1, e), this.filterEnvelope.triggerAttack(t1), this.oscillator.start(t1), 0 === this.envelope.sustain) {
                        const e = this.toSeconds(this.envelope.attack), s1 = this.toSeconds(this.envelope.decay);
                        this.oscillator.stop(t1 + e + s1);
                    }
                }
                _triggerEnvelopeRelease(t1) {
                    this.envelope.triggerRelease(t1), this.filterEnvelope.triggerRelease(t1), this.oscillator.stop(t1 + this.toSeconds(this.envelope.release));
                }
                getLevelAtTime(t1) {
                    return t1 = this.toSeconds(t1), this.envelope.getValueAtTime(t1);
                }
                dispose() {
                    return super.dispose(), this.oscillator.dispose(), this.envelope.dispose(), this.filterEnvelope.dispose(), this.filter.dispose(), this;
                }
            }
            class Qr extends Nr {
                constructor(){
                    super(Di(Qr.getDefaults(), arguments)), this.name = "DuoSynth";
                    const t1 = Di(Qr.getDefaults(), arguments);
                    this.voice0 = new Ur(Object.assign(t1.voice0, {
                        context: this.context,
                        onsilence: ()=>this.onsilence(this)
                    })), this.voice1 = new Ur(Object.assign(t1.voice1, {
                        context: this.context
                    })), this.harmonicity = new cr({
                        context: this.context,
                        units: "positive",
                        value: t1.harmonicity
                    }), this._vibrato = new yr({
                        frequency: t1.vibratoRate,
                        context: this.context,
                        min: -50,
                        max: 50
                    }), this._vibrato.start(), this.vibratoRate = this._vibrato.frequency, this._vibratoGain = new ko({
                        context: this.context,
                        units: "normalRange",
                        gain: t1.vibratoAmount
                    }), this.vibratoAmount = this._vibratoGain.gain, this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: 440
                    }), this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), this.frequency.connect(this.voice0.frequency), this.frequency.chain(this.harmonicity, this.voice1.frequency), this._vibrato.connect(this._vibratoGain), this._vibratoGain.fan(this.voice0.detune, this.voice1.detune), this.detune.fan(this.voice0.detune, this.voice1.detune), this.voice0.connect(this.output), this.voice1.connect(this.output), Ui(this, [
                        "voice0",
                        "voice1",
                        "frequency",
                        "vibratoAmount",
                        "vibratoRate"
                    ]);
                }
                getLevelAtTime(t1) {
                    return t1 = this.toSeconds(t1), this.voice0.envelope.getValueAtTime(t1) + this.voice1.envelope.getValueAtTime(t1);
                }
                static getDefaults() {
                    return Ai(Nr.getDefaults(), {
                        vibratoAmount: .5,
                        vibratoRate: 5,
                        harmonicity: 1.5,
                        voice0: Ai(Mi(Ur.getDefaults(), Object.keys(Nr.getDefaults())), {
                            filterEnvelope: {
                                attack: .01,
                                decay: 0,
                                sustain: 1,
                                release: .5
                            },
                            envelope: {
                                attack: .01,
                                decay: 0,
                                sustain: 1,
                                release: .5
                            }
                        }),
                        voice1: Ai(Mi(Ur.getDefaults(), Object.keys(Nr.getDefaults())), {
                            filterEnvelope: {
                                attack: .01,
                                decay: 0,
                                sustain: 1,
                                release: .5
                            },
                            envelope: {
                                attack: .01,
                                decay: 0,
                                sustain: 1,
                                release: .5
                            }
                        })
                    });
                }
                _triggerEnvelopeAttack(t1, e) {
                    this.voice0._triggerEnvelopeAttack(t1, e), this.voice1._triggerEnvelopeAttack(t1, e);
                }
                _triggerEnvelopeRelease(t1) {
                    return this.voice0._triggerEnvelopeRelease(t1), this.voice1._triggerEnvelopeRelease(t1), this;
                }
                dispose() {
                    return super.dispose(), this.voice0.dispose(), this.voice1.dispose(), this.frequency.dispose(), this.detune.dispose(), this._vibrato.dispose(), this.vibratoRate.dispose(), this._vibratoGain.dispose(), this.harmonicity.dispose(), this;
                }
            }
            class Zr extends Lr {
                constructor(){
                    super(Di(Zr.getDefaults(), arguments)), this.name = "FMSynth";
                    const t1 = Di(Zr.getDefaults(), arguments);
                    this.modulationIndex = new cr({
                        context: this.context,
                        value: t1.modulationIndex
                    }), this.frequency.connect(this._carrier.frequency), this.frequency.chain(this.harmonicity, this._modulator.frequency), this.frequency.chain(this.modulationIndex, this._modulationNode), this.detune.fan(this._carrier.detune, this._modulator.detune), this._modulator.connect(this._modulationNode.gain), this._modulationNode.connect(this._carrier.frequency), this._carrier.connect(this.output);
                }
                static getDefaults() {
                    return Object.assign(Lr.getDefaults(), {
                        modulationIndex: 10
                    });
                }
                dispose() {
                    return super.dispose(), this.modulationIndex.dispose(), this;
                }
            }
            const Xr = [
                1,
                1.483,
                1.932,
                2.546,
                2.63,
                3.897
            ];
            class Yr extends Nr {
                constructor(){
                    super(Di(Yr.getDefaults(), arguments)), this.name = "MetalSynth", this._oscillators = [], this._freqMultipliers = [];
                    const t1 = Di(Yr.getDefaults(), arguments);
                    this.detune = new Do({
                        context: this.context,
                        units: "cents",
                        value: t1.detune
                    }), this.frequency = new Do({
                        context: this.context,
                        units: "frequency"
                    }), this._amplitude = new ko({
                        context: this.context,
                        gain: 0
                    }).connect(this.output), this._highpass = new Wr({
                        Q: 0,
                        context: this.context,
                        type: "highpass"
                    }).connect(this._amplitude);
                    for(let e = 0; e < Xr.length; e++){
                        const s1 = new ur({
                            context: this.context,
                            harmonicity: t1.harmonicity,
                            modulationIndex: t1.modulationIndex,
                            modulationType: "square",
                            onstop: 0 === e ? ()=>this.onsilence(this) : Zi,
                            type: "square"
                        });
                        s1.connect(this._highpass), this._oscillators[e] = s1;
                        const n = new cr({
                            context: this.context,
                            value: Xr[e]
                        });
                        this._freqMultipliers[e] = n, this.frequency.chain(n, s1.frequency), this.detune.connect(s1.detune);
                    }
                    this._filterFreqScaler = new gr({
                        context: this.context,
                        max: 7e3,
                        min: this.toFrequency(t1.resonance)
                    }), this.envelope = new Fr({
                        attack: t1.envelope.attack,
                        attackCurve: "linear",
                        context: this.context,
                        decay: t1.envelope.decay,
                        release: t1.envelope.release,
                        sustain: 0
                    }), this.envelope.chain(this._filterFreqScaler, this._highpass.frequency), this.envelope.connect(this._amplitude.gain), this._octaves = t1.octaves, this.octaves = t1.octaves;
                }
                static getDefaults() {
                    return Ai(Nr.getDefaults(), {
                        envelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            attack: .001,
                            decay: 1.4,
                            release: .2
                        }),
                        harmonicity: 5.1,
                        modulationIndex: 32,
                        octaves: 1.5,
                        resonance: 4e3
                    });
                }
                _triggerEnvelopeAttack(t1, e = 1) {
                    return this.envelope.triggerAttack(t1, e), this._oscillators.forEach((e)=>e.start(t1)), 0 === this.envelope.sustain && this._oscillators.forEach((e)=>{
                        e.stop(t1 + this.toSeconds(this.envelope.attack) + this.toSeconds(this.envelope.decay));
                    }), this;
                }
                _triggerEnvelopeRelease(t1) {
                    return this.envelope.triggerRelease(t1), this._oscillators.forEach((e)=>e.stop(t1 + this.toSeconds(this.envelope.release))), this;
                }
                getLevelAtTime(t1) {
                    return t1 = this.toSeconds(t1), this.envelope.getValueAtTime(t1);
                }
                get modulationIndex() {
                    return this._oscillators[0].modulationIndex.value;
                }
                set modulationIndex(t1) {
                    this._oscillators.forEach((e)=>e.modulationIndex.value = t1);
                }
                get harmonicity() {
                    return this._oscillators[0].harmonicity.value;
                }
                set harmonicity(t1) {
                    this._oscillators.forEach((e)=>e.harmonicity.value = t1);
                }
                get resonance() {
                    return this._filterFreqScaler.min;
                }
                set resonance(t1) {
                    this._filterFreqScaler.min = this.toFrequency(t1), this.octaves = this._octaves;
                }
                get octaves() {
                    return this._octaves;
                }
                set octaves(t1) {
                    this._octaves = t1, this._filterFreqScaler.max = this._filterFreqScaler.min * Math.pow(2, t1);
                }
                dispose() {
                    return super.dispose(), this._oscillators.forEach((t1)=>t1.dispose()), this._freqMultipliers.forEach((t1)=>t1.dispose()), this.frequency.dispose(), this.detune.dispose(), this._filterFreqScaler.dispose(), this._amplitude.dispose(), this.envelope.dispose(), this._highpass.dispose(), this;
                }
            }
            class Hr extends jr {
                constructor(){
                    super(Di(Hr.getDefaults(), arguments)), this.name = "MembraneSynth", this.portamento = 0;
                    const t1 = Di(Hr.getDefaults(), arguments);
                    this.pitchDecay = t1.pitchDecay, this.octaves = t1.octaves, Ui(this, [
                        "oscillator",
                        "envelope"
                    ]);
                }
                static getDefaults() {
                    return Ai(Nr.getDefaults(), jr.getDefaults(), {
                        envelope: {
                            attack: .001,
                            attackCurve: "exponential",
                            decay: .4,
                            release: 1.4,
                            sustain: .01
                        },
                        octaves: 10,
                        oscillator: {
                            type: "sine"
                        },
                        pitchDecay: .05
                    });
                }
                setNote(t1, e) {
                    const s1 = this.toSeconds(e), n = this.toFrequency(t1 instanceof lo ? t1.toFrequency() : t1), i = n * this.octaves;
                    return this.oscillator.frequency.setValueAtTime(i, s1), this.oscillator.frequency.exponentialRampToValueAtTime(n, s1 + this.toSeconds(this.pitchDecay)), this;
                }
                dispose() {
                    return super.dispose(), this;
                }
            }
            vi([
                xr(0)
            ], Hr.prototype, "octaves", void 0), vi([
                wr(0)
            ], Hr.prototype, "pitchDecay", void 0);
            class $r extends Vr {
                constructor(){
                    super(Di($r.getDefaults(), arguments)), this.name = "NoiseSynth";
                    const t1 = Di($r.getDefaults(), arguments);
                    this.noise = new Jo(Object.assign({
                        context: this.context
                    }, t1.noise)), this.envelope = new Pr(Object.assign({
                        context: this.context
                    }, t1.envelope)), this.noise.chain(this.envelope, this.output);
                }
                static getDefaults() {
                    return Object.assign(Vr.getDefaults(), {
                        envelope: Object.assign(Mi(Fr.getDefaults(), Object.keys(wo.getDefaults())), {
                            decay: .1,
                            sustain: 0
                        }),
                        noise: Object.assign(Mi(Jo.getDefaults(), Object.keys(Ho.getDefaults())), {
                            type: "white"
                        })
                    });
                }
                triggerAttack(t1, e = 1) {
                    return t1 = this.toSeconds(t1), this.envelope.triggerAttack(t1, e), this.noise.start(t1), 0 === this.envelope.sustain && this.noise.stop(t1 + this.toSeconds(this.envelope.attack) + this.toSeconds(this.envelope.decay)), this;
                }
                triggerRelease(t1) {
                    return t1 = this.toSeconds(t1), this.envelope.triggerRelease(t1), this.noise.stop(t1 + this.toSeconds(this.envelope.release)), this;
                }
                sync() {
                    return this._syncState() && (this._syncMethod("triggerAttack", 0), this._syncMethod("triggerRelease", 0)), this;
                }
                triggerAttackRelease(t1, e, s1 = 1) {
                    return e = this.toSeconds(e), t1 = this.toSeconds(t1), this.triggerAttack(e, s1), this.triggerRelease(e + t1), this;
                }
                dispose() {
                    return super.dispose(), this.noise.dispose(), this.envelope.dispose(), this;
                }
            }
            const Jr = new Set;
            function Kr(t1) {
                Jr.add(t1);
            }
            function ta(t1, e) {
                const s1 = `registerProcessor("${t1}", ${e})`;
                Jr.add(s1);
            }
            class ea extends wo {
                constructor(t1){
                    super(t1), this.name = "ToneAudioWorklet", this.workletOptions = {}, this.onprocessorerror = Zi;
                    const e = URL.createObjectURL(new Blob([
                        Array.from(Jr).join("\n")
                    ], {
                        type: "text/javascript"
                    })), s1 = this._audioWorkletName();
                    this._dummyGain = this.context.createGain(), this._dummyParam = this._dummyGain.gain, this.context.addAudioWorkletModule(e, s1).then(()=>{
                        this.disposed || (this._worklet = this.context.createAudioWorkletNode(s1, this.workletOptions), this._worklet.onprocessorerror = this.onprocessorerror.bind(this), this.onReady(this._worklet));
                    });
                }
                dispose() {
                    return super.dispose(), this._dummyGain.disconnect(), this._worklet && (this._worklet.port.postMessage("dispose"), this._worklet.disconnect()), this;
                }
            }
            Kr('\n	/**\n	 * The base AudioWorkletProcessor for use in Tone.js. Works with the [[ToneAudioWorklet]]. \n	 */\n	class ToneAudioWorkletProcessor extends AudioWorkletProcessor {\n\n		constructor(options) {\n			\n			super(options);\n			/**\n			 * If the processor was disposed or not. Keep alive until it\'s disposed.\n			 */\n			this.disposed = false;\n		   	/** \n			 * The number of samples in the processing block\n			 */\n			this.blockSize = 128;\n			/**\n			 * the sample rate\n			 */\n			this.sampleRate = sampleRate;\n\n			this.port.onmessage = (event) => {\n				// when it receives a dispose \n				if (event.data === "dispose") {\n					this.disposed = true;\n				}\n			};\n		}\n	}\n');
            Kr("\n	/**\n	 * Abstract class for a single input/output processor. \n	 * has a 'generate' function which processes one sample at a time\n	 */\n	class SingleIOProcessor extends ToneAudioWorkletProcessor {\n\n		constructor(options) {\n			super(Object.assign(options, {\n				numberOfInputs: 1,\n				numberOfOutputs: 1\n			}));\n			/**\n			 * Holds the name of the parameter and a single value of that\n			 * parameter at the current sample\n			 * @type { [name: string]: number }\n			 */\n			this.params = {}\n		}\n\n		/**\n		 * Generate an output sample from the input sample and parameters\n		 * @abstract\n		 * @param input number\n		 * @param channel number\n		 * @param parameters { [name: string]: number }\n		 * @returns number\n		 */\n		generate(){}\n\n		/**\n		 * Update the private params object with the \n		 * values of the parameters at the given index\n		 * @param parameters { [name: string]: Float32Array },\n		 * @param index number\n		 */\n		updateParams(parameters, index) {\n			for (const paramName in parameters) {\n				const param = parameters[paramName];\n				if (param.length > 1) {\n					this.params[paramName] = parameters[paramName][index];\n				} else {\n					this.params[paramName] = parameters[paramName][0];\n				}\n			}\n		}\n\n		/**\n		 * Process a single frame of the audio\n		 * @param inputs Float32Array[][]\n		 * @param outputs Float32Array[][]\n		 */\n		process(inputs, outputs, parameters) {\n			const input = inputs[0];\n			const output = outputs[0];\n			// get the parameter values\n			const channelCount = Math.max(input && input.length || 0, output.length);\n			for (let sample = 0; sample < this.blockSize; sample++) {\n				this.updateParams(parameters, sample);\n				for (let channel = 0; channel < channelCount; channel++) {\n					const inputSample = input && input.length ? input[channel][sample] : 0;\n					output[channel][sample] = this.generate(inputSample, channel, this.params);\n				}\n			}\n			return !this.disposed;\n		}\n	};\n");
            Kr("\n	/**\n	 * A multichannel buffer for use within an AudioWorkletProcessor as a delay line\n	 */\n	class DelayLine {\n		\n		constructor(size, channels) {\n			this.buffer = [];\n			this.writeHead = []\n			this.size = size;\n\n			// create the empty channels\n			for (let i = 0; i < channels; i++) {\n				this.buffer[i] = new Float32Array(this.size);\n				this.writeHead[i] = 0;\n			}\n		}\n\n		/**\n		 * Push a value onto the end\n		 * @param channel number\n		 * @param value number\n		 */\n		push(channel, value) {\n			this.writeHead[channel] += 1;\n			if (this.writeHead[channel] > this.size) {\n				this.writeHead[channel] = 0;\n			}\n			this.buffer[channel][this.writeHead[channel]] = value;\n		}\n\n		/**\n		 * Get the recorded value of the channel given the delay\n		 * @param channel number\n		 * @param delay number delay samples\n		 */\n		get(channel, delay) {\n			let readHead = this.writeHead[channel] - Math.floor(delay);\n			if (readHead < 0) {\n				readHead += this.size;\n			}\n			return this.buffer[channel][readHead];\n		}\n	}\n");
            ta("feedback-comb-filter", '\n	class FeedbackCombFilterWorklet extends SingleIOProcessor {\n\n		constructor(options) {\n			super(options);\n			this.delayLine = new DelayLine(this.sampleRate, options.channelCount || 2);\n		}\n\n		static get parameterDescriptors() {\n			return [{\n				name: "delayTime",\n				defaultValue: 0.1,\n				minValue: 0,\n				maxValue: 1,\n				automationRate: "k-rate"\n			}, {\n				name: "feedback",\n				defaultValue: 0.5,\n				minValue: 0,\n				maxValue: 0.9999,\n				automationRate: "k-rate"\n			}];\n		}\n\n		generate(input, channel, parameters) {\n			const delayedSample = this.delayLine.get(channel, parameters.delayTime * this.sampleRate);\n			this.delayLine.push(channel, input + delayedSample * parameters.feedback);\n			return delayedSample;\n		}\n	}\n');
            class sa extends ea {
                constructor(){
                    super(Di(sa.getDefaults(), arguments, [
                        "delayTime",
                        "resonance"
                    ])), this.name = "FeedbackCombFilter";
                    const t1 = Di(sa.getDefaults(), arguments, [
                        "delayTime",
                        "resonance"
                    ]);
                    this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this.delayTime = new xo({
                        context: this.context,
                        value: t1.delayTime,
                        units: "time",
                        minValue: 0,
                        maxValue: 1,
                        param: this._dummyParam,
                        swappable: !0
                    }), this.resonance = new xo({
                        context: this.context,
                        value: t1.resonance,
                        units: "normalRange",
                        param: this._dummyParam,
                        swappable: !0
                    }), Ui(this, [
                        "resonance",
                        "delayTime"
                    ]);
                }
                _audioWorkletName() {
                    return "feedback-comb-filter";
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        delayTime: .1,
                        resonance: .5
                    });
                }
                onReady(t1) {
                    bo(this.input, t1, this.output);
                    const e = t1.parameters.get("delayTime");
                    this.delayTime.setParam(e);
                    const s1 = t1.parameters.get("feedback");
                    this.resonance.setParam(s1);
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this.output.dispose(), this.delayTime.dispose(), this.resonance.dispose(), this;
                }
            }
            class na extends wo {
                constructor(){
                    super(Di(na.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ])), this.name = "OnePoleFilter";
                    const t1 = Di(na.getDefaults(), arguments, [
                        "frequency",
                        "type"
                    ]);
                    this._frequency = t1.frequency, this._type = t1.type, this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this._createFilter();
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        frequency: 880,
                        type: "lowpass"
                    });
                }
                _createFilter() {
                    const t1 = this._filter, e = this.toFrequency(this._frequency), s1 = 1 / (2 * Math.PI * e);
                    if ("lowpass" === this._type) {
                        const t1 = 1 / (s1 * this.context.sampleRate), e = t1 - 1;
                        this._filter = this.context.createIIRFilter([
                            t1,
                            0
                        ], [
                            1,
                            e
                        ]);
                    } else {
                        const t1 = 1 / (s1 * this.context.sampleRate) - 1;
                        this._filter = this.context.createIIRFilter([
                            1,
                            -1
                        ], [
                            1,
                            t1
                        ]);
                    }
                    this.input.chain(this._filter, this.output), t1 && this.context.setTimeout(()=>{
                        this.disposed || (this.input.disconnect(t1), t1.disconnect());
                    }, this.blockTime);
                }
                get frequency() {
                    return this._frequency;
                }
                set frequency(t1) {
                    this._frequency = t1, this._createFilter();
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    this._type = t1, this._createFilter();
                }
                getFrequencyResponse(t1 = 128) {
                    const e = new Float32Array(t1);
                    for(let s1 = 0; s1 < t1; s1++){
                        const n = 19980 * Math.pow(s1 / t1, 2) + 20;
                        e[s1] = n;
                    }
                    const s1 = new Float32Array(t1), n = new Float32Array(t1);
                    return this._filter.getFrequencyResponse(e, s1, n), s1;
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this.output.dispose(), this._filter.disconnect(), this;
                }
            }
            class ia extends wo {
                constructor(){
                    super(Di(ia.getDefaults(), arguments, [
                        "delayTime",
                        "resonance",
                        "dampening"
                    ])), this.name = "LowpassCombFilter";
                    const t1 = Di(ia.getDefaults(), arguments, [
                        "delayTime",
                        "resonance",
                        "dampening"
                    ]);
                    this._combFilter = this.output = new sa({
                        context: this.context,
                        delayTime: t1.delayTime,
                        resonance: t1.resonance
                    }), this.delayTime = this._combFilter.delayTime, this.resonance = this._combFilter.resonance, this._lowpass = this.input = new na({
                        context: this.context,
                        frequency: t1.dampening,
                        type: "lowpass"
                    }), this._lowpass.connect(this._combFilter);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        dampening: 3e3,
                        delayTime: .1,
                        resonance: .5
                    });
                }
                get dampening() {
                    return this._lowpass.frequency;
                }
                set dampening(t1) {
                    this._lowpass.frequency = t1;
                }
                dispose() {
                    return super.dispose(), this._combFilter.dispose(), this._lowpass.dispose(), this;
                }
            }
            class oa extends Vr {
                constructor(){
                    super(Di(oa.getDefaults(), arguments)), this.name = "PluckSynth";
                    const t1 = Di(oa.getDefaults(), arguments);
                    this._noise = new Jo({
                        context: this.context,
                        type: "pink"
                    }), this.attackNoise = t1.attackNoise, this._lfcf = new ia({
                        context: this.context,
                        dampening: t1.dampening,
                        resonance: t1.resonance
                    }), this.resonance = t1.resonance, this.release = t1.release, this._noise.connect(this._lfcf), this._lfcf.connect(this.output);
                }
                static getDefaults() {
                    return Ai(Vr.getDefaults(), {
                        attackNoise: 1,
                        dampening: 4e3,
                        resonance: .7,
                        release: 1
                    });
                }
                get dampening() {
                    return this._lfcf.dampening;
                }
                set dampening(t1) {
                    this._lfcf.dampening = t1;
                }
                triggerAttack(t1, e) {
                    const s1 = this.toFrequency(t1);
                    e = this.toSeconds(e);
                    const n = 1 / s1;
                    return this._lfcf.delayTime.setValueAtTime(n, e), this._noise.start(e), this._noise.stop(e + n * this.attackNoise), this._lfcf.resonance.cancelScheduledValues(e), this._lfcf.resonance.setValueAtTime(this.resonance, e), this;
                }
                triggerRelease(t1) {
                    return this._lfcf.resonance.linearRampTo(0, this.release, t1), this;
                }
                dispose() {
                    return super.dispose(), this._noise.dispose(), this._lfcf.dispose(), this;
                }
            }
            class ra extends Vr {
                constructor(){
                    super(Di(ra.getDefaults(), arguments, [
                        "voice",
                        "options"
                    ])), this.name = "PolySynth", this._availableVoices = [], this._activeVoices = [], this._voices = [], this._gcTimeout = -1, this._averageActiveVoices = 0;
                    const t1 = Di(ra.getDefaults(), arguments, [
                        "voice",
                        "options"
                    ]);
                    ti(!ui(t1.voice), "DEPRECATED: The polyphony count is no longer the first argument.");
                    const e = t1.voice.getDefaults();
                    this.options = Object.assign(e, t1.options), this.voice = t1.voice, this.maxPolyphony = t1.maxPolyphony, this._dummyVoice = this._getNextAvailableVoice();
                    const s1 = this._voices.indexOf(this._dummyVoice);
                    this._voices.splice(s1, 1), this._gcTimeout = this.context.setInterval(this._collectGarbage.bind(this), 1);
                }
                static getDefaults() {
                    return Object.assign(Vr.getDefaults(), {
                        maxPolyphony: 32,
                        options: {},
                        voice: jr
                    });
                }
                get activeVoices() {
                    return this._activeVoices.length;
                }
                _makeVoiceAvailable(t1) {
                    this._availableVoices.push(t1);
                    const e = this._activeVoices.findIndex((e)=>e.voice === t1);
                    this._activeVoices.splice(e, 1);
                }
                _getNextAvailableVoice() {
                    if (this._availableVoices.length) return this._availableVoices.shift();
                    if (this._voices.length < this.maxPolyphony) {
                        const t1 = new this.voice(Object.assign(this.options, {
                            context: this.context,
                            onsilence: this._makeVoiceAvailable.bind(this)
                        }));
                        return t1.connect(this.output), this._voices.push(t1), t1;
                    }
                    ri("Max polyphony exceeded. Note dropped.");
                }
                _collectGarbage() {
                    if (this._averageActiveVoices = Math.max(.95 * this._averageActiveVoices, this.activeVoices), this._availableVoices.length && this._voices.length > Math.ceil(this._averageActiveVoices + 1)) {
                        const t1 = this._availableVoices.shift(), e = this._voices.indexOf(t1);
                        this._voices.splice(e, 1), this.context.isOffline || t1.dispose();
                    }
                }
                _triggerAttack(t1, e, s1) {
                    t1.forEach((t1)=>{
                        const n = new No(this.context, t1).toMidi(), i = this._getNextAvailableVoice();
                        i && (i.triggerAttack(t1, e, s1), this._activeVoices.push({
                            midi: n,
                            voice: i,
                            released: !1
                        }), this.log("triggerAttack", t1, e));
                    });
                }
                _triggerRelease(t1, e) {
                    t1.forEach((t1)=>{
                        const s1 = new No(this.context, t1).toMidi(), n = this._activeVoices.find(({ midi: t1, released: e })=>t1 === s1 && !e);
                        n && (n.voice.triggerRelease(e), n.released = !0, this.log("triggerRelease", t1, e));
                    });
                }
                _scheduleEvent(t1, e, s1, n) {
                    ti(!this.disposed, "Synth was already disposed"), s1 <= this.now() ? "attack" === t1 ? this._triggerAttack(e, s1, n) : this._triggerRelease(e, s1) : this.context.setTimeout(()=>{
                        this._scheduleEvent(t1, e, s1, n);
                    }, s1 - this.now());
                }
                triggerAttack(t1, e, s1) {
                    Array.isArray(t1) || (t1 = [
                        t1
                    ]);
                    const n = this.toSeconds(e);
                    return this._scheduleEvent("attack", t1, n, s1), this;
                }
                triggerRelease(t1, e) {
                    Array.isArray(t1) || (t1 = [
                        t1
                    ]);
                    const s1 = this.toSeconds(e);
                    return this._scheduleEvent("release", t1, s1), this;
                }
                triggerAttackRelease(t1, e, s1, n) {
                    const i = this.toSeconds(s1);
                    if (this.triggerAttack(t1, i, n), di(e)) {
                        ti(di(t1), "If the duration is an array, the notes must also be an array"), t1;
                        for(let s1 = 0; s1 < t1.length; s1++){
                            const n = e[Math.min(s1, e.length - 1)], o = this.toSeconds(n);
                            ti(o > 0, "The duration must be greater than 0"), this.triggerRelease(t1[s1], i + o);
                        }
                    } else {
                        const s1 = this.toSeconds(e);
                        ti(s1 > 0, "The duration must be greater than 0"), this.triggerRelease(t1, i + s1);
                    }
                    return this;
                }
                sync() {
                    return this._syncState() && (this._syncMethod("triggerAttack", 1), this._syncMethod("triggerRelease", 1)), this;
                }
                set(t1) {
                    const e = Mi(t1, [
                        "onsilence",
                        "context"
                    ]);
                    return this.options = Ai(this.options, e), this._voices.forEach((t1)=>t1.set(e)), this._dummyVoice.set(e), this;
                }
                get() {
                    return this._dummyVoice.get();
                }
                releaseAll(t1) {
                    const e = this.toSeconds(t1);
                    return this._activeVoices.forEach(({ voice: t1 })=>{
                        t1.triggerRelease(e);
                    }), this;
                }
                dispose() {
                    return super.dispose(), this._dummyVoice.dispose(), this._voices.forEach((t1)=>t1.dispose()), this._activeVoices = [], this._availableVoices = [], this.context.clearInterval(this._gcTimeout), this;
                }
            }
            class aa extends Vr {
                constructor(){
                    super(Di(aa.getDefaults(), arguments, [
                        "urls",
                        "onload",
                        "baseUrl"
                    ], "urls")), this.name = "Sampler", this._activeSources = new Map;
                    const t1 = Di(aa.getDefaults(), arguments, [
                        "urls",
                        "onload",
                        "baseUrl"
                    ], "urls"), e = {};
                    Object.keys(t1.urls).forEach((s1)=>{
                        const n = parseInt(s1, 10);
                        if (ti(_i(s1) || ui(n) && isFinite(n), "url key is neither a note or midi pitch: " + s1), _i(s1)) {
                            const n = new lo(this.context, s1).toMidi();
                            e[n] = t1.urls[s1];
                        } else ui(n) && isFinite(n) && (e[n] = t1.urls[n]);
                    }), this._buffers = new Vo({
                        urls: e,
                        onload: t1.onload,
                        baseUrl: t1.baseUrl,
                        onerror: t1.onerror
                    }), this.attack = t1.attack, this.release = t1.release, this.curve = t1.curve, this._buffers.loaded && Promise.resolve().then(t1.onload);
                }
                static getDefaults() {
                    return Object.assign(Vr.getDefaults(), {
                        attack: 0,
                        baseUrl: "",
                        curve: "exponential",
                        onload: Zi,
                        onerror: Zi,
                        release: .1,
                        urls: {}
                    });
                }
                _findClosest(t1) {
                    let e = 0;
                    for(; e < 96;){
                        if (this._buffers.has(t1 + e)) return -e;
                        if (this._buffers.has(t1 - e)) return e;
                        e++;
                    }
                    throw new Error("No available buffers for note: " + t1);
                }
                triggerAttack(t1, e, s1 = 1) {
                    return this.log("triggerAttack", t1, e, s1), Array.isArray(t1) || (t1 = [
                        t1
                    ]), t1.forEach((t1)=>{
                        const n = ro(new lo(this.context, t1).toFrequency()), i = Math.round(n), o = n - i, r = this._findClosest(i), a = i - r, c = this._buffers.get(a), h = no(r + o), u = new $o({
                            url: c,
                            context: this.context,
                            curve: this.curve,
                            fadeIn: this.attack,
                            fadeOut: this.release,
                            playbackRate: h
                        }).connect(this.output);
                        u.start(e, 0, c.duration / h, s1), di(this._activeSources.get(i)) || this._activeSources.set(i, []), this._activeSources.get(i).push(u), u.onended = ()=>{
                            if (this._activeSources && this._activeSources.has(i)) {
                                const t1 = this._activeSources.get(i), e = t1.indexOf(u);
                                -1 !== e && t1.splice(e, 1);
                            }
                        };
                    }), this;
                }
                triggerRelease(t1, e) {
                    return this.log("triggerRelease", t1, e), Array.isArray(t1) || (t1 = [
                        t1
                    ]), t1.forEach((t1)=>{
                        const s1 = new lo(this.context, t1).toMidi();
                        if (this._activeSources.has(s1) && this._activeSources.get(s1).length) {
                            const t1 = this._activeSources.get(s1);
                            e = this.toSeconds(e), t1.forEach((t1)=>{
                                t1.stop(e);
                            }), this._activeSources.set(s1, []);
                        }
                    }), this;
                }
                releaseAll(t1) {
                    const e = this.toSeconds(t1);
                    return this._activeSources.forEach((t1)=>{
                        for(; t1.length;)t1.shift().stop(e);
                    }), this;
                }
                sync() {
                    return this._syncState() && (this._syncMethod("triggerAttack", 1), this._syncMethod("triggerRelease", 1)), this;
                }
                triggerAttackRelease(t1, e, s1, n = 1) {
                    const i = this.toSeconds(s1);
                    return this.triggerAttack(t1, i, n), di(e) ? (ti(di(t1), "notes must be an array when duration is array"), t1.forEach((t1, s1)=>{
                        const n = e[Math.min(s1, e.length - 1)];
                        this.triggerRelease(t1, i + this.toSeconds(n));
                    })) : this.triggerRelease(t1, i + this.toSeconds(e)), this;
                }
                add(t1, e, s1) {
                    if (ti(_i(t1) || isFinite(t1), "note must be a pitch or midi: " + t1), _i(t1)) {
                        const n = new lo(this.context, t1).toMidi();
                        this._buffers.add(n, e, s1);
                    } else this._buffers.add(t1, e, s1);
                    return this;
                }
                get loaded() {
                    return this._buffers.loaded;
                }
                dispose() {
                    return super.dispose(), this._buffers.dispose(), this._activeSources.forEach((t1)=>{
                        t1.forEach((t1)=>t1.dispose());
                    }), this._activeSources.clear(), this;
                }
            }
            vi([
                wr(0)
            ], aa.prototype, "attack", void 0), vi([
                wr(0)
            ], aa.prototype, "release", void 0);
            class ca extends vo {
                constructor(){
                    super(Di(ca.getDefaults(), arguments, [
                        "callback",
                        "value"
                    ])), this.name = "ToneEvent", this._state = new yo("stopped"), this._startOffset = 0;
                    const t1 = Di(ca.getDefaults(), arguments, [
                        "callback",
                        "value"
                    ]);
                    this._loop = t1.loop, this.callback = t1.callback, this.value = t1.value, this._loopStart = this.toTicks(t1.loopStart), this._loopEnd = this.toTicks(t1.loopEnd), this._playbackRate = t1.playbackRate, this._probability = t1.probability, this._humanize = t1.humanize, this.mute = t1.mute, this._playbackRate = t1.playbackRate, this._state.increasing = !0, this._rescheduleEvents();
                }
                static getDefaults() {
                    return Object.assign(vo.getDefaults(), {
                        callback: Zi,
                        humanize: !1,
                        loop: !1,
                        loopEnd: "1m",
                        loopStart: 0,
                        mute: !1,
                        playbackRate: 1,
                        probability: 1,
                        value: null
                    });
                }
                _rescheduleEvents(t1 = -1) {
                    this._state.forEachFrom(t1, (t1)=>{
                        let e;
                        if ("started" === t1.state) {
                            -1 !== t1.id && this.context.transport.clear(t1.id);
                            const s1 = t1.time + Math.round(this.startOffset / this._playbackRate);
                            if (!0 === this._loop || ui(this._loop) && this._loop > 1) {
                                e = 1 / 0, ui(this._loop) && (e = this._loop * this._getLoopDuration());
                                const n = this._state.getAfter(s1);
                                null !== n && (e = Math.min(e, n.time - s1)), e !== 1 / 0 && (this._state.setStateAtTime("stopped", s1 + e + 1, {
                                    id: -1
                                }), e = new jo(this.context, e));
                                const i = new jo(this.context, this._getLoopDuration());
                                t1.id = this.context.transport.scheduleRepeat(this._tick.bind(this), i, new jo(this.context, s1), e);
                            } else t1.id = this.context.transport.schedule(this._tick.bind(this), new jo(this.context, s1));
                        }
                    });
                }
                get state() {
                    return this._state.getValueAtTime(this.context.transport.ticks);
                }
                get startOffset() {
                    return this._startOffset;
                }
                set startOffset(t1) {
                    this._startOffset = t1;
                }
                get probability() {
                    return this._probability;
                }
                set probability(t1) {
                    this._probability = t1;
                }
                get humanize() {
                    return this._humanize;
                }
                set humanize(t1) {
                    this._humanize = t1;
                }
                start(t1) {
                    const e = this.toTicks(t1);
                    return "stopped" === this._state.getValueAtTime(e) && (this._state.add({
                        id: -1,
                        state: "started",
                        time: e
                    }), this._rescheduleEvents(e)), this;
                }
                stop(t1) {
                    this.cancel(t1);
                    const e = this.toTicks(t1);
                    if ("started" === this._state.getValueAtTime(e)) {
                        this._state.setStateAtTime("stopped", e, {
                            id: -1
                        });
                        const t1 = this._state.getBefore(e);
                        let s1 = e;
                        null !== t1 && (s1 = t1.time), this._rescheduleEvents(s1);
                    }
                    return this;
                }
                cancel(t1) {
                    t1 = Oi(t1, -1 / 0);
                    const e = this.toTicks(t1);
                    return this._state.forEachFrom(e, (t1)=>{
                        this.context.transport.clear(t1.id);
                    }), this._state.cancel(e), this;
                }
                _tick(t1) {
                    const e = this.context.transport.getTicksAtTime(t1);
                    if (!this.mute && "started" === this._state.getValueAtTime(e)) {
                        if (this.probability < 1 && Math.random() > this.probability) return;
                        if (this.humanize) {
                            let e = .02;
                            pi(this.humanize) || (e = this.toSeconds(this.humanize)), t1 += (2 * Math.random() - 1) * e;
                        }
                        this.callback(t1, this.value);
                    }
                }
                _getLoopDuration() {
                    return Math.round((this._loopEnd - this._loopStart) / this._playbackRate);
                }
                get loop() {
                    return this._loop;
                }
                set loop(t1) {
                    this._loop = t1, this._rescheduleEvents();
                }
                get playbackRate() {
                    return this._playbackRate;
                }
                set playbackRate(t1) {
                    this._playbackRate = t1, this._rescheduleEvents();
                }
                get loopEnd() {
                    return new jo(this.context, this._loopEnd).toSeconds();
                }
                set loopEnd(t1) {
                    this._loopEnd = this.toTicks(t1), this._loop && this._rescheduleEvents();
                }
                get loopStart() {
                    return new jo(this.context, this._loopStart).toSeconds();
                }
                set loopStart(t1) {
                    this._loopStart = this.toTicks(t1), this._loop && this._rescheduleEvents();
                }
                get progress() {
                    if (this._loop) {
                        const t1 = this.context.transport.ticks, e = this._state.get(t1);
                        if (null !== e && "started" === e.state) {
                            const s1 = this._getLoopDuration();
                            return (t1 - e.time) % s1 / s1;
                        }
                        return 0;
                    }
                    return 0;
                }
                dispose() {
                    return super.dispose(), this.cancel(), this._state.dispose(), this;
                }
            }
            class ha extends vo {
                constructor(){
                    super(Di(ha.getDefaults(), arguments, [
                        "callback",
                        "interval"
                    ])), this.name = "Loop";
                    const t1 = Di(ha.getDefaults(), arguments, [
                        "callback",
                        "interval"
                    ]);
                    this._event = new ca({
                        context: this.context,
                        callback: this._tick.bind(this),
                        loop: !0,
                        loopEnd: t1.interval,
                        playbackRate: t1.playbackRate,
                        probability: t1.probability
                    }), this.callback = t1.callback, this.iterations = t1.iterations;
                }
                static getDefaults() {
                    return Object.assign(vo.getDefaults(), {
                        interval: "4n",
                        callback: Zi,
                        playbackRate: 1,
                        iterations: 1 / 0,
                        probability: 1,
                        mute: !1,
                        humanize: !1
                    });
                }
                start(t1) {
                    return this._event.start(t1), this;
                }
                stop(t1) {
                    return this._event.stop(t1), this;
                }
                cancel(t1) {
                    return this._event.cancel(t1), this;
                }
                _tick(t1) {
                    this.callback(t1);
                }
                get state() {
                    return this._event.state;
                }
                get progress() {
                    return this._event.progress;
                }
                get interval() {
                    return this._event.loopEnd;
                }
                set interval(t1) {
                    this._event.loopEnd = t1;
                }
                get playbackRate() {
                    return this._event.playbackRate;
                }
                set playbackRate(t1) {
                    this._event.playbackRate = t1;
                }
                get humanize() {
                    return this._event.humanize;
                }
                set humanize(t1) {
                    this._event.humanize = t1;
                }
                get probability() {
                    return this._event.probability;
                }
                set probability(t1) {
                    this._event.probability = t1;
                }
                get mute() {
                    return this._event.mute;
                }
                set mute(t1) {
                    this._event.mute = t1;
                }
                get iterations() {
                    return !0 === this._event.loop ? 1 / 0 : this._event.loop;
                }
                set iterations(t1) {
                    this._event.loop = t1 === 1 / 0 || t1;
                }
                dispose() {
                    return super.dispose(), this._event.dispose(), this;
                }
            }
            class ua extends ca {
                constructor(){
                    super(Di(ua.getDefaults(), arguments, [
                        "callback",
                        "events"
                    ])), this.name = "Part", this._state = new yo("stopped"), this._events = new Set;
                    const t1 = Di(ua.getDefaults(), arguments, [
                        "callback",
                        "events"
                    ]);
                    this._state.increasing = !0, t1.events.forEach((t1)=>{
                        di(t1) ? this.add(t1[0], t1[1]) : this.add(t1);
                    });
                }
                static getDefaults() {
                    return Object.assign(ca.getDefaults(), {
                        events: []
                    });
                }
                start(t1, e) {
                    const s1 = this.toTicks(t1);
                    if ("started" !== this._state.getValueAtTime(s1)) {
                        e = Oi(e, this._loop ? this._loopStart : 0), e = this._loop ? Oi(e, this._loopStart) : Oi(e, 0);
                        const t1 = this.toTicks(e);
                        this._state.add({
                            id: -1,
                            offset: t1,
                            state: "started",
                            time: s1
                        }), this._forEach((e)=>{
                            this._startNote(e, s1, t1);
                        });
                    }
                    return this;
                }
                _startNote(t1, e, s1) {
                    e -= s1, this._loop ? t1.startOffset >= this._loopStart && t1.startOffset < this._loopEnd ? (t1.startOffset < s1 && (e += this._getLoopDuration()), t1.start(new jo(this.context, e))) : t1.startOffset < this._loopStart && t1.startOffset >= s1 && (t1.loop = !1, t1.start(new jo(this.context, e))) : t1.startOffset >= s1 && t1.start(new jo(this.context, e));
                }
                get startOffset() {
                    return this._startOffset;
                }
                set startOffset(t1) {
                    this._startOffset = t1, this._forEach((t1)=>{
                        t1.startOffset += this._startOffset;
                    });
                }
                stop(t1) {
                    const e = this.toTicks(t1);
                    return this._state.cancel(e), this._state.setStateAtTime("stopped", e), this._forEach((e)=>{
                        e.stop(t1);
                    }), this;
                }
                at(t1, e) {
                    const s1 = new mo(this.context, t1).toTicks(), n = new jo(this.context, 1).toSeconds(), i = this._events.values();
                    let o = i.next();
                    for(; !o.done;){
                        const t1 = o.value;
                        if (Math.abs(s1 - t1.startOffset) < n) return ci(e) && (t1.value = e), t1;
                        o = i.next();
                    }
                    return ci(e) ? (this.add(t1, e), this.at(t1)) : null;
                }
                add(t1, e) {
                    t1 instanceof Object && Reflect.has(t1, "time") && (t1 = (e = t1).time);
                    const s1 = this.toTicks(t1);
                    let n;
                    return e instanceof ca ? (n = e, n.callback = this._tick.bind(this)) : n = new ca({
                        callback: this._tick.bind(this),
                        context: this.context,
                        value: e
                    }), n.startOffset = s1, n.set({
                        humanize: this.humanize,
                        loop: this.loop,
                        loopEnd: this.loopEnd,
                        loopStart: this.loopStart,
                        playbackRate: this.playbackRate,
                        probability: this.probability
                    }), this._events.add(n), this._restartEvent(n), this;
                }
                _restartEvent(t1) {
                    this._state.forEach((e)=>{
                        "started" === e.state ? this._startNote(t1, e.time, e.offset) : t1.stop(new jo(this.context, e.time));
                    });
                }
                remove(t1, e) {
                    return li(t1) && t1.hasOwnProperty("time") && (t1 = (e = t1).time), t1 = this.toTicks(t1), this._events.forEach((s1)=>{
                        s1.startOffset === t1 && (ai(e) || ci(e) && s1.value === e) && (this._events.delete(s1), s1.dispose());
                    }), this;
                }
                clear() {
                    return this._forEach((t1)=>t1.dispose()), this._events.clear(), this;
                }
                cancel(t1) {
                    return this._forEach((e)=>e.cancel(t1)), this._state.cancel(this.toTicks(t1)), this;
                }
                _forEach(t1) {
                    return this._events && this._events.forEach((e)=>{
                        e instanceof ua ? e._forEach(t1) : t1(e);
                    }), this;
                }
                _setAll(t1, e) {
                    this._forEach((s1)=>{
                        s1[t1] = e;
                    });
                }
                _tick(t1, e) {
                    this.mute || this.callback(t1, e);
                }
                _testLoopBoundries(t1) {
                    this._loop && (t1.startOffset < this._loopStart || t1.startOffset >= this._loopEnd) ? t1.cancel(0) : "stopped" === t1.state && this._restartEvent(t1);
                }
                get probability() {
                    return this._probability;
                }
                set probability(t1) {
                    this._probability = t1, this._setAll("probability", t1);
                }
                get humanize() {
                    return this._humanize;
                }
                set humanize(t1) {
                    this._humanize = t1, this._setAll("humanize", t1);
                }
                get loop() {
                    return this._loop;
                }
                set loop(t1) {
                    this._loop = t1, this._forEach((e)=>{
                        e.loopStart = this.loopStart, e.loopEnd = this.loopEnd, e.loop = t1, this._testLoopBoundries(e);
                    });
                }
                get loopEnd() {
                    return new jo(this.context, this._loopEnd).toSeconds();
                }
                set loopEnd(t1) {
                    this._loopEnd = this.toTicks(t1), this._loop && this._forEach((e)=>{
                        e.loopEnd = t1, this._testLoopBoundries(e);
                    });
                }
                get loopStart() {
                    return new jo(this.context, this._loopStart).toSeconds();
                }
                set loopStart(t1) {
                    this._loopStart = this.toTicks(t1), this._loop && this._forEach((t1)=>{
                        t1.loopStart = this.loopStart, this._testLoopBoundries(t1);
                    });
                }
                get playbackRate() {
                    return this._playbackRate;
                }
                set playbackRate(t1) {
                    this._playbackRate = t1, this._setAll("playbackRate", t1);
                }
                get length() {
                    return this._events.size;
                }
                dispose() {
                    return super.dispose(), this.clear(), this;
                }
            }
            function* la(t1) {
                let e = 0;
                for(; e < t1.length;)e = fa(e, t1), yield t1[e], e++;
            }
            function* pa(t1) {
                let e = t1.length - 1;
                for(; e >= 0;)e = fa(e, t1), yield t1[e], e--;
            }
            function* da(t1, e) {
                for(;;)yield* e(t1);
            }
            function fa(t1, e) {
                return Vi(t1, 0, e.length - 1);
            }
            function* _a(t1, e) {
                let s1 = e ? 0 : t1.length - 1;
                for(;;)s1 = fa(s1, t1), yield t1[s1], e ? (s1++, s1 >= t1.length - 1 && (e = !1)) : (s1--, s1 <= 0 && (e = !0));
            }
            function* ma(t1) {
                let e = 0, s1 = 0;
                for(; e < t1.length;)e = fa(e, t1), yield t1[e], s1++, e += s1 % 2 ? 2 : -1;
            }
            function* ga(t1) {
                let e = t1.length - 1, s1 = 0;
                for(; e >= 0;)e = fa(e, t1), yield t1[e], s1++, e += s1 % 2 ? -2 : 1;
            }
            function* va(t1) {
                const e = [];
                for(let s1 = 0; s1 < t1.length; s1++)e.push(s1);
                for(; e.length > 0;){
                    const s1 = fa(e.splice(Math.floor(e.length * Math.random()), 1)[0], t1);
                    yield t1[s1];
                }
            }
            function* ya(t1, e = "up", s1 = 0) {
                switch(ti(t1.length > 0, "The array must have more than one value in it"), e){
                    case "up":
                        yield* da(t1, la);
                    case "down":
                        yield* da(t1, pa);
                    case "upDown":
                        yield* _a(t1, !0);
                    case "downUp":
                        yield* _a(t1, !1);
                    case "alternateUp":
                        yield* da(t1, ma);
                    case "alternateDown":
                        yield* da(t1, ga);
                    case "random":
                        yield* function*(t1) {
                            for(;;){
                                const e = Math.floor(Math.random() * t1.length);
                                yield t1[e];
                            }
                        }(t1);
                    case "randomOnce":
                        yield* da(t1, va);
                    case "randomWalk":
                        yield* function*(t1) {
                            let e = Math.floor(Math.random() * t1.length);
                            for(;;)0 === e ? e++ : e === t1.length - 1 || Math.random() < .5 ? e-- : e++, yield t1[e];
                        }(t1);
                }
            }
            class xa extends ha {
                constructor(){
                    super(Di(xa.getDefaults(), arguments, [
                        "callback",
                        "values",
                        "pattern"
                    ])), this.name = "Pattern";
                    const t1 = Di(xa.getDefaults(), arguments, [
                        "callback",
                        "values",
                        "pattern"
                    ]);
                    this.callback = t1.callback, this._values = t1.values, this._pattern = ya(t1.values, t1.pattern), this._type = t1.pattern;
                }
                static getDefaults() {
                    return Object.assign(ha.getDefaults(), {
                        pattern: "up",
                        values: [],
                        callback: Zi
                    });
                }
                _tick(t1) {
                    const e = this._pattern.next();
                    this._value = e.value, this.callback(t1, this._value);
                }
                get values() {
                    return this._values;
                }
                set values(t1) {
                    this._values = t1, this.pattern = this._type;
                }
                get value() {
                    return this._value;
                }
                get pattern() {
                    return this._type;
                }
                set pattern(t1) {
                    this._type = t1, this._pattern = ya(this._values, this._type);
                }
            }
            class wa extends ca {
                constructor(){
                    super(Di(wa.getDefaults(), arguments, [
                        "callback",
                        "events",
                        "subdivision"
                    ])), this.name = "Sequence", this._part = new ua({
                        callback: this._seqCallback.bind(this),
                        context: this.context
                    }), this._events = [], this._eventsArray = [];
                    const t1 = Di(wa.getDefaults(), arguments, [
                        "callback",
                        "events",
                        "subdivision"
                    ]);
                    this._subdivision = this.toTicks(t1.subdivision), this.events = t1.events, this.loop = t1.loop, this.loopStart = t1.loopStart, this.loopEnd = t1.loopEnd, this.playbackRate = t1.playbackRate, this.probability = t1.probability, this.humanize = t1.humanize, this.mute = t1.mute, this.playbackRate = t1.playbackRate;
                }
                static getDefaults() {
                    return Object.assign(Mi(ca.getDefaults(), [
                        "value"
                    ]), {
                        events: [],
                        loop: !0,
                        loopEnd: 0,
                        loopStart: 0,
                        subdivision: "8n"
                    });
                }
                _seqCallback(t1, e) {
                    null !== e && this.callback(t1, e);
                }
                get events() {
                    return this._events;
                }
                set events(t1) {
                    this.clear(), this._eventsArray = t1, this._events = this._createSequence(this._eventsArray), this._eventsUpdated();
                }
                start(t1, e) {
                    return this._part.start(t1, e ? this._indexTime(e) : e), this;
                }
                stop(t1) {
                    return this._part.stop(t1), this;
                }
                get subdivision() {
                    return new jo(this.context, this._subdivision).toSeconds();
                }
                _createSequence(t1) {
                    return new Proxy(t1, {
                        get: (t1, e)=>t1[e],
                        set: (t1, e, s1)=>(fi(e) && isFinite(parseInt(e, 10)) && di(s1) ? t1[e] = this._createSequence(s1) : t1[e] = s1, this._eventsUpdated(), !0)
                    });
                }
                _eventsUpdated() {
                    this._part.clear(), this._rescheduleSequence(this._eventsArray, this._subdivision, this.startOffset), this.loopEnd = this.loopEnd;
                }
                _rescheduleSequence(t1, e, s1) {
                    t1.forEach((t1, n)=>{
                        const i = n * e + s1;
                        if (di(t1)) this._rescheduleSequence(t1, e / t1.length, i);
                        else {
                            const e = new jo(this.context, i, "i").toSeconds();
                            this._part.add(e, t1);
                        }
                    });
                }
                _indexTime(t1) {
                    return new jo(this.context, t1 * this._subdivision + this.startOffset).toSeconds();
                }
                clear() {
                    return this._part.clear(), this;
                }
                dispose() {
                    return super.dispose(), this._part.dispose(), this;
                }
                get loop() {
                    return this._part.loop;
                }
                set loop(t1) {
                    this._part.loop = t1;
                }
                get loopStart() {
                    return this._loopStart;
                }
                set loopStart(t1) {
                    this._loopStart = t1, this._part.loopStart = this._indexTime(t1);
                }
                get loopEnd() {
                    return this._loopEnd;
                }
                set loopEnd(t1) {
                    this._loopEnd = t1, this._part.loopEnd = 0 === t1 ? this._indexTime(this._eventsArray.length) : this._indexTime(t1);
                }
                get startOffset() {
                    return this._part.startOffset;
                }
                set startOffset(t1) {
                    this._part.startOffset = t1;
                }
                get playbackRate() {
                    return this._part.playbackRate;
                }
                set playbackRate(t1) {
                    this._part.playbackRate = t1;
                }
                get probability() {
                    return this._part.probability;
                }
                set probability(t1) {
                    this._part.probability = t1;
                }
                get progress() {
                    return this._part.progress;
                }
                get humanize() {
                    return this._part.humanize;
                }
                set humanize(t1) {
                    this._part.humanize = t1;
                }
                get length() {
                    return this._part.length;
                }
            }
            class ba extends wo {
                constructor(){
                    super(Object.assign(Di(ba.getDefaults(), arguments, [
                        "fade"
                    ]))), this.name = "CrossFade", this._panner = this.context.createStereoPanner(), this._split = this.context.createChannelSplitter(2), this._g2a = new Cr({
                        context: this.context
                    }), this.a = new ko({
                        context: this.context,
                        gain: 0
                    }), this.b = new ko({
                        context: this.context,
                        gain: 0
                    }), this.output = new ko({
                        context: this.context
                    }), this._internalChannels = [
                        this.a,
                        this.b
                    ];
                    const t1 = Di(ba.getDefaults(), arguments, [
                        "fade"
                    ]);
                    this.fade = new Do({
                        context: this.context,
                        units: "normalRange",
                        value: t1.fade
                    }), Ui(this, "fade"), this.context.getConstant(1).connect(this._panner), this._panner.connect(this._split), this._panner.channelCount = 1, this._panner.channelCountMode = "explicit", To(this._split, this.a.gain, 0), To(this._split, this.b.gain, 1), this.fade.chain(this._g2a, this._panner.pan), this.a.connect(this.output), this.b.connect(this.output);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        fade: .5
                    });
                }
                dispose() {
                    return super.dispose(), this.a.dispose(), this.b.dispose(), this.output.dispose(), this.fade.dispose(), this._g2a.dispose(), this._panner.disconnect(), this._split.disconnect(), this;
                }
            }
            class Ta extends wo {
                constructor(t1){
                    super(t1), this.name = "Effect", this._dryWet = new ba({
                        context: this.context
                    }), this.wet = this._dryWet.fade, this.effectSend = new ko({
                        context: this.context
                    }), this.effectReturn = new ko({
                        context: this.context
                    }), this.input = new ko({
                        context: this.context
                    }), this.output = this._dryWet, this.input.fan(this._dryWet.a, this.effectSend), this.effectReturn.connect(this._dryWet.b), this.wet.setValueAtTime(t1.wet, 0), this._internalChannels = [
                        this.effectReturn,
                        this.effectSend
                    ], Ui(this, "wet");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        wet: 1
                    });
                }
                connectEffect(t1) {
                    return this._internalChannels.push(t1), this.effectSend.chain(t1, this.effectReturn), this;
                }
                dispose() {
                    return super.dispose(), this._dryWet.dispose(), this.effectSend.dispose(), this.effectReturn.dispose(), this.wet.dispose(), this;
                }
            }
            class Sa extends Ta {
                constructor(t1){
                    super(t1), this.name = "LFOEffect", this._lfo = new yr({
                        context: this.context,
                        frequency: t1.frequency,
                        amplitude: t1.depth
                    }), this.depth = this._lfo.amplitude, this.frequency = this._lfo.frequency, this.type = t1.type, Ui(this, [
                        "frequency",
                        "depth"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        frequency: 1,
                        type: "sine",
                        depth: 1
                    });
                }
                start(t1) {
                    return this._lfo.start(t1), this;
                }
                stop(t1) {
                    return this._lfo.stop(t1), this;
                }
                sync() {
                    return this._lfo.sync(), this;
                }
                unsync() {
                    return this._lfo.unsync(), this;
                }
                get type() {
                    return this._lfo.type;
                }
                set type(t1) {
                    this._lfo.type = t1;
                }
                dispose() {
                    return super.dispose(), this._lfo.dispose(), this.frequency.dispose(), this.depth.dispose(), this;
                }
            }
            class ka extends Sa {
                constructor(){
                    super(Di(ka.getDefaults(), arguments, [
                        "frequency",
                        "baseFrequency",
                        "octaves"
                    ])), this.name = "AutoFilter";
                    const t1 = Di(ka.getDefaults(), arguments, [
                        "frequency",
                        "baseFrequency",
                        "octaves"
                    ]);
                    this.filter = new Wr(Object.assign(t1.filter, {
                        context: this.context
                    })), this.connectEffect(this.filter), this._lfo.connect(this.filter.frequency), this.octaves = t1.octaves, this.baseFrequency = t1.baseFrequency;
                }
                static getDefaults() {
                    return Object.assign(Sa.getDefaults(), {
                        baseFrequency: 200,
                        octaves: 2.6,
                        filter: {
                            type: "lowpass",
                            rolloff: -12,
                            Q: 1
                        }
                    });
                }
                get baseFrequency() {
                    return this._lfo.min;
                }
                set baseFrequency(t1) {
                    this._lfo.min = this.toFrequency(t1), this.octaves = this._octaves;
                }
                get octaves() {
                    return this._octaves;
                }
                set octaves(t1) {
                    this._octaves = t1, this._lfo.max = this._lfo.min * Math.pow(2, t1);
                }
                dispose() {
                    return super.dispose(), this.filter.dispose(), this;
                }
            }
            class Ca extends wo {
                constructor(){
                    super(Object.assign(Di(Ca.getDefaults(), arguments, [
                        "pan"
                    ]))), this.name = "Panner", this._panner = this.context.createStereoPanner(), this.input = this._panner, this.output = this._panner;
                    const t1 = Di(Ca.getDefaults(), arguments, [
                        "pan"
                    ]);
                    this.pan = new xo({
                        context: this.context,
                        param: this._panner.pan,
                        value: t1.pan,
                        minValue: -1,
                        maxValue: 1
                    }), this._panner.channelCount = t1.channelCount, this._panner.channelCountMode = "explicit", Ui(this, "pan");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        pan: 0,
                        channelCount: 1
                    });
                }
                dispose() {
                    return super.dispose(), this._panner.disconnect(), this.pan.dispose(), this;
                }
            }
            class Aa extends Sa {
                constructor(){
                    super(Di(Aa.getDefaults(), arguments, [
                        "frequency"
                    ])), this.name = "AutoPanner";
                    const t1 = Di(Aa.getDefaults(), arguments, [
                        "frequency"
                    ]);
                    this._panner = new Ca({
                        context: this.context,
                        channelCount: t1.channelCount
                    }), this.connectEffect(this._panner), this._lfo.connect(this._panner.pan), this._lfo.min = -1, this._lfo.max = 1;
                }
                static getDefaults() {
                    return Object.assign(Sa.getDefaults(), {
                        channelCount: 1
                    });
                }
                dispose() {
                    return super.dispose(), this._panner.dispose(), this;
                }
            }
            class Da extends wo {
                constructor(){
                    super(Di(Da.getDefaults(), arguments, [
                        "smoothing"
                    ])), this.name = "Follower";
                    const t1 = Di(Da.getDefaults(), arguments, [
                        "smoothing"
                    ]);
                    this._abs = this.input = new kr({
                        context: this.context
                    }), this._lowpass = this.output = new na({
                        context: this.context,
                        frequency: 1 / this.toSeconds(t1.smoothing),
                        type: "lowpass"
                    }), this._abs.connect(this._lowpass), this._smoothing = t1.smoothing;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        smoothing: .05
                    });
                }
                get smoothing() {
                    return this._smoothing;
                }
                set smoothing(t1) {
                    this._smoothing = t1, this._lowpass.frequency = 1 / this.toSeconds(this.smoothing);
                }
                dispose() {
                    return super.dispose(), this._abs.dispose(), this._lowpass.dispose(), this;
                }
            }
            class Oa extends Ta {
                constructor(){
                    super(Di(Oa.getDefaults(), arguments, [
                        "baseFrequency",
                        "octaves",
                        "sensitivity"
                    ])), this.name = "AutoWah";
                    const t1 = Di(Oa.getDefaults(), arguments, [
                        "baseFrequency",
                        "octaves",
                        "sensitivity"
                    ]);
                    this._follower = new Da({
                        context: this.context,
                        smoothing: t1.follower
                    }), this._sweepRange = new Rr({
                        context: this.context,
                        min: 0,
                        max: 1,
                        exponent: .5
                    }), this._baseFrequency = this.toFrequency(t1.baseFrequency), this._octaves = t1.octaves, this._inputBoost = new ko({
                        context: this.context
                    }), this._bandpass = new Wr({
                        context: this.context,
                        rolloff: -48,
                        frequency: 0,
                        Q: t1.Q
                    }), this._peaking = new Wr({
                        context: this.context,
                        type: "peaking"
                    }), this._peaking.gain.value = t1.gain, this.gain = this._peaking.gain, this.Q = this._bandpass.Q, this.effectSend.chain(this._inputBoost, this._follower, this._sweepRange), this._sweepRange.connect(this._bandpass.frequency), this._sweepRange.connect(this._peaking.frequency), this.effectSend.chain(this._bandpass, this._peaking, this.effectReturn), this._setSweepRange(), this.sensitivity = t1.sensitivity, Ui(this, [
                        "gain",
                        "Q"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        baseFrequency: 100,
                        octaves: 6,
                        sensitivity: 0,
                        Q: 2,
                        gain: 2,
                        follower: .2
                    });
                }
                get octaves() {
                    return this._octaves;
                }
                set octaves(t1) {
                    this._octaves = t1, this._setSweepRange();
                }
                get follower() {
                    return this._follower.smoothing;
                }
                set follower(t1) {
                    this._follower.smoothing = t1;
                }
                get baseFrequency() {
                    return this._baseFrequency;
                }
                set baseFrequency(t1) {
                    this._baseFrequency = this.toFrequency(t1), this._setSweepRange();
                }
                get sensitivity() {
                    return so(1 / this._inputBoost.gain.value);
                }
                set sensitivity(t1) {
                    this._inputBoost.gain.value = 1 / eo(t1);
                }
                _setSweepRange() {
                    this._sweepRange.min = this._baseFrequency, this._sweepRange.max = Math.min(this._baseFrequency * Math.pow(2, this._octaves), this.context.sampleRate / 2);
                }
                dispose() {
                    return super.dispose(), this._follower.dispose(), this._sweepRange.dispose(), this._bandpass.dispose(), this._peaking.dispose(), this._inputBoost.dispose(), this;
                }
            }
            ta("bit-crusher", "\n	class BitCrusherWorklet extends SingleIOProcessor {\n\n		static get parameterDescriptors() {\n			return [{\n				name: \"bits\",\n				defaultValue: 12,\n				minValue: 1,\n				maxValue: 16,\n				automationRate: 'k-rate'\n			}];\n		}\n\n		generate(input, _channel, parameters) {\n			const step = Math.pow(0.5, parameters.bits - 1);\n			const val = step * Math.floor(input / step + 0.5);\n			return val;\n		}\n	}\n");
            class Ma extends Ta {
                constructor(){
                    super(Di(Ma.getDefaults(), arguments, [
                        "bits"
                    ])), this.name = "BitCrusher";
                    const t1 = Di(Ma.getDefaults(), arguments, [
                        "bits"
                    ]);
                    this._bitCrusherWorklet = new Ea({
                        context: this.context,
                        bits: t1.bits
                    }), this.connectEffect(this._bitCrusherWorklet), this.bits = this._bitCrusherWorklet.bits;
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        bits: 4
                    });
                }
                dispose() {
                    return super.dispose(), this._bitCrusherWorklet.dispose(), this;
                }
            }
            class Ea extends ea {
                constructor(){
                    super(Di(Ea.getDefaults(), arguments)), this.name = "BitCrusherWorklet";
                    const t1 = Di(Ea.getDefaults(), arguments);
                    this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this.bits = new xo({
                        context: this.context,
                        value: t1.bits,
                        units: "positive",
                        minValue: 1,
                        maxValue: 16,
                        param: this._dummyParam,
                        swappable: !0
                    });
                }
                static getDefaults() {
                    return Object.assign(ea.getDefaults(), {
                        bits: 12
                    });
                }
                _audioWorkletName() {
                    return "bit-crusher";
                }
                onReady(t1) {
                    bo(this.input, t1, this.output);
                    const e = t1.parameters.get("bits");
                    this.bits.setParam(e);
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this.output.dispose(), this.bits.dispose(), this;
                }
            }
            class Ra extends Ta {
                constructor(){
                    super(Di(Ra.getDefaults(), arguments, [
                        "order"
                    ])), this.name = "Chebyshev";
                    const t1 = Di(Ra.getDefaults(), arguments, [
                        "order"
                    ]);
                    this._shaper = new rr({
                        context: this.context,
                        length: 4096
                    }), this._order = t1.order, this.connectEffect(this._shaper), this.order = t1.order, this.oversample = t1.oversample;
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        order: 1,
                        oversample: "none"
                    });
                }
                _getCoefficient(t1, e, s1) {
                    return s1.has(e) || (0 === e ? s1.set(e, 0) : 1 === e ? s1.set(e, t1) : s1.set(e, 2 * t1 * this._getCoefficient(t1, e - 1, s1) - this._getCoefficient(t1, e - 2, s1))), s1.get(e);
                }
                get order() {
                    return this._order;
                }
                set order(t1) {
                    this._order = t1, this._shaper.setMap((e)=>this._getCoefficient(e, t1, new Map));
                }
                get oversample() {
                    return this._shaper.oversample;
                }
                set oversample(t1) {
                    this._shaper.oversample = t1;
                }
                dispose() {
                    return super.dispose(), this._shaper.dispose(), this;
                }
            }
            class qa extends wo {
                constructor(){
                    super(Di(qa.getDefaults(), arguments, [
                        "channels"
                    ])), this.name = "Split";
                    const t1 = Di(qa.getDefaults(), arguments, [
                        "channels"
                    ]);
                    this._splitter = this.input = this.output = this.context.createChannelSplitter(t1.channels), this._internalChannels = [
                        this._splitter
                    ];
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        channels: 2
                    });
                }
                dispose() {
                    return super.dispose(), this._splitter.disconnect(), this;
                }
            }
            class Fa extends wo {
                constructor(){
                    super(Di(Fa.getDefaults(), arguments, [
                        "channels"
                    ])), this.name = "Merge";
                    const t1 = Di(Fa.getDefaults(), arguments, [
                        "channels"
                    ]);
                    this._merger = this.output = this.input = this.context.createChannelMerger(t1.channels);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        channels: 2
                    });
                }
                dispose() {
                    return super.dispose(), this._merger.disconnect(), this;
                }
            }
            class Ia extends wo {
                constructor(t1){
                    super(t1), this.name = "StereoEffect", this.input = new ko({
                        context: this.context
                    }), this.input.channelCount = 2, this.input.channelCountMode = "explicit", this._dryWet = this.output = new ba({
                        context: this.context,
                        fade: t1.wet
                    }), this.wet = this._dryWet.fade, this._split = new qa({
                        context: this.context,
                        channels: 2
                    }), this._merge = new Fa({
                        context: this.context,
                        channels: 2
                    }), this.input.connect(this._split), this.input.connect(this._dryWet.a), this._merge.connect(this._dryWet.b), Ui(this, [
                        "wet"
                    ]);
                }
                connectEffectLeft(...t1) {
                    this._split.connect(t1[0], 0, 0), bo(...t1), To(t1[t1.length - 1], this._merge, 0, 0);
                }
                connectEffectRight(...t1) {
                    this._split.connect(t1[0], 1, 0), bo(...t1), To(t1[t1.length - 1], this._merge, 0, 1);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        wet: 1
                    });
                }
                dispose() {
                    return super.dispose(), this._dryWet.dispose(), this._split.dispose(), this._merge.dispose(), this;
                }
            }
            class Va extends Ia {
                constructor(t1){
                    super(t1), this.feedback = new Do({
                        context: this.context,
                        value: t1.feedback,
                        units: "normalRange"
                    }), this._feedbackL = new ko({
                        context: this.context
                    }), this._feedbackR = new ko({
                        context: this.context
                    }), this._feedbackSplit = new qa({
                        context: this.context,
                        channels: 2
                    }), this._feedbackMerge = new Fa({
                        context: this.context,
                        channels: 2
                    }), this._merge.connect(this._feedbackSplit), this._feedbackMerge.connect(this._split), this._feedbackSplit.connect(this._feedbackL, 0, 0), this._feedbackL.connect(this._feedbackMerge, 0, 0), this._feedbackSplit.connect(this._feedbackR, 1, 0), this._feedbackR.connect(this._feedbackMerge, 0, 1), this.feedback.fan(this._feedbackL.gain, this._feedbackR.gain), Ui(this, [
                        "feedback"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ia.getDefaults(), {
                        feedback: .5
                    });
                }
                dispose() {
                    return super.dispose(), this.feedback.dispose(), this._feedbackL.dispose(), this._feedbackR.dispose(), this._feedbackSplit.dispose(), this._feedbackMerge.dispose(), this;
                }
            }
            class Na extends Va {
                constructor(){
                    super(Di(Na.getDefaults(), arguments, [
                        "frequency",
                        "delayTime",
                        "depth"
                    ])), this.name = "Chorus";
                    const t1 = Di(Na.getDefaults(), arguments, [
                        "frequency",
                        "delayTime",
                        "depth"
                    ]);
                    this._depth = t1.depth, this._delayTime = t1.delayTime / 1e3, this._lfoL = new yr({
                        context: this.context,
                        frequency: t1.frequency,
                        min: 0,
                        max: 1
                    }), this._lfoR = new yr({
                        context: this.context,
                        frequency: t1.frequency,
                        min: 0,
                        max: 1,
                        phase: 180
                    }), this._delayNodeL = new Fo({
                        context: this.context
                    }), this._delayNodeR = new Fo({
                        context: this.context
                    }), this.frequency = this._lfoL.frequency, Ui(this, [
                        "frequency"
                    ]), this._lfoL.frequency.connect(this._lfoR.frequency), this.connectEffectLeft(this._delayNodeL), this.connectEffectRight(this._delayNodeR), this._lfoL.connect(this._delayNodeL.delayTime), this._lfoR.connect(this._delayNodeR.delayTime), this.depth = this._depth, this.type = t1.type, this.spread = t1.spread;
                }
                static getDefaults() {
                    return Object.assign(Va.getDefaults(), {
                        frequency: 1.5,
                        delayTime: 3.5,
                        depth: .7,
                        type: "sine",
                        spread: 180,
                        feedback: 0,
                        wet: .5
                    });
                }
                get depth() {
                    return this._depth;
                }
                set depth(t1) {
                    this._depth = t1;
                    const e = this._delayTime * t1;
                    this._lfoL.min = Math.max(this._delayTime - e, 0), this._lfoL.max = this._delayTime + e, this._lfoR.min = Math.max(this._delayTime - e, 0), this._lfoR.max = this._delayTime + e;
                }
                get delayTime() {
                    return 1e3 * this._delayTime;
                }
                set delayTime(t1) {
                    this._delayTime = t1 / 1e3, this.depth = this._depth;
                }
                get type() {
                    return this._lfoL.type;
                }
                set type(t1) {
                    this._lfoL.type = t1, this._lfoR.type = t1;
                }
                get spread() {
                    return this._lfoR.phase - this._lfoL.phase;
                }
                set spread(t1) {
                    this._lfoL.phase = 90 - t1 / 2, this._lfoR.phase = t1 / 2 + 90;
                }
                start(t1) {
                    return this._lfoL.start(t1), this._lfoR.start(t1), this;
                }
                stop(t1) {
                    return this._lfoL.stop(t1), this._lfoR.stop(t1), this;
                }
                sync() {
                    return this._lfoL.sync(), this._lfoR.sync(), this;
                }
                unsync() {
                    return this._lfoL.unsync(), this._lfoR.unsync(), this;
                }
                dispose() {
                    return super.dispose(), this._lfoL.dispose(), this._lfoR.dispose(), this._delayNodeL.dispose(), this._delayNodeR.dispose(), this.frequency.dispose(), this;
                }
            }
            class Pa extends Ta {
                constructor(){
                    super(Di(Pa.getDefaults(), arguments, [
                        "distortion"
                    ])), this.name = "Distortion";
                    const t1 = Di(Pa.getDefaults(), arguments, [
                        "distortion"
                    ]);
                    this._shaper = new rr({
                        context: this.context,
                        length: 4096
                    }), this._distortion = t1.distortion, this.connectEffect(this._shaper), this.distortion = t1.distortion, this.oversample = t1.oversample;
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        distortion: .4,
                        oversample: "none"
                    });
                }
                get distortion() {
                    return this._distortion;
                }
                set distortion(t1) {
                    this._distortion = t1;
                    const e = 100 * t1, s1 = Math.PI / 180;
                    this._shaper.setMap((t1)=>Math.abs(t1) < .001 ? 0 : (3 + e) * t1 * 20 * s1 / (Math.PI + e * Math.abs(t1)));
                }
                get oversample() {
                    return this._shaper.oversample;
                }
                set oversample(t1) {
                    this._shaper.oversample = t1;
                }
                dispose() {
                    return super.dispose(), this._shaper.dispose(), this;
                }
            }
            class ja extends Ta {
                constructor(t1){
                    super(t1), this.name = "FeedbackEffect", this._feedbackGain = new ko({
                        context: this.context,
                        gain: t1.feedback,
                        units: "normalRange"
                    }), this.feedback = this._feedbackGain.gain, Ui(this, "feedback"), this.effectReturn.chain(this._feedbackGain, this.effectSend);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        feedback: .125
                    });
                }
                dispose() {
                    return super.dispose(), this._feedbackGain.dispose(), this.feedback.dispose(), this;
                }
            }
            class La extends ja {
                constructor(){
                    super(Di(La.getDefaults(), arguments, [
                        "delayTime",
                        "feedback"
                    ])), this.name = "FeedbackDelay";
                    const t1 = Di(La.getDefaults(), arguments, [
                        "delayTime",
                        "feedback"
                    ]);
                    this._delayNode = new Fo({
                        context: this.context,
                        delayTime: t1.delayTime,
                        maxDelay: t1.maxDelay
                    }), this.delayTime = this._delayNode.delayTime, this.connectEffect(this._delayNode), Ui(this, "delayTime");
                }
                static getDefaults() {
                    return Object.assign(ja.getDefaults(), {
                        delayTime: .25,
                        maxDelay: 1
                    });
                }
                dispose() {
                    return super.dispose(), this._delayNode.dispose(), this.delayTime.dispose(), this;
                }
            }
            class za extends wo {
                constructor(t1){
                    super(t1), this.name = "PhaseShiftAllpass", this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this.offset90 = new ko({
                        context: this.context
                    });
                    this._bank0 = this._createAllPassFilterBank([
                        .6923878,
                        .9360654322959,
                        .988229522686,
                        .9987488452737
                    ]), this._bank1 = this._createAllPassFilterBank([
                        .4021921162426,
                        .856171088242,
                        .9722909545651,
                        .9952884791278
                    ]), this._oneSampleDelay = this.context.createIIRFilter([
                        0,
                        1
                    ], [
                        1,
                        0
                    ]), bo(this.input, ...this._bank0, this._oneSampleDelay, this.output), bo(this.input, ...this._bank1, this.offset90);
                }
                _createAllPassFilterBank(t1) {
                    return t1.map((t1)=>{
                        const e = [
                            [
                                t1 * t1,
                                0,
                                -1
                            ],
                            [
                                1,
                                0,
                                -t1 * t1
                            ]
                        ];
                        return this.context.createIIRFilter(e[0], e[1]);
                    });
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this.output.dispose(), this.offset90.dispose(), this._bank0.forEach((t1)=>t1.disconnect()), this._bank1.forEach((t1)=>t1.disconnect()), this._oneSampleDelay.disconnect(), this;
                }
            }
            class Ba extends Ta {
                constructor(){
                    super(Di(Ba.getDefaults(), arguments, [
                        "frequency"
                    ])), this.name = "FrequencyShifter";
                    const t1 = Di(Ba.getDefaults(), arguments, [
                        "frequency"
                    ]);
                    this.frequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.frequency,
                        minValue: -this.context.sampleRate / 2,
                        maxValue: this.context.sampleRate / 2
                    }), this._sine = new nr({
                        context: this.context,
                        type: "sine"
                    }), this._cosine = new ir({
                        context: this.context,
                        phase: -90,
                        type: "sine"
                    }), this._sineMultiply = new cr({
                        context: this.context
                    }), this._cosineMultiply = new cr({
                        context: this.context
                    }), this._negate = new Ar({
                        context: this.context
                    }), this._add = new mr({
                        context: this.context
                    }), this._phaseShifter = new za({
                        context: this.context
                    }), this.effectSend.connect(this._phaseShifter), this.frequency.fan(this._sine.frequency, this._cosine.frequency), this._phaseShifter.offset90.connect(this._cosineMultiply), this._cosine.connect(this._cosineMultiply.factor), this._phaseShifter.connect(this._sineMultiply), this._sine.connect(this._sineMultiply.factor), this._sineMultiply.connect(this._negate), this._cosineMultiply.connect(this._add), this._negate.connect(this._add.addend), this._add.connect(this.effectReturn);
                    const e = this.immediate();
                    this._sine.start(e), this._cosine.start(e);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        frequency: 0
                    });
                }
                dispose() {
                    return super.dispose(), this.frequency.dispose(), this._add.dispose(), this._cosine.dispose(), this._cosineMultiply.dispose(), this._negate.dispose(), this._phaseShifter.dispose(), this._sine.dispose(), this._sineMultiply.dispose(), this;
                }
            }
            const Wa = [
                1557 / 44100,
                1617 / 44100,
                1491 / 44100,
                1422 / 44100,
                1277 / 44100,
                1356 / 44100,
                1188 / 44100,
                1116 / 44100
            ], Ga = [
                225,
                556,
                441,
                341
            ];
            class Ua extends Ia {
                constructor(){
                    super(Di(Ua.getDefaults(), arguments, [
                        "roomSize",
                        "dampening"
                    ])), this.name = "Freeverb", this._combFilters = [], this._allpassFiltersL = [], this._allpassFiltersR = [];
                    const t1 = Di(Ua.getDefaults(), arguments, [
                        "roomSize",
                        "dampening"
                    ]);
                    this.roomSize = new Do({
                        context: this.context,
                        value: t1.roomSize,
                        units: "normalRange"
                    }), this._allpassFiltersL = Ga.map((t1)=>{
                        const e = this.context.createBiquadFilter();
                        return e.type = "allpass", e.frequency.value = t1, e;
                    }), this._allpassFiltersR = Ga.map((t1)=>{
                        const e = this.context.createBiquadFilter();
                        return e.type = "allpass", e.frequency.value = t1, e;
                    }), this._combFilters = Wa.map((e, s1)=>{
                        const n = new ia({
                            context: this.context,
                            dampening: t1.dampening,
                            delayTime: e
                        });
                        return s1 < Wa.length / 2 ? this.connectEffectLeft(n, ...this._allpassFiltersL) : this.connectEffectRight(n, ...this._allpassFiltersR), this.roomSize.connect(n.resonance), n;
                    }), Ui(this, [
                        "roomSize"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ia.getDefaults(), {
                        roomSize: .7,
                        dampening: 3e3
                    });
                }
                get dampening() {
                    return this._combFilters[0].dampening;
                }
                set dampening(t1) {
                    this._combFilters.forEach((e)=>e.dampening = t1);
                }
                dispose() {
                    return super.dispose(), this._allpassFiltersL.forEach((t1)=>t1.disconnect()), this._allpassFiltersR.forEach((t1)=>t1.disconnect()), this._combFilters.forEach((t1)=>t1.dispose()), this.roomSize.dispose(), this;
                }
            }
            const Qa = [
                .06748,
                .06404,
                .08212,
                .09004
            ], Za = [
                .773,
                .802,
                .753,
                .733
            ], Xa = [
                347,
                113,
                37
            ];
            class Ya extends Ia {
                constructor(){
                    super(Di(Ya.getDefaults(), arguments, [
                        "roomSize"
                    ])), this.name = "JCReverb", this._allpassFilters = [], this._feedbackCombFilters = [];
                    const t1 = Di(Ya.getDefaults(), arguments, [
                        "roomSize"
                    ]);
                    this.roomSize = new Do({
                        context: this.context,
                        value: t1.roomSize,
                        units: "normalRange"
                    }), this._scaleRoomSize = new gr({
                        context: this.context,
                        min: -0.733,
                        max: .197
                    }), this._allpassFilters = Xa.map((t1)=>{
                        const e = this.context.createBiquadFilter();
                        return e.type = "allpass", e.frequency.value = t1, e;
                    }), this._feedbackCombFilters = Qa.map((t1, e)=>{
                        const s1 = new sa({
                            context: this.context,
                            delayTime: t1
                        });
                        return this._scaleRoomSize.connect(s1.resonance), s1.resonance.value = Za[e], e < Qa.length / 2 ? this.connectEffectLeft(...this._allpassFilters, s1) : this.connectEffectRight(...this._allpassFilters, s1), s1;
                    }), this.roomSize.connect(this._scaleRoomSize), Ui(this, [
                        "roomSize"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ia.getDefaults(), {
                        roomSize: .5
                    });
                }
                dispose() {
                    return super.dispose(), this._allpassFilters.forEach((t1)=>t1.disconnect()), this._feedbackCombFilters.forEach((t1)=>t1.dispose()), this.roomSize.dispose(), this._scaleRoomSize.dispose(), this;
                }
            }
            class Ha extends Va {
                constructor(t1){
                    super(t1), this._feedbackL.disconnect(), this._feedbackL.connect(this._feedbackMerge, 0, 1), this._feedbackR.disconnect(), this._feedbackR.connect(this._feedbackMerge, 0, 0), Ui(this, [
                        "feedback"
                    ]);
                }
            }
            class $a extends Ha {
                constructor(){
                    super(Di($a.getDefaults(), arguments, [
                        "delayTime",
                        "feedback"
                    ])), this.name = "PingPongDelay";
                    const t1 = Di($a.getDefaults(), arguments, [
                        "delayTime",
                        "feedback"
                    ]);
                    this._leftDelay = new Fo({
                        context: this.context,
                        maxDelay: t1.maxDelay
                    }), this._rightDelay = new Fo({
                        context: this.context,
                        maxDelay: t1.maxDelay
                    }), this._rightPreDelay = new Fo({
                        context: this.context,
                        maxDelay: t1.maxDelay
                    }), this.delayTime = new Do({
                        context: this.context,
                        units: "time",
                        value: t1.delayTime
                    }), this.connectEffectLeft(this._leftDelay), this.connectEffectRight(this._rightPreDelay, this._rightDelay), this.delayTime.fan(this._leftDelay.delayTime, this._rightDelay.delayTime, this._rightPreDelay.delayTime), this._feedbackL.disconnect(), this._feedbackL.connect(this._rightDelay), Ui(this, [
                        "delayTime"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ha.getDefaults(), {
                        delayTime: .25,
                        maxDelay: 1
                    });
                }
                dispose() {
                    return super.dispose(), this._leftDelay.dispose(), this._rightDelay.dispose(), this._rightPreDelay.dispose(), this.delayTime.dispose(), this;
                }
            }
            class Ja extends ja {
                constructor(){
                    super(Di(Ja.getDefaults(), arguments, [
                        "pitch"
                    ])), this.name = "PitchShift";
                    const t1 = Di(Ja.getDefaults(), arguments, [
                        "pitch"
                    ]);
                    this._frequency = new Do({
                        context: this.context
                    }), this._delayA = new Fo({
                        maxDelay: 1,
                        context: this.context
                    }), this._lfoA = new yr({
                        context: this.context,
                        min: 0,
                        max: .1,
                        type: "sawtooth"
                    }).connect(this._delayA.delayTime), this._delayB = new Fo({
                        maxDelay: 1,
                        context: this.context
                    }), this._lfoB = new yr({
                        context: this.context,
                        min: 0,
                        max: .1,
                        type: "sawtooth",
                        phase: 180
                    }).connect(this._delayB.delayTime), this._crossFade = new ba({
                        context: this.context
                    }), this._crossFadeLFO = new yr({
                        context: this.context,
                        min: 0,
                        max: 1,
                        type: "triangle",
                        phase: 90
                    }).connect(this._crossFade.fade), this._feedbackDelay = new Fo({
                        delayTime: t1.delayTime,
                        context: this.context
                    }), this.delayTime = this._feedbackDelay.delayTime, Ui(this, "delayTime"), this._pitch = t1.pitch, this._windowSize = t1.windowSize, this._delayA.connect(this._crossFade.a), this._delayB.connect(this._crossFade.b), this._frequency.fan(this._lfoA.frequency, this._lfoB.frequency, this._crossFadeLFO.frequency), this.effectSend.fan(this._delayA, this._delayB), this._crossFade.chain(this._feedbackDelay, this.effectReturn);
                    const e = this.now();
                    this._lfoA.start(e), this._lfoB.start(e), this._crossFadeLFO.start(e), this.windowSize = this._windowSize;
                }
                static getDefaults() {
                    return Object.assign(ja.getDefaults(), {
                        pitch: 0,
                        windowSize: .1,
                        delayTime: 0,
                        feedback: 0
                    });
                }
                get pitch() {
                    return this._pitch;
                }
                set pitch(t1) {
                    this._pitch = t1;
                    let e = 0;
                    t1 < 0 ? (this._lfoA.min = 0, this._lfoA.max = this._windowSize, this._lfoB.min = 0, this._lfoB.max = this._windowSize, e = no(t1 - 1) + 1) : (this._lfoA.min = this._windowSize, this._lfoA.max = 0, this._lfoB.min = this._windowSize, this._lfoB.max = 0, e = no(t1) - 1), this._frequency.value = e * (1.2 / this._windowSize);
                }
                get windowSize() {
                    return this._windowSize;
                }
                set windowSize(t1) {
                    this._windowSize = this.toSeconds(t1), this.pitch = this._pitch;
                }
                dispose() {
                    return super.dispose(), this._frequency.dispose(), this._delayA.dispose(), this._delayB.dispose(), this._lfoA.dispose(), this._lfoB.dispose(), this._crossFade.dispose(), this._crossFadeLFO.dispose(), this._feedbackDelay.dispose(), this;
                }
            }
            class Ka extends Ia {
                constructor(){
                    super(Di(Ka.getDefaults(), arguments, [
                        "frequency",
                        "octaves",
                        "baseFrequency"
                    ])), this.name = "Phaser";
                    const t1 = Di(Ka.getDefaults(), arguments, [
                        "frequency",
                        "octaves",
                        "baseFrequency"
                    ]);
                    this._lfoL = new yr({
                        context: this.context,
                        frequency: t1.frequency,
                        min: 0,
                        max: 1
                    }), this._lfoR = new yr({
                        context: this.context,
                        frequency: t1.frequency,
                        min: 0,
                        max: 1,
                        phase: 180
                    }), this._baseFrequency = this.toFrequency(t1.baseFrequency), this._octaves = t1.octaves, this.Q = new Do({
                        context: this.context,
                        value: t1.Q,
                        units: "positive"
                    }), this._filtersL = this._makeFilters(t1.stages, this._lfoL), this._filtersR = this._makeFilters(t1.stages, this._lfoR), this.frequency = this._lfoL.frequency, this.frequency.value = t1.frequency, this.connectEffectLeft(...this._filtersL), this.connectEffectRight(...this._filtersR), this._lfoL.frequency.connect(this._lfoR.frequency), this.baseFrequency = t1.baseFrequency, this.octaves = t1.octaves, this._lfoL.start(), this._lfoR.start(), Ui(this, [
                        "frequency",
                        "Q"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(Ia.getDefaults(), {
                        frequency: .5,
                        octaves: 3,
                        stages: 10,
                        Q: 10,
                        baseFrequency: 350
                    });
                }
                _makeFilters(t1, e) {
                    const s1 = [];
                    for(let n = 0; n < t1; n++){
                        const t1 = this.context.createBiquadFilter();
                        t1.type = "allpass", this.Q.connect(t1.Q), e.connect(t1.frequency), s1.push(t1);
                    }
                    return s1;
                }
                get octaves() {
                    return this._octaves;
                }
                set octaves(t1) {
                    this._octaves = t1;
                    const e = this._baseFrequency * Math.pow(2, t1);
                    this._lfoL.max = e, this._lfoR.max = e;
                }
                get baseFrequency() {
                    return this._baseFrequency;
                }
                set baseFrequency(t1) {
                    this._baseFrequency = this.toFrequency(t1), this._lfoL.min = this._baseFrequency, this._lfoR.min = this._baseFrequency, this.octaves = this._octaves;
                }
                dispose() {
                    return super.dispose(), this.Q.dispose(), this._lfoL.dispose(), this._lfoR.dispose(), this._filtersL.forEach((t1)=>t1.disconnect()), this._filtersR.forEach((t1)=>t1.disconnect()), this.frequency.dispose(), this;
                }
            }
            class tc extends Ta {
                constructor(){
                    super(Di(tc.getDefaults(), arguments, [
                        "decay"
                    ])), this.name = "Reverb", this._convolver = this.context.createConvolver(), this.ready = Promise.resolve();
                    const t1 = Di(tc.getDefaults(), arguments, [
                        "decay"
                    ]);
                    this._decay = t1.decay, this._preDelay = t1.preDelay, this.generate(), this.connectEffect(this._convolver);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        decay: 1.5,
                        preDelay: .01
                    });
                }
                get decay() {
                    return this._decay;
                }
                set decay(t1) {
                    ei(t1 = this.toSeconds(t1), .001), this._decay = t1, this.generate();
                }
                get preDelay() {
                    return this._preDelay;
                }
                set preDelay(t1) {
                    ei(t1 = this.toSeconds(t1), 0), this._preDelay = t1, this.generate();
                }
                generate() {
                    return yi(this, void 0, void 0, function*() {
                        const t1 = this.ready, e = new Yi(2, this._decay + this._preDelay, this.context.sampleRate), s1 = new Jo({
                            context: e
                        }), n = new Jo({
                            context: e
                        }), i = new Fa({
                            context: e
                        });
                        s1.connect(i, 0, 0), n.connect(i, 0, 1);
                        const o = new ko({
                            context: e
                        }).toDestination();
                        i.connect(o), s1.start(0), n.start(0), o.gain.setValueAtTime(0, 0), o.gain.setValueAtTime(1, this._preDelay), o.gain.exponentialApproachValueAtTime(0, this._preDelay, this.decay);
                        const r = e.render();
                        return this.ready = r.then(Zi), yield t1, this._convolver.buffer = (yield r).get(), this;
                    });
                }
                dispose() {
                    return super.dispose(), this._convolver.disconnect(), this;
                }
            }
            class ec extends wo {
                constructor(){
                    super(Di(ec.getDefaults(), arguments)), this.name = "MidSideSplit", this._split = this.input = new qa({
                        channels: 2,
                        context: this.context
                    }), this._midAdd = new mr({
                        context: this.context
                    }), this.mid = new cr({
                        context: this.context,
                        value: Math.SQRT1_2
                    }), this._sideSubtract = new Dr({
                        context: this.context
                    }), this.side = new cr({
                        context: this.context,
                        value: Math.SQRT1_2
                    }), this._split.connect(this._midAdd, 0), this._split.connect(this._midAdd.addend, 1), this._split.connect(this._sideSubtract, 0), this._split.connect(this._sideSubtract.subtrahend, 1), this._midAdd.connect(this.mid), this._sideSubtract.connect(this.side);
                }
                dispose() {
                    return super.dispose(), this.mid.dispose(), this.side.dispose(), this._midAdd.dispose(), this._sideSubtract.dispose(), this._split.dispose(), this;
                }
            }
            class sc extends wo {
                constructor(){
                    super(Di(sc.getDefaults(), arguments)), this.name = "MidSideMerge", this.mid = new ko({
                        context: this.context
                    }), this.side = new ko({
                        context: this.context
                    }), this._left = new mr({
                        context: this.context
                    }), this._leftMult = new cr({
                        context: this.context,
                        value: Math.SQRT1_2
                    }), this._right = new Dr({
                        context: this.context
                    }), this._rightMult = new cr({
                        context: this.context,
                        value: Math.SQRT1_2
                    }), this._merge = this.output = new Fa({
                        context: this.context
                    }), this.mid.fan(this._left), this.side.connect(this._left.addend), this.mid.connect(this._right), this.side.connect(this._right.subtrahend), this._left.connect(this._leftMult), this._right.connect(this._rightMult), this._leftMult.connect(this._merge, 0, 0), this._rightMult.connect(this._merge, 0, 1);
                }
                dispose() {
                    return super.dispose(), this.mid.dispose(), this.side.dispose(), this._leftMult.dispose(), this._rightMult.dispose(), this._left.dispose(), this._right.dispose(), this;
                }
            }
            class nc extends Ta {
                constructor(t1){
                    super(t1), this.name = "MidSideEffect", this._midSideMerge = new sc({
                        context: this.context
                    }), this._midSideSplit = new ec({
                        context: this.context
                    }), this._midSend = this._midSideSplit.mid, this._sideSend = this._midSideSplit.side, this._midReturn = this._midSideMerge.mid, this._sideReturn = this._midSideMerge.side, this.effectSend.connect(this._midSideSplit), this._midSideMerge.connect(this.effectReturn);
                }
                connectEffectMid(...t1) {
                    this._midSend.chain(...t1, this._midReturn);
                }
                connectEffectSide(...t1) {
                    this._sideSend.chain(...t1, this._sideReturn);
                }
                dispose() {
                    return super.dispose(), this._midSideSplit.dispose(), this._midSideMerge.dispose(), this._midSend.dispose(), this._sideSend.dispose(), this._midReturn.dispose(), this._sideReturn.dispose(), this;
                }
            }
            class ic extends nc {
                constructor(){
                    super(Di(ic.getDefaults(), arguments, [
                        "width"
                    ])), this.name = "StereoWidener";
                    const t1 = Di(ic.getDefaults(), arguments, [
                        "width"
                    ]);
                    this.width = new Do({
                        context: this.context,
                        value: t1.width,
                        units: "normalRange"
                    }), Ui(this, [
                        "width"
                    ]), this._twoTimesWidthMid = new cr({
                        context: this.context,
                        value: 2
                    }), this._twoTimesWidthSide = new cr({
                        context: this.context,
                        value: 2
                    }), this._midMult = new cr({
                        context: this.context
                    }), this._twoTimesWidthMid.connect(this._midMult.factor), this.connectEffectMid(this._midMult), this._oneMinusWidth = new Dr({
                        context: this.context
                    }), this._oneMinusWidth.connect(this._twoTimesWidthMid), To(this.context.getConstant(1), this._oneMinusWidth), this.width.connect(this._oneMinusWidth.subtrahend), this._sideMult = new cr({
                        context: this.context
                    }), this.width.connect(this._twoTimesWidthSide), this._twoTimesWidthSide.connect(this._sideMult.factor), this.connectEffectSide(this._sideMult);
                }
                static getDefaults() {
                    return Object.assign(nc.getDefaults(), {
                        width: .5
                    });
                }
                dispose() {
                    return super.dispose(), this.width.dispose(), this._midMult.dispose(), this._sideMult.dispose(), this._twoTimesWidthMid.dispose(), this._twoTimesWidthSide.dispose(), this._oneMinusWidth.dispose(), this;
                }
            }
            class oc extends Ia {
                constructor(){
                    super(Di(oc.getDefaults(), arguments, [
                        "frequency",
                        "depth"
                    ])), this.name = "Tremolo";
                    const t1 = Di(oc.getDefaults(), arguments, [
                        "frequency",
                        "depth"
                    ]);
                    this._lfoL = new yr({
                        context: this.context,
                        type: t1.type,
                        min: 1,
                        max: 0
                    }), this._lfoR = new yr({
                        context: this.context,
                        type: t1.type,
                        min: 1,
                        max: 0
                    }), this._amplitudeL = new ko({
                        context: this.context
                    }), this._amplitudeR = new ko({
                        context: this.context
                    }), this.frequency = new Do({
                        context: this.context,
                        value: t1.frequency,
                        units: "frequency"
                    }), this.depth = new Do({
                        context: this.context,
                        value: t1.depth,
                        units: "normalRange"
                    }), Ui(this, [
                        "frequency",
                        "depth"
                    ]), this.connectEffectLeft(this._amplitudeL), this.connectEffectRight(this._amplitudeR), this._lfoL.connect(this._amplitudeL.gain), this._lfoR.connect(this._amplitudeR.gain), this.frequency.fan(this._lfoL.frequency, this._lfoR.frequency), this.depth.fan(this._lfoR.amplitude, this._lfoL.amplitude), this.spread = t1.spread;
                }
                static getDefaults() {
                    return Object.assign(Ia.getDefaults(), {
                        frequency: 10,
                        type: "sine",
                        depth: .5,
                        spread: 180
                    });
                }
                start(t1) {
                    return this._lfoL.start(t1), this._lfoR.start(t1), this;
                }
                stop(t1) {
                    return this._lfoL.stop(t1), this._lfoR.stop(t1), this;
                }
                sync() {
                    return this._lfoL.sync(), this._lfoR.sync(), this.context.transport.syncSignal(this.frequency), this;
                }
                unsync() {
                    return this._lfoL.unsync(), this._lfoR.unsync(), this.context.transport.unsyncSignal(this.frequency), this;
                }
                get type() {
                    return this._lfoL.type;
                }
                set type(t1) {
                    this._lfoL.type = t1, this._lfoR.type = t1;
                }
                get spread() {
                    return this._lfoR.phase - this._lfoL.phase;
                }
                set spread(t1) {
                    this._lfoL.phase = 90 - t1 / 2, this._lfoR.phase = t1 / 2 + 90;
                }
                dispose() {
                    return super.dispose(), this._lfoL.dispose(), this._lfoR.dispose(), this._amplitudeL.dispose(), this._amplitudeR.dispose(), this.frequency.dispose(), this.depth.dispose(), this;
                }
            }
            class rc extends Ta {
                constructor(){
                    super(Di(rc.getDefaults(), arguments, [
                        "frequency",
                        "depth"
                    ])), this.name = "Vibrato";
                    const t1 = Di(rc.getDefaults(), arguments, [
                        "frequency",
                        "depth"
                    ]);
                    this._delayNode = new Fo({
                        context: this.context,
                        delayTime: 0,
                        maxDelay: t1.maxDelay
                    }), this._lfo = new yr({
                        context: this.context,
                        type: t1.type,
                        min: 0,
                        max: t1.maxDelay,
                        frequency: t1.frequency,
                        phase: -90
                    }).start().connect(this._delayNode.delayTime), this.frequency = this._lfo.frequency, this.depth = this._lfo.amplitude, this.depth.value = t1.depth, Ui(this, [
                        "frequency",
                        "depth"
                    ]), this.effectSend.chain(this._delayNode, this.effectReturn);
                }
                static getDefaults() {
                    return Object.assign(Ta.getDefaults(), {
                        maxDelay: .005,
                        frequency: 5,
                        depth: .1,
                        type: "sine"
                    });
                }
                get type() {
                    return this._lfo.type;
                }
                set type(t1) {
                    this._lfo.type = t1;
                }
                dispose() {
                    return super.dispose(), this._delayNode.dispose(), this._lfo.dispose(), this.frequency.dispose(), this.depth.dispose(), this;
                }
            }
            class ac extends wo {
                constructor(){
                    super(Di(ac.getDefaults(), arguments, [
                        "type",
                        "size"
                    ])), this.name = "Analyser", this._analysers = [], this._buffers = [];
                    const t1 = Di(ac.getDefaults(), arguments, [
                        "type",
                        "size"
                    ]);
                    this.input = this.output = this._gain = new ko({
                        context: this.context
                    }), this._split = new qa({
                        context: this.context,
                        channels: t1.channels
                    }), this.input.connect(this._split), ei(t1.channels, 1);
                    for(let e = 0; e < t1.channels; e++)this._analysers[e] = this.context.createAnalyser(), this._split.connect(this._analysers[e], e, 0);
                    this.size = t1.size, this.type = t1.type;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        size: 1024,
                        smoothing: .8,
                        type: "fft",
                        channels: 1
                    });
                }
                getValue() {
                    return this._analysers.forEach((t1, e)=>{
                        const s1 = this._buffers[e];
                        "fft" === this._type ? t1.getFloatFrequencyData(s1) : "waveform" === this._type && t1.getFloatTimeDomainData(s1);
                    }), 1 === this.channels ? this._buffers[0] : this._buffers;
                }
                get size() {
                    return this._analysers[0].frequencyBinCount;
                }
                set size(t1) {
                    this._analysers.forEach((e, s1)=>{
                        e.fftSize = 2 * t1, this._buffers[s1] = new Float32Array(t1);
                    });
                }
                get channels() {
                    return this._analysers.length;
                }
                get type() {
                    return this._type;
                }
                set type(t1) {
                    ti("waveform" === t1 || "fft" === t1, "Analyser: invalid type: " + t1), this._type = t1;
                }
                get smoothing() {
                    return this._analysers[0].smoothingTimeConstant;
                }
                set smoothing(t1) {
                    this._analysers.forEach((e)=>e.smoothingTimeConstant = t1);
                }
                dispose() {
                    return super.dispose(), this._analysers.forEach((t1)=>t1.disconnect()), this._split.dispose(), this._gain.dispose(), this;
                }
            }
            class cc extends wo {
                constructor(){
                    super(Di(cc.getDefaults(), arguments)), this.name = "MeterBase", this.input = this.output = this._analyser = new ac({
                        context: this.context,
                        size: 256,
                        type: "waveform"
                    });
                }
                dispose() {
                    return super.dispose(), this._analyser.dispose(), this;
                }
            }
            class hc extends cc {
                constructor(){
                    super(Di(hc.getDefaults(), arguments, [
                        "smoothing"
                    ])), this.name = "Meter", this._rms = 0;
                    const t1 = Di(hc.getDefaults(), arguments, [
                        "smoothing"
                    ]);
                    this.input = this.output = this._analyser = new ac({
                        context: this.context,
                        size: 256,
                        type: "waveform",
                        channels: t1.channels
                    }), this.smoothing = t1.smoothing, this.normalRange = t1.normalRange;
                }
                static getDefaults() {
                    return Object.assign(cc.getDefaults(), {
                        smoothing: .8,
                        normalRange: !1,
                        channels: 1
                    });
                }
                getLevel() {
                    return ri("'getLevel' has been changed to 'getValue'"), this.getValue();
                }
                getValue() {
                    const t1 = this._analyser.getValue(), e = (1 === this.channels ? [
                        t1
                    ] : t1).map((t1)=>{
                        const e = t1.reduce((t1, e)=>t1 + e * e, 0), s1 = Math.sqrt(e / t1.length);
                        return this._rms = Math.max(s1, this._rms * this.smoothing), this.normalRange ? this._rms : so(this._rms);
                    });
                    return 1 === this.channels ? e[0] : e;
                }
                get channels() {
                    return this._analyser.channels;
                }
                dispose() {
                    return super.dispose(), this._analyser.dispose(), this;
                }
            }
            class uc extends cc {
                constructor(){
                    super(Di(uc.getDefaults(), arguments, [
                        "size"
                    ])), this.name = "FFT";
                    const t1 = Di(uc.getDefaults(), arguments, [
                        "size"
                    ]);
                    this.normalRange = t1.normalRange, this._analyser.type = "fft", this.size = t1.size;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        normalRange: !1,
                        size: 1024,
                        smoothing: .8
                    });
                }
                getValue() {
                    return this._analyser.getValue().map((t1)=>this.normalRange ? eo(t1) : t1);
                }
                get size() {
                    return this._analyser.size;
                }
                set size(t1) {
                    this._analyser.size = t1;
                }
                get smoothing() {
                    return this._analyser.smoothing;
                }
                set smoothing(t1) {
                    this._analyser.smoothing = t1;
                }
                getFrequencyOfIndex(t1) {
                    return ti(0 <= t1 && t1 < this.size, "index must be greater than or equal to 0 and less than " + this.size), t1 * this.context.sampleRate / (2 * this.size);
                }
            }
            class lc extends cc {
                constructor(){
                    super(Di(lc.getDefaults(), arguments)), this.name = "DCMeter", this._analyser.type = "waveform", this._analyser.size = 256;
                }
                getValue() {
                    return this._analyser.getValue()[0];
                }
            }
            class pc extends cc {
                constructor(){
                    super(Di(pc.getDefaults(), arguments, [
                        "size"
                    ])), this.name = "Waveform";
                    const t1 = Di(pc.getDefaults(), arguments, [
                        "size"
                    ]);
                    this._analyser.type = "waveform", this.size = t1.size;
                }
                static getDefaults() {
                    return Object.assign(cc.getDefaults(), {
                        size: 1024
                    });
                }
                getValue() {
                    return this._analyser.getValue();
                }
                get size() {
                    return this._analyser.size;
                }
                set size(t1) {
                    this._analyser.size = t1;
                }
            }
            class dc extends wo {
                constructor(){
                    super(Di(dc.getDefaults(), arguments, [
                        "solo"
                    ])), this.name = "Solo";
                    const t1 = Di(dc.getDefaults(), arguments, [
                        "solo"
                    ]);
                    this.input = this.output = new ko({
                        context: this.context
                    }), dc._allSolos.has(this.context) || dc._allSolos.set(this.context, new Set), dc._allSolos.get(this.context).add(this), this.solo = t1.solo;
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        solo: !1
                    });
                }
                get solo() {
                    return this._isSoloed();
                }
                set solo(t1) {
                    t1 ? this._addSolo() : this._removeSolo(), dc._allSolos.get(this.context).forEach((t1)=>t1._updateSolo());
                }
                get muted() {
                    return 0 === this.input.gain.value;
                }
                _addSolo() {
                    dc._soloed.has(this.context) || dc._soloed.set(this.context, new Set), dc._soloed.get(this.context).add(this);
                }
                _removeSolo() {
                    dc._soloed.has(this.context) && dc._soloed.get(this.context).delete(this);
                }
                _isSoloed() {
                    return dc._soloed.has(this.context) && dc._soloed.get(this.context).has(this);
                }
                _noSolos() {
                    return !dc._soloed.has(this.context) || dc._soloed.has(this.context) && 0 === dc._soloed.get(this.context).size;
                }
                _updateSolo() {
                    this._isSoloed() || this._noSolos() ? this.input.gain.value = 1 : this.input.gain.value = 0;
                }
                dispose() {
                    return super.dispose(), dc._allSolos.get(this.context).delete(this), this._removeSolo(), this;
                }
            }
            dc._allSolos = new Map, dc._soloed = new Map;
            class fc extends wo {
                constructor(){
                    super(Di(fc.getDefaults(), arguments, [
                        "pan",
                        "volume"
                    ])), this.name = "PanVol";
                    const t1 = Di(fc.getDefaults(), arguments, [
                        "pan",
                        "volume"
                    ]);
                    this._panner = this.input = new Ca({
                        context: this.context,
                        pan: t1.pan,
                        channelCount: t1.channelCount
                    }), this.pan = this._panner.pan, this._volume = this.output = new Go({
                        context: this.context,
                        volume: t1.volume
                    }), this.volume = this._volume.volume, this._panner.connect(this._volume), this.mute = t1.mute, Ui(this, [
                        "pan",
                        "volume"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mute: !1,
                        pan: 0,
                        volume: 0,
                        channelCount: 1
                    });
                }
                get mute() {
                    return this._volume.mute;
                }
                set mute(t1) {
                    this._volume.mute = t1;
                }
                dispose() {
                    return super.dispose(), this._panner.dispose(), this.pan.dispose(), this._volume.dispose(), this.volume.dispose(), this;
                }
            }
            class _c extends wo {
                constructor(){
                    super(Di(_c.getDefaults(), arguments, [
                        "volume",
                        "pan"
                    ])), this.name = "Channel";
                    const t1 = Di(_c.getDefaults(), arguments, [
                        "volume",
                        "pan"
                    ]);
                    this._solo = this.input = new dc({
                        solo: t1.solo,
                        context: this.context
                    }), this._panVol = this.output = new fc({
                        context: this.context,
                        pan: t1.pan,
                        volume: t1.volume,
                        mute: t1.mute,
                        channelCount: t1.channelCount
                    }), this.pan = this._panVol.pan, this.volume = this._panVol.volume, this._solo.connect(this._panVol), Ui(this, [
                        "pan",
                        "volume"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        pan: 0,
                        volume: 0,
                        mute: !1,
                        solo: !1,
                        channelCount: 1
                    });
                }
                get solo() {
                    return this._solo.solo;
                }
                set solo(t1) {
                    this._solo.solo = t1;
                }
                get muted() {
                    return this._solo.muted || this.mute;
                }
                get mute() {
                    return this._panVol.mute;
                }
                set mute(t1) {
                    this._panVol.mute = t1;
                }
                _getBus(t1) {
                    return _c.buses.has(t1) || _c.buses.set(t1, new ko({
                        context: this.context
                    })), _c.buses.get(t1);
                }
                send(t1, e = 0) {
                    const s1 = this._getBus(t1), n = new ko({
                        context: this.context,
                        units: "decibels",
                        gain: e
                    });
                    return this.connect(n), n.connect(s1), n;
                }
                receive(t1) {
                    return this._getBus(t1).connect(this), this;
                }
                dispose() {
                    return super.dispose(), this._panVol.dispose(), this.pan.dispose(), this.volume.dispose(), this._solo.dispose(), this;
                }
            }
            _c.buses = new Map;
            class mc extends wo {
                constructor(){
                    super(Di(mc.getDefaults(), arguments)), this.name = "Mono", this.input = new ko({
                        context: this.context
                    }), this._merge = this.output = new Fa({
                        channels: 2,
                        context: this.context
                    }), this.input.connect(this._merge, 0, 0), this.input.connect(this._merge, 0, 1);
                }
                dispose() {
                    return super.dispose(), this._merge.dispose(), this.input.dispose(), this;
                }
            }
            class gc extends wo {
                constructor(){
                    super(Di(gc.getDefaults(), arguments, [
                        "lowFrequency",
                        "highFrequency"
                    ])), this.name = "MultibandSplit", this.input = new ko({
                        context: this.context
                    }), this.output = void 0, this.low = new Wr({
                        context: this.context,
                        frequency: 0,
                        type: "lowpass"
                    }), this._lowMidFilter = new Wr({
                        context: this.context,
                        frequency: 0,
                        type: "highpass"
                    }), this.mid = new Wr({
                        context: this.context,
                        frequency: 0,
                        type: "lowpass"
                    }), this.high = new Wr({
                        context: this.context,
                        frequency: 0,
                        type: "highpass"
                    }), this._internalChannels = [
                        this.low,
                        this.mid,
                        this.high
                    ];
                    const t1 = Di(gc.getDefaults(), arguments, [
                        "lowFrequency",
                        "highFrequency"
                    ]);
                    this.lowFrequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.lowFrequency
                    }), this.highFrequency = new Do({
                        context: this.context,
                        units: "frequency",
                        value: t1.highFrequency
                    }), this.Q = new Do({
                        context: this.context,
                        units: "positive",
                        value: t1.Q
                    }), this.input.fan(this.low, this.high), this.input.chain(this._lowMidFilter, this.mid), this.lowFrequency.fan(this.low.frequency, this._lowMidFilter.frequency), this.highFrequency.fan(this.mid.frequency, this.high.frequency), this.Q.connect(this.low.Q), this.Q.connect(this._lowMidFilter.Q), this.Q.connect(this.mid.Q), this.Q.connect(this.high.Q), Ui(this, [
                        "high",
                        "mid",
                        "low",
                        "highFrequency",
                        "lowFrequency"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        Q: 1,
                        highFrequency: 2500,
                        lowFrequency: 400
                    });
                }
                dispose() {
                    return super.dispose(), Qi(this, [
                        "high",
                        "mid",
                        "low",
                        "highFrequency",
                        "lowFrequency"
                    ]), this.low.dispose(), this._lowMidFilter.dispose(), this.mid.dispose(), this.high.dispose(), this.lowFrequency.dispose(), this.highFrequency.dispose(), this.Q.dispose(), this;
                }
            }
            class vc extends wo {
                constructor(){
                    super(...arguments), this.name = "Listener", this.positionX = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.positionX
                    }), this.positionY = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.positionY
                    }), this.positionZ = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.positionZ
                    }), this.forwardX = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.forwardX
                    }), this.forwardY = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.forwardY
                    }), this.forwardZ = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.forwardZ
                    }), this.upX = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.upX
                    }), this.upY = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.upY
                    }), this.upZ = new xo({
                        context: this.context,
                        param: this.context.rawContext.listener.upZ
                    });
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        positionX: 0,
                        positionY: 0,
                        positionZ: 0,
                        forwardX: 0,
                        forwardY: 0,
                        forwardZ: -1,
                        upX: 0,
                        upY: 1,
                        upZ: 0
                    });
                }
                dispose() {
                    return super.dispose(), this.positionX.dispose(), this.positionY.dispose(), this.positionZ.dispose(), this.forwardX.dispose(), this.forwardY.dispose(), this.forwardZ.dispose(), this.upX.dispose(), this.upY.dispose(), this.upZ.dispose(), this;
                }
            }
            ji((t1)=>{
                t1.listener = new vc({
                    context: t1
                });
            }), zi((t1)=>{
                t1.listener.dispose();
            });
            class yc extends wo {
                constructor(){
                    super(Di(yc.getDefaults(), arguments, [
                        "positionX",
                        "positionY",
                        "positionZ"
                    ])), this.name = "Panner3D";
                    const t1 = Di(yc.getDefaults(), arguments, [
                        "positionX",
                        "positionY",
                        "positionZ"
                    ]);
                    this._panner = this.input = this.output = this.context.createPanner(), this.panningModel = t1.panningModel, this.maxDistance = t1.maxDistance, this.distanceModel = t1.distanceModel, this.coneOuterGain = t1.coneOuterGain, this.coneOuterAngle = t1.coneOuterAngle, this.coneInnerAngle = t1.coneInnerAngle, this.refDistance = t1.refDistance, this.rolloffFactor = t1.rolloffFactor, this.positionX = new xo({
                        context: this.context,
                        param: this._panner.positionX,
                        value: t1.positionX
                    }), this.positionY = new xo({
                        context: this.context,
                        param: this._panner.positionY,
                        value: t1.positionY
                    }), this.positionZ = new xo({
                        context: this.context,
                        param: this._panner.positionZ,
                        value: t1.positionZ
                    }), this.orientationX = new xo({
                        context: this.context,
                        param: this._panner.orientationX,
                        value: t1.orientationX
                    }), this.orientationY = new xo({
                        context: this.context,
                        param: this._panner.orientationY,
                        value: t1.orientationY
                    }), this.orientationZ = new xo({
                        context: this.context,
                        param: this._panner.orientationZ,
                        value: t1.orientationZ
                    });
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        coneInnerAngle: 360,
                        coneOuterAngle: 360,
                        coneOuterGain: 0,
                        distanceModel: "inverse",
                        maxDistance: 1e4,
                        orientationX: 0,
                        orientationY: 0,
                        orientationZ: 0,
                        panningModel: "equalpower",
                        positionX: 0,
                        positionY: 0,
                        positionZ: 0,
                        refDistance: 1,
                        rolloffFactor: 1
                    });
                }
                setPosition(t1, e, s1) {
                    return this.positionX.value = t1, this.positionY.value = e, this.positionZ.value = s1, this;
                }
                setOrientation(t1, e, s1) {
                    return this.orientationX.value = t1, this.orientationY.value = e, this.orientationZ.value = s1, this;
                }
                get panningModel() {
                    return this._panner.panningModel;
                }
                set panningModel(t1) {
                    this._panner.panningModel = t1;
                }
                get refDistance() {
                    return this._panner.refDistance;
                }
                set refDistance(t1) {
                    this._panner.refDistance = t1;
                }
                get rolloffFactor() {
                    return this._panner.rolloffFactor;
                }
                set rolloffFactor(t1) {
                    this._panner.rolloffFactor = t1;
                }
                get distanceModel() {
                    return this._panner.distanceModel;
                }
                set distanceModel(t1) {
                    this._panner.distanceModel = t1;
                }
                get coneInnerAngle() {
                    return this._panner.coneInnerAngle;
                }
                set coneInnerAngle(t1) {
                    this._panner.coneInnerAngle = t1;
                }
                get coneOuterAngle() {
                    return this._panner.coneOuterAngle;
                }
                set coneOuterAngle(t1) {
                    this._panner.coneOuterAngle = t1;
                }
                get coneOuterGain() {
                    return this._panner.coneOuterGain;
                }
                set coneOuterGain(t1) {
                    this._panner.coneOuterGain = t1;
                }
                get maxDistance() {
                    return this._panner.maxDistance;
                }
                set maxDistance(t1) {
                    this._panner.maxDistance = t1;
                }
                dispose() {
                    return super.dispose(), this._panner.disconnect(), this.orientationX.dispose(), this.orientationY.dispose(), this.orientationZ.dispose(), this.positionX.dispose(), this.positionY.dispose(), this.positionZ.dispose(), this;
                }
            }
            class xc extends wo {
                constructor(){
                    super(Di(xc.getDefaults(), arguments)), this.name = "Recorder";
                    const t1 = Di(xc.getDefaults(), arguments);
                    this.input = new ko({
                        context: this.context
                    }), ti(xc.supported, "Media Recorder API is not available"), this._stream = this.context.createMediaStreamDestination(), this.input.connect(this._stream), this._recorder = new MediaRecorder(this._stream.stream, {
                        mimeType: t1.mimeType
                    });
                }
                static getDefaults() {
                    return wo.getDefaults();
                }
                get mimeType() {
                    return this._recorder.mimeType;
                }
                static get supported() {
                    return null !== mi && Reflect.has(mi, "MediaRecorder");
                }
                get state() {
                    return "inactive" === this._recorder.state ? "stopped" : "paused" === this._recorder.state ? "paused" : "started";
                }
                start() {
                    return yi(this, void 0, void 0, function*() {
                        ti("started" !== this.state, "Recorder is already started");
                        const t1 = new Promise((t1)=>{
                            const e = ()=>{
                                this._recorder.removeEventListener("start", e, !1), t1();
                            };
                            this._recorder.addEventListener("start", e, !1);
                        });
                        return this._recorder.start(), yield t1;
                    });
                }
                stop() {
                    return yi(this, void 0, void 0, function*() {
                        ti("stopped" !== this.state, "Recorder is not started");
                        const t1 = new Promise((t1)=>{
                            const e = (s1)=>{
                                this._recorder.removeEventListener("dataavailable", e, !1), t1(s1.data);
                            };
                            this._recorder.addEventListener("dataavailable", e, !1);
                        });
                        return this._recorder.stop(), yield t1;
                    });
                }
                pause() {
                    return ti("started" === this.state, "Recorder must be started"), this._recorder.pause(), this;
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this._stream.disconnect(), this;
                }
            }
            class wc extends wo {
                constructor(){
                    super(Di(wc.getDefaults(), arguments, [
                        "threshold",
                        "ratio"
                    ])), this.name = "Compressor", this._compressor = this.context.createDynamicsCompressor(), this.input = this._compressor, this.output = this._compressor;
                    const t1 = Di(wc.getDefaults(), arguments, [
                        "threshold",
                        "ratio"
                    ]);
                    this.threshold = new xo({
                        minValue: this._compressor.threshold.minValue,
                        maxValue: this._compressor.threshold.maxValue,
                        context: this.context,
                        convert: !1,
                        param: this._compressor.threshold,
                        units: "decibels",
                        value: t1.threshold
                    }), this.attack = new xo({
                        minValue: this._compressor.attack.minValue,
                        maxValue: this._compressor.attack.maxValue,
                        context: this.context,
                        param: this._compressor.attack,
                        units: "time",
                        value: t1.attack
                    }), this.release = new xo({
                        minValue: this._compressor.release.minValue,
                        maxValue: this._compressor.release.maxValue,
                        context: this.context,
                        param: this._compressor.release,
                        units: "time",
                        value: t1.release
                    }), this.knee = new xo({
                        minValue: this._compressor.knee.minValue,
                        maxValue: this._compressor.knee.maxValue,
                        context: this.context,
                        convert: !1,
                        param: this._compressor.knee,
                        units: "decibels",
                        value: t1.knee
                    }), this.ratio = new xo({
                        minValue: this._compressor.ratio.minValue,
                        maxValue: this._compressor.ratio.maxValue,
                        context: this.context,
                        convert: !1,
                        param: this._compressor.ratio,
                        units: "positive",
                        value: t1.ratio
                    }), Ui(this, [
                        "knee",
                        "release",
                        "attack",
                        "ratio",
                        "threshold"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        attack: .003,
                        knee: 30,
                        ratio: 12,
                        release: .25,
                        threshold: -24
                    });
                }
                get reduction() {
                    return this._compressor.reduction;
                }
                dispose() {
                    return super.dispose(), this._compressor.disconnect(), this.attack.dispose(), this.release.dispose(), this.threshold.dispose(), this.ratio.dispose(), this.knee.dispose(), this;
                }
            }
            class bc extends wo {
                constructor(){
                    super(Object.assign(Di(bc.getDefaults(), arguments, [
                        "threshold",
                        "smoothing"
                    ]))), this.name = "Gate";
                    const t1 = Di(bc.getDefaults(), arguments, [
                        "threshold",
                        "smoothing"
                    ]);
                    this._follower = new Da({
                        context: this.context,
                        smoothing: t1.smoothing
                    }), this._gt = new Mr({
                        context: this.context,
                        value: eo(t1.threshold)
                    }), this.input = new ko({
                        context: this.context
                    }), this._gate = this.output = new ko({
                        context: this.context
                    }), this.input.connect(this._gate), this.input.chain(this._follower, this._gt, this._gate.gain);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        smoothing: .1,
                        threshold: -40
                    });
                }
                get threshold() {
                    return so(this._gt.value);
                }
                set threshold(t1) {
                    this._gt.value = eo(t1);
                }
                get smoothing() {
                    return this._follower.smoothing;
                }
                set smoothing(t1) {
                    this._follower.smoothing = t1;
                }
                dispose() {
                    return super.dispose(), this.input.dispose(), this._follower.dispose(), this._gt.dispose(), this._gate.dispose(), this;
                }
            }
            class Tc extends wo {
                constructor(){
                    super(Object.assign(Di(Tc.getDefaults(), arguments, [
                        "threshold"
                    ]))), this.name = "Limiter";
                    const t1 = Di(Tc.getDefaults(), arguments, [
                        "threshold"
                    ]);
                    this._compressor = this.input = this.output = new wc({
                        context: this.context,
                        ratio: 20,
                        attack: .003,
                        release: .01,
                        threshold: t1.threshold
                    }), this.threshold = this._compressor.threshold, Ui(this, "threshold");
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        threshold: -12
                    });
                }
                get reduction() {
                    return this._compressor.reduction;
                }
                dispose() {
                    return super.dispose(), this._compressor.dispose(), this.threshold.dispose(), this;
                }
            }
            class Sc extends wo {
                constructor(){
                    super(Object.assign(Di(Sc.getDefaults(), arguments))), this.name = "MidSideCompressor";
                    const t1 = Di(Sc.getDefaults(), arguments);
                    this._midSideSplit = this.input = new ec({
                        context: this.context
                    }), this._midSideMerge = this.output = new sc({
                        context: this.context
                    }), this.mid = new wc(Object.assign(t1.mid, {
                        context: this.context
                    })), this.side = new wc(Object.assign(t1.side, {
                        context: this.context
                    })), this._midSideSplit.mid.chain(this.mid, this._midSideMerge.mid), this._midSideSplit.side.chain(this.side, this._midSideMerge.side), Ui(this, [
                        "mid",
                        "side"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        mid: {
                            ratio: 3,
                            threshold: -24,
                            release: .03,
                            attack: .02,
                            knee: 16
                        },
                        side: {
                            ratio: 6,
                            threshold: -30,
                            release: .25,
                            attack: .03,
                            knee: 10
                        }
                    });
                }
                dispose() {
                    return super.dispose(), this.mid.dispose(), this.side.dispose(), this._midSideSplit.dispose(), this._midSideMerge.dispose(), this;
                }
            }
            class kc extends wo {
                constructor(){
                    super(Object.assign(Di(kc.getDefaults(), arguments))), this.name = "MultibandCompressor";
                    const t1 = Di(kc.getDefaults(), arguments);
                    this._splitter = this.input = new gc({
                        context: this.context,
                        lowFrequency: t1.lowFrequency,
                        highFrequency: t1.highFrequency
                    }), this.lowFrequency = this._splitter.lowFrequency, this.highFrequency = this._splitter.highFrequency, this.output = new ko({
                        context: this.context
                    }), this.low = new wc(Object.assign(t1.low, {
                        context: this.context
                    })), this.mid = new wc(Object.assign(t1.mid, {
                        context: this.context
                    })), this.high = new wc(Object.assign(t1.high, {
                        context: this.context
                    })), this._splitter.low.chain(this.low, this.output), this._splitter.mid.chain(this.mid, this.output), this._splitter.high.chain(this.high, this.output), Ui(this, [
                        "high",
                        "mid",
                        "low",
                        "highFrequency",
                        "lowFrequency"
                    ]);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        lowFrequency: 250,
                        highFrequency: 2e3,
                        low: {
                            ratio: 6,
                            threshold: -30,
                            release: .25,
                            attack: .03,
                            knee: 10
                        },
                        mid: {
                            ratio: 3,
                            threshold: -24,
                            release: .03,
                            attack: .02,
                            knee: 16
                        },
                        high: {
                            ratio: 3,
                            threshold: -24,
                            release: .03,
                            attack: .02,
                            knee: 16
                        }
                    });
                }
                dispose() {
                    return super.dispose(), this._splitter.dispose(), this.low.dispose(), this.mid.dispose(), this.high.dispose(), this.output.dispose(), this;
                }
            }
            class Cc extends wo {
                constructor(){
                    super(Di(Cc.getDefaults(), arguments, [
                        "low",
                        "mid",
                        "high"
                    ])), this.name = "EQ3", this.output = new ko({
                        context: this.context
                    }), this._internalChannels = [];
                    const t1 = Di(Cc.getDefaults(), arguments, [
                        "low",
                        "mid",
                        "high"
                    ]);
                    this.input = this._multibandSplit = new gc({
                        context: this.context,
                        highFrequency: t1.highFrequency,
                        lowFrequency: t1.lowFrequency
                    }), this._lowGain = new ko({
                        context: this.context,
                        gain: t1.low,
                        units: "decibels"
                    }), this._midGain = new ko({
                        context: this.context,
                        gain: t1.mid,
                        units: "decibels"
                    }), this._highGain = new ko({
                        context: this.context,
                        gain: t1.high,
                        units: "decibels"
                    }), this.low = this._lowGain.gain, this.mid = this._midGain.gain, this.high = this._highGain.gain, this.Q = this._multibandSplit.Q, this.lowFrequency = this._multibandSplit.lowFrequency, this.highFrequency = this._multibandSplit.highFrequency, this._multibandSplit.low.chain(this._lowGain, this.output), this._multibandSplit.mid.chain(this._midGain, this.output), this._multibandSplit.high.chain(this._highGain, this.output), Ui(this, [
                        "low",
                        "mid",
                        "high",
                        "lowFrequency",
                        "highFrequency"
                    ]), this._internalChannels = [
                        this._multibandSplit
                    ];
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        high: 0,
                        highFrequency: 2500,
                        low: 0,
                        lowFrequency: 400,
                        mid: 0
                    });
                }
                dispose() {
                    return super.dispose(), Qi(this, [
                        "low",
                        "mid",
                        "high",
                        "lowFrequency",
                        "highFrequency"
                    ]), this._multibandSplit.dispose(), this.lowFrequency.dispose(), this.highFrequency.dispose(), this._lowGain.dispose(), this._midGain.dispose(), this._highGain.dispose(), this.low.dispose(), this.mid.dispose(), this.high.dispose(), this.Q.dispose(), this;
                }
            }
            class Ac extends wo {
                constructor(){
                    super(Di(Ac.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ])), this.name = "Convolver", this._convolver = this.context.createConvolver();
                    const t1 = Di(Ac.getDefaults(), arguments, [
                        "url",
                        "onload"
                    ]);
                    this._buffer = new Xi(t1.url, (e)=>{
                        this.buffer = e, t1.onload();
                    }), this.input = new ko({
                        context: this.context
                    }), this.output = new ko({
                        context: this.context
                    }), this._buffer.loaded && (this.buffer = this._buffer), this.normalize = t1.normalize, this.input.chain(this._convolver, this.output);
                }
                static getDefaults() {
                    return Object.assign(wo.getDefaults(), {
                        normalize: !0,
                        onload: Zi
                    });
                }
                load(t1) {
                    return yi(this, void 0, void 0, function*() {
                        this.buffer = yield this._buffer.load(t1);
                    });
                }
                get buffer() {
                    return this._buffer.length ? this._buffer : null;
                }
                set buffer(t1) {
                    t1 && this._buffer.set(t1), this._convolver.buffer && (this.input.disconnect(), this._convolver.disconnect(), this._convolver = this.context.createConvolver(), this.input.chain(this._convolver, this.output));
                    const e = this._buffer.get();
                    this._convolver.buffer = e || null;
                }
                get normalize() {
                    return this._convolver.normalize;
                }
                set normalize(t1) {
                    this._convolver.normalize = t1;
                }
                dispose() {
                    return super.dispose(), this._buffer.dispose(), this._convolver.disconnect(), this;
                }
            }
            function Dc() {
                return Ji().now();
            }
            function Oc() {
                return Ji().immediate();
            }
            const Mc = Ji().transport;
            function Ec() {
                return Ji().transport;
            }
            const Rc = Ji().destination, qc = Ji().destination;
            function Fc() {
                return Ji().destination;
            }
            const Ic = Ji().listener;
            function Vc() {
                return Ji().listener;
            }
            const Nc = Ji().draw;
            function Pc() {
                return Ji().draw;
            }
            const jc = Ji();
            function Lc() {
                return Xi.loaded();
            }
            const zc = Xi, Bc = Vo, Wc = $o;
        }
    ]);
});

//# sourceMappingURL=index.7c3ae29c.js.map
