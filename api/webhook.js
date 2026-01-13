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
  "3. Переводи на упрощённый китайский (简体中文)",
  "4. Сохраняй числа, модели, артикулы, даты, трек-номера без изменений",
  "5. НЕ добавляй от себя факты/условия/сроки/адреса",
  "6. Можно корректировать грамматику для естественности, но смысл не меняй",
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
  "Вход: Спасибо",
  "Выход:",
  "ZH: 谢谢",
  "RU (проверка): Спасибо",
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

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (!secret || secret !== process.env.BOT_SECRET) return res.status(403).send("forbidden");

  const update = await readJson(req);
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;
  if (!chatId || !text) return res.status(200).send("ok");

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
      temperature: 0,  // было 0.2 → 0 для стабильности формата
      max_tokens: 800,  // было 1200 → экономия токенов
    }),
  });

  const data = await r.json();
  const answer = data?.choices?.[0]?.message?.content ?? "Ошибка: пустой ответ";

  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: answer }),
  });

  return res.status(200).send("ok");
};
