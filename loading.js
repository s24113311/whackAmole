// --- I. SETTINGS ---
const videoFolder = "videos/"; 
const videoFiles = [
    "loading1.mp4",
    "loading2.mp4",
    "loading3.mp4",
];

const tips = ["DON'T HIT THE BOMBS!", "GREEN MOLES = DOUBLE POINTS", "STARDUST SWALLOWS GOLD", "Scoring for yourself is progress; attacking the opponent is self-destruction.", "Attacking the opponent is self-destruction: It reminds them that hitting their mole costs YOU points (-1)."];

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("loadingVideo");
    const tip = document.getElementById("gameTip");

    // 1. Pick a random video
    const randomIdx = Math.floor(Math.random() * videoFiles.length);
    video.src = videoFolder + videoFiles[randomIdx];

    // 2. AUDIO SETTINGS
    video.muted = false; // Turn sound ON
    video.volume = 0.6;  // Set volume (0.0 to 1.0)

    // 3. FIX BLACK SCREEN & START AUDIO
    video.load();
    
    // Attempt to play with sound
    video.play().catch(error => {
        console.log("Audio autoplay was blocked. Playing muted as fallback.");
        video.muted = true; // If browser blocks sound, play muted so it isn't a black screen
        video.play();
    });

    // 4. Set random tip
    if (tip) {
        tip.innerText = tips[Math.floor(Math.random() * tips.length)];
    }

    // 5. THE CONNECTION: Redirect after 4 seconds
    setTimeout(() => {
        const destination = localStorage.getItem('nextPage') || 'singlePlayer.html';
        window.location.href = destination;
    }, 4000);
});