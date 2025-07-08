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
            currentLeg: document.getElementById('current-leg'),
            bossInfo: document.getElementById('boss-info'),
            shopMoneyDisplay: document.getElementById('shop-money-display'),
            maxDraws: document.getElementById('max-draws'),

            selectionCount: document.getElementById('selection-count'),
            drawCardsBtn: document.getElementById('draw-cards-btn'),
            playHandBtn: document.getElementById('play-hand-btn'),
            playerHand: document.getElementById('player-hand'),
            sortRankBtn: document.getElementById('sort-rank-btn'),
            sortSuitBtn: document.getElementById('sort-suit-btn'),
            debugModeIndicator: null // Will be created if needed
        };
    }

    updateGameDisplay(gameState, selectedCount) {
        if (!gameState) return;
        
        // Update game info
        this.elements.currentRound.textContent = gameState.current_round;
        this.elements.totalScore.textContent = gameState.total_score;
        this.elements.playerMoney.textContent = `$${gameState.money}`;
        this.elements.roundTarget.textContent = gameState.round_target;
        this.elements.currentLeg.textContent = gameState.current_leg;
        if (this.elements.shopMoneyDisplay) this.elements.shopMoneyDisplay.textContent = `$${gameState.money}`;
        this.elements.handsPlayed.textContent = gameState.hands_played;
        this.elements.maxHands.textContent = gameState.max_hands;
        this.elements.drawsUsed.textContent = gameState.draws_used;
        this.elements.maxDraws.textContent = gameState.max_draws;

        
        // Update button states
        this.updateButtonStates(gameState, selectedCount);
        
        // Update selection count
        this.updateBossInfo(gameState);
        
        this.elements.selectionCount.textContent = selectedCount;
        // inventory
        this.updateInventory(gameState.inventory || []);
    }

    updateButtonStates(gameState, selectedCount) {
        this.elements.drawCardsBtn.disabled = 
            selectedCount === 0 || 
            gameState.draws_used >= gameState.max_draws;
            
        this.elements.playHandBtn.disabled = selectedCount < 1 || selectedCount > 5;
    }

    updateBossInfo(gameState) {
        if (!this.elements.bossInfo) return;
        
        if (gameState.is_boss_round && gameState.active_boss) {
            const boss = gameState.active_boss;
            this.elements.bossInfo.innerHTML = `
                <div class="boss-alert">
                    <h3>BOSS ROUND: ${boss.name}</h3>
                    <p>${boss.description}</p>
                </div>
            `;
            this.elements.bossInfo.style.display = 'block';
        } else {
            this.elements.bossInfo.innerHTML = '';
            this.elements.bossInfo.style.display = 'none';
        }
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

    showVictoryScreen(finalScore, isDebugging = false) {
        document.getElementById('final-score').textContent = finalScore;
        const saveScoreBtn = document.getElementById('save-score-btn');
        if (isDebugging) {
            saveScoreBtn.style.display = 'none';
        } else {
            saveScoreBtn.style.display = 'inline-flex';
        }
    }

    showGameOverScreen(finalScore, isDebugging = false) {
        document.getElementById('game-over-score').textContent = finalScore;
        const saveGameOverScoreBtn = document.getElementById('save-game-over-score-btn');
        const playerNameInputSection = document.querySelector('#game-over-screen .name-input-section');

        if (isDebugging) {
            saveGameOverScoreBtn.style.display = 'none';
            if (playerNameInputSection) playerNameInputSection.style.display = 'none';
        } else {
            saveGameOverScoreBtn.style.display = 'inline-flex';
            if (playerNameInputSection) playerNameInputSection.style.display = 'block';
        }
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
            const iconChar =
                (window.TurboChipIcons && window.TurboChipIcons[chip.effect_id]) ||
                '⚡';
            d.innerHTML = iconChar; // Unique icon per chip
            
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

    updateDebugModeIndicator(isDebugging) {
        if (!this.elements.debugModeIndicator) {
            const indicator = document.createElement('div');
            indicator.id = 'debug-mode-indicator';
            indicator.style.position = 'fixed';
            indicator.style.top = '10px';
            indicator.style.left = '50%';
            indicator.style.transform = 'translateX(-50%)';
            indicator.style.padding = '5px 10px';
            indicator.style.background = 'rgba(255, 165, 0, 0.8)';
            indicator.style.color = 'white';
            indicator.style.borderRadius = '5px';
            indicator.style.zIndex = '2000';
            indicator.style.fontWeight = 'bold';
            document.body.appendChild(indicator);
            this.elements.debugModeIndicator = indicator;
        }
        this.elements.debugModeIndicator.textContent = isDebugging ? 'DEBUG MODE ACTIVE' : '';
        this.elements.debugModeIndicator.style.display = isDebugging ? 'block' : 'none';
    }
}

// Export for use in other modules
window.UIUpdater = UIUpdater;
