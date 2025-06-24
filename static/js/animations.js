class GameAnimations {
    constructor() {
        this.animationQueue = [];
        this.isAnimating = false;
    }

    // Queue animation to prevent overlapping
    queueAnimation(animationFunction) {
        return new Promise((resolve) => {
            // Store the original function with its resolver
            const wrappedFunction = async () => {
                await animationFunction();
                resolve();
            };
            
            this.animationQueue.push(wrappedFunction);
            if (!this.isAnimating) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.animationQueue.length === 0) {
            this.isAnimating = false;
            return;
        }

        this.isAnimating = true;
        const nextAnimation = this.animationQueue.shift();
        await nextAnimation();
        this.processQueue();
    }

    // Card dealing animation
    animateCardDeal(cards, delay = 100) {
        return new Promise((resolve) => {
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(-50px) scale(0.8) rotateY(180deg)';
                    card.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    
                    // Trigger animation
                    requestAnimationFrame(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0) scale(1) rotateY(0deg)';
                    });
                    
                    // Resolve when last card is dealt
                    if (index === cards.length - 1) {
                        setTimeout(resolve, 600);
                    }
                }, index * delay);
            });
        });
    }

    // Card selection animation with enhanced effects
    animateCardSelection(card, isSelected) {
        // The CardManager has already added/removed the '.selected' class.
        // This function ensures that inline styles don't override CSS class rules,
        // particularly for 'transform', 'boxShadow', and 'filter'.

        // Clear potentially conflicting inline styles so CSS classes take precedence.
        // Transitions will be handled by CSS (e.g., .card { transition: all 0.3s ease; })
        card.style.transform = ''; 
        card.style.boxShadow = '';
        card.style.filter = '';
        // card.style.transition = ''; // Explicitly let CSS manage transitions.        
        
    }

    // Enhanced card scoring animation
    animateCardScoring(cards, handResult) {
        return new Promise((resolve) => {
            // Phase 1: Lift and highlight cards
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    card.style.transform = 'translateY(-30px) scale(1.15) rotateZ(1deg)';
                    card.style.boxShadow = `
                        0 25px 50px rgba(240, 147, 251, 0.8),
                        0 0 0 3px rgba(240, 147, 251, 0.5),
                        inset 0 2px 0 rgba(255, 255, 255, 0.4)
                    `;
                    card.style.filter = 'brightness(1.3) saturate(1.4)';
                    
                    // Add sparkle effect
                    this.addSparkleEffect(card);
                    
                    // Shake effect
                    setTimeout(() => {
                        this.shakeCard(card, 3, 200);
                    }, 400);
                }, index * 150);
            });

            // Phase 2: Score counting animation
            setTimeout(() => {
                this.animateScoreCount(handResult);
                
                // Phase 3: Settle cards
                setTimeout(() => {
                    cards.forEach(card => {
                        card.style.transition = 'all 0.5s ease-out';
                        card.style.transform = 'translateY(-10px) scale(1.05)';
                        card.style.filter = 'brightness(1.1) saturate(1.1)';
                        this.removeSparkleEffect(card);
                    });
                    
                    setTimeout(resolve, 500);
                }, 1000);
            }, cards.length * 150 + 500);
        });
    }

    // Score counting with visual effects
    animateScoreCount(handResult) {
        const elements = {
            cardChips: document.getElementById('card-chips'),
            baseChips: document.getElementById('base-chips'),
            multiplier: document.getElementById('multiplier'),
            totalScore: document.getElementById('hand-score')
        };

        // Animate each score component
        this.countUpNumber(elements.cardChips, 0, handResult.card_chips, 800);
        
        setTimeout(() => {
            this.countUpNumber(elements.baseChips, 0, handResult.base_chips, 600);
        }, 300);
        
        setTimeout(() => {
            elements.multiplier.style.animation = 'multiplierPulse 0.8s ease-in-out';
            elements.multiplier.textContent = `×${handResult.multiplier}`;
        }, 600);
        
        setTimeout(() => {
            this.countUpNumber(elements.totalScore, 0, handResult.total_score, 1200, () => {
                // Final score celebration
                elements.totalScore.style.animation = 'scoreCelebration 1s ease-in-out';
                this.createFireworks(elements.totalScore);
            });
        }, 900);
    }

    // Enhanced number counting with easing
    countUpNumber(element, start, end, duration, callback) {
        const startTime = performance.now();
        const originalColor = element.style.color;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.floor(start + (end - start) * easeProgress);
            element.textContent = current;
            
            // Color animation
            const intensity = Math.sin(progress * Math.PI);
            element.style.color = `hsl(${280 + intensity * 40}, 80%, ${60 + intensity * 20}%)`;
            element.style.textShadow = `0 0 ${10 + intensity * 10}px currentColor`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.color = originalColor;
                if (callback) callback();
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Card shake animation
    shakeCard(card, intensity = 2, duration = 300) {
        const originalTransform = card.style.transform;
        let startTime = null;
        
        const shake = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const shakeX = Math.sin(progress * 20) * intensity * (1 - progress);
                const shakeY = Math.cos(progress * 25) * intensity * 0.5 * (1 - progress);
                
                card.style.transform = originalTransform + ` translate(${shakeX}px, ${shakeY}px)`;
                requestAnimationFrame(shake);
            } else {
                card.style.transform = originalTransform;
            }
        };
        
        requestAnimationFrame(shake);
    }

    // Add glow effect to card
    addGlowEffect(card) {
        // This function is now a no-op. The custom multi-color glow is removed.
        // The golden glow is handled by the .card.selected CSS class.
    }

    // Remove glow effect
    removeGlowEffect(card) {
        // This function is now a no-op.
    }

    // Add sparkle effect
    addSparkleEffect(card) {
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'sparkle-container';
        sparkleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            border-radius: 8px;
        `;
        
        // Create multiple sparkles
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                animation: sparkleFloat 1.5s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                box-shadow: 0 0 6px white;
            `;
            sparkleContainer.appendChild(sparkle);
        }
        
        card.style.position = 'relative';
        card.appendChild(sparkleContainer);
    }

    // Remove sparkle effect
    removeSparkleEffect(card) {
        const sparkles = card.querySelector('.sparkle-container');
        if (sparkles) {
            sparkles.remove();
        }
    }

    // Create fireworks effect
    createFireworks(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: hsl(${Math.random() * 360}, 80%, 60%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
                box-shadow: 0 0 10px currentColor;
            `;
            
            document.body.appendChild(particle);
            
            const angle = (i / 12) * Math.PI * 2;
            const velocity = 100 + Math.random() * 50;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let x = 0, y = 0;
            let opacity = 1;
            const gravity = 200;
            let time = 0;
            
            const animate = () => {
                time += 0.016; // ~60fps
                x += vx * 0.016;
                y += vy * 0.016 + gravity * 0.016 * time;
                opacity -= 0.016 * 2;
                
                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;
                
                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    // Round transition animation
    animateRoundTransition(newRound) {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(240, 147, 251, 0.9));
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.5s ease;
            `;
            
            const message = document.createElement('div');
            message.style.cssText = `
                color: white;
                font-size: 3rem;
                font-weight: 700;
                text-align: center;
                text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                transform: scale(0.8);
                transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `;
            message.textContent = `Round ${newRound}`;
            
            overlay.appendChild(message);
            document.body.appendChild(overlay);
            
            // Animate in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                message.style.transform = 'scale(1)';
            });
            
            // Animate out
            setTimeout(() => {
                overlay.style.opacity = '0';
                message.style.transform = 'scale(1.2)';
                
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 500);
            }, 2000);
        });
    }

    // Victory celebration animation
    animateVictory() {
        // Create confetti
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 50);
        }
        
        // Animate victory text
        const victoryTitle = document.querySelector('.victory-title');
        if (victoryTitle) {
            victoryTitle.style.animation = 'victoryBounce 2s ease-in-out infinite';
        }
    }

    // Create confetti particle
    createConfetti() {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: hsl(${Math.random() * 360}, 80%, 60%);
            top: -10px;
            left: ${Math.random() * 100}vw;
            z-index: 1000;
            pointer-events: none;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        `;
        
        document.body.appendChild(confetti);
        
        let y = -10;
        let x = parseFloat(confetti.style.left);
        let rotation = 0;
        const fallSpeed = 2 + Math.random() * 3;
        const sway = Math.random() * 2 - 1;
        const rotationSpeed = Math.random() * 10 - 5;
        
        const fall = () => {
            y += fallSpeed;
            x += sway;
            rotation += rotationSpeed;
            
            confetti.style.top = y + 'px';
            confetti.style.left = x + 'px';
            confetti.style.transform = `rotate(${rotation}deg)`;
            
            if (y < window.innerHeight + 20) {
                requestAnimationFrame(fall);
            } else {
                confetti.remove();
            }
        };
        
        requestAnimationFrame(fall);
    }

    // Shop card animations
    animateShopCards() {
        const shopCards = document.querySelectorAll('.shop-card');
        
        shopCards.forEach((card, index) => {
            // Initial state
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px) scale(0.8)';
            
            // Animate in with delay
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) scale(1)';
                
                // Add hover effect after animation
                setTimeout(() => {
                    card.classList.add('animated-in');
                }, 600);
            }, index * 200);
        });
    }
    
    // Card purchase animation
    animateCardPurchase(cardElement) {
        return new Promise((resolve) => {
            // Clone the card for animation
            const cardRect = cardElement.getBoundingClientRect();
            const clone = cardElement.cloneNode(true);
            
            // Style the clone for animation
            clone.style.position = 'fixed';
            clone.style.top = `${cardRect.top}px`;
            clone.style.left = `${cardRect.left}px`;
            clone.style.width = `${cardRect.width}px`;
            clone.style.height = `${cardRect.height}px`;
            clone.style.zIndex = '1000';
            clone.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Add to body
            document.body.appendChild(clone);
            
            // Animate to hand area
            setTimeout(() => {
                clone.style.transform = 'scale(0.6) rotate(720deg)';
                clone.style.opacity = '0';
                
                // Remove clone after animation
                setTimeout(() => {
                    clone.remove();
                    resolve();
                }, 800);
            }, 50);
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes glowPulse {
        0%, 100% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
    }
    
    @keyframes sparkleFloat {
        0%, 100% { opacity: 0; transform: translateY(0) scale(0); }
        50% { opacity: 1; transform: translateY(-10px) scale(1); }
    }
    
    @keyframes multiplierPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); color: #f093fb; }
        100% { transform: scale(1); }
    }
    
    @keyframes scoreCelebration {
        0% { transform: scale(1); }
        25% { transform: scale(1.2); color: #4facfe; }
        50% { transform: scale(1.1); color: #f093fb; }
        75% { transform: scale(1.15); color: #667eea; }
        100% { transform: scale(1); }
    }
    
    @keyframes victoryBounce {
        0%, 100% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.1) translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Initialize animations
window.gameAnimations = new GameAnimations();
