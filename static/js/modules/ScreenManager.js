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
                miniCardElement.className = `mini-card ${card.suit.toLowerCase()}`;
                const suitSymbol = this._getSuitSymbol(card.suit);
                
                // Create content container
                const contentContainer = document.createElement('div');
                contentContainer.className = 'mini-card-content';
                
                // Add rank and suit
                const rankSpan = document.createElement('span');
                rankSpan.textContent = card.rank;
                rankSpan.className = 'mini-card-rank';
                
                const suitSpan = document.createElement('span');
                suitSpan.textContent = suitSymbol;
                suitSpan.className = 'mini-card-suit';
                
                contentContainer.appendChild(rankSpan);
                contentContainer.appendChild(suitSpan);
                miniCardElement.appendChild(contentContainer);

                // Mark special cards
                if (card.effects && card.effects.length > 0) {
                    miniCardElement.classList.add('special');
                    
                    // Add effect icons based on effect type
                    card.effects.forEach(effect => {
                        const effectIcon = document.createElement('div');
                        effectIcon.className = 'mini-card-effect';
                        
                        if (effect.startsWith('bonus_chips')) {
                            effectIcon.textContent = '✚';
                            effectIcon.style.backgroundColor = '#34adee';
                        } else if (effect.startsWith('bonus_multiplier')) {
                            effectIcon.textContent = '★';
                            effectIcon.style.backgroundColor = '#e74c3c';
                        } else if (effect.startsWith('bonus_money')) {
                            effectIcon.textContent = '$';
                            effectIcon.style.backgroundColor = '#2ecc71';
                        } else if (effect === 'bonus_random') {
                            effectIcon.textContent = '?';
                            effectIcon.style.backgroundColor = '#f1c40f';
                        }
                        
                        miniCardElement.appendChild(effectIcon);
                    });
                }

                if (card.suit === 'hearts' || card.suit === 'diamonds') {
                    // Four-color deck
                    if (card.suit === 'hearts') {
                        rankSpan.style.color = '#e74c3c'; // red
                        suitSpan.style.color = '#e74c3c'; // red
                    } else { // diamonds
                        rankSpan.style.color = '#3498db'; // blue
                        suitSpan.style.color = '#3498db'; // blue
                    }
                } else {
                    const color = card.suit === 'clubs' ? '#2ecc71' : '#000000'; // green or black
                    rankSpan.style.color = color;
                    suitSpan.style.color = color;
                }
                
                // Add tooltip for card effects
                if (card.effects && card.effects.length > 0) {
                    const tooltipText = this._generateEffectTooltip(card);
                    miniCardElement.dataset.tooltipText = tooltipText;
                    
                    miniCardElement.addEventListener('mouseover', (event) => window.tooltipManager.showTooltip(tooltipText, event));
                    miniCardElement.addEventListener('mouseout', () => window.tooltipManager.hideTooltip());
                    miniCardElement.addEventListener('mousemove', (event) => window.tooltipManager.updatePosition(event));
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
    
    _generateEffectTooltip(card) {
        if (!card.effects || card.effects.length === 0) return '';
        
        let tooltipHTML = `<strong>${card.rank} of ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}</strong><br>`;
        
        card.effects.forEach(effect => {
            const effectInfo = window.EffectDescriptions && window.EffectDescriptions[effect];
            if (effectInfo) {
                tooltipHTML += `<div style="margin-top: 5px;">`;
                tooltipHTML += `<strong>${effectInfo.name}:</strong> ${effectInfo.description}`;
                tooltipHTML += `</div>`;
            } else {
                // Fallback if effect description not found
                tooltipHTML += `<div style="margin-top: 5px;">`;
                tooltipHTML += `<strong>Special Effect:</strong> ${effect.replace(/_/g, ' ')}`;
                tooltipHTML += `</div>`;
            }
        });
        
        return tooltipHTML;
    }
}

// Export for use in other modules
window.ScreenManager = ScreenManager;
