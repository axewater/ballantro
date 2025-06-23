from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn
import os

from backend.game_engine import GameEngine
from backend.models import GameAction, GameState, Card

app = FastAPI(title="Poker Game", description="Single-player poker card game")

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

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main game page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/new_game")
async def new_game():
    """Start a new game session"""
    try:
        game_state = game_engine.new_game()
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/draw_cards")
async def draw_cards(action: GameAction):
    """Draw new cards by discarding selected ones"""
    try:
        game_state = game_engine.draw_cards(action.session_id, action.selected_cards)
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/play_hand")
async def play_hand(action: GameAction):
    """Play the selected cards and calculate score"""
    try:
        result = game_engine.play_hand(action.session_id, action.selected_cards)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/game_state/{session_id}")
async def get_game_state(session_id: str):
    """Get current game state"""
    try:
        game_state = game_engine.get_game_state(session_id)
        return {"success": True, "game_state": game_state.dict()}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/save_score")
async def save_score(score_data: dict):
    """Save player score to highscores"""
    try:
        result = game_engine.save_score(score_data["name"], score_data["score"])
        return {"success": True, "highscores": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/highscores")
async def get_highscores():
    """Get top highscores"""
    try:
        highscores = game_engine.get_highscores()
        return {"success": True, "highscores": highscores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preview_hand")
async def preview_hand(cards: list[Card]):
    """Evaluate a partial hand for live preview"""
    try:
        if not cards: # Handle empty selection
            return {"success": True, "preview": None}
        # The PokerEvaluator needs to be imported or accessed.
        # Assuming it's accessible via game_engine or directly.
        from backend.poker_evaluator import PokerEvaluator # Direct import for simplicity here
        preview_result = PokerEvaluator.evaluate_preview_hand(cards)
        return {"success": True, "preview": preview_result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
