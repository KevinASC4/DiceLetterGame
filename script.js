// ===== DOM Elements =====
const diceImg = document.getElementById('dice');
const rollBtn = document.getElementById('roll-dice');
const letterBank = document.getElementById('letter-bank'); 
const ownedLettersDiv = document.getElementById('owned-letters');
const wordBuilder = document.getElementById('word-builder'); 
const checkWordBtn = document.getElementById('check-word-btn');
const finishBtn = document.getElementById('finish-game-btn');
const usedWordBank = document.getElementById('used-word-bank');
const coinsSpan = document.getElementById('coins');
const scoreSpan = document.getElementById('score');
const notification = document.getElementById('notification');

// ===== Game State =====
let coins = 180;
let score = 0;
let lettersOwned = [];  
let usedWords = [];
let currentRollLetters = []; 
let diceFaces = [
  "public/assets/dice/32x/front-side-1.png",
  "public/assets/dice/32x/front-2.png",
  "public/assets/dice/32x/front-3.png",
  "public/assets/dice/32x/front-side-4.png",
  "public/assets/dice/32x/front-5.png",
  "public/assets/dice/32x/front-6.png"
];

// ===== Letter Pools =====
const letterGroups = {
  1: ['Q','Z','X','J'],
  2: ['K','V','W','Y'],
  3: ['B','C','M','P'],
  4: ['F','H','G','L','D'],
  5: ['A','E','I','O','U','S','T','R'],
  6: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
};

const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// ===== Dice Roll Animation =====
function rollDiceAnimation(finalNumber, callback) {
  let i = 0;
  const interval = setInterval(() => {
    diceImg.src = diceFaces[i % 6];
    i++;
  }, 100);
  setTimeout(() => {
    clearInterval(interval);
    diceImg.src = diceFaces[finalNumber-1];
    if(callback) callback(finalNumber);
  }, 1000);
}

// ===== Roll Dice =====
rollBtn.addEventListener('click', () => {
  const roll = Math.floor(Math.random()*6)+1;
  rollDiceAnimation(roll, handleLetterRoll);
});

// ===== Handle Letter Roll =====
function handleLetterRoll(roll) {
  currentRollLetters = [...letterGroups[roll]];
  renderCurrentRollLetters();
}

// ===== Render letters from current roll =====
function renderCurrentRollLetters() {
  letterBank.innerHTML='';
  currentRollLetters.forEach((letter, idx)=>{
    if(letter){
      const div = document.createElement('div');
      div.classList.add('letter-bank-item');
      div.textContent = letter;
      div.addEventListener('click', () => buyLetter(idx));
      letterBank.appendChild(div);
    }
  });
}

// ===== Buy Letter =====
function buyLetter(idx){
  const letter = currentRollLetters[idx];
  const cost = letterCost[letter] || 1;
  if(coins>=cost){
    coins -= cost;
    lettersOwned.push({letter: letter, used: false});
    coinsSpan.textContent = coins;

    currentRollLetters[idx] = null;
    renderCurrentRollLetters();
    renderLetterBank();
    showNotification('success', `Bought ${letter} for ${cost} coins`);
  } else showNotification('error','Not enough coins!');
}

// ===== Render Owned Letters (Letter Bank) =====
function renderLetterBank(){
  ownedLettersDiv.innerHTML='';
  lettersOwned.forEach((obj, idx)=>{
    if(!obj || obj.used) return; // skip used letters
    const div = document.createElement('div');
    div.classList.add('letter-bank-item');
    div.textContent = obj.letter;
    div.draggable=true;
    div.dataset.idx=idx;
    div.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', idx);
    });
    ownedLettersDiv.appendChild(div);
  });
}

// ===== Drag & Drop Word Builder =====
wordBuilder.addEventListener('dragover', e=> e.preventDefault());
wordBuilder.addEventListener('drop', e=>{
  e.preventDefault();
  const idx = e.dataTransfer.getData('text');
  const letterObj = lettersOwned[idx];
  if(!letterObj || letterObj.used) return;

  // Mark as used in bank
  letterObj.used = true;

  const div=document.createElement('div');
  div.classList.add('letter-bank-item');
  div.textContent = letterObj.letter;
  div.dataset.idx=idx;
  div.draggable=true;

  // Allow returning to bank on click
  div.addEventListener('click', ()=>{
    letterObj.used = false;
    renderLetterBank();
    wordBuilder.removeChild(div);
  });

  wordBuilder.appendChild(div);
  renderLetterBank();
});

// ===== Check Word =====
checkWordBtn.addEventListener('click', async ()=>{
  const children = Array.from(wordBuilder.children);
  const word = children.map(d=>d.textContent).join('');
  if(!word) return showNotification('error','No word created','word-notification');

  try{
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if(res.ok){
      const wordScore = calculateWordScore(word);
      score += wordScore;
      scoreSpan.textContent = score;
      showNotification('success',`Word valid! +${wordScore} points`);

      usedWords.push({word, score: wordScore});
      renderUsedWords();

      wordBuilder.innerHTML = '';
    } else {
      showNotification('error','Word invalid!','word-notification');
      // Unlock letters so they can be reused
      children.forEach(d=>{
        const idx = parseInt(d.dataset.idx);
        lettersOwned[idx].used = false;
      });
      renderLetterBank();
    }
  } catch(err){
    showNotification('error','Error checking word','word-notification');
    children.forEach(d=>{
      const idx = parseInt(d.dataset.idx);
      lettersOwned[idx].used = false;
    });
    renderLetterBank();
  }
});


// ===== Render Used Words =====
function renderUsedWords(){
  usedWordBank.innerHTML='';
  usedWords.forEach(w=>{
    const div=document.createElement('div');
    div.textContent=`${w.word} (+${w.score})`;
    div.style.display='block';
    usedWordBank.appendChild(div);
  });
}

// ===== Calculate Score =====
function calculateWordScore(word){
  const multiplier = 1 + (word.length-3)*0.2;
  let base=0;
  for(let ch of word) base+=letterCost[ch]||1;
  return Math.round(base*multiplier);
}

// ===== Finish Game & Export CSV =====
finishBtn.addEventListener('click',()=>{
  if(!usedWords.length) return showNotification('error','No words to export!');
  const csv = usedWords.map(w=>`${w.word},${w.score}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;
  a.download='dice_game_results.csv';
  a.click();
  URL.revokeObjectURL(url);
  showNotification('success','Game finished! CSV exported.');
});

function showNotification(type, message, targetId='notification'){
  const target = document.getElementById(targetId);
  target.textContent = message;
  target.className = `notification show ${type}`;
  setTimeout(()=>target.className='notification', 2000);
}
