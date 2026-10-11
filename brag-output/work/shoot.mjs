import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [mode,...ts]=process.argv.slice(2);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1920,height:1080}});
await pg.goto('file://'+process.cwd()+'/scene.html');await pg.evaluate(()=>window.ready);await pg.waitForTimeout(300);
if(mode==='stills'){for(const t of ts){await pg.evaluate(t=>render(+t),t);await pg.screenshot({path:`still_${t}.png`});}}
else{const N=Math.round(21.5*30);for(let i=0;i<N;i++){await pg.evaluate(t=>render(t),i/30);await pg.screenshot({path:`frames/f${String(i).padStart(4,'0')}.png`});}}
await b.close();
