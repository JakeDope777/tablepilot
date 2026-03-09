"""Restaurant intent coverage for the Brain router."""

from app.brain.router import IntentRouter, SKILL_RESTAURANT_OPS


def test_router_classifies_restaurant_profit_intent():
    router = IntentRouter()
    result = router.classify_intent("Why was profit weak last week?")
    assert result == SKILL_RESTAURANT_OPS


def test_router_classifies_inventory_intent():
    router = IntentRouter()
    result = router.classify_intent("What should I reorder tomorrow and where is waste highest?")
    assert result == SKILL_RESTAURANT_OPS


def test_router_classifies_review_intent():
    router = IntentRouter()
    result = router.classify_intent("Why are Google reviews dropping this week?")
    assert result == SKILL_RESTAURANT_OPS
