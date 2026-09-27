import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const SYSTEM = `
You are SERV Guard, a safety and reliability gate for AI agents.

Your job is to inspect a proposed agent action BEFORE it happens.
Never execute the action. Analyze it.

Return ONLY valid JSON with this exact shape:
{
  "decision": "ALLOW" | "REVIEW" | "BLOCK",
  "risk_score": 0,
  "summary": "short explanation",
  "checks": [
    {"name":"Authorization","status":"PASS"|"WARN"|"FAIL","detail":"..."},
    {"name":"Budget","status":"PASS"|"WARN"|"FAIL","detail":"..."},
    {"name":"Scope","status":"PASS"|"WARN"|"FAIL","detail":"..."},
    {"name":"Reversibility","status":"PASS"|"WARN"|"FAIL","detail":"..."},
    {"name":"Evidence","status":"PASS"|"WARN"|"FAIL","detail":"..."}
  ],
  "required_approval": "none" | "human" | "owner",
  "safer_action": "specific next step",
  "audit_reason": "one concise sentence suitable for an audit log"
}

Rules:
- BLOCK if the action clearly violates an explicit policy, exceeds a hard limit, or lacks required authorization for a high-impact irreversible action.
- REVIEW if important evidence or authorization is missing, or the action is ambiguous/high-impact.
- ALLOW only when the requested action is within scope, adequately authorized, and low enough risk.
- Do not invent facts. If evidence is missing, say so.
- risk_score is 0-100.
`;

function extractJson(text) {
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("SERV returned non-JSON output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

app.post("/api/guard", async (req, res) => {
  try {
    const { action, policy, evidence } = req.body || {};
    if (!action?.trim()) return res.status(400).json({ error: "Action is required." });

    const apiKey = process.env.OPENSERV_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENSERV_API_KEY. Add it to .env before running the live SERV check."
      });
    }

    const userPrompt = `
POLICY / GUARDRAILS:
${policy?.trim() || "No explicit policy supplied. Treat missing authorization as a review condition for high-impact actions."}

PROPOSED AGENT ACTION:
${action.trim()}

AVAILABLE EVIDENCE / CONTEXT:
${evidence?.trim() || "No supporting evidence supplied."}

Evaluate this action before execution.
`;

    const response = await fetch(`${process.env.SERV_BASE_URL || "https://api.openserv.ai/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.SERV_MODEL || "serv-standard",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      return res.status(502).json({
        error: "SERV request failed.",
        details: raw.slice(0, 1000)
      });
    }

    const payload = JSON.parse(raw);
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No model content returned.");

    const result = extractJson(content);
    result.meta = {
      engine: "SERV Reasoning",
      model: process.env.SERV_MODEL || "serv-standard",
      timestamp: new Date().toISOString()
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected error." });
  }
});

app.get("/health", (_, res) => res.json({ ok: true, app: "SERV Guard" }));

app.listen(PORT, () => {
  console.log(`SERV Guard running at http://localhost:${PORT}`);
});
