class ScoringAnimationManager {
    constructor(previewManager, uiUpdater) {
        this.previewManager = previewManager;
        this.uiUpdater = uiUpdater;
        this.isAnimating = false;
        this.animationSpeed = 1000; // ms per card
        
        // DOM elements
        this.previewPanel = document.getElementById('live-score-preview');
        this.previewTitle = document.getElementById('preview-title');
        this.previewModeContent = document.getElementById('preview-mode-content');
        this.scoringModeContent = document.getElementById('scoring-mode-content');
        
        // Live scoring elements
        this.liveCardChips = document.getElementById('live-card-chips');
        this.liveBaseChips = document.getElementById('live-base-chips');
        this.liveMultiplier = document.getElementById('live-multiplier');
        this.liveTotalScore = document.getElementById('live-total-score');
        this.liveBonusEffects = document.getElementById('live-bonus-effects');
        this.previewDescription = document.getElementById('preview-description');
    }

    async startScoringAnimation(playedCards, handResult, onComplete) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        console.log('Starting scoring animation for cards:', playedCards.map(c => `${c.rank}${c.suit}`));
        
        // Switch to scoring mode
        this.switchToScoringMode();
        
        // Initialize scoring display
        this.initializeScoringDisplay(handResult);
        
        // Animate each card being scored
        await this.animateCardScoring(playedCards, handResult);
        
        // Auto-transition after a delay (e.g., 5 seconds, was previously for overlay)
        // The overlay itself is removed, but we keep a pause before proceeding.
        setTimeout(() => {
            // this.hideFinalScoreOverlay(); // Overlay is removed
            this.switchToPreviewMode();
            this.isAnimating = false;
            if (onComplete) onComplete();
        }, 5000);
    }

    switchToScoringMode() {
        this.previewTitle.textContent = 'Scoring Hand...';
        this.previewModeContent.style.display = 'none';
        this.scoringModeContent.style.display = 'block';
        this.previewPanel.classList.add('scoring-mode');
    }

    switchToPreviewMode() {
        this.previewTitle.textContent = 'Hand Preview';
        this.previewModeContent.style.display = 'block';
        this.scoringModeContent.style.display = 'none';
        this.previewPanel.classList.remove('scoring-mode');
    }

    initializeScoringDisplay(handResult) {
        // Reset all values to 0
        this.liveCardChips.textContent = '0';
        this.liveBaseChips.textContent = '0';
        this.liveMultiplier.textContent = '×1';
        this.liveTotalScore.textContent = '0';
        this.liveBonusEffects.innerHTML = '';
        this.previewDescription.textContent = handResult.description;
    }

    async animateCardScoring(playedCards, handResult) {
        const cardElements = document.querySelectorAll('#player-hand .card');
        let runningCardChips = 0;
        let runningBonusChips = 0;
        let runningBonusMultiplier = 0;
        const appliedEffects = [];

        // Find which cards in the hand correspond to played cards
        const playedCardElements = [];
        playedCards.forEach(playedCard => {
            const matchingElement = Array.from(cardElements).find(el => {
                const cardIndex = parseInt(el.dataset.index);
                const handCard = window.pokerGame.cardManager.getCardByVisualIndex(
                    window.pokerGame.gameState.gameState, 
                    cardIndex
                );
                return handCard && 
                       handCard.rank === playedCard.rank && 
                       handCard.suit === playedCard.suit;
            });
            if (matchingElement) {
                playedCardElements.push({ element: matchingElement, card: playedCard });
            }
        });

        // Animate each played card
        for (let i = 0; i < playedCardElements.length; i++) {
            const { element, card } = playedCardElements[i];
            
            // Highlight the card
            this.highlightCard(element);
            
            // Add card's base chip value
            let baseChipValue;
            if (typeof card._base_chip_value === 'function') {
                baseChipValue = card._base_chip_value();
            } else {
                baseChipValue = this.getBaseChipValue(card.rank);
            }
            runningCardChips += baseChipValue;
            
            // Add any bonus chips from effects
            const bonusChips = card.bonus_chips ? card.bonus_chips() : 0;
            const bonusMultiplier = card.bonus_multiplier ? card.bonus_multiplier() : 0;
            
            if (bonusChips > 0) {
                runningBonusChips += bonusChips;
                appliedEffects.push(`${card.rank} of ${card.suit}: +${bonusChips} chips`);
            }
            
            if (bonusMultiplier > 0) {
                runningBonusMultiplier += bonusMultiplier;
                appliedEffects.push(`${card.rank} of ${card.suit}: +${bonusMultiplier} multiplier`);
            }
            
            // Update display with animation
            await this.animateValueUpdate(this.liveCardChips, runningCardChips + runningBonusChips);
            
            // Update bonus effects display
            if (appliedEffects.length > 0) {
                this.liveBonusEffects.innerHTML = appliedEffects.map(effect => 
                    `<div class="bonus-effect">${effect}</div>`
                ).join('');
            }
            
            // Wait before next card
            await this.delay(this.animationSpeed);
            
            // Remove highlight
            this.unhighlightCard(element);
        }

        // Final scoring calculation
        const totalMultiplier = handResult.multiplier;
        await this.animateValueUpdate(this.liveBaseChips, handResult.base_chips);
        await this.delay(300);
        
        this.liveMultiplier.textContent = `×${totalMultiplier}`;
        await this.delay(300);
        
        await this.animateValueUpdate(this.liveTotalScore, handResult.total_score);
    }

    highlightCard(cardElement) {
        cardElement.classList.add('card-scoring');
        cardElement.style.zIndex = '100';
    }

    unhighlightCard(cardElement) {
        cardElement.classList.remove('card-scoring');
        cardElement.style.zIndex = '';
    }

    async animateValueUpdate(element, targetValue) {
        const startValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
        const duration = 500;
        const startTime = performance.now();
        
        return new Promise(resolve => {
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = this.easeOutQuart(progress);
                const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
                
                element.textContent = currentValue;
                element.classList.add('score-counting');
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = targetValue;
                    element.classList.remove('score-counting');
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    getBaseChipValue(rank) {
        if (rank === 'A') return 11;
        if (['K', 'Q', 'J'].includes(rank)) return 10;
        return parseInt(rank);
    }

    formatHandType(handType) {
        return handType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
window.ScoringAnimationManager = ScoringAnimationManager;
