"""TablePilot restaurant operations module (week-1 + core extensions)."""

from __future__ import annotations

import csv
import hashlib
import io
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from ...db.models import (
    RestaurantAnomaly,
    RestaurantLaborShift,
    RestaurantPurchase,
    RestaurantRecipe,
    RestaurantRecipeIngredient,
    RestaurantRecommendation,
    RestaurantIngestionRun,
    RestaurantReview,
    RestaurantSale,
    RestaurantStockSnapshot,
    RestaurantVenue,
)
from ...db.session import SessionLocal


@dataclass
class DateRange:
    start: str
    end: str


class RestaurantOpsModule:
    DEFAULT_CURRENCY = "EUR"
    DEFAULT_TIMEZONE = "Europe/Madrid"
    DEFAULT_LABOR_TARGET_PCT = 30.0
    DEFAULT_FOOD_TARGET_PCT = 30.0
    DEFAULT_SALES_DROP_ALERT_PCT = 10.0

    def _parse_float(self, value: Any, default: float = 0.0) -> float:
        if value in (None, ""):
            return default
        try:
            return float(str(value).strip().replace(",", ""))
        except (ValueError, TypeError):
            return default

    def _parse_int(self, value: Any, default: int = 0) -> int:
        if value in (None, ""):
            return default
        try:
            return int(float(str(value).strip().replace(",", "")))
        except (ValueError, TypeError):
            return default

    def _normalize_date(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("date is required")
        candidate = value[:10]
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(candidate, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        raise ValueError(f"invalid date: {value}")

    def _read_csv(self, file_bytes: bytes) -> list[dict[str, str]]:
        text = file_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV file has no header row")
        return [{(k or "").strip(): (v or "").strip() for k, v in row.items()} for row in reader]

    def _validate_required_columns(self, rows: list[dict[str, str]], required: set[str]) -> None:
        fields = set(rows[0].keys() if rows else [])
        missing = sorted(required - fields)
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")

    def _build_row_error(self, row_number: int, row: dict[str, str], exc: Exception) -> dict[str, Any]:
        return {"row_number": row_number, "error": str(exc), "row": row}

    def _kpi_targets(self, venue: RestaurantVenue) -> dict[str, float]:
        return {
            "labor_target_pct": self._parse_float(getattr(venue, "labor_target_pct", None), self.DEFAULT_LABOR_TARGET_PCT),
            "food_target_pct": self._parse_float(getattr(venue, "food_target_pct", None), self.DEFAULT_FOOD_TARGET_PCT),
            "sales_drop_alert_pct": self._parse_float(
                getattr(venue, "sales_drop_alert_pct", None), self.DEFAULT_SALES_DROP_ALERT_PCT
            ),
        }

    def _payload_hash(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def _idempotency_duplicate(
        self,
        db: Session,
        venue_id: str,
        dataset_type: str,
        idempotency_key: Optional[str],
        payload_hash: str,
    ) -> Optional[dict]:
        if not idempotency_key:
            return None
        existing = (
            db.query(RestaurantIngestionRun)
            .filter(
                RestaurantIngestionRun.venue_id == venue_id,
                RestaurantIngestionRun.dataset_type == dataset_type,
                RestaurantIngestionRun.idempotency_key == idempotency_key,
            )
            .order_by(RestaurantIngestionRun.created_at.desc())
            .first()
        )
        if not existing:
            return None
        if existing.payload_hash != payload_hash:
            raise ValueError("Idempotency key already used with a different payload")
        stored = existing.response_payload or {}
        duplicate_response = {
            **stored,
            "status": "duplicate",
            "idempotency_key": idempotency_key,
            "dataset_type": dataset_type,
            "duplicate_of_run_id": existing.id,
        }
        db.add(
            RestaurantIngestionRun(
                venue_id=venue_id,
                dataset_type=dataset_type,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="duplicate",
                response_payload=duplicate_response,
            )
        )
        db.commit()
        return duplicate_response

    def _record_ingestion_run(
        self,
        db: Session,
        venue_id: str,
        dataset_type: str,
        payload_hash: str,
        idempotency_key: Optional[str],
        response_payload: dict[str, Any],
        status: str = "processed",
    ) -> None:
        db.add(
            RestaurantIngestionRun(
                venue_id=venue_id,
                dataset_type=dataset_type,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status=status,
                response_payload=response_payload,
            )
        )
        db.commit()

    def _get_or_create_venue(self, db: Session, venue_id: Optional[str] = None) -> RestaurantVenue:
        if venue_id:
            venue = db.query(RestaurantVenue).filter(RestaurantVenue.id == venue_id).first()
            if venue:
                return venue
            venue = RestaurantVenue(
                id=venue_id,
                name=f"TablePilot Venue {venue_id[:8]}",
                currency=self.DEFAULT_CURRENCY,
                timezone=self.DEFAULT_TIMEZONE,
                labor_target_pct=self.DEFAULT_LABOR_TARGET_PCT,
                food_target_pct=self.DEFAULT_FOOD_TARGET_PCT,
                sales_drop_alert_pct=self.DEFAULT_SALES_DROP_ALERT_PCT,
            )
            db.add(venue)
            db.commit()
            db.refresh(venue)
            return venue

        venue = db.query(RestaurantVenue).first()
        if venue:
            return venue

        venue = RestaurantVenue(
            name="TablePilot Demo Venue",
            currency=self.DEFAULT_CURRENCY,
            timezone=self.DEFAULT_TIMEZONE,
            labor_target_pct=self.DEFAULT_LABOR_TARGET_PCT,
            food_target_pct=self.DEFAULT_FOOD_TARGET_PCT,
            sales_drop_alert_pct=self.DEFAULT_SALES_DROP_ALERT_PCT,
        )
        db.add(venue)
        db.commit()
        db.refresh(venue)
        return venue

    def _recipe_cost_map(self, db: Session, venue_id: str) -> dict[str, float]:
        recipes = db.query(RestaurantRecipe).filter(RestaurantRecipe.venue_id == venue_id).all()
        out: dict[str, float] = {}
        for recipe in recipes:
            total = 0.0
            for ingredient in recipe.ingredients:
                total += ingredient.quantity_per_dish * ingredient.unit_cost
            out[(recipe.dish_name or "").lower()] = total
        return out

    # Ingestion -----------------------------------------------------------------

    def ingest_pos_csv(
        self,
        db: Session,
        file_bytes: bytes,
        venue_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        rows = self._read_csv(file_bytes)
        required = {"date", "menu_item", "quantity", "net_sales"}
        self._validate_required_columns(rows, required)

        venue = self._get_or_create_venue(db, venue_id)
        payload_hash = self._payload_hash(file_bytes)
        duplicate = self._idempotency_duplicate(db, venue.id, "pos_csv", idempotency_key, payload_hash)
        if duplicate:
            return duplicate
        created = 0
        skipped = 0
        total_revenue = 0.0
        total_covers = 0
        dates: list[str] = []
        row_errors: list[dict[str, Any]] = []

        for idx, row in enumerate(rows, start=2):
            try:
                sale_date = self._normalize_date(row.get("date", ""))
                quantity = self._parse_int(row.get("quantity"), 0)
                net_sales = self._parse_float(row.get("net_sales"), 0.0)
                covers = self._parse_int(row.get("covers"), 0)
                forecast = self._parse_float(row.get("forecast_revenue"), net_sales)
                db.add(
                    RestaurantSale(
                        venue_id=venue.id,
                        sale_date=sale_date,
                        channel=row.get("channel") or "in_store",
                        menu_item=row.get("menu_item") or "Unknown item",
                        quantity=quantity,
                        covers=covers,
                        net_sales=net_sales,
                        forecast_revenue=forecast,
                    )
                )
                created += 1
                total_revenue += net_sales
                total_covers += covers
                dates.append(sale_date)
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                row_errors.append(self._build_row_error(idx, row, exc))

        if created == 0 and row_errors:
            raise ValueError("No valid POS rows to ingest")
        db.commit()
        result = {
            "status": "success",
            "venue_id": venue.id,
            "rows_ingested": created,
            "rows_skipped": skipped,
            "row_errors": row_errors[:25],
            "date_range": {"from": min(dates) if dates else None, "to": max(dates) if dates else None},
            "totals": {"revenue": round(total_revenue, 2), "covers": total_covers},
        }
        self._record_ingestion_run(
            db,
            venue_id=venue.id,
            dataset_type="pos_csv",
            payload_hash=payload_hash,
            idempotency_key=idempotency_key,
            response_payload=result,
        )
        return result

    def ingest_purchases_csv(
        self,
        db: Session,
        file_bytes: bytes,
        venue_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        rows = self._read_csv(file_bytes)
        required = {"date", "item_name", "quantity", "unit_cost"}
        self._validate_required_columns(rows, required)

        venue = self._get_or_create_venue(db, venue_id)
        payload_hash = self._payload_hash(file_bytes)
        duplicate = self._idempotency_duplicate(db, venue.id, "purchases_csv", idempotency_key, payload_hash)
        if duplicate:
            return duplicate
        created = 0
        skipped = 0
        total = 0.0
        dates: list[str] = []
        row_errors: list[dict[str, Any]] = []

        for idx, row in enumerate(rows, start=2):
            try:
                purchase_date = self._normalize_date(row.get("date", ""))
                qty = self._parse_float(row.get("quantity"), 0.0)
                unit_cost = self._parse_float(row.get("unit_cost"), 0.0)
                total_cost = self._parse_float(row.get("total_cost"), qty * unit_cost)
                db.add(
                    RestaurantPurchase(
                        venue_id=venue.id,
                        purchase_date=purchase_date,
                        item_name=row.get("item_name") or "Unknown ingredient",
                        supplier=row.get("supplier") or "Unknown supplier",
                        quantity=qty,
                        unit_cost=unit_cost,
                        total_cost=total_cost,
                    )
                )

                if any(row.get(k) for k in ["on_hand_qty", "par_level", "waste_qty", "theoretical_usage", "actual_usage"]):
                    db.add(
                        RestaurantStockSnapshot(
                            venue_id=venue.id,
                            snapshot_date=purchase_date,
                            item_name=row.get("item_name") or "Unknown ingredient",
                            on_hand_qty=self._parse_float(row.get("on_hand_qty"), 0.0),
                            par_level=self._parse_float(row.get("par_level"), 0.0),
                            waste_qty=self._parse_float(row.get("waste_qty"), 0.0),
                            theoretical_usage=self._parse_float(row.get("theoretical_usage"), 0.0),
                            actual_usage=self._parse_float(row.get("actual_usage"), 0.0),
                        )
                    )

                created += 1
                total += total_cost
                dates.append(purchase_date)
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                row_errors.append(self._build_row_error(idx, row, exc))

        if created == 0 and row_errors:
            raise ValueError("No valid purchase rows to ingest")
        db.commit()
        result = {
            "status": "success",
            "venue_id": venue.id,
            "rows_ingested": created,
            "rows_skipped": skipped,
            "row_errors": row_errors[:25],
            "date_range": {"from": min(dates) if dates else None, "to": max(dates) if dates else None},
            "totals": {"purchase_cost": round(total, 2)},
        }
        self._record_ingestion_run(
            db,
            venue_id=venue.id,
            dataset_type="purchases_csv",
            payload_hash=payload_hash,
            idempotency_key=idempotency_key,
            response_payload=result,
        )
        return result

    def ingest_labor_csv(
        self,
        db: Session,
        file_bytes: bytes,
        venue_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        rows = self._read_csv(file_bytes)
        required = {"date", "staff_name", "role", "hours_worked", "hourly_rate"}
        self._validate_required_columns(rows, required)

        venue = self._get_or_create_venue(db, venue_id)
        payload_hash = self._payload_hash(file_bytes)
        duplicate = self._idempotency_duplicate(db, venue.id, "labor_csv", idempotency_key, payload_hash)
        if duplicate:
            return duplicate
        created = 0
        skipped = 0
        total_cost = 0.0
        dates: list[str] = []
        row_errors: list[dict[str, Any]] = []

        for idx, row in enumerate(rows, start=2):
            try:
                shift_date = self._normalize_date(row.get("date", ""))
                hours = self._parse_float(row.get("hours_worked"), 0.0)
                rate = self._parse_float(row.get("hourly_rate"), 0.0)
                cost = self._parse_float(row.get("labor_cost"), hours * rate)
                db.add(
                    RestaurantLaborShift(
                        venue_id=venue.id,
                        shift_date=shift_date,
                        staff_name=row.get("staff_name") or "Unknown",
                        role=row.get("role") or "staff",
                        hours_worked=hours,
                        hourly_rate=rate,
                        labor_cost=cost,
                        scheduled_covers=self._parse_int(row.get("scheduled_covers"), 0),
                    )
                )
                created += 1
                total_cost += cost
                dates.append(shift_date)
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                row_errors.append(self._build_row_error(idx, row, exc))

        if created == 0 and row_errors:
            raise ValueError("No valid labor rows to ingest")
        db.commit()
        result = {
            "status": "success",
            "venue_id": venue.id,
            "rows_ingested": created,
            "rows_skipped": skipped,
            "row_errors": row_errors[:25],
            "date_range": {"from": min(dates) if dates else None, "to": max(dates) if dates else None},
            "totals": {"labor_cost": round(total_cost, 2)},
        }
        self._record_ingestion_run(
            db,
            venue_id=venue.id,
            dataset_type="labor_csv",
            payload_hash=payload_hash,
            idempotency_key=idempotency_key,
            response_payload=result,
        )
        return result

    def _derive_sentiment(self, rating: float, text: str) -> float:
        base = (rating - 3.0) / 2.0
        text_l = (text or "").lower()
        pos = sum(term in text_l for term in ["great", "excellent", "friendly", "amazing", "love", "fast"])
        neg = sum(term in text_l for term in ["slow", "cold", "late", "rude", "bad", "expensive"])
        return max(-1.0, min(1.0, base + (pos - neg) * 0.08))

    def ingest_reviews_csv(
        self,
        db: Session,
        file_bytes: bytes,
        venue_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        rows = self._read_csv(file_bytes)
        required = {"date", "rating", "text"}
        self._validate_required_columns(rows, required)

        venue = self._get_or_create_venue(db, venue_id)
        payload_hash = self._payload_hash(file_bytes)
        duplicate = self._idempotency_duplicate(db, venue.id, "reviews_csv", idempotency_key, payload_hash)
        if duplicate:
            return duplicate
        created = 0
        skipped = 0
        sentiments: list[float] = []
        dates: list[str] = []
        row_errors: list[dict[str, Any]] = []

        for idx, row in enumerate(rows, start=2):
            try:
                review_date = self._normalize_date(row.get("date", ""))
                rating = self._parse_float(row.get("rating"), 0.0)
                text = row.get("text") or ""
                sentiment = self._parse_float(row.get("sentiment_score"), self._derive_sentiment(rating, text))
                db.add(
                    RestaurantReview(
                        venue_id=venue.id,
                        review_date=review_date,
                        source=row.get("source") or "google",
                        rating=rating,
                        sentiment_score=sentiment,
                        text=text,
                    )
                )
                created += 1
                sentiments.append(sentiment)
                dates.append(review_date)
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                row_errors.append(self._build_row_error(idx, row, exc))

        if created == 0 and row_errors:
            raise ValueError("No valid review rows to ingest")
        db.commit()
        result = {
            "status": "success",
            "venue_id": venue.id,
            "rows_ingested": created,
            "rows_skipped": skipped,
            "row_errors": row_errors[:25],
            "date_range": {"from": min(dates) if dates else None, "to": max(dates) if dates else None},
            "totals": {"avg_sentiment": round(sum(sentiments) / len(sentiments), 3) if sentiments else 0.0},
        }
        self._record_ingestion_run(
            db,
            venue_id=venue.id,
            dataset_type="reviews_csv",
            payload_hash=payload_hash,
            idempotency_key=idempotency_key,
            response_payload=result,
        )
        return result

    def ingest_recipes(self, db: Session, recipes: list[dict], venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        upserted = 0
        for payload in recipes:
            dish_name = (payload.get("dish_name") or "").strip()
            if not dish_name:
                raise ValueError("dish_name is required for every recipe")

            recipe = (
                db.query(RestaurantRecipe)
                .filter(RestaurantRecipe.venue_id == venue.id, RestaurantRecipe.dish_name == dish_name)
                .first()
            )
            if recipe is None:
                recipe = RestaurantRecipe(venue_id=venue.id, dish_name=dish_name)
                db.add(recipe)
                db.flush()

            recipe.selling_price = self._parse_float(payload.get("selling_price"), 0.0)
            recipe.portion_price = self._parse_float(payload.get("portion_price"), 0.0)

            db.query(RestaurantRecipeIngredient).filter(RestaurantRecipeIngredient.recipe_id == recipe.id).delete()
            for ing in payload.get("ingredients", []):
                db.add(
                    RestaurantRecipeIngredient(
                        recipe_id=recipe.id,
                        ingredient_name=ing.get("name") or ing.get("ingredient_name") or "Unknown ingredient",
                        quantity_per_dish=self._parse_float(ing.get("quantity"), self._parse_float(ing.get("quantity_per_dish"), 0.0)),
                        unit_cost=self._parse_float(ing.get("unit_cost"), 0.0),
                    )
                )
            upserted += 1

        db.commit()
        return {"status": "success", "venue_id": venue.id, "recipes_upserted": upserted}

    def get_venue_settings(self, db: Session, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        targets = self._kpi_targets(venue)
        return {
            "venue_id": venue.id,
            "name": venue.name,
            "currency": venue.currency,
            "timezone": venue.timezone,
            "targets": targets,
        }

    def update_venue_settings(
        self,
        db: Session,
        venue_id: Optional[str] = None,
        labor_target_pct: Optional[float] = None,
        food_target_pct: Optional[float] = None,
        sales_drop_alert_pct: Optional[float] = None,
    ) -> dict:
        venue = self._get_or_create_venue(db, venue_id)

        def _validated(value: Optional[float], field: str) -> Optional[float]:
            if value is None:
                return None
            v = self._parse_float(value, -1.0)
            if v < 0 or v > 100:
                raise ValueError(f"{field} must be between 0 and 100")
            return v

        labor = _validated(labor_target_pct, "labor_target_pct")
        food = _validated(food_target_pct, "food_target_pct")
        sales = _validated(sales_drop_alert_pct, "sales_drop_alert_pct")

        if labor is not None:
            venue.labor_target_pct = labor
        if food is not None:
            venue.food_target_pct = food
        if sales is not None:
            venue.sales_drop_alert_pct = sales

        db.commit()
        db.refresh(venue)
        return self.get_venue_settings(db, venue.id)

    # Analytics -----------------------------------------------------------------

    def get_finance_margin(self, db: Session, start_date: str, end_date: str, venue_id: Optional[str] = None, fixed_cost: float = 3000.0) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        dr = DateRange(self._normalize_date(start_date), self._normalize_date(end_date))

        sales = (
            db.query(RestaurantSale)
            .filter(RestaurantSale.venue_id == venue.id, RestaurantSale.sale_date >= dr.start, RestaurantSale.sale_date <= dr.end)
            .all()
        )
        recipe_costs = self._recipe_cost_map(db, venue.id)

        by_item: dict[str, dict[str, float]] = {}
        by_channel: dict[str, float] = defaultdict(float)
        total_rev = 0.0
        total_cogs = 0.0

        for row in sales:
            item = by_item.setdefault(row.menu_item, {
                "menu_item": row.menu_item,
                "quantity": 0,
                "revenue": 0.0,
                "estimated_cogs": 0.0,
                "gross_margin": 0.0,
                "margin_pct": 0.0,
            })
            cogs = recipe_costs.get((row.menu_item or "").lower(), 0.0) * row.quantity
            item["quantity"] += row.quantity
            item["revenue"] += row.net_sales
            item["estimated_cogs"] += cogs
            total_rev += row.net_sales
            total_cogs += cogs
            by_channel[row.channel or "unknown"] += row.net_sales

        items = []
        for item in by_item.values():
            gm = item["revenue"] - item["estimated_cogs"]
            item["gross_margin"] = round(gm, 2)
            item["margin_pct"] = round((gm / item["revenue"] * 100) if item["revenue"] else 0.0, 2)
            item["revenue"] = round(item["revenue"], 2)
            item["estimated_cogs"] = round(item["estimated_cogs"], 2)
            items.append(item)

        items.sort(key=lambda x: x["revenue"], reverse=True)
        gm_total = total_rev - total_cogs
        gm_pct = (gm_total / total_rev * 100) if total_rev else 0.0

        day_count = max((datetime.strptime(dr.end, "%Y-%m-%d") - datetime.strptime(dr.start, "%Y-%m-%d")).days + 1, 1)
        break_even = fixed_cost * day_count
        progress = (total_rev / break_even * 100) if break_even else 0.0

        return {
            "date_range": {"from": dr.start, "to": dr.end},
            "venue_id": venue.id,
            "summary": {
                "revenue": round(total_rev, 2),
                "estimated_cogs": round(total_cogs, 2),
                "gross_margin": round(gm_total, 2),
                "gross_margin_pct": round(gm_pct, 2),
                "break_even_revenue": round(break_even, 2),
                "break_even_progress_pct": round(progress, 2),
            },
            "items": items,
            "channel_sales": [{"channel": c, "revenue": round(v, 2)} for c, v in sorted(by_channel.items(), key=lambda kv: kv[1], reverse=True)],
        }

    def _inventory_alerts_internal(self, db: Session, venue_id: str, for_date: str) -> list[dict]:
        alerts: list[dict] = []

        rows = (
            db.query(RestaurantStockSnapshot)
            .filter(RestaurantStockSnapshot.venue_id == venue_id, RestaurantStockSnapshot.snapshot_date == for_date)
            .all()
        )
        for row in rows:
            if row.par_level > 0 and row.on_hand_qty < row.par_level:
                shortage = row.par_level - row.on_hand_qty
                alerts.append({
                    "category": "low_stock",
                    "severity": "high" if shortage / max(row.par_level, 1) >= 0.25 else "medium",
                    "title": f"Low stock: {row.item_name}",
                    "why": f"On hand is {row.on_hand_qty:.2f} vs par level {row.par_level:.2f}.",
                    "metric": round(shortage, 2),
                    "next_action": f"Reorder {row.item_name} to restore par level.",
                })
            if row.theoretical_usage > 0 and row.actual_usage > row.theoretical_usage * 1.1:
                variance_pct = ((row.actual_usage - row.theoretical_usage) / row.theoretical_usage) * 100
                alerts.append({
                    "category": "usage_variance",
                    "severity": "high" if variance_pct >= 20 else "medium",
                    "title": f"Usage variance: {row.item_name}",
                    "why": f"Actual usage is {variance_pct:.1f}% above theoretical.",
                    "metric": round(variance_pct, 2),
                    "next_action": f"Audit prep and portioning for {row.item_name}.",
                })

        purchases = (
            db.query(RestaurantPurchase)
            .filter(RestaurantPurchase.venue_id == venue_id, RestaurantPurchase.purchase_date <= for_date)
            .order_by(RestaurantPurchase.item_name.asc(), RestaurantPurchase.purchase_date.desc(), RestaurantPurchase.created_at.desc())
            .all()
        )
        grouped: dict[str, list[RestaurantPurchase]] = defaultdict(list)
        for p in purchases:
            key = p.item_name.lower()
            if len(grouped[key]) < 2:
                grouped[key].append(p)

        for entries in grouped.values():
            if len(entries) < 2:
                continue
            latest, prev = entries[0], entries[1]
            if prev.unit_cost <= 0:
                continue
            delta_pct = ((latest.unit_cost - prev.unit_cost) / prev.unit_cost) * 100
            if abs(delta_pct) >= 8:
                alerts.append({
                    "category": "supplier_price",
                    "severity": "high" if abs(delta_pct) >= 12 else "medium",
                    "title": f"Supplier price {'rose' if delta_pct > 0 else 'fell'}: {latest.item_name}",
                    "why": f"Unit cost changed {delta_pct:+.1f}% ({prev.unit_cost:.2f} -> {latest.unit_cost:.2f}).",
                    "metric": round(delta_pct, 2),
                    "next_action": "Review alternative suppliers or renegotiate pricing.",
                })

        return alerts

    def get_inventory_alerts(self, db: Session, for_date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(for_date)
        alerts = self._inventory_alerts_internal(db, venue.id, d)

        waste_rows = (
            db.query(RestaurantStockSnapshot)
            .filter(RestaurantStockSnapshot.venue_id == venue.id, RestaurantStockSnapshot.snapshot_date == d)
            .all()
        )
        waste_qty = sum(max(r.waste_qty, 0.0) for r in waste_rows)

        latest_cost: dict[str, float] = {}
        prices = (
            db.query(RestaurantPurchase)
            .filter(RestaurantPurchase.venue_id == venue.id, RestaurantPurchase.purchase_date <= d)
            .order_by(RestaurantPurchase.item_name.asc(), RestaurantPurchase.purchase_date.desc())
            .all()
        )
        for p in prices:
            key = p.item_name.lower()
            if key not in latest_cost:
                latest_cost[key] = p.unit_cost

        waste_cost = 0.0
        for row in waste_rows:
            waste_cost += max(row.waste_qty, 0.0) * latest_cost.get(row.item_name.lower(), 0.0)

        return {
            "date": d,
            "venue_id": venue.id,
            "alerts": alerts,
            "summary": {
                "alert_count": len(alerts),
                "estimated_waste_qty": round(waste_qty, 2),
                "estimated_waste_cost": round(waste_cost, 2),
            },
        }

    def get_control_tower_daily(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)
        targets = self._kpi_targets(venue)

        sales = db.query(RestaurantSale).filter(RestaurantSale.venue_id == venue.id, RestaurantSale.sale_date == d).all()
        labor = db.query(RestaurantLaborShift).filter(RestaurantLaborShift.venue_id == venue.id, RestaurantLaborShift.shift_date == d).all()
        reviews = db.query(RestaurantReview).filter(RestaurantReview.venue_id == venue.id, RestaurantReview.review_date == d).all()

        revenue = sum(s.net_sales for s in sales)
        forecast = sum((s.forecast_revenue if s.forecast_revenue is not None else s.net_sales) for s in sales)
        covers = sum(s.covers for s in sales)
        avg_check = revenue / covers if covers else 0.0

        labor_cost = sum(l.labor_cost for l in labor)
        labor_pct = (labor_cost / revenue * 100) if revenue else 0.0

        recipe_costs = self._recipe_cost_map(db, venue.id)
        food_cost = sum(recipe_costs.get((s.menu_item or "").lower(), 0.0) * s.quantity for s in sales)
        if food_cost == 0:
            food_cost = sum(
                p.total_cost
                for p in db.query(RestaurantPurchase).filter(RestaurantPurchase.venue_id == venue.id, RestaurantPurchase.purchase_date == d).all()
            )
        food_pct = (food_cost / revenue * 100) if revenue else 0.0

        sentiment = sum(r.sentiment_score for r in reviews) / len(reviews) if reviews else 0.0
        rev_vs_fc = ((revenue - forecast) / forecast * 100) if forecast else 0.0

        anomalies: list[dict] = []
        if forecast and revenue < forecast * (1 - (targets["sales_drop_alert_pct"] / 100.0)):
            anomalies.append({
                "category": "sales_gap",
                "severity": "high",
                "title": "Sales below forecast",
                "why": f"Revenue is {abs(rev_vs_fc):.1f}% below forecast.",
                "metric": round(rev_vs_fc, 2),
            })
        if labor_pct > targets["labor_target_pct"]:
            anomalies.append({
                "category": "labor_cost",
                "severity": "high",
                "title": "Labor cost above target",
                "why": f"Labor cost is {labor_pct:.1f}% vs target {targets['labor_target_pct']:.1f}%.",
                "metric": round(labor_pct, 2),
            })
        if food_pct > targets["food_target_pct"]:
            anomalies.append({
                "category": "food_cost",
                "severity": "medium",
                "title": "Food cost above target",
                "why": f"Food cost is {food_pct:.1f}% vs target {targets['food_target_pct']:.1f}%.",
                "metric": round(food_pct, 2),
            })

        inv_alerts = self._inventory_alerts_internal(db, venue.id, d)
        for alert in inv_alerts:
            if alert["category"] == "usage_variance":
                anomalies.append({
                    "category": "over_portioning",
                    "severity": alert["severity"],
                    "title": alert["title"],
                    "why": alert["why"],
                    "metric": alert["metric"],
                })

        for a in anomalies:
            exists = (
                db.query(RestaurantAnomaly)
                .filter(RestaurantAnomaly.venue_id == venue.id, RestaurantAnomaly.anomaly_date == d, RestaurantAnomaly.title == a["title"])
                .first()
            )
            if not exists:
                db.add(
                    RestaurantAnomaly(
                        venue_id=venue.id,
                        anomaly_date=d,
                        category=a["category"],
                        severity=a["severity"],
                        title=a["title"],
                        why=a["why"],
                        metric_value=a["metric"],
                        threshold=targets["labor_target_pct"] if a["category"] == "labor_cost" else (
                            targets["food_target_pct"] if a["category"] == "food_cost" else (
                                targets["sales_drop_alert_pct"] if a["category"] == "sales_gap" else 0.0
                            )
                        ),
                    )
                )
        db.commit()

        return {
            "date": d,
            "venue_id": venue.id,
            "kpis": {
                "revenue": round(revenue, 2),
                "forecast_revenue": round(forecast, 2),
                "revenue_vs_forecast_pct": round(rev_vs_fc, 2),
                "covers": covers,
                "avg_check": round(avg_check, 2),
                "labor_cost": round(labor_cost, 2),
                "labor_cost_pct": round(labor_pct, 2),
                "food_cost": round(food_cost, 2),
                "food_cost_pct": round(food_pct, 2),
                "review_sentiment": round(sentiment, 3),
            },
            "targets": targets,
            "anomalies": anomalies,
            "stock_alerts": inv_alerts,
        }

    def get_daily_recommendations(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)
        targets = self._kpi_targets(venue)
        control = self.get_control_tower_daily(db, d, venue.id)
        margin = self.get_finance_margin(db, d, d, venue.id)
        inventory = self.get_inventory_alerts(db, d, venue.id)

        k = control["kpis"]
        recs: list[dict] = []

        if k["revenue_vs_forecast_pct"] < -targets["sales_drop_alert_pct"]:
            recs.append({
                "category": "sales_recovery",
                "title": "Sales are below expected demand",
                "warning": f"Revenue is {abs(k['revenue_vs_forecast_pct']):.1f}% below forecast.",
                "why": "Demand is tracking under baseline for this service period.",
                "next_action": "Run a same-day promotion on top-selling dishes and adjust labor for late shift.",
                "automatable": True,
            })
        if k["labor_cost_pct"] > targets["labor_target_pct"]:
            recs.append({
                "category": "labor_optimization",
                "title": "Labor pressure detected",
                "warning": f"Labor is {k['labor_cost_pct']:.1f}% vs target {targets['labor_target_pct']:.1f}%.",
                "why": "Staffing is currently above demand-adjusted target.",
                "next_action": "Offer voluntary early release for one FOH shift and rebalance tomorrow's roster.",
                "automatable": True,
            })
        if k["food_cost_pct"] > targets["food_target_pct"]:
            recs.append({
                "category": "food_cost",
                "title": "Food cost above healthy range",
                "warning": f"Food cost is {k['food_cost_pct']:.1f}% vs target {targets['food_target_pct']:.1f}%.",
                "why": "Recipe cost and usage variance are diluting gross margin.",
                "next_action": "Audit portioning on top 3 dishes and test a 3-5% repricing where demand is inelastic.",
                "automatable": False,
            })

        low_margin = [i for i in margin["items"] if i["revenue"] > 0 and i["margin_pct"] < 40]
        if low_margin:
            w = low_margin[0]
            recs.append({
                "category": "menu_margin",
                "title": f"Low-margin dish: {w['menu_item']}",
                "warning": f"Margin is {w['margin_pct']:.1f}% on a high-volume item.",
                "why": "Current price-to-cost ratio is under target for this dish.",
                "next_action": f"Test incremental repricing or bundle strategy for {w['menu_item']}.",
                "automatable": False,
            })

        inv_high = [a for a in inventory["alerts"] if a["severity"] == "high"]
        if inv_high:
            top = inv_high[0]
            recs.append({
                "category": "inventory_risk",
                "title": top["title"],
                "warning": top["why"],
                "why": "Inventory risk may cause stockouts, over-portioning, or COGS inflation.",
                "next_action": top["next_action"],
                "automatable": True,
            })

        if not recs:
            recs.append({
                "category": "steady_state",
                "title": "Operations on track",
                "warning": "No critical anomalies detected for this date.",
                "why": "Current KPIs are inside configured guardrails.",
                "next_action": "Monitor evening service and keep tomorrow's prep plan unchanged.",
                "automatable": False,
            })

        for rec in recs:
            exists = (
                db.query(RestaurantRecommendation)
                .filter(RestaurantRecommendation.venue_id == venue.id, RestaurantRecommendation.rec_date == d, RestaurantRecommendation.title == rec["title"])
                .first()
            )
            if not exists:
                db.add(
                    RestaurantRecommendation(
                        venue_id=venue.id,
                        rec_date=d,
                        category=rec["category"],
                        title=rec["title"],
                        warning=rec["warning"],
                        why=rec["why"],
                        next_action=rec["next_action"],
                        automatable=rec["automatable"],
                        status="open",
                    )
                )
        db.commit()

        return {"date": d, "venue_id": venue.id, "targets": targets, "recommendations": recs, "kpi_snapshot": k}

    # Extended core functionality ------------------------------------------------

    def get_labor_forecast(self, db: Session, date: str, days: int = 7, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        start = datetime.strptime(self._normalize_date(date), "%Y-%m-%d")
        days = max(1, min(int(days), 30))

        sales = db.query(RestaurantSale).filter(RestaurantSale.venue_id == venue.id).all()
        labor = db.query(RestaurantLaborShift).filter(RestaurantLaborShift.venue_id == venue.id).all()

        covers_by_date: dict[str, int] = defaultdict(int)
        for row in sales:
            covers_by_date[row.sale_date] += row.covers

        labor_hours_by_date: dict[str, float] = defaultdict(float)
        for row in labor:
            labor_hours_by_date[row.shift_date] += row.hours_worked

        ratio_samples = [labor_hours_by_date[d] / c for d, c in covers_by_date.items() if c > 0 and labor_hours_by_date.get(d, 0) > 0]
        labor_hours_per_cover = sum(ratio_samples) / len(ratio_samples) if ratio_samples else 0.22

        hourly_samples = [row.hourly_rate for row in labor if row.hourly_rate > 0]
        avg_hourly = sum(hourly_samples) / len(hourly_samples) if hourly_samples else 16.0

        by_weekday: dict[int, list[int]] = defaultdict(list)
        for d, c in covers_by_date.items():
            by_weekday[datetime.strptime(d, "%Y-%m-%d").weekday()].append(c)
        overall_avg = sum(covers_by_date.values()) / len(covers_by_date) if covers_by_date else 40

        forecast = []
        for i in range(days):
            day = start + timedelta(days=i)
            weekday_vals = by_weekday.get(day.weekday(), [])
            predicted_covers = round(sum(weekday_vals) / len(weekday_vals)) if weekday_vals else round(overall_avg)
            predicted_hours = round(predicted_covers * labor_hours_per_cover, 2)
            forecast.append({
                "date": day.strftime("%Y-%m-%d"),
                "predicted_covers": max(predicted_covers, 0),
                "predicted_labor_hours": predicted_hours,
                "predicted_labor_cost": round(predicted_hours * avg_hourly, 2),
            })

        return {
            "start_date": start.strftime("%Y-%m-%d"),
            "days": days,
            "venue_id": venue.id,
            "assumptions": {"labor_hours_per_cover": round(labor_hours_per_cover, 3), "avg_hourly_rate": round(avg_hourly, 2)},
            "forecast": forecast,
        }

    def get_menu_engineering(self, db: Session, start_date: str, end_date: str, venue_id: Optional[str] = None) -> dict:
        margin = self.get_finance_margin(db, start_date, end_date, venue_id)
        items = margin["items"]
        if not items:
            return {
                "date_range": margin["date_range"],
                "venue_id": margin["venue_id"],
                "thresholds": {"avg_quantity": 0, "avg_gross_margin_per_item": 0},
                "items": [],
                "summary": {"stars": 0, "puzzles": 0, "plowhorses": 0, "dogs": 0},
            }

        avg_qty = sum(i["quantity"] for i in items) / len(items)
        avg_gm = sum(i["gross_margin"] for i in items) / len(items)

        summary = {"stars": 0, "puzzles": 0, "plowhorses": 0, "dogs": 0}
        enriched = []
        for i in items:
            high_pop = i["quantity"] >= avg_qty
            high_margin = i["gross_margin"] >= avg_gm
            if high_pop and high_margin:
                category = "star"
                action = "Promote this dish in prime slots and bundles."
                summary["stars"] += 1
            elif (not high_pop) and high_margin:
                category = "puzzle"
                action = "Increase visibility and test naming/placement."
                summary["puzzles"] += 1
            elif high_pop and (not high_margin):
                category = "plowhorse"
                action = "Optimize portioning or apply mild repricing."
                summary["plowhorses"] += 1
            else:
                category = "dog"
                action = "Consider removal or redesign with lower COGS."
                summary["dogs"] += 1

            enriched.append({**i, "category": category, "recommended_action": action})

        return {
            "date_range": margin["date_range"],
            "venue_id": margin["venue_id"],
            "thresholds": {"avg_quantity": round(avg_qty, 2), "avg_gross_margin_per_item": round(avg_gm, 2)},
            "items": enriched,
            "summary": summary,
        }

    def get_procurement_opportunities(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        end_date = self._normalize_date(date)
        start_date = (datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d")

        rows = (
            db.query(RestaurantPurchase)
            .filter(RestaurantPurchase.venue_id == venue.id, RestaurantPurchase.purchase_date >= start_date, RestaurantPurchase.purchase_date <= end_date)
            .all()
        )

        grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
        spend_by_item: dict[str, float] = defaultdict(float)
        latest_by_item: dict[str, RestaurantPurchase] = {}

        for r in rows:
            item = r.item_name.lower()
            supplier = (r.supplier or "unknown").lower()
            grouped[item][supplier].append(r.unit_cost)
            spend_by_item[item] += r.total_cost
            latest = latest_by_item.get(item)
            if latest is None or r.purchase_date > latest.purchase_date:
                latest_by_item[item] = r

        opportunities = []
        risks = []
        for item, supplier_costs in grouped.items():
            averages = {s: (sum(v) / len(v)) for s, v in supplier_costs.items() if v}
            if not averages:
                continue
            best_supplier = min(averages, key=averages.get)
            best_cost = averages[best_supplier]
            current = latest_by_item.get(item)
            if current and current.unit_cost > 0:
                savings_pct = ((current.unit_cost - best_cost) / current.unit_cost) * 100
                if savings_pct >= 5:
                    est_monthly_qty = max(current.quantity * 4, 1)
                    opportunities.append({
                        "item_name": current.item_name,
                        "current_supplier": current.supplier,
                        "current_unit_cost": round(current.unit_cost, 2),
                        "best_supplier": best_supplier.title(),
                        "best_unit_cost": round(best_cost, 2),
                        "savings_pct": round(savings_pct, 2),
                        "estimated_monthly_savings": round((current.unit_cost - best_cost) * est_monthly_qty, 2),
                        "next_action": "Shift 20-30% volume to best supplier and monitor fill rate.",
                    })

            if len(supplier_costs) == 1 and spend_by_item[item] > 100:
                only = next(iter(supplier_costs.keys()))
                risks.append({
                    "item_name": current.item_name if current else item.title(),
                    "supplier": only.title(),
                    "risk": "single_supplier_dependency",
                    "next_action": "Qualify a backup supplier to reduce supply risk.",
                })

        opportunities.sort(key=lambda x: x["estimated_monthly_savings"], reverse=True)
        return {
            "as_of_date": end_date,
            "venue_id": venue.id,
            "opportunities": opportunities,
            "dependency_risks": risks,
            "summary": {
                "opportunity_count": len(opportunities),
                "risk_count": len(risks),
                "estimated_monthly_savings": round(sum(o["estimated_monthly_savings"] for o in opportunities), 2),
            },
        }

    def get_supplier_risk(self, db: Session, start_date: str, end_date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        dr = DateRange(self._normalize_date(start_date), self._normalize_date(end_date))

        rows = (
            db.query(RestaurantPurchase)
            .filter(
                RestaurantPurchase.venue_id == venue.id,
                RestaurantPurchase.purchase_date >= dr.start,
                RestaurantPurchase.purchase_date <= dr.end,
            )
            .all()
        )
        if not rows:
            return {
                "date_range": {"from": dr.start, "to": dr.end},
                "venue_id": venue.id,
                "suppliers": [],
                "summary": {"supplier_count": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0},
            }

        spend_total = sum(r.total_cost for r in rows)
        supplier_spend: dict[str, float] = defaultdict(float)
        supplier_items: dict[str, set[str]] = defaultdict(set)
        item_suppliers: dict[str, set[str]] = defaultdict(set)
        supplier_item_costs: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

        for row in rows:
            supplier = row.supplier or "Unknown supplier"
            item = row.item_name.lower()
            supplier_spend[supplier] += row.total_cost
            supplier_items[supplier].add(item)
            item_suppliers[item].add(supplier)
            supplier_item_costs[supplier][item].append(max(row.unit_cost, 0.0))

        suppliers = []
        for supplier, spend in supplier_spend.items():
            spend_share = (spend / spend_total * 100) if spend_total else 0.0
            items = supplier_items[supplier]
            single_source_items = [i for i in items if len(item_suppliers[i]) == 1]
            dependency_pct = (len(single_source_items) / len(items) * 100) if items else 0.0

            volatility_samples = []
            for costs in supplier_item_costs[supplier].values():
                if len(costs) < 2:
                    continue
                avg = sum(costs) / len(costs)
                if avg <= 0:
                    continue
                volatility_samples.append(((max(costs) - min(costs)) / avg) * 100)
            volatility_pct = sum(volatility_samples) / len(volatility_samples) if volatility_samples else 0.0

            risk_score = min(100.0, 15.0 + spend_share * 0.5 + dependency_pct * 0.35 + volatility_pct * 0.4)
            if risk_score >= 70:
                band = "high"
                action = "Qualify backup supplier and cap weekly allocation."
            elif risk_score >= 40:
                band = "medium"
                action = "Track pricing weekly and diversify at least one key item."
            else:
                band = "low"
                action = "Maintain current contract terms and monitor monthly."

            suppliers.append(
                {
                    "supplier": supplier,
                    "spend": round(spend, 2),
                    "spend_share_pct": round(spend_share, 2),
                    "items_count": len(items),
                    "single_source_item_pct": round(dependency_pct, 2),
                    "price_volatility_pct": round(volatility_pct, 2),
                    "risk_score": round(risk_score, 2),
                    "risk_band": band,
                    "next_action": action,
                }
            )

        suppliers.sort(key=lambda x: x["risk_score"], reverse=True)
        return {
            "date_range": {"from": dr.start, "to": dr.end},
            "venue_id": venue.id,
            "suppliers": suppliers,
            "summary": {
                "supplier_count": len(suppliers),
                "high_risk": len([s for s in suppliers if s["risk_band"] == "high"]),
                "medium_risk": len([s for s in suppliers if s["risk_band"] == "medium"]),
                "low_risk": len([s for s in suppliers if s["risk_band"] == "low"]),
            },
        }

    def get_weekly_owner_report(self, db: Session, week_start: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        start = datetime.strptime(self._normalize_date(week_start), "%Y-%m-%d")
        end = start + timedelta(days=6)
        start_str = start.strftime("%Y-%m-%d")
        end_str = end.strftime("%Y-%m-%d")

        margin = self.get_finance_margin(db, start_str, end_str, venue.id)

        labor_rows = (
            db.query(RestaurantLaborShift)
            .filter(RestaurantLaborShift.venue_id == venue.id, RestaurantLaborShift.shift_date >= start_str, RestaurantLaborShift.shift_date <= end_str)
            .all()
        )
        labor_cost = sum(r.labor_cost for r in labor_rows)
        revenue = margin["summary"]["revenue"]
        labor_pct = (labor_cost / revenue * 100) if revenue else 0.0

        stock_rows = (
            db.query(RestaurantStockSnapshot)
            .filter(RestaurantStockSnapshot.venue_id == venue.id, RestaurantStockSnapshot.snapshot_date >= start_str, RestaurantStockSnapshot.snapshot_date <= end_str)
            .all()
        )
        waste_qty = sum(max(r.waste_qty, 0.0) for r in stock_rows)

        reviews = (
            db.query(RestaurantReview)
            .filter(RestaurantReview.venue_id == venue.id, RestaurantReview.review_date >= start_str, RestaurantReview.review_date <= end_str)
            .all()
        )
        sentiment = sum(r.sentiment_score for r in reviews) / len(reviews) if reviews else 0.0

        clusters = {
            "wait_time": ["wait", "slow", "late", "delay"],
            "service": ["rude", "service", "staff"],
            "food_quality": ["cold", "undercooked", "burnt", "taste"],
            "price_value": ["expensive", "price", "overpriced"],
        }
        complaints = {k: 0 for k in clusters}
        for review in reviews:
            text = (review.text or "").lower()
            for key, terms in clusters.items():
                if any(t in text for t in terms):
                    complaints[key] += 1

        rec_rows = (
            db.query(RestaurantRecommendation)
            .filter(RestaurantRecommendation.venue_id == venue.id, RestaurantRecommendation.rec_date >= start_str, RestaurantRecommendation.rec_date <= end_str)
            .all()
        )

        return {
            "week_start": start_str,
            "week_end": end_str,
            "venue_id": venue.id,
            "financials": {
                "revenue": margin["summary"]["revenue"],
                "gross_margin": margin["summary"]["gross_margin"],
                "gross_margin_pct": margin["summary"]["gross_margin_pct"],
                "labor_cost": round(labor_cost, 2),
                "labor_cost_pct": round(labor_pct, 2),
            },
            "operations": {
                "waste_qty": round(waste_qty, 2),
                "review_sentiment": round(sentiment, 3),
                "complaint_clusters": complaints,
            },
            "top_menu_items_by_revenue": margin["items"][:5],
            "recommended_focus_areas": [r.title for r in rec_rows[:5]],
        }

    def run_hiring_scenario(
        self,
        db: Session,
        from_date: str,
        to_date: str,
        additional_weekly_cost: float,
        venue_id: Optional[str] = None,
        fixed_cost_per_day: float = 3000.0,
    ) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        margin = self.get_finance_margin(db, from_date, to_date, venue.id)
        start = datetime.strptime(margin["date_range"]["from"], "%Y-%m-%d")
        end = datetime.strptime(margin["date_range"]["to"], "%Y-%m-%d")
        total_days = max((end - start).days + 1, 1)
        weeks = max(total_days / 7.0, 1.0)

        labor_rows = (
            db.query(RestaurantLaborShift)
            .filter(RestaurantLaborShift.venue_id == venue.id, RestaurantLaborShift.shift_date >= margin["date_range"]["from"], RestaurantLaborShift.shift_date <= margin["date_range"]["to"])
            .all()
        )
        labor_cost = sum(r.labor_cost for r in labor_rows)

        additional_cost = additional_weekly_cost * weeks
        fixed_total = fixed_cost_per_day * total_days
        operating_buffer = margin["summary"]["gross_margin"] - labor_cost - fixed_total
        projected_buffer = operating_buffer - additional_cost

        can_afford = projected_buffer >= 0
        return {
            "date_range": margin["date_range"],
            "venue_id": venue.id,
            "inputs": {
                "additional_weekly_cost": round(additional_weekly_cost, 2),
                "fixed_cost_per_day": round(fixed_cost_per_day, 2),
            },
            "current": {
                "gross_margin": margin["summary"]["gross_margin"],
                "labor_cost": round(labor_cost, 2),
                "operating_buffer": round(operating_buffer, 2),
            },
            "projected": {
                "additional_cost_for_range": round(additional_cost, 2),
                "operating_buffer_after_hire": round(projected_buffer, 2),
            },
            "decision": {
                "can_afford": can_afford,
                "reason": (
                    "Projected operating buffer remains positive."
                    if can_afford
                    else "Projected operating buffer turns negative with this hire cost."
                ),
            },
        }

    def get_portfolio_rollup(self, db: Session, start_date: str, end_date: str) -> dict:
        dr = DateRange(self._normalize_date(start_date), self._normalize_date(end_date))
        venues = db.query(RestaurantVenue).all()
        rows = []

        for venue in venues:
            margin = self.get_finance_margin(db, dr.start, dr.end, venue.id)
            labor_rows = (
                db.query(RestaurantLaborShift)
                .filter(
                    RestaurantLaborShift.venue_id == venue.id,
                    RestaurantLaborShift.shift_date >= dr.start,
                    RestaurantLaborShift.shift_date <= dr.end,
                )
                .all()
            )
            labor_cost = sum(r.labor_cost for r in labor_rows)
            revenue = margin["summary"]["revenue"]
            labor_pct = (labor_cost / revenue * 100) if revenue else 0.0

            rows.append(
                {
                    "venue_id": venue.id,
                    "venue_name": venue.name,
                    "currency": venue.currency,
                    "revenue": round(revenue, 2),
                    "gross_margin": round(margin["summary"]["gross_margin"], 2),
                    "gross_margin_pct": round(margin["summary"]["gross_margin_pct"], 2),
                    "labor_cost": round(labor_cost, 2),
                    "labor_cost_pct": round(labor_pct, 2),
                    "recommendation_count": len(
                        db.query(RestaurantRecommendation)
                        .filter(
                            RestaurantRecommendation.venue_id == venue.id,
                            RestaurantRecommendation.rec_date >= dr.start,
                            RestaurantRecommendation.rec_date <= dr.end,
                        )
                        .all()
                    ),
                }
            )

        summary = {
            "venue_count": len(rows),
            "revenue": round(sum(v["revenue"] for v in rows), 2),
            "gross_margin": round(sum(v["gross_margin"] for v in rows), 2),
            "labor_cost": round(sum(v["labor_cost"] for v in rows), 2),
        }
        summary["gross_margin_pct"] = round(
            (summary["gross_margin"] / summary["revenue"] * 100) if summary["revenue"] else 0.0,
            2,
        )
        summary["labor_cost_pct"] = round(
            (summary["labor_cost"] / summary["revenue"] * 100) if summary["revenue"] else 0.0,
            2,
        )

        return {
            "date_range": {"from": dr.start, "to": dr.end},
            "summary": summary,
            "venues": sorted(rows, key=lambda x: x["revenue"], reverse=True),
        }

    def get_labor_optimizer(
        self, db: Session, date: str, venue_id: Optional[str] = None, target_labor_pct: float = 30.0
    ) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)
        control = self.get_control_tower_daily(db, d, venue.id)
        forecast = self.get_labor_forecast(db, d, days=1, venue_id=venue.id)
        pred = forecast["forecast"][0]

        revenue_baseline = max(control["kpis"]["forecast_revenue"], control["kpis"]["revenue"], 1.0)
        target_cost = revenue_baseline * (target_labor_pct / 100.0)
        delta_cost = pred["predicted_labor_cost"] - target_cost
        avg_hourly = max(forecast["assumptions"]["avg_hourly_rate"], 1.0)
        delta_hours = delta_cost / avg_hourly

        if delta_cost > 0:
            action = "reduce_staffing"
            message = "Predicted labor spend is above target. Reduce one low-demand shift block."
        elif delta_cost < -40:
            action = "add_capacity"
            message = "Predicted labor spend is below target. Add coverage for service-quality resilience."
        else:
            action = "hold_schedule"
            message = "Schedule is inside labor guardrails. Keep staffing plan unchanged."

        return {
            "date": d,
            "venue_id": venue.id,
            "targets": {"labor_cost_pct": round(target_labor_pct, 2)},
            "baseline": {
                "forecast_revenue": round(revenue_baseline, 2),
                "predicted_labor_cost": round(pred["predicted_labor_cost"], 2),
                "target_labor_cost": round(target_cost, 2),
            },
            "optimization": {
                "action": action,
                "message": message,
                "estimated_cost_delta": round(delta_cost, 2),
                "recommended_shift_adjustment_hours": round(delta_hours, 2),
            },
        }

    def get_inventory_auto_order(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)

        stock_rows = (
            db.query(RestaurantStockSnapshot)
            .filter(RestaurantStockSnapshot.venue_id == venue.id, RestaurantStockSnapshot.snapshot_date == d)
            .all()
        )
        purchases = (
            db.query(RestaurantPurchase)
            .filter(RestaurantPurchase.venue_id == venue.id, RestaurantPurchase.purchase_date <= d)
            .order_by(RestaurantPurchase.item_name.asc(), RestaurantPurchase.purchase_date.desc())
            .all()
        )
        latest_cost: dict[str, float] = {}
        latest_supplier: dict[str, str] = {}
        for row in purchases:
            key = row.item_name.lower()
            if key not in latest_cost:
                latest_cost[key] = row.unit_cost
                latest_supplier[key] = row.supplier or "Default Supplier"

        order_lines = []
        total = 0.0
        for row in stock_rows:
            if row.par_level <= 0 or row.on_hand_qty >= row.par_level:
                continue
            shortage = row.par_level - row.on_hand_qty
            order_qty = round(shortage * 1.1, 2)
            unit_cost = latest_cost.get(row.item_name.lower(), 0.0)
            line_total = round(order_qty * unit_cost, 2)
            total += line_total
            order_lines.append(
                {
                    "item_name": row.item_name,
                    "supplier": latest_supplier.get(row.item_name.lower(), "Default Supplier"),
                    "order_qty": order_qty,
                    "unit_cost": round(unit_cost, 2),
                    "line_total": line_total,
                    "why": f"On hand {row.on_hand_qty:.2f} below par {row.par_level:.2f}.",
                }
            )

        return {
            "date": d,
            "venue_id": venue.id,
            "purchase_order_draft": {
                "line_count": len(order_lines),
                "total_estimated_cost": round(total, 2),
                "lines": order_lines,
            },
        }

    def get_menu_repricing(self, db: Session, start_date: str, end_date: str, venue_id: Optional[str] = None) -> dict:
        engineering = self.get_menu_engineering(db, start_date, end_date, venue_id)
        suggestions = []

        for item in engineering["items"]:
            if item["quantity"] <= 0:
                continue
            current_avg_price = item["revenue"] / item["quantity"]
            if item["category"] == "plowhorse":
                pct = 5.0
                reason = "High popularity with below-average margin."
            elif item["category"] == "dog":
                pct = 8.0
                reason = "Low popularity and weak margin profile."
            elif item["category"] == "puzzle":
                pct = 0.0
                reason = "Keep price stable; improve placement and visibility first."
            else:
                continue

            target_price = current_avg_price * (1 + pct / 100.0)
            suggestions.append(
                {
                    "menu_item": item["menu_item"],
                    "category": item["category"],
                    "current_avg_price": round(current_avg_price, 2),
                    "recommended_price": round(target_price, 2),
                    "recommended_change_pct": round(pct, 2),
                    "expected_margin_pct": round(item["margin_pct"] + (pct * 0.6), 2),
                    "reason": reason,
                }
            )

        suggestions.sort(key=lambda x: x["recommended_change_pct"], reverse=True)
        return {
            "date_range": engineering["date_range"],
            "venue_id": engineering["venue_id"],
            "repricing_suggestions": suggestions,
            "summary": {
                "suggestion_count": len(suggestions),
                "high_priority": len([s for s in suggestions if s["recommended_change_pct"] >= 5]),
            },
        }

    def get_reputation_winback(self, db: Session, week_start: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        report = self.get_weekly_owner_report(db, week_start, venue.id)
        start_str = report["week_start"]
        end_str = report["week_end"]

        low_reviews = (
            db.query(RestaurantReview)
            .filter(
                RestaurantReview.venue_id == venue.id,
                RestaurantReview.review_date >= start_str,
                RestaurantReview.review_date <= end_str,
                RestaurantReview.rating <= 3,
            )
            .all()
        )

        complaints = report["operations"]["complaint_clusters"]
        playbook = []
        if complaints.get("wait_time", 0) > 0:
            playbook.append("Send apology + priority-booking offer to guests with service-delay complaints.")
        if complaints.get("food_quality", 0) > 0:
            playbook.append("Issue targeted dessert or appetizer recovery coupon to low-rating guests.")
        if complaints.get("price_value", 0) > 0:
            playbook.append("Launch value bundle for weekdays and message price-value improvements.")
        if not playbook:
            playbook.append("Run a general win-back campaign for guests inactive for 45+ days.")

        return {
            "week_start": start_str,
            "week_end": end_str,
            "venue_id": venue.id,
            "segments": {
                "low_rating_reviews": len(low_reviews),
                "estimated_winback_targets": max(len(low_reviews) * 3, len(low_reviews)),
            },
            "campaign_playbook": playbook,
            "sentiment": report["operations"]["review_sentiment"],
        }

    def get_ops_readiness(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)
        control = self.get_control_tower_daily(db, d, venue.id)
        inventory = self.get_inventory_alerts(db, d, venue.id)
        labor = self.get_labor_optimizer(db, d, venue.id)

        score = 100
        score -= len([a for a in control["anomalies"] if a["severity"] == "high"]) * 12
        score -= len([a for a in inventory["alerts"] if a["severity"] == "high"]) * 10
        score -= 8 if labor["optimization"]["action"] == "reduce_staffing" else 0
        score = max(score, 0)

        if score >= 80:
            band = "green"
        elif score >= 60:
            band = "amber"
        else:
            band = "red"

        blockers = [a["title"] for a in control["anomalies"] if a["severity"] == "high"]
        blockers += [a["title"] for a in inventory["alerts"] if a["severity"] == "high"]
        if labor["optimization"]["action"] == "reduce_staffing":
            blockers.append("Labor cost forecast above target")

        return {
            "date": d,
            "venue_id": venue.id,
            "readiness_score": score,
            "status_band": band,
            "critical_blockers": blockers,
            "next_actions": [
                labor["optimization"]["message"],
                "Resolve high-severity inventory alerts before next service."
                if inventory["summary"]["alert_count"] > 0
                else "Maintain current prep and ordering workflow.",
            ],
        }

    def get_observability_summary(self, db: Session, date: str, venue_id: Optional[str] = None) -> dict:
        venue = self._get_or_create_venue(db, venue_id)
        d = self._normalize_date(date)
        d_obj = datetime.strptime(d, "%Y-%m-%d")
        window_start = (d_obj - timedelta(days=6)).strftime("%Y-%m-%d")

        ingestion_rows = (
            db.query(RestaurantIngestionRun)
            .filter(
                RestaurantIngestionRun.venue_id == venue.id,
                RestaurantIngestionRun.created_at >= datetime.strptime(window_start, "%Y-%m-%d"),
            )
            .all()
        )
        anomalies = (
            db.query(RestaurantAnomaly)
            .filter(RestaurantAnomaly.venue_id == venue.id, RestaurantAnomaly.anomaly_date == d)
            .all()
        )
        recommendations = (
            db.query(RestaurantRecommendation)
            .filter(
                RestaurantRecommendation.venue_id == venue.id,
                RestaurantRecommendation.rec_date == d,
                RestaurantRecommendation.status == "open",
            )
            .all()
        )

        max_sale = db.query(RestaurantSale).filter(RestaurantSale.venue_id == venue.id).order_by(RestaurantSale.sale_date.desc()).first()
        max_purchase = (
            db.query(RestaurantPurchase)
            .filter(RestaurantPurchase.venue_id == venue.id)
            .order_by(RestaurantPurchase.purchase_date.desc())
            .first()
        )
        max_labor = (
            db.query(RestaurantLaborShift)
            .filter(RestaurantLaborShift.venue_id == venue.id)
            .order_by(RestaurantLaborShift.shift_date.desc())
            .first()
        )

        freshness = {
            "last_sale_date": max_sale.sale_date if max_sale else None,
            "last_purchase_date": max_purchase.purchase_date if max_purchase else None,
            "last_labor_date": max_labor.shift_date if max_labor else None,
        }
        stale_sources = []
        for src, value in freshness.items():
            if not value:
                stale_sources.append(src)
                continue
            age_days = (d_obj - datetime.strptime(value, "%Y-%m-%d")).days
            if age_days > 2:
                stale_sources.append(src)

        readiness = self.get_ops_readiness(db, d, venue.id)
        if readiness["status_band"] == "red" or stale_sources:
            status = "degraded"
        elif readiness["status_band"] == "amber":
            status = "warning"
        else:
            status = "healthy"

        return {
            "date": d,
            "window_start": window_start,
            "venue_id": venue.id,
            "status": status,
            "ingestion_health": {
                "total_runs_7d": len(ingestion_rows),
                "processed_runs_7d": len([r for r in ingestion_rows if r.status == "processed"]),
                "duplicate_runs_7d": len([r for r in ingestion_rows if r.status == "duplicate"]),
                "failed_runs_7d": len([r for r in ingestion_rows if r.status == "failed"]),
            },
            "operations_health": {
                "anomalies_today": len(anomalies),
                "high_anomalies_today": len([a for a in anomalies if a.severity == "high"]),
                "open_recommendations_today": len(recommendations),
            },
            "data_freshness": {**freshness, "stale_sources": stale_sources},
            "readiness": readiness,
        }

    # Brain integration ----------------------------------------------------------

    async def handle(self, message: str, context: dict) -> dict:
        db = SessionLocal()
        try:
            venue_id = context.get("venue_id") if context else None
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            msg = (message or "").lower()

            if any(k in msg for k in ["profit", "margin", "dish", "menu"]):
                margin = self.get_finance_margin(db, today, today, venue_id)
                low = [i for i in margin["items"] if i["margin_pct"] < 40]
                if low:
                    w = low[0]
                    return {"response": f"Margin update: {w['menu_item']} is under target at {w['margin_pct']}% margin. Recommend repricing or bundle optimization."}
                return {"response": "Margin update: no low-margin dish detected in today's data."}

            if any(k in msg for k in ["order", "reorder", "stock", "waste", "inventory"]):
                inv = self.get_inventory_alerts(db, today, venue_id)
                if inv["alerts"]:
                    top = inv["alerts"][0]
                    return {"response": f"Inventory alert: {top['title']}. {top['why']} Next action: {top['next_action']}"}
                return {"response": "Inventory looks stable for today. No urgent stock or waste alerts."}

            if any(k in msg for k in ["shift", "labor", "staff", "covers"]):
                ct = self.get_control_tower_daily(db, today, venue_id)
                return {"response": f"Labor is {ct['kpis']['labor_cost_pct']}% of revenue with {ct['kpis']['covers']} covers. If demand stays below forecast, reduce one late shift role."}

            if any(k in msg for k in ["review", "rating", "sentiment", "complaint"]):
                week_start = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=6)).strftime("%Y-%m-%d")
                report = self.get_weekly_owner_report(db, week_start, venue_id)
                return {"response": f"Guest sentiment this week is {report['operations']['review_sentiment']}. Top complaint clusters: {report['operations']['complaint_clusters']}"}

            if any(k in msg for k in ["supplier", "procurement", "negotiat", "cost increase"]):
                p = self.get_procurement_opportunities(db, today, venue_id)
                if p["opportunities"]:
                    top = p["opportunities"][0]
                    return {"response": f"Procurement opportunity: {top['item_name']} can save about €{top['estimated_monthly_savings']} monthly via {top['best_supplier']}."}
                return {"response": "No significant procurement savings opportunities detected right now."}

            recs = self.get_daily_recommendations(db, today, venue_id)
            top = recs["recommendations"][0]
            return {"response": f"Daily recommendation: {top['title']}. {top['warning']} Why: {top['why']} Next action: {top['next_action']}"}
        finally:
            db.close()
