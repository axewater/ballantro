class ApiClient {
    constructor() {
        this.baseUrl = '';
    }

    async newGame() {
        try {
            const response = await fetch('/api/new_game', {
                method: 'POST'
            });
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

    async saveScore(name, score) {
        try {
            const response = await fetch('/api/save_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
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
}

// Export for use in other modules
window.ApiClient = ApiClient;
