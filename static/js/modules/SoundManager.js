/**
 * SoundManager.js
 * 
 * Handles all Web Audio API-based sound effects for the scoring sequence.
 * Creates dynamic, pitch-shifting sounds that respond to game progress.
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Web Audio API context.
     * Must be called after user interaction to comply with browser policies.
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime); // Master volume
            this.isInitialized = true;
            console.log('SoundManager: Web Audio API initialized successfully');
        } catch (error) {
            console.warn('SoundManager: Failed to initialize Web Audio API:', error);
        }
    }

    /**
     * Play a chip scoring sound with dynamic pitch based on progress toward target score.
     * @param {number} progress - Value from 0.0 to 1.0 representing progress toward round target
     */
    playChipSound(progress = 0) {
        if (!this.isInitialized) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Connect the audio graph
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Calculate frequency based on progress (200Hz to 800Hz)
            const baseFreq = 200;
            const maxFreq = 800;
            const frequency = baseFreq + (progress * (maxFreq - baseFreq));
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'triangle'; // Warm, pleasant tone
            
            // Create envelope (attack, decay, sustain, release)
            const now = this.audioContext.currentTime;
            const duration = 0.15;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.05); // Decay
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
        } catch (error) {
            console.warn('SoundManager: Error playing chip sound:', error);
        }
    }

    /**
     * Play a multiplier bonus sound effect.
     */
    playMultiplierSound() {
        if (!this.isInitialized) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Higher pitched, more dramatic sound for multipliers
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.type = 'sawtooth';
            
            const now = this.audioContext.currentTime;
            const duration = 0.25;
            
            // Frequency sweep upward for excitement
            oscillator.frequency.exponentialRampToValueAtTime(800, now + duration * 0.7);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
        } catch (error) {
            console.warn('SoundManager: Error playing multiplier sound:', error);
        }
    }

    /**
     * Play a turbo chip activation sound effect.
     */
    playTurboChipSound() {
        if (!this.isInitialized) return;

        try {
            // Create a more complex sound with two oscillators for richness
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Harmonic frequencies for a richer sound
            osc1.frequency.setValueAtTime(300, this.audioContext.currentTime);
            osc2.frequency.setValueAtTime(450, this.audioContext.currentTime); // Perfect fifth
            
            osc1.type = 'square';
            osc2.type = 'triangle';
            
            const now = this.audioContext.currentTime;
            const duration = 0.3;
            
            // Slight frequency modulation for "power-up" effect
            osc1.frequency.exponentialRampToValueAtTime(600, now + duration * 0.5);
            osc2.frequency.exponentialRampToValueAtTime(900, now + duration * 0.5);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
            
        } catch (error) {
            console.warn('SoundManager: Error playing turbo chip sound:', error);
        }
    }

    /**
     * Calculate progress toward round target for pitch shifting.
     * @param {number} currentScore - Current total score
     * @param {number} targetScore - Target score for the round
     * @returns {number} Progress from 0.0 to 1.0
     */
    calculateScoreProgress(currentScore, targetScore) {
        if (!targetScore || targetScore <= 0) return 0;
        return Math.min(Math.max(currentScore / targetScore, 0), 1);
    }
}

// Export for use in other modules
window.SoundManager = SoundManager;
