"""Contract and integration tests for TablePilot restaurant endpoints."""

from io import BytesIO


def _upload(client, path: str, csv_text: str, filename: str = "data.csv"):
    return client.post(
        path,
        files={"file": (filename, BytesIO(csv_text.encode("utf-8")), "text/csv")},
    )


def test_ingest_pos_csv_happy_path(client):
    csv_text = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-08,Burger,10,180,20,in_store,200\n"
        "2026-03-08,Chicken Plate,8,160,15,in_store,170\n"
    )
    response = _upload(client, "/restaurant/ingest/pos-csv", csv_text)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["rows_ingested"] == 2
    assert data["totals"]["revenue"] == 340.0


def test_ingest_pos_csv_missing_columns_returns_400(client):
    bad_csv = "date,menu_item,quantity\n2026-03-08,Burger,3\n"
    response = _upload(client, "/restaurant/ingest/pos-csv", bad_csv)
    assert response.status_code == 400
    assert "Missing required columns" in response.json()["detail"]


def test_ingest_pos_csv_returns_row_level_errors_for_bad_rows(client):
    csv_text = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "not-a-date,Burger,10,180,20,in_store,200\n"
        "2026-03-08,Chicken Plate,8,160,15,in_store,170\n"
    )
    response = _upload(client, "/restaurant/ingest/pos-csv?venue_id=venue-row-errors", csv_text)
    assert response.status_code == 200
    payload = response.json()
    assert payload["rows_ingested"] == 1
    assert payload["rows_skipped"] == 1
    assert len(payload["row_errors"]) == 1
    assert payload["row_errors"][0]["row_number"] == 2


def test_control_tower_margin_alerts_and_recommendations_flow(client):
    pos_csv = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-09,Burger,10,180,20,in_store,240\n"
        "2026-03-09,Steak,6,210,10,in_store,260\n"
    )
    purchases_csv = (
        "date,item_name,quantity,unit_cost,total_cost,supplier,on_hand_qty,par_level,waste_qty,theoretical_usage,actual_usage\n"
        "2026-03-09,Beef,25,6,150,Supplier A,8,15,2,12,16\n"
        "2026-03-09,Bread,30,0.8,24,Supplier A,12,10,0,8,7\n"
        "2026-03-07,Beef,20,5,100,Supplier A,20,15,1,10,9\n"
    )
    labor_csv = (
        "date,staff_name,role,hours_worked,hourly_rate,labor_cost,scheduled_covers\n"
        "2026-03-09,Alice,server,8,18,144,35\n"
        "2026-03-09,Bob,cook,9,20,180,35\n"
    )

    recipe_payload = {
        "recipes": [
            {
                "dish_name": "Burger",
                "selling_price": 18,
                "ingredients": [
                    {"name": "Beef", "quantity": 0.25, "unit_cost": 6},
                    {"name": "Bread", "quantity": 1, "unit_cost": 0.8},
                ],
            },
            {
                "dish_name": "Steak",
                "selling_price": 35,
                "ingredients": [
                    {"name": "Beef", "quantity": 0.4, "unit_cost": 6},
                ],
            },
        ]
    }

    assert _upload(client, "/restaurant/ingest/pos-csv", pos_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/purchases-csv", purchases_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/labor-csv", labor_csv).status_code == 200
    recipes_resp = client.post("/restaurant/ingest/recipes", json=recipe_payload)
    assert recipes_resp.status_code == 200
    assert recipes_resp.json()["recipes_upserted"] == 2

    ct = client.get("/restaurant/control-tower/daily", params={"date": "2026-03-09"})
    assert ct.status_code == 200
    ct_data = ct.json()
    assert ct_data["kpis"]["revenue"] == 390.0
    assert ct_data["kpis"]["labor_cost_pct"] > 30
    assert isinstance(ct_data["anomalies"], list)

    margin = client.get("/restaurant/finance/margin", params={"from": "2026-03-09", "to": "2026-03-09"})
    assert margin.status_code == 200
    margin_data = margin.json()
    assert margin_data["summary"]["revenue"] == 390.0
    assert len(margin_data["items"]) >= 2

    alerts = client.get("/restaurant/inventory/alerts", params={"date": "2026-03-09"})
    assert alerts.status_code == 200
    alerts_data = alerts.json()
    assert alerts_data["summary"]["alert_count"] >= 1

    recs = client.get("/restaurant/recommendations/daily", params={"date": "2026-03-09"})
    assert recs.status_code == 200
    rec_data = recs.json()
    assert len(rec_data["recommendations"]) >= 1
    assert all("next_action" in r for r in rec_data["recommendations"])


def test_venue_threshold_settings_change_recommendation_behavior(client):
    venue_id = "venue-thresholds"
    pos_csv = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-10,Burger,10,200,20,in_store,200\n"
    )
    labor_csv = (
        "date,staff_name,role,hours_worked,hourly_rate,labor_cost,scheduled_covers\n"
        "2026-03-10,Alice,server,4,17.5,70,20\n"
    )

    assert _upload(client, f"/restaurant/ingest/pos-csv?venue_id={venue_id}", pos_csv).status_code == 200
    assert _upload(client, f"/restaurant/ingest/labor-csv?venue_id={venue_id}", labor_csv).status_code == 200

    baseline = client.get("/restaurant/recommendations/daily", params={"date": "2026-03-10", "venue_id": venue_id})
    assert baseline.status_code == 200
    baseline_categories = {r["category"] for r in baseline.json()["recommendations"]}
    assert "labor_optimization" in baseline_categories

    update = client.put(
        "/restaurant/venue/settings",
        params={"venue_id": venue_id},
        json={"labor_target_pct": 40.0},
    )
    assert update.status_code == 200
    assert update.json()["targets"]["labor_target_pct"] == 40.0

    tuned = client.get("/restaurant/recommendations/daily", params={"date": "2026-03-10", "venue_id": venue_id})
    assert tuned.status_code == 200
    tuned_categories = {r["category"] for r in tuned.json()["recommendations"]}
    assert "labor_optimization" not in tuned_categories


def test_chat_routes_restaurant_intent_to_restaurant_module(client):
    response = client.post(
        "/chat",
        json={"message": "Why was profit weak last week and what should I reorder tomorrow?"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["module_used"] == "restaurant_ops"
    assert isinstance(payload["reply"], str)
    assert payload["reply"]


def test_extended_core_modules_reviews_forecast_menu_procurement_and_scenario(client):
    pos_csv = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-12,Pasta,14,252,28,in_store,270\n"
        "2026-03-12,Salmon,7,196,12,in_store,210\n"
        "2026-03-13,Pasta,10,180,20,in_store,200\n"
    )
    purchases_csv = (
        "date,item_name,quantity,unit_cost,total_cost,supplier,on_hand_qty,par_level,waste_qty,theoretical_usage,actual_usage\n"
        "2026-03-12,Salmon,20,7.5,150,Supplier A,4,12,1,8,11\n"
        "2026-03-10,Salmon,20,6.5,130,Supplier B,8,12,0,7,7\n"
        "2026-03-12,Pasta Dry,40,1.2,48,Supplier A,25,20,0,12,10\n"
    )
    labor_csv = (
        "date,staff_name,role,hours_worked,hourly_rate,labor_cost,scheduled_covers\n"
        "2026-03-12,Marco,chef,8,22,176,40\n"
        "2026-03-12,Elena,server,7,18,126,40\n"
        "2026-03-13,Elena,server,6,18,108,28\n"
    )
    reviews_csv = (
        "date,rating,text,source\n"
        "2026-03-12,2,Service was slow and food arrived cold,google\n"
        "2026-03-12,5,Great team and excellent pasta,google\n"
        "2026-03-13,3,Too expensive for the portion,tripadvisor\n"
    )

    recipe_payload = {
        "recipes": [
            {
                "dish_name": "Pasta",
                "selling_price": 18,
                "ingredients": [
                    {"name": "Pasta Dry", "quantity": 1, "unit_cost": 1.2},
                ],
            },
            {
                "dish_name": "Salmon",
                "selling_price": 28,
                "ingredients": [
                    {"name": "Salmon", "quantity": 1, "unit_cost": 7.5},
                ],
            },
        ]
    }

    assert _upload(client, "/restaurant/ingest/pos-csv", pos_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/purchases-csv", purchases_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/labor-csv", labor_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/reviews-csv", reviews_csv).status_code == 200
    assert client.post("/restaurant/ingest/recipes", json=recipe_payload).status_code == 200

    forecast = client.get("/restaurant/labor/forecast", params={"date": "2026-03-12", "days": 5})
    assert forecast.status_code == 200
    forecast_data = forecast.json()
    assert len(forecast_data["forecast"]) == 5
    assert "predicted_labor_cost" in forecast_data["forecast"][0]

    menu = client.get("/restaurant/menu/engineering", params={"from": "2026-03-12", "to": "2026-03-13"})
    assert menu.status_code == 200
    menu_data = menu.json()
    assert len(menu_data["items"]) >= 2
    assert menu_data["items"][0]["category"] in {"star", "puzzle", "plowhorse", "dog"}

    procurement = client.get("/restaurant/procurement/opportunities", params={"date": "2026-03-13"})
    assert procurement.status_code == 200
    procurement_data = procurement.json()
    assert "summary" in procurement_data
    assert "opportunity_count" in procurement_data["summary"]

    weekly = client.get("/restaurant/reports/weekly-owner", params={"week_start": "2026-03-09"})
    assert weekly.status_code == 200
    weekly_data = weekly.json()
    assert "financials" in weekly_data
    assert "operations" in weekly_data
    assert "complaint_clusters" in weekly_data["operations"]

    scenario = client.post(
        "/restaurant/scenarios/hire-check",
        json={
            "from_date": "2026-03-12",
            "to_date": "2026-03-13",
            "additional_weekly_cost": 650,
            "fixed_cost_per_day": 900,
        },
    )
    assert scenario.status_code == 200
    scenario_data = scenario.json()
    assert "decision" in scenario_data
    assert "can_afford" in scenario_data["decision"]


def test_accelerated_sprint_features_rollup_optimizer_ordering_and_readiness(client):
    pos_csv = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-14,Pizza,20,300,40,in_store,340\n"
        "2026-03-14,Pasta,10,180,22,in_store,210\n"
    )
    purchases_csv = (
        "date,item_name,quantity,unit_cost,total_cost,supplier,on_hand_qty,par_level,waste_qty,theoretical_usage,actual_usage\n"
        "2026-03-14,Cheese,20,2.0,40,Supplier A,4,10,1,8,9\n"
        "2026-03-14,Flour,30,0.8,24,Supplier A,15,12,0,6,5\n"
        "2026-03-12,Cheese,20,1.7,34,Supplier B,12,10,0,7,7\n"
    )
    labor_csv = (
        "date,staff_name,role,hours_worked,hourly_rate,labor_cost,scheduled_covers\n"
        "2026-03-14,Anna,server,8,18,144,45\n"
        "2026-03-14,Luca,chef,9,21,189,45\n"
    )
    reviews_csv = (
        "date,rating,text,source\n"
        "2026-03-14,2,Service was slow and we waited too long,google\n"
        "2026-03-14,3,Food quality was okay but expensive,tripadvisor\n"
    )
    recipe_payload = {
        "recipes": [
            {
                "dish_name": "Pizza",
                "selling_price": 15,
                "ingredients": [{"name": "Cheese", "quantity": 0.2, "unit_cost": 2.0}],
            },
            {
                "dish_name": "Pasta",
                "selling_price": 18,
                "ingredients": [{"name": "Flour", "quantity": 0.3, "unit_cost": 0.8}],
            },
        ]
    }

    assert _upload(client, "/restaurant/ingest/pos-csv", pos_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/purchases-csv", purchases_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/labor-csv", labor_csv).status_code == 200
    assert _upload(client, "/restaurant/ingest/reviews-csv", reviews_csv).status_code == 200
    assert client.post("/restaurant/ingest/recipes", json=recipe_payload).status_code == 200

    rollup = client.get("/restaurant/portfolio/rollup", params={"from": "2026-03-14", "to": "2026-03-14"})
    assert rollup.status_code == 200
    assert rollup.json()["summary"]["venue_count"] >= 1

    labor_opt = client.get("/restaurant/labor/optimizer", params={"date": "2026-03-14"})
    assert labor_opt.status_code == 200
    assert "optimization" in labor_opt.json()

    auto_order = client.get("/restaurant/inventory/auto-order", params={"date": "2026-03-14"})
    assert auto_order.status_code == 200
    assert "purchase_order_draft" in auto_order.json()

    repricing = client.get("/restaurant/menu/repricing", params={"from": "2026-03-14", "to": "2026-03-14"})
    assert repricing.status_code == 200
    assert "repricing_suggestions" in repricing.json()

    winback = client.get("/restaurant/reputation/winback", params={"week_start": "2026-03-09"})
    assert winback.status_code == 200
    assert "campaign_playbook" in winback.json()

    readiness = client.get("/restaurant/ops/readiness", params={"date": "2026-03-14"})
    assert readiness.status_code == 200
    readiness_payload = readiness.json()
    assert "readiness_score" in readiness_payload
    assert readiness_payload["status_band"] in {"green", "amber", "red"}
