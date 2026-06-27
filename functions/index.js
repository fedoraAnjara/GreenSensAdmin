const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function extractSmsInfo(message) {
  const prompt = `Tu es un assistant qui analyse des SMS d'agriculteurs malgaches.
Extrait les informations de ce SMS et retourne UNIQUEMENT un JSON valide sans markdown.

SMS: "${message}"

Structure JSON attendue:
{
  "type": "vente | atelier | promotion | stock | autre",
  "produit": "nom du produit ou null",
  "quantite": "quantité avec unité ou null",
  "prix": nombre en chiffres ou null,
  "localisation": "lieu ou null",
  "description": "description complète reformulée en français correct",
  "valide": true ou false
}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

exports.smsWebhook = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { from, message, receivedAt } = req.body;

    if (!from || !message) {
      return res.status(400).send("Missing fields");
    }

    console.log(`SMS reçu de ${from}: ${message}`);

    // Extraire les infos avec Gemini
    const extracted = await extractSmsInfo(message);

    if (!extracted.valide) {
      console.log("SMS non agricole, ignoré");
      return res.status(200).json({ status: "ignored" });
    }

    // Chercher l'agriculteur par numéro de téléphone
    const usersSnap = await db.collection("users")
      .where("role", "==", "agriculteur")
      .where("telephone", "==", from)
      .get();

    let agriculteurData = null;
    if (!usersSnap.empty) {
      const d = usersSnap.docs[0];
      agriculteurData = { id: d.id, ...d.data() };
    }

    // Créer la publication en attente
    await db.collection("publications").add({
      contenu: extracted.description,
      type: extracted.type,
      produit: extracted.produit,
      quantite: extracted.quantite,
      prix: extracted.prix,
      localisation: extracted.localisation,
      source: "sms",
      telephone: from,
      messageOriginal: message,
      agriculteurId: agriculteurData?.id || null,
      agriculteurNom: agriculteurData?.nom || "Agriculteur inconnu",
      nomFerme: agriculteurData?.nomFerme || null,
      statut: "en_attente",
      likes: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log("Publication créée en attente");
    return res.status(200).json({ status: "success" });

  } catch (error) {
    console.error("Erreur webhook:", error);
    return res.status(500).json({ error: error.message });
  }
});