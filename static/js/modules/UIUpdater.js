class UIUpdater {
    constructor() {
        // Cache DOM elements for better performance
        this.elements = {
            currentRound: document.getElementById('current-round'),
            totalScore: document.getElementById('total-score'),
            playerMoney: document.getElementById('player-money'),
            roundTarget: document.getElementById('round-target'),
            handsPlayed: document.getElementById('hands-played'),
            maxHands: document.getElementById('max-hands'),
            drawsUsed: document.getElementById('draws-used'),
            maxDraws: document.getElementById('max-draws'),
            deckRemaining: document.getElementById('deck-remaining'),
            selectionCount: document.getElementById('selection-count'),
            drawCardsBtn: document.getElementById('draw-cards-btn'),
            playHandBtn: document.getElementById('play-hand-btn'),
            playerHand: document.getElementById('player-hand')
        };
    }

    updateGameDisplay(gameState, selectedCount) {
        if (!gameState) return;
        
        // Update game info
        this.elements.currentRound.textContent = gameState.current_round;
        this.elements.totalScore.textContent = gameState.total_score;
        this.elements.playerMoney.textContent = `$${gameState.money}`;
        this.elements.roundTarget.textContent = gameState.round_target;
        this.elements.handsPlayed.textContent = gameState.hands_played;
        this.elements.maxHands.textContent = gameState.max_hands;
        this.elements.drawsUsed.textContent = gameState.draws_used;
        this.elements.maxDraws.textContent = gameState.max_draws;
        this.elements.deckRemaining.textContent = gameState.deck_remaining;
        
        // Update button states
        this.updateButtonStates(gameState, selectedCount);
        
        // Update selection count
        this.elements.selectionCount.textContent = selectedCount;
    }

    updateButtonStates(gameState, selectedCount) {
        this.elements.drawCardsBtn.disabled = 
            selectedCount === 0 || 
            gameState.draws_used >= gameState.max_draws;
            
        this.elements.playHandBtn.disabled = selectedCount !== 5;
    }

    displayHand(hand, selectedCards, cardManager, onCardClick) {
        this.elements.playerHand.innerHTML = '';
        
        hand.forEach((card, index) => {
            const cardElement = cardManager.createCardElement(card, selectedCards.has(index));
            cardElement.dataset.index = index;
            cardElement.addEventListener('click', () => onCardClick(index, cardElement));
            this.elements.playerHand.appendChild(cardElement);
        });
    }

    showScoringScreen(handResult, playedCards, moneyAwardedThisRound, cardManager) {

        // Display played cards
        const playedCardsContainer = document.getElementById('played-cards');
        playedCardsContainer.innerHTML = '';
        
        // render exactly the Card objects passed in
        playedCards.forEach(card => {
            const el = cardManager.createCardElement(card, false);
            playedCardsContainer.appendChild(el);
        });

        // Display hand result
        document.getElementById('hand-type-name').textContent = this._formatHandType(handResult.hand_type);
        document.getElementById('hand-description').textContent = handResult.description;
        document.getElementById('card-chips').textContent = '0';
        document.getElementById('base-chips').textContent = '0';
        document.getElementById('multiplier').textContent = '×1';
        document.getElementById('hand-score').textContent = '0';
        
        // Money awarded display
        const roundBonusItem = document.getElementById('round-bonus-item');
        const roundBonusMoney = document.getElementById('round-bonus-money');
        if (moneyAwardedThisRound > 0) {
            roundBonusMoney.textContent = `$${moneyAwardedThisRound}`;
            roundBonusItem.style.display = 'flex';
        } else {
            roundBonusItem.style.display = 'none';
        }
    }

    showVictoryScreen(finalScore) {
        document.getElementById('final-score').textContent = finalScore;
    }

    showGameOverScreen(finalScore) {
        document.getElementById('game-over-score').textContent = finalScore;
    }

    showHighscores(highscores) {
        const highscoresList = document.getElementById('highscores-list');
        highscoresList.innerHTML = '';
        
        if (highscores.length === 0) {
            highscoresList.innerHTML = '<div class="no-scores">No scores yet</div>';
        } else {
            highscores.forEach((score, index) => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'highscore-item';
                scoreItem.innerHTML = `
                    <div class="highscore-rank">${index + 1}</div>
                    <div class="highscore-name">${score.name}</div>
                    <div class="highscore-score">${score.score}</div>
                `;
                highscoresList.appendChild(scoreItem);
            });
        }
    }

    animateScoreCounting(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        const startTime = performance.now();
        const difference = end - start;
        
        const step = (timestamp) => {
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeProgress = this._easeOutQuart(progress);
            const current = Math.floor(start + difference * easeProgress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = end;
                element.classList.add('highlight');
                setTimeout(() => {
                    element.classList.remove('highlight');
                }, 500);
            }
        };
        
        requestAnimationFrame(step);
    }

    _easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    _formatHandType(handType) {
        return handType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

// Export for use in other modules
window.UIUpdater = UIUpdater;
