class PokerGame {
    constructor() {
        // Initialize all modules
        this.apiClient = new ApiClient();
        this.gameState = new GameState();
        this.cardManager = new CardManager();
        this.screenManager = new ScreenManager();
        this.uiUpdater = new UIUpdater();
        this.previewManager = new PreviewManager(this.apiClient);
        // will hold the exact Card models the user played last
        this.lastPlayedCards = [];

        // Initialize event listeners and show startup screen
        this.initializeEventListeners();
        this.screenManager.showScreen('startup');
    }

    initializeEventListeners() {
        // Startup screen
        document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('highscores-btn').addEventListener('click', () => this.showHighscores());

        // Game screen
        document.getElementById('draw-cards-btn').addEventListener('click', () => this.drawCards());
        document.getElementById('play-hand-btn').addEventListener('click', () => this.playHand());
        document.getElementById('sort-rank-btn').addEventListener('click', () => this.sortCardsByRank());
        document.getElementById('sort-suit-btn').addEventListener('click', () => this.sortCardsBySuit());
        document.getElementById('show-payouts-btn').addEventListener('click', () => this.screenManager.showPayoutsModal());
        document.getElementById('deck-info-panel').addEventListener('click', () => this.showRemainingDeckModal());

        // Scoring screen
        document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());

        // Victory screen
        document.getElementById('save-score-btn').addEventListener('click', () => this.screenManager.showNameModal());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startNewGame());

        // Game over screen
        document.getElementById('save-game-over-score-btn').addEventListener('click', () => this.saveGameOverScore());
        document.getElementById('try-again-btn').addEventListener('click', () => this.startNewGame());

        // Highscores screen
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.screenManager.showScreen('startup'));

        // Name modal
        document.getElementById('save-name-btn').addEventListener('click', () => this.saveVictoryScore());
        document.getElementById('cancel-name-btn').addEventListener('click', () => this.screenManager.hideNameModal());

        // Payouts modal
        document.getElementById('close-payouts-btn').addEventListener('click', () => this.screenManager.hidePayoutsModal());

        // Remaining Deck modal
        document.getElementById('close-remaining-deck-btn').addEventListener('click', () => this.screenManager.hideRemainingDeckModal());
        
        // Enter key in name inputs
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveGameOverScore();
        });
        document.getElementById('modal-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveVictoryScore();
        });
    }

    async startNewGame() {
        if (this.cardManager.isSorting) return;

        try {
            const data = await this.apiClient.newGame();
            if (data.success) {
                this.gameState.setGameState(data.game_state);
                this.cardManager.resetSortState(); // Reset active sort
                this.cardManager.clearSelection();
                this.updateGameDisplay();
                this.screenManager.showScreen('game');
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                this.uiUpdater.updateSortButtonAppearance(this.cardManager.activeSortType); // Update button visuals

                this.animateCardDraw();
            } else {
                console.error('Failed to start new game:', data);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async drawCards() {
        if (this.cardManager.isSorting) return;
        if (this.cardManager.getSelectedCount() === 0) {
            alert('Please select at least one card to discard.');
            return;
        }

        try {
            const data = await this.apiClient.drawCards(
                this.gameState.sessionId, 
                this.cardManager.getSelectedCards()
            );
            if (data.success) {
                this.gameState.setGameState(data.game_state);
                this.cardManager.clearSelection();
                
                // Apply active sort if one is set, then update display and animate
                await this.cardManager.applyActiveSort(this.gameState.gameState, () => {
                    this.updateGameDisplay(); // This will re-render hand if sorted
                    this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                    this.animateCardDraw(); // Animate new/sorted hand
                });

            } else {
                console.error('Failed to draw cards:', data);
                alert(data.message || 'Failed to draw cards.');
            }
        } catch (error) {
            console.error('Error drawing cards:', error);
        }
    }

    async playHand() {
        if (this.cardManager.isSorting) return;
        if (this.cardManager.getSelectedCount() !== 5) {
            alert('Please select exactly 5 cards to play.');
            return;
        }

        // capture the selected card-models _before_ state is reset
        const selIdx = this.cardManager.getSelectedCards();
        const current = this.gameState.getHand();
        this.lastPlayedCards = selIdx.map(i => current[i]);

        try {
            const data = await this.apiClient.playHand(
                this.gameState.sessionId,
                selIdx
            );
            if (data.success) {
                this.gameState.setGameState(data.game_state);
                this.gameState.setHandResult(data.hand_result, data.round_complete, data.money_awarded_this_round);
                this.showScoringScreen();
            } else {
                console.error('Failed to play hand:', data);
                alert(data.message || 'Failed to play hand.');
            }
        } catch (error) {
            console.error('Error playing hand:', error);
        }
    }

    async showHighscores() {
        try {
            const data = await this.apiClient.getHighscores();
            
            if (data.success) {
                this.uiUpdater.showHighscores(data.highscores);
                this.screenManager.showScreen('highscores');
            } else {
                console.error('Failed to get highscores:', data);
            }
        } catch (error) {
            console.error('Error getting highscores:', error);
        }
    }

    saveVictoryScore() {
        const name = document.getElementById('modal-player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name, this.gameState.getTotalScore());
        this.screenManager.hideNameModal();
        this.showHighscores();
    }

    saveGameOverScore() {
        const name = document.getElementById('player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name, this.gameState.getTotalScore());
        this.showHighscores();
    }

    async saveScore(name, score) {
        try {
            const data = await this.apiClient.saveScore(name, score);
            if (!data.success) {
                console.error('Failed to save score:', data);
            }
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }

    async showRemainingDeckModal() {
        if (!this.gameState.sessionId) {
            console.warn("No active game session to show remaining deck.");
            return;
        }
        try {
            const data = await this.apiClient.getRemainingDeck(this.gameState.sessionId);

            if (data.success && data.remaining_cards) {
                this.screenManager.populateRemainingDeckDisplay(data.remaining_cards);
                this.screenManager.showRemainingDeckModal();
            } else {
                console.error('Failed to fetch remaining deck:', data.detail || 'Unknown error');
                alert('Could not load remaining cards.');
            }
        } catch (error) {
            console.error('Error fetching remaining deck:', error);
            alert('Error loading remaining cards.');
        }
    }

    showScoringScreen() {
        this.uiUpdater.showScoringScreen(
            this.gameState.handResult,
            this.lastPlayedCards,                 // exact cards we just played
            this.gameState.moneyAwardedThisRound,
            this.cardManager
        );
        this.screenManager.showScreen('scoring');
        
        // Enhanced scoring animation
        const playedCardsContainer = document.getElementById('played-cards');
        const playedCards = playedCardsContainer.querySelectorAll('.card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardScoring(Array.from(playedCards), this.gameState.handResult)
        );
        // The .then() block that caused duplicate animations has been removed.
        // animateCardScoring now handles the full sequence.
    }

    continueGame() {
        if (this.cardManager.isSorting) return;
        if (this.gameState.isVictory()) {
            this.uiUpdater.showVictoryScreen(this.gameState.getTotalScore());
            this.screenManager.showScreen('victory');
        } else if (this.gameState.isGameOver()) {
            this.uiUpdater.showGameOverScreen(this.gameState.getTotalScore());
            this.screenManager.showScreen('game-over');
        } else {
            // Check if round changed for transition animation
            if (this.gameState.roundComplete) {
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.getCurrentRound())
                ).then(() => {
                    this.finalizeHandUpdateAndDisplay();
                });
            } else {
                this.finalizeHandUpdateAndDisplay();
            }
        }
    }

    async finalizeHandUpdateAndDisplay() {
        this.cardManager.clearSelection();
        // Apply active sort before updating the display
        await this.cardManager.applyActiveSort(this.gameState.gameState, () => {
            this.updateGameDisplay(); // This will re-render hand if sorted
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
            this.screenManager.showScreen('game');
            // If new cards were dealt (e.g. after playing a hand), animate them
            // This might need a flag if we only want to animate on actual new cards vs just sort
            this.animateCardDraw(); 
        });
    }

    updateGameDisplay() {
        if (!this.gameState.gameState) return;
        
        this.uiUpdater.updateGameDisplay(this.gameState.gameState, this.cardManager.getSelectedCount());
        this.displayHand();
    }

    displayHand() {
        this.uiUpdater.displayHand(
            this.gameState.getHand(),
            this.cardManager.selectedCards,
            this.cardManager,
            (index, cardElement) => this.handleCardClick(index, cardElement)
        );
    }

    handleCardClick(index, cardElement) {
        this.cardManager.toggleCardSelection(index, cardElement, (selectedCards) => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, selectedCards.size);
            this.uiUpdater.elements.selectionCount.textContent = selectedCards.size;
            this.previewManager.updateLivePreview(selectedCards, this.gameState.gameState);
        });
    }

    async sortCardsByRank() {
        // Pass uiUpdater to cardManager for updating button appearance
        await this.cardManager.sortCardsByRank(this.gameState.gameState, () => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
            this.uiUpdater.elements.selectionCount.textContent = this.cardManager.getSelectedCount();
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
            // No need to call setSortButtonsDisabled(false) here, CardManager handles it.
        }, this.uiUpdater);
    }

    async sortCardsBySuit() {
        // Pass uiUpdater to cardManager for updating button appearance
        await this.cardManager.sortCardsBySuit(this.gameState.gameState, () => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
            this.uiUpdater.elements.selectionCount.textContent = this.cardManager.getSelectedCount();
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
            // No need to call setSortButtonsDisabled(false) here, CardManager handles it.
        }, this.uiUpdater);
    }

    animateCardDraw() {
        const cards = document.querySelectorAll('#player-hand .card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pokerGame = new PokerGame();
});
