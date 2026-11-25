const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:430,height:900}});const logs=[];
p.on('console',m=>{if(m.type()==='error')logs.push('ERR '+m.text().slice(0,300))});p.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
await p.goto('http://localhost:4173/friend-village/');await p.waitForTimeout(4000);
const steps=JSON.parse(process.argv[2]);let i=0;
for(const s of steps){
  try{
    if(s.text){await p.getByText(s.text,{exact:false}).first().click({timeout:3000});}
    else if(s.label){await p.getByLabel(s.label,{exact:false}).first().click({timeout:3000});}
    else if(s.xy){await p.mouse.click(s.xy[0],s.xy[1]);}
  }catch(e){logs.push('STEP FAIL '+JSON.stringify(s)+' '+e.message.split('\n')[0]);}
  await p.waitForTimeout(s.wait||1500);
  await p.screenshot({path:`${process.argv[3]}_${++i}.png`});
}
console.log(logs.join('\n')||'no errors');await b.close()})();
