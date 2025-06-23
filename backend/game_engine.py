import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from .models import GameState, Card, HandResult, HighScore
from .deck import Deck
from .poker_evaluator import PokerEvaluator
import logging
import random

# Configure basic logging for the server
logging.basicConfig(level=logging.INFO, format='%(asctime)s - SERVER: %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GameEngine:
    """Main game engine handling all game logic and state management"""
    
    def __init__(self):
        self.sessions: Dict[str, GameSession] = {}
        self.highscores_file = "highscores.json"
        self._load_highscores()
    
    def new_game(self) -> GameState:
        """Start a new game session"""
        session_id = str(uuid.uuid4())
        logger.info(f"Starting new game. Session ID: {session_id}")
        session = GameSession(session_id)
        self.sessions[session_id] = session
        return session.get_state()
    
    def draw_cards(self, session_id: str, selected_indices: List[int]) -> GameState:
        """Draw new cards by discarding selected ones"""
        logger.info(f"Session {session_id}: Draw cards request for indices {selected_indices}")
        session = self._get_session(session_id)
        state = session.draw_cards(selected_indices)
        logger.info(f"Session {session_id}: Draw cards complete. Current hand: {[str(c) for c in state.hand]}")
        return state
    
    def play_hand(self, session_id: str, selected_indices: List[int]) -> Dict:
        """Play the selected cards and calculate score"""
        logger.info(f"Session {session_id}: Play hand request for indices {selected_indices}")
        session = self._get_session(session_id)
        result = session.play_hand(selected_indices)
        logger.info(f"Session {session_id}: Play hand complete. New hand: {[str(c) for c in result['game_state']['hand']]}. Hand result: {result['hand_result']['hand_type']}")
        return result
    
    def get_game_state(self, session_id: str) -> GameState:
        """Get current game state"""
        logger.info(f"Session {session_id}: Get game state request.")
        session = self._get_session(session_id)
        return session.get_state()
    
    def save_score(self, name: str, score: int) -> List[HighScore]:
        """Save player score to highscores"""
        timestamp = datetime.now().isoformat()
        new_score = HighScore(name=name, score=score, timestamp=timestamp)
        logger.info(f"Saving score: Name={name}, Score={score}")
        
        self.highscores.append(new_score)
        self.highscores.sort(key=lambda x: x.score, reverse=True)
        self.highscores = self.highscores[:10]  # Keep top 10
        
        self._save_highscores()
        return self.highscores
    
    def get_highscores(self) -> List[HighScore]:
        """Get top highscores"""
        logger.info("Fetching highscores.")
        return self.highscores
    
    def _get_session(self, session_id: str) -> 'GameSession':
        """Get session or raise error"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        return self.sessions[session_id]
    
    def _load_highscores(self):
        """Load highscores from file"""
        self.highscores = []
        if os.path.exists(self.highscores_file):
            try:
                with open(self.highscores_file, 'r') as f:
                    data = json.load(f)
                    self.highscores = [HighScore(**item) for item in data]
            except Exception as e:
                logger.error(f"Error loading highscores: {e}", exc_info=True)
                self.highscores = []
    
    def _save_highscores(self):
        """Save highscores to file"""
        try:
            with open(self.highscores_file, 'w') as f:
                data = [score.dict() for score in self.highscores]
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving highscores: {e}", exc_info=True)

    def get_shop_state(self, session_id: str) -> Dict:
        """Get the current shop state for a session"""
        logger.info(f"Session {session_id}: Get shop state request.")
        session = self._get_session(session_id)
        return session.get_shop_state()
    
    def reroll_shop(self, session_id: str) -> Dict:
        """Reroll the shop cards for $1"""
        logger.info(f"Session {session_id}: Reroll shop request.")
        session = self._get_session(session_id)
        return session.reroll_shop()
    
    def buy_card(self, session_id: str, card_index: int) -> Dict:
        """Buy a card from the shop for $3"""
        logger.info(f"Session {session_id}: Buy card request for index {card_index}.")
        session = self._get_session(session_id)
        return session.buy_card(card_index)
    
    def proceed_to_next_round(self, session_id: str) -> Dict:
        """Proceed to the next round after shopping"""
        logger.info(f"Session {session_id}: Proceed to next round request.")
        session = self._get_session(session_id)
        return session.proceed_to_next_round()

    def _generate_random_card(self) -> Card:
        """
        Generate a **special card** for the shop.

        Every shop card comes with exactly *one* random effect chosen from
        `backend.card_effects.AVAILABLE_EFFECT_NAMES`.
        """
        from .models import Suit, Rank
        from .card_effects import AVAILABLE_EFFECT_NAMES
        import random as _rnd
        
        # Get all possible suits and ranks
        all_suits = list(Suit)
        all_ranks = list(Rank)
        
        # Randomly select a suit and rank
        random_suit = _rnd.choice(all_suits)
        random_rank = _rnd.choice(all_ranks)
        
        # Pick one random effect for the card
        effect = _rnd.choice(AVAILABLE_EFFECT_NAMES)
        
        # Create and return a new card with the effect
        return Card(suit=random_suit, rank=random_rank, effects=[effect])
    
    def generate_shop_cards(self, count: int = 3) -> List[Card]:
        """Generate random cards for the shop"""
        shop_cards = []
        for _ in range(count):
            shop_cards.append(self._generate_random_card())
        
        return shop_cards

class GameSession:
    """Individual game session managing one player's game"""
    
    # Round progression requirements
    ROUND_TARGETS = {1: 300, 2: 750, 3: 1250}
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_round = 1
        self.hands_played = 0
        self.draws_used = 0
        self.total_score = 0
        self.money = 0  # Player's accumulated money
        self.deck = Deck()
        self.hand: List[Card] = []
        self.is_game_over = False
        self.is_victory = False

        # Shop state
        self.in_shop = False
        self.shop_cards = []
        self.shop_reroll_cost = 1
        self.shop_card_cost = 3

        self.purchased_cards: List[Card] = []  # Cards bought in shop, shuffled into deck next round
        
        # Game configuration
        self.max_hands = 4
        self.max_hand_size = 8
        self.max_draws = 3
        
        # Deal initial hand
        self._deal_initial_hand()
        logger.info(f"Session {self.session_id}: Initial hand dealt: {[str(c) for c in self.hand]}")
    
    def get_state(self) -> GameState:
        """Get current game state"""
        return GameState(
            session_id=self.session_id,
            current_round=self.current_round,
            hands_played=self.hands_played,
            draws_used=self.draws_used,
            total_score=self.total_score,
            money=self.money,
            hand=self.hand.copy(),
            deck_remaining=self.deck.remaining_count(),
            round_target=self.ROUND_TARGETS.get(self.current_round, 0),
            max_hands=self.max_hands,
            max_hand_size=self.max_hand_size, 
            in_shop=self.in_shop,
            shop_cards=self.shop_cards.copy() if self.shop_cards else [],
            max_draws=self.max_draws,
            is_game_over=self.is_game_over,
            is_victory=self.is_victory
        )
    
    def draw_cards(self, selected_indices: List[int]) -> GameState:
        """Draw new cards by discarding selected ones"""
        if self.is_game_over:
            raise ValueError("Game is over")
        
        if self.draws_used >= self.max_draws:
            raise ValueError("No draws remaining")
        
        if len(selected_indices) == 0:
            raise ValueError("Must select at least one card to discard")
        
        logger.info(f"Session {self.session_id}: Hand before discard: {[str(c) for c in self.hand]}")
        # Validate indices
        for idx in selected_indices:
            if idx < 0 or idx >= len(self.hand):
                raise ValueError(f"Invalid card index: {idx}")
        
        # Remove selected cards (in reverse order to maintain indices)
        selected_indices.sort(reverse=True)
        discarded_cards = []
        for idx in selected_indices:
            discarded_cards.append(self.hand.pop(idx))
        logger.info(f"Session {self.session_id}: Discarded cards: {[str(c) for c in discarded_cards]}")
        
        # Discard cards
        self.deck.discard(discarded_cards)
        
        # Draw new cards to fill hand
        cards_to_draw = min(len(discarded_cards), self.deck.remaining_count())
        new_cards = []
        if cards_to_draw > 0:
            new_cards = self.deck.draw(cards_to_draw)
            self.hand.extend(new_cards)
        logger.info(f"Session {self.session_id}: Drew new cards: {[str(c) for c in new_cards]}")
        logger.info(f"Session {self.session_id}: Hand after drawing new cards: {[str(c) for c in self.hand]}")
        
        self.draws_used += 1
        
        return self.get_state()
    
    def play_hand(self, selected_indices: List[int]) -> Dict:
        """Play the selected cards and calculate score"""
        if self.is_game_over:
            raise ValueError("Game is over")
        
        if len(selected_indices) != 5:
            raise ValueError("Must select exactly 5 cards to play")
        
        logger.info(f"Session {self.session_id}: Hand before playing selected cards: {[str(c) for c in self.hand]}")
        # Validate indices
        for idx in selected_indices:
            if idx < 0 or idx >= len(self.hand):
                raise ValueError(f"Invalid card index: {idx}")
        
        # Get the actual Card objects that were selected by the player for this hand
        played_cards_for_eval = [self.hand[idx] for idx in selected_indices]
        logger.info(f"Session {self.session_id}: Cards selected for play: {[str(c) for c in played_cards_for_eval]}")

        # Determine which cards from the original hand were *not* played (these are kept)
        # and which were played (these are discarded).
        kept_cards_in_hand = []
        played_cards_to_discard_pile = []
        
        # Create a set of selected indices for efficient lookup
        played_indices_set = set(selected_indices)

        for i, card_in_original_hand in enumerate(self.hand):
            if i in played_indices_set:
                played_cards_to_discard_pile.append(card_in_original_hand)
            else:
                kept_cards_in_hand.append(card_in_original_hand)
        
        # Update the player's hand to only contain the cards they kept
        self.hand = kept_cards_in_hand
        logger.info(f"Session {self.session_id}: Cards kept in hand: {[str(c) for c in self.hand]}")
        
        # Add the played cards to the deck's discard pile
        self.deck.discard(played_cards_to_discard_pile)
        logger.info(f"Session {self.session_id}: Played cards added to discard pile: {[str(c) for c in played_cards_to_discard_pile]}")

        # Replenish the player's hand by drawing new cards to replace those that were played
        num_cards_that_were_played = len(played_cards_to_discard_pile) # This will be 5
        
        # Determine how many new cards to draw
        actual_draw_count = min(num_cards_that_were_played, self.deck.remaining_count())
        
        newly_drawn_cards = []
        if actual_draw_count > 0:
            newly_drawn_cards = self.deck.draw(actual_draw_count)
            self.hand.extend(newly_drawn_cards) # Add newly drawn cards to the kept cards
        
        logger.info(f"Session {self.session_id}: Replenished hand with: {[str(c) for c in newly_drawn_cards]}. Current hand now: {[str(c) for c in self.hand]}")

        # Evaluate hand
        hand_result = PokerEvaluator.evaluate_hand(played_cards_for_eval)
        
        # Update score
        self.total_score += hand_result.total_score
        self.hands_played += 1
        logger.info(f"Session {self.session_id}: Hand evaluated. Type: {hand_result.hand_type}, Score: {hand_result.total_score}. Total score: {self.total_score}")
        
        # Check round progression
        round_complete = False
        money_awarded_this_round = 0
        if self.total_score >= self.ROUND_TARGETS.get(self.current_round, float('inf')):
            round_complete = True
            # Award money: $5 for round 1, $6 for round 2, $7 for round 3
            # Cumulative: $5 + (current_round - 1)
            money_awarded_this_round = 5 + (self.current_round - 1)
            self.money += money_awarded_this_round
            logger.info(f"Session {self.session_id}: Round {self.current_round} complete. Money awarded: ${money_awarded_this_round}. Total money: ${self.money}")
            self.in_shop = True

            if self.current_round >= 3:
                # Victory!
                self.is_victory = True
                self.is_game_over = True
            else:
                # Advance to next round
                # Instead of immediately advancing to next round, we enter shop mode
                # The actual round advancement happens in proceed_to_next_round
                logger.info(f"Session {self.session_id}: Round complete. Entering shop before round {self.current_round + 1}.")
                
                # Generate shop cards
                self.shop_cards = game_engine.generate_shop_cards(3)
                self._deal_initial_hand()
                logger.info(f"Session {self.session_id}: New hand for round {self.current_round}: {[str(c) for c in self.hand]}")
        else:
            # Check if game over (max hands reached)
            if self.hands_played >= self.max_hands:
                self.is_game_over = True
                logger.info(f"Session {self.session_id}: Game over. Max hands reached for round {self.current_round}.")
            else:
                # Continue with current hand, reset draws
                self.draws_used = 0
                logger.info(f"Session {self.session_id}: Continuing round {self.current_round}. Draws reset. Hands played: {self.hands_played}/{self.max_hands}")
        
        return {
            "hand_result": hand_result.dict(),
            "game_state": self.get_state().dict(),
            "round_complete": round_complete,
            "money_awarded_this_round": money_awarded_this_round
        }
    
    def get_shop_state(self) -> Dict:
        """Get the current shop state"""
        if not self.in_shop:
            raise ValueError("Not currently in shop phase")
        
        return {
            "shop_cards": [card.dict() for card in self.shop_cards],
            "money": self.money,
            "reroll_cost": self.shop_reroll_cost,
            "card_cost": self.shop_card_cost,
            "next_round": self.current_round + 1
        }
    
    def reroll_shop(self) -> Dict:
        """Reroll the shop cards for $1"""
        if not self.in_shop:
            raise ValueError("Not currently in shop phase")
        
        if self.money < self.shop_reroll_cost:
            raise ValueError(f"Not enough money. Need ${self.shop_reroll_cost}, have ${self.money}")
        
        # Deduct reroll cost
        self.money -= self.shop_reroll_cost
        logger.info(f"Session {self.session_id}: Rerolled shop cards for ${self.shop_reroll_cost}. Money remaining: ${self.money}")
        
        # Generate new shop cards
        self.shop_cards = game_engine.generate_shop_cards(3)
        
        return {
            "shop_cards": [card.dict() for card in self.shop_cards],
            "money": self.money
        }
    
    def buy_card(self, card_index: int) -> Dict:
        """Buy a card from the shop for $3"""
        if not self.in_shop:
            raise ValueError("Not currently in shop phase")
        
        if card_index < 0 or card_index >= len(self.shop_cards):
            raise ValueError(f"Invalid card index: {card_index}")
        
        if self.money < self.shop_card_cost:
            raise ValueError(f"Not enough money. Need ${self.shop_card_cost}, have ${self.money}")
        
        # Get the card to buy
        card_to_buy = self.shop_cards[card_index]

        # Deduct money *before* mutating state so UI reflects it immediately
        self.money -= self.shop_card_cost

        # ------------------------------------------------------------------
        #  Deck-builder rule: **duplicates are allowed**.                  
        #  Always add the purchased card to the current draw pile so the  
        #  player can potentially pick it up immediately.                  
        # ------------------------------------------------------------------
        self.deck.cards.append(card_to_buy)
        random.shuffle(self.deck.cards)   # Light shuffle keeps randomness
        
        # Queue the bought card to be shuffled into the deck for the NEXT round
        # (do **not** add it to the hand directly – it should behave like a
        #   deck-builder where bought cards are drawn later).
        self.purchased_cards.append(card_to_buy)

        # Remove card from shop
        self.shop_cards.pop(card_index)
        
        logger.info(
            "Session %s: Bought card %s for $%d. Money remaining: $%d. Deck now has %d cards.",
            self.session_id,
            str(card_to_buy),
            self.shop_card_cost,
            self.money,
            self.deck.remaining_count(),
        )
        
        return {"game_state": self.get_state().dict()}
    
    def _deal_initial_hand(self):
        """Deal initial hand of cards"""
        self.hand = self.deck.draw(self.max_hand_size)
    
    def get_remaining_deck_cards(self) -> List[Card]:
        """Returns a copy of the cards currently in the deck."""
        logger.info(f"Session {self.session_id}: Fetching remaining deck cards. Count: {len(self.deck.cards)}")
        return self.deck.cards.copy()
    
    def proceed_to_next_round(self) -> Dict:
        """Proceed to the next round after shopping"""
        if not self.in_shop:
            raise ValueError("Not currently in shop phase")
        
        # Advance to next round
        self.current_round += 1
        self.hands_played = 0
        self.draws_used = 0
        self.in_shop = False
        
        # Start with a fresh, shuffled deck.
        self.deck.reset()

        # ------------------------------------------------------------------
        #  Remove **exact** copies of each card currently in hand
        # ------------------------------------------------------------------
        for card_in_hand in self.hand:
            try:
                idx = next(i for i, c in enumerate(self.deck.cards)
                           if c.suit == card_in_hand.suit and c.rank == card_in_hand.rank)
                self.deck.cards.pop(idx)
            except StopIteration:
                # If not found, nothing to remove (can happen with duplicates)
                pass

        # ------------------------------------------------------------------
        #  Duplicates are *explicitly* allowed – simply extend & shuffle.
        # ------------------------------------------------------------------
        self.deck.cards.extend(self.purchased_cards)
        random.shuffle(self.deck.cards)
        # Clear the queue for the next shopping phase
        self.purchased_cards.clear()
        
        original_count = self.deck.remaining_count()
        logger.info(
            "Session %s: Advancing to round %d. Deck reset (was %d), "
            "removed %d hand cards – %d cards remain.",
            self.session_id,
            self.current_round,
            original_count,
            len(self.hand),
            self.deck.remaining_count(),
        )
        logger.info(
            "Session %s: Hand for round %d: %s",
            self.session_id,
            self.current_round,
            [str(c) for c in self.hand],
        )
        
        return {
            "game_state": self.get_state().dict()
        }

# Create a global instance of the game engine
game_engine = GameEngine()
