"""
n8n connector catalog snapshot helpers.

Provides a local 200-item connector catalog derived from n8n integrations
so frontend demos can render a large connector gallery without remote fetches.
"""

from __future__ import annotations

from typing import Optional

N8N_SOURCE_URL = "https://n8n.io/integrations/"
N8N_SOURCE_TOTAL = 1411

# Snapshot date: 2026-03-07
N8N_CONNECTOR_SLUGS: tuple[str, ...] = (
    "1shot-api",
    "2chat",
    "3scribe",
    "7todos",
    "ably",
    "abstract",
    "abuselpdb",
    "abyssale",
    "accelo",
    "accredible",
    "accurai",
    "accuranker",
    "acquire",
    "actaport",
    "action-network",
    "activation-trigger",
    "active-trail",
    "activecampaign",
    "activecampaign-trigger",
    "acuity-scheduling-trigger",
    "ada",
    "adalo",
    "add-to-wallet",
    "adobe",
    "adroll",
    "affinity",
    "affinity-trigger",
    "agencii",
    "agent",
    "agent700-agent",
    "aggregate",
    "agile-crm",
    "ai-agent-tool",
    "ai-scraper",
    "ai-transform",
    "aimfox",
    "aiml-api",
    "ainoflow-convert",
    "air-by-bradybrown202",
    "air-by-emretinaztepe",
    "airbrake",
    "airnow",
    "airparser",
    "airtable",
    "airtable-trigger",
    "airtop",
    "aitableai",
    "alchemy",
    "alerty",
    "algolia",
    "alienvault",
    "alive5",
    "alphamoon",
    "alttextai",
    "amazon",
    "amilia",
    "amqp-sender",
    "amqp-trigger",
    "anchor-browser",
    "announcekit",
    "anny",
    "anthropic",
    "anthropic-chat-model",
    "apaleo-official",
    "apex",
    "apiary",
    "apiflash",
    "apify",
    "apitemplateio",
    "apptivegrid",
    "asana",
    "asana-trigger",
    "assemblyai",
    "async",
    "atriomail",
    "auth0-management-api",
    "authentica",
    "auto-fixing-output-parser",
    "autobound",
    "autocalls",
    "autom",
    "automizy",
    "autopilot",
    "autopilot-trigger",
    "avatartalk",
    "awork",
    "aws-bedrock-chat-model",
    "aws-certificate-manager",
    "aws-cognito",
    "aws-comprehend",
    "aws-dynamodb",
    "aws-elb",
    "aws-iam",
    "aws-lambda",
    "aws-rekognition",
    "aws-s3",
    "aws-ses",
    "aws-sns",
    "aws-sns-trigger",
    "aws-sqs",
    "aws-textract",
    "aws-transcribe",
    "azure-ai-search-vector-store",
    "azure-cosmos-db",
    "azure-openai-chat-model",
    "azure-storage",
    "badger-maps",
    "bamboohr",
    "bandwidth",
    "bannerbear",
    "basalt",
    "baserow",
    "basic-llm-chain",
    "bedrijfsdata",
    "beeminder",
    "belakeai",
    "benchmark-email",
    "better-proposals",
    "beyond-presence",
    "big-cartel",
    "big-data-cloud",
    "bigml",
    "bitbucket-trigger",
    "bitly",
    "bitrix24",
    "bitwarden",
    "blaze",
    "blockchain-exchange",
    "bloock",
    "blooio-messaging",
    "blotato",
    "blue",
    "bookoly",
    "bot9",
    "botbaba",
    "botifier",
    "botium-box",
    "botnoi-voice",
    "botsonic",
    "botstar",
    "bounceban",
    "box",
    "box-trigger",
    "brain-pod-ai",
    "brandblast",
    "brandfetch",
    "brandmentions",
    "brave-search",
    "breezy-hr",
    "brevo",
    "brevo-trigger",
    "brex",
    "brightdata",
    "browse-ai",
    "browseract",
    "browserbase-agent",
    "browserflow-for-linkedin",
    "browserless",
    "browserstack",
    "bubble",
    "bugbug",
    "bugfender",
    "bugherd",
    "bugpilot",
    "bugreplay",
    "bugshot",
    "buildkite",
    "bunnycdn",
    "businessmap",
    "byteplus",
    "cal-trigger",
    "calculator",
    "calendarhero",
    "calendly",
    "calendly-trigger",
    "camino-ai",
    "canvas",
    "capsolver",
    "capsule",
    "carbon-black",
    "carbone",
    "carsxe",
    "caspio",
    "chaindesk",
    "chainstream",
    "character-text-splitter",
    "chargebee",
    "chargebee-trigger",
    "chargeover",
    "chargify",
    "chartmogul",
    "chat-data",
    "chat-memory-manager",
    "chat-trigger",
    "chatbase",
    "chatling",
    "chatmasters",
    "chatrace",
    "chatsonic",
    "checkmk",
)

UPPER_TOKEN_MAP = {
    "ai": "AI",
    "api": "API",
    "aws": "AWS",
    "crm": "CRM",
    "db": "DB",
    "elb": "ELB",
    "hr": "HR",
    "iam": "IAM",
    "llm": "LLM",
    "openai": "OpenAI",
    "s3": "S3",
    "ses": "SES",
    "sns": "SNS",
    "sqs": "SQS",
    "sql": "SQL",
}


def _guess_category(slug: str) -> str:
    s = slug.lower()
    if "trigger" in s:
        return "triggers"
    if any(k in s for k in ("ai", "anthropic", "openai", "chat", "llm")):
        return "ai_automation"
    if any(k in s for k in ("aws", "azure", "cloud", "s3", "lambda")):
        return "cloud"
    if any(k in s for k in ("crm", "campaign", "sales", "lead")):
        return "crm_marketing"
    if any(k in s for k in ("mail", "email", "send", "notify", "message")):
        return "communication"
    return "apps"


def _humanize_slug(slug: str) -> str:
    tokens = slug.split("-")
    parts = [UPPER_TOKEN_MAP.get(t, t.capitalize()) for t in tokens]
    return " ".join(parts)


def list_n8n_connectors(
    limit: int = 200,
    search: Optional[str] = None,
    category: Optional[str] = None,
) -> list[dict]:
    query = (search or "").strip().lower()
    category_filter = (category or "").strip().lower()
    rows: list[dict] = []
    for idx, slug in enumerate(N8N_CONNECTOR_SLUGS, start=1):
        guessed_category = _guess_category(slug)
        if category_filter and guessed_category != category_filter:
            continue
        name = _humanize_slug(slug)
        record = {
            "id": f"n8n-{idx:04d}",
            "key": slug,
            "name": name,
            "provider": "n8n",
            "type": "connector_template",
            "category": guessed_category,
            "source_url": f"{N8N_SOURCE_URL}{slug}/",
        }
        if query and query not in slug and query not in name.lower():
            continue
        rows.append(record)
    return rows[: max(1, min(limit, len(rows)))]


def n8n_catalog_stats() -> dict:
    return {
        "source_url": N8N_SOURCE_URL,
        "source_total_connectors": N8N_SOURCE_TOTAL,
        "snapshot_connectors": len(N8N_CONNECTOR_SLUGS),
        "snapshot_date": "2026-03-07",
        "note": "Snapshot derived from n8n integrations source for demo usage.",
    }
