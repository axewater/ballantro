class BossManager {
    constructor(game) {
        this.game = game;
        this.apiClient = game.apiClient;
        this.gameState = game.gameState;
        this.cardManager = game.cardManager;
        this.screenManager = game.screenManager;
        this.uiUpdater = game.uiUpdater;
        this.previewManager = game.previewManager;
        this.soundManager = game.soundManager;
    }

    showBossSelection() {
        this.soundManager.initialize();
        
        const bosses = [
            { type: "thief", name: "The Thief", emoji: "🥷", description: "Every time you click draw or play, he steals 1 card from your deck (it disappears forever)." },
            { type: "vampire", name: "The Vampire", emoji: "🧛", description: "Heart cards don't score any points. Your romantic cards are powerless against this creature of the night." },
            { type: "vip_only", name: "VIP Only", emoji: "🎩", description: "Club cards don't score any points. This exclusive establishment doesn't recognize your club membership." },
            { type: "frozen_ground", name: "Frozen Ground", emoji: "❄️", description: "Spade cards don't score any points. The frozen earth makes digging impossible." },
            { type: "blonde_vixen", name: "Blonde Vixen", emoji: "💎", description: "Diamond cards don't score any points. She's already taken all the diamonds for herself." },
            { type: "drunk", name: "The Drunk", emoji: "🍺", description: "All scoring is reduced by 25%. His intoxication affects your concentration and performance." },
            { type: "baron", name: "The Baron", emoji: "👑", description: "Costs $5 to play any hand. This greedy noble demands payment for every action you take." },
            { type: "death", name: "Death", emoji: "💀", description: "Your hand size is reduced by 2 cards. The grim reaper limits your options in life and cards." }
        ];
        
        const bossListContainer = document.getElementById('boss-list');
        bossListContainer.innerHTML = '';
        
        bosses.forEach(boss => {
            const bossCard = document.createElement('div');
            bossCard.className = 'boss-card';
            bossCard.innerHTML = `
                <div class="boss-card-header">
                    <div class="boss-emoji">${boss.emoji}</div>
                    <h3 class="boss-name">${boss.name}</h3>
                </div>
                <p class="boss-description">${boss.description}</p>
            `;
            
            bossCard.addEventListener('click', () => {
                this.startBossFight(boss);
            });
            
            bossListContainer.appendChild(bossCard);
        });
        
        this.screenManager.showScreen('boss-selection');
    }

    async startBossFight(selectedBoss) {
        try {
            this.cardManager.clearSelection();
            
            const data = await this.apiClient.newGame(true); // Debug mode
            if (data.success) {
                console.log("CLIENT: New boss fight started. Initial game state received:", data.game_state);
                
                this.gameState.setGameState(data.game_state);
                
                this.cardManager.clearSelection();
                this.cardManager.resetMapping(this.gameState.getHand().length);
                
                this.gameState.gameState.is_boss_round = true;
                this.gameState.gameState.active_boss = {
                    type: selectedBoss.type,
                    name: selectedBoss.name,
                    description: selectedBoss.description
                };
                
                this.gameState.gameState.current_round = 3;
                this.gameState.gameState.round_target = 1250;
                
                this.game.updateGameDisplay();
                this.screenManager.showScreen('game');
                this.previewManager.updateLivePreview(this.cardManager.selectedCards, this.gameState.gameState);
                this.uiUpdater.updateSortButtonAppearance(this.cardManager.activeSortType);
                this.uiUpdater.updateDebugModeIndicator(this.gameState.isDebugging());
                
                this.uiUpdater.updateButtonStates(this.gameState.gameState, 0);
                this.uiUpdater.elements.selectionCount.textContent = 0;
                
                logClientHand("Boss fight initial hand dealt:", this.gameState.getHand());
               
                const background = document.querySelector('.background');
                if (background) {
                    background.style.transition = 'background-image 0.5s ease';
                    background.style.backgroundImage = "";
                }
                
                const starfield = document.getElementById('starfield');
                if (starfield) {
                    starfield.style.transition = 'opacity 0.5s ease';
                    starfield.style.opacity = "1";
                }

                this.game.animateCardDraw();
                
                alert(`Boss Fight Started!\n\nFacing: ${selectedBoss.name}\n${selectedBoss.description}\n\nGood luck!`);
            } else {
                console.error('Failed to start boss fight:', data);
            }
        } catch (error) {
            console.error('Error starting boss fight:', error);
        }
    }
}

window.BossManager = BossManager;
