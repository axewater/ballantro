/* Minimal stub so other modules can queue custom animations if needed */
window.gameAnimations = {
    queue: Promise.resolve(),
    queueAnimation(fn){
        this.queue = this.queue.then(()=>new Promise(async res=>{
            await fn();
            res();
        }));
        return this.queue;
    },
    animateCardDeal:   async ()=>{},   // existing no-ops kept
    animateRoundTransition:async ()=>{},
    animateCardSelection(cardElement, isSelected) {
        // Selection state is now handled purely by CSS classes
        // No additional animation needed since CSS handles the transition
    }
};
