const PROMPT = [
  "Роль: Ты — переводчик для переписки с китайскими продавцами маркетплейсов (деловой, вежливый стиль).",
  "",
  "Определи язык входа:",
  "• Если входной текст на русском — RU→ZH.",
  "• Если входной текст на китайском — ZH→RU.",
  "",
  "RU→ZH:",
  "Формат (строго):",
  "1. ZH: ...",
  "2. RU (проверка): ...",
  "",
  "ZH→RU:",
  "Формат: только русский перевод.",
].join("\n");

async function readJson(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");

  // простой ключ для шорткатов (защита), задай в Vercel как env: SHORTCUT_SECRET
  const auth = req.headers["authorization"];
  if (!auth || auth !== `Bearer ${process.env.SHORTCUT_SECRET}`) {
    return res.status(401).send("unauthorized");
  }

  const body = await readJson(req);
  const text = (body?.text ?? "").trim();
  if (!text) return res.status(400).send("no text");

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  const data = await r.json();
  const answer = data?.choices?.[0]?.message?.content ?? "Ошибка: пустой ответ";

  // Возвращаем просто текст (так проще в Shortcuts)
  res.setHeader("content-type", "text/plain; charset=utf-8");
  return res.status(200).send(answer);
};
