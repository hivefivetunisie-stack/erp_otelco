import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Gemini Setup
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/extract-purchase", async (req, res) => {
    const { image } = req.body; // Base64 string

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    try {
      const prompt = `Extract purchase details from this invoice. 
      Return a JSON object with EXACTLY these keys: 
      {
        "vendor": string, 
        "date": string (YYYY-MM-DD), 
        "ref": string, 
        "ht": number, 
        "tva": number, 
        "ttc": number, 
        "category": string
      }
      Category must be one of: [Achats, Services, Materiel, Divers]. 
      Values must be in TND. HT + TVA should equal TTC.`;

      // Extract mime type and base64 data
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const base64Data = matches ? matches[2] : image;

      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from AI");
      res.json({ result: JSON.parse(responseText) });
    } catch (error) {
      console.error("AI Extraction Error Detailed:", error);
      res.status(500).json({ error: "L'analyse de la facture a échoué. Vérifiez que l'image est nette." });
    }
  });

  app.post("/api/compliance", async (req, res) => {
    const { invoice } = req.body;
    
    if (!invoice) {
      return res.status(400).json({ error: "Invoice data is required" });
    }

    const itemsDescription = invoice.items.map((i: any) => i.description).join(", ");
    const totalHT = invoice.items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0);

    const prompt = `
      En tant qu'expert comptable tunisien spécialisé dans la Loi de Finances 2026, analyse cette facture :
      - Émetteur: ${invoice.issuer.name}, MF: ${invoice.issuer.mf}
      - Client: ${invoice.client.name}, MF: ${invoice.client.mf}
      - Montant HT Total: ${totalHT} DT
      - Articles: ${itemsDescription}
      - Retenue à la source actuelle: ${invoice.withholdingTaxRate}%
      - Timbre Fiscal: ${invoice.timbreFiscal} DT
      
      Règles de conformité 2026 à vérifier impérativement :
      1. Si le montant Total HT est >= 1000 DT, le taux de R.S doit être de 10%.
      2. Si la désignation contient des honoraires, commissions, courtages, vacations ou loyers, le taux de R.S doit être de 10%, quel que soit le montant.
      3. Le Matricule Fiscal doit être valide (7 chiffres/Code TVA/Catégorie/Etab).
      4. Le timbre fiscal de 1.000 DT est obligatoire pour les factures locales (hors export).

      Analyse les données fournies et donne un avis tranché : la R.S choisie (${invoice.withholdingTaxRate}%) est-elle correcte ? Si non, explique pourquoi en te basant sur le seuil des 1000 DT ou la nature des services.
      Réponds brièvement et professionnellement en Français.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      res.json({ result: response.text || "Erreur lors de la vérification." });
    } catch (error) {
      console.error("AI Compliance Check Error:", error);
      res.status(500).json({ error: "L'analyse IA est temporairement indisponible." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
