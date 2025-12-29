/* ============================================================
   multiPlayer.js  — Complete game logic for Whack-a-Mole 2P
   ============================================================ */

/* ====================
   CONSTANTS & ASSETS
   ==================== */
const EMOJI_PLAY = "▶";
const EMOJI_PAUSE = "⏸";
const GAME_DURATION = 30;

const EMOJIS = {
  P1_MOLE: "images/money.png",
  P2_MOLE: "images/angry.png",
  NEUTRAL_MOLE: "✨",
  BOMB: "💣",
  P1_HAMMER: "🔨",
  P2_HAMMER: "🪓"
};

/* ====================
   ELEMENT REFERENCES
   ==================== */
const holes = document.querySelectorAll(".hole");
const scoreDisplayP1 = document.querySelector(".player-1-score");
const scoreDisplayP2 = document.querySelector(".player-2-score");
const liveFeed = document.querySelector(".live-feed");
const timeBar = document.querySelector(".global-timer-bar .time-left");

const playMenuBtn = document.getElementById("playBtn");
const controlMenu = document.getElementById("controlMenu");
const menuActionBtn = document.getElementById("menuActionBtn");
const menuHomeBtn = document.getElementById("menuHomeBtn");

const playerLabelP1 = document.querySelector(".player-1-hud .player-label");
const playerLabelP2 = document.querySelector(".player-2-hud .player-label");

// overlay elements (from your HTML)
const gameOverOverlay = document.getElementById("gameOverOverlay");
const winnerMessage = document.querySelector(".winner-message");
const p1FinalScore = document.querySelector(".p1-final-score");
const p2FinalScore = document.querySelector(".p2-final-score");
const restartGameBtn = document.getElementById("restartGameBtn");
const goHomeBtn = document.getElementById("goHomeBtn");

/* ====================
   GAME STATE
   ==================== */
let lastHole = null;
let timeUp = true;
let gamePaused = true;
let peepTimeout = null;
let gameInterval = null;
let difficultyLevel = 0; // 0 easy /1 med /2 hard
let score = {1: 0, 2: 0};
let isProcessingHit = false;

let entityIndex = 0;
const entityOrder = ["p1","p2","neutral","bomb"]; // cycles through for demo spawn

/* ====================
   AUDIO (preloaded)
   ==================== */
const bgMusic = new Audio("sound/mb.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.25;

const coinSound = new Audio("sound/coin.mp3");
coinSound.volume = 0.35;

const wrongSound = new Audio("sound/wrong.mp3");
wrongSound.volume = 0.3;

const bombSound = new Audio("sound/bomb1.mp3"); // adjust name if needed
bombSound.volume = 0.28;

/* Preload */
[bgMusic, coinSound, wrongSound, bombSound].forEach(s=>{
  try{ s.preload = "auto"; s.load(); }catch(e){}
});

/* ====================
   VISUAL EFFECTS / CSS INJECTION
   ==================== */
(function injectStyles(){
  const style = document.createElement("style");
  style.textContent = `
    /* hammer effect - solid (no highlight) */
    .hammer-fx {
      position: fixed;
      z-index: 9999;
      font-size: 8em;
      pointer-events: none;
      transform-origin: bottom right;
      user-select: none;
      -webkit-user-select: none;
      -ms-user-select: none;
      outline: none !important;
      border: none !important;
      caret-color: transparent;
      filter: none;
      animation: hammer-power 0.8s cubic-bezier(.18,.8,.35,1) forwards;
    }
    @keyframes hammer-power {
      0% { transform: translate(80%, -300%) rotate(-150deg) scale(1.5); opacity:1; }
      30% { transform: translate(-60%, -50%) rotate(45deg) scale(1.3); }
      45% { transform: translate(-50%, 20%) rotate(15deg) scale(1.6); }
      55% { transform: translate(-55%, 28%) rotate(8deg) scale(1.7); }
      75% { transform: translate(-50%, -60%) rotate(-12deg) scale(1.1); }
      100% { transform: translate(-50%, -120%) rotate(15deg) scale(0.8); opacity:0; }
    }

    /* overlay visibility helper */
    .game-overlay { display:none; align-items:center; justify-content:center; }
    .game-overlay.visible { display:flex; }

    /* score popup (existing classes expected by JS) */
    .hit-fx { position:absolute; pointer-events:none; user-select:none; font-weight:700; }
    .particle-burst { position:absolute; pointer-events:none; border-radius:50%; }

    /* remove highlight from hammer on mobile */
    .hammer-fx { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(style);
})();

/* ====================
   UTILS
   ==================== */
function randomTime(min,max){ return Math.round(Math.random()*(max-min)+min); }
function randomHole(){ 
  if(!holes || holes.length===0) return null;
  const idx = Math.floor(Math.random()*holes.length);
  const h = holes[idx];
  if(h === lastHole) return randomHole();
  lastHole = h;
  return h;
}

/* ====================
   ENTITY / PEEP
   ==================== */
function setHoleEntity(hole){
  if(!hole) return;
  const entity = hole.querySelector(".entity");
  if(!entity) return;
  entity.textContent = "";
  entity.style.backgroundImage = "";
  delete hole.dataset.type;
  delete hole.dataset.owner;

  const current = entityOrder[entityIndex];
  entityIndex = (entityIndex + 1) % entityOrder.length;

  if(current === "bomb"){
    hole.dataset.type = "bomb";
    entity.textContent = EMOJIS.BOMB;
    return;
  }
  if(current === "neutral"){
    hole.dataset.type = "mole";
    hole.dataset.owner = "0";
    entity.textContent = EMOJIS.NEUTRAL_MOLE;
    return;
  }
  if(current === "p1"){
    hole.dataset.type = "mole";
    hole.dataset.owner = "1";
    entity.style.backgroundImage = `url('${EMOJIS.P1_MOLE}')`;
    entity.style.backgroundSize = "contain";
    entity.style.backgroundRepeat = "no-repeat";
    return;
  }
  if(current === "p2"){
    hole.dataset.type = "mole";
    hole.dataset.owner = "2";
    entity.style.backgroundImage = `url('${EMOJIS.P2_MOLE}')`;
    entity.style.backgroundSize = "contain";
    entity.style.backgroundRepeat = "no-repeat";
    return;
  }
}

function peep(show, hide){
  if(timeUp || gamePaused || isProcessingHit) return;
  const hole = randomHole();
  if(!hole) return;
  setHoleEntity(hole);
  hole.classList.add("up");

  // remove it after a random time and call peep again
  peepTimeout = setTimeout(()=>{
    if(hole.classList.contains("up")){
      hole.classList.remove("up");
      resetHole(hole);
    }
  }, randomTime(show, hide));
}

/* ====================
   EFFECTS: burst / coin / explosion
   ==================== */
function createBurst(hole, count=8){
  if(!hole) return;
  for(let i=0;i<count;i++){
    const p = document.createElement("div");
    p.className = "particle-burst";
    p.style.width = p.style.height = (i%3===0?12:8) + "px";
    const colors = ["#ff0000","#ffeb3b","#ffa500","#333"];
    p.style.background = colors[i%colors.length];
    const angle = Math.random()*Math.PI*2;
    const distance = 40 + Math.random()*120;
    p.style.setProperty("--x", `${Math.cos(angle)*distance}px`);
    p.style.setProperty("--y", `${Math.sin(angle)*distance}px`);
    p.style.left = "50%";
    p.style.top = "50%";
    p.style.transform = "translate(-50%,-50%)";
    p.style.animation = `particle-fly ${0.45 + Math.random()*0.4}s ease-out forwards`;
    hole.appendChild(p);
    p.addEventListener("animationend", ()=> p.remove(), {once:true});
  }
}

/* ====================
   FEED
   ==================== */
function addFeedMessage(name,type,player,emoji){
  if(!liveFeed) return;
  const entry = document.createElement("div");
  entry.className = "msg";
  const pfp = document.createElement("div");
  pfp.className = "pfp";
  const color = type==="bomb" ? "#ff6b6b" : (player===1? "#00bcd4" : "#ff9800");
  if(emoji && (emoji.includes('/') || emoji.includes('.'))){
    pfp.style.width = pfp.style.height = "30px";
    pfp.style.backgroundImage = `url('${emoji}')`;
    pfp.style.backgroundSize = "contain";
    pfp.style.backgroundRepeat = "no-repeat";
    pfp.style.backgroundPosition = "center";
  } else {
    pfp.textContent = emoji || (type==="bomb" ? "💣" : "🐹");
  }
  entry.appendChild(pfp);
  const text = document.createElement("div"); text.className="textblock";
  const time = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  text.innerHTML = `<span class="username" style="color:${color}">${name}</span><span class="timestamp">${time}</span>`;
  entry.appendChild(text);
  liveFeed.prepend(entry);
}

/* ====================
   HAMMER EFFECT
   ==================== */
function makeHammerEffect(hole, playerID){
  const hammer = document.createElement("div");
  hammer.className = "hammer-fx";
  hammer.textContent = playerID === 1 ? EMOJIS.P1_HAMMER : EMOJIS.P2_HAMMER;
  document.body.appendChild(hammer);

  // position it centered above the hole (fixed coordinates)
  const rect = hole.getBoundingClientRect();
  // set transform so animation uses its own @keyframes (we use fixed positioning)
  hammer.style.left = `${rect.left + rect.width/2}px`;
  hammer.style.top = `${rect.top + rect.height*0.15}px`;
  hammer.style.transform = "translate(-50%, -50%)";

  // optional: cause a subtle screen shake for bombs or powerful hits
  setTimeout(()=> hammer.remove(), 820);
}

/* ====================
   PROCESS HIT
   ==================== */
function processHit(hole, playerID){
  if(isProcessingHit) return;
  isProcessingHit = true;
  clearTimeout(peepTimeout);

  const type = hole.dataset.type;
  const owner = Number(hole.dataset.owner);
  const entity = hole.querySelector(".entity");
  const scoreDisplay = playerID === 1 ? scoreDisplayP1 : scoreDisplayP2;
  const playerAvatar = playerID === 1 ? EMOJIS.P1_MOLE : EMOJIS.P2_MOLE;

  if(!entity){ isProcessingHit = false; return; }

  if(type === "bomb"){
    score[playerID] = Math.max(0, score[playerID] - 3);
    createBombExplosion(hole);
    triggerBombEffect();
    addFeedMessage("Bomb! (-3)","bomb", playerID, playerAvatar);
    makeEffect(hole, "red", "-3");

    // play bomb sound (preloaded)
    try{ bombSound.currentTime = 0; bombSound.play(); }catch(e){}

  } else if(owner === 0){
    score[playerID] += 2;
    addFeedMessage("Neutral (+2)","mole", playerID, playerAvatar, EMOJIS.NEUTRAL_MOLE);
    makeEffect(hole, "gold", "+2");
    spawnPixelCoinBurst(entity);
    try{ coinSound.currentTime = 0; coinSound.play(); }catch(e){}
  } else if(owner === playerID){
    score[playerID] += 1;
    addFeedMessage("Correct (+1)","mole", playerID, playerAvatar, (playerAvatar));
    makeEffect(hole, "green", "+1");
    spawnPixelCoinBurst(entity);
    try{ coinSound.currentTime = 0; coinSound.play(); }catch(e){}
  } else {
    score[playerID] = Math.max(0, score[playerID] - 1);
    addFeedMessage("Wrong (-1)","mole", playerID, playerAvatar);
    makeEffect(hole, "red", "-1");
    triggerWrongHitFlash();
    try{ wrongSound.currentTime = 0; wrongSound.play(); }catch(e){}
  }

  scoreDisplay.textContent = score[playerID];
  animateScore(scoreDisplay);

  resetHole(hole);
  isProcessingHit = false;
}

/* small visual score animation helper */
function animateScore(el){
  if(!el) return;
  el.classList.remove("score-pop");
  void el.offsetWidth;
  el.classList.add("score-pop");
  el.addEventListener("animationend", function h(){ el.classList.remove("score-pop"); el.removeEventListener("animationend", h); }, {once:true});
}

/* simple fx popup */
function makeEffect(hole,color,text){
  const fx = document.createElement("div");
  fx.className = `hit-fx ${color}`;
  fx.textContent = text;
  hole.appendChild(fx);
  fx.addEventListener("animationend", ()=> fx.remove(), {once:true});
}

/* coin pixel burst */
function spawnPixelCoinBurst(entity){
  if(!entity) return;
  const NUM = 10;
  for(let i=0;i<NUM;i++){
    const coin = document.createElement("div");
    coin.className = "burst-spark coin";
    coin.textContent = "💰";
    const angle = Math.random()*Math.PI*2;
    const dist = 20 + Math.random()*40;
    coin.style.left = "50%";
    coin.style.top = "50%";
    coin.style.transform = `translate(-50%,-50%) translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
    coin.style.position = "absolute";
    coin.style.fontSize = `${0.8 + Math.random()*0.8}em`;
    entity.appendChild(coin);
    setTimeout(()=> coin.remove(), 500);
  }
}

/* bomb explosion particles */
function createBombExplosion(hole){
  createBurst(hole, 24);
}

/* trigger screen flash & shake for bomb */
let bombFlashElem = null;
function triggerBombEffect(){
  // brief red flash + shake on root element
  if(!bombFlashElem){
    bombFlashElem = document.getElementById("bomb-flash");
  }
  if(bombFlashElem) {
    bombFlashElem.classList.add("active");
    setTimeout(()=> bombFlashElem.classList.remove("active"), 80);
  }
  document.documentElement.classList.add("shake");
  setTimeout(()=> document.documentElement.classList.remove("shake"), 400);
}

let wrongHitElem = null;
function triggerWrongHitFlash(){
  if(!wrongHitElem) wrongHitElem = document.getElementById("wrong-hit-flash");
  if(wrongHitElem){
    wrongHitElem.classList.add("active");
    setTimeout(()=> wrongHitElem.classList.remove("active"), 100);
  }
}

/* ====================
   RESET HOLE
   ==================== */
function resetHole(hole){
  if(!hole) return;
  hole.classList.remove("up");
  delete hole.dataset.type;
  delete hole.dataset.owner;
  const entity = hole.querySelector(".entity");
  if(entity){
    entity.textContent = "";
    entity.style.backgroundImage = "";
  }
  // schedule next peep shortly if game still running
  if(!timeUp && !gamePaused){
    const {show, hide} = getAutoDifficulty();
    peepTimeout = setTimeout(()=> peep(show, hide), 100);
  }
}

/* ====================
   DIFFICULTY HELPERS
   ==================== */
function getAutoDifficulty(){
  if(difficultyLevel === 0) return {show: 800, hide: 1500};
  if(difficultyLevel === 1) return {show: 500, hide: 1000};
  return {show: 300, hide: 700};
}
function updateDifficulty(timeLeft){
  const percent = timeLeft / GAME_DURATION;
  if(percent > 0.66) difficultyLevel = 0;
  else if(percent > 0.33) difficultyLevel = 1;
  else difficultyLevel = 2;
}

/* ====================
   GAME FLOW (start/pause)
   ==================== */
function updateMenuButton(){
  if(!menuActionBtn) return;
  menuActionBtn.textContent = gamePaused ? `${EMOJI_PLAY} START GAME` : `${EMOJI_PAUSE} PAUSE GAME`;
  menuActionBtn.style.backgroundColor = gamePaused ? "#00b894" : "#d63031";
}

function pauseGame(){
  timeUp = true; gamePaused = true;
  clearTimeout(peepTimeout);
  clearInterval(gameInterval);
  holes.forEach(h => { h.classList.remove("up"); resetHole(h); });
  updateMenuButton();
  try{ if(!bgMusic.paused) bgMusic.pause(); }catch(e){}
}

let currentTimeLeft = GAME_DURATION;
function startGame(){
  hideGameOverOverlay();
  try{ if(bgMusic.paused) bgMusic.play().catch(()=>{}); }catch(e){}
  score[1] = 0; score[2] = 0;
  scoreDisplayP1 && (scoreDisplayP1.textContent = "0");
  scoreDisplayP2 && (scoreDisplayP2.textContent = "0");
  difficultyLevel = 0; timeUp = false; gamePaused = false;
  liveFeed && (liveFeed.innerHTML = "");
  holes.forEach(h => h.classList.remove("up"));
  const { show, hide } = getAutoDifficulty();
  peep(show, hide);
  updateMenuButton();

  currentTimeLeft = GAME_DURATION;
  if(timeBar) timeBar.style.width = "100%";

  clearInterval(gameInterval);
  gameInterval = setInterval(()=>{
    currentTimeLeft--;
    updateDifficulty(currentTimeLeft);
    if(timeBar) timeBar.style.width = `${(currentTimeLeft/GAME_DURATION)*100}%`;
    if(currentTimeLeft <= 0){
      pauseGame();
      try{ bgMusic.pause(); }catch(e){}
      showGameOverOverlay();
    }
  }, 1000);
}

/* ====================
   OVERLAY SHOW/HIDE
   ==================== */
function showGameOverOverlay(){
  if(!gameOverOverlay) return;
  const s1 = score[1] || 0;
  const s2 = score[2] || 0;
  let message = "";
  if(s1 > s2) message = "Player 1 Wins!";
  else if(s2 > s1) message = "Player 2 Wins!";
  else message = "It's a Tie!";
  winnerMessage && (winnerMessage.textContent = message);
  p1FinalScore && (p1FinalScore.textContent = s1);
  p2FinalScore && (p2FinalScore.textContent = s2);
  gameOverOverlay.classList.add("visible");
  gameOverOverlay.style.display = "flex";
}

function hideGameOverOverlay(){
  if(!gameOverOverlay) return;
  gameOverOverlay.classList.remove("visible");
  setTimeout(()=> { if(gameOverOverlay) gameOverOverlay.style.display = "none"; }, 300);
}

/* ====================
   INPUT HANDLING (keyboard)
   ==================== */
document.addEventListener("keydown", function(e){
  if(gamePaused || isProcessingHit) return;
  let playerID = null;
  if(e.code === "Space") playerID = 1;
  else if(e.code === "Enter" || e.code === "NumpadEnter") playerID = 2;
  else return;
  e.preventDefault();

  const target = [...holes].find(h => h.classList.contains("up"));
  if(!target) return;

  makeHammerEffect(target, playerID);
  processHit(target, playerID);
});

/* ====================
   MOUSE / CLICK per hole (optional)
   ==================== */
holes.forEach(hole => {
  hole.addEventListener("click", function(){
    if(!this.classList.contains("up") || gamePaused) return;
    // assume click belongs to player 1 by default (or decide by hole data attribute)
    const playerAttr = Number(this.dataset.player) || 1;
    makeHammerEffect(this, playerAttr);
    processHit(this, playerAttr);
  });
});

/* ====================
   MENU / BUTTON HOOKS
   ==================== */
if(playMenuBtn) playMenuBtn.addEventListener("click", ()=> {
  if(controlMenu) controlMenu.style.display = controlMenu.style.display === "none" ? "flex" : "none";
});

if(menuActionBtn) menuActionBtn.addEventListener("click", ()=> {
  if(controlMenu) controlMenu.style.display = "none";
  gamePaused ? startGame() : pauseGame();
});

if(menuHomeBtn) menuHomeBtn.addEventListener("click", ()=> {
  if(controlMenu) controlMenu.style.display = "none";
  pauseGame();
  const homeLink = document.getElementById("homeLink");
  if(homeLink && homeLink.href) window.location.href = homeLink.href;
});

/* overlay buttons */
if(restartGameBtn) restartGameBtn.addEventListener("click", ()=> {
  hideGameOverOverlay();
  startGame();
});
if(goHomeBtn) goHomeBtn.addEventListener("click", ()=> {
  hideGameOverOverlay();
  pauseGame();
  const homeLink = document.getElementById("homeLink");
  if(homeLink && homeLink.href) window.location.href = homeLink.href;
});

/* initial UI state */
updateMenuButton();

/* expose small helpers for console debugging (optional) */
window._whack = {
  startGame, pauseGame, peep, setHoleEntity, processHit
};


function showGameOverOverlay(){
  if(!gameOverOverlay) return;

  const s1 = score[1] || 0;
  const s2 = score[2] || 0;

  // winner message
  let message = "";
  if(s1 > s2) message = "Player 1 Wins!";
  else if(s2 > s1) message = "Player 2 Wins!";
  else message = "It's a Tie!";
  winnerMessage && (winnerMessage.textContent = message);

  // update final scores
  p1FinalScore && (p1FinalScore.textContent = s1);
  p2FinalScore && (p2FinalScore.textContent = s2);

  // HIGHLIGHT WINNER
  const p1Box = document.querySelector(".p1-box");
  const p2Box = document.querySelector(".p2-box");
  if(p1Box && p2Box){
      if(s1 > s2){
          p1Box.classList.add("winner-highlight");
          p2Box.classList.remove("winner-highlight");
      } else if(s2 > s1){
          p2Box.classList.add("winner-highlight");
          p1Box.classList.remove("winner-highlight");
      } else {
          // tie
          p1Box.classList.remove("winner-highlight");
          p2Box.classList.remove("winner-highlight");
      }
  }

  // show overlay
  gameOverOverlay.classList.add("visible");
  gameOverOverlay.style.display = "flex";
}


function showGameOverOverlay() {
    if (!gameOverOverlay) return;

    const s1 = score[1] || 0;
    const s2 = score[2] || 0;
    const victoryMusic = document.getElementById("victoryMusic");

    // 1. Start the music
    if (victoryMusic) {
        victoryMusic.currentTime = 0; 
        victoryMusic.play().catch(e => console.log("Audio play blocked"));
    }

    // 2. Set Winner Identity
    let message = "";
    const winnerImgElement = document.querySelector(".winner-pic");
    
    if (s1 > s2) {
        message = "Player 1 Wins!";
        if(winnerImgElement) winnerImgElement.src = "images/p1_win.png"; 
    } else if (s2 > s1) {
        message = "Player 2 Wins!";
        if(winnerImgElement) winnerImgElement.src = "images/p2_win.png";
    } else {
        message = "It's a Tie!";
        if(winnerImgElement) winnerImgElement.src = "images/tie_game.png";
    }
    
    if (winnerMessage) winnerMessage.textContent = message;

    // 3. Start the 4000ms Tally
    animateScoreValue(p1FinalScore, s1, 4000);
    animateScoreValue(p2FinalScore, s2, 4000);

    // 4. Highlight Winner Box
    const p1Box = document.querySelector(".p1-box");
    const p2Box = document.querySelector(".p2-box");
    if (p1Box && p2Box) {
        p1Box.classList.toggle("winner-highlight", s1 > s2);
        p2Box.classList.toggle("winner-highlight", s2 > s1);
    }

    // 5. Reveal Overlay
    gameOverOverlay.classList.add("visible");
    gameOverOverlay.style.display = "flex";
}

// Helper function to make numbers count up smoothly
function animateScoreValue(element, finalValue) {
    if (!element) return;
    let startTimestamp = null;
    const duration = 1000; // 1 second counting time

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * finalValue);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Helper to kill music
function killMusic() {
    const victoryMusic = document.getElementById("victoryMusic");
    if (victoryMusic) {
        victoryMusic.pause();
        victoryMusic.currentTime = 0;
    }
}

// REPLAY / RESTART BUTTON
restartGameBtn.addEventListener("click", () => {
    killMusic(); // <--- Music stops NOW
    hideGameOverOverlay();
    startGame();
});

// BACK HOME BUTTON
goHomeBtn.addEventListener("click", () => {
    killMusic(); // <--- Music stops NOW
    hideGameOverOverlay();
    pauseGame();
    if (homeLink) window.location.href = homeLink.href;
});
/* ====================
   AUTO-START LOGIC
   ==================== */
window.addEventListener('load', () => {
    // 1. Hide the control menu so the game is visible
    if (controlMenu) {
        controlMenu.style.display = "none";
    }

    // 2. Start the game logic (timer, mole popping)
    startGame();

    // 3. Browser Audio Fix: 
    // Browsers block sound until a click. This ensures music starts 
    // the moment they try to whack their first mole.
    const startAudioOnInteraction = () => {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log("Audio still waiting..."));
        }
        document.removeEventListener('click', startAudioOnInteraction);
        document.removeEventListener('keydown', startAudioOnInteraction);
    };

    document.addEventListener('click', startAudioOnInteraction);
    document.addEventListener('keydown', startAudioOnInteraction);
});