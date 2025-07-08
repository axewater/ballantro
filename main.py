from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn
import os, random # random for debug deck
import logging
from pydantic import BaseModel

from backend.game_engine import GameEngine
from backend.models import GameAction, GameState, Card, SaveScoreRequest

app = FastAPI(title="Poker Game", description="Single-player poker card game")

# Configure basic logging for the FastAPI app if not already done by game_engine
logging.basicConfig(level=logging.INFO, format='%(asctime)s - SERVER API: %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Game engine instance
game_engine = GameEngine()

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve the favicon.ico file"""
    return FileResponse("static/favicon.ico")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main game page"""
    return templates.TemplateResponse("index.html", {"request": request})

class NewGameRequest(BaseModel):
    debug_mode: bool = False

@app.post("/api/new_game")
async def new_game(request_data: NewGameRequest = NewGameRequest()):
    """Start a new game session"""
    try:
        game_state = game_engine.new_game(debug_mode=request_data.debug_mode)
        log_msg = f"API: New game created. Session ID: {game_state.session_id}. Debug: {request_data.debug_mode}. Initial hand: {[str(c) for c in game_state.hand]}"
        logger.info(log_msg)
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        logger.error(f"API Error: /api/new_game - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/draw_cards")
async def draw_cards(action: GameAction):
    """Draw new cards by discarding selected ones"""
    logger.info(f"API: /api/draw_cards called for session {action.session_id} with cards {action.selected_cards}")
    try:
        game_state = game_engine.draw_cards(action.session_id, action.selected_cards)
        logger.info(f"API: /api/draw_cards response for session {action.session_id}. New hand: {[str(c) for c in game_state.hand]}")
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        logger.error(f"API Error: /api/draw_cards - {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/play_hand")
async def play_hand(action: GameAction):
    """Play the selected cards and calculate score"""
    logger.info(f"API: /api/play_hand called for session {action.session_id} with cards {action.selected_cards}")
    try:
        result = game_engine.play_hand(action.session_id, action.selected_cards)
        logger.info(f"API: /api/play_hand response for session {action.session_id}. Result hand: {[str(c) for c in result['game_state']['hand']]}. Hand type: {result['hand_result']['hand_type']}")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"API Error: /api/play_hand - {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/game_state/{session_id}")
async def get_game_state(session_id: str):
    """Get current game state"""
    logger.info(f"API: /api/game_state/{session_id} called")
    try:
        game_state = game_engine.get_game_state(session_id)
        logger.info(f"API: /api/game_state/{session_id} response. Current hand: {[str(c) for c in game_state.hand]}")
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        logger.error(f"API Error: /api/game_state/{session_id} - {str(e)}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/save_score")
async def save_score(score_data: SaveScoreRequest):
    """Save player score to highscores"""
    logger.info(f"API: /api/save_score called for session {score_data.session_id} with name '{score_data.name}'")
    try:
        # The score is no longer sent from the client.
        # The game engine will look up the score from the session ID.
        result = game_engine.save_score(
            session_id=score_data.session_id, name=score_data.name
        )
        return {"success": True, "highscores": result}
    except Exception as e:
        logger.error(f"API Error: /api/save_score - {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/highscores")
async def get_highscores():
    """Get top highscores"""
    logger.info(f"API: /api/highscores called")
    try:
        highscores = game_engine.get_highscores()
        return {"success": True, "highscores": highscores}
    except Exception as e:
        logger.error(f"API Error: /api/highscores - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preview_hand")
async def preview_hand(cards: list[Card]):
    """Evaluate a partial hand for live preview"""
    logger.info(f"API: /api/preview_hand called with cards: {[str(c) for c in cards]}")
    try:
        if not cards: # Handle empty selection
            logger.info(f"API: /api/preview_hand - empty card list, returning no preview.")
            return {"success": True, "preview": None}
        # The PokerEvaluator needs to be imported or accessed.
        # Assuming it's accessible via game_engine or directly.
        from backend.poker_evaluator import PokerEvaluator # Direct import for simplicity here
        preview_result = PokerEvaluator.evaluate_preview_hand(cards)
        logger.info(f"API: /api/preview_hand response: {preview_result}")
        return {"success": True, "preview": preview_result}
    except Exception as e:
        logger.error(f"API Error: /api/preview_hand - {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/remaining_deck/{session_id}")
async def get_remaining_deck(session_id: str):
    """Get the list of cards remaining in the deck for a session"""
    logger.info(f"API: /api/remaining_deck/{session_id} called")
    try:
        session = game_engine._get_session(session_id) # Access session directly
        remaining_cards = session.get_remaining_deck_cards()
        return {"success": True, "remaining_cards": [card.dict() for card in remaining_cards]}
    except ValueError as e: # Session not found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"API Error: /api/remaining_deck/{session_id} - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/shop/{session_id}")
async def get_shop_state(session_id: str):
    """Get the current shop state for a session"""
    logger.info(f"API: /api/shop/{session_id} called")
    try:
        shop_state = game_engine.get_shop_state(session_id)
        return {"success": True, "shop_state": shop_state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API Error: /api/shop/{session_id} - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shop/{session_id}/reroll")
async def reroll_shop(session_id: str):
    """Reroll the shop cards for $1"""
    logger.info(f"API: /api/shop/{session_id}/reroll called")
    try:
        result = game_engine.reroll_shop(session_id)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API Error: /api/shop/{session_id}/reroll - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shop/{session_id}/buy/{card_index}")
async def buy_card(session_id: str, card_index: int):
    """Buy a card from the shop for $3"""
    logger.info(f"API: /api/shop/{session_id}/buy/{card_index} called")
    try:
        result = game_engine.buy_card(session_id, card_index)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API Error: /api/shop/{session_id}/buy/{card_index} - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shop/{session_id}/next_round")
async def proceed_to_next_round(session_id: str):
    """Proceed to the next round after shopping"""
    logger.info(f"API: /api/shop/{session_id}/next_round called")
    try:
        result = game_engine.proceed_to_next_round(session_id)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API Error: /api/shop/{session_id}/next_round - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
