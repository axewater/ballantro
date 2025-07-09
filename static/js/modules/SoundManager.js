class SoundManager {
    constructor() {
        this.initialized = false;
        this.cardDealSound = new Audio('/static/assets/sound/cards_dealt.mp3');
        this.cardClickSound = new Audio('/static/assets/sound/card_click.mp3');
        this.scoreMultSound = new Audio('/static/assets/sound/score_mult.mp3');
        this.cardHoverSound = new Audio('/static/assets/sound/cards_flick.mp3');
        this.shopPurchaseSound = new Audio('/static/assets/sound/money_ching.mp3');
        this.roundCompleteSound = new Audio('/static/assets/sound/end_round.mp3');
        this.chipSound = new Audio('/static/assets/sound/money_ching.mp3');
        this.turboChipSound = new Audio('/static/assets/sound/score_mult.mp3');
    }

    initialize() {
        if (this.initialized) return;
        
        // Set up global sound helpers
        window.cardHoverSound = this.cardHoverSound;
        window.playCardHoverSound = () => { 
            const s = window.cardHoverSound; 
            if(s){ 
                s.pause(); 
                s.currentTime = 0; 
                s.play().catch(()=>{}); 
            } 
        };
        
        window.cardClickSound = this.cardClickSound;
        window.scoreMultSound = this.scoreMultSound;
        
        this.initialized = true;
    }

    playCardDealSound() {
        this.cardDealSound.currentTime = 0;
        this.cardDealSound.play().catch(error => {
            console.warn("CLIENT: Could not play card deal sound:", error);
        });
    }

    playButtonClickSound() {
        // Use Web Audio API for a generated click sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    playCardClickSound() {
        this.cardClickSound.currentTime = 0;
        this.cardClickSound.play().catch(() => {});
    }

    playMultiplierSound() {
        this.scoreMultSound.currentTime = 0;
        this.scoreMultSound.play().catch(() => {});
    }

    playShopPurchaseSound() {
        this.shopPurchaseSound.currentTime = 0;
        this.shopPurchaseSound.play().catch(error => {
            console.warn("CLIENT: Could not play shop purchase sound:", error);
        });
    }

    playRoundCompleteSound() {
        this.roundCompleteSound.currentTime = 0;
        this.roundCompleteSound.play().catch(error => {
            console.warn("CLIENT: Could not play round complete sound:", error);
        });
    }

    playRerollSound() {
        // Create a custom reroll sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    playCardScoringBuzz(cardIndex = 0, totalCards = 5) {
        // Create buzzing sound with decreasing duration and increasing pitch
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();
        
        // Calculate progression: first card = longest/lowest, last card = shortest/highest
        const progress = cardIndex / Math.max(1, totalCards - 1);
        
        // Base frequency starts at 150Hz, goes up to 800Hz
        const baseFreq = 150 + (progress * 650);
        
        // Duration starts at 0.4s, goes down to 0.1s
        const duration = 0.4 - (progress * 0.3);
        
        // Set up sawtooth wave for buzzy quality
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
        
        // Add slight frequency modulation for more electronic feel
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, audioContext.currentTime + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, audioContext.currentTime + duration);
        
        // Filter for more electronic sound
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1200, audioContext.currentTime);
        filterNode.Q.setValueAtTime(2, audioContext.currentTime);
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        // Connect the audio graph
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start and stop
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    playChipSound(progressPercentage = 0) {
        // Adjust pitch based on progress percentage (0-1)
        // Higher progress = higher pitch for more excitement
        this.chipSound.currentTime = 0;
        this.chipSound.playbackRate = 0.8 + (progressPercentage * 0.4); // Range from 0.8 to 1.2
        this.chipSound.play().catch(() => {});
    }

    playTurboChipSound() {
        this.turboChipSound.currentTime = 0;
        this.turboChipSound.play().catch(() => {});
    }

    calculateScoreProgress(currentScore, targetScore) {
        return Math.min(1, Math.max(0, currentScore / targetScore));
    }
}

// Export for use in other modules
window.SoundManager = SoundManager;
