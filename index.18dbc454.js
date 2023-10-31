// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"46McK":[function(require,module,exports) {
var global = arguments[3];
var HMR_HOST = null;
var HMR_PORT = null;
var HMR_SECURE = false;
var HMR_ENV_HASH = "d6ea1d42532a7575";
module.bundle.HMR_BUNDLE_ID = "0bcb44a518dbc454";
"use strict";
/* global HMR_HOST, HMR_PORT, HMR_ENV_HASH, HMR_SECURE, chrome, browser, __parcel__import__, __parcel__importScripts__, ServiceWorkerGlobalScope */ /*::
import type {
  HMRAsset,
  HMRMessage,
} from '@parcel/reporter-dev-server/src/HMRServer.js';
interface ParcelRequire {
  (string): mixed;
  cache: {|[string]: ParcelModule|};
  hotData: {|[string]: mixed|};
  Module: any;
  parent: ?ParcelRequire;
  isParcelRequire: true;
  modules: {|[string]: [Function, {|[string]: string|}]|};
  HMR_BUNDLE_ID: string;
  root: ParcelRequire;
}
interface ParcelModule {
  hot: {|
    data: mixed,
    accept(cb: (Function) => void): void,
    dispose(cb: (mixed) => void): void,
    // accept(deps: Array<string> | string, cb: (Function) => void): void,
    // decline(): void,
    _acceptCallbacks: Array<(Function) => void>,
    _disposeCallbacks: Array<(mixed) => void>,
  |};
}
interface ExtensionContext {
  runtime: {|
    reload(): void,
    getURL(url: string): string;
    getManifest(): {manifest_version: number, ...};
  |};
}
declare var module: {bundle: ParcelRequire, ...};
declare var HMR_HOST: string;
declare var HMR_PORT: string;
declare var HMR_ENV_HASH: string;
declare var HMR_SECURE: boolean;
declare var chrome: ExtensionContext;
declare var browser: ExtensionContext;
declare var __parcel__import__: (string) => Promise<void>;
declare var __parcel__importScripts__: (string) => Promise<void>;
declare var globalThis: typeof self;
declare var ServiceWorkerGlobalScope: Object;
*/ var OVERLAY_ID = "__parcel__error__overlay__";
var OldModule = module.bundle.Module;
function Module(moduleName) {
    OldModule.call(this, moduleName);
    this.hot = {
        data: module.bundle.hotData[moduleName],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(fn) {
            this._acceptCallbacks.push(fn || function() {});
        },
        dispose: function(fn) {
            this._disposeCallbacks.push(fn);
        }
    };
    module.bundle.hotData[moduleName] = undefined;
}
module.bundle.Module = Module;
module.bundle.hotData = {};
var checkedAssets /*: {|[string]: boolean|} */ , assetsToDispose /*: Array<[ParcelRequire, string]> */ , assetsToAccept /*: Array<[ParcelRequire, string]> */ ;
function getHostname() {
    return HMR_HOST || (location.protocol.indexOf("http") === 0 ? location.hostname : "localhost");
}
function getPort() {
    return HMR_PORT || location.port;
}
// eslint-disable-next-line no-redeclare
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== "undefined") {
    var hostname = getHostname();
    var port = getPort();
    var protocol = HMR_SECURE || location.protocol == "https:" && !/localhost|127.0.0.1|0.0.0.0/.test(hostname) ? "wss" : "ws";
    var ws;
    try {
        ws = new WebSocket(protocol + "://" + hostname + (port ? ":" + port : "") + "/");
    } catch (err) {
        if (err.message) console.error(err.message);
        ws = {};
    }
    // Web extension context
    var extCtx = typeof browser === "undefined" ? typeof chrome === "undefined" ? null : chrome : browser;
    // Safari doesn't support sourceURL in error stacks.
    // eval may also be disabled via CSP, so do a quick check.
    var supportsSourceURL = false;
    try {
        (0, eval)('throw new Error("test"); //# sourceURL=test.js');
    } catch (err) {
        supportsSourceURL = err.stack.includes("test.js");
    }
    // $FlowFixMe
    ws.onmessage = async function(event /*: {data: string, ...} */ ) {
        checkedAssets = {} /*: {|[string]: boolean|} */ ;
        assetsToAccept = [];
        assetsToDispose = [];
        var data /*: HMRMessage */  = JSON.parse(event.data);
        if (data.type === "update") {
            // Remove error overlay if there is one
            if (typeof document !== "undefined") removeErrorOverlay();
            let assets = data.assets.filter((asset)=>asset.envHash === HMR_ENV_HASH);
            // Handle HMR Update
            let handled = assets.every((asset)=>{
                return asset.type === "css" || asset.type === "js" && hmrAcceptCheck(module.bundle.root, asset.id, asset.depsByBundle);
            });
            if (handled) {
                console.clear();
                // Dispatch custom event so other runtimes (e.g React Refresh) are aware.
                if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") window.dispatchEvent(new CustomEvent("parcelhmraccept"));
                await hmrApplyUpdates(assets);
                // Dispose all old assets.
                let processedAssets = {} /*: {|[string]: boolean|} */ ;
                for(let i = 0; i < assetsToDispose.length; i++){
                    let id = assetsToDispose[i][1];
                    if (!processedAssets[id]) {
                        hmrDispose(assetsToDispose[i][0], id);
                        processedAssets[id] = true;
                    }
                }
                // Run accept callbacks. This will also re-execute other disposed assets in topological order.
                processedAssets = {};
                for(let i = 0; i < assetsToAccept.length; i++){
                    let id = assetsToAccept[i][1];
                    if (!processedAssets[id]) {
                        hmrAccept(assetsToAccept[i][0], id);
                        processedAssets[id] = true;
                    }
                }
            } else fullReload();
        }
        if (data.type === "error") {
            // Log parcel errors to console
            for (let ansiDiagnostic of data.diagnostics.ansi){
                let stack = ansiDiagnostic.codeframe ? ansiDiagnostic.codeframe : ansiDiagnostic.stack;
                console.error("\uD83D\uDEA8 [parcel]: " + ansiDiagnostic.message + "\n" + stack + "\n\n" + ansiDiagnostic.hints.join("\n"));
            }
            if (typeof document !== "undefined") {
                // Render the fancy html overlay
                removeErrorOverlay();
                var overlay = createErrorOverlay(data.diagnostics.html);
                // $FlowFixMe
                document.body.appendChild(overlay);
            }
        }
    };
    ws.onerror = function(e) {
        if (e.message) console.error(e.message);
    };
    ws.onclose = function() {
        console.warn("[parcel] \uD83D\uDEA8 Connection to the HMR server was lost");
    };
}
function removeErrorOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        console.log("[parcel] \u2728 Error resolved");
    }
}
function createErrorOverlay(diagnostics) {
    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    let errorHTML = '<div style="background: black; opacity: 0.85; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; font-family: Menlo, Consolas, monospace; z-index: 9999;">';
    for (let diagnostic of diagnostics){
        let stack = diagnostic.frames.length ? diagnostic.frames.reduce((p, frame)=>{
            return `${p}
<a href="/__parcel_launch_editor?file=${encodeURIComponent(frame.location)}" style="text-decoration: underline; color: #888" onclick="fetch(this.href); return false">${frame.location}</a>
${frame.code}`;
        }, "") : diagnostic.stack;
        errorHTML += `
      <div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 20px;">
          \u{1F6A8} ${diagnostic.message}
        </div>
        <pre>${stack}</pre>
        <div>
          ${diagnostic.hints.map((hint)=>"<div>\uD83D\uDCA1 " + hint + "</div>").join("")}
        </div>
        ${diagnostic.documentation ? `<div>\u{1F4DD} <a style="color: violet" href="${diagnostic.documentation}" target="_blank">Learn more</a></div>` : ""}
      </div>
    `;
    }
    errorHTML += "</div>";
    overlay.innerHTML = errorHTML;
    return overlay;
}
function fullReload() {
    if ("reload" in location) location.reload();
    else if (extCtx && extCtx.runtime && extCtx.runtime.reload) extCtx.runtime.reload();
}
function getParents(bundle, id) /*: Array<[ParcelRequire, string]> */ {
    var modules = bundle.modules;
    if (!modules) return [];
    var parents = [];
    var k, d, dep;
    for(k in modules)for(d in modules[k][1]){
        dep = modules[k][1][d];
        if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) parents.push([
            bundle,
            k
        ]);
    }
    if (bundle.parent) parents = parents.concat(getParents(bundle.parent, id));
    return parents;
}
function updateLink(link) {
    var href = link.getAttribute("href");
    if (!href) return;
    var newLink = link.cloneNode();
    newLink.onload = function() {
        if (link.parentNode !== null) // $FlowFixMe
        link.parentNode.removeChild(link);
    };
    newLink.setAttribute("href", // $FlowFixMe
    href.split("?")[0] + "?" + Date.now());
    // $FlowFixMe
    link.parentNode.insertBefore(newLink, link.nextSibling);
}
var cssTimeout = null;
function reloadCSS() {
    if (cssTimeout) return;
    cssTimeout = setTimeout(function() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for(var i = 0; i < links.length; i++){
            // $FlowFixMe[incompatible-type]
            var href /*: string */  = links[i].getAttribute("href");
            var hostname = getHostname();
            var servedFromHMRServer = hostname === "localhost" ? new RegExp("^(https?:\\/\\/(0.0.0.0|127.0.0.1)|localhost):" + getPort()).test(href) : href.indexOf(hostname + ":" + getPort());
            var absolute = /^https?:\/\//i.test(href) && href.indexOf(location.origin) !== 0 && !servedFromHMRServer;
            if (!absolute) updateLink(links[i]);
        }
        cssTimeout = null;
    }, 50);
}
function hmrDownload(asset) {
    if (asset.type === "js") {
        if (typeof document !== "undefined") {
            let script = document.createElement("script");
            script.src = asset.url + "?t=" + Date.now();
            if (asset.outputFormat === "esmodule") script.type = "module";
            return new Promise((resolve, reject)=>{
                var _document$head;
                script.onload = ()=>resolve(script);
                script.onerror = reject;
                (_document$head = document.head) === null || _document$head === void 0 || _document$head.appendChild(script);
            });
        } else if (typeof importScripts === "function") {
            // Worker scripts
            if (asset.outputFormat === "esmodule") return import(asset.url + "?t=" + Date.now());
            else return new Promise((resolve, reject)=>{
                try {
                    importScripts(asset.url + "?t=" + Date.now());
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        }
    }
}
async function hmrApplyUpdates(assets) {
    global.parcelHotUpdate = Object.create(null);
    let scriptsToRemove;
    try {
        // If sourceURL comments aren't supported in eval, we need to load
        // the update from the dev server over HTTP so that stack traces
        // are correct in errors/logs. This is much slower than eval, so
        // we only do it if needed (currently just Safari).
        // https://bugs.webkit.org/show_bug.cgi?id=137297
        // This path is also taken if a CSP disallows eval.
        if (!supportsSourceURL) {
            let promises = assets.map((asset)=>{
                var _hmrDownload;
                return (_hmrDownload = hmrDownload(asset)) === null || _hmrDownload === void 0 ? void 0 : _hmrDownload.catch((err)=>{
                    // Web extension fix
                    if (extCtx && extCtx.runtime && extCtx.runtime.getManifest().manifest_version == 3 && typeof ServiceWorkerGlobalScope != "undefined" && global instanceof ServiceWorkerGlobalScope) {
                        extCtx.runtime.reload();
                        return;
                    }
                    throw err;
                });
            });
            scriptsToRemove = await Promise.all(promises);
        }
        assets.forEach(function(asset) {
            hmrApply(module.bundle.root, asset);
        });
    } finally{
        delete global.parcelHotUpdate;
        if (scriptsToRemove) scriptsToRemove.forEach((script)=>{
            if (script) {
                var _document$head2;
                (_document$head2 = document.head) === null || _document$head2 === void 0 || _document$head2.removeChild(script);
            }
        });
    }
}
function hmrApply(bundle /*: ParcelRequire */ , asset /*:  HMRAsset */ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (asset.type === "css") reloadCSS();
    else if (asset.type === "js") {
        let deps = asset.depsByBundle[bundle.HMR_BUNDLE_ID];
        if (deps) {
            if (modules[asset.id]) {
                // Remove dependencies that are removed and will become orphaned.
                // This is necessary so that if the asset is added back again, the cache is gone, and we prevent a full page reload.
                let oldDeps = modules[asset.id][1];
                for(let dep in oldDeps)if (!deps[dep] || deps[dep] !== oldDeps[dep]) {
                    let id = oldDeps[dep];
                    let parents = getParents(module.bundle.root, id);
                    if (parents.length === 1) hmrDelete(module.bundle.root, id);
                }
            }
            if (supportsSourceURL) // Global eval. We would use `new Function` here but browser
            // support for source maps is better with eval.
            (0, eval)(asset.output);
            // $FlowFixMe
            let fn = global.parcelHotUpdate[asset.id];
            modules[asset.id] = [
                fn,
                deps
            ];
        } else if (bundle.parent) hmrApply(bundle.parent, asset);
    }
}
function hmrDelete(bundle, id) {
    let modules = bundle.modules;
    if (!modules) return;
    if (modules[id]) {
        // Collect dependencies that will become orphaned when this module is deleted.
        let deps = modules[id][1];
        let orphans = [];
        for(let dep in deps){
            let parents = getParents(module.bundle.root, deps[dep]);
            if (parents.length === 1) orphans.push(deps[dep]);
        }
        // Delete the module. This must be done before deleting dependencies in case of circular dependencies.
        delete modules[id];
        delete bundle.cache[id];
        // Now delete the orphans.
        orphans.forEach((id)=>{
            hmrDelete(module.bundle.root, id);
        });
    } else if (bundle.parent) hmrDelete(bundle.parent, id);
}
function hmrAcceptCheck(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    if (hmrAcceptCheckOne(bundle, id, depsByBundle)) return true;
    // Traverse parents breadth first. All possible ancestries must accept the HMR update, or we'll reload.
    let parents = getParents(module.bundle.root, id);
    let accepted = false;
    while(parents.length > 0){
        let v = parents.shift();
        let a = hmrAcceptCheckOne(v[0], v[1], null);
        if (a) // If this parent accepts, stop traversing upward, but still consider siblings.
        accepted = true;
        else {
            // Otherwise, queue the parents in the next level upward.
            let p = getParents(module.bundle.root, v[1]);
            if (p.length === 0) {
                // If there are no parents, then we've reached an entry without accepting. Reload.
                accepted = false;
                break;
            }
            parents.push(...p);
        }
    }
    return accepted;
}
function hmrAcceptCheckOne(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (depsByBundle && !depsByBundle[bundle.HMR_BUNDLE_ID]) {
        // If we reached the root bundle without finding where the asset should go,
        // there's nothing to do. Mark as "accepted" so we don't reload the page.
        if (!bundle.parent) return true;
        return hmrAcceptCheck(bundle.parent, id, depsByBundle);
    }
    if (checkedAssets[id]) return true;
    checkedAssets[id] = true;
    var cached = bundle.cache[id];
    assetsToDispose.push([
        bundle,
        id
    ]);
    if (!cached || cached.hot && cached.hot._acceptCallbacks.length) {
        assetsToAccept.push([
            bundle,
            id
        ]);
        return true;
    }
}
function hmrDispose(bundle /*: ParcelRequire */ , id /*: string */ ) {
    var cached = bundle.cache[id];
    bundle.hotData[id] = {};
    if (cached && cached.hot) cached.hot.data = bundle.hotData[id];
    if (cached && cached.hot && cached.hot._disposeCallbacks.length) cached.hot._disposeCallbacks.forEach(function(cb) {
        cb(bundle.hotData[id]);
    });
    delete bundle.cache[id];
}
function hmrAccept(bundle /*: ParcelRequire */ , id /*: string */ ) {
    // Execute the module.
    bundle(id);
    // Run the accept callbacks in the new version of the module.
    var cached = bundle.cache[id];
    if (cached && cached.hot && cached.hot._acceptCallbacks.length) cached.hot._acceptCallbacks.forEach(function(cb) {
        var assetsToAlsoAccept = cb(function() {
            return getParents(module.bundle.root, id);
        });
        if (assetsToAlsoAccept && assetsToAccept.length) {
            assetsToAlsoAccept.forEach(function(a) {
                hmrDispose(a[0], a[1]);
            });
            // $FlowFixMe[method-unbinding]
            assetsToAccept.push.apply(assetsToAccept, assetsToAlsoAccept);
        }
    });
}

},{}],"1SICI":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: Main bundler script for 2groove web app.
// import "./../styles/mainUI.css";
// ----------------------------
// ----------------------------
var _drSamplerJs = require("./drSampler.js");
// import "./efx.js";
var _globalFetchJs = require("./globalFetch.js");
var _interfaceJs = require("./interface.js");
var _midiBroadcastJs = require("./midiBroadcast.js");
var _pRollJs = require("./pRoll.js");
var _workerAjaxJs = require("./workers/workerAjax.js");
var _workerQueueJs = require("./workers/workerQueue.js"); // ----------------------------
 // ----------------------------

},{"./drSampler.js":"9cCOD","./globalFetch.js":"hwnEt","./interface.js":"kBoq1","./midiBroadcast.js":"lFIIu","./pRoll.js":"6uEKS","./workers/workerAjax.js":"6ZafJ","./workers/workerQueue.js":"7u5lR"}],"9cCOD":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: MIDI Drum Sampler for 2groove web app.
// import { delay, eq, reverb } from "./efx.js";
var _samplesJs = require("./samples.js");
const drumParts = [
    "closed-hihat",
    "open-hihat",
    "crash",
    "ride",
    "kick",
    "snare",
    "hi-tom",
    "mid-tom",
    "floor-tom"
];
const samplers = {};
drumParts.forEach((drum)=>{
    const drumSamples = {};
    (0, _samplesJs.samples)[drum].forEach((samplePath, index)=>{
        const noteName = Tone.Frequency(60 + index, "midi").toNote();
        drumSamples[noteName] = samplePath;
    });
    samplers[drum] = new Tone.Sampler({
        urls: drumSamples
    }).toDestination();
});
// Function to map MIDI velocity to the appropriate sample note
function mapVelocityToSample(velocity) {
    const numberOfSamples = 12;
    // 0–127 divided into 12 segments
    const segment = Math.ceil(128 / numberOfSamples);
    // Calculate the sample index (1–12) based on the velocity
    const sampleIndex = Math.ceil(velocity / segment);
    // Calculate the MIDI note number (60 is C3, 71 is B3)
    const noteNumber = 60 + sampleIndex - 1;
    // Convert the MIDI note number to note name (C3, C#3, D3, ...)
    return Tone.Frequency(noteNumber, "midi").toNote();
}
// Dict to map MIDI note number to the appropriate sample note
const drumMappings = {
    "C1": "kick",
    "D1": "snare",
    "F1": "floor-tom",
    "B1": "mid-tom",
    "C2": "hi-tom",
    "C#2": "crash",
    "D#2": "ride",
    "F#1": "closed-hihat",
    "A#1": "open-hihat"
};
// TODO: helper function to apply the envelope to a given sampler
const drumADSR = {
    "closed-hihat": {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.1
    },
    "open-hihat": {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "crash": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "ride": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "kick": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "snare": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "hi-tom": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "mid-tom": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    },
    "floor-tom": {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
    }
};
function applyEnvelope(envParams, duration) {
    // Duration defaults to 0.5 if not provided TODO: Calculate the duration for each beat
    // duration = duration || 0.5;
    // Create the envelope with the provided parameters
    const env = new Tone.Envelope(envParams).toDestination();
    // Connect the envelope to the sampler
    // sampler.connect(env);
    // Trigger the envelope
    env.triggerAttackRelease(duration);
}
// When processing MIDI data in software, developers often use conditional statements like if (status === 144) to check the type of MIDI message received and to handle it accordingly. 
// In this particular case, the software would execute specific logic for "Note On" messages on channel 1.
// The MIDI message is an array of integers. The first integer is the status byte, which contains the message type and the MIDI channel.
function onMIDIMessageReceived(message, verbose = false) {
    if (isListening) {
        const [status, noteNumber, velocity] = message.data;
        const noteName = Tone.Frequency(noteNumber - 12, "midi").toNote();
        const drumType = drumMappings[noteName];
        if (verbose) {
            // console.log(typeof noteName);
            console.log(noteNumber, noteName, velocity); // buraya kadar tamam.
            console.log("drumType: ", drumType);
        }
        // AR for each drum part
        const hitDuration = {
            "closed-hihat": "1n",
            "open-hihat": "2n",
            "crash": "1n",
            "ride": "1n",
            "kick": "8n",
            "snare": "2n",
            "hi-tom": "4n",
            "mid-tom": "4n",
            "floor-tom": "4n"
        };
        if (status === 144 && drumMappings[noteName]) {
            // const drumType = drumMappings[noteName];
            const noteToTrigger = mapVelocityToSample(velocity); // assume `velocity` is provided by MIDI
            // console.log(`Drum type and note to trigger: ${drumType} ${noteToTrigger}`);
            if (drumType) {
                // Lookup the appropriate sampler using the drumType
                const sampler = samplers[drumType];
                // Trigger the sound w/ a simple Attack-Release envelope TODO: Make better envelopes!
                sampler.triggerAttackRelease(noteToTrigger, hitDuration[drumType]);
            // sampler.chain(eq, delay, reverb); // EFX chain
            } else console.error(`No mappings found for drum type: ${drumType}`);
        }
    }
}
// // WITH THE OLD UI:
//VARIABLES
// // Variable to keep track of the playback state
// let isListening = false;
// // Grab the button from the UI
// const toggleListeningButton = document.getElementById('togglePlaybackButton');
// //EVENT LISTENERS
// // Add an event listener to the button
// toggleListeningButton.addEventListener('click', toggleListening);
// // Handle button click
// function toggleListening() {
//     isListening = !isListening; // Toggle the listening state
//     // Update button text based on the current state // Note that we are not doing it anymore with the new GUI
//     // toggleListeningButton.textContent = isListening ? 'Stop Listening' : 'Start Listening';
//   }
//   if (navigator.requestMIDIAccess) { // request MIDI access
//     navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
//   } else {
//     console.error('WebMIDI is not supported in this browser.');
//   }
// WITH THE NEW UI:
// Instead of using the click event on the button, 
// we will use the change event on the checkbox (since that's what you have now).
// Instead of toggling button text (since there's no text now), 
// we'll toggle the checkbox's checked state.
// Variable to keep track of the playback state
let isListening = false;
// Grab the checkbox from the UI
const toggleListeningCheckbox = document.querySelector('#togglePlaybackButton input[type="checkbox"]');
//EVENT LISTENERS
// Add an event listener to the checkbox
toggleListeningCheckbox.addEventListener("change", toggleListening);
// Handle checkbox state change
function toggleListening() {
    isListening = toggleListeningCheckbox.checked; // Update listening state based on checkbox
}
if (navigator.requestMIDIAccess) navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
else console.error("WebMIDI is not supported in this browser.");
// Handle successful MIDI access
function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();
    for(let input = inputs.next(); input && !input.done; input = inputs.next())input.value.onmidimessage = onMIDIMessageReceived;
    midiAccess.onstatechange = function(e) {
        if (e.port.state === "connected") e.port.onmidimessage = onMIDIMessageReceived;
        else if (e.port.state === "disconnected") {
            e.port.onmidimessage = null;
            // Try to refresh MIDI connections after a short delay
            setTimeout(()=>{
                refreshMIDIAccess();
            }, 1000);
        }
    };
}
function refreshMIDIAccess() {
    if (navigator.requestMIDIAccess) navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    else console.error("WebMIDI is not supported in this browser.");
}
function onMIDIFailure(e) {
    console.error("Could not access MIDI devices:", e);
} // NOTES:
 // Uint8Array(3): This indicates the array contains three elements. MIDI messages typically consist of 1-3 bytes, so this is consistent with typical MIDI behavior.
 // [128, 36, 0]: These are the actual values (in decimal) of the MIDI message:
 // 128: This is the status byte. In MIDI, a value of 128 (0x80 in hexadecimal) typically corresponds to a "Note Off" message for channel 1.
 // 36: This is the first data byte. For "Note On" and "Note Off" messages, this represents the MIDI note number. In this case, it's 36 which might correspond to a kick drum in a typical MIDI drum map.
 // 0: This is the second data byte. For "Note On" and "Note Off" messages, this represents the velocity (or volume) of the note. A velocity of 0 for a "Note On" message is often treated as a "Note Off".
 // buffer, byteLength, byteOffset, etc.: These are properties of the Uint8Array and provide information about the underlying buffer storage and the array's size. For most MIDI applications, you won't need to worry about these.
 // For example, a MIDI message (128, 36, 0) can be interpreted as: "Note Off" for MIDI note 36 on channel 1 with a velocity of 0.

},{"./samples.js":"50Rdi"}],"50Rdi":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "samples", ()=>samples);
const samples = {
    "closed-hihat": [
        require("93d17bc514449124"),
        require("3c9cef09adbcb0d5"),
        require("9391601abc964ed0"),
        require("71e50b243f0f7525"),
        require("66d50ec54fb31134"),
        require("7277e938e9615d4"),
        require("c7c9754b1cf79dc2"),
        require("9160b5d7827d948a"),
        require("7fc8abc8da6ab1fe"),
        require("c8f4976206fe6eda"),
        require("a45f7aa0857a8933"),
        require("2a86a4d1bb2652d")
    ],
    "open-hihat": [
        require("7c88c2bd29a37ad3"),
        require("1a954c9171cffc83"),
        require("c2639f988fba83ae"),
        require("5102ce6807af873"),
        require("3b75726a57d3d11e"),
        require("780cd96f9f1b08b9"),
        require("45c77d159053dbc1"),
        require("7bec3a466f254985"),
        require("a573ea867e27c54"),
        require("23f5e354bdc61968"),
        require("b67d358f1d172f54"),
        require("5c17e0b7de41b7a5")
    ],
    "crash": [
        require("62317178cc6f9f45"),
        require("f2694034ff22a00a"),
        require("ca943ecba89ccd00"),
        require("39ead73641e3904e"),
        require("c99008f3faea9f14"),
        require("f345f7af4b2d56f5"),
        require("e6f3764e4c4fbfb9"),
        require("d6c67af77e62c6eb"),
        require("95f53a765fbdbbf6"),
        require("3cb664734a24daa0"),
        require("1ca123b29cce0980"),
        require("a8568c4cfebfa945")
    ],
    "ride": [
        require("b2eb9434d0e4b362"),
        require("9ec95e731d583ac1"),
        require("29964d06a3e235d0"),
        require("4b8a31b546b9c027"),
        require("a6fee2e8f28a5232"),
        require("957f9d237ac3e0f9"),
        require("c3aaab23c03a209b"),
        require("cc872d6c0f20e42f"),
        require("f807ad6c9fc37970"),
        require("f6ca6e4bd70e7c89"),
        require("ddd31955ff823005"),
        require("7b6e928d7283462")
    ],
    "kick": [
        require("e2aeb812ab6e7d27"),
        require("da37945b0b2a9e1"),
        require("3a7f966da81de6f3"),
        require("f7666e783644193e"),
        require("6f097cd216a82a40"),
        require("24a2bcf28bd7d476"),
        require("20e51fb30acfde9e"),
        require("54500e9a569d1c96"),
        require("1f8fc8cf58e94f0d"),
        require("c4e2bff2d78d4a16"),
        require("236c0d9ee709ad8"),
        require("de60ef9799769c75")
    ],
    "snare": [
        require("1d4b7fd9d131e9d1"),
        require("9dc06ff40f0dcea1"),
        require("47dab6da50fe1b3d"),
        require("d5b35b63f39dc169"),
        require("c1159f4433d2ac4a"),
        require("72ef810db02cbcd3"),
        require("5231506f560d01"),
        require("589739d84477948f"),
        require("a014f57e3e11ecd4"),
        require("b67597323668203"),
        require("277f435b1ec924db"),
        require("45a70aa25b2f6e77")
    ],
    "hi-tom": [
        require("cc6cfeac5e081fb5"),
        require("23c4cb32968cec1f"),
        require("ec99fa505c8b2498"),
        require("86d0f31d9ce8b633"),
        require("7986fe0511774d9c"),
        require("1406f169d5d1ce67"),
        require("f27bd2842d1d2adb"),
        require("24dcfabcce9a19fb"),
        require("12d4aeb32c8f2128"),
        require("c7b0b4025452fe27"),
        require("c32e4696d3f720ea"),
        require("e29cc32355717bc6")
    ],
    "mid-tom": [
        require("cc620ac435e0b555"),
        require("d8e086f87e371cf9"),
        require("91cfa1c4a5bcbd4c"),
        require("250a966ced697a63"),
        require("b37ee4912e33b0f7"),
        require("eac13c7c85d18564"),
        require("fe59edf625401e4f"),
        require("3c25603e4d96a19a"),
        require("bd6238e3f0de5130"),
        require("c182a56e49f20309"),
        require("eac470240934dfe6"),
        require("a691185a103d2508")
    ],
    "floor-tom": [
        require("6cfd64a59c6beaec"),
        require("2702b1fe86ea322a"),
        require("ad6e1a17485269aa"),
        require("1f866dae63148b0c"),
        require("b925162b19ae81f1"),
        require("97b5344aaaff4d0e"),
        require("c53e04a7bb51b2bc"),
        require("49691197d98ad3b"),
        require("ab52b0d8aaf17de2"),
        require("1c64c4e03fd5fa88"),
        require("cafbdd22c90f8eec"),
        require("7b5ac30c3f4826fc")
    ]
};

},{"93d17bc514449124":"lhF7Y","3c9cef09adbcb0d5":"4aMxY","9391601abc964ed0":"g154W","71e50b243f0f7525":"llvN2","66d50ec54fb31134":"606YA","7277e938e9615d4":"fqZUJ","c7c9754b1cf79dc2":"5qqvZ","9160b5d7827d948a":"jEUUa","7fc8abc8da6ab1fe":"amiMQ","c8f4976206fe6eda":"2JnUb","a45f7aa0857a8933":"7QmlL","2a86a4d1bb2652d":"jb1rz","7c88c2bd29a37ad3":"eaIuG","1a954c9171cffc83":"cVvae","c2639f988fba83ae":"eNzNn","5102ce6807af873":"iV4DA","3b75726a57d3d11e":"1MrBi","780cd96f9f1b08b9":"f5Xhf","45c77d159053dbc1":"iU50K","7bec3a466f254985":"ehw2d","a573ea867e27c54":"9FwfH","23f5e354bdc61968":"hHni6","b67d358f1d172f54":"YZ24s","5c17e0b7de41b7a5":"9ZG70","62317178cc6f9f45":"c8fIE","f2694034ff22a00a":"cLDIP","ca943ecba89ccd00":"69N8B","39ead73641e3904e":"bSKyY","c99008f3faea9f14":"eJV58","f345f7af4b2d56f5":"hLMGs","e6f3764e4c4fbfb9":"gITyS","d6c67af77e62c6eb":"eyzkf","95f53a765fbdbbf6":"htRm9","3cb664734a24daa0":"5AVur","1ca123b29cce0980":"2oNAn","a8568c4cfebfa945":"8bc0b","b2eb9434d0e4b362":"eXtyA","9ec95e731d583ac1":"efOdr","29964d06a3e235d0":"6TgNu","4b8a31b546b9c027":"l8egf","a6fee2e8f28a5232":"iuYgm","957f9d237ac3e0f9":"5Uvjx","c3aaab23c03a209b":"joYvh","cc872d6c0f20e42f":"4YkGP","f807ad6c9fc37970":"72lSZ","f6ca6e4bd70e7c89":"iHwQV","ddd31955ff823005":"lXV9B","7b6e928d7283462":"hhDlM","e2aeb812ab6e7d27":"aSnqg","da37945b0b2a9e1":"9dNBC","3a7f966da81de6f3":"joKOC","f7666e783644193e":"9zDLp","6f097cd216a82a40":"cd4CS","24a2bcf28bd7d476":"hrwab","20e51fb30acfde9e":"jXvoJ","54500e9a569d1c96":"bdQYI","1f8fc8cf58e94f0d":"ldbhD","c4e2bff2d78d4a16":"4IdjW","236c0d9ee709ad8":"3LyWC","de60ef9799769c75":"5HuUJ","1d4b7fd9d131e9d1":"cXWA7","9dc06ff40f0dcea1":"3yHuU","47dab6da50fe1b3d":"aJVBH","d5b35b63f39dc169":"20u7L","c1159f4433d2ac4a":"lDbuI","72ef810db02cbcd3":"ebvbp","5231506f560d01":"brDGD","589739d84477948f":"gjgX3","a014f57e3e11ecd4":"iRi54","b67597323668203":"7Odyl","277f435b1ec924db":"joMN9","45a70aa25b2f6e77":"7se5F","cc6cfeac5e081fb5":"gjYD9","23c4cb32968cec1f":"5a41w","ec99fa505c8b2498":"1f1Ct","86d0f31d9ce8b633":"igD27","7986fe0511774d9c":"dYzt8","1406f169d5d1ce67":"7hNqw","f27bd2842d1d2adb":"5oYOd","24dcfabcce9a19fb":"c5PcI","12d4aeb32c8f2128":"fmniD","c7b0b4025452fe27":"dq70w","c32e4696d3f720ea":"3I0gP","e29cc32355717bc6":"4bJrW","cc620ac435e0b555":"5OoNv","d8e086f87e371cf9":"1CyRM","91cfa1c4a5bcbd4c":"6a5Wx","250a966ced697a63":"et6De","b37ee4912e33b0f7":"cV7at","eac13c7c85d18564":"83iye","fe59edf625401e4f":"2Ynye","3c25603e4d96a19a":"4qLat","bd6238e3f0de5130":"5FNSV","c182a56e49f20309":"bbU0I","eac470240934dfe6":"ir7K7","a691185a103d2508":"7gw47","6cfd64a59c6beaec":"eE9kv","2702b1fe86ea322a":"bCVxb","ad6e1a17485269aa":"fRdRo","1f866dae63148b0c":"aEWgI","b925162b19ae81f1":"9aEbd","97b5344aaaff4d0e":"jWWtx","c53e04a7bb51b2bc":"cBTuf","49691197d98ad3b":"aVgDR","ab52b0d8aaf17de2":"hu5TX","1c64c4e03fd5fa88":"cc50O","cafbdd22c90f8eec":"g7gYW","7b5ac30c3f4826fc":"aNetK","@parcel/transformer-js/src/esmodule-helpers.js":"gkKU3"}],"lhF7Y":[function(require,module,exports) {
module.exports = require("f0dff4bf00629218").getBundleURL("10Mjw") + "closed-hihat_1.3325fcac.mp3" + "?" + Date.now();

},{"f0dff4bf00629218":"lgJ39"}],"lgJ39":[function(require,module,exports) {
"use strict";
var bundleURL = {};
function getBundleURLCached(id) {
    var value = bundleURL[id];
    if (!value) {
        value = getBundleURL();
        bundleURL[id] = value;
    }
    return value;
}
function getBundleURL() {
    try {
        throw new Error();
    } catch (err) {
        var matches = ("" + err.stack).match(/(https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/[^)\n]+/g);
        if (matches) // The first two stack frames will be this function and getBundleURLCached.
        // Use the 3rd one, which will be a runtime in the original bundle.
        return getBaseURL(matches[2]);
    }
    return "/";
}
function getBaseURL(url) {
    return ("" + url).replace(/^((?:https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/.+)\/[^/]+$/, "$1") + "/";
}
// TODO: Replace uses with `new URL(url).origin` when ie11 is no longer supported.
function getOrigin(url) {
    var matches = ("" + url).match(/(https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/[^/]+/);
    if (!matches) throw new Error("Origin not found");
    return matches[0];
}
exports.getBundleURL = getBundleURLCached;
exports.getBaseURL = getBaseURL;
exports.getOrigin = getOrigin;

},{}],"4aMxY":[function(require,module,exports) {
module.exports = require("2333ee00b35c27b6").getBundleURL("10Mjw") + "closed-hihat_2.0950edc4.mp3" + "?" + Date.now();

},{"2333ee00b35c27b6":"lgJ39"}],"g154W":[function(require,module,exports) {
module.exports = require("d2014b841916a95c").getBundleURL("10Mjw") + "closed-hihat_3.1bc343ae.mp3" + "?" + Date.now();

},{"d2014b841916a95c":"lgJ39"}],"llvN2":[function(require,module,exports) {
module.exports = require("cf5eb37d38d47c94").getBundleURL("10Mjw") + "closed-hihat_4.7ebc4934.mp3" + "?" + Date.now();

},{"cf5eb37d38d47c94":"lgJ39"}],"606YA":[function(require,module,exports) {
module.exports = require("b748e50bf011f986").getBundleURL("10Mjw") + "closed-hihat_5.09ab78b4.mp3" + "?" + Date.now();

},{"b748e50bf011f986":"lgJ39"}],"fqZUJ":[function(require,module,exports) {
module.exports = require("7ce494b398b8ef36").getBundleURL("10Mjw") + "closed-hihat_6.b88efbdd.mp3" + "?" + Date.now();

},{"7ce494b398b8ef36":"lgJ39"}],"5qqvZ":[function(require,module,exports) {
module.exports = require("855cbb766cf6a825").getBundleURL("10Mjw") + "closed-hihat_7.bc28a15f.mp3" + "?" + Date.now();

},{"855cbb766cf6a825":"lgJ39"}],"jEUUa":[function(require,module,exports) {
module.exports = require("bc37f0c99f86643e").getBundleURL("10Mjw") + "closed-hihat_8.16b4022e.mp3" + "?" + Date.now();

},{"bc37f0c99f86643e":"lgJ39"}],"amiMQ":[function(require,module,exports) {
module.exports = require("bbd1c695060d4a35").getBundleURL("10Mjw") + "closed-hihat_9.388523c0.mp3" + "?" + Date.now();

},{"bbd1c695060d4a35":"lgJ39"}],"2JnUb":[function(require,module,exports) {
module.exports = require("943a80ce76dbb0fd").getBundleURL("10Mjw") + "closed-hihat_10.4100c43c.mp3" + "?" + Date.now();

},{"943a80ce76dbb0fd":"lgJ39"}],"7QmlL":[function(require,module,exports) {
module.exports = require("54cef1569a21fa4c").getBundleURL("10Mjw") + "closed-hihat_11.1f62b250.mp3" + "?" + Date.now();

},{"54cef1569a21fa4c":"lgJ39"}],"jb1rz":[function(require,module,exports) {
module.exports = require("58aea88d7fe80aa8").getBundleURL("10Mjw") + "closed-hihat_12.0c049867.mp3" + "?" + Date.now();

},{"58aea88d7fe80aa8":"lgJ39"}],"eaIuG":[function(require,module,exports) {
module.exports = require("2eb47435fa845957").getBundleURL("10Mjw") + "open-hihat_1.19c2f8f1.mp3" + "?" + Date.now();

},{"2eb47435fa845957":"lgJ39"}],"cVvae":[function(require,module,exports) {
module.exports = require("e54518f3013d8ea2").getBundleURL("10Mjw") + "open-hihat_2.ce9138d9.mp3" + "?" + Date.now();

},{"e54518f3013d8ea2":"lgJ39"}],"eNzNn":[function(require,module,exports) {
module.exports = require("6d787bfcb9584d99").getBundleURL("10Mjw") + "open-hihat_3.e09893e5.mp3" + "?" + Date.now();

},{"6d787bfcb9584d99":"lgJ39"}],"iV4DA":[function(require,module,exports) {
module.exports = require("422921567de57c8e").getBundleURL("10Mjw") + "open-hihat_4.33c9e376.mp3" + "?" + Date.now();

},{"422921567de57c8e":"lgJ39"}],"1MrBi":[function(require,module,exports) {
module.exports = require("badf3a3140736fef").getBundleURL("10Mjw") + "open-hihat_5.efcf37b5.mp3" + "?" + Date.now();

},{"badf3a3140736fef":"lgJ39"}],"f5Xhf":[function(require,module,exports) {
module.exports = require("a3bb193b26975e73").getBundleURL("10Mjw") + "open-hihat_6.5acb3d32.mp3" + "?" + Date.now();

},{"a3bb193b26975e73":"lgJ39"}],"iU50K":[function(require,module,exports) {
module.exports = require("b9ca4d9c27c98c33").getBundleURL("10Mjw") + "open-hihat_7.eb02cdac.mp3" + "?" + Date.now();

},{"b9ca4d9c27c98c33":"lgJ39"}],"ehw2d":[function(require,module,exports) {
module.exports = require("35dfd5e1f64c0ace").getBundleURL("10Mjw") + "open-hihat_8.5e78d68d.mp3" + "?" + Date.now();

},{"35dfd5e1f64c0ace":"lgJ39"}],"9FwfH":[function(require,module,exports) {
module.exports = require("4015ec9cbebcdd70").getBundleURL("10Mjw") + "open-hihat_9.60322e24.mp3" + "?" + Date.now();

},{"4015ec9cbebcdd70":"lgJ39"}],"hHni6":[function(require,module,exports) {
module.exports = require("7e24194e870bb3fb").getBundleURL("10Mjw") + "open-hihat_10.47c7f7f7.mp3" + "?" + Date.now();

},{"7e24194e870bb3fb":"lgJ39"}],"YZ24s":[function(require,module,exports) {
module.exports = require("6534b35e340bc48c").getBundleURL("10Mjw") + "open-hihat_11.828cdac1.mp3" + "?" + Date.now();

},{"6534b35e340bc48c":"lgJ39"}],"9ZG70":[function(require,module,exports) {
module.exports = require("347205d8ddaf932e").getBundleURL("10Mjw") + "open-hihat_12.a3d97e07.mp3" + "?" + Date.now();

},{"347205d8ddaf932e":"lgJ39"}],"c8fIE":[function(require,module,exports) {
module.exports = require("13aed5284c49e6bd").getBundleURL("10Mjw") + "crash_1.d03ffc5f.mp3" + "?" + Date.now();

},{"13aed5284c49e6bd":"lgJ39"}],"cLDIP":[function(require,module,exports) {
module.exports = require("c7d51a7893f5ef0").getBundleURL("10Mjw") + "crash_2.e0c6cd8a.mp3" + "?" + Date.now();

},{"c7d51a7893f5ef0":"lgJ39"}],"69N8B":[function(require,module,exports) {
module.exports = require("8538f562a8eaff7e").getBundleURL("10Mjw") + "crash_3.2250ec60.mp3" + "?" + Date.now();

},{"8538f562a8eaff7e":"lgJ39"}],"bSKyY":[function(require,module,exports) {
module.exports = require("8424a852e62ea0c").getBundleURL("10Mjw") + "crash_4.c34a212e.mp3" + "?" + Date.now();

},{"8424a852e62ea0c":"lgJ39"}],"eJV58":[function(require,module,exports) {
module.exports = require("2010aa321d5367c0").getBundleURL("10Mjw") + "crash_5.1ab23524.mp3" + "?" + Date.now();

},{"2010aa321d5367c0":"lgJ39"}],"hLMGs":[function(require,module,exports) {
module.exports = require("1d8bf78b85c0aad7").getBundleURL("10Mjw") + "crash_6.fcfce575.mp3" + "?" + Date.now();

},{"1d8bf78b85c0aad7":"lgJ39"}],"gITyS":[function(require,module,exports) {
module.exports = require("c3b4061518fbbb94").getBundleURL("10Mjw") + "crash_7.1cf33ea8.mp3" + "?" + Date.now();

},{"c3b4061518fbbb94":"lgJ39"}],"eyzkf":[function(require,module,exports) {
module.exports = require("6557ee2b0117be4f").getBundleURL("10Mjw") + "crash_8.2d9c83a7.mp3" + "?" + Date.now();

},{"6557ee2b0117be4f":"lgJ39"}],"htRm9":[function(require,module,exports) {
module.exports = require("8c8851035e91732b").getBundleURL("10Mjw") + "crash_9.c78a7fe7.mp3" + "?" + Date.now();

},{"8c8851035e91732b":"lgJ39"}],"5AVur":[function(require,module,exports) {
module.exports = require("85ca2df683f7cff0").getBundleURL("10Mjw") + "crash_10.04bd8544.mp3" + "?" + Date.now();

},{"85ca2df683f7cff0":"lgJ39"}],"2oNAn":[function(require,module,exports) {
module.exports = require("eef5a193661bb21a").getBundleURL("10Mjw") + "crash_11.41320129.mp3" + "?" + Date.now();

},{"eef5a193661bb21a":"lgJ39"}],"8bc0b":[function(require,module,exports) {
module.exports = require("8690f7c3e339fe1f").getBundleURL("10Mjw") + "crash_12.b971e555.mp3" + "?" + Date.now();

},{"8690f7c3e339fe1f":"lgJ39"}],"eXtyA":[function(require,module,exports) {
module.exports = require("bc3384d9461981bc").getBundleURL("10Mjw") + "ride_1.84e83ca5.mp3" + "?" + Date.now();

},{"bc3384d9461981bc":"lgJ39"}],"efOdr":[function(require,module,exports) {
module.exports = require("e726aa7170acd25d").getBundleURL("10Mjw") + "ride_2.c770ce28.mp3" + "?" + Date.now();

},{"e726aa7170acd25d":"lgJ39"}],"6TgNu":[function(require,module,exports) {
module.exports = require("732946e8278f7f15").getBundleURL("10Mjw") + "ride_3.f567f836.mp3" + "?" + Date.now();

},{"732946e8278f7f15":"lgJ39"}],"l8egf":[function(require,module,exports) {
module.exports = require("8f985aecc14c5234").getBundleURL("10Mjw") + "ride_4.f0bd9f11.mp3" + "?" + Date.now();

},{"8f985aecc14c5234":"lgJ39"}],"iuYgm":[function(require,module,exports) {
module.exports = require("2cdba7f4206d1947").getBundleURL("10Mjw") + "ride_5.f5a5cebd.mp3" + "?" + Date.now();

},{"2cdba7f4206d1947":"lgJ39"}],"5Uvjx":[function(require,module,exports) {
module.exports = require("770d74eb2b94f252").getBundleURL("10Mjw") + "ride_6.a44f722c.mp3" + "?" + Date.now();

},{"770d74eb2b94f252":"lgJ39"}],"joYvh":[function(require,module,exports) {
module.exports = require("c3cba29255389310").getBundleURL("10Mjw") + "ride_7.6676786c.mp3" + "?" + Date.now();

},{"c3cba29255389310":"lgJ39"}],"4YkGP":[function(require,module,exports) {
module.exports = require("df4614f4265d7abb").getBundleURL("10Mjw") + "ride_8.89db1737.mp3" + "?" + Date.now();

},{"df4614f4265d7abb":"lgJ39"}],"72lSZ":[function(require,module,exports) {
module.exports = require("d6c6e499df92c3bc").getBundleURL("10Mjw") + "ride_9.6a0589c9.mp3" + "?" + Date.now();

},{"d6c6e499df92c3bc":"lgJ39"}],"iHwQV":[function(require,module,exports) {
module.exports = require("cbf4584bdc391b95").getBundleURL("10Mjw") + "ride_10.cd05ead4.mp3" + "?" + Date.now();

},{"cbf4584bdc391b95":"lgJ39"}],"lXV9B":[function(require,module,exports) {
module.exports = require("d8cd11e00e70c61a").getBundleURL("10Mjw") + "ride_11.ba145788.mp3" + "?" + Date.now();

},{"d8cd11e00e70c61a":"lgJ39"}],"hhDlM":[function(require,module,exports) {
module.exports = require("2e6b18a737b0cb5f").getBundleURL("10Mjw") + "ride_12.692960b4.mp3" + "?" + Date.now();

},{"2e6b18a737b0cb5f":"lgJ39"}],"aSnqg":[function(require,module,exports) {
module.exports = require("5ce2e14dc5cbf676").getBundleURL("10Mjw") + "kick_1.e7748bcd.mp3" + "?" + Date.now();

},{"5ce2e14dc5cbf676":"lgJ39"}],"9dNBC":[function(require,module,exports) {
module.exports = require("4de6da54c4782311").getBundleURL("10Mjw") + "kick_2.1e2c0f5b.mp3" + "?" + Date.now();

},{"4de6da54c4782311":"lgJ39"}],"joKOC":[function(require,module,exports) {
module.exports = require("d30955cc62c28525").getBundleURL("10Mjw") + "kick_3.f1fbe2cd.mp3" + "?" + Date.now();

},{"d30955cc62c28525":"lgJ39"}],"9zDLp":[function(require,module,exports) {
module.exports = require("3f65c005b3e767ed").getBundleURL("10Mjw") + "kick_4.468e8fb3.mp3" + "?" + Date.now();

},{"3f65c005b3e767ed":"lgJ39"}],"cd4CS":[function(require,module,exports) {
module.exports = require("8552ccc9f0ae50b1").getBundleURL("10Mjw") + "kick_5.c258cbeb.mp3" + "?" + Date.now();

},{"8552ccc9f0ae50b1":"lgJ39"}],"hrwab":[function(require,module,exports) {
module.exports = require("b9e63da9038121ce").getBundleURL("10Mjw") + "kick_6.12942b92.mp3" + "?" + Date.now();

},{"b9e63da9038121ce":"lgJ39"}],"jXvoJ":[function(require,module,exports) {
module.exports = require("97579d5ffd249302").getBundleURL("10Mjw") + "kick_7.1366ee05.mp3" + "?" + Date.now();

},{"97579d5ffd249302":"lgJ39"}],"bdQYI":[function(require,module,exports) {
module.exports = require("ca9c534f9d7598d0").getBundleURL("10Mjw") + "kick_8.0bb1d125.mp3" + "?" + Date.now();

},{"ca9c534f9d7598d0":"lgJ39"}],"ldbhD":[function(require,module,exports) {
module.exports = require("7fe8803b159beb1b").getBundleURL("10Mjw") + "kick_9.a9c4a9f0.mp3" + "?" + Date.now();

},{"7fe8803b159beb1b":"lgJ39"}],"4IdjW":[function(require,module,exports) {
module.exports = require("c6773114d0a885b4").getBundleURL("10Mjw") + "kick_10.6607a761.mp3" + "?" + Date.now();

},{"c6773114d0a885b4":"lgJ39"}],"3LyWC":[function(require,module,exports) {
module.exports = require("4be2a91344db8506").getBundleURL("10Mjw") + "kick_11.a3507be5.mp3" + "?" + Date.now();

},{"4be2a91344db8506":"lgJ39"}],"5HuUJ":[function(require,module,exports) {
module.exports = require("7d88bd38c628246f").getBundleURL("10Mjw") + "kick_12.aa972b5d.mp3" + "?" + Date.now();

},{"7d88bd38c628246f":"lgJ39"}],"cXWA7":[function(require,module,exports) {
module.exports = require("29f27adc38768924").getBundleURL("10Mjw") + "snare_1.27cb0e8f.mp3" + "?" + Date.now();

},{"29f27adc38768924":"lgJ39"}],"3yHuU":[function(require,module,exports) {
module.exports = require("94839b069b2929f9").getBundleURL("10Mjw") + "snare_2.74000c7d.mp3" + "?" + Date.now();

},{"94839b069b2929f9":"lgJ39"}],"aJVBH":[function(require,module,exports) {
module.exports = require("17070419d17e0ff0").getBundleURL("10Mjw") + "snare_3.c7a27325.mp3" + "?" + Date.now();

},{"17070419d17e0ff0":"lgJ39"}],"20u7L":[function(require,module,exports) {
module.exports = require("e23e3a0b430a9da2").getBundleURL("10Mjw") + "snare_4.be48714d.mp3" + "?" + Date.now();

},{"e23e3a0b430a9da2":"lgJ39"}],"lDbuI":[function(require,module,exports) {
module.exports = require("22179a78c76f627e").getBundleURL("10Mjw") + "snare_5.df257ff7.mp3" + "?" + Date.now();

},{"22179a78c76f627e":"lgJ39"}],"ebvbp":[function(require,module,exports) {
module.exports = require("8f5af752b9c99632").getBundleURL("10Mjw") + "snare_6.7de2fc54.mp3" + "?" + Date.now();

},{"8f5af752b9c99632":"lgJ39"}],"brDGD":[function(require,module,exports) {
module.exports = require("4ce8669b159ac402").getBundleURL("10Mjw") + "snare_7.9f1e7cf2.mp3" + "?" + Date.now();

},{"4ce8669b159ac402":"lgJ39"}],"gjgX3":[function(require,module,exports) {
module.exports = require("b9184828b0ca5bbd").getBundleURL("10Mjw") + "snare_8.c7c5e018.mp3" + "?" + Date.now();

},{"b9184828b0ca5bbd":"lgJ39"}],"iRi54":[function(require,module,exports) {
module.exports = require("374d25a76f2170ed").getBundleURL("10Mjw") + "snare_9.1f2d27a3.mp3" + "?" + Date.now();

},{"374d25a76f2170ed":"lgJ39"}],"7Odyl":[function(require,module,exports) {
module.exports = require("b97ccd85513ddf23").getBundleURL("10Mjw") + "snare_10.9804fbf5.mp3" + "?" + Date.now();

},{"b97ccd85513ddf23":"lgJ39"}],"joMN9":[function(require,module,exports) {
module.exports = require("dce53db29d912865").getBundleURL("10Mjw") + "snare_11.9515346f.mp3" + "?" + Date.now();

},{"dce53db29d912865":"lgJ39"}],"7se5F":[function(require,module,exports) {
module.exports = require("7f3dc679075553ed").getBundleURL("10Mjw") + "snare_12.3aac1f52.mp3" + "?" + Date.now();

},{"7f3dc679075553ed":"lgJ39"}],"gjYD9":[function(require,module,exports) {
module.exports = require("d2edc49346163a52").getBundleURL("10Mjw") + "hi-tom_1.64f2c2c3.mp3" + "?" + Date.now();

},{"d2edc49346163a52":"lgJ39"}],"5a41w":[function(require,module,exports) {
module.exports = require("cb59eb1b79ccf938").getBundleURL("10Mjw") + "hi-tom_2.18a79e84.mp3" + "?" + Date.now();

},{"cb59eb1b79ccf938":"lgJ39"}],"1f1Ct":[function(require,module,exports) {
module.exports = require("7b7deb8c86a32f6f").getBundleURL("10Mjw") + "hi-tom_3.7c40bcf4.mp3" + "?" + Date.now();

},{"7b7deb8c86a32f6f":"lgJ39"}],"igD27":[function(require,module,exports) {
module.exports = require("e52920bcbaeabdd6").getBundleURL("10Mjw") + "hi-tom_4.1f40c5b1.mp3" + "?" + Date.now();

},{"e52920bcbaeabdd6":"lgJ39"}],"dYzt8":[function(require,module,exports) {
module.exports = require("3d54524ad70597ff").getBundleURL("10Mjw") + "hi-tom_5.a2f3e8b7.mp3" + "?" + Date.now();

},{"3d54524ad70597ff":"lgJ39"}],"7hNqw":[function(require,module,exports) {
module.exports = require("6fa4668f1e9d620c").getBundleURL("10Mjw") + "hi-tom_6.b01dfd42.mp3" + "?" + Date.now();

},{"6fa4668f1e9d620c":"lgJ39"}],"5oYOd":[function(require,module,exports) {
module.exports = require("5519cc44ba174e46").getBundleURL("10Mjw") + "hi-tom_7.b6c35834.mp3" + "?" + Date.now();

},{"5519cc44ba174e46":"lgJ39"}],"c5PcI":[function(require,module,exports) {
module.exports = require("1c2d58d2887d43e6").getBundleURL("10Mjw") + "hi-tom_8.f6add780.mp3" + "?" + Date.now();

},{"1c2d58d2887d43e6":"lgJ39"}],"fmniD":[function(require,module,exports) {
module.exports = require("1617a927754f14dc").getBundleURL("10Mjw") + "hi-tom_9.1498bd07.mp3" + "?" + Date.now();

},{"1617a927754f14dc":"lgJ39"}],"dq70w":[function(require,module,exports) {
module.exports = require("f82ebe39c6bccc69").getBundleURL("10Mjw") + "hi-tom_10.d771675e.mp3" + "?" + Date.now();

},{"f82ebe39c6bccc69":"lgJ39"}],"3I0gP":[function(require,module,exports) {
module.exports = require("c9f5101b407ffff7").getBundleURL("10Mjw") + "hi-tom_11.78c63a92.mp3" + "?" + Date.now();

},{"c9f5101b407ffff7":"lgJ39"}],"4bJrW":[function(require,module,exports) {
module.exports = require("a2025ca1475f8ab").getBundleURL("10Mjw") + "hi-tom_12.6d2fbc00.mp3" + "?" + Date.now();

},{"a2025ca1475f8ab":"lgJ39"}],"5OoNv":[function(require,module,exports) {
module.exports = require("59c4c2156501163c").getBundleURL("10Mjw") + "mid-tom_1.a4035713.mp3" + "?" + Date.now();

},{"59c4c2156501163c":"lgJ39"}],"1CyRM":[function(require,module,exports) {
module.exports = require("6b129bf205fd9ba2").getBundleURL("10Mjw") + "mid-tom_2.705df588.mp3" + "?" + Date.now();

},{"6b129bf205fd9ba2":"lgJ39"}],"6a5Wx":[function(require,module,exports) {
module.exports = require("3d939fc6af27b747").getBundleURL("10Mjw") + "mid-tom_3.1ac6a834.mp3" + "?" + Date.now();

},{"3d939fc6af27b747":"lgJ39"}],"et6De":[function(require,module,exports) {
module.exports = require("b0a81160fe1f8f5e").getBundleURL("10Mjw") + "mid-tom_4.403250eb.mp3" + "?" + Date.now();

},{"b0a81160fe1f8f5e":"lgJ39"}],"cV7at":[function(require,module,exports) {
module.exports = require("5354651c91b6d08d").getBundleURL("10Mjw") + "mid-tom_5.3e0f8cd6.mp3" + "?" + Date.now();

},{"5354651c91b6d08d":"lgJ39"}],"83iye":[function(require,module,exports) {
module.exports = require("5bcdc6d398615881").getBundleURL("10Mjw") + "mid-tom_6.d2b16e2d.mp3" + "?" + Date.now();

},{"5bcdc6d398615881":"lgJ39"}],"2Ynye":[function(require,module,exports) {
module.exports = require("1410a1ee72b1168f").getBundleURL("10Mjw") + "mid-tom_7.02f50834.mp3" + "?" + Date.now();

},{"1410a1ee72b1168f":"lgJ39"}],"4qLat":[function(require,module,exports) {
module.exports = require("fb1155b671c55bec").getBundleURL("10Mjw") + "mid-tom_8.9b863448.mp3" + "?" + Date.now();

},{"fb1155b671c55bec":"lgJ39"}],"5FNSV":[function(require,module,exports) {
module.exports = require("b3e62163eef25670").getBundleURL("10Mjw") + "mid-tom_9.0c54135f.mp3" + "?" + Date.now();

},{"b3e62163eef25670":"lgJ39"}],"bbU0I":[function(require,module,exports) {
module.exports = require("cc531c7c2625adc0").getBundleURL("10Mjw") + "mid-tom_10.53fb7fcc.mp3" + "?" + Date.now();

},{"cc531c7c2625adc0":"lgJ39"}],"ir7K7":[function(require,module,exports) {
module.exports = require("ede1867e8872138d").getBundleURL("10Mjw") + "mid-tom_11.b7c929e6.mp3" + "?" + Date.now();

},{"ede1867e8872138d":"lgJ39"}],"7gw47":[function(require,module,exports) {
module.exports = require("84135a985e1250dc").getBundleURL("10Mjw") + "mid-tom_12.6e3662c0.mp3" + "?" + Date.now();

},{"84135a985e1250dc":"lgJ39"}],"eE9kv":[function(require,module,exports) {
module.exports = require("c63b4c8a260f03a6").getBundleURL("10Mjw") + "floor-tom_1.27d6cac0.mp3" + "?" + Date.now();

},{"c63b4c8a260f03a6":"lgJ39"}],"bCVxb":[function(require,module,exports) {
module.exports = require("4ba50ce31a136709").getBundleURL("10Mjw") + "floor-tom_2.2b2d111f.mp3" + "?" + Date.now();

},{"4ba50ce31a136709":"lgJ39"}],"fRdRo":[function(require,module,exports) {
module.exports = require("68f162b962fa8f27").getBundleURL("10Mjw") + "floor-tom_3.82c88959.mp3" + "?" + Date.now();

},{"68f162b962fa8f27":"lgJ39"}],"aEWgI":[function(require,module,exports) {
module.exports = require("884bce2f667e38ea").getBundleURL("10Mjw") + "floor-tom_4.c5984df0.mp3" + "?" + Date.now();

},{"884bce2f667e38ea":"lgJ39"}],"9aEbd":[function(require,module,exports) {
module.exports = require("388deb4e59761eb8").getBundleURL("10Mjw") + "floor-tom_5.014b9257.mp3" + "?" + Date.now();

},{"388deb4e59761eb8":"lgJ39"}],"jWWtx":[function(require,module,exports) {
module.exports = require("5e12dc260cfcac19").getBundleURL("10Mjw") + "floor-tom_6.1c268067.mp3" + "?" + Date.now();

},{"5e12dc260cfcac19":"lgJ39"}],"cBTuf":[function(require,module,exports) {
module.exports = require("5c14235255a616fb").getBundleURL("10Mjw") + "floor-tom_7.b6418cea.mp3" + "?" + Date.now();

},{"5c14235255a616fb":"lgJ39"}],"aVgDR":[function(require,module,exports) {
module.exports = require("c67425c19ecb8562").getBundleURL("10Mjw") + "floor-tom_8.30744184.mp3" + "?" + Date.now();

},{"c67425c19ecb8562":"lgJ39"}],"hu5TX":[function(require,module,exports) {
module.exports = require("a01be148f872c7c0").getBundleURL("10Mjw") + "floor-tom_9.96f9552e.mp3" + "?" + Date.now();

},{"a01be148f872c7c0":"lgJ39"}],"cc50O":[function(require,module,exports) {
module.exports = require("6616ec0c7643e3a1").getBundleURL("10Mjw") + "floor-tom_10.d8d949f1.mp3" + "?" + Date.now();

},{"6616ec0c7643e3a1":"lgJ39"}],"g7gYW":[function(require,module,exports) {
module.exports = require("2f7cc7966f27c1eb").getBundleURL("10Mjw") + "floor-tom_11.56e7c6e7.mp3" + "?" + Date.now();

},{"2f7cc7966f27c1eb":"lgJ39"}],"aNetK":[function(require,module,exports) {
module.exports = require("3b8e6618b399c97d").getBundleURL("10Mjw") + "floor-tom_12.3dfc8e03.mp3" + "?" + Date.now();

},{"3b8e6618b399c97d":"lgJ39"}],"gkKU3":[function(require,module,exports) {
exports.interopDefault = function(a) {
    return a && a.__esModule ? a : {
        default: a
    };
};
exports.defineInteropFlag = function(a) {
    Object.defineProperty(a, "__esModule", {
        value: true
    });
};
exports.exportAll = function(source, dest) {
    Object.keys(source).forEach(function(key) {
        if (key === "default" || key === "__esModule" || dest.hasOwnProperty(key)) return;
        Object.defineProperty(dest, key, {
            enumerable: true,
            get: function() {
                return source[key];
            }
        });
    });
    return dest;
};
exports.export = function(dest, destName, get) {
    Object.defineProperty(dest, destName, {
        enumerable: true,
        get: get
    });
};

},{}],"hwnEt":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: Defining a global state module to fetch MIDI (bytes) 
// data from the server and make it available to all modules of the 2groove web app.
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "globalFetch", ()=>globalFetch);
const globalFetch = {
    midiData: null,
    midiReadyForProcessing: false,
    setMidiData (data) {
        console.log("MIDI data received in bytes!", data);
        this.midiData = data;
        this.midiReadyForProcessing = true; // Open the gate
    },
    getMidiData () {
        return this.midiData;
    },
    isMidiReadyForProcessing () {
        return this.midiReadyForProcessing;
    },
    midiProcessed () {
        this.midiReadyForProcessing = false; // Close the gate
    }
};

},{"@parcel/transformer-js/src/esmodule-helpers.js":"gkKU3"}],"kBoq1":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: User interface for 2groove web app.
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "toggleMetronome", ()=>toggleMetronome);
parcelHelpers.export(exports, "startMetronome", ()=>startMetronome);
parcelHelpers.export(exports, "setBPM", ()=>setBPM);
parcelHelpers.export(exports, "getCurrentBPM", ()=>getCurrentBPM);
parcelHelpers.export(exports, "isMetronomeRunning", ()=>isMetronomeRunning);
// Export the tapped array for other modules to use
parcelHelpers.export(exports, "getTappedRhythms", ()=>getTappedRhythms);
var _globalFetchJs = require("./globalFetch.js");
// Initialize Web Audio API
const audioContext = new AudioContext();
// UI Elements
const tempoSlider = document.getElementById("tempo");
const metronomeVolumeSlider = document.getElementById("metronomeVolume");
const toggleMetronomeCheckbox = document.querySelector('#toggleMetronome input[type="checkbox"]');
const recIndicator = document.getElementById("recIndicator");
const arrayList = document.getElementById("arrayList");
const intervals = []; // for tap tempo
// const startButton = document.getElementById('startButton'); 
// const portInput = document.getElementById('serverPort')
// const httpIp = document.getElementById('httpIpAddress')
// const beatsInput = document.getElementById('beats');
// const quantizeSelect = document.getElementById('quantize');
// Variables
let beatsInput = 8; // 8 beats (2 bars)
let quantizeSelect = 4; // 1/16
let gateKeyActive = false;
let currentArray = [];
let recording = false;
let recordingStartedAt = 0;
let httpIp = [
    `158.39.200.82`,
    `127.0.0.1`
];
let httpPort = [
    `5002`,
    `5003`
];
let isHttpConnected = true; // we keep it true with the new UI
let lastTapTime = 0; // for tap tempo
let tappedRhythms = [];
let metronomeLoop;
let metronomeRunning = true; // The metronome loop and transport is always running
let metronomeSoundOn = false; // The metronome sound is off by default
let tempVal = 0.2;
let threshVal = 0.3;
let currentTick = 1;
let clickTone = 1000;
let samplingStrategy = {
    "strategy": [
        "epsilon",
        "softmax_temp"
    ],
    "tempRange": [
        [
            0.01,
            10.0
        ],
        [
            0.1,
            2.0
        ]
    ],
    "threshRange": [
        [
            0.15,
            0.35
        ],
        [
            0.1,
            0.2
        ]
    ]
};
let samplingStrategyIndex = 0;
//-------------------------------------
// Functions
//-------------------------------------
// startButton.addEventListener('click', function() {
//     initializeApp();
//     startButton.style.display = 'none'; // Hide the button after initialization
// });
async function initializeApp() {
    // Set default BPM or retrieve it from a saved setting or slider
    const defaultBPM = tempoSlider.value;
    // Indicate that the metronome is running
    metronomeRunning = true;
    console.log("App initialized!");
    console.log("Default BPM:", defaultBPM);
    console.log("Temperature value:", tempVal);
    console.log("Hit tolerance:", threshVal);
    console.log("Sampling strategy:", samplingStrategy["strategy"][samplingStrategyIndex]);
}
initializeApp();
//////////////////////
// GLOBAL METRONOME //
//////////////////////
// Play click sound
function playClick(volume, frequency = 1000) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
}
async function toggleMetronome() {
    if (audioContext.state === "suspended") await audioContext.resume();
    if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Tone.js has started");
    }
    metronomeSoundOn = !metronomeSoundOn;
    if (metronomeSoundOn) // start the metronome sound here if it's not already running
    startMetronome(tempoSlider.value); // Assuming you want to use the current value of the tempo slider
}
async function startMetronome(bpm) {
    if (Tone.context.state !== "running") await Tone.start();
    Tone.Transport.bpm.value = bpm; // Set the transport's BPM
    if (!metronomeLoop) {
        metronomeLoop = new Tone.Loop((time)=>{
            // Only play the click if the audibleClick flag is true
            if (metronomeSoundOn) playClick(metronomeVolumeSlider.value, clickTone);
            emitTickEvent(); // Emit a tick event to be used by other modules
        }, "4n"); // "4n" stands for a quarter note
        metronomeLoop.start(0); // Start the loop immediately
    }
    Tone.Transport.start(); // Start the transport
}
// Func to count between 1-4
function count4() {
    console.log(`${currentTick}/4`);
    currentTick = currentTick % 4 + 1;
    if (currentTick == 1) clickTone = 1500;
    else clickTone = 1000;
}
function emitTickEvent() {
    count4();
    // const event = new Event('metronomeTick');
    // window.dispatchEvent(event);
    const event = new CustomEvent("metronomeTick", {
        detail: {
            tick: currentTick
        }
    });
    window.dispatchEvent(event);
}
function setBPM(bpm) {
    Tone.Transport.bpm.value = bpm;
}
function getCurrentBPM() {
    return Tone.Transport.bpm.value;
}
function isMetronomeRunning() {
    return metronomeRunning;
}
function arrayToBinaryString(array) {
    return array.map((value)=>value !== 0 ? "1" : "0").join("");
}
function storeAndDisplayArray(array) {
    const li = document.createElement("li");
    li.textContent = arrayToBinaryString(array);
    // If the list has any items
    if (arrayList.firstChild) // Insert 'li' before the first item, to the top of the list
    arrayList.insertBefore(li, arrayList.firstChild);
    else // If the list is empty, just append the 'li' as usual
    arrayList.appendChild(li);
}
// Variety knob
// TODO: WOrk on it more!
document.getElementById("temp").addEventListener("input", function() {
    const value = this.value;
    tempVal = scaleValue(value, [
        0,
        1
    ], samplingStrategy["tempRange"][samplingStrategyIndex]); //Exponential curve?
    document.getElementById("knob3Value").textContent = value;
    // TODO: Check if it's a good idea to combine the two values. If yes, check better ways of combining.
    console.log("tempVal:", tempVal);
});
// Thresh knob
// TODO: WOrk on it more!
document.getElementById("tolerance").addEventListener("input", function() {
    const value = this.value;
    // tempVal = scaleValue(value, [0, 1], [0.01, 100]);
    threshVal = scaleValue(value, [
        0,
        1
    ], samplingStrategy["threshRange"][samplingStrategyIndex]);
    document.getElementById("knob4Value").textContent = value;
    // TODO: Check if it's a good idea to combine the two values. If yes, check better ways of combining.
    console.log("threshVal:", threshVal);
});
// New Web Worker setup for client-server communication
const ajaxWorker = new Worker(require("4ee0c0dfd0087202"));
// Listen to messages from the worker:
ajaxWorker.addEventListener("message", function(event) {
    const data = event.data;
    console.log("Setting MIDI data, length:", data.length);
    switch(data.type){
        case "arrayProcessed":
            // process the MIDI data as needed
            console.log("MIDI data received in bytes!", data.data);
            (0, _globalFetchJs.globalFetch).setMidiData(data.data);
            resetTappedRhythms();
            break;
        case "error":
            console.error("Error from worker:", data.error);
            break;
    }
});
// Modify `sendArrayToServer` to post data to the worker:
function sendArrayToServer(array) {
    ajaxWorker.postMessage({
        cmd: "sendArray",
        array: array,
        bpm: parseFloat(document.getElementById("tempo").value),
        temperatureValue: tempVal,
        hitTolerance: threshVal,
        isHttpConnected: isHttpConnected,
        httpIp: httpIp[0],
        portInput: httpPort[0],
        samplingStrategy: samplingStrategy["strategy"][samplingStrategyIndex]
    });
}
// TODO: Connect this to `midiBroadcast.js`
// function sendBroadcastParameters(){
//     const loop_amount = parseInt(loopsInput.value);
// }
function resetTappedRhythms() {
    // tappedRhythms = [];
    tappedRhythms.length = 0; // This empties the array without re-declaring it
// ... any other necessary resets or UI updates ...
}
function toggleValues(arr, numIndices1 = 1) {
    // TODO: Implement this function to `change` action
    /**
     * Toggle values in the input array at random indices.
     *
     * Parameters:
     * - arr (array-like): The input array containing only 0s and 1s.
     * - numIndices (int): The number of random indices to toggle (default is 1).
     *
     * Returns:
     * - Edited array with toggled values.
     */ // Check if the input array is valid (contains only 0s and 1s)
    if (!arr.every((val)=>val === 0 || val === 1)) throw new Error("Input array must consist of only 0s and 1s.");
    // Create a copy of the input array to avoid modifying the original
    const editedArr = [
        ...arr
    ];
    // Generate random indices to toggle
    const toggleIndices = [];
    for(let i = 0; i < numIndices1; i++){
        const randomIndex = Math.floor(Math.random() * arr.length);
        toggleIndices.push(randomIndex);
    }
    // Toggle the values at the selected indices
    toggleIndices.forEach((index)=>{
        editedArr[index] = 1 - editedArr[index];
    });
    return editedArr;
}
//-------------------------------------
// Event Listeners
//-------------------------------------
// WITH THE OLD UI:
// Event listeners for the metronome
// toggleMetronomeButton.addEventListener('click', () => {
//     toggleMetronomeButton.classList.toggle('toggled');
//     toggleMetronome();
// });
// WITH THE NEW UI
// TODO: Fix it because it doesn't work properly while generating 
toggleMetronomeCheckbox.addEventListener("change", toggleMetronome);
// Function to turn off the switch
function turnOffSwitch() {
    toggleMetronomeCheckbox.checked = false;
}
// Event listener for the tempo and vol sliders
tempoSlider.addEventListener("input", function() {
    const bpm = this.value;
    document.getElementById("knob1Value").textContent = bpm; // Update the knob value
    if (metronomeRunning) startMetronome(bpm);
});
metronomeVolumeSlider.addEventListener("input", function() {
    const vol = this.value;
    document.getElementById("knob2Value").textContent = vol; // Update the knob value
});
// Record tapped rhythm -- event listener for when the key "A" is pressed to start recording
window.addEventListener("keydown", (e)=>{
    if (e.key === "a" && !recording) {
        e.preventDefault();
        gateKeyActive = true;
        recordingStartedAt = Date.now();
        recIndicator.innerText = "REC ON!";
        recIndicator.classList.add("recording");
        const totalSteps = parseInt(beatsInput) * parseInt(quantizeSelect); //.value methods removed for new UI
        currentArray = new Array(totalSteps).fill(0); // Initialize array with zeros
        recording = true;
    }
    if (e.key === " " && gateKeyActive) {
        //   playClick(tapVolumeSlider.value, 300);
        playClick(metronomeVolumeSlider.value, 300) // If same knob is used for both metronome and tap volume
        ;
        const elapsedMs = Date.now() - recordingStartedAt;
        const bpm = parseInt(tempoSlider.value);
        const quantizeValue = parseInt(quantizeSelect);
        const singleSubdivisionDuration = 60000 / (bpm * quantizeValue);
        const tappedSubdivision = Math.round(elapsedMs / singleSubdivisionDuration);
        if (tappedSubdivision < currentArray.length) currentArray[tappedSubdivision] = 1;
        lastTapTimestamp = Date.now();
    }
    if (e.key === " ") {
        e.preventDefault(); //To prevent the browser from scrolling when the spacebar is pressed
        const light = document.getElementById("tapLight");
        light.classList.remove("light-off");
        light.classList.add("light-on");
    }
    if (e.key.toUpperCase() === "T") {
        const currentTime = new Date().getTime();
        const interval = currentTime - lastTapTime; // in milliseconds
        const tapTempoLight = document.getElementById("tapTempoLight"); // Visual feedback for tap
        tapTempoLight.classList.remove("light-off");
        tapTempoLight.classList.add("light-on");
        // tapTempoLight.style.backgroundColor = 'red';
        playClick(metronomeVolumeSlider.value, 1500);
        setTimeout(()=>{
            // tapLight.style.backgroundColor = '';
            tapTempoLight.classList.remove("light-on");
            tapTempoLight.classList.add("light-off");
        }, 100); // light stays red for 100 milliseconds
        if (lastTapTime !== 0) {
            intervals.push(interval);
            // Consider only the last few taps to get a more accurate/current BPM
            if (intervals.length > 4) intervals.shift();
            const averageInterval = intervals.reduce((acc, val)=>acc + val, 0) / intervals.length;
            const bpm = parseInt(60000 / averageInterval); // 60,000 ms in a minute
            // Update the tempo UI elements
            const tempoElement = document.getElementById("tempo");
            const bpmDisplayElement = document.getElementById("knob1Value");
            const tempoSlider = document.getElementById("tempoSlider");
            if (tempoElement) tempoElement.value = bpm.toFixed(2); // toFixed(2) to limit to 2 decimal points
            if (bpmDisplayElement) bpmDisplayElement.innerText = bpm.toFixed(0);
            if (tempoSlider) tempoSlider.value = bpm.toFixed(0);
        }
        lastTapTime = currentTime;
    }
});
function getTappedRhythms() {
    return currentArray;
}
// evet listener for when key "A" is released
window.addEventListener("keyup", (e)=>{
    if (e.key === "a") {
        gateKeyActive = false;
        recIndicator.innerText = "REC OFF";
        recIndicator.classList.remove("recording");
        storeAndDisplayArray(currentArray); // To display the array
        sendArrayToServer(currentArray); // To send the array via fetch (to server
        // Check if the metronome is currently active/on
        if (metronomeRunning) {
            // Toggle the metronome off
            // toggleMetronome();
            metronomeSoundOn = false;
            toggleMetronomeCheckbox.checked = false; // TODO: fix this!
        }
        recording = false;
    }
    if (e.key === " ") {
        const light = document.getElementById("tapLight");
        light.classList.remove("light-on");
        light.classList.add("light-off");
    }
});
// Incorporate the `change` action
// TODO: Make sure it works properly
document.getElementById("changeButton").addEventListener("click", function() {
    editedArray = toggleValues(currentArray, numIndices = 1);
    sendArrayToServer(editedArray);
});
/// UTILS ///
// Scale a value from one range to another
function scaleValue(value, from, to) {
    let scale = (to[1] - to[0]) / (from[1] - from[0]);
    let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return capped * scale + to[0];
}
function limitDecimalPoints(number, n) {
    // Check if the input is a valid number
    if (typeof number !== "number" || isNaN(number)) throw new Error("Input must be a valid number.");
    // Use toFixed() to limit to n decimal points and convert back to a number
    return parseFloat(number.toFixed(n));
}
resetButton.addEventListener("click", ()=>{
    arrayList.innerHTML = "";
});
const imageA = require("d5245f5563a4ab81");
const imageB = require("c541ff8c9efc2c8b");
document.addEventListener("DOMContentLoaded", function() {
    const modelChangeButton = document.getElementById("modelChangeButton");
    modelChangeButton.addEventListener("click", function() {
        const imgElement = this.querySelector("img");
        if (imgElement.src.includes(imageA)) {
            imgElement.src = imageB;
            samplingStrategyIndex = 1;
            console.log("Sampling changed to (B) Softmax!");
        } else {
            imgElement.src = imageA;
            samplingStrategyIndex = 0;
            console.log("Model changed to (A) Epsilon!");
        }
    });
});
// Open the MIDI I/O popup
function openMidiPopup() {
    window.open(src = "", "popup", "width=450,height=450", sandbox = "allow-popups");
} //./../html/midi-io.html
const midiButton = document.getElementById("midi-btn");
midiButton.addEventListener("click", openMidiPopup);

},{"./globalFetch.js":"hwnEt","4ee0c0dfd0087202":"5T2Et","d5245f5563a4ab81":"8pYep","c541ff8c9efc2c8b":"4aLCX","@parcel/transformer-js/src/esmodule-helpers.js":"gkKU3"}],"5T2Et":[function(require,module,exports) {
let workerURL = require("fa3f1f25b6eb5707");
let bundleURL = require("3fac61c56212a279");
let url = bundleURL.getBundleURL("10Mjw") + "workerAjax.3650bb5b.js" + "?" + Date.now();
module.exports = workerURL(url, bundleURL.getOrigin(url), false);

},{"fa3f1f25b6eb5707":"cn2gM","3fac61c56212a279":"lgJ39"}],"cn2gM":[function(require,module,exports) {
"use strict";
module.exports = function(workerUrl, origin, isESM) {
    if (origin === self.location.origin) // If the worker bundle's url is on the same origin as the document,
    // use the worker bundle's own url.
    return workerUrl;
    else {
        // Otherwise, create a blob URL which loads the worker bundle with `importScripts`.
        var source = isESM ? "import " + JSON.stringify(workerUrl) + ";" : "importScripts(" + JSON.stringify(workerUrl) + ");";
        return URL.createObjectURL(new Blob([
            source
        ], {
            type: "application/javascript"
        }));
    }
};

},{}],"8pYep":[function(require,module,exports) {
module.exports = require("8e1308bed9aa950e").getBundleURL("10Mjw") + "A.cbe0a399.png" + "?" + Date.now();

},{"8e1308bed9aa950e":"lgJ39"}],"4aLCX":[function(require,module,exports) {
module.exports = require("f367eeab639e14b6").getBundleURL("10Mjw") + "B.924196a3.png" + "?" + Date.now();

},{"f367eeab639e14b6":"lgJ39"}],"lFIIu":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: MIDI broadcasting script for 2groove web app.
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "getCurrentMidiForVisuals", ()=>getCurrentMidiForVisuals);
var _globalFetchJs = require("./globalFetch.js");
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let midiOutput; // MIDI output device
let startTime = null; // Start time for the MIDI playback
let timeouts = []; // Store timeout IDs for scheduled notes
const midiQueue = [];
let currentMidiForVisuals = null;
let isPlaying = false; // to track the playback status
// let currentTick = 0;  // to track the current tick for the metronome
let processedMidiData; // Global variable to store the processed MIDI data for download
// TODO: play/pause button
// isPaused = false;
// const playPauseButton = document.getElementById('play-pause-btn');
// playPauseButton.addEventListener('click', () => {
//     isPaused = !isPaused;
//     if (isPaused) {
//         // If paused, clear all timeouts (stop all scheduled notes)
//         // timeouts.forEach(timeout => clearTimeout(timeout));
//     } else {
//         // When resumed, restart the MIDI playback from where we paused
//         // loadMidiData(currentMidiForVisuals);
//     }
// });
// TODO: Set up the main clock
// Set up an event listener for the tick event
window.addEventListener("metronomeTick", handleMidiForTick);
function handleMidiForTick(event) {
// currentTick++;
// console.log(`\rClick ${(currentTick%4)+1}/4`);
}
// const tickToMidiEventsMap = {};
// function handleMidiForTick(event) {
//     if (event && event.detail && typeof event.detail.tick !== 'undefined') {
//         const currentTick = event.detail.tick;
//         if (tickToMidiEventsMap[currentTick]) {
//             tickToMidiEventsMap[currentTick].forEach((note) => {
//                 scheduleNote(note, Tone.Time(Tone.Transport.position).toMilliseconds());
//             });
//         }
//     } else {
//         console.warn('Received an unexpected event structure:', event);
//     }
//     currentTick++;
//     console.log(`\rClick ${(currentTick%4)+1}/4`);
// }
// Convert ticks to time in seconds
function ticksToTime(ticks, ticksPerBeat, bpm) {
    const secondsPerTick = 60 / (bpm * ticksPerBeat);
    return ticks * secondsPerTick;
}
// Check for new MIDI data and enqueue it
function checkAndEnqueueMidi() {
    if ((0, _globalFetchJs.globalFetch).isMidiReadyForProcessing()) {
        const midi = (0, _globalFetchJs.globalFetch).getMidiData().buffer; // convert to ArrayBuffer when fetching JSON
        midiQueue.push(midi);
        (0, _globalFetchJs.globalFetch).midiProcessed();
        // If nothing is currently playing, start the next MIDI
        if (!isPlaying) playNextMidi();
    }
}
// Play next MIDI in the queue and set it for visualization
function playNextMidi() {
    // Only start playing the next MIDI if the current one has finished
    if (!isPlaying && midiQueue.length > 0) {
        currentMidiForVisuals = midiQueue.shift();
        Tone.Transport.start("@1m"); // Ensure playback starts at the beginning of a measure //TODO: Check if this is necessary or useful
        loadMidiData(currentMidiForVisuals);
    }
}
function getCurrentMidiForVisuals() {
    return currentMidiForVisuals;
}
// Initialize the audio context
function startAudioContext() {
    if (audioContext.state === "suspended") audioContext.resume();
}
// Scale a value from one range to another
function scaleValue(value, from, to) {
    let scale = (to[1] - to[0]) / (from[1] - from[0]);
    let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return capped * scale + to[0];
}
// MIDI initialization
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
function onMIDISuccess(midiAccess) {
    const outputs = Array.from(midiAccess.outputs.values());
    if (outputs.length === 0) {
        console.warn("No MIDI outputs found");
        return;
    }
    populateMidiOutputs(outputs);
}
function onMIDIFailure() {
    console.error("Could not access your MIDI devices.");
}
function populateMidiOutputs(outputs) {
    const select = document.getElementById("midiOutputs");
    outputs.forEach((output, index)=>{
        const option = document.createElement("option");
        option.value = index;
        option.text = output.name;
        select.appendChild(option);
    });
    select.addEventListener("change", (event)=>{
        midiOutput = outputs[event.target.value];
    });
    midiOutput = outputs[0]; // Default to the first output
}
// TODO: check if this working properly
// function populateMidiOutputs(outputs) {
//     const select = document.getElementById('midiOutputs');
//     if (!select) return;  // Exit if the element doesn't exist
//     outputs.forEach((output, index) => {
//         const option = document.createElement('option');
//         option.value = index;
//         option.text = output.name;
//         select.appendChild(option);
//     });
//     select.addEventListener('change', (event) => {
//         midiOutput = outputs[event.target.value];
//     });
//     midiOutput = outputs[0]; // Default to the first output
// }
/////////////////////////////////////////
/// TESTS FOR METRO-LOCKED SCHEDULING ///
/////////////////////////////////////////
// function scheduleNote(note, timeMs) {
//     const vel = scaleValue(note.velocity, [0, 1], [0, 127]);
//     const delay = timeMs - Tone.Time(Tone.Transport.position).toMilliseconds();
//     const timeoutId = setTimeout(() => {
//         midiOutput.send([0x90, note.midi, vel]);
//     }, delay);
//     timeouts.push(timeoutId);
// }
// async function loadMidiData(midiData) {
//     isPlaying = true;  // Set the flag indicating that a MIDI is currently playing
//     resetPlayback(); // Reset playback when a new file is chosen
//     const midi = new Midi(midiData); // Convert the raw data into a Midi object
//     console.log("Parsed MIDI:", midi);
//     const track = midi.tracks[0];
//     Tone.Transport.start(); // Start the transport
//     if (!midiOutput) {
//         console.warn("MIDI output not available");
//         return;
//     }
//     const tempo = (midi.header.tempos && midi.header.tempos[0]) ? midi.header.tempos[0].bpm : 120; // Fallback to a default tempo if not defined ???
//     const ticksPerBeat = midi.header.ppq;
//     const msPerTick = (60 * 1000 / tempo) / ticksPerBeat;
//     track.notes.forEach((note) => {
//         if (!tickToMidiEventsMap[note.ticks]) {
//             tickToMidiEventsMap[note.ticks] = [];
//         }
//         tickToMidiEventsMap[note.ticks].push(note);
//     });
//     const totalTimeMs = track.durationTicks * msPerTick;
//     console.log(`Total time: ${totalTimeMs} ms`);
//     console.log(`Total transport time: ${track.durationTicks * msPerTick / 1000} s`);
//     setTimeout(() => {
//         loopPlayback();
//     }, totalTimeMs);
// }
/////////////////////////
// Working stuff below //
/////////////////////////
// Reset playback
function resetPlayback() {
    timeouts.forEach(clearTimeout); // Clear all scheduled notes
    timeouts = [];
    currentNoteIndex = 0;
    startTime = audioContext.currentTime;
    currentTick = 0; // Reset to the first tick
}
// // Schedule a note to be played
// // without Transport
function scheduleNote(note, timeMs, index) {
    const vel = scaleValue(note.velocity, [
        0,
        1
    ], [
        0,
        127
    ]);
    const scheduledTime = startTime + timeMs / 1000;
    const timeoutId = setTimeout(()=>{
        midiOutput.send([
            0x90,
            note.midi,
            vel
        ]);
        // console.log(`Note Number: ${note.midi}, Velocity: ${vel}, Scheduled Time: ${scheduledTime}`);
        currentNoteIndex = index + 1;
    // console.log(`${currentNoteIndex}: ${note.midi}, ${vel}`);
    }, (scheduledTime - audioContext.currentTime) * 1000);
    timeouts.push(timeoutId);
}
// //Main function that is responsible of retrieving the MIDI bytes, converting them into a MIDI object, parsing it, and scheduling the notes
// //without Transport
async function loadMidiData(midiData) {
    isPlaying = true; // Set the flag indicating that a MIDI is currently playing
    resetPlayback(); // Reset playback when a new file is chosen
    try {
        const midi = new Midi(midiData); // Convert the raw data into a Midi object
        processedMidiData = midiData; // Store the processed data in the global variable
        // Adjust negative delta values
        midi.tracks.forEach((track)=>{
            let accumulatedDelta = 0;
            track.notes.forEach((note)=>{
                if (note.ticks < 0) {
                    accumulatedDelta += note.ticks; // Accumulate the negative delta
                    note.ticks = 0; // Reset the current note's ticks to 0
                } else if (accumulatedDelta < 0) {
                    const adjustment = Math.min(note.ticks, -accumulatedDelta); // Calculate the possible adjustment
                    note.ticks -= adjustment; // Deduct the adjustment from the current note's ticks
                    accumulatedDelta += adjustment; // Adjust the accumulated delta
                }
            });
        });
        console.log("Parsed MIDI:", midi);
        const track = midi.tracks[0];
        Tone.Transport.start(); // Start the transport
        if (!midiOutput) {
            console.warn("MIDI output not available");
            return;
        }
        const tempo = midi.header.tempos && midi.header.tempos[0] ? midi.header.tempos[0].bpm : 120; // Fallback to a default tempo if not defined ???
        const ticksPerBeat = midi.header.ppq;
        const msPerTick = 60000 / tempo / ticksPerBeat;
        track.notes.forEach((note, index)=>{
            const timeMs = note.ticks * msPerTick;
            const timeInTicks = note.ticks; // TODO: for transport
            scheduleNote(note, timeMs, index);
        });
        const totalTimeMs = track.durationTicks * msPerTick;
        const totalTransportTime = track.durationTicks * msPerTick / 1000;
        console.log(`Total time: ${totalTimeMs} ms`);
        console.log(`Total transport time: ${track.durationTicks * msPerTick / 1000} s`);
        setTimeout(()=>{
            loopPlayback();
        }, totalTimeMs);
    } catch (error) {
        console.error("Error processing MIDI data:", error.message);
    }
}
// async function loadMidiData(midiData) {
//     isPlaying = true;  // Set the flag indicating that a MIDI is currently playing
//     resetPlayback(); // Reset playback when a new file is chosen
//     const midi = new Midi(midiData); // Convert the raw data into a Midi object
//     console.log("Parsed MIDI:", midi);
//     const track = midi.tracks[0];
//     Tone.Transport.start(); // Start the transport
//     if (!midiOutput) {
//         console.warn("MIDI output not available");
//         return;
//     }
//     const tempo = (midi.header.tempos && midi.header.tempos[0]) ? midi.header.tempos[0].bpm : 120; // Fallback to a default tempo if not defined ???
//     const ticksPerBeat = midi.header.ppq;
//     const msPerTick = (60 * 1000 / tempo) / ticksPerBeat;
//     track.notes.forEach((note, index) => {
//         const timeMs = note.ticks * msPerTick;
//         const timeInTicks = note.ticks; // TODO: for transport
//         scheduleNote(note, timeMs, index);
//     });
//     const totalTimeMs = track.durationTicks * msPerTick;
//     console.log(`Total time: ${totalTimeMs} ms`);
//     console.log(`Total transport time: ${track.durationTicks * msPerTick / 1000} s`);
//     setTimeout(() => {
//         loopPlayback();
//     }, totalTimeMs);
// }
// Loop the MIDI playback
function loopPlayback() {
    // Tone.Transport.stop();
    isPlaying = false; // Reset the flag once the playback finishes
    // Check if there's another MIDI in the queue and play it
    if (midiQueue.length > 0) playNextMidi();
    else // If there's no new MIDI in the queue, replay the current one
    loadMidiData(currentMidiForVisuals);
}
// Initialize the audio context on page load
startAudioContext();
// polling mechanism to regularly check globalFetch for new MIDI data:
setInterval(()=>{
    checkAndEnqueueMidi();
    playNextMidi();
}, 500);
// Check every 500 milliseconds. Adjust this value as necessary
//  document.getElementById('play-pause-btn').addEventListener('click', function() {
//     /// play pause button
//     console.log("Play/pause button clicked but not working yet :))");
// });
// Download the processed MIDI data
function downloadMidi() {
    if (!processedMidiData) {
        console.error("No MIDI data available for download.");
        return;
    }
    const midiBlob = new Blob([
        processedMidiData
    ], {
        type: "audio/midi"
    });
    const url = URL.createObjectURL(midiBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "2groove_gen.mid";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}
const downloadButton = document.getElementById("download-btn");
downloadButton.addEventListener("click", downloadMidi); ////////////////////////////
 ////////////////////////////
 ////////////////////////////
 // // w Transport
 // function scheduleNote(note, ticks, ticksPerBeat, bpm) {
 //     const vel = scaleValue(note.velocity, [0, 1], [0, 127]);
 //     const timeInSeconds = ticksToTime(ticks, ticksPerBeat, bpm);
 //     Tone.Transport.schedule(time => {
 //         midiOutput.send([0x90, note.midi, vel]);
 //         console.log(`Note Number: ${note.midi}, Velocity: ${vel}, Scheduled Time: ${time}`);
 //     }, timeInSeconds);
 // }
 // function scheduleNoteWithTone(note, timeInTicks, index, msPerTick) {
 //     const timeInSeconds = timeInTicks * msPerTick / 1000;
 //     const vel = scaleValue(note.velocity, [0, 1], [0, 127]);
 //     Tone.Transport.schedule(time => {
 //         midiOutput.send([0x90, note.midi, vel]);
 //         console.log(`Note Number: ${note.midi}, Velocity: ${vel}`);
 //     }, `+${timeInSeconds}`);
 // }
 // // w Transport
 // async function loadMidiData(midiData) {
 //     isPlaying = true;
 //     const midi = new Midi(midiData);
 //     const track = midi.tracks[0];
 //     if (!midiOutput) {
 //         console.warn("MIDI output not available");
 //         return;
 //     }
 //     const tempo = (midi.header.tempos && midi.header.tempos[0]) ? midi.header.tempos[0].bpm : 120;
 //     const ticksPerBeat = midi.header.ppq;
 //     const msPerTick = (60 * 1000 / tempo) / ticksPerBeat;
 //     // Reset any previous schedules on Tone.Transport
 //     Tone.Transport.cancel();
 //     track.notes.forEach((note, index) => {
 //         const timeInTicks = note.ticks;
 //         scheduleNoteWithTone(note, timeInTicks, index, msPerTick);
 //     });
 //     // Since you want it to loop indefinitely, let's schedule the re-loading of the MIDI data 
 //     // at the end of its duration.
 //     const totalTimeInTicks = track.durationTicks;
 //     Tone.Transport.scheduleOnce(() => {
 //         loopPlayback();
 //     }, `+${totalTimeInTicks * msPerTick / 1000}`);
 // }

},{"./globalFetch.js":"hwnEt","@parcel/transformer-js/src/esmodule-helpers.js":"gkKU3"}],"6uEKS":[function(require,module,exports) {
// Author: Çağrı Erdem, 2023
// Description: Interactive "piano roll" visualization for 2groove web app.
var _interfaceJs = require("./interface.js");
var _midiBroadcastJs = require("./midiBroadcast.js"); // import from broadcasting script instead of globalFetch.js
// Wrap entire sketch inside a function and use p5 instance mode to adapt it for module-based bundling 
// (functions become methods of the instance)
const sketch = (s)=>{
    // MIDI Handling
    s.loadMidiFile = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader(); // Removed s. prefix
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                s.parseMidi(arrayBuffer); // Removed s. prefix from arrayBuffer
            };
            reader.readAsArrayBuffer(file);
        }
    };
    // MIDI parse function without quantization
    s.parseMidi = function(arrayBuffer, verbose = false) {
        // Preliminary check for unexpected data format
        if (typeof arrayBuffer === "string" && arrayBuffer.startsWith("<!do")) {
            console.error("Received unexpected HTML data instead of MIDI");
            return; // exit function early
        }
        try {
            const midi = new Midi(arrayBuffer); // Assuming that `new Midi` can handle the raw arrayBuffer
            // Adjust negative delta values
            midi.tracks.forEach((track)=>{
                let accumulatedDelta = 0;
                track.notes.forEach((note)=>{
                    if (note.ticks < 0) {
                        accumulatedDelta += note.ticks; // Accumulate the negative delta
                        note.ticks = 0; // Reset the current note's ticks to 0
                    } else if (accumulatedDelta < 0) {
                        const adjustment = Math.min(note.ticks, -accumulatedDelta); // Calculate the possible adjustment
                        note.ticks -= adjustment; // Deduct the adjustment from the current note's ticks
                        accumulatedDelta += adjustment; // Adjust the accumulated delta
                    }
                });
            });
            s.noteSequences = midi.tracks.map((track)=>{
                if (verbose) track.notes.forEach((note)=>{
                    console.log(note);
                });
                return {
                    notes: track.notes.map((note)=>{
                        return {
                            pitch: note.midi,
                            startTime: note.time,
                            endTime: note.time + note.duration,
                            velocity: note.velocity // Include velocity in the note object
                        };
                    })
                };
            });
        } catch (error) {
            console.error("Error processing MIDI data in pRoll.js:", error.message);
        }
    };
    // s.parseMidi = function(arrayBuffer, verbose = false) { 
    //     const midi = new Midi(arrayBuffer);  // Removed s. prefix
    //     s.noteSequences = midi.tracks.map(track => {
    //         return { notes: track.notes.map(note => {
    //             if (verbose){
    //                 track.notes.forEach(note => {
    //                     console.log(note);
    //                 })}; 
    //             return {
    //                 pitch: note.midi,
    //                 startTime: note.time,
    //                 endTime: note.time + note.duration,
    //                 velocity: note.velocity // Include velocity in the note object
    //             };
    //         })};
    //     });
    // }
    // Constants and global variables
    s.NUM_STEPS = 32; // Number of quantized steps; this must be equal to the length of the array
    s.SUBDIVISIONS = 4; // quarter note = 1, eighth note = 2, etc.
    s.NUM_NOTES = 20; // total number of notes of the piano roll
    s.LOWEST_MIDI_NOTE = 34; // -1 worked better on the canvas
    s.noteSequences;
    s.resizingWidth = false;
    s.resizingHeight = false;
    s.WIDTH = 550;
    s.HEIGHT = 250;
    s.EDGE_THRESHOLD = 10; // Distance from edge to enable resizing
    s.offset_x = 1.3; // offset for the vertical lines and/or notes (if necessary)
    s.offset_y = 1.5;
    s.drumMappings = {
        35: "acoustic bass drum",
        36: "kick",
        37: "side-stick",
        38: "snare",
        39: "clap",
        40: "electric snare",
        41: "floor-tom",
        42: "closed-hihat",
        43: "high-tom",
        44: "pedal-hihat",
        45: "low-tom",
        46: "open-hihat",
        47: "mid-tom",
        48: "hi-tom",
        49: "crash",
        50: "high-tom",
        51: "ride",
        52: "chinese cymbal"
    };
    // Functions
    s.setup = function() {
        s.createCanvas(s.WIDTH, s.HEIGHT).parent("pianoRollContainer");
    // pRollCanvas.parent('pianoRollContainer'); // attach to the specific div
    // file input //no file input with the new UI
    // const midiInput = document.getElementById('fileInput'); // Get the input element by its ID
    // midiInput.addEventListener('change', s.loadMidiFile); // Add an event listener for when a user selects a file
    // // fetch button
    // let fetchButton = s.createButton('Fetch MIDI Data');
    // fetchButton.mousePressed(s.triggerMidiFetch); 
    };
    s.draw = function() {
        s.background("#fae"); // Set the background color of the entire canvas
        s.tappedRhythm = (0, _interfaceJs.getTappedRhythms)(); // Get the tapped rhythms from the interface module
        // Fetch MIDI data from the server
        const midi = (0, _midiBroadcastJs.getCurrentMidiForVisuals)();
        if (midi) s.parseMidi(midi);
        var x = 0 + s.offset_x;
        var y = 0 + s.offset_y;
        // var y = s.HEIGHT - s.WIDTH;
        s.drawTappedRhythm(s.tappedRhythm, x, y, s.WIDTH, s.WIDTH);
        if (s.noteSequences) s.drawNotes(s.noteSequences[0].notes, x, y, s.WIDTH, s.WIDTH);
        s.fill(255, 64);
        // Draw vertical lines for subdivisions
        s.stroke("white"); // Set line color to black
        const lineInterval = s.WIDTH / (s.NUM_STEPS / 4 * s.SUBDIVISIONS);
        for(let i = 0; i < s.WIDTH; i += lineInterval)s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        // Draw vertical lines for beats
        s.stroke("rgba(0,255,0,0.25)");
        s.strokeWeight(1.2);
        const beatInterval = s.WIDTH / (s.NUM_STEPS / 4);
        for(let i = 0; i < s.WIDTH; i += beatInterval)s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        // Draw vertical lines for bars
        s.stroke("rgb(0,255,0)");
        s.strokeWeight(0.8);
        const barInterval = s.WIDTH / (s.NUM_STEPS / 16);
        for(let i = 0; i < s.WIDTH; i += barInterval)s.line(i + s.offset_x, 0, i + s.offset_x, s.HEIGHT);
        s.showPopup(); // Show popup when mouse is near the edge of the note cell-sections
    };
    // Draw function for quantized tapped rhythm 
    s.drawTappedRhythm = function(tappedRhythm, x, y, width, height) {
        const totalDuration = tappedRhythm.length;
        s.push();
        s.translate(x, y);
        var cellWidth = width / totalDuration;
        var cellHeight = height / s.NUM_NOTES; // Assuming each tap corresponds to a note
        tappedRhythm.forEach(function(tap, index) {
            if (tap === 1) {
                var noteColor = s.color(219, 247, 19, 120); // Less opaque
                s.fill(noteColor);
                s.rect(cellWidth * index, 0, cellWidth, cellHeight);
            }
        });
        s.pop();
    };
    // Draw function without quantization
    s.drawNotes = function(notes, x, y, width, height) {
        const totalDuration = s.noteSequences.reduce((max, seq)=>{
            const endTimes = seq.notes.map((note)=>note.endTime);
            return Math.max(max, ...endTimes);
        }, 0);
        s.push();
        s.translate(x, y);
        var cellWidth = s.WIDTH / totalDuration; // Update cellWidth based on the new width
        var cellHeight = s.HEIGHT / s.NUM_NOTES; // Update cellHeight based on the new height
        notes.forEach(function(note) {
            var emptyNoteSpacer = 10;
            var noteColor = s.color(255, 0, 191, note.velocity * 255);
            s.stroke("black"); // strokes for the notes
            s.strokeWeight(0.6);
            s.fill(noteColor);
            s.rect(emptyNoteSpacer + cellWidth * note.startTime, s.HEIGHT - cellHeight * (note.pitch - s.LOWEST_MIDI_NOTE), cellWidth * (note.endTime - note.startTime) - emptyNoteSpacer, cellHeight);
        });
        s.pop();
    };
    // For example:
    s.mousePressed = function() {
        // Check if mouse is near the right edge of the canvas
        if (s.abs(s.mouseX - s.WIDTH) < s.EDGE_THRESHOLD) s.resizingWidth = true;
        // Check if mouse is near the bottom edge of the canvas
        if (s.abs(s.mouseY - s.HEIGHT) < s.EDGE_THRESHOLD) s.resizingHeight = true;
    };
    s.mouseDragged = function() {
        // If resizing width, update WIDTH based on mouseX
        if (s.resizingWidth) s.WIDTH = s.mouseX;
        // If resizing height, update HEIGHT based on mouseY
        if (s.resizingHeight) s.HEIGHT = s.mouseY;
        // Apply the new width and height to the canvas
        s.resizeCanvas(s.WIDTH, s.HEIGHT);
    };
    s.mouseReleased = function() {
        // Reset resizing flags
        s.resizingWidth = false;
        s.resizingHeight = false;
    };
    s.showPopup = function() {
        if (s.mouseX > s.offset_x && s.mouseX < s.WIDTH + s.offset_x && s.mouseY > 0 && s.mouseY < s.HEIGHT) {
            const cellHeight = s.HEIGHT / s.NUM_NOTES;
            const section = Math.floor((s.HEIGHT - s.mouseY) / cellHeight);
            const midiNote = parseInt(Object.keys(s.drumMappings)[section]);
            if (midiNote >= s.LOWEST_MIDI_NOTE && midiNote != 35) {
                const drumPart = s.drumMappings[midiNote];
                const popupWidth = s.textWidth(drumPart) + 10;
                // Decide the x position of the popup based on mouseX
                let popupX = s.mouseX + 5;
                if (s.mouseX > (s.WIDTH + s.offset_x) / 2) popupX = s.mouseX - popupWidth - 5;
                s.fill(255);
                s.rect(popupX, s.mouseY, popupWidth, 20);
                s.fill(0);
                s.text(drumPart, popupX + 5, s.mouseY + 15);
            }
        }
    };
};
// Run the sketch:
new p5(sketch);

},{"./interface.js":"kBoq1","./midiBroadcast.js":"lFIIu"}],"6ZafJ":[function(require,module,exports) {
// worker for client-side ajax requests
self.addEventListener("message", function(event) {
    const data = event.data;
    if (data.cmd === "sendArray") sendArrayToServer(data.array, data.bpm, data.temperatureValue, data.hitTolerance, data.isHttpConnected, data.httpIp, data.portInput, data.samplingStrategy);
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
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            array: array,
            bpm: bpm,
            temp: temperatureValue,
            thresh: hitTolerance,
            samplingStrategy: samplingStrategy
        })
    };
    fetch(data_url, payload).then((response)=>response.json()) // Process as JSON first
    // checking the success field of the response, and if it's true, you're converting the data field (base64 encoded string of the MIDI binary) 
    // back to a byte array, and then you're posting this byte array back to the main thread:
    .then((data)=>{
        if (data.success) {
            console.log("Processing tapped rhythms...");
            // const midiData = new Uint8Array(data.data);  // Convert base64 string to byte array
            const base64decoded = atob(data.data);
            const midiData = new Uint8Array(base64decoded.length).map((_, i)=>base64decoded.charCodeAt(i));
            console.log("Received MIDI data length:", midiData.length);
            self.postMessage({
                type: "arrayProcessed",
                data: midiData
            });
        } else {
            console.warn(data.message);
            self.postMessage({
                type: "error",
                error: new Error(data.message)
            });
        }
    }).catch((error)=>{
        console.error("Error:", error);
        self.postMessage({
            type: "error",
            error: error
        });
    });
}

},{}],"7u5lR":[function(require,module,exports) {
// dedicated thread for queueing up rhythms
let midiEvents = []; // This will hold the queued MIDI events
self.addEventListener("message", function(event) {
    const data = event.data;
    switch(data.cmd){
        case "enqueue":
            midiEvents.push(data.event);
            break;
        case "dequeue":
            // Logic to decide which event(s) should be sent next
            const nextEvent = midiEvents.shift(); // Simplified example
            self.postMessage({
                cmd: "broadcast",
                event: nextEvent
            });
            break;
    }
});

},{}]},["46McK","1SICI"], "1SICI", "parcelRequirefc44")

//# sourceMappingURL=index.18dbc454.js.map
