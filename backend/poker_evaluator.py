from typing import List, Dict, Tuple, Optional, Any
from collections import Counter, defaultdict
from .models import Card, HandType, HandResult, Rank

class PokerEvaluator:
    """Comprehensive poker hand evaluation with exact scoring"""
    
    # Hand scoring configuration from game requirements
    HAND_SCORES = {
        HandType.STRAIGHT_FLUSH: {"base_chips": 75, "multiplier": 10},
        HandType.FOUR_OF_A_KIND: {"base_chips": 60, "multiplier": 8},
        HandType.FULL_HOUSE: {"base_chips": 50, "multiplier": 7},
        HandType.FLUSH: {"base_chips": 40, "multiplier": 6},
        HandType.STRAIGHT: {"base_chips": 30, "multiplier": 5},
        HandType.THREE_OF_A_KIND: {"base_chips": 25, "multiplier": 4},
        HandType.TWO_PAIR: {"base_chips": 20, "multiplier": 3},
        HandType.ONE_PAIR: {"base_chips": 15, "multiplier": 2},
        HandType.HIGH_CARD: {"base_chips": 10, "multiplier": 2},
    }
    
    # Rank values for comparison (Ace high)
    RANK_VALUES = {
        Rank.TWO: 2, Rank.THREE: 3, Rank.FOUR: 4, Rank.FIVE: 5,
        Rank.SIX: 6, Rank.SEVEN: 7, Rank.EIGHT: 8, Rank.NINE: 9,
        Rank.TEN: 10, Rank.JACK: 11, Rank.QUEEN: 12, Rank.KING: 13, Rank.ACE: 14
    }
    
    # Low Ace straight (A-2-3-4-5)
    LOW_ACE_STRAIGHT = [14, 2, 3, 4, 5]
    
    @classmethod
    def evaluate_hand(cls, cards: List[Card]) -> HandResult:
        """Evaluate a poker hand and return complete scoring information"""
        if len(cards) != 5:
            raise ValueError("Hand must contain exactly 5 cards")
        
        # ------------------------------------------------------------------ #
        # 1)  Calculate **card chips** & accumulated bonuses                #
        # ------------------------------------------------------------------ #
        base_card_chips = sum(card._base_chip_value() for card in cards)
        bonus_chips = sum(card.bonus_chips() for card in cards)
        card_chips = base_card_chips + bonus_chips
        
        # Determine hand type
        hand_type = cls._get_hand_type(cards)
        
        # Get scoring information
        score_info = cls.HAND_SCORES[hand_type]
        base_chips = score_info["base_chips"]
        base_multiplier = score_info["multiplier"]
        bonus_multiplier = sum(card.bonus_multiplier() for card in cards)
        multiplier = base_multiplier + bonus_multiplier
        
        # Calculate total score: (card_chips + base_chips) * multiplier
        total_score = (card_chips + base_chips) * multiplier
        
        # Generate description
        description = cls._get_hand_description(hand_type, cards)
        
        return HandResult(
            hand_type=hand_type,
            base_chips=base_chips,
            multiplier=multiplier,
            card_chips=card_chips,
            total_score=total_score,
            description=description
        )
    
    @classmethod
    def _get_hand_type(cls, cards: List[Card]) -> HandType:
        """Determine the poker hand type"""
        ranks = [card.rank for card in cards]
        suits = [card.suit for card in cards]
        
        # Count ranks and suits
        rank_counts = Counter(ranks)
        suit_counts = Counter(suits)
        
        # Check for flush
        is_flush = len(suit_counts) == 1
        
        # Check for straight
        is_straight = cls._is_straight(ranks)
        
        # Determine hand type based on patterns
        if is_straight and is_flush:
            return HandType.STRAIGHT_FLUSH
        
        # Check for four of a kind
        if 4 in rank_counts.values():
            return HandType.FOUR_OF_A_KIND
        
        # Check for full house (3 + 2)
        if 3 in rank_counts.values() and 2 in rank_counts.values():
            return HandType.FULL_HOUSE
        
        if is_flush:
            return HandType.FLUSH
        
        if is_straight:
            return HandType.STRAIGHT
        
        # Check for three of a kind
        if 3 in rank_counts.values():
            return HandType.THREE_OF_A_KIND
        
        # Check for pairs
        pair_count = sum(1 for count in rank_counts.values() if count == 2)
        if pair_count == 2:
            return HandType.TWO_PAIR
        elif pair_count == 1:
            return HandType.ONE_PAIR
        
        return HandType.HIGH_CARD
    
    @classmethod
    def _is_straight(cls, ranks: List[Rank]) -> bool:
        """Check if ranks form a straight"""
        rank_values = [cls.RANK_VALUES[rank] for rank in ranks]
        # Sort the rank values first to ensure we check consecutive values properly
        rank_values.sort()
        
        # Check for regular straight
        for i in range(1, len(rank_values)):
            if rank_values[i] != rank_values[i-1] + 1:
                break
        else:
            return True
        
        # Check for low ace straight (A-2-3-4-5)
        if sorted(rank_values) == sorted(cls.LOW_ACE_STRAIGHT):
            return True
        
        return False
    
    @classmethod
    def _get_hand_description(cls, hand_type: HandType, cards: List[Card]) -> str:
        """Generate a human-readable description of the hand"""
        ranks = [card.rank for card in cards]
        rank_counts = Counter(ranks)
        
        if hand_type == HandType.STRAIGHT_FLUSH:
            high_card = cls._get_straight_high_card(ranks)
            return f"Straight Flush, {high_card} high"
        
        elif hand_type == HandType.FOUR_OF_A_KIND:
            quad_rank = [rank for rank, count in rank_counts.items() if count == 4][0]
            return f"Four of a Kind, {quad_rank}s"
        
        elif hand_type == HandType.FULL_HOUSE:
            trip_rank = [rank for rank, count in rank_counts.items() if count == 3][0]
            pair_rank = [rank for rank, count in rank_counts.items() if count == 2][0]
            return f"Full House, {trip_rank}s over {pair_rank}s"
        
        elif hand_type == HandType.FLUSH:
            suit = cards[0].suit
            high_card = max(ranks, key=lambda r: cls.RANK_VALUES[r])
            return f"Flush, {high_card} high"
        
        elif hand_type == HandType.STRAIGHT:
            high_card = cls._get_straight_high_card(ranks)
            return f"Straight, {high_card} high"
        
        elif hand_type == HandType.THREE_OF_A_KIND:
            trip_rank = [rank for rank, count in rank_counts.items() if count == 3][0]
            return f"Three of a Kind, {trip_rank}s"
        
        elif hand_type == HandType.TWO_PAIR:
            pairs = [rank for rank, count in rank_counts.items() if count == 2]
            pairs.sort(key=lambda r: cls.RANK_VALUES[r], reverse=True)
            return f"Two Pair, {pairs[0]}s and {pairs[1]}s"
        
        elif hand_type == HandType.ONE_PAIR:
            pair_rank = [rank for rank, count in rank_counts.items() if count == 2][0]
            return f"Pair of {pair_rank}s"
        
        else:  # HIGH_CARD
            high_card = max(ranks, key=lambda r: cls.RANK_VALUES[r])
            return f"High Card, {high_card}"
    
    @classmethod
    def _get_straight_high_card(cls, ranks: List[Rank]) -> Rank:
        """Get the high card of a straight"""
        rank_values = [cls.RANK_VALUES[rank] for rank in ranks]
        
        # Check for low ace straight
        if sorted(rank_values) == sorted(cls.LOW_ACE_STRAIGHT):
            return Rank.FIVE  # In A-2-3-4-5, 5 is the high card
        
        # Regular straight - return highest rank
        return max(ranks, key=lambda r: cls.RANK_VALUES[r])

    @classmethod
    def evaluate_preview_hand(cls, cards: List[Card]) -> Optional[Dict[str, Any]]:
        """
        Evaluate a partial hand (1 to 5 cards) for live preview.
        Returns a dictionary with hand_type, description, base_chips, and multiplier.
        """
        num_cards = len(cards)
        if not 1 <= num_cards <= 5:
            return None # Or raise error, but for preview, None might be better

        if num_cards == 5:
            # For a full 5-card selection, use the standard evaluation
            full_eval = cls.evaluate_hand(cards)
            return {
                "hand_type": full_eval.hand_type.value,
                "description": full_eval.description,
                "base_chips": full_eval.base_chips,
                "multiplier": full_eval.multiplier,
                "score_info": f"{full_eval.base_chips} × {full_eval.multiplier} = {full_eval.base_chips * full_eval.multiplier}"
            }

        # Partial hand evaluation (1-4 cards)
        ranks = [card.rank for card in cards]
        suits = [card.suit for card in cards]
        rank_counts = Counter(ranks)
        
        # Determine best possible partial hand
        hand_type = HandType.HIGH_CARD # Default

        # Check for N-of-a-kind
        if 4 in rank_counts.values():
            hand_type = HandType.FOUR_OF_A_KIND
        elif 3 in rank_counts.values():
            hand_type = HandType.THREE_OF_A_KIND
        elif 2 in rank_counts.values():
            # Check for two pair (requires 4 cards)
            if num_cards == 4 and sum(1 for count in rank_counts.values() if count == 2) == 2:
                hand_type = HandType.TWO_PAIR
            else:
                hand_type = HandType.ONE_PAIR
        
        # Check for flush potential (if all cards same suit and better than N-of-a-kind)
        # A flush is generally better than pairs or three of a kind if it's the primary feature.
        # However, for preview, we might just note it. For now, N-of-a-kind takes precedence for <5 cards.
        # If we want to show "Potential Flush" if all cards are same suit:
        is_potential_flush = len(set(suits)) == 1
        
        # If it's a potential flush and better than current hand_type (e.g. high card, one pair)
        # This logic can be complex. For simplicity, let's stick to N-of-a-kind for <5 cards,
        # and High Card if no N-of-a-kind. A full flush is only evaluated at 5 cards.
        # However, if we have, say, 3 cards of the same suit, it's still "High Card" unless they also form a pair/trips.
        # The HAND_SCORES implies Flush is better than Three of a Kind.
        # Let's refine:
        
        current_hand_score_rank = list(cls.HAND_SCORES.keys()).index(hand_type)

        if is_potential_flush and num_cards >= 3: # Typically need 3 for a "flush draw" to be notable
            # If a flush is possible and its rank is better than the current N-of-a-kind
            flush_score_rank = list(cls.HAND_SCORES.keys()).index(HandType.FLUSH)
            if flush_score_rank < current_hand_score_rank : # Lower index means better hand
                 # This is tricky because we don't have a "Potential Flush" hand type.
                 # For now, let's assume N-of-a-kind is the primary preview for < 5 cards.
                 # The full `evaluate_hand` handles actual flushes.
                 pass

        # Generate description for partial hands
        description = ""
        if hand_type == HandType.FOUR_OF_A_KIND:
            quad_rank = [r for r, c in rank_counts.items() if c == 4][0]
            description = f"Four {quad_rank}s (preview)"
        elif hand_type == HandType.THREE_OF_A_KIND:
            trip_rank = [r for r, c in rank_counts.items() if c == 3][0]
            description = f"Three {trip_rank}s (preview)"
        elif hand_type == HandType.TWO_PAIR: # Requires 4 cards
            pairs = sorted([r for r, c in rank_counts.items() if c == 2], key=lambda r_val: cls.RANK_VALUES[r_val], reverse=True)
            description = f"Two Pair: {pairs[0]}s & {pairs[1]}s (preview)"
        elif hand_type == HandType.ONE_PAIR:
            pair_rank = [r for r, c in rank_counts.items() if c == 2][0]
            description = f"Pair of {pair_rank}s (preview)"
        else: # High Card
            high_card_rank = max(ranks, key=lambda r_val: cls.RANK_VALUES[r_val])
            description = f"High Card {high_card_rank} (preview)"
            if is_potential_flush and num_cards >= 3: # Add note about flush potential
                description += f", {num_cards}-card Flush potential"


        score_config = cls.HAND_SCORES[hand_type]
        base_chips = score_config["base_chips"]
        base_multiplier = score_config["multiplier"]
        # Include possible bonuses from special cards during preview
        bonus_chips = sum(card.bonus_chips() for card in cards)
        bonus_multiplier = sum(card.bonus_multiplier() for card in cards)
        multiplier = base_multiplier + bonus_multiplier

        return {
            "hand_type": hand_type.value,
            "description": description,
            "base_chips": base_chips,
            "multiplier": multiplier,
            "score_info": f"{base_chips} × {multiplier} = {base_chips * multiplier}"
        }
