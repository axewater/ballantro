class PreviewManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        
        // DOM elements for live preview
        this.previewHandTypeElement = document.getElementById('preview-hand-type');
        this.previewBaseScoreElement = document.getElementById('preview-base-score');
        this.previewDescriptionElement = document.getElementById('preview-description');
        
        // Hand Payouts Data (mirrors backend)
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
        
        this.populatePayoutsTable();
    }

    async updateLivePreview(selectedCards, gameState) {
        if (!this.previewHandTypeElement || !this.previewBaseScoreElement || !this.previewDescriptionElement) {
            console.warn("Preview elements not found.");
            return;
        }

        if (selectedCards.size === 0) {
            this.previewHandTypeElement.textContent = '-';
            this.previewBaseScoreElement.textContent = '-';
            this.previewDescriptionElement.textContent = 'Select cards to see a preview.';
            return;
        }

        const cardsForPreview = Array.from(selectedCards)
            .map(index => gameState.hand[index])
            .filter(card => card);

        if (cardsForPreview.length === 0) {
            this.previewHandTypeElement.textContent = '-';
            this.previewBaseScoreElement.textContent = '-';
            this.previewDescriptionElement.textContent = 'Select cards to see a preview.';
            return;
        }

        try {
            const data = await this.apiClient.previewHand(cardsForPreview);

            if (data.success && data.preview) {
                this.previewHandTypeElement.textContent = this._formatHandType(data.preview.hand_type);
                this.previewBaseScoreElement.textContent = data.preview.score_info || `${data.preview.base_chips} × ${data.preview.multiplier}`;
                this.previewDescriptionElement.textContent = data.preview.description;
            } else if (data.success && !data.preview) {
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

    populatePayoutsTable() {
        const tableBody = document.getElementById('payouts-table-body');
        if (!tableBody) {
            console.error("Payouts table body not found!");
            return;
        }
        tableBody.innerHTML = '';

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

    _formatHandType(handType) {
        return handType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

// Export for use in other modules
window.PreviewManager = PreviewManager;
