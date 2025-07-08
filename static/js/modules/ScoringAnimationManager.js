class ScoringAnimationManager{
    constructor(previewManager, uiUpdater){
        this.previewManager = previewManager;
        this.uiUpdater     = uiUpdater;
        this.soundManager = null;

        /* Hand-preview panel elements (still used) */
        this.previewPanel          = document.getElementById('live-score-preview');
        this.previewTitle          = document.getElementById('preview-title');
        this.previewModeContent    = document.getElementById('preview-mode-content');
        this.scoringModeContent    = document.getElementById('scoring-mode-content');
        this.previewDescription    = document.getElementById('preview-description');

        /* NEW scoring-area elements */
        this.scoringArea           = document.getElementById('scoring-area');
        this.cardRow               = document.getElementById('scoring-card-row');
        this.liveChipTotalEl       = document.getElementById('live-chip-total');
        this.liveMultTotalEl       = document.getElementById('live-mult-total');
        this.liveFinalTotalEl      = document.getElementById('live-final-total');

        /* misc */
        this.animationDelayPerCard = 200; // ms
        this.isAnimating = false;
        this.triggeredSet = new Set(); // indices of cards that actually score
    }

    setSoundManager(soundManager) {
        this.soundManager = soundManager;
    }

    /*  entry-point called by game.js  */
    async startScoringAnimation(playedCardsData, playedCardElements, handResult, onComplete){
        // Store which card indices actually contribute to scoring
        this.handResult = handResult;
        this.triggeredSet = new Set(handResult.triggered_indices || []);
        if(this.isAnimating) return;
        this.isAnimating = true;

        // 0. Animate cards from hand to scoring area
        //    This method will append the playedCardElements into this.cardRow
        await this._animateCardsToScoringArea(playedCardElements, playedCardsData);

        /* 1. switch preview-panel to “scoring mode” (unchanged) */
        this._enterPreviewScoringMode(handResult.description);
        
        /* 2. prepare new scoring area (now uses existing cards in cardRow) */
        this._setupScoringArea(playedCardsData, handResult); // Pass card data for logic, not for creating elements

        /* 3. process each card left→right */
        await this._processCardsSequentially(playedCardsData);

        /* 4. inventory effects */
        await this._applyInventoryEffects();

        /* 5. final multiplication & count-up */
        await this._finaliseScore();

        /* 6. restore UI after small delay, then callback */
        setTimeout(()=>{
            this._exitPreviewScoringMode();
            this._resetScoringArea();
            this.isAnimating=false;
            onComplete && onComplete();
        },1200);
    }

    /* ──────────  internal helpers  ────────── */

    _enterPreviewScoringMode(desc){
        this.previewTitle.textContent='Scoring Hand...';
        this.previewModeContent.style.display='none';
        this.scoringModeContent.style.display='block';
        this.previewPanel.classList.add('scoring-mode');
        this.previewDescription.textContent = desc;
    }
    _exitPreviewScoringMode(){
        this.previewTitle.textContent='Hand Preview';
        this.previewModeContent.style.display='block';
        this.scoringModeContent.style.display='none';
        this.previewPanel.classList.remove('scoring-mode');
    }

    async _animateCardsToScoringArea(cardElements, cardDataArray) {
        const scoringCardRow = this.cardRow;
        scoringCardRow.innerHTML = ''; // Clear it first

        // Create temporary placeholders in the scoring row to get target positions
        const placeholders = cardDataArray.map(cardData => {
            const ph = document.createElement('div');
            ph.className = 'card'; // Use card class for sizing
            ph.style.visibility = 'hidden';
            scoringCardRow.appendChild(ph);
            return ph;
        });

        const targetPositions = placeholders.map(ph => {
            const rect = ph.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });

        // Remove placeholders
        placeholders.forEach(ph => ph.remove());

        const animationPromises = cardElements.map((cardEl, index) => {
            return new Promise(resolve => {
                const originalRect = cardEl.getBoundingClientRect();
                const targetRect = targetPositions[index];

                // Temporarily move to body and fix position for smooth animation
                document.body.appendChild(cardEl);
                cardEl.style.position = 'fixed';
                cardEl.style.left = `${originalRect.left}px`;
                cardEl.style.top = `${originalRect.top}px`;
                cardEl.style.width = `${originalRect.width}px`;
                cardEl.style.height = `${originalRect.height}px`;
                cardEl.style.zIndex = '2000'; // Ensure it's on top
                cardEl.style.transition = 'left 0.5s ease-out, top 0.5s ease-out, transform 0.5s ease-out';

                // Trigger animation
                requestAnimationFrame(() => {
                    cardEl.style.left = `${targetRect.left}px`;
                    cardEl.style.top = `${targetRect.top}px`;
                    cardEl.style.transform = 'scale(1.0)'; // Can add a slight scale/rotate effect here
                });

                cardEl.addEventListener('transitionend', function onEnd() {
                    cardEl.removeEventListener('transitionend', onEnd);
                    // Reset styles and append to the actual scoring row
                    cardEl.style.position = '';
                    cardEl.style.left = '';
                    cardEl.style.top = '';
                    cardEl.style.width = '';
                    cardEl.style.height = '';
                    cardEl.style.zIndex = '';
                    cardEl.style.transform = '';
                    cardEl.style.transition = ''; // Clear transition
                    cardEl.style.cursor = 'default'; // No longer clickable
                    scoringCardRow.appendChild(cardEl); // Add to the final destination
                    resolve();
                }, { once: true });
            });
        });

        await Promise.all(animationPromises);
    }

    _setupScoringArea(playedCardsData, handResult){
        /* reset values & card row */
        this.liveChipTotalEl.textContent = handResult.base_chips;
        /* multiplier starts with BASE multiplier (handResult.multiplier minus any card-boosts).  
           For simplicity we’ll just start at (handResult.multiplier - sumCardBonusMult),
           but if that’s tricky we simply use handResult.multiplier and add bonuses (dup harmless). */
        this._baseMultiplier = handResult.multiplier;
        this.liveMultTotalEl.textContent = this._baseMultiplier;
        this.liveFinalTotalEl.textContent='0';

        // Card elements are now assumed to be in this.cardRow, moved by _animateCardsToScoringArea
        // We just need to ensure they have the 'default' cursor if not already set.
        Array.from(this.cardRow.children).forEach(el => el.style.cursor = 'default');

        /* internal running totals */
        this._runningChips = handResult.base_chips;
        this._runningMult  = this._baseMultiplier;
        this._finalTarget  = handResult.total_score; // already turbo chips etc. – used for final count-up
    }

    async _processCardsSequentially(cards){
        const cm = window.pokerGame.cardManager;
        const gameState = window.pokerGame?.gameState?.gameState;
        const totalCardChips = this.handResult.card_chips;
        const startScore = gameState?.total_score || 0;
        const endScore = startScore + this.handResult.total_score;
        const roundTarget = gameState?.round_target || 1;
        const calculatePitchProgress = (chipValue) => {
            const currentCardChips = (this._runningChips + chipValue) - this.handResult.base_chips;
            const chipProgress = totalCardChips > 0 ? Math.min(currentCardChips / totalCardChips, 1) : 0;
            const currentScore = startScore + ((endScore - startScore) * chipProgress);
            return this.soundManager.calculateScoreProgress(currentScore, roundTarget);
        };
        for(let i=0;i<cards.length;i++){
            const card = cards[i];
            const cardEl = this.cardRow.children[i];
            const isTriggered = this.triggeredSet.has(i);

            /* shake */
            // Ensure cardEl exists before trying to manipulate it
            if (!cardEl) {
                console.warn(`ScoringAnimationManager: Card element at index ${i} not found. Skipping animation for this card.`);
                continue; // Skip to the next card if element is missing
            }
            cardEl.classList.add('card-shaking');
            /* slight zoom-out after shake finishes */
            await this._delay(150);
            cardEl.classList.remove('card-shaking');
            cardEl.style.transition='transform .15s';
            cardEl.style.transform='scale(0.97)';
            await this._delay(80);
            cardEl.style.transform='scale(1)';

            if(isTriggered){
                /* ▶ CHIP VALUE FLOAT */
                const base = this._getBaseChipValueForCard(card);
                if (this.soundManager && base > 0) {
                    this.soundManager.playChipSound(calculatePitchProgress(base));
                }
                await this._spawnFloatingNum(cardEl,`+${base}`, 'blue', this.liveChipTotalEl);
                this._runningChips += base;
                this.liveChipTotalEl.textContent = this._runningChips;

                /* ▶ SPECIAL EFFECTS */
                const bonusChips = this._getCardBonusChips(card);
                if(bonusChips){
                    if (this.soundManager) {
                        this.soundManager.playChipSound(calculatePitchProgress(bonusChips));
                    }
                    if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusChips}`, 'blue', this.liveChipTotalEl);
                    this._runningChips += bonusChips;
                    this.liveChipTotalEl.textContent = this._runningChips;
                }
                const bonusMult = this._getCardBonusMultiplier(card);
                if(bonusMult){
                    if (this.soundManager) {
                        this.soundManager.playMultiplierSound();
                    }
                    if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusMult}`, 'red',  this.liveMultTotalEl);
                    this._runningMult += bonusMult;
                    this.liveMultTotalEl.textContent = this._runningMult;
                }
            }
            await this._delay(this.animationDelayPerCard - 300);
        }
    }

    async _applyInventoryEffects(){
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
        /* inventory effects are already included by backend in total_score;
           we just add a small pause so flash is visible. */
        await this._delay(400);
    }

    async _finaliseScore(){
        /* pretty count-up animation to final total */
        const start     = this._runningChips * this._runningMult;
        const targetVal = this._finalTarget;
        const el        = this.liveFinalTotalEl;
        const duration  = 1000;
        const t0=performance.now();
        const step = (t)=>{
            const p=Math.min((t-t0)/duration,1);
            const v=Math.floor(start + (targetVal-start)*p);
            el.textContent=v;
            if(p<1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        await this._delay(duration+50);

        /* ✨ pop effect on final total */
        this.liveFinalTotalEl.classList.add('final-total-pop');
        setTimeout(()=>this.liveFinalTotalEl.classList.remove('final-total-pop'), 800);
    }

    _resetScoringArea(){
        this.cardRow.innerHTML='';
        this.liveChipTotalEl.textContent='0';
        this.liveMultTotalEl.textContent='1';
        this.liveFinalTotalEl.textContent='0';
        this.triggeredSet.clear();
    }

    _getBaseChipValueForCard(card) {
        if (!card || !card.rank) {
            console.warn("ScoringAnimationManager: Invalid card object passed to _getBaseChipValueForCard", card);
            return 0;
        }
        const rank = card.rank.toUpperCase(); // Ensure rank is uppercase for comparison
        if (rank === 'A') {
            return 11;
        } else if (['K', 'Q', 'J'].includes(rank)) {
            return 10;
        } else if (!isNaN(parseInt(rank))) {
            return parseInt(rank);
        }
        console.warn(`ScoringAnimationManager: Unknown rank "${card.rank}" in _getBaseChipValueForCard`);
        return 0; // Default for unknown ranks
    }

    /* ----------  NEW HELPERS : client-side bonus resolution  ---------- */
    _getCardBonusChips(card){
        if(!card || !Array.isArray(card.effects)) return 0;
        return card.effects
            .filter(eff=>eff.startsWith('bonus_chips_'))
            .reduce((sum,eff)=>{
                const val=parseInt(eff.split('_').pop(),10);
                return sum + (isNaN(val)?0:val);
            },0);
    }

    _getCardBonusMultiplier(card){
        if(!card || !Array.isArray(card.effects)) return 0;
        return card.effects
            .filter(eff=>eff.startsWith('bonus_multiplier_'))
            .reduce((sum,eff)=>{
                const val=parseInt(eff.split('_').pop(),10);
                return sum + (isNaN(val)?0:val);
            },0);
    }

    /* ──────────  tiny util helpers  ────────── */
    _delay(ms){return new Promise(r=>setTimeout(r,ms));}

    _spawnFloatingNum(originEl,text,colour,targetEl){
        return new Promise(resolve=>{
            const rect = originEl.getBoundingClientRect();
            const tgt  = targetEl.getBoundingClientRect();

            const span = document.createElement('span');
            span.className=`floating-num ${colour==='red'?'red':'blue'}`;
            span.textContent=text;
            document.body.appendChild(span);

            /* start @ card centre */
            span.style.left = `${rect.left + rect.width/2}px`;
            span.style.top  = `${rect.top  + rect.height/2}px`;

            /* force reflow then animate to target */
            requestAnimationFrame(()=>{
                span.style.transition = 'transform .8s ease-out, opacity .8s ease-out';
                span.style.transform  = `translate(${tgt.left - rect.left}px, ${tgt.top - rect.top}px)`;
                span.style.opacity='0';
            });

            setTimeout(()=>{
                span.remove();
                resolve();
            },800);
        });
    }
}

/* global export */
window.ScoringAnimationManager = ScoringAnimationManager;
