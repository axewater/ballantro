class ScreenManager {
    constructor() {
        this.currentScreen = 'startup';
        this.previousScreen = null;
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        this.previousScreen = this.currentScreen;
        // Show the requested screen
        if (screenName === 'boss-selection') screenName = 'boss-selection';
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    getCurrentScreen() {
        return this.currentScreen;
    }

    getPreviousScreen() {
        return this.previousScreen;
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

    showRemainingDeckModal() {
        document.getElementById('remaining-deck-modal').classList.add('active');
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

        // Sort and display cards
        const RANK_ORDER_MAP = { 
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 
        };

        for (const suit in cardsBySuit) {
            cardsBySuit[suit].sort((a, b) => {
                return RANK_ORDER_MAP[b.rank] - RANK_ORDER_MAP[a.rank];
            });

            cardsBySuit[suit].forEach(card => {
                const miniCardElement = document.createElement('div');
                miniCardElement.className = 'mini-card';
                const suitSymbol = this._getSuitSymbol(card.suit);
                miniCardElement.textContent = `${card.rank}${suitSymbol}`;

                // Mark special cards
                if (card.effects && card.effects.length > 0) {
                    miniCardElement.classList.add('special');
                    miniCardElement.textContent += '✦';
                }

                if (card.suit === 'hearts' || card.suit === 'diamonds') {
                    // Four-color deck
                    if (card.suit === 'hearts') {
                        miniCardElement.style.color = '#e74c3c'; // red
                    } else { // diamonds
                        miniCardElement.style.color = '#3498db'; // blue
                    }
                } else {
                    miniCardElement.style.color =
                        card.suit === 'clubs' ? '#2ecc71' : '#cccccc'; // green or grey
                }
                
                suitContainers[suit].appendChild(miniCardElement);
            });
            
            if (cardsBySuit[suit].length === 0) {
                suitContainers[suit].innerHTML = '<em>No cards of this suit remaining.</em>';
            }
        }
    }

    _getSuitSymbol(suit) {
        switch (suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '';
        }
    }
}

// Export for use in other modules
window.ScreenManager = ScreenManager;
