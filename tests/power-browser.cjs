// Run from the repository root. Optional TVM_PLAYWRIGHT_PATH and TVM_BROWSER_PATH select local tooling.
const {chromium}=require(process.env.TVM_PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
(async()=>{
 const root=process.cwd();const profile=fs.mkdtempSync(path.join(os.tmpdir(),'tvm-power-'));
 let ctx;
 try {
  ctx=await chromium.launchPersistentContext(profile,{headless:true,...(process.env.TVM_BROWSER_PATH ? {executablePath:process.env.TVM_BROWSER_PATH} : {}),args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`],viewport:{width:400,height:760}});
  let worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:15000});
  const id=worker.url().split('/')[2]; console.log('Extension worker loaded');
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.locator('#powerToggle:not([disabled])').waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(os.tmpdir(),'tvm-power-on.png')});
  const layout=await page.evaluate(()=>{ const b=s=>document.querySelector(s).getBoundingClientRect();return {header:b('header').right,theme:b('.headerActions .switch').right,power:b('#powerToggle').left,title:b('header h3').right,actions:b('.headerActions').left,overflow:document.documentElement.scrollWidth};});
  if(layout.title>layout.actions||layout.overflow>400||layout.theme>=layout.power)throw Error('Header collision '+JSON.stringify(layout));
  await page.locator('#powerToggle').click();await page.waitForFunction(()=>document.body.classList.contains('powerOff'));
  if(!await page.locator('#volumePanel').evaluate(n=>n.inert))throw Error('Panel not inert');
  await page.screenshot({path:path.join(os.tmpdir(),'tvm-power-off.png')});
  await page.reload();await page.waitForFunction(()=>document.body.classList.contains('powerOff'));
  await page.locator('#themeToggle').evaluate(n=>n.click());
  await page.screenshot({path:path.join(os.tmpdir(),'tvm-power-off-light.png')});
  await page.locator('#powerToggle').click();await page.waitForFunction(()=>!document.body.classList.contains('powerOff'));
  if(!await worker.evaluate(async()=> (await chrome.storage.local.get('tvmEnabled')).tvmEnabled))throw Error('Power not persisted');
  for (const mode of ['off', 'on', 'off-again']) {
    const audioPage = await ctx.newPage();
    await audioPage.goto('data:text/html,<body>Audio bypass test</body>');
    await audioPage.evaluate(() => { window.AudioContext = function() { return new OfflineAudioContext(2, 4800, 48000); }; });
    await audioPage.addScriptTag({ content: fs.readFileSync(path.join(root,'stereo.js'),'utf8') });
    await audioPage.addScriptTag({ content: fs.readFileSync(path.join(root,'content.js'),'utf8') });
    const error = await audioPage.evaluate(async mode => {
      const send = async data => { window.postMessage(data,'*'); await new Promise(resolve=>setTimeout(resolve,10)); };
      await send({type:'ZAZ_VOLUME_UPDATE',volume:0,effectMode:'bass',effectAmount:20,eqBands:Array(10).fill(12)});
      const audio = new window.AudioContext();
      if (mode !== 'off') await send({type:'TVM_POWER',enabled:true});
      if (mode === 'off-again') await send({type:'TVM_POWER',enabled:false});
      const buffer=audio.createBuffer(2,4800,48000);
      buffer.getChannelData(0).fill(.2); buffer.getChannelData(1).fill(-.1);
      const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.start();
      const output=await audio.startRendering();
      let error=0;
      for(let c=0;c<2;c++)for(let i=0;i<4800;i++)error=Math.max(error,Math.abs(output.getChannelData(c)[i]-(mode==='on'?0:buffer.getChannelData(c)[i])));
      return error;
    },mode);
    if(error>1e-6)throw Error('Audio render failed '+mode+' '+error);
    console.log('Native Web Audio '+mode+': maximum sample error '+error);
    await audioPage.close();
  }
  console.log(JSON.stringify({layout,errors,popup:'power toggle, reload persistence, theme while off, re-enable passed'}));
  if(errors.length)throw Error(errors.join('\n'));
 } finally {if(ctx)await ctx.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
