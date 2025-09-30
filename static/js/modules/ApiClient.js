class ApiClient {
    constructor() {
        this.baseUrl = '';
    }

    async newGame(debugMode = false) {
        try {
            const response = await fetch('/api/new_game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ debug_mode: debugMode })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error starting new game:', error);
            throw error;
        }
    }

    async drawCards(sessionId, selectedCards) {
        try {
            const response = await fetch('/api/draw_cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    selected_cards: selectedCards
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error drawing cards:', error);
            throw error;
        }
    }

    async playHand(sessionId, selectedCards) {
        try {
            const response = await fetch('/api/play_hand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    selected_cards: selectedCards
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error playing hand:', error);
            throw error;
        }
    }

    async getHighscores() {
        try {
            const response = await fetch('/api/highscores');
            return await response.json();
        } catch (error) {
            console.error('Error getting highscores:', error);
            throw error;
        }
    }

    async saveScore(name, sessionId) {
        try {
            const response = await fetch('/api/save_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, session_id: sessionId })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving score:', error);
            throw error;
        }
    }

    async previewHand(cards) {
        try {
            const response = await fetch('/api/preview_hand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cards)
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching hand preview:', error);
            throw error;
        }
    }

    async getRemainingDeck(sessionId) {
        try {
            const response = await fetch(`/api/remaining_deck/${sessionId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching remaining deck:', error);
            throw error;
        }
    }

    async getShopState(sessionId) {
        try {
            const response = await fetch(`/api/shop/${sessionId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching shop state:', error);
            throw error;
        }
    }

    async rerollShop(sessionId) {
        try {
            const response = await fetch(`/api/shop/${sessionId}/reroll`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Error rerolling shop:', error);
            throw error;
        }
    }

    async buyCard(sessionId, cardIndex) {
        try {
            const response = await fetch(`/api/shop/${sessionId}/buy/${cardIndex}`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Error buying card:', error);
            throw error;
        }
    }

    async proceedToNextRound(sessionId) {
        try {
            const response = await fetch(`/api/shop/${sessionId}/next_round`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Error proceeding to next round:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.ApiClient = ApiClient;
