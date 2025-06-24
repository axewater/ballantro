/**
 * TurboIcons.js
 * --------------
 * Central mapping `effect_id`  →  single-character / emoji icon
 * so every Turbo-Chip can be rendered with its own unique symbol.
 *
 *  NOTE:  Keep this list in-sync with `backend/turbo_chips.py`.
 */

const TurboChipIcons = {
    /*  Core “score x2” chips  */
    mul_score_x2:      '🚀',   // The Multer
    push_score_x2:     '💰',   // The Pusher

    /*  Suit-specific +3 multiplier chips  */
    mult_plus3_clubs:    '♣️', // In the Club
    mult_plus3_diamonds: '💎', // Girl’s Best Friend
    mult_plus3_spades:   '⛏️', // The Digger
    mult_plus3_hearts:   '💘', // Cupido
};

// global export
window.TurboChipIcons = TurboChipIcons;
