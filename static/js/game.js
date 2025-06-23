class PokerGame {
    constructor() {
        this.gameState = null;
        this.sessionId = null;
        this.selectedCards = new Set();
        this.currentScreen = 'startup';
        
        // Define order for sorting cards
        this.RANK_ORDER_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        this.SUIT_ORDER_MAP = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 }; // User specified: Spades, Hearts, Clubs, Diamonds

        this.isSorting = false; // Flag to prevent actions during sort animation

        // DOM elements for live preview
        this.previewHandTypeElement = document.getElementById('preview-hand-type');
        this.previewBaseScoreElement = document.getElementById('preview-base-score');
        this.previewDescriptionElement = document.getElementById('preview-description');
        this.deckInfoPanel = document.getElementById('deck-info-panel');

        // Hand Payouts Data (mirrors backend/poker_evaluator.py HAND_SCORES)
        this.HAND_PAYOUTS = [
            { name: "Straight Flush", base: 75, multiplier: 10 },
            { name: "Four of a Kind", base: 60, multiplier: 8 },
            { name: "Full House", base: 50, multiplier: 7 },
            { name: "Flush", base: 40, multiplier: 6 },
            { name: "Straight", base: 30, multiplier: 5 },
            { name: "Three of a Kind", base: 25, multiplier: 4 },
            { name: "Two Pair", base: 20, multiplier: 3 },
            { name: "One Pair", base: 15, multiplier: 2 },
            { name: "High Card", base: 10, multiplier: 2 },
        ];

        this.populatePayoutsTable(); // Populate the table on initialization
        this.initializeEventListeners();
        this.showScreen('startup');
    }

    initializeEventListeners() {
        // Startup screen
        document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('highscores-btn').addEventListener('click', () => this.showHighscores());

        // Game screen
        document.getElementById('draw-cards-btn').addEventListener('click', () => this.drawCards());
        document.getElementById('play-hand-btn').addEventListener('click', () => this.playHand()); // Added async
        document.getElementById('sort-rank-btn').addEventListener('click', async () => await this.sortCardsByRank());
        document.getElementById('sort-suit-btn').addEventListener('click', async () => await this.sortCardsBySuit());
        document.getElementById('show-payouts-btn').addEventListener('click', () => this.showPayoutsModal());
        this.deckInfoPanel.addEventListener('click', () => this.showRemainingDeckModal());

        // Scoring screen
        document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());

        // Victory screen
        document.getElementById('save-score-btn').addEventListener('click', () => this.showNameModal());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startNewGame());

        // Game over screen
        document.getElementById('save-game-over-score-btn').addEventListener('click', () => this.saveGameOverScore());
        document.getElementById('try-again-btn').addEventListener('click', () => this.startNewGame());

        // Highscores screen
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showScreen('startup'));

        // Name modal
        document.getElementById('save-name-btn').addEventListener('click', () => this.saveVictoryScore());
        document.getElementById('cancel-name-btn').addEventListener('click', () => this.hideNameModal());

        // Payouts modal
        document.getElementById('close-payouts-btn').addEventListener('click', () => this.hidePayoutsModal());

        // Remaining Deck modal
        document.getElementById('close-remaining-deck-btn').addEventListener('click', () => this.hideRemainingDeckModal());
        
        // Enter key in name inputs
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveGameOverScore();
        });
        document.getElementById('modal-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveVictoryScore();
        });
    }

    async startNewGame() {
        if (this.isSorting) return; // Prevent action during sort
        // Potentially disable start game button if a sort is in progress from a previous game instance (though unlikely)
        // For simplicity, we assume new game resets any such state.

        try {
            const response = await fetch('/api/new_game', {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.sessionId = this.gameState.session_id;
                this.selectedCards.clear();
                this.updateGameDisplay();
                this.showScreen('game');
                this.updateLivePreview(); // Clear preview for new game
                this.animateCardDraw();
                this.updateDeckRemainingDisplay(); // Update deck count
            } else {
                console.error('Failed to start new game:', data);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }

    async drawCards() {
        if (this.isSorting) return;
        if (this.selectedCards.size === 0) {
            alert('Please select at least one card to discard.');
            return;
        }

        try {
            const response = await fetch('/api/draw_cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    selected_cards: Array.from(this.selectedCards)
                })
            });

            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.selectedCards.clear();
                this.updateGameDisplay();
                this.updateDeckRemainingDisplay(); // Update deck count
                this.updateLivePreview(); // Update preview after draw
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
        if (this.isSorting) return;
        if (this.selectedCards.size !== 5) {
            alert('Please select exactly 5 cards to play.');
            return;
        }

        try {
            const response = await fetch('/api/play_hand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    selected_cards: Array.from(this.selectedCards)
                })
            });

            const data = await response.json();
            if (data.success) {
                this.gameState = data.game_state;
                this.handResult = data.hand_result;
                this.roundComplete = data.round_complete;
                this.moneyAwardedThisRound = data.money_awarded_this_round;
                this.showScoringScreen();
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
            const response = await fetch('/api/highscores');
            const data = await response.json();
            
            if (data.success) {
                const highscoresList = document.getElementById('highscores-list');
                highscoresList.innerHTML = '';
                
                if (data.highscores.length === 0) {
                    highscoresList.innerHTML = '<div class="no-scores">No scores yet</div>';
                } else {
                    data.highscores.forEach((score, index) => {
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
                
                this.showScreen('highscores');
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
        
        this.saveScore(name, this.gameState.total_score);
        this.hideNameModal();
        this.showHighscores();
    }

    saveGameOverScore() {
        const name = document.getElementById('player-name').value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        this.saveScore(name, this.gameState.total_score);
        this.showHighscores();
    }

    async saveScore(name, score) {
        try {
            const response = await fetch('/api/save_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Failed to save score:', data);
            }
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }

    showNameModal() {
        document.getElementById('modal-player-name').value = '';
        document.getElementById('name-modal').classList.add('active');
    }

    hideNameModal() {
        document.getElementById('name-modal').classList.remove('active');
    }

    showPayoutsModal() {
        document.getElementById('payouts-modal').classList.add('active');
    }

    hidePayoutsModal() {
        document.getElementById('payouts-modal').classList.remove('active');
    }

    async showRemainingDeckModal() {
        if (!this.sessionId) {
            console.warn("No active game session to show remaining deck.");
            return;
        }
        try {
            const response = await fetch(`/api/remaining_deck/${this.sessionId}`);
            const data = await response.json();

            if (data.success && data.remaining_cards) {
                this.populateRemainingDeckDisplay(data.remaining_cards);
                document.getElementById('remaining-deck-modal').classList.add('active');
            } else {
                console.error('Failed to fetch remaining deck:', data.detail || 'Unknown error');
                alert('Could not load remaining cards.');
            }
        } catch (error) {
            console.error('Error fetching remaining deck:', error);
            alert('Error loading remaining cards.');
        }
    }

    hideRemainingDeckModal() {
        document.getElementById('remaining-deck-modal').classList.remove('active');
    }

    populateRemainingDeckDisplay(cards) {
        const suitContainers = {
            spades: document.getElementById('remaining-spades').querySelector('.card-list'),
            hearts: document.getElementById('remaining-hearts').querySelector('.card-list'),
            clubs: document.getElementById('remaining-clubs').querySelector('.card-list'),
            diamonds: document.getElementById('remaining-diamonds').querySelector('.card-list')
        };

        // Clear previous cards
        for (const suit in suitContainers) {
            suitContainers[suit].innerHTML = '';
        }

        // Group cards by suit
        const cardsBySuit = { spades: [], hearts: [], clubs: [], diamonds: [] };
        cards.forEach(card => {
            if (cardsBySuit[card.suit]) {
                cardsBySuit[card.suit].push(card);
            }
        });

        // Sort cards within each suit by rank (descending) and display
        for (const suit in cardsBySuit) {
            cardsBySuit[suit].sort((a, b) => {
                return this.RANK_ORDER_MAP[b.rank] - this.RANK_ORDER_MAP[a.rank];
            });

            cardsBySuit[suit].forEach(card => {
                const miniCardElement = document.createElement('div');
                miniCardElement.className = 'mini-card';
                let suitSymbol = this.getSuitSymbol(card.suit);
                miniCardElement.textContent = `${card.rank}${suitSymbol}`;
                // Optional: Color red suits
                if (card.suit === 'hearts' || card.suit === 'diamonds') {
                    miniCardElement.style.color = '#e74c3c'; // Red
                } else {
                    miniCardElement.style.color = '#2c3e50'; // Black
                }
                suitContainers[suit].appendChild(miniCardElement);
            });
            if (cardsBySuit[suit].length === 0) {
                suitContainers[suit].innerHTML = '<em>No cards of this suit remaining.</em>';
            }
        }
    }

    populatePayoutsTable() {
        const tableBody = document.getElementById('payouts-table-body');
        if (!tableBody) {
            console.error("Payouts table body not found!");
            return;
        }
        tableBody.innerHTML = ''; // Clear existing rows

        this.HAND_PAYOUTS.forEach(payout => {
            const row = tableBody.insertRow();
            const cellHand = row.insertCell();
            const cellBase = row.insertCell();
            const cellMultiplier = row.insertCell();
            cellHand.textContent = payout.name;
            cellBase.textContent = payout.base;
            cellMultiplier.textContent = `×${payout.multiplier}`;
        });
    }

    showScoringScreen() {
        // Display played cards
        const playedCardsContainer = document.getElementById('played-cards');
        playedCardsContainer.innerHTML = '';
        
        const selectedCardIndices = Array.from(this.selectedCards);
        selectedCardIndices.forEach(index => {
            const card = this.gameState.hand[index];
            const cardElement = this.createCardElement(card, false);
            playedCardsContainer.appendChild(cardElement);
        });

        // Display hand result
        document.getElementById('hand-type-name').textContent = this.formatHandType(this.handResult.hand_type);
        document.getElementById('hand-description').textContent = this.handResult.description;
        document.getElementById('card-chips').textContent = '0';
        document.getElementById('base-chips').textContent = '0';
        document.getElementById('multiplier').textContent = '×1';
        document.getElementById('hand-score').textContent = '0';
        
        // Money awarded display
        const roundBonusItem = document.getElementById('round-bonus-item');
        const roundBonusMoney = document.getElementById('round-bonus-money');
        if (this.moneyAwardedThisRound > 0) {
            roundBonusMoney.textContent = `$${this.moneyAwardedThisRound}`;
            roundBonusItem.style.display = 'flex'; // Show the item
        } else {
            roundBonusItem.style.display = 'none'; // Hide if no money awarded
        }

        this.showScreen('scoring');
        
        // Enhanced scoring animation
        const playedCards = playedCardsContainer.querySelectorAll('.card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardScoring(Array.from(playedCards), this.handResult)
        ).then(() => {
            // Animate score counting
            this.animateScoreCounting('card-chips', 0, this.handResult.card_chips, 1000);
            this.animateScoreCounting('base-chips', 0, this.handResult.base_chips, 1000);
            
            setTimeout(() => {
                document.getElementById('multiplier').textContent = `×${this.handResult.multiplier}`;
                document.getElementById('multiplier').classList.add('highlight');
                
                setTimeout(() => {
                    this.animateScoreCounting('hand-score', 0, this.handResult.total_score, 1500);
                    document.getElementById('multiplier').classList.remove('highlight');
                }, 500);
            }, 1000);
        });
    }

    continueGame() {
        if (this.isSorting) return;
        if (this.gameState.is_victory) {
            document.getElementById('final-score').textContent = this.gameState.total_score;
            this.showScreen('victory');
        } else if (this.gameState.is_game_over) {
            document.getElementById('game-over-score').textContent = this.gameState.total_score;
            this.showScreen('game-over');
        } else {
            // Check if round changed for transition animation
            if (this.roundComplete) {
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.current_round)
                ).then(() => {
                    this.selectedCards.clear();
                    this.updateGameDisplay();
                    this.updateLivePreview(); // Update preview after round change
                    this.showScreen('game');
                    this.updateDeckRemainingDisplay();
                });
            } else {
                this.selectedCards.clear();
                this.updateGameDisplay();
                this.updateLivePreview(); // Update preview after continuing hand
                this.showScreen('game');
                this.updateDeckRemainingDisplay();
            }
        }
    }

    updateGameDisplay() {
        if (!this.gameState) return;
        
        // Update game info
        document.getElementById('current-round').textContent = this.gameState.current_round;
        document.getElementById('total-score').textContent = this.gameState.total_score;
        document.getElementById('player-money').textContent = `$${this.gameState.money}`;
        document.getElementById('round-target').textContent = this.gameState.round_target;
        document.getElementById('hands-played').textContent = this.gameState.hands_played;
        document.getElementById('max-hands').textContent = this.gameState.max_hands;
        document.getElementById('draws-used').textContent = this.gameState.draws_used;
        document.getElementById('max-draws').textContent = this.gameState.max_draws;
        
        // Update hand display
        this.displayHand();
        
        // Update button states
        document.getElementById('draw-cards-btn').disabled = 
            this.selectedCards.size === 0 || 
            this.gameState.draws_used >= this.gameState.max_draws;
            
        document.getElementById('play-hand-btn').disabled = this.selectedCards.size !== 5;
        
        // Update selection count
        document.getElementById('selection-count').textContent = this.selectedCards.size;
        this.updateDeckRemainingDisplay();
    }

    displayHand() {
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';
        
        this.gameState.hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, this.selectedCards.has(index));
            cardElement.dataset.index = index;
            cardElement.addEventListener('click', () => this.toggleCardSelection(index, cardElement));
            handContainer.appendChild(cardElement);
        });
    }

    updateDeckRemainingDisplay() {
        const deckRemainingElement = document.getElementById('deck-remaining');
        deckRemainingElement.textContent = `${this.gameState.deck_remaining}`;
    }

    createCardElement(card, isSelected) {
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

    toggleCardSelection(index, cardElement) {
        if (this.isSorting) return; // Prevent selection changes during sort
        if (this.selectedCards.has(index)) {
            this.selectedCards.delete(index);
            cardElement.classList.remove('selected');
            window.gameAnimations.animateCardSelection(cardElement, false);
        } else {
            this.selectedCards.add(index);
            cardElement.classList.add('selected');
            window.gameAnimations.animateCardSelection(cardElement, true);
        }
        
        // Update button states
        document.getElementById('draw-cards-btn').disabled = 
            this.selectedCards.size === 0 || 
            this.gameState.draws_used >= this.gameState.max_draws;
            
        document.getElementById('play-hand-btn').disabled = this.selectedCards.size !== 5;
        
        // Update selection count
        document.getElementById('selection-count').textContent = this.selectedCards.size;

        // Update live preview
        this.updateLivePreview();
        this.updateDeckRemainingDisplay();
    }

    async updateLivePreview() {
        if (!this.previewHandTypeElement || !this.previewBaseScoreElement || !this.previewDescriptionElement) {
            console.warn("Preview elements not found.");
            return;
        }

        if (this.selectedCards.size === 0) {
            this.previewHandTypeElement.textContent = '-';
            this.previewBaseScoreElement.textContent = '-';
            this.previewDescriptionElement.textContent = 'Select cards to see a preview.';
            return;
        }

        const cardsForPreview = Array.from(this.selectedCards)
            .map(index => this.gameState.hand[index])
            .filter(card => card); // Ensure no undefined cards

        if (cardsForPreview.length === 0) { // Should match selectedCards.size but good failsafe
            this.previewHandTypeElement.textContent = '-';
            this.previewBaseScoreElement.textContent = '-';
            this.previewDescriptionElement.textContent = 'Select cards to see a preview.';
            return;
        }

        try {
            const response = await fetch('/api/preview_hand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardsForPreview) // Send actual card objects
            });
            const data = await response.json();

            if (data.success && data.preview) {
                this.previewHandTypeElement.textContent = this.formatHandType(data.preview.hand_type);
                this.previewBaseScoreElement.textContent = data.preview.score_info || `${data.preview.base_chips} × ${data.preview.multiplier}`;
                this.previewDescriptionElement.textContent = data.preview.description;
            } else if (data.success && !data.preview) { // E.g. API returns null for 0 cards
                 this.previewHandTypeElement.textContent = '-';
                 this.previewBaseScoreElement.textContent = '-';
                 this.previewDescriptionElement.textContent = 'Select cards to see a preview.';
            }
        } catch (error) {
            console.error('Error fetching hand preview:', error);
            this.previewHandTypeElement.textContent = 'Error';
            this.previewBaseScoreElement.textContent = '-';
            this.previewDescriptionElement.textContent = 'Could not fetch preview.';
        }
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

    formatHandType(handType) {
        return handType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    animateScoreCounting(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        const startTime = performance.now();
        const difference = end - start;
        
        const step = (timestamp) => {
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeProgress = this.easeOutQuart(progress);
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
    
    easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    animateCardDraw() {
        // Enhanced card drawing animation handled by animations module
        const cards = document.querySelectorAll('#player-hand .card');
        window.gameAnimations.queueAnimation(() => 
            window.gameAnimations.animateCardDeal(Array.from(cards))
        );
    }

    // Sort cards by rank
    async sortCardsByRank() {
        if (this.isSorting || !this.gameState || !this.gameState.hand || this.gameState.hand.length < 2) return;
        this.isSorting = true;
        this.setSortButtonsDisabled(true);

        try {
            const indexedHand = this.gameState.hand.map((card, index) => ({ card, originalIndex: index }));

            indexedHand.sort((a, b) => {
                const rankDiff = this.RANK_ORDER_MAP[b.card.rank] - this.RANK_ORDER_MAP[a.card.rank]; // Descending rank
                if (rankDiff !== 0) return rankDiff;
                return this.SUIT_ORDER_MAP[b.card.suit] - this.SUIT_ORDER_MAP[a.card.suit]; // Descending suit
            });

            const newVisualOrderOfOriginalIndices = indexedHand.map(item => item.originalIndex);
            const newGameStateHand = indexedHand.map(item => item.card);
            const newSelectedCards = new Set();
            indexedHand.forEach((item, newIndex) => {
                if (this.selectedCards.has(item.originalIndex)) {
                    newSelectedCards.add(newIndex);
                }
            });

            await window.gameAnimations.queueAnimation(() =>
                this.animateAndApplySort(newVisualOrderOfOriginalIndices, newGameStateHand, newSelectedCards)
            );
        } finally {
            this.isSorting = false;
            this.setSortButtonsDisabled(false);
        }
    }

    // Sort cards by suit
    async sortCardsBySuit() {
        if (this.isSorting || !this.gameState || !this.gameState.hand || this.gameState.hand.length < 2) return;
        this.isSorting = true;
        this.setSortButtonsDisabled(true);

        try {
            const indexedHand = this.gameState.hand.map((card, index) => ({ card, originalIndex: index }));

            indexedHand.sort((a, b) => {
                const suitDiff = this.SUIT_ORDER_MAP[b.card.suit] - this.SUIT_ORDER_MAP[a.card.suit]; // Descending suit
                if (suitDiff !== 0) return suitDiff;
                return this.RANK_ORDER_MAP[b.card.rank] - this.RANK_ORDER_MAP[a.card.rank]; // Descending rank
            });

            const newVisualOrderOfOriginalIndices = indexedHand.map(item => item.originalIndex);
            const newGameStateHand = indexedHand.map(item => item.card);
            const newSelectedCards = new Set();
            indexedHand.forEach((item, newIndex) => {
                if (this.selectedCards.has(item.originalIndex)) {
                    newSelectedCards.add(newIndex);
                }
            });

            await window.gameAnimations.queueAnimation(() =>
                this.animateAndApplySort(newVisualOrderOfOriginalIndices, newGameStateHand, newSelectedCards)
            );
        } finally {
            this.isSorting = false;
            this.setSortButtonsDisabled(false);
        }
    }

    setSortButtonsDisabled(disabled) {
        document.getElementById('sort-rank-btn').disabled = disabled;
        document.getElementById('sort-suit-btn').disabled = disabled;
    }

    async animateAndApplySort(newVisualOrderOfOriginalIndices, newGameStateHand, newSelectedCards) {
        const cardContainer = document.getElementById('player-hand');
        const currentCardElements = Array.from(cardContainer.children);

        // 1. Lift cards
        currentCardElements.forEach(cardElement => {
            cardElement.style.transition = 'transform 0.3s ease-out'; // Use ease-out for lift
            cardElement.style.transform = 'translateY(-30px)';
            cardElement.style.zIndex = '100'; // Ensure lifted cards are on top
        });

        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for lift animation

        // 2. Reorder DOM elements
        const reorderedDomElements = newVisualOrderOfOriginalIndices.map(originalIdx =>
            currentCardElements.find(c => parseInt(c.dataset.index) === originalIdx)
        ).filter(Boolean); // Filter out undefined if any card not found

        // Temporarily remove transition for instant re-ordering if using replaceChildren
        // reorderedDomElements.forEach(el => el.style.transition = 'none');
        cardContainer.replaceChildren(...reorderedDomElements);

        // 3. Update game state (hand and selected cards)
        this.gameState.hand = newGameStateHand;
        this.selectedCards = newSelectedCards;

        // 4. Update dataset.index and 'selected' class for each card in its new position
        // Also re-apply transitions for the lowering animation
        reorderedDomElements.forEach((cardElement, newIndex) => {
            cardElement.dataset.index = newIndex; // Update data-index to new position
            
            // Update 'selected' class based on new selectedCards set and new index
            if (this.selectedCards.has(newIndex)) {
                cardElement.classList.add('selected');
                 // Apply selection style directly, animation might be too flashy here
                cardElement.style.transform = 'translateY(-30px) scale(1.1)'; // Keep it lifted and scaled if selected
            } else {
                cardElement.classList.remove('selected');
                cardElement.style.transform = 'translateY(-30px)'; // Keep it lifted but not scaled
            }
            // Re-apply transition for lowering
            cardElement.style.transition = 'transform 0.3s ease-in'; // Use ease-in for settle
        });
        
        // Slight delay before lowering to ensure DOM updates are processed
        await new Promise(resolve => setTimeout(resolve, 50));

        // 5. Lower cards to their new positions
        reorderedDomElements.forEach((cardElement, newIndex) => {
            if (this.selectedCards.has(newIndex)) {
                 // If selected, animate to selected position
                window.gameAnimations.animateCardSelection(cardElement, true); // This will handle transform and z-index
            } else {
                // If not selected, animate to normal position
                cardElement.style.transform = 'translateY(0) scale(1)';
            }
            cardElement.style.zIndex = this.selectedCards.has(newIndex) ? '10' : '1'; // Reset z-index
        });

        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for lowering/settle animation

        // 6. Update UI elements that depend on selection/hand state
        this.updateButtonStates();
        this.updateSelectionCount();
        this.updateLivePreview(); // Update preview after sort
    }

    updateButtonStates() {
        document.getElementById('draw-cards-btn').disabled = 
            this.selectedCards.size === 0 || 
            this.gameState.draws_used >= this.gameState.max_draws;
            
        document.getElementById('play-hand-btn').disabled = this.selectedCards.size !== 5;
    }

    updateSelectionCount() {
        document.getElementById('selection-count').textContent = this.selectedCards.size;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pokerGame = new PokerGame();
});
