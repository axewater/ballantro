class PokerGame {
    constructor() {
        this.gameState = null;
        this.sessionId = null;
        this.selectedCards = new Set();
        this.currentScreen = 'startup';
        
        this.initializeEventListeners();
        this.showScreen('startup');
    }

    initializeEventListeners() {
        // Startup screen
        document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('highscores-btn').addEventListener('click', () => this.showHighscores());

        // Game screen
        document.getElementById('draw-cards-btn').addEventListener('click', () => this.drawCards());
        document.getElementById('play-hand-btn').addEventListener('click', () => this.playHand());

        // Scoring screen
        document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());

        // Victory screen
        document.getElementById('save-score-btn').addEventListener('click', () => this.showNameModal());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startNewGame());

        // Game over screen
        document.getElementById('save-game-over-score-btn').addEventListener('click', () => this.saveGameOverScore());
        document.getElementById('try-again-btn').addEventListener('click', () => this.startNewGame());

        // Highscores screen
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showScreen('startup'));

        // Name modal
        document.getElementById('save-name-btn').addEventListener('click', () => this.saveVictoryScore());
        document.getElementById('cancel-name-btn').addEventListener('click', () => this.hideNameModal());
        
        // Enter key in name inputs
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveGameOverScore();
        });
        document.getElementById('modal-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveVictoryScore();
        });
    }

    async startNewGame() {
        try {
            const response = await fetch('/api/new_game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.sessionId = this.gameState.session_id;
                this.selectedCards.clear();
                this.updateGameDisplay();
                this.showScreen('game');
            } else {
                console.error('Failed to start new game:', data);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async drawCards() {
        if (this.selectedCards.size === 0) {
            alert('Please select at least one card to discard');
            return;
        }

        try {
            const response = await fetch('/api/draw_cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    selected_cards: Array.from(this.selectedCards)
                })
            });

            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.selectedCards.clear();
                this.updateGameDisplay();
                
                // Animate card drawing
                this.animateCardDraw();
            } else {
                alert('Error: ' + data.detail);
            }
        } catch (error) {
            console.error('Error drawing cards:', error);
        }
    }

    async playHand() {
        if (this.selectedCards.size !== 5) {
            alert('Please select exactly 5 cards to play');
            return;
        }

        try {
            const response = await fetch('/api/play_hand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    selected_cards: Array.from(this.selectedCards)
                })
            });

            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.handResult = data.hand_result;
                this.roundComplete = data.round_complete;
                
                // Show scoring screen with animation
                this.showScoringScreen();
            } else {
                alert('Error: ' + data.detail);
            }
        } catch (error) {
            console.error('Error playing hand:', error);
        }
    }

    continueGame() {
        if (this.gameState.is_victory) {
            this.showScreen('victory');
            document.getElementById('final-score').textContent = this.gameState.total_score;
            // Trigger victory animation
            setTimeout(() => {
                window.gameAnimations.animateVictory();
            }, 500);
        } else if (this.gameState.is_game_over) {
            this.showScreen('game-over');
            document.getElementById('game-over-score').textContent = this.gameState.total_score;
        } else {
            // Check if round changed for transition animation
            if (this.roundComplete) {
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.current_round)
                ).then(() => {
                    this.selectedCards.clear();
                    this.updateGameDisplay();
                    this.showScreen('game');
                });
            } else {
                this.selectedCards.clear();
                this.updateGameDisplay();
                this.showScreen('game');
            }
        }
    }

    async showHighscores() {
        try {
            const response = await fetch('/api/highscores');
            const data = await response.json();
            
            if (data.success) {
                this.displayHighscores(data.highscores);
                this.showScreen('highscores');
            }
        } catch (error) {
            console.error('Error fetching highscores:', error);
        }
    }

    async saveGameOverScore() {
        const name = document.getElementById('player-name').value.trim();
        if (!name) {
            alert('Please enter your name');
            return;
        }

        await this.saveScore(name, this.gameState.total_score);
        this.showHighscores();
    }

    async saveVictoryScore() {
        const name = document.getElementById('modal-player-name').value.trim();
        if (!name) {
            alert('Please enter your name');
            return;
        }

        this.hideNameModal();
        await this.saveScore(name, this.gameState.total_score);
        this.showHighscores();
    }

    async saveScore(name, score) {
        try {
            const response = await fetch('/api/save_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Failed to save score:', data);
            }
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }

    showNameModal() {
        document.getElementById('modal-player-name').value = '';
        document.getElementById('name-modal').classList.add('active');
    }

    hideNameModal() {
        document.getElementById('name-modal').classList.remove('active');
    }

    showScoringScreen() {
        // Display played cards
        const playedCardsContainer = document.getElementById('played-cards');
        playedCardsContainer.innerHTML = '';
        
        const selectedCardIndices = Array.from(this.selectedCards);
        selectedCardIndices.forEach(index => {
            const card = this.gameState.hand[index];
            const cardElement = this.createCardElement(card, false);
            playedCardsContainer.appendChild(cardElement);
        });

        // Display hand result
        document.getElementById('hand-type-name').textContent = this.formatHandType(this.handResult.hand_type);
        document.getElementById('hand-description').textContent = this.handResult.description;
        document.getElementById('card-chips').textContent = '0';
        document.getElementById('base-chips').textContent = '0';
        document.getElementById('multiplier').textContent = '×1';
        document.getElementById('hand-score').textContent = '0';

        this.showScreen('scoring');
        
        // Enhanced scoring animation
        const playedCards = playedCardsContainer.querySelectorAll('.card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardScoring(Array.from(playedCards), this.handResult)
        );
    }

    updateGameDisplay() {
        if (!this.gameState) return;

        // Update header info
        document.getElementById('current-round').textContent = this.gameState.current_round;
        document.getElementById('total-score').textContent = this.gameState.total_score;
        document.getElementById('round-target').textContent = this.gameState.round_target;
        document.getElementById('hands-played').textContent = this.gameState.hands_played;
        document.getElementById('max-hands').textContent = this.gameState.max_hands;
        document.getElementById('draws-used').textContent = this.gameState.draws_used;
        document.getElementById('max-draws').textContent = this.gameState.max_draws;
        document.getElementById('deck-remaining').textContent = this.gameState.deck_remaining;

        // Update hand display
        this.displayHand();
        
        // Update button states
        this.updateButtonStates();
    }

    displayHand() {
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';

        this.gameState.hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, true, index);
            handContainer.appendChild(cardElement);
        });
        
        // Animate card dealing
        const cards = handContainer.querySelectorAll('.card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }

    createCardElement(card, clickable = true, index = null) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.suit}`;
        
        if (clickable && index !== null) {
            cardDiv.addEventListener('click', () => this.toggleCardSelection(index, cardDiv));
            if (this.selectedCards.has(index)) {
                cardDiv.classList.add('selected');
            }
        }

        const suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };

        cardDiv.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${suitSymbols[card.suit]}</div>
            <div class="card-rank-bottom">${card.rank}</div>
        `;

        return cardDiv;
    }

    toggleCardSelection(index, cardElement) {
        if (this.selectedCards.has(index)) {
            this.selectedCards.delete(index);
            cardElement.classList.remove('selected');
            window.gameAnimations.animateCardSelection(cardElement, false);
        } else {
            this.selectedCards.add(index);
            cardElement.classList.add('selected');
            window.gameAnimations.animateCardSelection(cardElement, true);
        }

        this.updateSelectionDisplay();
        this.updateButtonStates();
    }

    updateSelectionDisplay() {
        document.getElementById('selection-count').textContent = this.selectedCards.size;
    }

    updateButtonStates() {
        const drawBtn = document.getElementById('draw-cards-btn');
        const playBtn = document.getElementById('play-hand-btn');

        // Draw button: enabled if cards selected and draws remaining
        drawBtn.disabled = this.selectedCards.size === 0 || 
                          this.gameState.draws_used >= this.gameState.max_draws;

        // Play button: enabled if exactly 5 cards selected
        playBtn.disabled = this.selectedCards.size !== 5;
    }

    displayHighscores(highscores) {
        const container = document.getElementById('highscores-list');
        container.innerHTML = '';

        if (highscores.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-style: italic;">No scores yet</p>';
            return;
        }

        highscores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'highscore-item';
            
            const date = new Date(score.timestamp).toLocaleDateString();
            
            item.innerHTML = `
                <div class="highscore-rank">#${index + 1}</div>
                <div class="highscore-name">${score.name}</div>
                <div class="highscore-score">${score.score}</div>
            `;
            
            container.appendChild(item);
        });
    }

    formatHandType(handType) {
        const typeMap = {
            'straight_flush': 'Straight Flush',
            'four_of_a_kind': 'Four of a Kind',
            'full_house': 'Full House',
            'flush': 'Flush',
            'straight': 'Straight',
            'three_of_a_kind': 'Three of a Kind',
            'two_pair': 'Two Pair',
            'one_pair': 'One Pair',
            'high_card': 'High Card'
        };
        return typeMap[handType] || handType;
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    animateCardDraw() {
        // Enhanced card drawing animation handled by animations module
        const cards = document.querySelectorAll('#player-hand .card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new PokerGame();
});

