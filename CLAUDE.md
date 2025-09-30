# Ballantro Single Player Poker Rogue Like

Version 0.5

## Overview
A single-player poker card game built with FastAPI backend and vanilla JavaScript frontend, featuring exact hand verification, scoring mechanisms, and comprehensive animations throughout the gameplay experience.

## Features Implemented

### ✅ Core Game Mechanics
- **Standard 52-card deck** with proper shuffling
- **8-card hand** with ability to select and play 5 cards
- **3 draws per match** to improve your hand
- **4 hands maximum** per round
- **3 progressive rounds** with increasing difficulty:
  - Round 1: 300 points target
  - Round 2: 450 points target  
  - Round 3: 600 points target

### ✅ Exact Poker Hand Verification
- **Comprehensive hand evaluation** covering all poker combinations:
  - Straight Flush (75 chips, ×10 multiplier)
  - Four of a Kind (60 chips, ×8 multiplier)
  - Full House (50 chips, ×7 multiplier)
  - Flush (40 chips, ×6 multiplier)
  - Straight (30 chips, ×5 multiplier)
  - Three of a Kind (25 chips, ×4 multiplier)
  - Two Pair (20 chips, ×3 multiplier)
  - One Pair (15 chips, ×2 multiplier)
  - High Card (10 chips, ×2 multiplier)

### ✅ Exact Scoring System
- **Card chip values:**
  - Ace = 11 chips
  - Face cards (K, Q, J) = 10 chips each
  - Number cards = face value
- **Scoring formula:** (Card Chips + Base Chips) × Multiplier
- **Example verified:** AAAKK = (53 + 50) × 7 = 721 points ✓

### ✅ FastAPI Backend
- **RESTful API endpoints** for all game actions
- **Session management** for multiple concurrent games
- **Persistent highscores** with JSON storage
- **CORS enabled** for frontend integration
- **Comprehensive error handling**

### ✅ Glassmorphism Design
- **Modern glass-effect UI** with backdrop blur
- **Gradient backgrounds** with animated patterns
- **Responsive design** for desktop and mobile
- **Interactive hover effects** and visual feedback
- **Professional typography** with Inter font

### ✅ Advanced Animations
- **Card dealing animations** with staggered reveals
- **Selection animations** with lift, glow, and shake effects
- **Scoring animations** with sparkles and fireworks
- **Score counting** with easing and color transitions
- **Round transition** overlays
- **Victory celebrations** with confetti
- **Smooth screen transitions**

### ✅ Complete Game Flow
- **Startup screen** with animated title
- **Game screen** with real-time stats
- **Scoring screen** with detailed breakdown
- **Victory screen** for completing all rounds
- **Game over screen** for failed attempts
- **Highscores screen** with leaderboard
- **Name input** for score saving

## Technical Architecture

### Backend (FastAPI)
```
poker_game/
├── main.py                 # FastAPI application
├── backend/
│   ├── models.py          # Pydantic data models
│   ├── deck.py            # Card deck management
│   ├── poker_evaluator.py # Hand evaluation logic
│   └── game_engine.py     # Game session management
└── test_poker.py          # Comprehensive test suite
```

### Frontend (Vanilla JS)
```
poker_game/
├── templates/
│   └── index.html         # Main game interface
├── static/
│   ├── css/
│   │   └── styles.css     # Glassmorphism styling
│   └── js/
│       ├── game.js        # Core game logic
│       └── animations.js  # Advanced animations
```

## Scoring Examples

### High-Value Hands
- **Royal Flush (A♠ K♠ Q♠ J♠ 10♠):** (51 + 75) × 10 = 1,260 points
- **Four Aces (A♠ A♥ A♦ A♣ K♠):** (54 + 60) × 8 = 912 points
- **Full House (A♠ A♥ A♦ K♠ K♥):** (53 + 50) × 7 = 721 points

### Strategy Tips
- **Save high cards** (Aces, Kings, Queens) for better chip values
- **Look for pairs** early to build toward stronger hands
- **Use draws wisely** - you only get 3 per round
- **Calculate target scores** - you need increasingly higher scores each round