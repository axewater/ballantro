class ShopManager {
    constructor(game) {
        this.game = game;
        this.apiClient = game.apiClient;
        this.gameState = game.gameState;
        this.cardManager = game.cardManager;
        this.screenManager = game.screenManager;
        this.soundManager = game.soundManager;

        this.currentShopCards = [];
        this.shopRequestInFlight = false;

        // Sounds
        this.shopPurchaseSound = new Audio('/static/assets/sound/money_ching.mp3');
        this.roundCompleteSound = new Audio('/static/assets/sound/end_round.mp3');
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
        document.getElementById('shop-money-display').textContent = `$${shopState.money}`;
        this.currentShopCards = shopState.shop_items ? [...shopState.shop_items] : [];
        
        const shopCardsContainer = document.getElementById('shop-cards');
        shopCardsContainer.innerHTML = '';
        
        shopState.shop_items.forEach((item, index) => {
            const cardElement = item.item_type === 'card'
                 ? this.createShopCardElement(item, index)
                 : this.createTurboChipElement(item, index);
            shopCardsContainer.appendChild(cardElement);
        });
        
        document.getElementById('reroll-shop-btn').disabled = shopState.money < shopState.reroll_cost;
    }

    createShopCardElement(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = `shop-card ${card.suit.toLowerCase()}`;
        cardElement.dataset.index = index;
        
        const rankElement = document.createElement('div');
        rankElement.className = 'card-rank';
        rankElement.textContent = card.rank;
        
        const iconArea = document.createElement('div');
        iconArea.className = 'card-icon-area';

        if (card.effects && card.effects.length > 0) {
            card.effects.forEach(effectId => {
                const effectInfo = window.EffectDescriptions && window.EffectDescriptions[effectId];
                if (effectInfo) {
                    let iconElement = null;
                    if (effectId.startsWith('bonus_chips')) {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-chips-icon'; 
                        iconElement.textContent = '✚';
                        iconElement.dataset.tooltipText = `<strong>${effectInfo.name}</strong><br>${effectInfo.description}`;
                    } else if (effectId.startsWith('bonus_multiplier')) {
                        iconElement = document.createElement('div');
                        iconElement.className = 'card-bonus-multiplier-icon';
                        iconElement.textContent = '★';
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
        suitElement.textContent = this.cardManager.getSuitSymbol(card.suit);
                
        const priceElement = document.createElement('div');
        priceElement.className = 'card-price';
        priceElement.textContent = '$3';
        
        cardElement.appendChild(rankElement);
        cardElement.appendChild(iconArea);
        cardElement.appendChild(suitElement);
        cardElement.appendChild(priceElement);

        cardElement.addEventListener('mouseenter', () => {
            if (window.playCardHoverSound) window.playCardHoverSound();
        });

        cardElement.addEventListener('click', (e) =>
            this.buyCard(
                parseInt(e.currentTarget.dataset.index, 10),
                e.currentTarget
            )
        );
        
        return cardElement;
    }

    createTurboChipElement(chip, index) {
        const el = document.createElement('div');
        el.className = 'shop-card turbo';
        el.dataset.index = index;
        const iconChar = (window.TurboChipIcons && window.TurboChipIcons[chip.effect_id]) || '⚡';
        el.innerHTML = `<div class="card-rank">${iconChar}</div>`; 
        
        el.dataset.tooltipText = `<strong>${chip.name}</strong><br>${chip.description}`;

        const price = document.createElement('div');
        price.className = 'card-price';
        price.textContent = '$1';
        el.appendChild(price);
        
        el.addEventListener('click', (e) =>
            this.buyCard(
                parseInt(e.currentTarget.dataset.index, 10),
                e.currentTarget
            )
        );

        el.addEventListener('mouseover', (event) => window.tooltipManager.showTooltip(el.dataset.tooltipText, event));
        el.addEventListener('mouseout', () => window.tooltipManager.hideTooltip());
        el.addEventListener('mousemove', (event) => window.tooltipManager.updatePosition(event));
        
        el.addEventListener('mouseenter', () => {
            if (window.playCardHoverSound) window.playCardHoverSound();
        });

        return el;
    }

    async rerollShop() {
        try {
            const data = await this.apiClient.rerollShop(this.gameState.sessionId);
            
            if (data.success) {
                if (this.soundManager) {
                    this.soundManager.playRerollSound();
                }
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

    async buyCard(cardIndex, clickedElement = null) {
        if (this.shopRequestInFlight) return;
        this.shopRequestInFlight = true;
        document.getElementById('next-round-btn').disabled = true;

        const boughtCardDetails = this.currentShopCards && this.currentShopCards[cardIndex]
                                  ? this.currentShopCards[cardIndex]
                                  : null;

        try {
            const data = await this.apiClient.buyCard(this.gameState.sessionId, cardIndex);
            
            if (data.success) {
                this.shopPurchaseSound.currentTime = 0;
                this.shopPurchaseSound.play().catch(error => console.warn("CLIENT: Could not play shop purchase sound:", error));

                this.gameState.setGameState(data.game_state);
                
                if (boughtCardDetails) {
                    const cardSuit = boughtCardDetails.suit ? (boughtCardDetails.suit.charAt(0).toUpperCase() + boughtCardDetails.suit.slice(1)) : "";
                    const cardName = boughtCardDetails.item_type === "card"
                        ? `${this.game.formatCardRank(boughtCardDetails.rank)} of ${cardSuit}`
                        : boughtCardDetails.name;
                    const deckCount = this.gameState.getDeckRemaining();
                    console.log(`PURCHASE CONFIRMATION: Bought '${cardName}'. Added to deck. Total cards: ${deckCount}`);
                } else {
                    console.warn("Could not retrieve bought card details for logging purchase.");
                }

                if (clickedElement) {
                    clickedElement.classList.add('sold');
                    clickedElement.style.pointerEvents = 'none';
                }

                const shopCardsContainer = document.getElementById('shop-cards');
                
                if (this.currentShopCards && this.currentShopCards.length > cardIndex) {
                    this.currentShopCards.splice(cardIndex, 1);
                }
                const remainingEls = shopCardsContainer.querySelectorAll('.shop-card:not(.sold)');
                remainingEls.forEach((el, newIdx) => {
                    el.dataset.index = newIdx;
                });
                
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
            document.getElementById('next-round-btn').disabled = false;
        }
    }

    async proceedToNextRound() {
        if (this.shopRequestInFlight) return;
        try {
            const data = await this.apiClient.proceedToNextRound(this.gameState.sessionId);
            
            if (data.success) {
                this.gameState.setGameState(data.game_state);
                
                window.gameAnimations.queueAnimation(() => 
                    window.gameAnimations.animateRoundTransition(this.gameState.getCurrentRound())
                ).then(() => {
                    this.game.finalizeHandUpdateAndDisplay();
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
}

window.ShopManager = ShopManager;
