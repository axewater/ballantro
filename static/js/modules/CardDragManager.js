class CardDragManager {
    constructor(cardManager, gameState) {
        this.cardManager = cardManager;
        this.gameState = gameState;

        // Drag state
        this.isDragging = false;
        this.draggedIndex = null;
        this.draggedElement = null;
        this.dragPreview = null;
        this.dropZoneIndicator = null;
        this.hoverIndex = null;

        // Mouse tracking for smooth animation
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.velocityX = 0;

        // Hysteresis for hover index (prevents rapid flicking)
        this.lastHoverChangeX = null;

        // Card positions cache
        this.cardPositions = [];

        // Container reference
        this.container = null;

        // Animation frame ID
        this.animationFrameId = null;
    }

    initialize(container) {
        this.container = container;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.container) return;

        // Mouse events
        this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Touch events for mobile
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleMouseDown(e) {
        // Only left mouse button
        if (e.button !== 0) return;

        // Check if we can drag (not during sorting, not right-click drag)
        if (this.cardManager.isSorting || this.cardManager.rightClickDragActive) return;

        // Find the card element
        let cardElement = e.target;
        while (cardElement && !cardElement.classList.contains('card')) {
            cardElement = cardElement.parentElement;
        }

        if (!cardElement || !cardElement.dataset.index) return;

        // Prevent default to avoid text selection
        e.preventDefault();

        this.startDrag(cardElement, e.clientX, e.clientY);
    }

    handleTouchStart(e) {
        if (this.cardManager.isSorting || this.cardManager.rightClickDragActive) return;

        let cardElement = e.target;
        while (cardElement && !cardElement.classList.contains('card')) {
            cardElement = cardElement.parentElement;
        }

        if (!cardElement || !cardElement.dataset.index) return;

        e.preventDefault();

        const touch = e.touches[0];
        this.startDrag(cardElement, touch.clientX, touch.clientY);
    }

    startDrag(cardElement, clientX, clientY) {
        this.isDragging = true;
        this.draggedIndex = parseInt(cardElement.dataset.index, 10);
        this.draggedElement = cardElement;
        this.mouseX = clientX;
        this.mouseY = clientY;
        this.lastMouseX = clientX;
        this.lastMouseY = clientY;

        // Play sound if available
        if (window.playCardHoverSound) {
            window.playCardHoverSound();
        }

        // Cache all card positions
        this.cacheCardPositions();

        // Create drag preview
        this.createDragPreview(cardElement, clientX, clientY);

        // Create drop zone indicator
        this.createDropZoneIndicator();

        // Add dragging class to original card
        cardElement.classList.add('card-dragging');
        cardElement.style.pointerEvents = 'none';

        // Start animation loop
        this.startAnimationLoop();

        // Add body class to change cursor
        document.body.classList.add('card-drag-active');
    }

    cacheCardPositions() {
        const cards = Array.from(this.container.querySelectorAll('.card'));
        this.cardPositions = cards.map((card) => {
            const rect = card.getBoundingClientRect();
            return {
                element: card,
                index: parseInt(card.dataset.index, 10),
                left: rect.left,
                right: rect.right,
                centerX: rect.left + rect.width / 2,
                width: rect.width
            };
        });
    }

    createDragPreview(cardElement, x, y) {
        // Clone the card for drag preview
        this.dragPreview = cardElement.cloneNode(true);
        this.dragPreview.classList.add('card-drag-preview');
        this.dragPreview.classList.remove('selected', 'card-dragging');
        this.dragPreview.style.position = 'fixed';
        this.dragPreview.style.pointerEvents = 'none';
        this.dragPreview.style.zIndex = '9999';

        // Position at cursor
        const rect = cardElement.getBoundingClientRect();
        this.dragPreview.style.width = rect.width + 'px';
        this.dragPreview.style.height = rect.height + 'px';
        this.dragPreview.style.left = x - rect.width / 2 + 'px';
        this.dragPreview.style.top = y - rect.height / 2 + 'px';

        document.body.appendChild(this.dragPreview);
    }

    createDropZoneIndicator() {
        // Clean up any existing drop zone indicators first
        const existingIndicators = this.container.querySelectorAll('.card-drop-zone');
        existingIndicators.forEach(indicator => indicator.remove());

        // Only create if we don't already have one stored
        if (this.dropZoneIndicator && this.dropZoneIndicator.parentNode) {
            return;
        }

        this.dropZoneIndicator = document.createElement('div');
        this.dropZoneIndicator.className = 'card-drop-zone';
        this.dropZoneIndicator.style.position = 'absolute';
        this.dropZoneIndicator.style.width = '4px';
        this.dropZoneIndicator.style.height = '140px';
        this.dropZoneIndicator.style.top = '50%';
        this.dropZoneIndicator.style.transform = 'translateY(-50%)';
        this.dropZoneIndicator.style.opacity = '0';
        this.dropZoneIndicator.style.transition = 'opacity 0.2s ease, left 0.2s ease';
        this.container.appendChild(this.dropZoneIndicator);
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
    }

    startAnimationLoop() {
        const animate = () => {
            if (!this.isDragging) return;

            // Calculate velocity for tilt effect
            this.velocityX = this.mouseX - this.lastMouseX;
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;

            // Update drag preview position with smooth follow
            if (this.dragPreview) {
                const currentLeft = parseFloat(this.dragPreview.style.left) || this.mouseX;
                const currentTop = parseFloat(this.dragPreview.style.top) || this.mouseY;

                // Smooth interpolation for natural feel
                const smoothFactor = 0.3;
                const targetLeft = this.mouseX - 40; // 40 = half card width
                const targetTop = this.mouseY - 60; // 60 = half card height

                const newLeft = currentLeft + (targetLeft - currentLeft) * smoothFactor;
                const newTop = currentTop + (targetTop - currentTop) * smoothFactor;

                this.dragPreview.style.left = newLeft + 'px';
                this.dragPreview.style.top = newTop + 'px';

                // Add rotation based on velocity
                const maxRotation = 8; // degrees
                const rotation = Math.max(-maxRotation, Math.min(maxRotation, this.velocityX * 0.5));
                this.dragPreview.style.transform = `rotate(${rotation}deg) scale(1.15)`;
            }

            // Update hover index and card positions
            this.updateHoverIndex();
            this.updateCardShifts();
            this.updateDropZoneIndicator();

            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    updateHoverIndex() {
        const containerRect = this.container.getBoundingClientRect();
        const relativeX = this.mouseX - containerRect.left;

        // Hysteresis constant - minimum pixels mouse must move before changing position
        const HYSTERESIS_THRESHOLD = 30;

        // Calculate what the hover index would be
        let calculatedHoverIndex = 0;

        for (let i = 0; i < this.cardPositions.length; i++) {
            const pos = this.cardPositions[i];

            // Skip the dragged card itself
            if (pos.index === this.draggedIndex) continue;

            const cardCenterX = pos.centerX - containerRect.left;

            if (relativeX > cardCenterX) {
                calculatedHoverIndex = i + 1;
            }
        }

        // Clamp to valid range
        calculatedHoverIndex = Math.max(0, Math.min(this.cardPositions.length, calculatedHoverIndex));

        // Adjust if dragging from left to right
        if (calculatedHoverIndex > this.draggedIndex) {
            calculatedHoverIndex = Math.max(0, calculatedHoverIndex - 1);
        }

        // Apply hysteresis - only update if:
        // 1. This is the first calculation (hoverIndex is null), OR
        // 2. The calculated index is different AND we've moved far enough since last change
        if (this.hoverIndex === null) {
            // First time - accept the calculated index
            this.hoverIndex = calculatedHoverIndex;
            this.lastHoverChangeX = relativeX;
        } else if (calculatedHoverIndex !== this.hoverIndex) {
            // Index wants to change - check if we've moved far enough
            if (this.lastHoverChangeX === null || Math.abs(relativeX - this.lastHoverChangeX) >= HYSTERESIS_THRESHOLD) {
                this.hoverIndex = calculatedHoverIndex;
                this.lastHoverChangeX = relativeX;
            }
        }
    }

    updateCardShifts() {
        const gap = 92; // Card width (80px) + gap (12px)

        this.cardPositions.forEach((pos) => {
            const card = pos.element;

            // Skip the dragged card
            if (pos.index === this.draggedIndex) return;

            let shift = 0;

            // Determine if this card needs to shift
            if (this.draggedIndex < this.hoverIndex) {
                // Dragging right
                if (pos.index > this.draggedIndex && pos.index <= this.hoverIndex) {
                    shift = -gap;
                }
            } else if (this.draggedIndex > this.hoverIndex) {
                // Dragging left
                if (pos.index >= this.hoverIndex && pos.index < this.draggedIndex) {
                    shift = gap;
                }
            }

            // Apply smooth transform
            card.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.transform = `translateX(${shift}px)`;
        });
    }

    updateDropZoneIndicator() {
        if (!this.dropZoneIndicator) return;

        // Calculate position for drop zone indicator
        const containerRect = this.container.getBoundingClientRect();
        let indicatorLeft = 0;

        if (this.hoverIndex === 0) {
            // Before first card
            indicatorLeft = -8;
        } else if (this.hoverIndex >= this.cardPositions.length) {
            // After last card
            const lastCard = this.cardPositions[this.cardPositions.length - 1];
            indicatorLeft = lastCard.right - containerRect.left + 8;
        } else {
            // Between cards
            const targetPos = this.cardPositions.find(p => p.index === this.hoverIndex);
            if (targetPos) {
                indicatorLeft = targetPos.left - containerRect.left - 8;
            }
        }

        this.dropZoneIndicator.style.left = indicatorLeft + 'px';
        this.dropZoneIndicator.style.opacity = '1';
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        this.endDrag();
    }

    handleTouchEnd(e) {
        if (!this.isDragging) return;
        this.endDrag();
    }

    endDrag() {
        // Cancel animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Play drop sound if available
        if (window.pokerGame && window.pokerGame.soundManager) {
            window.pokerGame.soundManager.playCardClickSound();
        }

        // Perform the reorder
        this.performReorder();

        // Clean up
        this.cleanup();
    }

    async performReorder() {
        if (this.draggedIndex === this.hoverIndex) {
            // No change needed
            this.resetCardPositions();
            return;
        }

        // Calculate the new visual order
        const cardElements = Array.from(this.container.querySelectorAll('.card'));
        const newOrder = [];

        // Build new order array
        for (let i = 0; i < cardElements.length; i++) {
            if (i === this.draggedIndex) continue; // Skip the dragged card
            newOrder.push(cardElements[i]);
        }

        // Insert dragged card at new position
        newOrder.splice(this.hoverIndex, 0, this.draggedElement);

        // Update the visualToLogical mapping
        const newVisualToLogical = newOrder.map(el => {
            const oldVisualIndex = parseInt(el.dataset.index, 10);
            return this.cardManager.visualToLogical[oldVisualIndex];
        });

        // Prepare dragged card for instant placement
        // Remove the dragging class to make it visible
        if (this.draggedElement) {
            this.draggedElement.classList.remove('card-dragging');
            // Clear any transforms from shifting
            this.draggedElement.style.transform = '';
            // Disable transitions temporarily for instant placement
            this.draggedElement.style.transition = 'none';
        }

        // Clear all card transforms before reordering
        cardElements.forEach(card => {
            card.style.transform = '';
        });

        // Brief flash effect on dropped card
        await this.animateDrop();

        // Update CardManager mapping
        this.cardManager.visualToLogical = newVisualToLogical;

        // Update selected cards set to use new visual indices
        const newSelectedCards = new Set();
        this.cardManager.selectedCards.forEach(oldVisualIndex => {
            const backendIndex = this.cardManager.visualToLogical[oldVisualIndex];
            const newVisualIndex = newVisualToLogical.indexOf(backendIndex);
            if (newVisualIndex !== -1) {
                newSelectedCards.add(newVisualIndex);
            }
        });
        this.cardManager.selectedCards = newSelectedCards;

        // Reorder DOM elements (instant, no animation)
        this.container.replaceChildren(...newOrder);

        // Update data-index attributes
        newOrder.forEach((card, newIndex) => {
            card.dataset.index = newIndex;

            // Re-enable transitions after instant placement
            card.style.transition = '';

            // Update selected class
            if (newSelectedCards.has(newIndex)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Trigger selection change callback if needed
        if (window.pokerGame) {
            const game = window.pokerGame;
            game.uiUpdater.updateButtonStates(game.gameState.gameState, this.cardManager.getSelectedCount());
            game.uiUpdater.elements.selectionCount.textContent = this.cardManager.getSelectedCount();
            if (game.previewManager) {
                game.previewManager.updateLivePreview(this.cardManager.selectedCards, game.gameState.gameState);
            }
        }
    }

    animateDrop() {
        return new Promise((resolve) => {
            // Brief flash effect on dropped card only
            if (this.draggedElement) {
                this.draggedElement.classList.add('card-drop-animation');

                // Remove flash effect after animation
                setTimeout(() => {
                    if (this.draggedElement) {
                        this.draggedElement.classList.remove('card-drop-animation');
                    }
                    resolve();
                }, 300);
            } else {
                resolve();
            }
        });
    }

    resetCardPositions() {
        // Reset all card transforms
        this.cardPositions.forEach((pos) => {
            pos.element.style.transition = 'transform 0.3s ease';
            pos.element.style.transform = '';
        });
    }

    cleanup() {
        // Remove dragging class
        if (this.draggedElement) {
            this.draggedElement.classList.remove('card-dragging');
            this.draggedElement.style.pointerEvents = '';
            this.draggedElement.style.transition = '';
        }

        // Remove drag preview
        if (this.dragPreview && this.dragPreview.parentNode) {
            this.dragPreview.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            this.dragPreview.style.opacity = '0';
            this.dragPreview.style.transform = 'scale(0.8) rotate(0deg)';

            setTimeout(() => {
                if (this.dragPreview && this.dragPreview.parentNode) {
                    this.dragPreview.parentNode.removeChild(this.dragPreview);
                }
            }, 200);
        }

        // Remove drop zone indicator
        if (this.dropZoneIndicator && this.dropZoneIndicator.parentNode) {
            this.dropZoneIndicator.style.opacity = '0';

            setTimeout(() => {
                if (this.dropZoneIndicator && this.dropZoneIndicator.parentNode) {
                    this.dropZoneIndicator.parentNode.removeChild(this.dropZoneIndicator);
                }
            }, 200);
        }

        // Remove body class
        document.body.classList.remove('card-drag-active');

        // Reset state
        this.isDragging = false;
        this.draggedIndex = null;
        this.draggedElement = null;
        this.dragPreview = null;
        this.dropZoneIndicator = null;
        this.hoverIndex = null;
        this.lastHoverChangeX = null;
        this.cardPositions = [];
    }

    destroy() {
        // Clean up if dragging
        if (this.isDragging) {
            this.cleanup();
        }

        // Remove event listeners would require storing bound function references
        // For now, the manager will be recreated on each game start
    }
}

// Export to global scope
window.CardDragManager = CardDragManager;