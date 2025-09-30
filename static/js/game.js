// Removed splash screen DOMContentLoaded event listener and initializeGame function as they are now handled in main.js

function logClientHand(label, handArray) {
    // Helper function to log card hands in a readable format
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
        this.soundManager = new SoundManager();
        this.shopManager = new ShopManager(this);
        this.bossManager = new BossManager(this);
        this.settingsManager = new SettingsManager();
        this.eventManager = new EventManager(this);
        
        // Connect sound manager to scoring animation manager
        this.scoringAnimationManager.setSoundManager(this.soundManager);
        
        // Will hold the exact Card models the user played last
        this.lastPlayedCards = [];
        
        // Connect settings manager to sound manager
        this.soundManager.setSettingsManager(this.settingsManager);

        // Initialize event listeners and show startup screen
        this.eventManager.initializeEventListeners();
        this.screenManager.showScreen('startup');
    }

    showBossSelection() {
        this.bossManager.showBossSelection();
    }

    async startBossFight(selectedBoss) {
        this.bossManager.startBossFight(selectedBoss);
    }

    async startNewGame(debugMode = false) {
        if (this.cardManager.isSorting) return;
        
        // Initialize sound manager
        this.soundManager.initialize();
        
        // Connect sound manager to scoring animation manager
        this.scoringAnimationManager.setSoundManager(this.soundManager);

        // Initialize settings
        this.settingsManager.initialize();

        try {
            const data = await this.apiClient.newGame(debugMode);
            if (data.success) {
                console.log("CLIENT: New game started. Initial game state received:", data.game_state);
                this.gameState.setGameState(data.game_state);
                this.cardManager.resetSortState(); // Reset active sort
                this.cardManager.resetMapping(this.gameState.getHand().length); // sync mapping
                this.cardManager.clearSelection();
                this.updateGameDisplay();
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                
                // Initialize right-click handling
                this._initializeRightClickHandling();

                // Initialize drag-and-drop for card reordering
                const playerHandContainer = document.getElementById('player-hand');
                if (playerHandContainer) {
                    this.cardManager.initializeDragDrop(playerHandContainer, this.gameState);
                }

                this.screenManager.showScreen('game');
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                this.uiUpdater.updateSortButtonAppearance(this.cardManager.activeSortType); // Update button visuals
                this.uiUpdater.updateDebugModeIndicator(this.gameState.isDebugging());
                logClientHand("Initial hand dealt:", this.gameState.getHand());
               
               // Switch back to starfield background for gameplay with fade
               const background = document.querySelector('.background');
               if (background) {
                   background.style.transition = 'background-image 0.5s ease';
                   background.style.backgroundImage = ""; // Remove the menu background image
               }
               
               // Make sure starfield is visible with fade
               const starfield = document.getElementById('starfield');
               if (starfield) {
                   starfield.style.transition = 'opacity 0.5s ease';
                   starfield.style.opacity = "1";
               }

                this.animateCardDraw(); 
            } else {
                console.error('Failed to start new game:', data);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async drawCards() {
        this.soundManager.playButtonClickSound();
        if (this.cardManager.isSorting) return;

        // Get selected cards ONCE to avoid race condition
        const selectedCards = this.cardManager.getSelectedCards();
        const selectedCount = selectedCards.length;

        console.log("DEBUG: Draw cards - selectedCount:", selectedCount, "selectedCards:", selectedCards, "visualSelection:", Array.from(this.cardManager.selectedCards));
        if (selectedCount === 0) {
            alert('Please select at least one card to discard.');
            return;
        }

        // Additional validation - check if any selected indices are invalid
        const handSize = this.gameState.getHand().length;
        const invalidIndices = selectedCards.filter(idx => idx < 0 || idx >= handSize);
        if (invalidIndices.length > 0) {
            console.error("Invalid card indices detected:", invalidIndices);
            this.cardManager.clearSelection();
            this.updateGameDisplay();
            alert('Invalid card selection detected. Please try again.');
            return;
        }

        logClientHand("Hand BEFORE draw request:", this.gameState.getHand());
        console.log("CLIENT: Selected card indices for discard:", selectedCards);

        // Capture the selected card DOM elements before they're removed
        const playerHandContainer = document.getElementById('player-hand');
        const selectedVisualIndices = Array.from(this.cardManager.selectedCards);
        const selectedCardElements = selectedVisualIndices.map(visualIndex => {
            return playerHandContainer.querySelector(`.card[data-index="${visualIndex}"]`);
        }).filter(el => el); // Filter out any nulls

        // Capture original hand structure before discarding
        const currentHand = this.gameState.getHand();

        // Map staying cards to their original positions
        const stayingCardPositions = new Map(); // card-id -> original visual index
        const discardedPositions = []; // positions that will have gaps

        currentHand.forEach((card, index) => {
            const cardId = `${card.rank}-${card.suit}`;
            if (selectedVisualIndices.includes(index)) {
                // This position will be a gap
                discardedPositions.push(index);
            } else {
                // This card is staying, remember its position
                stayingCardPositions.set(cardId, index);
            }
        });

        console.log("CLIENT: Staying card positions:", stayingCardPositions);
        console.log("CLIENT: Discarded positions (gaps):", discardedPositions);

        // Animate the selected cards flying out to the right
        await window.gameAnimations.queueAnimation(() =>
            window.gameAnimations.animateCardDiscard(selectedCardElements)
        );

        try {
            const data = await this.apiClient.drawCards(
                this.gameState.sessionId,
                selectedCards  // translated indices
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

                // Identify which cards are staying vs new
                const newHand = this.gameState.getHand();
                const allCardElements = Array.from(document.querySelectorAll('#player-hand .card'));
                const playerHandContainer = document.getElementById('player-hand');

                // Build a map of card-id to element
                const cardElementMap = new Map();
                allCardElements.forEach((element, index) => {
                    const card = newHand[index];
                    const cardId = `${card.rank}-${card.suit}`;
                    cardElementMap.set(cardId, { element, card, backendIndex: index });
                });

                // Build the desired visual order
                // Original hand had positions 0-7, we need to fill them
                const desiredOrder = [];
                const newCardElements = [];
                let newCardIndex = 0;

                // For each original position, either place a staying card or a new card
                for (let pos = 0; pos < currentHand.length; pos++) {
                    if (discardedPositions.includes(pos)) {
                        // This position had a discarded card, place a new card here
                        // Find the next new card (one not in stayingCardPositions)
                        for (let i = 0; i < newHand.length; i++) {
                            const card = newHand[i];
                            const cardId = `${card.rank}-${card.suit}`;
                            if (!stayingCardPositions.has(cardId) && !desiredOrder.includes(cardElementMap.get(cardId)?.element)) {
                                const cardInfo = cardElementMap.get(cardId);
                                if (cardInfo) {
                                    desiredOrder.push(cardInfo.element);
                                    newCardElements.push(cardInfo.element);
                                    console.log(`CLIENT: New card ${cardId} will fill gap at position ${pos}`);
                                    break;
                                }
                            }
                        }
                    } else {
                        // This position had a staying card
                        const originalCard = currentHand[pos];
                        const cardId = `${originalCard.rank}-${originalCard.suit}`;
                        const cardInfo = cardElementMap.get(cardId);
                        if (cardInfo) {
                            desiredOrder.push(cardInfo.element);
                            console.log(`CLIENT: Card ${cardId} stays at position ${pos}`);
                        }
                    }
                }

                // Reorder DOM elements to match desired visual order
                desiredOrder.forEach((element, index) => {
                    playerHandContainer.appendChild(element); // appendChild moves the element
                    element.dataset.index = index; // Update data-index for click handling
                });

                // Set visual states
                allCardElements.forEach((element) => {
                    const card = newHand.find(c => {
                        const el = cardElementMap.get(`${c.rank}-${c.suit}`);
                        return el?.element === element;
                    });
                    const cardId = card ? `${card.rank}-${card.suit}` : '';

                    if (stayingCardPositions.has(cardId)) {
                        // Staying card - show instantly
                        element.style.opacity = '1';
                        element.style.transform = 'translateX(0) scale(1) rotate(0deg)';
                    }
                    // New cards keep their initial animation state (opacity: 0, translateX: 300px)
                });

                // Animate new cards flying in
                // Note: Sound is now played individually for each card in animateCardDeal
                if (newCardElements.length > 0) {
                    window.gameAnimations.queueAnimation(() =>
                        window.gameAnimations.animateCardDeal(newCardElements)
                    );
                }

            } else {
                console.error('Failed to draw cards:', data);
                alert(data.message || 'Failed to draw cards.');
            }
        } catch (error) {
            console.error('Error drawing cards:', error);
        }
    }

    async playHand() {
        this.soundManager.playButtonClickSound();
        if (this.cardManager.isSorting) return;
        if (this.cardManager.getSelectedCount() < 1 || this.cardManager.getSelectedCount() > 5) {
            alert('Please select 1 to 5 cards to play.');
            return;
        }
        
        // capture the selected card-models _before_ state is reset
        const selIdx = this.cardManager.getSelectedCards();        // backend indices
        const selVisual = Array.from(this.cardManager.selectedCards); // visual order
        
        // NEW: Capture the actual DOM elements of the selected cards from the hand
        const playerHandContainer = document.getElementById('player-hand');
        const selectedHandCardElements = selVisual.map(visualIndex => {
            return playerHandContainer.querySelector(`.card[data-index="${visualIndex}"]`);
        }).filter(el => el); // Filter out any nulls if elements weren't found (should not happen)

        logClientHand("Hand BEFORE play hand request:", this.gameState.getHand());
        console.log("CLIENT: Selected card indices for play:", selIdx);
        // Capture **exact** Card objects the player sees, using visual indices
        this.lastPlayedCardsData = selVisual.map(vIdx => // Store the card data for turbo chip evaluation
            this.cardManager.getCardByVisualIndex(this.gameState.gameState, vIdx) // This gets card *data*
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
                
                // Start the new scoring animation, passing the original card elements from the hand
                this.scoringAnimationManager.startScoringAnimation(
                    this.lastPlayedCardsData, // The card *data* objects
                    selectedHandCardElements, // The actual *DOM elements* from the hand
                    data.hand_result, 
                    () => this.continueGame()
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
        if (this.gameState.isDebugging()) {
            alert("Highscores cannot be saved in Debug Mode.");
            this.screenManager.hideNameModal();
            this.screenManager.showScreen('startup'); // Or back to game over / victory without save
            return;
        }
        const name = document.getElementById('modal-player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name);
        this.screenManager.hideNameModal();
        this.showHighscores();
    }

    saveGameOverScore() {
        if (this.gameState.isDebugging()) {
            alert("Highscores cannot be saved in Debug Mode.");
            this.screenManager.showScreen('startup'); // Or back to game over / victory without save
            return;
        }
        const name = document.getElementById('player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name);
        this.showHighscores();
    }

    async saveScore(name) {
        if (this.gameState.isDebugging()) {
            console.warn("Attempted to save score in debug mode. Aborted.");
            return;
        }
        try {
            // The API now requires the session ID to securely fetch the score from the backend.
            const data = await this.apiClient.saveScore(name, this.gameState.sessionId);
            if (!data.success) {
                console.error('Failed to save score:', data);
                // Optionally, show an error to the user
                alert(`Error saving score: ${data.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving score:', error);
            alert(`An error occurred while saving your score.`);
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
        if (this.gameState.isVictory()) { // isVictory includes is_game_over
            this.uiUpdater.showVictoryScreen(this.gameState.getTotalScore(), this.gameState.isDebugging());
            this.screenManager.showScreen('victory');
        } else if (this.gameState.isGameOver()) { // Game over but not victory
            this.uiUpdater.showGameOverScreen(this.gameState.getTotalScore(), this.gameState.isDebugging());
            this.screenManager.showScreen('game-over');
        } else {
            // Check if round changed for transition animation
            if (this.gameState.isInShop()) {
                // Play round complete sound as we are entering the shop
                this.soundManager.playRoundCompleteSound();
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
            this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
            this.uiUpdater.elements.selectionCount.textContent = selectedCards.size;
            this.previewManager.updateLivePreview(selectedCards, this.gameState.gameState);
            logClientHand("Hand after card click (selection changed):", this.gameState.getHand());
            console.log("CLIENT: Selected card indices after click:", Array.from(selectedCards));
        });
    }

    async sortCardsByRank() {
        this.soundManager.playButtonClickSound();
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
        this.soundManager.playButtonClickSound();
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
        if (cards.length > 0) {
            this.soundManager.playCardDealSound();
        }
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }

    async showShopScreen() {
        this.shopManager.showShopScreen();
    }

    async rerollShop() {
        this.shopManager.rerollShop();
    }

    async buyCard(cardIndex, clickedElement = null) {
        this.shopManager.buyCard(cardIndex, clickedElement);
    }

    async proceedToNextRound() {
        this.shopManager.proceedToNextRound();
    }

    // Helper function to format card rank for display names
    formatCardRank(rank) {
        const rankMap = {
            'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', '10': '10', 
            '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
        };
        return rankMap[rank] || rank;
    }

    _initializeRightClickHandling() {
        // Get the player hand container
        const playerHand = document.getElementById('player-hand');
        if (!playerHand) return;
        
        // Get the game container for global right-click handling
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;
        let isDragging = false;
        
        // Prevent default context menu on the entire game container
        gameContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Handle right mouse button down anywhere in the game container
        gameContainer.addEventListener('mousedown', (e) => {
            // Check if it's right mouse button (button 2)
            if (e.button === 2) {
                e.preventDefault();
                
                // Find the card element that was clicked (if any)
                let cardElement = e.target;
                while (cardElement && !cardElement.classList.contains('card')) {
                    cardElement = cardElement.parentElement;
                }
                
                // Start the drag selection
                let index = null;
                if (cardElement && cardElement.dataset.index !== undefined) {
                    index = parseInt(cardElement.dataset.index, 10);
                }
                
                // Start the drag selection even if we didn't click on a card
                this.cardManager.startRightClickDrag(index);
                
                // Add visual feedback to the game container
                gameContainer.classList.add('right-drag-active');
            }
        });
        
        // Handle right mouse button down on player hand (for backward compatibility)
        playerHand.addEventListener('mousedown', (e) => {
            // Check if it's right mouse button (button 2)
            if (e.button === 2) {
                e.preventDefault();
                
                // Find the card element that was clicked
                let cardElement = e.target;
                while (cardElement && !cardElement.classList.contains('card')) {
                    cardElement = cardElement.parentElement;
                }
                
                if (cardElement && cardElement.dataset.index !== undefined) {
                    const index = parseInt(cardElement.dataset.index, 10);
                    this.cardManager.startRightClickDrag(index);
                }
            }
        });
        
        // Handle mouse move during right-click drag
        gameContainer.addEventListener('mousemove', (e) => {
            if (this.cardManager.rightClickDragActive) {
                // Find the card element under the cursor
                let cardElement = document.elementFromPoint(e.clientX, e.clientY);
                while (cardElement && !cardElement.classList.contains('card')) {
                    cardElement = cardElement.parentElement;
                }
                
                if (cardElement && cardElement.dataset.index !== undefined) {
                    const index = parseInt(cardElement.dataset.index, 10);
                    this.cardManager.updateRightClickDrag(index);
                }
            }
            else {
                // If we're not in right-click drag mode, do nothing
            }
        });
        
        // Handle right mouse button up
        document.addEventListener('mouseup', (e) => {
            // Check if it's right mouse button (button 2)
            if (e.button === 2 && this.cardManager.rightClickDragActive) {
                e.preventDefault();
                
                this.cardManager.endRightClickDrag((selectedCards) => {
                    this.uiUpdater.updateButtonStates(this.gameState.gameState, this.cardManager.getSelectedCount());
                    this.uiUpdater.elements.selectionCount.textContent = selectedCards.size;
                    this.previewManager.updateLivePreview(selectedCards, this.gameState.gameState);
                });
                
                // Remove visual feedback from the game container
                gameContainer.classList.remove('right-drag-active');
            }
        });
    }
}
