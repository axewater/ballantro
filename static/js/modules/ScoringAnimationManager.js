class ScoringAnimationManager{
    constructor(previewManager, uiUpdater){
        this.previewManager = previewManager;
        this.uiUpdater     = uiUpdater;

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
        this.animationDelayPerCard = 700; // ms
        this.isAnimating = false;
    }

    /*  entry-point called by game.js  */
    async startScoringAnimation(playedCards, handResult, onComplete){
        if(this.isAnimating) return;
        this.isAnimating = true;

        /* 1. switch preview-panel to “scoring mode” (unchanged) */
        this._enterPreviewScoringMode(handResult.description);

        /* 2. prepare new scoring area  */
        this._setupScoringArea(playedCards, handResult);

        /* 3. process each card left→right */
        await this._processCardsSequentially(playedCards);

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

    _setupScoringArea(cards, handResult){
        /* reset values & card row */
        this.liveChipTotalEl.textContent = handResult.base_chips;
        /* multiplier starts with BASE multiplier (handResult.multiplier minus any card-boosts).  
           For simplicity we’ll just start at (handResult.multiplier - sumCardBonusMult),
           but if that’s tricky we simply use handResult.multiplier and add bonuses (dup harmless). */
        this._baseMultiplier = handResult.multiplier;
        this.liveMultTotalEl.textContent = this._baseMultiplier;
        this.liveFinalTotalEl.textContent='0';

        this.cardRow.innerHTML='';
        const cm = window.pokerGame.cardManager;
        cards.forEach(card=>{
            const el = cm.createCardElement(card,false);
            el.style.cursor='default';
            this.cardRow.appendChild(el);
        });
        /* internal running totals */
        this._runningChips = handResult.base_chips;
        this._runningMult  = this._baseMultiplier;
        this._finalTarget  = handResult.total_score; // already turbo chips etc. – used for final count-up
    }

    async _processCardsSequentially(cards){
        const cm = window.pokerGame.cardManager;
        for(let i=0;i<cards.length;i++){
            const card = cards[i];
            const cardEl = this.cardRow.children[i];

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

            /* ▶ CHIP VALUE FLOAT */
            const base = this._getBaseChipValueForCard(card);
            await this._spawnFloatingNum(cardEl,`+${base}`, 'blue', this.liveChipTotalEl);
            this._runningChips += base;
            this.liveChipTotalEl.textContent = this._runningChips;

            /* ▶ SPECIAL EFFECTS */
            const bonusChips = this._getCardBonusChips(card);
            if(bonusChips){
                // Ensure cardEl is valid before spawning number
                if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusChips}`, 'blue', this.liveChipTotalEl);
                this._runningChips += bonusChips;
                this.liveChipTotalEl.textContent = this._runningChips;
            }
            const bonusMult = this._getCardBonusMultiplier(card);
            if(bonusMult){
                // Ensure cardEl is valid before spawning number
                if (cardEl) await this._spawnFloatingNum(cardEl,`+${bonusMult}`, 'red',  this.liveMultTotalEl);
                this._runningMult += bonusMult;
                this.liveMultTotalEl.textContent = this._runningMult;
            }
            await this._delay(this.animationDelayPerCard - 300);
        }
    }

    async _applyInventoryEffects(){
        const invEls=document.querySelectorAll('.turbo-chip');
        for(const chipEl of invEls){
            chipEl.classList.add('flash');
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
