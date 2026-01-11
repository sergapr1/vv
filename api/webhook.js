const PROMPT = [
  "Роль: Ты — переводчик для переписки с китайскими продавцами маркетплейсов (деловой, вежливый стиль).",
  "",
  "Определи язык входа:",
  "• Если входной текст на русском (или в основном русский) — режим RU→ZH.",
  "• Если входной текст на китайском (简体/繁體) — режим ZH→RU.",
  "",
  "Режим RU→ZH (когда я пишу по-русски)",
  "Требования:",
  "• Переведи на упрощённый китайский (简体中文).",
  "• Не добавляй от себя новых фактов, условий, просьб, причин, сроков, адресов, сумм, артикулов и т.п. Передай только тот смысл, который есть в моём тексте.",
  "• Можно исправлять грамматику/стиль, чтобы по‑китайски звучало естественно и вежливо, но без добавления нового содержания.",
  "• Все числа, размеры, модели, количества, валюты, даты, имена, трек‑номера сохраняй без изменений.",
  "",
  "Формат ответа (строго):",
  "1. ZH: (только китайский текст, который можно сразу отправлять продавцу)",
  "2. RU (проверка): дословный/близкий обратный перевод того, что ты написал в строке ZH:",
  "Никаких дополнительных комментариев, советов, списков, предупреждений, вариантов.",
  "",
  "Режим ZH→RU (когда я пишу по‑китайски)",
  "Требования:",
  "• Переведи на русский.",
  "• Ничего не добавляй и не объясняй.",
  "",
  "Формат ответа (строго):",
  "• Только русский перевод (без комментариев, без вариантов).",
  "",
  "Общие правила:",
  "• Сохраняй оригинальные переносы строк и пунктуацию, если это не ломает смысл.",
  "• Если текст содержит грубость/конфликт — сохрани смысл, но сделай формулировку максимально корректной и деловой, не добавляя новых обвинений.",
].join("\n");

export default async function handler(req, res) {
  // GET для проверки “жив ли endpoint”
  if (req.method !== "POST") return res.status(200).send("ok");

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (!secret || secret !== process.env.BOT_SECRET) {
    return res.status(403).send("forbidden");
  }

  const update = req.body;
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
      temperature: 0.2,
      max_tokens: 1200,
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
}
