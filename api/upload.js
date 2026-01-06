// api/upload.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { fileName, csvContent } = req.body;
  if (!fileName || !csvContent) return res.status(400).send("Missing fileName or csvContent");

  const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;

  try {
    // Upload file directly to Dropbox App folder
    const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_TOKEN}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/BuyWord-Bentley/${fileName}`,
          mode: "overwrite",
          autorename: true,
          mute: true
        }),
        "Content-Type": "application/octet-stream"
      },
      body: csvContent
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Dropbox upload error:", errText);
      return res.status(500).send("Dropbox upload failed");
    }

    res.status(200).json({ message: "File uploaded to Dropbox!" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error");
  }
}
