// pages/api/chat.js
// Proxies requests to Anthropic so the API key stays server-side.

const ANTHROPIC_API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE"; // 🔑 Replace with your key

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, systemPrompt } = req.body;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "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",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system:
          systemPrompt ||
          `You are an expert analyst on AI infrastructure and data centers in the United States. 
           You have deep knowledge about:
           - AI data center locations, capacities, and operators (Microsoft, Google, Amazon, Meta, xAI, CoreWeave, Oracle, etc.)
           - The Stargate project and other major AI infrastructure investments
           - GPU/TPU hardware clusters (NVIDIA H100/H200/Blackwell, Google TPU v4/v5, Amazon Trainium)
           - Construction timelines, power requirements (MW), and energy strategies
           - The economic and geopolitical impact of AI data center buildouts
           
           Be concise, factual, and insightful. Use specific numbers and locations when you know them.
           Format responses clearly. Keep answers under 200 words unless asked for more detail.`,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Claude API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
