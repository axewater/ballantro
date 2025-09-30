// Handle splash screen with fade transition
document.addEventListener('DOMContentLoaded', function() {
    const splashScreen = document.getElementById('splash-screen');
    const startupScreen = document.getElementById('startup-screen');
    const videoContainer = document.getElementById('video-intro-container');
    const background = document.querySelector('.background');
    const introVideo = document.getElementById('intro-video');
    const starfield = document.getElementById('starfield');

    // Function to set main menu background image with fade
    function showMainMenuBackground() {
        // Fade out starfield
        starfield.style.opacity = "0";
        // After fade out, set background image
        setTimeout(() => {
            background.style.backgroundImage = "url('/static/assets/images/mainbackdrop.jpg')";
            background.style.backgroundSize = "cover";
            background.style.backgroundPosition = "center";
        }, 500);
    }

    // Function to clear background image and show starfield with fade
    function showGameBackground() {
        // Fade out background image
        background.style.backgroundImage = "";
        // Fade in starfield after a short delay
        setTimeout(() => {
            starfield.style.opacity = "1";
        }, 100);
    }

    // --- Refactored Video Handling ---

    // Define handlers so they can be removed by reference
    const handleVideoEnd = () => skipVideoAndShowMenu();
    const handleVideoClick = () => skipVideoAndShowMenu();

    // Function to remove video listeners and stop the video
    function cleanupVideoPlayback() {
        introVideo.pause();
        videoContainer.style.display = 'none';
        introVideo.removeEventListener('ended', handleVideoEnd);
        videoContainer.removeEventListener('click', handleVideoClick);
    }

    // Function to skip video and go to main menu
    function skipVideoAndShowMenu() {
        cleanupVideoPlayback(); // Stop video and remove listeners to prevent multiple calls
        showMainMenuBackground();
        startupScreen.classList.add('active');
        if (!window.pokerGame) { // Initialize only if it doesn't exist yet
            initializeGame();
        }
    }

    // Handle splash screen click
    splashScreen.addEventListener('click', function() {
        splashScreen.classList.remove('active');
        
        // Show and play the intro video
        videoContainer.style.display = 'block';
        
        // Apply video audio settings if available
        if (window.pokerGame && window.pokerGame.settingsManager) {
            window.pokerGame.settingsManager.applySettings();
        }
        
        introVideo.play().catch(err => {
            console.error('Error playing video:', err);
            skipVideoAndShowMenu(); // Fallback if video fails to play
        });
        
        // Show menu after 1 second while video continues playing in background
        setTimeout(() => {
            showMainMenuBackground();
            startupScreen.classList.add('active');
            if (!window.pokerGame) {
                initializeGame();
            }
        }, 1000);
        
        // Add listeners that can be removed later
        introVideo.addEventListener('ended', handleVideoEnd);
        videoContainer.addEventListener('click', handleVideoClick);
    });

    // Intercept the start game buttons to clean up video playback
    document.getElementById('start-game-btn').addEventListener('click', function() {
        cleanupVideoPlayback();
        showGameBackground();
    });
    
    document.getElementById('start-debug-game-btn').addEventListener('click', function() {
        cleanupVideoPlayback();
        showGameBackground();
    });

    document.getElementById('debug-boss-btn').addEventListener('click', function() {
        cleanupVideoPlayback();
        showGameBackground();
    });


    // Listen for events to return to main menu (victory, game over, back to menu)
    // Assuming buttons with these IDs exist and are used to return to menu
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const tryAgainBtn = document.getElementById('try-again-btn');

    function returnToMainMenu() {
        // Show main menu screen
        startupScreen.classList.add('active');
        // Hide other screens
        document.getElementById('victory-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('highscores-screen').classList.remove('active');
        document.getElementById('shop-screen').classList.remove('active');
        document.getElementById('game-screen').classList.remove('active');
        // Show main menu background
        showMainMenuBackground();
    }

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', returnToMainMenu);
    }
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', returnToMainMenu);
    }
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', returnToMainMenu);
    }

    // Expose functions to global scope for game.js to call
    window.showGameBackground = showGameBackground;
    window.showMainMenuBackground = showMainMenuBackground;

    // Add cooldown for card hover sound to prevent rapid-fire sound effect
    let lastHoverSoundTime = 0;
    const hoverSoundCooldown = 100; // milliseconds
    
    // Assuming SoundManager is globally accessible and has a playHoverSound method
    // Also assuming cards have a class 'card' and hover sound is triggered on mouseenter
    document.addEventListener('mouseenter', function(event) {
        // Add null check for event.target and classList
        const target = event.target;
        
        // Guard against undefined target or missing classList property
        if (!target || !target.classList) {
            return;
        }
        
        if (target.classList.contains('card')) {
            const now = Date.now();
            if (now - lastHoverSoundTime > hoverSoundCooldown) {
                if (window.SoundManager && typeof window.SoundManager.playHoverSound === 'function') {
                    window.SoundManager.playHoverSound();
                }
                lastHoverSoundTime = now;
            }
        }
    }, true); // useCapture true to catch events in capture phase to reduce multiple triggers
});

// Initialize game function - called after splash screen is clicked
function initializeGame() {
    window.pokerGame = new PokerGame();
}
