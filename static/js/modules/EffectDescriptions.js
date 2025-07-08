// /static/js/modules/EffectDescriptions.js

/**
 * @file EffectDescriptions.js
 * This file contains client-side descriptions for card effects.
 * The keys should match the `effect.name` from `backend/card_effects.py`.
 */

const EffectDescriptions = {
    'bonus_chips_50': {
        name: 'Bonus Chips',
        description: 'Adds +50 Chips to this card when scored.'
    },
    'bonus_multiplier_5': {
        name: 'Bonus Multiplier',
        description: 'Adds +5 to the hand multiplier when this card is part of a scored hand.'
    },
    'bonus_money_2': {
        name: 'Cash Bonus',
        description: 'Awards $2 immediately when this card scores.'
    },
    'bonus_random': {
        name: 'Mystery Bonus',
        description: 'When scored, randomly grants +$1, +5× multiplier or +25 chips.'
    }
    // Add more effect descriptions here as they are created
};

// Make it available globally or export if using a module system consistently
window.EffectDescriptions = EffectDescriptions;
