
import { Invoice } from "../types";

export const checkCompliance = async (invoice: Invoice): Promise<string> => {
  try {
    const response = await fetch("/api/compliance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoice }),
    });

    if (!response.ok) {
      throw new Error("Failed to check compliance");
    }

    const data = await response.json();
    return data.result || "Aucun résultat retourné par l'IA.";
  } catch (error) {
    console.error("AI Compliance Check Error:", error);
    return "L'analyse IA est temporairement indisponible. Veuillez vérifier votre connexion.";
  }
};
