# Straight Detection Bug Fix

## Issue
When playing a straight with cards in a non-sequential order (e.g., 7, 8, 9, 10, J but not in that order), 
the game was incorrectly scoring it as a high card instead of a straight.

## Root Cause
In the `_is_straight` method of the `PokerEvaluator` class, the code was checking if consecutive cards in the 
array had consecutive ranks, but it wasn't properly handling the case where the cards were in a different order.

## Fix
The solution was to ensure the rank values are sorted before checking if they form a straight. This way, 
regardless of the order in which the cards are selected, if they form a straight, they will be properly detected.

## Verification
After the fix, playing a hand like 7♥, 8♦, 9♥, 10♣, J♦ (in any order) correctly scores as a straight.
