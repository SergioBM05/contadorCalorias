import { GoogleGenerativeAI } from "@google/generative-ai"; //

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
console.log("API Key:", apiKey); 
const ai = new GoogleGenerativeAI( apiKey );

async function fileToGenerativePart(base64Str){
    return {
        inlineData: {
            data:base64Str.split(',')[1],
            mimeType: base64Str.match(/data:(.*);/)[1] 
        }
    }
}
export const analyzeMealImage = async (base64Image) => {
  try {
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const imagePart = await fileToGenerativePart(base64Image);

    const prompt = `
      Analiza esta imagen de comida. Estima de la forma más precisa posible los siguientes datos basados en el plato visualizado.
      Debes devolver ÚNICAMENTE un objeto JSON con la siguiente estructura exacta, sin texto adicional, sin formato markdown (sin \`\`\`json):
      {
        "dish": "Nombre del plato o alimentos detectados",
        "calories": un número entero con las calorías estimadas,
        "protein": un número entero con los gramos de proteína,
        "carbs": un número entero con los gramos de carbohidratos,
        "fat": un número entero con los gramos de grasa
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Parseamos el texto plano que devuelve la IA y lo convertimos en un objeto JS
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Error analizando la comida con Gemini:", error);
    throw new Error("No se pudo escanear el plato. Inténtalo de nuevo.", { cause: error });
  }
};