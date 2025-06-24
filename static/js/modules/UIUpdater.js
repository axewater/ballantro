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
            shopMoneyDisplay: document.getElementById('shop-money-display'),
            maxDraws: document.getElementById('max-draws'),
            deckRemaining: document.getElementById('deck-remaining'),
            selectionCount: document.getElementById('selection-count'),
            drawCardsBtn: document.getElementById('draw-cards-btn'),
            playHandBtn: document.getElementById('play-hand-btn'),
            playerHand: document.getElementById('player-hand'),
            sortRankBtn: document.getElementById('sort-rank-btn'),
            sortSuitBtn: document.getElementById('sort-suit-btn')
        };
    }

    updateGameDisplay(gameState, selectedCount) {
        if (!gameState) return;
        
        // Update game info
        this.elements.currentRound.textContent = gameState.current_round;
        this.elements.totalScore.textContent = gameState.total_score;
        this.elements.playerMoney.textContent = `$${gameState.money}`;
        this.elements.roundTarget.textContent = gameState.round_target;
        if (this.elements.shopMoneyDisplay) this.elements.shopMoneyDisplay.textContent = `$${gameState.money}`;
        this.elements.handsPlayed.textContent = gameState.hands_played;
        this.elements.maxHands.textContent = gameState.max_hands;
        this.elements.drawsUsed.textContent = gameState.draws_used;
        this.elements.maxDraws.textContent = gameState.max_draws;
        this.elements.deckRemaining.textContent = gameState.deck_remaining;
        
        // Update button states
        this.updateButtonStates(gameState, selectedCount);
        
        // Update selection count
        this.elements.selectionCount.textContent = selectedCount;
        // inventory
        this.updateInventory(gameState.inventory || []);
    }

    updateButtonStates(gameState, selectedCount) {
        this.elements.drawCardsBtn.disabled = 
            selectedCount === 0 || 
            gameState.draws_used >= gameState.max_draws;
            
        this.elements.playHandBtn.disabled = selectedCount !== 5;
    }

    displayHand(hand, selectedCards, cardManager, onCardClick) {
        this.elements.playerHand.innerHTML = '';
        // Using the global logClientHand or a specific one for UIUpdater if preferred
        logClientHand("UI_UPDATER: Displaying hand. Received hand:", hand);
        
        hand.forEach((card, index) => {
            const cardElement = cardManager.createCardElement(card, selectedCards.has(index));
            cardElement.dataset.index = index;
            /*  Use the live dataset.index each time the card is clicked.
                After a sort _applySortAnimation updates dataset.index, so this
                handler will automatically pass the new, correct visual index. */
            cardElement.addEventListener('click', () => {
                const currentIndex = parseInt(cardElement.dataset.index, 10);
                onCardClick(currentIndex, cardElement);
            });
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

        // Display card-specific bonuses
        const bonusDetailsContainer = document.getElementById('bonus-details-container');
        bonusDetailsContainer.innerHTML = ''; // Clear previous bonuses

        if (handResult.applied_bonuses && handResult.applied_bonuses.length > 0) {
            handResult.applied_bonuses.forEach(bonusText => {
                const bonusItem = document.createElement('div');
                bonusItem.className = 'score-item card-bonus-item'; // Add a specific class for styling if needed

                const bonusLabel = document.createElement('span');
                bonusLabel.className = 'score-label';
                bonusLabel.textContent = 'Card Bonus:';

                const bonusValue = document.createElement('span');
                bonusValue.className = 'score-value';
                bonusValue.textContent = bonusText;

                bonusItem.appendChild(bonusLabel);
                bonusItem.appendChild(bonusValue);
                bonusDetailsContainer.appendChild(bonusItem);
            });
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

    updateSortButtonAppearance(activeSortType) {
        if (activeSortType === 'rank') {
            this.elements.sortRankBtn.classList.add('active-sort');
            this.elements.sortSuitBtn.classList.remove('active-sort');
        } else if (activeSortType === 'suit') {
            this.elements.sortRankBtn.classList.remove('active-sort');
            this.elements.sortSuitBtn.classList.add('active-sort');
        } else {
            this.elements.sortRankBtn.classList.remove('active-sort');
            this.elements.sortSuitBtn.classList.remove('active-sort');
        }
    }

    updateInventory(inv){
        const cont=document.getElementById('inventory-slots');
        if(!cont) return;
        cont.innerHTML='';
        inv.forEach(chip=>{
            const d=document.createElement('div');
            d.className='turbo-chip'; // Will be styled as a square icon holder
            d.innerHTML = '⚡'; // Display lightning icon
            
            // Store tooltip text in a data attribute
            d.dataset.tooltipText = `<strong>${chip.name}</strong><br>${chip.description}`;

            // Add event listeners for tooltip
            d.addEventListener('mouseover', (event) => window.tooltipManager.showTooltip(d.dataset.tooltipText, event));
            d.addEventListener('mouseout', () => window.tooltipManager.hideTooltip());
            d.addEventListener('mousemove', (event) => window.tooltipManager.updatePosition(event));

            cont.appendChild(d);
        });
        // Fill remaining slots with empty placeholders for consistent grid
        for(let i=inv.length;i<8;i++){
            const empty=document.createElement('div');
            empty.className='turbo-chip';
            empty.style.opacity='0.15'; // Make empty slots less prominent
            cont.appendChild(empty);
        }
    }
}

// Export for use in other modules
window.UIUpdater = UIUpdater;
