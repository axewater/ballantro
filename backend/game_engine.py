import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from .models import GameState, Card, HandResult, HighScore
from .deck import Deck
from .poker_evaluator import PokerEvaluator

class GameEngine:
    """Main game engine handling all game logic and state management"""
    
    def __init__(self):
        self.sessions: Dict[str, GameSession] = {}
        self.highscores_file = "highscores.json"
        self._load_highscores()
    
    def new_game(self) -> GameState:
        """Start a new game session"""
        session_id = str(uuid.uuid4())
        session = GameSession(session_id)
        self.sessions[session_id] = session
        return session.get_state()
    
    def draw_cards(self, session_id: str, selected_indices: List[int]) -> GameState:
        """Draw new cards by discarding selected ones"""
        session = self._get_session(session_id)
        return session.draw_cards(selected_indices)
    
    def play_hand(self, session_id: str, selected_indices: List[int]) -> Dict:
        """Play the selected cards and calculate score"""
        session = self._get_session(session_id)
        return session.play_hand(selected_indices)
    
    def get_game_state(self, session_id: str) -> GameState:
        """Get current game state"""
        session = self._get_session(session_id)
        return session.get_state()
    
    def save_score(self, name: str, score: int) -> List[HighScore]:
        """Save player score to highscores"""
        timestamp = datetime.now().isoformat()
        new_score = HighScore(name=name, score=score, timestamp=timestamp)
        
        self.highscores.append(new_score)
        self.highscores.sort(key=lambda x: x.score, reverse=True)
        self.highscores = self.highscores[:10]  # Keep top 10
        
        self._save_highscores()
        return self.highscores
    
    def get_highscores(self) -> List[HighScore]:
        """Get top highscores"""
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
                print(f"Error loading highscores: {e}")
                self.highscores = []
    
    def _save_highscores(self):
        """Save highscores to file"""
        try:
            with open(self.highscores_file, 'w') as f:
                data = [score.dict() for score in self.highscores]
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving highscores: {e}")

class GameSession:
    """Individual game session managing one player's game"""
    
    # Round progression requirements
    ROUND_TARGETS = {1: 300, 2: 450, 3: 600}
    
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
        
        # Game configuration
        self.max_hands = 4
        self.max_hand_size = 8
        self.max_draws = 3
        
        # Deal initial hand
        self._deal_initial_hand()
    
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
        
        # Validate indices
        for idx in selected_indices:
            if idx < 0 or idx >= len(self.hand):
                raise ValueError(f"Invalid card index: {idx}")
        
        # Remove selected cards (in reverse order to maintain indices)
        selected_indices.sort(reverse=True)
        discarded_cards = []
        for idx in selected_indices:
            discarded_cards.append(self.hand.pop(idx))
        
        # Discard cards
        self.deck.discard(discarded_cards)
        
        # Draw new cards to fill hand
        cards_to_draw = min(len(discarded_cards), self.deck.remaining_count())
        if cards_to_draw > 0:
            new_cards = self.deck.draw(cards_to_draw)
            self.hand.extend(new_cards)
        
        self.draws_used += 1
        
        return self.get_state()
    
    def play_hand(self, selected_indices: List[int]) -> Dict:
        """Play the selected cards and calculate score"""
        if self.is_game_over:
            raise ValueError("Game is over")
        
        if len(selected_indices) != 5:
            raise ValueError("Must select exactly 5 cards to play")
        
        # Validate indices
        for idx in selected_indices:
            if idx < 0 or idx >= len(self.hand):
                raise ValueError(f"Invalid card index: {idx}")
        
        # Get selected cards
        selected_cards = [self.hand[idx] for idx in selected_indices]

        # Immediately discard played cards and draw replacements
        selected_indices.sort(reverse=True)
        discarded_cards = [self.hand.pop(idx) for idx in selected_indices]
        self.deck.discard(discarded_cards)
        # Refill hand up to max_hand_size
        draw_count = min(len(discarded_cards), self.deck.remaining_count())
        if draw_count > 0:
            self.hand.extend(self.deck.draw(draw_count))

        # Evaluate hand
        hand_result = PokerEvaluator.evaluate_hand(selected_cards)
        
        # Update score
        self.total_score += hand_result.total_score
        self.hands_played += 1
        
        # Check round progression
        round_complete = False
        money_awarded_this_round = 0
        if self.total_score >= self.ROUND_TARGETS.get(self.current_round, float('inf')):
            round_complete = True
            # Award money: $5 for round 1, $6 for round 2, $7 for round 3
            # Cumulative: $5 + (current_round - 1)
            money_awarded_this_round = 5 + (self.current_round - 1)
            self.money += money_awarded_this_round

            if self.current_round >= 3:
                # Victory!
                self.is_victory = True
                self.is_game_over = True
            else:
                # Advance to next round
                self.current_round += 1
                self.hands_played = 0
                self.draws_used = 0
                # Reset deck and deal new hand
                self.deck.reset()
                self._deal_initial_hand()
        else:
            # Check if game over (max hands reached)
            if self.hands_played >= self.max_hands:
                self.is_game_over = True
            else:
                # Continue with current hand, reset draws
                self.draws_used = 0
        
        return {
            "hand_result": hand_result.dict(),
            "game_state": self.get_state().dict(),
            "round_complete": round_complete,
            "money_awarded_this_round": money_awarded_this_round
        }
    
    def _deal_initial_hand(self):
        """Deal initial hand of cards"""
        self.hand = self.deck.draw(self.max_hand_size)
    
    def get_remaining_deck_cards(self) -> List[Card]:
        """Returns a copy of the cards currently in the deck."""
        return self.deck.cards.copy()
