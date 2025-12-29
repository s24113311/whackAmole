// --- NEW CONSTANTS: Define emojis for states ---
const EMOJI_HOME = "🏠";
const EMOJI_PLAY = "▶";
const EMOJI_PAUSE = "⏸";
const GAME_DURATION = 25;

// --- PRIMARY ELEMENT REFERENCES ---
const holes = document.querySelectorAll(".hole");
const scoreDisplay = document.querySelector(".score");
const levelRadios = document.getElementsByName("level");
const liveFeed = document.querySelector(".live-feed");
const timeBar = document.querySelector('.time-left');

// References for the multi-functional button
const gameControlButton = document.getElementById("playBtn");
const homeLink = document.getElementById("homeLink");
const controlDisplay = document.getElementById("controlDisplay");

// NEW MENU REFERENCES
const controlMenu = document.getElementById("controlMenu");
const menuActionBtn = document.getElementById("menuActionBtn");
const menuHomeBtn = document.getElementById("menuHomeBtn");

// --- GAME STATE VARIABLES ---
let lastHole;
let timeUp = true;
let peepTimeout;
let gamePaused = true;
let gameInterval;

// --- SOUND EFFECTS ---
const bgMusic = new Audio("sound/mb.mp3");
bgMusic.volume = 0.30;
bgMusic.loop = true;

const correctSound = new Audio("sound/wrong.mp3");
correctSound.volume = 0.45;

const bombSound = new Audio("sound/bomb1.mp3");
bombSound.volume = 0.20;

// --- INITIAL SETUP ---
if (controlDisplay) updateControlIcon();

// --- CLICK LISTENERS ---

// Main button toggles menu
if (gameControlButton && controlMenu) {
    gameControlButton.addEventListener("click", () => {
        controlMenu.style.display = controlMenu.style.display === 'none' ? 'flex' : 'none';
        updateMenuActionBtn();
    });
}

// Action button starts/pauses game
if (menuActionBtn) {
    menuActionBtn.addEventListener("click", () => {
        controlMenu.style.display = 'none';
        gamePaused ? startGame() : pauseGame();
    });
}

// Home button pauses and navigates
if (menuHomeBtn) {
    menuHomeBtn.addEventListener("click", () => {
        controlMenu.style.display = 'none';
        pauseGame();
        window.location.href = homeLink.href;
    });
}

// --- STATE FUNCTIONS ---
function updateControlIcon() {
    if (controlDisplay) {
        controlDisplay.textContent = gamePaused ? EMOJI_PLAY : EMOJI_PAUSE;
        controlDisplay.setAttribute('aria-label', gamePaused ? 'Play Game' : 'Pause Game');
    }
    updateMenuActionBtn();
}

function updateMenuActionBtn() {
    if (!menuActionBtn) return;
    if (gamePaused) {
        menuActionBtn.textContent = `${EMOJI_PLAY} START GAME`;
        menuActionBtn.style.backgroundColor = '#00b894';
    } else {
        menuActionBtn.textContent = `${EMOJI_PAUSE} PAUSE GAME`;
        menuActionBtn.style.backgroundColor = '#d63031';
    }
}

function pauseGame() {
    timeUp = true;
    gamePaused = true;
    clearTimeout(peepTimeout);
    clearInterval(gameInterval);
    holes.forEach(h => h.classList.remove("up"));
    
    // 🎵 PAUSE BG MUSIC
    bgMusic.pause();

    updateControlIcon();
}

function startGame() {
    const diff = difficultyLevel();
    let show, hide;
    if (diff === "easy") { show = 500; hide = 1500; }
    else if (diff === "medium") { show = 200; hide = 1000; }
    else { show = 100; hide = 800; }

    score = 0;
    scoreDisplay.textContent = score;
    timeUp = false;
    gamePaused = false;

    // 🎵 START BG MUSIC
    bgMusic.currentTime = 0;
    bgMusic.play();

    timeBar.style.width = '100%';
    holes.forEach(h => h.classList.remove("up"));
    peep(show, hide);
    updateControlIcon();

    let timeLeft = GAME_DURATION;
    gameInterval = setInterval(() => {
        timeLeft--;
        const percentage = (timeLeft / GAME_DURATION) * 100;
        timeBar.style.width = `${percentage}%`;
    if (timeLeft <= 0) {
    pauseGame();
    showGameOverOverlay(score);
}

    }, 1000);
}

// --- CORE GAME LOGIC ---
function difficultyLevel() {
    for (let lv of levelRadios) if (lv.checked) return lv.id;
    return "easy";
}

const moleNames = ["Tom","Jerry","Spike","Milo","Coco","Luna","Rocky","Daisy","Max","Bella"];
const feedEmojis = ["🐹","🐿️","🦔","🐭"];

const randomTime = (min, max) => Math.round(Math.random() * (max - min) + min);

function randomHole(holes) {
    const idx = Math.floor(Math.random() * holes.length);
    const hole = holes[idx];
    if (hole === lastHole) return randomHole(holes);
    lastHole = hole;
    return hole;
}

function randomHoleType(hole) {
    const mole = hole.querySelector(".mole");
    const bomb = hole.querySelector(".bomb");
    mole.style.display = "none";
    bomb.style.display = "none";

    if (Math.random() < 0.7) {
        mole.style.display = "block";
        hole.dataset.type = "mole";
    } else {
        bomb.style.display = "block";
        hole.dataset.type = "bomb";
    }
}

function peep(show, hide) {
    if (timeUp) return;
    const time = randomTime(show, hide);
    const hole = randomHole(holes);
    randomHoleType(hole);
    hole.classList.add("up");

    peepTimeout = setTimeout(() => {
        hole.classList.remove("up");
        peep(show, hide);
    }, time);
}

// --- PARTICLE BURST ---
function createBurst(hole, count=8){
    for (let i=0;i<count;i++){
        const p = document.createElement("div");
        p.classList.add("burst");
        const colors=["#ff0000","#ffeb3b","#ffa500"];
        p.style.background = colors[i%3];
        const angle = Math.random()*2*Math.PI;
        const distance = Math.random()*80+50;
        p.style.setProperty("--x", Math.cos(angle)*distance);
        p.style.setProperty("--y", Math.sin(angle)*distance);
        p.style.left = `${hole.offsetWidth/2 - 16}px`;
        p.style.top = `${hole.offsetHeight/2 - 16}px`;
        hole.appendChild(p);
        p.addEventListener("animationend", ()=>p.remove());
    }
}

// --- LIVE FEED ---
function addFeedMessage(name,type){
    const entry = document.createElement("div");
    entry.classList.add("msg");
    const emoji = type==="mole"? feedEmojis[Math.floor(Math.random()*feedEmojis.length)] : "💣";
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
    entry.innerHTML = `
        <div class="pfp">${emoji}</div>
        <div class="textblock">
            <span class="username" style="color:${type==="bomb"?'#ff6b6b':'#4da6ff'}">${name}</span>
            <span class="action">${type==="mole"?"got WHACKED! 💥":"exploded! ❌"}</span>
            <span class="timestamp">${timeString}</span>
        </div>
    `;
    liveFeed.appendChild(entry);
    liveFeed.scrollTop = liveFeed.scrollHeight;
}

// --- HAMMER EFFECT ---
function createHammerEffect(hole){
    const hammer = document.createElement("div");
    hammer.classList.add("hammer-fx");
    hammer.textContent = "🔨";

    const rect = hole.getBoundingClientRect();
    hammer.style.left = `${rect.left + rect.width/2}px`;
    hammer.style.top = `${rect.top + rect.height * 0.15}px`;

    document.body.appendChild(hammer);
    setTimeout(()=>hammer.remove(),600);
}


// --- CLICK HANDLER PER HOLE ---
holes.forEach(hole => {
    hole.addEventListener("click", function() {
        if (!this.classList.contains("up") || gamePaused) return;

        // Show hammer
        createHammerEffect(this);

        const type = this.dataset.type;
        if (type === "mole") {
            const mole = this.querySelector(".mole");
            score++;
            scoreDisplay.textContent = score;
            mole.classList.add("hit");
            mole.addEventListener("animationend", () => mole.classList.remove("hit"), { once: true });
            createBurst(this, 8);

            correctSound.currentTime = 0;
            correctSound.play();

            const name = moleNames[Math.floor(Math.random() * moleNames.length)];
            addFeedMessage(name, "mole");

        } else if (type === "bomb") {
            const bomb = this.querySelector(".bomb");
            score = Math.max(0, score - 1);
            scoreDisplay.textContent = score;
            if (bomb) bomb.classList.add("hit");
            createBurst(this, 12);

            // 🎵 PLAY BOMB SOUND
            bombSound.currentTime = 0;
            bombSound.play();

            document.body.classList.add("bomb-hit");
            setTimeout(() => document.body.classList.remove("bomb-hit"), 400);

            addFeedMessage("BOMB", "bomb");
        }

        this.classList.remove("up");
    });
});


// --- HAMMER EFFECT ---
function createHammerEffect(hole){
    const hammer = document.createElement("div");
    hammer.classList.add("hammer-fx");
    hammer.textContent = "🔨";

    const rect = hole.getBoundingClientRect();
    hammer.style.left = `${rect.left + rect.width/2}px`;
    hammer.style.top = `${rect.top + rect.height * 0.15}px`;

    document.body.appendChild(hammer);

    setTimeout(() => hammer.remove(), 800); // Remove after animation
}

(function () {
    const style = document.createElement("style");
    style.textContent = `
    .hammer-fx {
        position: absolute;
        z-index: 9999;
        font-size: 8em;  /* bigger hammer */
        pointer-events: none;
        transform-origin: bottom right;
        color: #1a1a1a; /* solid dark hammer */
        animation: hammerWhack 0.8s cubic-bezier(.15,.8,.25,1.3) forwards;
    }

    @keyframes hammerWhack {
        0% {
            transform: translate(80%, -300%) rotate(-150deg) scale(1.5);
            opacity: 1;
        }
        20% {
            transform: translate(-60%, -50%) rotate(45deg) scale(1.3);
        }
        40% {
            transform: translate(-50%, 20%) rotate(15deg) scale(1.6);
        }
        50% {
            transform: translate(-55%, 25%) rotate(10deg) scale(1.65);
        }
        70% {
            transform: translate(-50%, -60%) rotate(-15deg) scale(1.2);
        }
        100% {
            transform: translate(-50%, -120%) rotate(15deg) scale(0.8);
            opacity: 0;
        }
    }

    /* Optional screen shake for more impact */
    body.screen-shake {
        animation: screenShake 0.15s;
    }

    @keyframes screenShake {
        0% { transform: translate(5px, 5px); }
        25% { transform: translate(-5px, -5px); }
        50% { transform: translate(5px, -5px); }
        75% { transform: translate(-5px, 5px); }
        100% { transform: translate(0,0); }
    }
    `;
    document.head.appendChild(style);
})();



/* --- GLOBAL VARIABLES --- */
let gameScore = 0; // The source of truth for your score

/**
 * 1. THE FAST SCORE ANIMATOR
 * Snappy 500ms count for the green pixel numbers.
 */
function animateScoreValue(element, finalValue, duration = 500) {
    if (!element) return;
    element.classList.add('score-pop');
    
    let startTimestamp = null;
    const startValue = parseInt(element.textContent) || 0;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const currentScore = Math.floor(progress * (finalValue - startValue) + startValue);
        element.textContent = currentScore;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = finalValue;
            setTimeout(() => element.classList.remove('score-pop'), 150);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * 2. THE UNIVERSAL MUSIC STOPPER
 */
function stopMusic() {
    const victoryMusic = document.getElementById("victoryMusic");
    if (victoryMusic) {
        victoryMusic.pause();
        victoryMusic.currentTime = 0; // Rewind to start
    }
}

/**
 * 3. GAME OVER OVERLAY
 */
function showGameOverOverlay(manualScore) {
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    const p1FinalScore = document.querySelector(".p1-final-score");
    const victoryMusic = document.getElementById("victoryMusic");

    if (!gameOverOverlay) return;

    let finalScoreToDisplay = manualScore !== undefined ? manualScore : gameScore;

    // Start Music
    if (victoryMusic) {
        victoryMusic.currentTime = 0;
        victoryMusic.play().catch(() => console.log("Interaction needed for audio"));
    }

    // Show Overlay
    gameOverOverlay.style.display = "flex";
    gameOverOverlay.classList.add("visible");

    // Fast count (1 second)
    animateScoreValue(p1FinalScore, finalScoreToDisplay, 1000);
}

/**
 * 4. BUTTON LOGIC (REPLAY & HOME)
 */

// REPLAY / RESTART FUNCTION
function handleRestart() {
    stopMusic(); // 1. Stop the music
    
    // 2. Hide the overlay
    const overlay = document.getElementById("gameOverOverlay");
    if (overlay) {
        overlay.style.display = "none";
        overlay.classList.remove("visible");
    }

    // 3. Reset Game State
    gameScore = 0;
    const hudScore = document.querySelector('.score');
    if (hudScore) hudScore.textContent = "0"; // Reset HUD text immediately

    // 4. Start the game loop again
    if (typeof startGame === "function") {
        startGame(); 
    }
}

// HOME FUNCTION
function handleGoHome() {
    stopMusic(); // 1. Stop music
    window.location.href = "index.html"; // 2. Navigate away
}

// Attach listeners once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.getElementById("restartGameBtn");
    const homeBtn = document.getElementById("goHomeBtn");

    if (restartBtn) restartBtn.onclick = handleRestart;
    if (homeBtn) homeBtn.onclick = handleGoHome;
});

/* ============================================================
   AUTO-START LOGIC (Play Directly on Load)
   ============================================================ */
window.addEventListener('load', () => {
    // 1. Hide the control menu so the game board is visible immediately
    if (controlMenu) {
        controlMenu.style.display = "none";
    }

    // 2. Start the game logic (Moles start popping, Timer starts)
    startGame();

    // 3. AUDIO UNLOCKER: Browsers block sound on refresh.
    // This starts the music the first time the player clicks or hits a key.
    const unlockAudio = () => {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log("Audio waiting for interaction..."));
        }
        // Remove listeners once audio is playing to save performance
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
});