const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:430,height:900}});const logs=[];
p.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push(m.type()+': '+m.text().slice(0,300))});p.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
await p.goto('http://localhost:4173/friend-village/');await p.waitForTimeout(+process.argv[3]||4000);
await p.screenshot({path:process.argv[2]});console.log(logs.slice(0,30).join('\n'));await b.close()})();
