const RPC='https://rpc.testnet.arc.io'
const VAULT='0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function rpc(method,params,tries=6){
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})
      const j=await r.json()
      if(j.error){ if(i===tries-1) return {err:j.error}; await sleep(400*(i+1)); continue }
      return {res:j.result}
    }catch(e){ if(i===tries-1) return {err:e.message}; await sleep(400*(i+1)) }
  }
}
const TOPICS={
  YieldClaimed:'0x84e1389edd44019636d59c6d5a2a4ada30fffbcdc5c54f397c7ce440535117f8',
  Staked:'0xa2a62e1cc3e20f8692b7a85ee11f09e9c0f0c2cd028ba26400f65c7bd55361ee',
  Unstaked:'0x869a01319d83bb921803a22e3e95d0cb8b08e708d3fb144e2c25a563bf8650d3',
  StarActivated:'0xab76c60567595463276aeb0d6a3fcd13ac0e133e233d08cf2a25f8fbf25477c8',
}
const START=0x2d45e89
const {res:tipHex}=await rpc('eth_blockNumber',[])
const TIP=parseInt(tipHex,16)
console.log('deployBlock',START,'tip',TIP,'span',TIP-START)
const CH=9999
const counts={YieldClaimed:0,Staked:0,Unstaked:0,StarActivated:0}
const samples=[]
let errs=0, windows=0
for(let from=START; from<=TIP; from+=CH+1){
  const to=Math.min(from+CH,TIP)
  windows++
  const {res,err}=await rpc('eth_getLogs',[{address:VAULT,fromBlock:'0x'+from.toString(16),toBlock:'0x'+to.toString(16)}])
  if(err){errs++; continue}
  for(const l of res){
    const t=l.topics[0]
    for(const [name,tp] of Object.entries(TOPICS)) if(t===tp){counts[name]++; if(samples.length<40) samples.push({name,block:parseInt(l.blockNumber,16),tx:l.transactionHash,topics:l.topics,data:l.data})}
  }
  if(windows%100===0) console.log('...windows',windows,'to',to,JSON.stringify(counts),'errs',errs)
  await sleep(60)
}
console.log('WINDOWS',windows,'ERRORS',errs)
console.log('COUNTS',JSON.stringify(counts))
console.log('SAMPLES',JSON.stringify(samples,null,1))
