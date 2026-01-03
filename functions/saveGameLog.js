export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  try {
    const { gameLog } = JSON.parse(event.body);
    if (!gameLog) return { statusCode: 400, body: "No gameLog provided" };

    console.log("Game Log Received:", gameLog);

    return { statusCode: 200, body: "Game log saved successfully!" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.toString() };
  }
}
