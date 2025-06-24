class TooltipManager {
    constructor() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'tooltip';
        document.body.appendChild(this.tooltipElement);
        this.isVisible = false;

        // Bind mousemove globally to update position if visible
        // document.addEventListener('mousemove', this.updatePosition.bind(this));
    }

    showTooltip(htmlContent, event) {
        this.tooltipElement.innerHTML = htmlContent;
        this.updatePosition(event); // Initial position
        this.tooltipElement.style.display = 'block';
        // Use a slight delay for opacity transition to take effect after display: block
        setTimeout(() => {
            this.tooltipElement.style.opacity = '1';
        }, 10);
        this.isVisible = true;
    }

    hideTooltip() {
        this.tooltipElement.style.opacity = '0';
        // Wait for opacity transition to finish before setting display: none
        setTimeout(() => {
            if (this.tooltipElement.style.opacity === '0') { // Check if still meant to be hidden
                this.tooltipElement.style.display = 'none';
            }
        }, 200); // Corresponds to CSS transition time
        this.isVisible = false;
    }

    updatePosition(event) {
        if (!this.isVisible) return;

        let x = event.clientX;
        let y = event.clientY;

        // Adjust position to avoid tooltip overlapping cursor
        const offsetX = 15;
        const offsetY = 15;

        this.tooltipElement.style.left = `${x + offsetX}px`;
        this.tooltipElement.style.top = `${y + offsetY}px`;

        // Boundary checks to keep tooltip within viewport
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + offsetX + tooltipRect.width > viewportWidth) {
            this.tooltipElement.style.left = `${x - offsetX - tooltipRect.width}px`;
        }
        if (y + offsetY + tooltipRect.height > viewportHeight) {
            this.tooltipElement.style.top = `${y - offsetY - tooltipRect.height}px`;
        }
    }
}

// Initialize TooltipManager globally
window.tooltipManager = new TooltipManager();
