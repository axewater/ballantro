function logClientHand(label, handArray) {
    const handStr = handArray && Array.isArray(handArray) ? handArray.map(card => `${card.rank}${card.suit.charAt(0).toUpperCase()}`).join(', ') : 'N/A';
    console.log(`CLIENT: ${label} [${handStr}] (Count: ${handArray ? handArray.length : 0})`);
}

class PokerGame {
    constructor() {
        // Initialize all modules
        this.apiClient = new ApiClient();
        this.gameState = new GameState();
        this.cardManager = new CardManager();
        this.screenManager = new ScreenManager();
        this.uiUpdater = new UIUpdater();
        this.previewManager = new PreviewManager(this.apiClient, this.cardManager);
        this.scoringAnimationManager = new ScoringAnimationManager(this.previewManager, this.uiUpdater);
        // will hold the exact Card models the user played last
        this.lastPlayedCards = [];
        this.currentShopCards = []; // To store details of cards currently in the shop
        this.shopRequestInFlight = false;   //  ← new flag

        // Initialize event listeners and show startup screen
        this.initializeEventListeners();
        this.screenManager.showScreen('startup');
    }

    initializeEventListeners() {
        // Startup screen
        document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('highscores-btn').addEventListener('click', () => this.showHighscores());

        // Game screen
        document.getElementById('draw-cards-btn').addEventListener('click', () => this.drawCards());
        document.getElementById('play-hand-btn').addEventListener('click', () => this.playHand());
        document.getElementById('sort-rank-btn').addEventListener('click', () => this.sortCardsByRank());
        document.getElementById('sort-suit-btn').addEventListener('click', () => this.sortCardsBySuit());
        document.getElementById('show-payouts-btn').addEventListener('click', () => this.screenManager.showPayoutsModal());
        document.getElementById('deck-info-panel').addEventListener('click', () => this.showRemainingDeckModal());

        // Shop screen
        document.getElementById('reroll-shop-btn').addEventListener('click', () => this.rerollShop());
        document.getElementById('next-round-btn').addEventListener('click', () => this.proceedToNextRound());

        // Scoring screen
        document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());

        // Victory screen
        document.getElementById('save-score-btn').addEventListener('click', () => this.screenManager.showNameModal());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startNewGame());

        // Game over screen
        document.getElementById('save-game-over-score-btn').addEventListener('click', () => this.saveGameOverScore());
        document.getElementById('try-again-btn').addEventListener('click', () => this.startNewGame());

        // Highscores screen
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.screenManager.showScreen('startup'));

        // Name modal
        document.getElementById('save-name-btn').addEventListener('click', () => this.saveVictoryScore());
        document.getElementById('cancel-name-btn').addEventListener('click', () => this.screenManager.hideNameModal());

        // Payouts modal
        document.getElementById('close-payouts-btn').addEventListener('click', () => this.screenManager.hidePayoutsModal());

        // Remaining Deck modal
        document.getElementById('close-remaining-deck-btn').addEventListener('click', () => this.screenManager.hideRemainingDeckModal());
        
        // Enter key in name inputs
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveGameOverScore();
        });
        document.getElementById('modal-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveVictoryScore();
        });
    }

    async startNewGame() {
        if (this.cardManager.isSorting) return;

        try {
            const data = await this.apiClient.newGame();
            if (data.success) {
                console.log("CLIENT: New game started. Initial game state received:", data.game_state);
                this.gameState.setGameState(data.game_state);
                this.cardManager.resetSortState(); // Reset active sort
                this.cardManager.resetMapping(this.gameState.getHand().length); // sync mapping
                this.cardManager.clearSelection();
                this.updateGameDisplay();
                this.screenManager.showScreen('game');
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                this.uiUpdater.updateSortButtonAppearance(this.cardManager.activeSortType); // Update button visuals
                logClientHand("Initial hand dealt:", this.gameState.getHand());

                this.animateCardDraw();
            } else {
                console.error('Failed to start new game:', data);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async drawCards() {
        if (this.cardManager.isSorting) return;
        if (this.cardManager.getSelectedCount() === 0) {
            alert('Please select at least one card to discard.');
            return;
        }

        logClientHand("Hand BEFORE draw request:", this.gameState.getHand());
        console.log("CLIENT: Selected card indices for discard:", this.cardManager.getSelectedCards());
        try {
            const data = await this.apiClient.drawCards(
                this.gameState.sessionId,
                this.cardManager.getSelectedCards() // translated indices
            );
            if (data.success) {
                console.log("CLIENT: Draw cards response received. Updated game state:", data.game_state);
                this.gameState.setGameState(data.game_state);
                this.cardManager.resetMapping(this.gameState.getHand().length); // fresh mapping after draw
                this.cardManager.clearSelection();
                
                /* ----------------------------------------------------------
                 * IMPORTANT: Render the NEW hand to the DOM *before* we try
                 * to apply any active sort.  The old flow attempted to run
                 * the sort animation on the *previous* hand that was still
                 * mounted in the DOM, causing mapping / card–tracking errors.
                 * ---------------------------------------------------------- */
                this.updateGameDisplay(); // renders raw, unsorted hand
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
        
                // Now (optionally) apply the active sort on the freshly drawn hand
                logClientHand("Hand AFTER draw response (pre-sort DOM ready):", this.gameState.getHand());
                await this.cardManager.applyActiveSort(this.gameState.gameState, () => {
                    this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                });
                // Finally animate the arrival of the (sorted) new cards
                this.animateCardDraw();
 
            } else {
                console.error('Failed to draw cards:', data);
                alert(data.message || 'Failed to draw cards.');
            }
        } catch (error) {
            console.error('Error drawing cards:', error);
        }
    }

    async playHand() {
        if (this.cardManager.isSorting) return;
        if (this.cardManager.getSelectedCount() !== 5) {
            alert('Please select exactly 5 cards to play.');
            return;
        }

        // capture the selected card-models _before_ state is reset
        const selIdx = this.cardManager.getSelectedCards();        // backend indices
        const selVisual = Array.from(this.cardManager.selectedCards); // visual order
        logClientHand("Hand BEFORE play hand request:", this.gameState.getHand());
        console.log("CLIENT: Selected card indices for play:", selIdx);
        // Capture **exact** Card objects the player sees, using visual indices
        this.lastPlayedCards = selVisual.map(vIdx =>
            this.cardManager.getCardByVisualIndex(this.gameState.gameState, vIdx)
        );

        try {
            const data = await this.apiClient.playHand(
                this.gameState.sessionId,
                selIdx // already logical indices
            );
            if (data.success) {
                console.log("CLIENT: Play hand response received. Game state:", data.game_state, "Hand result:", data.hand_result);
                this.gameState.setGameState(data.game_state);
                this.cardManager.resetMapping(this.gameState.getHand().length); // fresh mapping after play
                this.gameState.setHandResult(data.hand_result, data.round_complete, data.money_awarded_this_round);
                logClientHand("Hand AFTER play hand response (new hand dealt):", this.gameState.getHand());
                
                // Start the new scoring animation instead of showing popup
                this.scoringAnimationManager.startScoringAnimation(
                    this.lastPlayedCards, data.hand_result, () => this.continueGame()
                );
            } else {
                console.error('Failed to play hand:', data);
                alert(data.message || 'Failed to play hand.');
            }
        } catch (error) {
            console.error('Error playing hand:', error);
        }
    }

    async showHighscores() {
        try {
            const data = await this.apiClient.getHighscores();
            
            if (data.success) {
                this.uiUpdater.showHighscores(data.highscores);
                this.screenManager.showScreen('highscores');
            } else {
                console.error('Failed to get highscores:', data);
            }
        } catch (error) {
            console.error('Error getting highscores:', error);
        }
    }

    saveVictoryScore() {
        const name = document.getElementById('modal-player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name, this.gameState.getTotalScore());
        this.screenManager.hideNameModal();
        this.showHighscores();
    }

    saveGameOverScore() {
        const name = document.getElementById('player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name, this.gameState.getTotalScore());
        this.showHighscores();
    }

    async saveScore(name, score) {
        try {
            const data = await this.apiClient.saveScore(name, score);
            if (!data.success) {
                console.error('Failed to save score:', data);
            }
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }

    async showRemainingDeckModal() {
        if (!this.gameState.sessionId) {
            console.warn("No active game session to show remaining deck.");
            return;
        }
        try {
            const data = await this.apiClient.getRemainingDeck(this.gameState.sessionId);

            if (data.success && data.remaining_cards) {
                this.screenManager.populateRemainingDeckDisplay(data.remaining_cards);
                this.screenManager.showRemainingDeckModal();
            } else {
                console.error('Failed to fetch remaining deck:', data.detail || 'Unknown error');
                alert('Could not load remaining cards.');
            }
        } catch (error) {
            console.error('Error fetching remaining deck:', error);
            alert('Error loading remaining cards.');
        }
    }

    continueGame() {
        if (this.cardManager.isSorting) return;
        if (this.gameState.isVictory()) {
            this.uiUpdater.showVictoryScreen(this.gameState.getTotalScore());
            this.screenManager.showScreen('victory');
        } else if (this.gameState.isGameOver()) {
            this.uiUpdater.showGameOverScreen(this.gameState.getTotalScore());
            this.screenManager.showScreen('game-over');
        } else {
            // Check if round changed for transition animation
            if (this.gameState.isInShop()) {
                // If we're in shop mode, show the shop screen
                this.showShopScreen();
                return;
            }
            
            if (this.gameState.roundComplete) {
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.getCurrentRound())
                ).then(() => {
                    this.finalizeHandUpdateAndDisplay();
                });
            } else {
                this.finalizeHandUpdateAndDisplay();
            }
        }
    }

    async finalizeHandUpdateAndDisplay() {
        this.cardManager.clearSelection();

        /* ----------------------------------------------------------
         * Same ordering fix as in drawCards(): render the new hand
         * first, then (optionally) run the sort animation.
         * ---------------------------------------------------------- */
        this.updateGameDisplay();
        this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
        this.screenManager.showScreen('game');

        await this.cardManager.applyActiveSort(this.gameState.gameState, () => {
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
        }, true);

        this.animateCardDraw();
        console.log("CLIENT: Finalize hand update and display complete.");
    }

    updateGameDisplay() {
        if (!this.gameState.gameState) return;
        
        // console.log("CLIENT: Updating game display with state:", this.gameState.gameState); // Can be too verbose
        this.uiUpdater.updateGameDisplay(this.gameState.gameState, this.cardManager.getSelectedCount());
        this.displayHand();
    }

    displayHand() {
        // Ensure mapping length matches current hand before (re-)render
        if (this.cardManager.visualToLogical.length !== this.gameState.getHand().length) {
            this.cardManager.resetMapping(this.gameState.getHand().length);
        }
        logClientHand("Displaying hand in UI:", this.gameState.getHand());
        this.uiUpdater.displayHand(
            this.gameState.getHand(),
            this.cardManager.selectedCards,
            this.cardManager,
            (index, cardElement) => this.handleCardClick(index, cardElement)
        );
    }

    handleCardClick(index, cardElement) {
        this.cardManager.toggleCardSelection(index, cardElement, (selectedCards) => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, selectedCards.size);
            this.uiUpdater.elements.selectionCount.textContent = selectedCards.size;
            this.previewManager.updateLivePreview(selectedCards, this.gameState.gameState);
            logClientHand("Hand after card click (selection changed):", this.gameState.getHand());
            console.log("CLIENT: Selected card indices after click:", Array.from(selectedCards));
        });
    }

    async sortCardsByRank() {
        logClientHand("Hand BEFORE sort by rank request:", this.gameState.getHand());
        // Pass uiUpdater to cardManager for updating button appearance
        await this.cardManager.sortCardsByRank(this.gameState.gameState, () => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
            this.uiUpdater.elements.selectionCount.textContent = this.cardManager.getSelectedCount();
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
            logClientHand("Hand AFTER sort by rank completed:", this.gameState.getHand());
            // No need to call setSortButtonsDisabled(false) here, CardManager handles it.
        }, this.uiUpdater);
    }

    async sortCardsBySuit() {
        logClientHand("Hand BEFORE sort by suit request:", this.gameState.getHand());
        // Pass uiUpdater to cardManager for updating button appearance
        await this.cardManager.sortCardsBySuit(this.gameState.gameState, () => {
            this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
            this.uiUpdater.elements.selectionCount.textContent = this.cardManager.getSelectedCount();
            this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
            logClientHand("Hand AFTER sort by suit completed:", this.gameState.getHand());
            // No need to call setSortButtonsDisabled(false) here, CardManager handles it.
        }, this.uiUpdater);
    }

    animateCardDraw() {
        const cards = document.querySelectorAll('#player-hand .card');
        console.log("CLIENT: Animating card draw for", cards.length, "cards.");
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }

    async showShopScreen() {
        try {
            const data = await this.apiClient.getShopState(this.gameState.sessionId);
            
            if (data.success) {
                this.updateShopDisplay(data.shop_state);
                this.screenManager.showScreen('shop');
            } else {
                console.error('Failed to get shop state:', data);
                alert('Could not load shop. Continuing to next round.');
                this.proceedToNextRound();
            }
        } catch (error) {
            console.error('Error fetching shop state:', error);
            alert('Error loading shop. Continuing to next round.');
            this.proceedToNextRound();
        }
    }

    updateShopDisplay(shopState) {
        // Update money display
        document.getElementById('shop-money-display').textContent = `$${shopState.money}`;

        // Store current shop cards for logging purposes
        this.currentShopCards = shopState.shop_items ? [...shopState.shop_items] : [];
        
        // Clear existing shop cards
        const shopCardsContainer = document.getElementById('shop-cards');
        shopCardsContainer.innerHTML = '';
        
        // Add shop cards
        shopState.shop_items.forEach((item,index)=>{
            const cardElement = item.item_type==='card'
                 ? this.createShopCardElement(item,index)
                 : this.createTurboChipElement(item,index);
            shopCardsContainer.appendChild(cardElement);
        });
        
        // Update reroll button state
        document.getElementById('reroll-shop-btn').disabled = shopState.money < shopState.reroll_cost;
    }

    createShopCardElement(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = `shop-card ${card.suit}`;
        
        const rankElement = document.createElement('div');
        rankElement.className = 'card-rank';
        rankElement.textContent = card.rank;
        
        const suitElement = document.createElement('div');
        suitElement.className = 'card-suit';
        suitElement.textContent = this.cardManager.getSuitSymbol(card.suit);
        
        const rankBottomElement = document.createElement('div');
        rankBottomElement.className = 'card-rank-bottom';
        rankBottomElement.textContent = card.rank;
        
        const priceElement = document.createElement('div');
        priceElement.className = 'card-price';
        priceElement.textContent = '$3';
        
        // Special-card overlay
        if (card.effects && card.effects.length > 0) {
            const effectIcon = document.createElement('div');
            effectIcon.className = 'card-effect-icon';
            effectIcon.textContent = '✦';
            cardElement.appendChild(effectIcon);
        }

        cardElement.appendChild(rankElement);
        cardElement.appendChild(suitElement);
        cardElement.appendChild(rankBottomElement);
        cardElement.appendChild(priceElement);
        
        // Add click event to buy card
        cardElement.addEventListener('click', () => this.buyCard(index));
        
        return cardElement;
    }

    createTurboChipElement(chip,index){
        const el=document.createElement('div');
        el.className='shop-card turbo';
        el.innerHTML=`<div class="card-rank">⚡</div><div class="card-suit">${chip.name}</div>`;
        const price=document.createElement('div');
        price.className='card-price';price.textContent='$1';
        el.appendChild(price);
        el.addEventListener('click',()=>this.buyCard(index));
        return el;
    }

    async rerollShop() {
        try {
            const data = await this.apiClient.rerollShop(this.gameState.sessionId);
            
            if (data.success) {
                // Update shop display with new cards
                this.updateShopDisplay({
                    shop_items: data.shop_items,
                    money: data.money,
                    reroll_cost: 1,
                    card_cost: 3
                });
            } else {
                console.error('Failed to reroll shop:', data);
                alert(data.detail || 'Failed to reroll shop.');
            }
        } catch (error) {
            console.error('Error rerolling shop:', error);
            alert('Error rerolling shop.');
        }
    }

    async buyCard(cardIndex) {
        if (this.shopRequestInFlight) return;          // ignore double clicks
        this.shopRequestInFlight = true;
        document.getElementById('next-round-btn').disabled = true; // lock N-Round

        // Get card details *before* the API call for logging, using the stored shop cards
        const boughtCardDetails = this.currentShopCards && this.currentShopCards[cardIndex]
                                  ? this.currentShopCards[cardIndex]
                                  : null;

        try {
            const data = await this.apiClient.buyCard(this.gameState.sessionId, cardIndex);
            
            if (data.success) {
                // Update game state *first* so getDeckRemaining() is accurate for logging
                // Update game state
                this.gameState.setGameState(data.game_state);
                
                // Enhanced logging for purchase confirmation
                if (boughtCardDetails) {
                    const cardSuit = boughtCardDetails.suit ? (boughtCardDetails.suit.charAt(0).toUpperCase() + boughtCardDetails.suit.slice(1)) : "";
                    const cardName = boughtCardDetails.item_type === "card"
                        ? `${this.formatCardRank(boughtCardDetails.rank)} of ${cardSuit}`
                        : boughtCardDetails.name;
                    const deckCount = this.gameState.getDeckRemaining();
                    console.log(`PURCHASE CONFIRMATION: Bought '${cardName}'. Added to deck. Total cards: ${deckCount}`);
                } else {
                    console.warn("Could not retrieve bought card details for logging purchase.");
                }

                // Update shop display
                const shopCardsContainer = document.getElementById('shop-cards');
                const cardElements = shopCardsContainer.querySelectorAll('.shop-card');
                
                // Mark the bought card as sold
                cardElements[cardIndex].classList.add('sold');
                cardElements[cardIndex].style.pointerEvents = 'none';
                
                // Update money display
                document.getElementById('shop-money-display').textContent = `$${this.gameState.getMoney()}`;
                
                // Update reroll button state
                document.getElementById('reroll-shop-btn').disabled = this.gameState.getMoney() < 1;
            } else {
                console.error('Failed to buy card:', data);
                alert(data.detail || 'Failed to buy card.');
            }
        } catch (error) {
            console.error('Error buying card:', error);
            alert('Error buying card.');
        } finally {
            this.shopRequestInFlight = false;
            document.getElementById('next-round-btn').disabled = false; // unlock
        }
    }

    async proceedToNextRound() {
        if (this.shopRequestInFlight) return;  // wait until purchase finishes
        try {
            const data = await this.apiClient.proceedToNextRound(this.gameState.sessionId);
            
            if (data.success) {
                // Update game state
                this.gameState.setGameState(data.game_state);
                
                // Animate round transition
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.getCurrentRound())
                ).then(() => {
                    this.finalizeHandUpdateAndDisplay();
                });
            } else {
                console.error('Failed to proceed to next round:', data);
                alert(data.detail || 'Failed to proceed to next round.');
            }
        } catch (error) {
            console.error('Error proceeding to next round:', error);
            alert('Error proceeding to next round.');
        }
    }

    // Helper function to format card rank for display names
    formatCardRank(rank) {
        const rankMap = {
            'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack',
            '10': '10', '9': '9', '8': '8', '7': '7', '6': '6',
            '5': '5', '4': '4', '3': '3', '2': '2'
        };
        return rankMap[rank] || rank;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pokerGame = new PokerGame();
});
