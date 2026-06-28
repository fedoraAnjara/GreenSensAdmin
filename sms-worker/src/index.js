// Numéros et patterns d'opérateurs à ignorer
const OPERATOR_PATTERNS = [
  /^\d{3,5}$/,
  /^[A-Z]+$/,
  /^TELMA/i,
  /^ORANGE/i,
  /^AIRTEL/i,
  /^MVola/i,
  /^Mvola/i,
  /^OrangeMoney/i,
  /^Airtel/i,
  /^Canal/i,
  /^INFO/i,
  /^PROMO/i,
];

const OPERATOR_KEYWORDS = [
  "votre solde",
  "recharge",
  "offre valable",
  "offre spéciale",
  "data pack",
  "forfait",
  "internet illimité",
  "vous avez reçu",
  "transfert d'argent",
  "mvola",
  "orange money",
  "airtel money",
  "code de confirmation",
  "otp",
  "mot de passe temporaire",
  "code secret",
  "code pin",
  "solde insuffisant",
  "votre compte",
  "abonnement",
  "expiration",
  "bienvenue sur",
];

function isOperatorMessage(from, message) {
  for (const pattern of OPERATOR_PATTERNS) {
    if (pattern.test(from)) return true;
  }

  const messageLower = message.toLowerCase();
  for (const keyword of OPERATOR_KEYWORDS) {
    if (messageLower.includes(keyword.toLowerCase())) return true;
  }

  return false;
}

async function extractSmsInfo(message, apiKey) {
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
}

Règles:
- valide = true seulement si le message parle de vente, d'atelier agricole, de produits agricoles ou d'élevage
- valide = false si c'est une conversation normale, une question, un message personnel
- Reformule la description en français correct même si le SMS est en malgache ou en franglais`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function findAgriculteurByPhone(phone, env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "agriculteur" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "telephone" },
                op: "EQUAL",
                value: { stringValue: phone },
              },
            },
          ],
        },
      },
      limit: 1,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(queryBody),
  });

  if (!response.ok) {
    console.error("Erreur recherche agriculteur");
    return null;
  }

  const results = await response.json();

  for (const result of results) {
    if (result.document) {
      const fields = result.document.fields;
      const docId = result.document.name.split("/").pop();
      return {
        id: docId,
        nom: fields.nom?.stringValue || "Agriculteur",
        nomFerme: fields.nomFerme?.stringValue || null,
      };
    }
  }

  return null;
}

async function saveToFirestore(extracted, from, message, env, agriculteur) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publications`;

  const document = {
    fields: {
      contenu: { stringValue: extracted.description || "" },
      type: { stringValue: extracted.type || "autre" },
      produit: extracted.produit
        ? { stringValue: extracted.produit }
        : { nullValue: null },
      quantite: extracted.quantite
        ? { stringValue: extracted.quantite }
        : { nullValue: null },
      prix: extracted.prix
        ? { doubleValue: extracted.prix }
        : { nullValue: null },
      localisation: extracted.localisation
        ? { stringValue: extracted.localisation }
        : { nullValue: null },
      source: { stringValue: "sms" },
      telephone: { stringValue: from },
      messageOriginal: { stringValue: message },
      agriculteurId: agriculteur?.id
        ? { stringValue: agriculteur.id }
        : { nullValue: null },
      agriculteurNom: { stringValue: agriculteur?.nom || "Agriculteur inconnu" },
      nomFerme: agriculteur?.nomFerme
        ? { stringValue: agriculteur.nomFerme }
        : { nullValue: null },
      statut: { stringValue: "en_attente" },
      likes: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Firestore error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export default {
  async fetch(request, env) {

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();

      // Adapter au format MessageCore
      const from = body.data?.from || body.from;
      const message = body.data?.body || body.message;

      if (!from || !message) {
        return new Response(
          JSON.stringify({ error: "Missing fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Filtrer les messages opérateurs
      if (isOperatorMessage(from, message)) {
        console.log(`Message opérateur ignoré de ${from}: ${message}`);
        return new Response(
          JSON.stringify({ status: "ignored", reason: "operator_message" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`SMS reçu de ${from}: ${message}`);

      // Chercher l'agriculteur par numéro
      const agriculteur = await findAgriculteurByPhone(from, env);
      console.log("Agriculteur trouvé:", agriculteur);

      // Extraire les infos avec Gemini
      const extracted = await extractSmsInfo(message, env.GEMINI_API_KEY);

      if (!extracted.valide) {
        console.log(`SMS non agricole ignoré de ${from}: ${message}`);
        return new Response(
          JSON.stringify({ status: "ignored", reason: "not_agricultural" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Sauvegarder dans Firestore avec l'agriculteur
      await saveToFirestore(extracted, from, message, env, agriculteur);

      console.log(`Publication créée depuis ${from}`);
      return new Response(
        JSON.stringify({ status: "success" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("Erreur webhook:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};