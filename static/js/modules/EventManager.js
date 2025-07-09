class EventManager {
    constructor(game) {
        this.game = game;
    }

    initializeEventListeners() {
        // Startup screen
        document.getElementById('start-game-btn').addEventListener('click', () => this.game.startNewGame(false));
        document.getElementById('start-debug-game-btn').addEventListener('click', () => this.game.startNewGame(true));
        document.getElementById('debug-boss-btn').addEventListener('click', () => this.game.bossManager.showBossSelection());
        document.getElementById('highscores-btn').addEventListener('click', () => this.game.showHighscores());
        document.getElementById('settings-btn').addEventListener('click', () => this.game.settingsManager.showSettings());

        // In-game settings button
        document.getElementById('in-game-settings-btn').addEventListener('click', () => this.game.settingsManager.showSettings());

        // Game screen
        document.getElementById('draw-cards-btn').addEventListener('click', () => this.game.drawCards());
        document.getElementById('play-hand-btn').addEventListener('click', () => this.game.playHand());
        document.getElementById('sort-rank-btn').addEventListener('click', () => this.game.sortCardsByRank());
        document.getElementById('sort-suit-btn').addEventListener('click', () => this.game.sortCardsBySuit());
        document.getElementById('show-payouts-btn').addEventListener('click', () => this.game.screenManager.showPayoutsModal());
        document.getElementById('deck-info-panel').addEventListener('click', () => this.game.showRemainingDeckModal());

        // Shop screen
        document.getElementById('reroll-shop-btn').addEventListener('click', () => this.game.shopManager.rerollShop());
        document.getElementById('next-round-btn').addEventListener('click', () => this.game.shopManager.proceedToNextRound());

        // Victory screen
        document.getElementById('save-score-btn').addEventListener('click', () => this.game.screenManager.showNameModal());
        document.getElementById('play-again-btn').addEventListener('click', () => this.game.startNewGame());

        // Game over screen
        document.getElementById('save-game-over-score-btn').addEventListener('click', () => this.game.saveGameOverScore());
        document.getElementById('try-again-btn').addEventListener('click', () => this.game.startNewGame());

        // Highscores screen
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.game.screenManager.showScreen('startup');
        });
        
        document.getElementById('back-from-boss-selection-btn').addEventListener('click', () => {
            const background = document.querySelector('.background');
            if (background) {
                background.style.transition = 'background-image 0.5s ease';
                background.style.backgroundImage = "url('/static/assets/images/mainbackdrop.jpg')";
                background.style.backgroundSize = "cover";
                background.style.backgroundPosition = "center";
            }
            const starfield = document.getElementById('starfield');
            if (starfield) {
                starfield.style.transition = 'opacity 0.5s ease';
                starfield.style.opacity = "0";
            }
            this.game.screenManager.showScreen('startup');
        });

        // Name modal
        document.getElementById('save-name-btn').addEventListener('click', () => this.game.saveVictoryScore());
        document.getElementById('cancel-name-btn').addEventListener('click', () => this.game.screenManager.hideNameModal());

        // Payouts modal
        document.getElementById('close-payouts-btn').addEventListener('click', () => this.game.screenManager.hidePayoutsModal());

        // Remaining Deck modal
        document.getElementById('close-remaining-deck-btn').addEventListener('click', () => this.game.screenManager.hideRemainingDeckModal());
        
        // Enter key in name inputs
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.game.saveGameOverScore();
        });
        document.getElementById('modal-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.game.saveVictoryScore();
        });
    }
}

window.EventManager = EventManager;
