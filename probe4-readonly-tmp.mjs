import fs from 'fs'
const OUT=process.env.OUTFILE
const RPC='https://rpc.testnet.arc.io'
const VAULT='0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const log=s=>fs.appendFileSync(OUT,s+'\n')
async function rpc(method,params,tries=10){
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})
      const j=await r.json()
      if(j.error){ if(i===tries-1) return {err:JSON.stringify(j.error)}; await sleep(500+400*i); continue }
      return {res:j.result}
    }catch(e){ if(i===tries-1) return {err:String(e)}; await sleep(500+400*i) }
  }
}
const TOPICS={YieldClaimed:'0x84e1389edd44019636d59c6d5a2a4ada30fffbcdc5c54f397c7ce440535117f8',Staked:'0xa2a62e1cc3e20f8692b7a85ee11f09e9c0f0c2cd028ba26400f65c7bd55361ee',Unstaked:'0x869a01319d83bb921803a22e3e95d0cb8b08e708d3fb144e2c25a563bf8650d3',StarActivated:'0xab76c60567595463276aeb0d6a3fcd13ac0e133e233d08cf2a25f8fbf25477c8'}
const START=0x2d45e89
const {res:tipHex}=await rpc('eth_blockNumber',[])
const TIP=parseInt(tipHex,16)
const CH=9999
const ranges=[]
for(let from=START; from<=TIP; from+=CH+1) ranges.push([from,Math.min(from+CH,TIP)])
log(`START ${START} TIP ${TIP} windows ${ranges.length}`)
const counts={YieldClaimed:0,Staked:0,Unstaked:0,StarActivated:0,other:0}
const failed=[]; const samples=[]
let done=0
for(const [f,t] of ranges){
  const {res,err}=await rpc('eth_getLogs',[{address:VAULT,fromBlock:'0x'+f.toString(16),toBlock:'0x'+t.toString(16)}])
  done++
  if(err||!res){failed.push([f,t]); if(failed.length<4) log('ERR '+err); continue}
  for(const l of res){
    const t0=l.topics[0]; let m=false
    for(const [name,tp] of Object.entries(TOPICS)) if(t0===tp){counts[name]++;m=true; if(samples.length<60) samples.push({name,block:parseInt(l.blockNumber,16),tx:l.transactionHash,topics:l.topics,data:l.data})}
    if(!m){counts.other++; if(samples.length<60) samples.push({name:'other',block:parseInt(l.blockNumber,16),tx:l.transactionHash,topic0:t0})}
  }
  if(done%50===0) log(`progress ${done}/${ranges.length} ${JSON.stringify(counts)} failedWindows=${failed.length}`)
  await sleep(120)
}
log(`PASS1 done=${done} failedWindows=${failed.length} ${JSON.stringify(counts)}`)
// retry failures
let retryFail=[]
for(const [f,t] of failed){
  const {res,err}=await rpc('eth_getLogs',[{address:VAULT,fromBlock:'0x'+f.toString(16),toBlock:'0x'+t.toString(16)}],12)
  if(err||!res){retryFail.push([f,t]); continue}
  for(const l of res){
    const t0=l.topics[0]; let m=false
    for(const [name,tp] of Object.entries(TOPICS)) if(t0===tp){counts[name]++;m=true; if(samples.length<60) samples.push({name,block:parseInt(l.blockNumber,16),tx:l.transactionHash,topics:l.topics,data:l.data})}
    if(!m) counts.other++
  }
  await sleep(200)
}
log(`FINAL COUNTS ${JSON.stringify(counts)}`)
log(`UNSCANNED_WINDOWS ${retryFail.length} of ${ranges.length}`)
if(retryFail.length) log(`UNSCANNED ${JSON.stringify(retryFail.slice(0,20))}`)
log(`SAMPLES ${JSON.stringify(samples,null,1)}`)
