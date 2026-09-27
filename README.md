# SERV Guard

**SERV Guard is a pre-execution safety gate for AI agents.**

Instead of letting an agent jump directly from *reasoning → action*, SERV Guard inserts a reasoning checkpoint:

`Agent proposes action → SERV Guard → ALLOW / REVIEW / BLOCK → audit record`

## Why this fits SERV

The project uses the SERV Reasoning API as the decision engine. OpenServ describes SERV Reasoning as a reasoning layer that adds structured reasoning, validation and auditable execution to agents.

The app focuses that capability on a concrete product primitive: **pre-tool-call risk gating**.

## Demo

The included demo starts with a deliberately dangerous action:

> Send $900 USDC to a new wallet because the user asked me to settle an urgent invoice.

The policy allows only $250 and requires human approval for irreversible transfers. The evidence also lacks recipient verification. SERV should therefore return `BLOCK` or `REVIEW`, with structured checks and an audit reason.

Click **Load safer example** to test an action that fits the policy.

## Run locally

Requirements: Node.js 20+.

1. Copy `.env.example` to `.env`.
2. Put your OpenServ API key in `OPENSERV_API_KEY`.
3. Confirm `SERV_MODEL` matches the model identifier available in your OpenServ console.
4. Run:

```bash
npm install
npm start
```

5. Open `http://localhost:3000`.

## API

`POST /api/guard`

```json
{
  "policy": "You may spend up to $250...",
  "action": "Send $900 USDC...",
  "evidence": "Recipient is unverified..."
}
```

The response is structured:

```json
{
  "decision": "BLOCK",
  "risk_score": 95,
  "summary": "...",
  "checks": [],
  "required_approval": "human",
  "safer_action": "...",
  "audit_reason": "...",
  "meta": {
    "engine": "SERV Reasoning"
  }
}
```

## Deployment

This is a normal Node/Express app, so it can be deployed to Render, Railway, Fly.io, Cloud Run, or another Node host.

Set the environment variables in the host dashboard instead of committing `.env`.

## Hackathon submission positioning

**Name:** SERV Guard

**One-liner:** A pre-execution reasoning firewall that makes AI agents prove an action is safe before they can call a tool.

**Track:** Open Track

**Core demo:** Compare a high-risk payment request against explicit guardrails and show SERV producing a structured decision, risk score, required approval and audit reason.

**Business model:** API/usage pricing for agent developers and SaaS teams; enterprise tier for policy libraries, audit retention, team approvals and integrations.

## Important

The UI is a demo front-end. It does not execute transactions or move funds. It only evaluates proposed actions.
