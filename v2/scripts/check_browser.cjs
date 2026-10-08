// Run against the local server. Set PLAYWRIGHT_MODULE to a Playwright installation if needed.
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Local engine'));
 await page.fill('#bpm','300');await page.click('#setTempo');await page.click('#record');
 await page.waitForFunction(()=>document.querySelector('#recordStatus').textContent.startsWith('Recording'));
 for(let i=0;i<3;i++){await page.keyboard.press('Space');await page.waitForTimeout(140);}
 await page.click('#finish');await page.waitForFunction(()=>document.querySelector('#takeCount').textContent.startsWith('3 taps'));
 checks.push('Keyboard capture after focused Record button: 3 taps');
 await page.fill('#bpm','120');await page.click('#setTempo');await page.click('#demo');
 async function generate(){const response=page.waitForResponse(r=>r.url().endsWith('/api/generate')&&r.request().method()==='POST');await page.click('#generate');const r=await response;if(r.status()!==202)throw Error(await r.text());await page.waitForTimeout(800);await page.waitForFunction(()=>!document.querySelector('#generate').disabled);if(await page.locator('#notice').isVisible())throw Error(await page.locator('#notice').textContent());}
 await generate();checks.push('Procedural '+await page.locator('#jobStatus').textContent());
 await page.click('#pinA');await page.click('#play');await page.waitForFunction(()=>document.querySelector('#transportStatus').textContent==='Playing');await page.click('#stop');
 await page.locator('.hit').first().click();await page.fill('#noteVelocity','95');await page.locator('#noteVelocity').press('Tab');await page.click('#undo');
 checks.push('Sample preview, stop, exact note edit and undo');
 await page.selectOption('#engine','cvae');await generate();checks.push('CVAE '+await page.locator('#jobStatus').textContent());
 await page.click('#polyDetails summary');await page.selectOption('#polyMode','ni_grid');await page.selectOption('#axis','nonisochrony');await generate();
 const [midi]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);await midi.saveAs(path.join(out,'ui-export.mid'));
 const [session]=await Promise.all([page.waitForEvent('download'),page.click('#save')]);await session.saveAs(path.join(out,'ui-session.json'));
 const data=JSON.parse(fs.readFileSync(path.join(out,'ui-session.json')));if(data.selected.notes.filter(n=>n.drum===7).length!==8)throw Error('Expected 8 NI-grid onsets');
 await page.setInputFiles('#open',path.join(out,'ui-session.json'));await page.waitForTimeout(300);
 if(await page.locator('#notice').isVisible())throw Error(await page.locator('#notice').textContent());
 checks.push('NI-grid, session save/open, MIDI download');
 // Route only new virtual app ports; no DAW/controller is selected.
 await page.click('#midiPanel summary');await page.selectOption('#tapInput','@virtual:tap');await page.selectOption('#clockInput','@virtual:clock');await page.selectOption('#midiOutput','@virtual');await page.click('#connectMidi');await page.waitForFunction(()=>document.querySelector('#midiStatus').textContent.startsWith('Connected'));
 await page.click('#disconnectMidi');await page.waitForFunction(()=>document.querySelector('#midiStatus').textContent==='Disconnected');checks.push('Native virtual-port connect/disconnect');
 await page.screenshot({path:path.join(out,'ui-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'ui-mobile.png'),fullPage:true});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
 if(errors.length)throw Error(errors.join('\n'));
 checks.push('390 px mobile layout; no uncaught JS errors');
 fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({checks},null,2));console.log(checks.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
