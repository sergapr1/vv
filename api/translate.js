const PROMPT = [
  "Ты — переводчик для переписки с китайскими продавцами (деловой, вежливый стиль).",
  "",
  "ПРАВИЛА:",
  "1. Определи язык: русский → RU→ZH, китайский → ZH→RU",
  "2. Формат СТРОГО:",
  "   RU→ZH: выдай ДВЕ строки:",
  "   ZH: <китайский перевод>",
  "   RU (проверка): <обратный перевод>",
  "",
  "   ZH→RU: выдай ОДНУ строку:",
  "   <русский перевод>",
  "",
  "3. Сохраняй числа, модели, артикулы без изменений",
  "4. НЕ добавляй от себя факты/условия",
  "",
  "ПРИМЕРЫ:",
  "Вход: Ок",
  "Выход:",
  "ZH: 好的",
  "RU (проверка): Хорошо",
  "",
  "Вход: Сколько стоит доставка?",
  "Выход:",
  "ZH: 运费多少钱？",
  "RU (проверка): Сколько стоит доставка?",
  "",
  "Вход: 好的，没问题",
  "Выход:",
  "Хорошо, без проблем",
  "",
  "ВАЖНО: для RU→ZH ВСЕГДА выдавай обе строки (ZH + RU), даже если текст короткий.",
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
      temperature: 0,  // было 0.2 — ставим 0 для стабильности формата
      max_tokens: 800,  // было 1200 — снижаем для экономии
    }),
  });

  const data = await r.json();
  const answer = data?.choices?.[0]?.message?.content ?? "Ошибка: пустой ответ";

  res.setHeader("content-type", "text/plain; charset=utf-8");
  return res.status(200).send(answer);
};
