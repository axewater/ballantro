class ScoringAnimationManager{
    constructor(previewManager, uiUpdater){
        this.previewManager = previewManager;
        this.uiUpdater     = uiUpdater;
        this.soundManager  = null; // Will be set by game.js

        /* Hand-preview panel elements (still used) */
        this.liveChipTotalEl = document.getElementById('live-chip-total');
        this.liveMultTotalEl = document.getElementById('live-mult-total');

        this.animationDelayPerCard = 800;
        this._runningChips = 0;
        this._runningMult = 0;

        this.triggeredSet = new Set(); // indices of cards that actually score
    }

    /* Set the sound manager reference */
    setSoundManager(soundManager) {
        this.soundManager = soundManager;
    }

    /*  entry-point called by game.js  */
    async startScoringAnimation(playedCardsData, playedCardElements, handResult, onComplete){
        // Store which card indices actually contribute to scoring
        const totalCards = playedCardsData.length;
        this.triggeredSet.clear();
        for(let i=0; i<playedCardsData.length; i++){
            if(playedCardsData[i].score > 0){
                this.triggeredSet.add(i);
            }
        }

        this._runningChips = 0;
        this._runningMult = 0;

        let cardScoringIndex = 0; // Track progression for buzzing sound
        for(let i=0; i<playedCardsData.length; i++){
            const card = playedCardsData[i];
            const cardEl = playedCardElements[i];
            const isTriggered = this.triggeredSet.has(i);

            if(isTriggered){
                /* ▶ CHIP VALUE FLOAT */
                const base = this._getBaseChipValueForCard(card);
                
                // Play buzzing sound for each scoring card
                if (this.soundManager) {
                    this.soundManager.playCardScoringBuzz(cardScoringIndex, this.triggeredSet.size);
                }
                await this._spawnFloatingNum(cardEl,`+${base}`, 'blue', this.liveChipTotalEl);
                this._runningChips += base;
                this.liveChipTotalEl.textContent = this._runningChips;

                /* ▶ SPECIAL EFFECTS */
                const bonusChips = this._getCardBonusChips(card);
                if(bonusChips){
                    // Play buzzing sound for bonus chips too
                    if (this.soundManager) {
                        this.soundManager.playCardScoringBuzz(cardScoringIndex, this.triggeredSet.size);
                    }
                    if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusChips}`, 'blue', this.liveChipTotalEl);
                    this._runningChips += bonusChips;
                    this.liveChipTotalEl.textContent = this._runningChips;
                }

                const bonusMult = this._getCardBonusMultiplier(card);
                if(bonusMult){
                    if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusMult}`, 'red',  this.liveMultTotalEl);
                    
                    // Play multiplier sound for card bonuses
                    if (this.soundManager) {
                        this.soundManager.playMultiplierSound();
                    }
                    this._runningMult += bonusMult;
                    this.liveMultTotalEl.textContent = this._runningMult;
                }
                cardScoringIndex++; // Increment for next scoring card
            }
            await this._delay(this.animationDelayPerCard - 300);
        }

        /* TURBO CHIP FLASHES */
        const invEls=document.querySelectorAll('.turbo-chip');
        for(const chipEl of invEls){
            chipEl.classList.add('flash');
            
            // Play turbo chip sound for each flashing chip
            if (this.soundManager) {
                this.soundManager.playTurboChipSound();
            }
            await this._delay(150);
            chipEl.classList.remove('flash');
        }

        /* Add a small pause so flash is visible. */
        await this._delay(400);
    }

    async _finaliseScore(){
        // Implementation of final score update animation or logic
    }

    _getBaseChipValueForCard(card){
        // Placeholder: return base chip value for a card
        return card.baseChipValue || 0;
    }

    _getCardBonusChips(card){
        // Placeholder: return bonus chips for a card
        return card.bonusChips || 0;
    }

    _getCardBonusMultiplier(card){
        // Placeholder: return bonus multiplier for a card
        return card.bonusMultiplier || 0;
    }

    async _spawnFloatingNum(cardEl, text, color, targetEl){
        // Placeholder: spawn floating number animation near cardEl and update targetEl
        // For example, create a floating div with text and animate it upwards
        return new Promise(resolve => {
            const floatEl = document.createElement('div');
            floatEl.textContent = text;
            floatEl.style.position = 'absolute';
            floatEl.style.color = color;
            floatEl.style.fontWeight = 'bold';
            floatEl.style.pointerEvents = 'none';
            floatEl.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
            floatEl.style.opacity = '1';

            const rect = cardEl.getBoundingClientRect();
            floatEl.style.left = `${rect.left + rect.width/2}px`;
            floatEl.style.top = `${rect.top}px`;

            document.body.appendChild(floatEl);

            requestAnimationFrame(() => {
                floatEl.style.transform = 'translateY(-50px)';
                floatEl.style.opacity = '0';
            });

            setTimeout(() => {
                document.body.removeChild(floatEl);
                resolve();
            }, 800);
        });
    }

    _delay(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
