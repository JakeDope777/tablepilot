"""Growth funnel summary endpoint tests."""


def test_growth_funnel_summary_shape(client):
    for event_name in [
        "landing_view",
        "signup_completed",
        "verification_completed",
        "analysis_run",
        "dashboard_viewed",
        "dashboard_viewed",
    ]:
        response = client.post(
            "/growth/track",
            json={"event_name": event_name, "source": "web", "properties": {}},
        )
        assert response.status_code == 200

    summary = client.get("/growth/funnel-summary?days=14")
    assert summary.status_code == 200
    data = summary.json()

    assert "steps" in data
    assert len(data["steps"]) == 5
    assert "conversion_signup_from_visitor" in data
    assert "conversion_verified_from_signup" in data
    assert "conversion_first_value_from_verified" in data
    assert "conversion_return_from_first_value" in data

    step_names = {step["name"] for step in data["steps"]}
    assert step_names == {
        "visitor",
        "signup_completed",
        "verified",
        "first_value_action",
        "return_session",
    }
