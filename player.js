// --- I. SELECT PLAYER BUTTONS ---
const player1Button = document.getElementById('player1Button');
const player2Button = document.getElementById('player2Button');
const backButton = document.getElementById('backButton');
const clickSound = document.getElementById('clickSound');

// --- II. HELPER FUNCTION ---
function playClickSoundAndThen(callback) {
    if (!clickSound) { if (callback) callback(); return; }
    clickSound.currentTime = 0;
    clickSound.play()
        .then(() => { if (callback) callback(); })
        .catch(() => { if (callback) callback(); });
}

// --- III. THE CONNECTION LOGIC (REVISED FOR VIDEOS & TIPS) ---

// 1. Create your list of tips
const gameTips = [
    "Tip: The golden mole gives you double points!",
    "Tip: Watch out! Hitting a bomb will reset your combo.",
    "Tip: Speed increases every 10 seconds—stay sharp!",
    "Tip: You can use your keyboard numbers to whack moles too.",
    "Tip: Reaction time is key to getting a High Score!"
];

if (player1Button) {
    player1Button.addEventListener('click', () => {
        playClickSoundAndThen(() => {
            // Pick Random Video (1-3)
            const randomVid = Math.floor(Math.random() * 3) + 1;
            // Pick Random Tip from the array
            const randomTip = gameTips[Math.floor(Math.random() * gameTips.length)];

            // Save everything for the loading page
            localStorage.setItem('nextPage', 'singlePlayer.html');
            localStorage.setItem('selectedVideo', `videos/loading${randomVid}.mp4`);
            localStorage.setItem('loadingTip', randomTip); // <--- SAVES THE TEXT
            
            window.location.href = 'loading.html';
        });
    });
}

if (player2Button) {
    player2Button.addEventListener('click', () => {
        playClickSoundAndThen(() => {
            const randomVid = Math.floor(Math.random() * 3) + 1;
            const randomTip = gameTips[Math.floor(Math.random() * gameTips.length)];

            localStorage.setItem('nextPage', 'multiPlayer.html');
            localStorage.setItem('selectedVideo', `videos/loading${randomVid}.mp4`);
            localStorage.setItem('loadingTip', randomTip); // <--- SAVES THE TEXT
            
            window.location.href = 'loading.html';
        });
    });
}
if (backButton) {
    backButton.addEventListener('click', () => {
        playClickSoundAndThen(() => {
            window.location.href = 'index.html'; 
        });
    });
}