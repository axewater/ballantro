class GameState {
    constructor() {
        this.gameState = null;
        this.sessionId = null;
        this.handResult = null;
        this.roundComplete = false;
        this.moneyAwardedThisRound = 0;
    }

    setGameState(gameState) {
        this.gameState = gameState;
        this.sessionId = gameState.session_id;
    }

    setHandResult(handResult, roundComplete = false, moneyAwarded = 0) {
        this.handResult = handResult;
        this.roundComplete = roundComplete;
        this.moneyAwardedThisRound = moneyAwarded;
    }

    getCurrentRound() {
        return this.gameState?.current_round || 1;
    }

    getTotalScore() {
        return this.gameState?.total_score || 0;
    }

    getMoney() {
        return this.gameState?.money || 0;
    }

    getRoundTarget() {
        return this.gameState?.round_target || 300;
    }

    getHandsPlayed() {
        return this.gameState?.hands_played || 0;
    }

    getMaxHands() {
        return this.gameState?.max_hands || 4;
    }

    getDrawsUsed() {
        return this.gameState?.draws_used || 0;
    }

    getMaxDraws() {
        return this.gameState?.max_draws || 3;
    }

    getDeckRemaining() {
        return this.gameState?.deck_remaining || 52;
    }

    getHand() {
        return this.gameState?.hand || [];
    }

    isInShop() {
        return this.gameState?.in_shop || false;
    }

    getShopCards() {
        return this.gameState?.shop_cards || [];
    }

    isGameOver() {
        return this.gameState?.is_game_over || false;
    }

    isVictory() {
        return this.gameState?.is_victory || false;
    }

    canDraw(selectedCount) {
        return selectedCount > 0 && this.getDrawsUsed() < this.getMaxDraws();
    }

    canPlayHand(selectedCount) {
        return selectedCount === 5;
    }

    reset() {
        this.gameState = null;
        this.sessionId = null;
        this.handResult = null;
        this.roundComplete = false;
        this.moneyAwardedThisRound = 0;
    }
}

// Export for use in other modules
window.GameState = GameState;
