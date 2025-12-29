// --- I. SELECT ELEMENTS (Mga Elemento) ---
const playButton = document.getElementById('playButton');
const bgmusic = document.getElementById('bgmusic');
const clickSound = document.getElementById('clickSound');


// --- II. AUTOPLAY BACKGROUND MUSIC ON PAGE LOAD (Muted) ---
function tryUnmuteAndFade(audioEl, targetVolume = 0.5, step = 0.05, intervalMs = 200) {
    setTimeout(async () => {
        try {
            audioEl.muted = false;
            let vol = 0;
            const fade = setInterval(() => {
                vol = Math.min(targetVolume, vol + step);
                audioEl.volume = vol;
                if (vol >= targetVolume) clearInterval(fade);
            }, intervalMs);
        } catch (e) {
            console.warn('Pag-unmute ay hinarang o nag-fail:', e);
            audioEl.muted = true;
        }
    }, 700);
}

window.addEventListener('load', async () => {
    if (!bgmusic) return;

    bgmusic.loop = true;
    bgmusic.muted = true;
    bgmusic.volume = 0;

    try {
        await bgmusic.play(); // usually works since muted
    } catch (err) {
        console.warn('bgmusic.play() failed on load:', err);
    }
});


// --- III. PLAY BACKGROUND MUSIC WHEN CLICKING ANYWHERE ON BACKGROUND ---
document.addEventListener('click', async (e) => {
    if (e.target === playButton) return; // don’t trigger if clicking button

    if (bgmusic.paused) {
        try {
            await bgmusic.play();
            tryUnmuteAndFade(bgmusic, 0.5, 0.05, 40);
            console.log('Background music started by background click');
        } catch (err) {
            console.warn('Manual play failed:', err);
        }
    }
});


// --- IV. RANDOM BUTTON MOVEMENT (Unchanged) ---
function moveButtonRandomly() {
    const randomX = Math.floor(Math.random() * 21) - 10;
    const randomY = Math.floor(Math.random() * 21) - 10;
    if (playButton) {
        playButton.style.transform = `translate(calc(-50% + ${randomX}px), calc(-50% + ${randomY}px)) scale(1.05)`;
    }
}

function resetButtonPosition() {
    if (playButton) playButton.style.transform = 'translate(-50%, -50%) scale(1)';
}

setInterval(() => {
    moveButtonRandomly();
    setTimeout(resetButtonPosition, 300);
}, 500);


// --- V. PLAY BUTTON CLICK (FULL SOUND + REDIRECT) ---
playButton.addEventListener('click', (e) => {
    e.preventDefault();

    if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.volume = 1.0;

        clickSound.play()
            .then(() => {
                // Wait until sound ends
                clickSound.addEventListener('ended', () => {
                    window.location.href = 'player.html';
                }, { once: true });
            })
            .catch(err => {
                console.warn('Click sound failed:', err);
                setTimeout(() => window.location.href = 'player.html', 500);
            });

    } else {
        // No click sound, fallback
        setTimeout(() => window.location.href = 'player.html', 500);
    }
});
