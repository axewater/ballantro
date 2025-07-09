class SettingsManager {
    constructor() {
        this.settings = {
            soundVolume: 0.7,
            musicVolume: 0.5,
            videoAudioEnabled: true
        };
        
        this.loadSettings();
        this.createSettingsModal();
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('pokerGameSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('pokerGameSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings to localStorage:', error);
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    applySettings() {
        // Apply sound volume to all audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.volume = this.settings.soundVolume;
        });

        // Apply video audio setting
        const introVideo = document.getElementById('intro-video');
        if (introVideo) {
            introVideo.muted = !this.settings.videoAudioEnabled;
            if (this.settings.videoAudioEnabled) {
                introVideo.volume = this.settings.soundVolume;
            }
        }
    }

    createSettingsModal() {
        // Create settings modal HTML
        const modalHTML = `
            <div id="settings-modal" class="modal">
                <div class="modal-content glass-panel">
                    <h3>Settings</h3>
                    <div class="settings-section">
                        <div class="setting-item">
                            <label for="sound-volume-slider">Sound Volume</label>
                            <div class="slider-container">
                                <input type="range" id="sound-volume-slider" min="0" max="1" step="0.1" value="${this.settings.soundVolume}">
                                <span id="sound-volume-value">${Math.round(this.settings.soundVolume * 100)}%</span>
                            </div>
                        </div>
                        <div class="setting-item">
                            <label for="music-volume-slider">Music Volume</label>
                            <div class="slider-container">
                                <input type="range" id="music-volume-slider" min="0" max="1" step="0.1" value="${this.settings.musicVolume}">
                                <span id="music-volume-value">${Math.round(this.settings.musicVolume * 100)}%</span>
                            </div>
                        </div>
                        <div class="setting-item">
                            <label for="video-audio-toggle">Intro Video Audio</label>
                            <div class="toggle-container">
                                <input type="checkbox" id="video-audio-toggle" ${this.settings.videoAudioEnabled ? 'checked' : ''}>
                                <span class="toggle-label">${this.settings.videoAudioEnabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="close-settings-btn" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sound volume slider
        const soundVolumeSlider = document.getElementById('sound-volume-slider');
        const soundVolumeValue = document.getElementById('sound-volume-value');
        
        soundVolumeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setSetting('soundVolume', value);
            soundVolumeValue.textContent = `${Math.round(value * 100)}%`;
        });

        // Music volume slider
        const musicVolumeSlider = document.getElementById('music-volume-slider');
        const musicVolumeValue = document.getElementById('music-volume-value');
        
        musicVolumeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setSetting('musicVolume', value);
            musicVolumeValue.textContent = `${Math.round(value * 100)}%`;
        });

        // Video audio toggle
        const videoAudioToggle = document.getElementById('video-audio-toggle');
        const toggleLabel = document.querySelector('.toggle-label');
        
        videoAudioToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            this.setSetting('videoAudioEnabled', enabled);
            toggleLabel.textContent = enabled ? 'Enabled' : 'Disabled';
        });

        // Close button
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.hideSettings();
        });

        // Close on background click
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.hideSettings();
            }
        });
    }

    showSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Initialize settings when the page loads
    initialize() {
        this.applySettings();
    }
}

// Export for use in other modules
window.SettingsManager = SettingsManager;
