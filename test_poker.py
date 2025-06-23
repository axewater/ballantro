#!/usr/bin/env python3
"""
Test suite for poker hand evaluation to ensure exact scoring accuracy
"""

from backend.models import Card, Suit, Rank, HandType
from backend.poker_evaluator import PokerEvaluator
from backend.deck import card_from_string

def test_card_chip_values():
    """Test card chip value calculations"""
    print("Testing card chip values...")
    
    # Test Ace = 11
    ace = Card(suit=Suit.HEARTS, rank=Rank.ACE)
    assert ace.get_chip_value() == 11, f"Ace should be 11, got {ace.get_chip_value()}"
    
    # Test face cards = 10
    king = Card(suit=Suit.SPADES, rank=Rank.KING)
    queen = Card(suit=Suit.DIAMONDS, rank=Rank.QUEEN)
    jack = Card(suit=Suit.CLUBS, rank=Rank.JACK)
    assert king.get_chip_value() == 10
    assert queen.get_chip_value() == 10
    assert jack.get_chip_value() == 10
    
    # Test number cards
    two = Card(suit=Suit.HEARTS, rank=Rank.TWO)
    ten = Card(suit=Suit.SPADES, rank=Rank.TEN)
    assert two.get_chip_value() == 2
    assert ten.get_chip_value() == 10
    
    print("✓ Card chip values correct")

def test_example_scoring():
    """Test the exact example from requirements: AAAKK = 721 points"""
    print("Testing example scoring (AAAKK)...")
    
    # Create AAAKK hand
    cards = [
        Card(suit=Suit.HEARTS, rank=Rank.ACE),
        Card(suit=Suit.SPADES, rank=Rank.ACE),
        Card(suit=Suit.DIAMONDS, rank=Rank.ACE),
        Card(suit=Suit.CLUBS, rank=Rank.KING),
        Card(suit=Suit.HEARTS, rank=Rank.KING)
    ]
    
    result = PokerEvaluator.evaluate_hand(cards)
    
    # Verify hand type
    assert result.hand_type == HandType.FULL_HOUSE, f"Expected Full House, got {result.hand_type}"
    
    # Verify card chips: 11 + 11 + 11 + 10 + 10 = 53
    assert result.card_chips == 53, f"Expected 53 card chips, got {result.card_chips}"
    
    # Verify base chips and multiplier for Full House
    assert result.base_chips == 50, f"Expected 50 base chips, got {result.base_chips}"
    assert result.multiplier == 7, f"Expected multiplier 7, got {result.multiplier}"
    
    # Verify total score: (53 + 50) * 7 = 721
    expected_total = (53 + 50) * 7
    assert result.total_score == expected_total, f"Expected {expected_total}, got {result.total_score}"
    assert result.total_score == 721, f"Expected 721, got {result.total_score}"
    
    print(f"✓ Example scoring correct: {result.total_score} points")

def test_all_hand_types():
    """Test recognition of all poker hand types"""
    print("Testing all hand types...")
    
    test_cases = [
        # Straight Flush
        ([Card(suit=Suit.HEARTS, rank=Rank.FIVE), Card(suit=Suit.HEARTS, rank=Rank.SIX), 
          Card(suit=Suit.HEARTS, rank=Rank.SEVEN), Card(suit=Suit.HEARTS, rank=Rank.EIGHT), 
          Card(suit=Suit.HEARTS, rank=Rank.NINE)], HandType.STRAIGHT_FLUSH),
        
        # Four of a Kind
        ([Card(suit=Suit.HEARTS, rank=Rank.KING), Card(suit=Suit.SPADES, rank=Rank.KING),
          Card(suit=Suit.DIAMONDS, rank=Rank.KING), Card(suit=Suit.CLUBS, rank=Rank.KING),
          Card(suit=Suit.HEARTS, rank=Rank.TWO)], HandType.FOUR_OF_A_KIND),
        
        # Full House (already tested above)
        ([Card(suit=Suit.HEARTS, rank=Rank.ACE), Card(suit=Suit.SPADES, rank=Rank.ACE),
          Card(suit=Suit.DIAMONDS, rank=Rank.ACE), Card(suit=Suit.CLUBS, rank=Rank.KING),
          Card(suit=Suit.HEARTS, rank=Rank.KING)], HandType.FULL_HOUSE),
        
        # Flush
        ([Card(suit=Suit.HEARTS, rank=Rank.TWO), Card(suit=Suit.HEARTS, rank=Rank.FIVE),
          Card(suit=Suit.HEARTS, rank=Rank.SEVEN), Card(suit=Suit.HEARTS, rank=Rank.JACK),
          Card(suit=Suit.HEARTS, rank=Rank.ACE)], HandType.FLUSH),
        
        # Straight
        ([Card(suit=Suit.HEARTS, rank=Rank.FIVE), Card(suit=Suit.SPADES, rank=Rank.SIX),
          Card(suit=Suit.DIAMONDS, rank=Rank.SEVEN), Card(suit=Suit.CLUBS, rank=Rank.EIGHT),
          Card(suit=Suit.HEARTS, rank=Rank.NINE)], HandType.STRAIGHT),
        
        # Three of a Kind
        ([Card(suit=Suit.HEARTS, rank=Rank.QUEEN), Card(suit=Suit.SPADES, rank=Rank.QUEEN),
          Card(suit=Suit.DIAMONDS, rank=Rank.QUEEN), Card(suit=Suit.CLUBS, rank=Rank.FIVE),
          Card(suit=Suit.HEARTS, rank=Rank.TWO)], HandType.THREE_OF_A_KIND),
        
        # Two Pair
        ([Card(suit=Suit.HEARTS, rank=Rank.JACK), Card(suit=Suit.SPADES, rank=Rank.JACK),
          Card(suit=Suit.DIAMONDS, rank=Rank.FOUR), Card(suit=Suit.CLUBS, rank=Rank.FOUR),
          Card(suit=Suit.HEARTS, rank=Rank.TWO)], HandType.TWO_PAIR),
        
        # One Pair
        ([Card(suit=Suit.HEARTS, rank=Rank.TEN), Card(suit=Suit.SPADES, rank=Rank.TEN),
          Card(suit=Suit.DIAMONDS, rank=Rank.FIVE), Card(suit=Suit.CLUBS, rank=Rank.SEVEN),
          Card(suit=Suit.HEARTS, rank=Rank.TWO)], HandType.ONE_PAIR),
        
        # High Card
        ([Card(suit=Suit.HEARTS, rank=Rank.ACE), Card(suit=Suit.SPADES, rank=Rank.KING),
          Card(suit=Suit.DIAMONDS, rank=Rank.QUEEN), Card(suit=Suit.CLUBS, rank=Rank.NINE),
          Card(suit=Suit.HEARTS, rank=Rank.SEVEN)], HandType.HIGH_CARD),
    ]
    
    for cards, expected_type in test_cases:
        result = PokerEvaluator.evaluate_hand(cards)
        assert result.hand_type == expected_type, f"Expected {expected_type}, got {result.hand_type}"
    
    print("✓ All hand types recognized correctly")

def test_special_straights():
    """Test special straight cases including low ace"""
    print("Testing special straights...")
    
    # Low ace straight (A-2-3-4-5)
    low_ace_straight = [
        Card(suit=Suit.HEARTS, rank=Rank.ACE),
        Card(suit=Suit.SPADES, rank=Rank.TWO),
        Card(suit=Suit.DIAMONDS, rank=Rank.THREE),
        Card(suit=Suit.CLUBS, rank=Rank.FOUR),
        Card(suit=Suit.HEARTS, rank=Rank.FIVE)
    ]
    
    result = PokerEvaluator.evaluate_hand(low_ace_straight)
    assert result.hand_type == HandType.STRAIGHT, f"Low ace should be straight, got {result.hand_type}"
    
    # High ace straight (10-J-Q-K-A)
    high_ace_straight = [
        Card(suit=Suit.HEARTS, rank=Rank.TEN),
        Card(suit=Suit.SPADES, rank=Rank.JACK),
        Card(suit=Suit.DIAMONDS, rank=Rank.QUEEN),
        Card(suit=Suit.CLUBS, rank=Rank.KING),
        Card(suit=Suit.HEARTS, rank=Rank.ACE)
    ]
    
    result = PokerEvaluator.evaluate_hand(high_ace_straight)
    assert result.hand_type == HandType.STRAIGHT, f"High ace should be straight, got {result.hand_type}"
    
    print("✓ Special straights handled correctly")

def test_scoring_calculations():
    """Test scoring calculations for different hand types"""
    print("Testing scoring calculations...")
    
    # Test a few different hands to verify scoring formula
    
    # High card with low values
    low_cards = [
        Card(suit=Suit.HEARTS, rank=Rank.TWO),    # 2 chips
        Card(suit=Suit.SPADES, rank=Rank.THREE),  # 3 chips
        Card(suit=Suit.DIAMONDS, rank=Rank.FOUR), # 4 chips
        Card(suit=Suit.CLUBS, rank=Rank.FIVE),    # 5 chips
        Card(suit=Suit.HEARTS, rank=Rank.SEVEN)   # 7 chips
    ]
    # Total card chips: 2+3+4+5+7 = 21
    # High card: 10 base + 2 multiplier = (21 + 10) * 2 = 62
    
    result = PokerEvaluator.evaluate_hand(low_cards)
    expected = (21 + 10) * 2
    assert result.total_score == expected, f"Expected {expected}, got {result.total_score}"
    
    print("✓ Scoring calculations correct")

def run_all_tests():
    """Run all poker evaluation tests"""
    print("Running poker evaluation tests...\n")
    
    test_card_chip_values()
    test_example_scoring()
    test_all_hand_types()
    test_special_straights()
    test_scoring_calculations()
    
    print("\n✅ All poker evaluation tests passed!")

if __name__ == "__main__":
    run_all_tests()

