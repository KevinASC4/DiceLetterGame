// ===== DOM =====
const ownedTilesDiv = document.getElementById('owned-tiles');
const wildTilesDiv = document.getElementById('wild-tiles');
const wordBuilder = document.getElementById('word-builder');
const rollBtn = document.getElementById('roll-dice');
const buyBtn = document.getElementById('buy-tiles-btn');
const coinsSpan = document.getElementById('coins');
const priceDisplay = document.getElementById('total-price');
const potentialWinSpan = document.getElementById('potential-win');
const nameInput = document.getElementById('player-name-input');
const classInput = document.getElementById('player-class-input');
const startBtn = document.getElementById('start-game-btn');
const playerIdSpan = document.getElementById('player-id');
const timeStartSpan = document.getElementById('time-start');
const timeElapsedSpan = document.getElementById('time-elapsed');

// ===== STATE =====
let coins = 200;
let currentRoll = [];
let playerTiles = [];
let wildTiles = Array.from({length:7},()=>({type:'wild'}));
let startTime = null;
let timer = null;
let playerId = "";
let gameLog = [];

// ===== LETTER COSTS =====
const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,
  I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,
  Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// ===== LOGGING =====
function logAction(action, details={}) {
  if(!startTime) return;
  const now = new Date();
  gameLog.push({
    PlayerID: playerId,
    Action: action,
    Details: JSON.stringify(details),
    Coins: coins,
    Time: now.toLocaleTimeString(),
    ElapsedSeconds: Math.floor((now-startTime)/1000)
  });
}

// ===== PLAYER START =====
startBtn.onclick = () => {
  const name = nameInput.value.trim();
  const cls = classInput.value.trim();
  if(!name||!cls) return alert("Enter name & class");
  playerId = `${name.toUpperCase()}-${cls.toUpperCase()}`;
  playerIdSpan.textContent = playerId;

  startTime = new Date();
  timeStartSpan.textContent = startTime.toLocaleTimeString();

  if(timer) clearInterval(timer);
  timer = setInterval(()=>{
    const sec = Math.floor((Date.now()-startTime)/1000);
    timeElapsedSpan.textContent = `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  },1000);

  logAction("GAME_START",{coins});
};

// ===== DICE ROLL =====
rollBtn.onclick = () => {
  if(!startTime) return alert("Start the game first");
  currentRoll = Array.from({length:Math.floor(Math.random()*5)+2},
    ()=>Object.keys(letterCost)[Math.floor(Math.random()*26)]
  );
  renderRoll();
  logAction("ROLL",{letters:currentRoll});
};

function renderRoll() {
  const rollDiv = document.getElementById('current-roll');
  rollDiv.innerHTML='';
  let sum = 0;
  currentRoll.forEach(l=>{
    sum+=letterCost[l];
    const d=document.createElement('div');
    d.className='tile';
    d.textContent=l;
    rollDiv.appendChild(d);
  });
  priceDisplay.textContent=currentRoll.length?`Total Price: $${sum}`:'';
}

// ===== BUY =====
buyBtn.onclick=()=>{
  if(!currentRoll.length) return;
  const price=currentRoll.reduce((s,l)=>s+letterCost[l],0);
  if(coins<price) return alert("Not enough coins");
  coins-=price;
  coinsSpan.textContent=coins;
  playerTiles.push(...currentRoll.map(l=>({letter:l,type:'normal'})));
  currentRoll=[];
  renderOwned();
  renderRoll();
  logAction("BUY_TILES",{price});
};

// ===== RENDER OWNED =====
function renderOwned(){
  ownedTilesDiv.innerHTML='';
  playerTiles.forEach((t,i)=>{
    const d=document.createElement('div');
    d.className='tile';
    d.textContent=t.letter;
    d.draggable=true;
    d.ondragstart=e=>e.dataTransfer.setData('i',i);
    ownedTilesDiv.appendChild(d);
  });
  renderWild();
  updateWordScore();
}

function renderWild(){
  wildTilesDiv.innerHTML='';
  wildTiles.forEach((_,i)=>{
    const d=document.createElement('div');
    d.className='tile wild-tile';
    d.textContent='*';
    d.onclick=()=>{
      const l=prompt("Wildcard letter A-Z");
      if(!/^[A-Z]$/i.test(l)) return;
      playerTiles.push({letter:l.toUpperCase(),type:'wild'});
      wildTiles.splice(i,1);
      renderOwned();
      logAction("WILDCARD_USED",{letter:l.toUpperCase()});
    };
    wildTilesDiv.appendChild(d);
  });
}

// ===== DRAG TO WORD =====
wordBuilder.ondragover=e=>e.preventDefault();
wordBuilder.ondrop=e=>{
  const i=e.dataTransfer.getData('i');
  const t=playerTiles[i];
  if(!t) return;
  playerTiles.splice(i,1);
  const d=document.createElement('div');
  d.className='tile';
  d.textContent=t.letter;
  d.dataset.type=t.type;
  d.onclick=()=>{
    playerTiles.push({letter:t.letter,type:t.type});
    wordBuilder.removeChild(d);
    renderOwned();
    updateWordScore();
    logAction("RETURN_TILE",{letter:t.letter});
  };
  wordBuilder.appendChild(d);
  renderOwned();
  updateWordScore();
};

// ===== WORD SCORE =====
function updateWordScore(){
  let sum=0;
  [...wordBuilder.children].forEach(d=>{
    sum+=d.dataset.type==='wild'?1:letterCost[d.textContent];
  });
  potentialWinSpan.textContent=sum*sum;
}

// ===== SUBMIT WORD =====
document.getElementById('check-word-btn').onclick=async()=>{
  const tiles=[...wordBuilder.children];
  if(!tiles.length) return alert("No word built");
  const word=tiles.map(t=>t.textContent).join('');
  try{
    const res=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toUpperCase()}`);
    if(!res.ok) throw new Error("Invalid word");
  }catch{
    logAction("INVALID_WORD",{word});
    return alert(`"${word}" is not valid`);
  }
  let sum=0;
  tiles.forEach(t=>sum+=t.dataset.type==='wild'?1:letterCost[t.textContent]);
  const payout=sum*sum;
  coins+=payout;
  coinsSpan.textContent=coins;
  logAction("SUBMIT_WORD",{word,payout});
  wordBuilder.innerHTML='';
  potentialWinSpan.textContent=0;
  alert(`"${word}" accepted! +$${payout}`);
};

// ===== LETTER GRID =====
function renderLetterPriceGrid(){
  const grid=document.getElementById('letter-price-grid');
  grid.innerHTML='';
  Object.entries(letterCost).forEach(([l,c])=>{
    const d=document.createElement('div');
    d.className='tile';
    d.innerHTML=`<div>${l}</div><small>${c}</small>`;
    grid.appendChild(d);
  });
}
renderLetterPriceGrid();

// ===== EXPORT TO DROPBOX =====
const ACCESS_TOKEN = "sl.u.AGPa9biCvPcR5gIQn6DLVOnE_LIM6hHc4DkV0xujUbiGRyWWqv3Ose8wdcn_W_nK5cgbOwakzPjmcjZezWZwor6Ec7drcXNHQBYrGqqDDR1GcaAGf_8ZL4YozkS3FmwFrbSMdper2-y8Xovfa2j1IAG7HGbXloLFwQUriEwwJa5tfvdNa1eyEfutdtDheo4CPTl5NeI2xYgSjWiiTBO8Brw9c3eY3kltowZTZUKMVd9Su7Dzg-mNaj5PWc_RPVEFZyTTYOuqAWUfFYMViTYaYDg3w4HrFbVnWD9YDF7a7ZAUFDjn_ofg8vwq-6QxqZD0MJQjPX3xwz3tpINxHIZF9YVD_GomyJgs-RYORTsFcucOy9YikOoouyHkaALOpUvK8w0Ge1LsbnfNndr4SPnZcfLJPpPuMg1B-KzmRfPL0HQspqcSEHomw7axx19sp-rSa8qBXWYmfBy22ODckk3eZ4c6XaLoAIiC7BrumIpdhrQI8oNxmaT5AiYxPGcWw4zyVwhJYv4AebtEjhNnXIxq9m-1J3Kpua20R5NqdpYifb9Wk0Yda4vGfyDFfoSUDFzvy9QS8CTC2HaiiKAsH87ulKPdCGlX7d8drGCBM9RjkKacAuxoFWuttJsw-EgTiOS57GZD56L6vzIZiDowclJVYSA8KJ1dj7eELjTRaoufns2ewKTxucI4AdrMMXAVr917TSTGtVl0S3hmQM5v5F4j3FWRd5bh_FMWnUjYrId7evTex-iKBSWLtdS-M15btj3Co6x3Et5N3ZmQ_oRHClk-5YUlS_Nu49F3Hu2zumlF_57Rn1iRoTZhOzxNkvZ6uADT76R1bCkML5JxVwebmya--PlOWV3OpHMiif2kpxW5-ZuW0tseGOErj8oeOfsU5vve7Qu_tA4qBY8oTDtpI6jmPMOfQ3qLrzjzcS085hfoU07S2LLV7NMoeHQMfPXIo_4CiR_MvZ410T8VAGKXr2okPsvmjjZcdZbWoAvnn4mIm_FPUMpd2hMM4BR03FqS029aK7DvTIlU8aBHIuZ2SZxla_9KwYKoe61oN0y0SeNgLtEfbT44qgsuNaxF6gn6ZH8J_xcTmKp-nbFH2lrTNxAcGK5q-GCWX6rB_idk6X_LXlBUH_rywhdszVXsSY_9R6H9Qo3S3Aie2C6H7L3DelWvFLXRe8En9rTAFoa9SwQt4F_Okx2HzBRVXXrkFqoapwyjoa0yO87U3DkgJFIHyt0GWVKsdhdWDhKPwYusOEWGaKvyDcVB1kyrk6AkrDvMHVrRw9uuZsGwp4ZR2XrIwylAqStOCSJlBSTe3SARqcO76tvitlo59WvWe7-optppUOSUYAczszJP8SQC54OuBOzoJN54l2sSqum8Uc8GPY_FgL81LMMvqCV7e3sgJlcyWm6kNfwC3oj-vZgahN_Kxw3UDl_-gMWqh977a2Kf4_GgmvK0IQ";
const dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });

async function exportGameLogToDropbox() {
  if (!gameLog.length) return showNotification("No data to upload");

  const ws = XLSX.utils.json_to_sheet(gameLog);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Game Log");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // Add date/time to filename
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = `/TestFiles/${playerId || "Player"}_Log_${timestamp}.xlsx`;

  try {
    await dbx.filesUpload({ path: filename, contents: wbout, mode: "overwrite" });
    showNotification(`Uploaded to Dropbox ✅`);
  } catch (err) {
    console.error(err);
    showNotification("Dropbox upload failed ❌");
  }
}

document.getElementById("exportBtn").onclick = exportGameLogToDropbox;

// ===== NOTIFICATION =====
function showNotification(msg) {
  const notif = document.getElementById("notification");
  notif.textContent = msg;
  notif.classList.add("show");
  setTimeout(() => notif.classList.remove("show"), 3000);
}
