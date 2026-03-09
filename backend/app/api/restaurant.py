"""TablePilot restaurant operations API endpoints."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, Header
from sqlalchemy.orm import Session
from typing import Optional

from ..db.schemas import (
    CampaignOutcomeRequest,
    HireScenarioRequest,
    MenuPriceSimulationRequest,
    PurchaseOrderApprovalRequest,
    RecipeBatchRequest,
    ShiftTemplateBatchRequest,
    VenueKpiSettingsRequest,
)
from ..db.session import get_db
from ..modules.restaurant_ops import RestaurantOpsModule

router = APIRouter(prefix="/restaurant", tags=["Restaurant Ops"])

_module = RestaurantOpsModule()


def get_module() -> RestaurantOpsModule:
    return _module


@router.post("/ingest/pos-csv")
async def ingest_pos_csv(
    file: UploadFile = File(...),
    venue_id: Optional[str] = Query(default=None),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.ingest_pos_csv(db, await file.read(), venue_id, idempotency_key=idempotency_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ingest/purchases-csv")
async def ingest_purchases_csv(
    file: UploadFile = File(...),
    venue_id: Optional[str] = Query(default=None),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.ingest_purchases_csv(db, await file.read(), venue_id, idempotency_key=idempotency_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ingest/labor-csv")
async def ingest_labor_csv(
    file: UploadFile = File(...),
    venue_id: Optional[str] = Query(default=None),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.ingest_labor_csv(db, await file.read(), venue_id, idempotency_key=idempotency_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ingest/reviews-csv")
async def ingest_reviews_csv(
    file: UploadFile = File(...),
    venue_id: Optional[str] = Query(default=None),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.ingest_reviews_csv(db, await file.read(), venue_id, idempotency_key=idempotency_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ingest/recipes")
async def ingest_recipes(
    payload: RecipeBatchRequest,
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.ingest_recipes(
            db,
            [recipe.model_dump() for recipe in payload.recipes],
            venue_id=venue_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/venue/settings")
async def get_venue_settings(
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_venue_settings(db, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/venue/settings")
async def update_venue_settings(
    payload: VenueKpiSettingsRequest,
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.update_venue_settings(
            db,
            venue_id=venue_id,
            labor_target_pct=payload.labor_target_pct,
            food_target_pct=payload.food_target_pct,
            sales_drop_alert_pct=payload.sales_drop_alert_pct,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/control-tower/daily")
async def get_control_tower_daily(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_control_tower_daily(db, date, venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/finance/margin")
async def get_finance_margin(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    fixed_cost_per_day: float = Query(default=3000.0, ge=0),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_finance_margin(
            db,
            start_date=from_date,
            end_date=to_date,
            venue_id=venue_id,
            fixed_cost=fixed_cost_per_day,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/inventory/alerts")
async def get_inventory_alerts(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_inventory_alerts(db, date, venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/recommendations/daily")
async def get_daily_recommendations(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_daily_recommendations(db, date, venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/labor/forecast")
async def get_labor_forecast(
    date: str = Query(..., description="YYYY-MM-DD"),
    days: int = Query(default=7, ge=1, le=30),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_labor_forecast(db, date, days=days, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/menu/engineering")
async def get_menu_engineering(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_menu_engineering(db, from_date, to_date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/procurement/opportunities")
async def get_procurement_opportunities(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_procurement_opportunities(db, date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/procurement/supplier-risk")
async def get_supplier_risk(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_supplier_risk(db, from_date, to_date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/reports/weekly-owner")
async def get_weekly_owner_report(
    week_start: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_weekly_owner_report(db, week_start=week_start, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/scenarios/hire-check")
async def run_hiring_scenario(
    payload: HireScenarioRequest,
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.run_hiring_scenario(
            db,
            from_date=payload.from_date,
            to_date=payload.to_date,
            additional_weekly_cost=payload.additional_weekly_cost,
            venue_id=payload.venue_id,
            fixed_cost_per_day=payload.fixed_cost_per_day,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/portfolio/rollup")
async def get_portfolio_rollup(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_portfolio_rollup(db, from_date, to_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/labor/optimizer")
async def get_labor_optimizer(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    target_labor_pct: float = Query(default=30.0, ge=0, le=100),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_labor_optimizer(db, date, venue_id=venue_id, target_labor_pct=target_labor_pct)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/inventory/auto-order")
async def get_inventory_auto_order(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_inventory_auto_order(db, date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/menu/repricing")
async def get_menu_repricing(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_menu_repricing(db, from_date, to_date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/menu/price-simulator")
async def run_menu_price_simulator(
    payload: MenuPriceSimulationRequest,
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.simulate_menu_price_scenarios(
            db,
            start_date=payload.from_date,
            end_date=payload.to_date,
            elasticity=payload.elasticity,
            adjustments=[a.model_dump() for a in (payload.adjustments or [])],
            venue_id=payload.venue_id,
            fixed_cost_per_day=payload.fixed_cost_per_day,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/reputation/winback")
async def get_reputation_winback(
    week_start: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_reputation_winback(db, week_start, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/reputation/campaigns/outcome")
async def upsert_campaign_outcome(
    payload: CampaignOutcomeRequest,
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.upsert_campaign_outcome(
            db,
            venue_id=venue_id or payload.venue_id,
            campaign=payload.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/reputation/campaigns/performance")
async def get_campaign_performance(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_campaign_performance(db, from_date, to_date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/ops/readiness")
async def get_ops_readiness(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_ops_readiness(db, date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/labor/role-productivity")
async def get_role_productivity(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_labor_role_productivity(db, from_date, to_date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/labor/shift-templates")
async def upsert_shift_templates(
    payload: ShiftTemplateBatchRequest,
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.upsert_shift_templates(
            db,
            templates=[t.model_dump() for t in payload.templates],
            venue_id=venue_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/labor/shift-templates")
async def get_shift_templates(
    venue_id: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_shift_templates(db, venue_id=venue_id, include_inactive=include_inactive)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/procurement/po-draft/from-auto-order")
async def create_po_draft_from_auto_order(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.create_purchase_order_from_auto_order(db, date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/procurement/po/{purchase_order_id}/approval")
async def update_po_approval(
    purchase_order_id: str,
    payload: PurchaseOrderApprovalRequest,
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.update_purchase_order_approval(
            db,
            purchase_order_id=purchase_order_id,
            action=payload.action,
            approver=payload.approver,
            comment=payload.comment,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/observability/summary")
async def get_observability_summary(
    date: str = Query(..., description="YYYY-MM-DD"),
    venue_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    module: RestaurantOpsModule = Depends(get_module),
):
    try:
        return module.get_observability_summary(db, date, venue_id=venue_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
