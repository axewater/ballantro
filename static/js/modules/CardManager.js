function logManagerHand(label, handArray) { // Renamed to avoid conflict if CardManager is used elsewhere
    const handStr = handArray && Array.isArray(handArray) ? handArray.map(card => `${card.rank}${card.suit.charAt(0).toUpperCase()}`).join(', ') : 'N/A';
    console.log(`CARD_MANAGER: ${label} [${handStr}] (Count: ${handArray ? handArray.length : 0})`);
}

class CardManager {
    constructor() {
        this.selectedCards = new Set();
        this.isSorting = false;
        this.activeSortType = null; // 'rank', 'suit', or null
        /*  visualToLogical maps the current VISUAL index (what the user sees / clicks)
            to the original index that the backend still expects.
            It is re-created whenever a brand-new hand is received from the backend and
            is recomposed on every visual sort so that we can always translate the
            user’s selection back to backend indices accurately. */
        this.visualToLogical = [];
        
        // Define order for sorting cards
        this.RANK_ORDER_MAP = { 
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 
        };
        this.SUIT_ORDER_MAP = { 
            'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 
        };
        
        // Right-click drag selection
        this.rightClickDragActive = false;
        this.cardsInDragSelection = new Set();
    }

    /* --------------------------------------------------------------------- */
    /*  Mapping helpers                                                      */
    /* --------------------------------------------------------------------- */
    resetMapping(handLength) {
        // Identity mapping: visual i  → backend i
        this.visualToLogical = Array.from({ length: handLength }, (_, i) => i);
    }

    _recomposeMapping(newVisualOrder) {
        // Compose existing mapping with the newest permutation produced by sorting
        this.visualToLogical = newVisualOrder.map(oldVisualIdx => this.visualToLogical[oldVisualIdx]);
    }

    createCardElement(card, isSelected = false) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suit.toLowerCase()}${isSelected ? ' selected' : ''}`;
        const hasEffects = card.effects && card.effects.length > 0;
        
        const rankElement = document.createElement('div');
        rankElement.className = 'card-rank';
        rankElement.textContent = card.rank;
        
        const iconArea = document.createElement('div');
        iconArea.className = 'card-icon-area';

        if (hasEffects) {
            card.effects.forEach(effectId => {
                const effectInfo = window.EffectDescriptions && window.EffectDescriptions[effectId];
                if (effectInfo) {
                    let iconElement = null;
                    if (effectId.startsWith('bonus_chips')) {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-chips-icon';
                        iconElement.textContent = '✚'; // Heavy Greek Cross
                        iconElement.dataset.tooltipText = `<strong>${effectInfo.name}</strong><br>${effectInfo.description}`;
                    } else if (effectId.startsWith('bonus_multiplier')) {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-multiplier-icon';
                        iconElement.textContent = '★'; // Black Star
                        iconElement.dataset.tooltipText = `<strong>${effectInfo.name}</strong><br>${effectInfo.description}`;
                    } else if (effectId.startsWith('bonus_money')) {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-money-icon';
                        iconElement.textContent = '$';
                        iconElement.dataset.tooltipText = `<strong>${effectInfo.name}</strong><br>${effectInfo.description}`;
                    } else if (effectId === 'bonus_random') {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-random-icon';
                        iconElement.textContent = '?';
                        iconElement.dataset.tooltipText = `<strong>${effectInfo.name}</strong><br>${effectInfo.description}`;
                    }

                    if (iconElement) {
                        iconElement.addEventListener('mouseover', (event) => window.tooltipManager.showTooltip(iconElement.dataset.tooltipText, event));
                        iconElement.addEventListener('mouseout', () => window.tooltipManager.hideTooltip());
                        iconElement.addEventListener('mousemove', (event) => window.tooltipManager.updatePosition(event));
                        iconArea.appendChild(iconElement);
                    }
                }
            });
        }

        const suitElement = document.createElement('div');
        suitElement.className = 'card-suit';
        suitElement.textContent = this.getSuitSymbol(card.suit);
        
        cardElement.appendChild(rankElement);
        cardElement.appendChild(iconArea);
        cardElement.appendChild(suitElement);

        // Add hover sound event
        /* ── Hover sound ── */
        cardElement.addEventListener('mouseenter', () => {
            if (window.playCardHoverSound) window.playCardHoverSound();
        });
        return cardElement;
    }

    getSuitSymbol(suit) {
        switch (suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '';
        }
    }

    toggleCardSelection(index, cardElement, onSelectionChange) {
        if (this.isSorting) return;
        
        if (this.selectedCards.has(index)) {
            this.selectedCards.delete(index);
            cardElement.classList.remove('selected');
            window.gameAnimations.animateCardSelection(cardElement, false);
        } else {
            this.selectedCards.add(index);
            cardElement.classList.add('selected');
            window.gameAnimations.animateCardSelection(cardElement, true);
        }
        
        // Play click sound
        this._playCardClickSound();
        
        // Call the selection change callback to update button states
        onSelectionChange && onSelectionChange(this.selectedCards);
    }

    _playCardClickSound() {
        if (window.cardClickSound) {
            window.cardClickSound.currentTime = 0;
            window.cardClickSound.play().catch(() => {});
        }
    }

    clearSelection() {
        console.trace("CardManager: clearSelection() called from:");
        this.selectedCards.clear();
    }

    getSelectedCards() {
        // Translate visual indices → backend indices before returning
        return Array.from(this.selectedCards).map(vIdx => this.visualToLogical[vIdx]);
    }

    getSelectedCount() {
        return this.selectedCards.size;
    }

    async sortCardsByRank(gameState, onSortComplete, uiUpdater) {
        if (this.isSorting || !gameState.hand || gameState.hand.length < 2) return;
        
        this.isSorting = true;
        this.setSortButtonsDisabled(true);

        logManagerHand("Hand before sort by rank calculation:", gameState.hand ? [...gameState.hand] : 'N/A');
        if (this.activeSortType === 'rank') {
            this.activeSortType = null; // Toggle off
            // If toggling off, we don't re-sort, just update button appearance
            // The hand remains as is or as per last sort.
            // Or, we could revert to an "unsorted" state if desired, but that's more complex.
            // For now, toggling off just deactivates auto-sort.
        } else {
            this.activeSortType = 'rank';
            try {
                const sortResult = this._calculateSort(gameState.hand, 'rank');
                logManagerHand("Hand after sort by rank calculation (before animation/DOM update):", sortResult.newHand);
                await this._applySortAnimation(sortResult, gameState, onSortComplete);
            } finally {
                // isSorting will be set to false by _applySortAnimation or here
            }
        }
        
        uiUpdater.updateSortButtonAppearance(this.activeSortType);
        this.isSorting = false;
        this.setSortButtonsDisabled(false);
        if (onSortComplete && this.activeSortType === 'rank') { // only call if sort actually happened
            onSortComplete();
        }
    }

    async sortCardsBySuit(gameState, onSortComplete, uiUpdater) {
        if (this.isSorting || !gameState.hand || gameState.hand.length < 2) return;
        
        this.isSorting = true;
        this.setSortButtonsDisabled(true);

        logManagerHand("Hand before sort by suit calculation:", gameState.hand ? [...gameState.hand] : 'N/A');
        if (this.activeSortType === 'suit') {
            this.activeSortType = null; // Toggle off
        } else {
            this.activeSortType = 'suit';
            try {
                const sortResult = this._calculateSort(gameState.hand, 'suit');
                logManagerHand("Hand after sort by suit calculation (before animation/DOM update):", sortResult.newHand);
                await this._applySortAnimation(sortResult, gameState, onSortComplete);
            } finally {
                // isSorting will be set to false by _applySortAnimation or here
            }
        }
        
        uiUpdater.updateSortButtonAppearance(this.activeSortType);
        this.isSorting = false;
        this.setSortButtonsDisabled(false);
        if (onSortComplete && this.activeSortType === 'suit') { // only call if sort actually happened
            onSortComplete();
        }
    }

    _calculateSort(hand, sortType) {
        // Reconstruct the current visual order by applying the mapping
        // visualToLogical[i] gives the backend index for visual position i
        const currentVisualHand = this.visualToLogical.map(backendIdx => hand[backendIdx]);

        // Now sort based on the current visual positions (0, 1, 2, ...)
        const indexedHand = currentVisualHand.map((card, visualIndex) => ({
            card,
            currentVisualIndex: visualIndex
        }));

        if (sortType === 'rank') {
            indexedHand.sort((a, b) => {
                const rankDiff = this.RANK_ORDER_MAP[b.card.rank] - this.RANK_ORDER_MAP[a.card.rank];
                if (rankDiff !== 0) return rankDiff;
                return this.SUIT_ORDER_MAP[b.card.suit] - this.SUIT_ORDER_MAP[a.card.suit];
            });
        } else {
            indexedHand.sort((a, b) => {
                const suitDiff = this.SUIT_ORDER_MAP[b.card.suit] - this.SUIT_ORDER_MAP[a.card.suit];
                if (suitDiff !== 0) return suitDiff;
                return this.RANK_ORDER_MAP[b.card.rank] - this.RANK_ORDER_MAP[a.card.rank];
            });
        }

        // newVisualOrder[i] = which current visual position should move to position i
        const newVisualOrder = indexedHand.map(item => item.currentVisualIndex);
        const newHand = indexedHand.map(item => item.card); // purely for DOM building
        const newSelectedCards = new Set(); // visual indices after sort

        // Map selected cards from old visual positions to new visual positions
        indexedHand.forEach((item, newIndex) => {
            if (this.selectedCards.has(item.currentVisualIndex)) {
                newSelectedCards.add(newIndex);
            }
        });

        return { newVisualOrder, newHand, newSelectedCards };
    }

    async _applySortAnimation(sortResult, gameState, onSortComplete) {
        const cardContainer = document.getElementById('player-hand');
        if (!cardContainer) return; // Guard against missing element
        const currentCardElements = Array.from(cardContainer.children);
        logManagerHand("Applying sort animation. Current hand in DOM (pre-sort):", gameState.hand ? [...gameState.hand] : 'N/A');

        // Lift cards
        currentCardElements.forEach(cardElement => {
            cardElement.style.transition = 'transform 0.3s ease-out';
            cardElement.style.transform = 'translateY(-30px)';
            cardElement.style.zIndex = '100';
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        // Reorder DOM elements
        const reorderedElements = sortResult.newVisualOrder.map(originalIdx =>
            currentCardElements.find(c => parseInt(c.dataset.index) === originalIdx)
        ).filter(Boolean);

        cardContainer.replaceChildren(...reorderedElements);

        // Update mapping BEFORE touching selectedCards
        this._recomposeMapping(sortResult.newVisualOrder);

        // Update game state (order only affects UI representation)
        const oldHand = gameState.hand ? [...gameState.hand] : null;
        // NOTE: Do **not** mutate `gameState.hand` here. The backend still
        // relies on the original ordering, and changing it locally causes
        // index ↔︎ card mismatches later (e.g. wrong cards shown on the
        // scoring screen). We keep the UI-only order in the DOM and retain
        // the logical order in `gameState.hand`.
        logManagerHand("Hand state updated in CardManager after sort (UI-only reorder – logical order untouched).", oldHand);
        this.selectedCards = sortResult.newSelectedCards;
        logManagerHand("New hand:", gameState.hand);
        console.log("CARD_MANAGER: New selected cards (indices):", Array.from(this.selectedCards));

        // Update elements
        reorderedElements.forEach((cardElement, newIndex) => {
            cardElement.dataset.index = newIndex;
            
            if (this.selectedCards.has(newIndex)) {
                cardElement.classList.add('selected');
                cardElement.style.transform = 'translateY(-30px)';
            } else {
                cardElement.classList.remove('selected');
                cardElement.style.transform = 'translateY(-30px)';
            }
            
            cardElement.style.transition = 'transform 0.3s ease-in';
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        // Lower cards
        reorderedElements.forEach((cardElement, newIndex) => {
            if (this.selectedCards.has(newIndex)) {
                window.gameAnimations.animateCardSelection(cardElement, true);
            } else {
                cardElement.style.transform = 'translateY(0)';
            }
            cardElement.style.zIndex = this.selectedCards.has(newIndex) ? '10' : '1';
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        if (onSortComplete) {
            onSortComplete();
        }
        this.isSorting = false; // Ensure isSorting is reset
    }

    setSortButtonsDisabled(disabled) {
        document.getElementById('sort-rank-btn').disabled = disabled;
        document.getElementById('sort-suit-btn').disabled = disabled;
    }

    async applyActiveSort(gameState, onSortComplete, isFinalizeStep = false) {
        if (this.isSorting || !this.activeSortType || !gameState.hand || gameState.hand.length < 2) {
            if (isFinalizeStep) console.log("CARD_MANAGER: applyActiveSort (finalize) - No active sort or hand not sortable. Calling onSortComplete.");
            if (onSortComplete) onSortComplete(); // Ensure callback is called even if no sort happens
            return;
        }

        if (isFinalizeStep) logManagerHand(`Applying active sort ('${this.activeSortType}') during finalize step. Hand before:`, gameState.hand ? [...gameState.hand] : 'N/A');
        this.isSorting = true;
        this.setSortButtonsDisabled(true);
        try {
            const sortResult = this._calculateSort(gameState.hand, this.activeSortType);
            if (isFinalizeStep) logManagerHand(`Hand after active sort ('${this.activeSortType}') calculation (finalize step, before animation):`, sortResult.newHand);
            await this._applySortAnimation(sortResult, gameState, onSortComplete);
        } finally {
            this.isSorting = false;
            this.setSortButtonsDisabled(false);
        }
    }

    resetSortState() {
        this.activeSortType = null;
        // Mapping reset is handled explicitly when a fresh hand arrives
    }
    
    // Right-click drag selection methods
    startRightClickDrag(index) {
        if (this.isSorting) return;
        // If index is null, we're starting from empty space
        
        this.rightClickDragActive = true;
        this.cardsInDragSelection.clear();
        if (index !== null) {
            this.cardsInDragSelection.add(index);
        }
        
        // Store the initial selection state of cards
        this.initialSelectionState = new Map();
        if (index !== null) {
            this.initialSelectionState.set(index, this.selectedCards.has(index));
        }
    }
    
    updateRightClickDrag(index) {
        if (!this.rightClickDragActive || this.isSorting) return;
        
        if (index === null) {
            return; // Skip if not over a card
        }
        
        this.cardsInDragSelection.add(index);
        
        const cardContainer = document.getElementById('player-hand');
        const cardElement = cardContainer.querySelector(`.card[data-index="${index}"]`);
        
        // Store the initial selection state if we haven't seen this card yet
        if (!this.initialSelectionState.has(index)) {
            this.initialSelectionState.set(index, this.selectedCards.has(index));
        }
        
        if (cardElement) {
            // Add a temporary visual indicator class
            cardElement.classList.add('drag-hover');
        }
    }
    
    endRightClickDrag(onSelectionChange) {
        if (!this.rightClickDragActive || this.isSorting) return;
        
        // Remove all temporary visual indicators
        const cardContainer = document.getElementById('player-hand');
        cardContainer.querySelectorAll('.drag-hover').forEach(el => {
            el.classList.remove('drag-hover');
        });
        
        // Apply the selection to all cards in the drag
        this.cardsInDragSelection.forEach(index => {
            const cardElement = cardContainer.querySelector(`.card[data-index="${index}"]`);
            if (cardElement) {
                // Get the initial state of this card
                const wasInitiallySelected = this.initialSelectionState.get(index) || false;
                
                // Toggle the selection state based on initial state
                if (wasInitiallySelected) {
                    // If it was initially selected, deselect it
                    this.selectedCards.delete(index);
                    cardElement.classList.remove('selected');
                } else {
                    // If it was initially not selected, select it
                    this.selectedCards.add(index);
                    cardElement.classList.add('selected');
                    window.gameAnimations.animateCardSelection(cardElement, true);
                }
            }
        });
        
        this._playCardClickSound();
        this.rightClickDragActive = false;
        onSelectionChange && onSelectionChange(this.selectedCards);
        this.initialSelectionState = null; // Clean up
    }

    // ------------------------------------------------------------------ //
    //  Public helpers for other modules                                  //
    // ------------------------------------------------------------------ //
    /**
     * Translate a **visual index** (position in the current UI order) to
     * the concrete `Card` object from the logical hand that the backend
     * still uses.
     */
    getCardByVisualIndex(gameState, visualIdx) {
        const backendIdx = this.visualToLogical[visualIdx];
        return gameState.hand?.[backendIdx];
    }
}

// Export for use in other modules
window.CardManager = CardManager;
