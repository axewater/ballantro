class CardManager {
    constructor() {
        this.selectedCards = new Set();
        this.isSorting = false;
        this.activeSortType = null; // 'rank', 'suit', or null
        
        // Define order for sorting cards
        this.RANK_ORDER_MAP = { 
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 
        };
        this.SUIT_ORDER_MAP = { 
            'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 
        };
    }

    createCardElement(card, isSelected = false) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suit}${isSelected ? ' selected' : ''}`;
        
        const rankElement = document.createElement('div');
        rankElement.className = 'card-rank';
        rankElement.textContent = card.rank;
        
        const suitElement = document.createElement('div');
        suitElement.className = 'card-suit';
        suitElement.textContent = this.getSuitSymbol(card.suit);
        
        cardElement.appendChild(rankElement);
        cardElement.appendChild(suitElement);
        
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
        
        if (onSelectionChange) {
            onSelectionChange(this.selectedCards);
        }
    }

    clearSelection() {
        this.selectedCards.clear();
    }

    getSelectedCards() {
        return Array.from(this.selectedCards);
    }

    getSelectedCount() {
        return this.selectedCards.size;
    }

    async sortCardsByRank(gameState, onSortComplete, uiUpdater) {
        if (this.isSorting || !gameState.hand || gameState.hand.length < 2) return;
        
        this.isSorting = true;
        this.setSortButtonsDisabled(true);

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

        if (this.activeSortType === 'suit') {
            this.activeSortType = null; // Toggle off
        } else {
            this.activeSortType = 'suit';
            try {
                const sortResult = this._calculateSort(gameState.hand, 'suit');
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
        const indexedHand = hand.map((card, index) => ({ card, originalIndex: index }));

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

        const newVisualOrder = indexedHand.map(item => item.originalIndex);
        const newHand = indexedHand.map(item => item.card);
        const newSelectedCards = new Set();
        
        indexedHand.forEach((item, newIndex) => {
            if (this.selectedCards.has(item.originalIndex)) {
                newSelectedCards.add(newIndex);
            }
        });

        return { newVisualOrder, newHand, newSelectedCards };
    }

    async _applySortAnimation(sortResult, gameState, onSortComplete) {
        const cardContainer = document.getElementById('player-hand');
        if (!cardContainer) return; // Guard against missing element
        const currentCardElements = Array.from(cardContainer.children);

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

        // Update game state
        gameState.hand = sortResult.newHand;
        this.selectedCards = sortResult.newSelectedCards;

        // Update elements
        reorderedElements.forEach((cardElement, newIndex) => {
            cardElement.dataset.index = newIndex;
            
            if (this.selectedCards.has(newIndex)) {
                cardElement.classList.add('selected');
                cardElement.style.transform = 'translateY(-30px) scale(1.1)';
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
                cardElement.style.transform = 'translateY(0) scale(1)';
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

    async applyActiveSort(gameState, onSortComplete) {
        if (this.isSorting || !this.activeSortType || !gameState.hand || gameState.hand.length < 2) {
            if (onSortComplete) onSortComplete(); // Ensure callback is called even if no sort happens
            return;
        }

        this.isSorting = true;
        this.setSortButtonsDisabled(true);
        try {
            const sortResult = this._calculateSort(gameState.hand, this.activeSortType);
            await this._applySortAnimation(sortResult, gameState, onSortComplete);
        } finally {
            this.isSorting = false;
            this.setSortButtonsDisabled(false);
        }
    }

    resetSortState() {
        this.activeSortType = null;
    }
}

// Export for use in other modules
window.CardManager = CardManager;
