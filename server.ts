import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON parsers with high limit for base64 food images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Gemini SDK
let aiInstance: any = null;
function getGeminiAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI operations will use local fallbacks.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust helper function to execute Gemini requests with automatic retries and fallback models
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const ai = getGeminiAI();
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const maxRetries = 3;
  let delay = 1000;
  let lastError: any = null;

  // Attempt the specified model (e.g. gemini-3.7-flash), and fall back to gemini-3.1-flash-lite on failure
  const modelsToTry = [
    params.model,
    "gemini-3.1-flash-lite"
  ];

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Querying model: ${modelName}, attempt ${attempt + 1}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config
        });

        if (response && (response.text || response.candidates)) {
          console.log(`[Gemini API] Success using model: ${modelName}`);
          return response;
        }
        throw new Error("Empty response received from Gemini.");
      } catch (err: any) {
        lastError = err;
        const errMsg = (err.message || "").toLowerCase();
        console.error(`[Gemini API Error] Model: ${modelName}, Attempt: ${attempt + 1} failed:`, err.message || err);

        // Immediate stop on auth/not found/permission issues (no point in retrying)
        if (errMsg.includes("key") || errMsg.includes("auth") || errMsg.includes("permission") || errMsg.includes("not found")) {
          break;
        }

        // Wait with exponential backoff on transient errors (like 503 Spikes or 429 Quota Rate Limits)
        if (attempt < maxRetries - 1) {
          const waitTime = delay * Math.pow(2, attempt);
          console.log(`[Gemini API] Waiting ${waitTime}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retries and model fallbacks.");
}

// Indian Food Composition Database fallback
const indianFoodDatabase: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {
  "roti": { calories: 120, protein: 4, carbs: 24, fat: 1, fiber: 3 },
  "chapati": { calories: 120, protein: 4, carbs: 24, fat: 1, fiber: 3 },
  "dosa": { calories: 180, protein: 4, carbs: 30, fat: 5, fiber: 2 },
  "idli": { calories: 60, protein: 2, carbs: 12, fat: 0.1, fiber: 0.8 },
  "dal tadka": { calories: 150, protein: 7, carbs: 20, fat: 5, fiber: 4 },
  "sambar": { calories: 90, protein: 3, carbs: 14, fat: 2, fiber: 3.5 },
  "paneer butter masala": { calories: 350, protein: 12, carbs: 8, fat: 30, fiber: 1 },
  "jeera rice": { calories: 130, protein: 2.5, carbs: 28, fat: 1, fiber: 0.8 },
  "chicken biryani": { calories: 420, protein: 22, carbs: 48, fat: 14, fiber: 2 },
  "curd rice": { calories: 160, protein: 4.5, carbs: 22, fat: 6, fiber: 0.5 },
  "vada": { calories: 120, protein: 3, carbs: 12, fat: 7, fiber: 1.5 },
  "chole bhature": { calories: 550, protein: 14, carbs: 65, fat: 26, fiber: 8 },
  "egg bhurji": { calories: 190, protein: 12, carbs: 3, fat: 14, fiber: 0.5 },
  "mixed veg curry": { calories: 120, protein: 3, carbs: 15, fat: 6, fiber: 4 }
};

// HEALTH ENDPOINT
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 1. AI FOOD RECOGNITION (Image or Name/Text scan)
app.post("/api/ai/food", async (req: express.Request, res: express.Response) => {
  try {
    const { image, text, prompt } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      // Offline or missing key fallback
      const query = (text || prompt || "Roti").toLowerCase();
      const matchedKey = Object.keys(indianFoodDatabase).find(key => query.includes(key)) || "roti";
      const fallbackItem = indianFoodDatabase[matchedKey];
      return res.json({
        items: [
          {
            name: matchedKey.charAt(0).toUpperCase() + matchedKey.slice(1),
            portionGrams: 100,
            calories: fallbackItem.calories,
            protein: fallbackItem.protein,
            carbs: fallbackItem.carbs,
            fat: fallbackItem.fat,
            fiber: fallbackItem.fiber,
            confidence: 0.70
          }
        ],
        total: {
          calories: fallbackItem.calories,
          protein: fallbackItem.protein,
          carbs: fallbackItem.carbs,
          fat: fallbackItem.fat,
          fiber: fallbackItem.fiber
        },
        message: "Confidence is low. Using standard Indian Food Composition fallback values."
      });
    }

    let contents: any[] = [];
    let systemInstruction = `You are an expert Indian clinical dietitian. Analyze the given food image or description and return a structured JSON response with a breakdown of detected items and their nutritional details. Be highly accurate about traditional Indian meals, dishes, and portion sizes (e.g., Roti, Dosa, Idli, Dal, Paneer, Rice, Sambar).

Your response MUST be valid JSON conforming exactly to the following structure:
{
  "items": [
    {
      "name": "Food Name (e.g., Roti)",
      "portionGrams": 120,
      "calories": 240,
      "protein": 6.0,
      "carbs": 36.0,
      "fat": 2.5,
      "fiber": 4.5,
      "confidence": 0.92
    }
  ],
  "total": {
    "calories": 240,
    "protein": 6.0,
    "carbs": 36.0,
    "fat": 2.5,
    "fiber": 4.5
  }
}
All values must be strictly numeric (do not use string symbols like "g" or "kcal" for numerical fields). Estimate reasonably based on typical visual weights. If multiple distinct food items are present, list them separately in the items array and sum them in the total block. Do not provide any conversational text outside the JSON block.`;

    if (image) {
      // Process image input (base64)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      contents = [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        },
        { text: prompt || "Analyze this Indian food meal. Estimate portion sizes and identify individual dishes." }
      ];
    } else {
      // Process pure text input
      contents = [{ text: `Analyze the following Indian food description: "${text || prompt || "2 Rotis and a bowl of yellow dal"}"` }];
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const textResult = response.text || "{}";
    const data = JSON.parse(textResult.trim());
    return res.json(data);

  } catch (error: any) {
    console.error("Gemini Food Scanner error:", error);
    res.status(500).json({ error: "Failed to scan food items. Please input details manually or try again." });
  }
});

// 2. AI MEAL PLANNER (Daily or Weekly)
app.post("/api/ai/meal-plan", async (req, res) => {
  try {
    const { age, gender, height, weight, goal, activityLevel, dietPreference, cuisinePreference, dailyCalorieTarget, macroTargets } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      // Simple local fallback meal plan generator
      const plan = {
        meals: [
          {
            mealType: "Breakfast",
            time: "08:30 AM",
            name: "Masala Oats & Egg Whites",
            items: "1 bowl Spiced Oats with mixed vegetables, 3 boiled egg whites (or paneer cubes)",
            calories: 320,
            protein: 18,
            carbs: 40,
            fat: 6,
            fiber: 5,
            instructions: "Cook oats with finely chopped carrots, beans, and turmeric. Top with steamed egg whites or paneer."
          },
          {
            mealType: "Lunch",
            time: "01:30 PM",
            name: "Chapati, Dal Tadka & Mixed Vegetable",
            items: "2 whole wheat chapatis, 1 cup yellow dal, 1 cup stir-fried cauliflower and green peas, 1 cup fresh green salad",
            calories: 480,
            protein: 16,
            carbs: 65,
            fat: 12,
            fiber: 8,
            instructions: "Prepare dal with cumin-garlic tempering. Keep oil usage for vegetables to 1 teaspoon."
          },
          {
            mealType: "Dinner",
            time: "08:30 PM",
            name: "Grilled Paneer/Chicken & Rice",
            items: "100g Grilled Paneer (or Chicken breast), 1/2 cup cooked brown rice, 1 cup boiled broccoli and carrots",
            calories: 450,
            protein: 24,
            carbs: 35,
            fat: 14,
            fiber: 4,
            instructions: "Marinate paneer or chicken with curd, ginger-garlic paste, and tandoori masala. Grill with minimal oil."
          }
        ]
      };
      return res.json(plan);
    }

    const systemInstruction = `You are a world-class Indian clinical nutritionist. Generate a customized 1-day diet plan tailored specifically to the user's details. Incorporate traditional, easily accessible Indian foods. Make sure it respects diet preference (e.g., Vegetarian, Jain, Vegan) and cuisine preference (e.g., South Indian, North Indian, Tamil).

Your response MUST be valid JSON conforming exactly to the following structure:
{
  "meals": [
    {
      "mealType": "Breakfast",
      "time": "08:30 AM",
      "name": "Name of primary dish",
      "items": "Details of food items, quantities (e.g. 2 Idlis, 1 bowl sambar)",
      "calories": 300,
      "protein": 12,
      "carbs": 45,
      "fat": 5,
      "fiber": 4,
      "instructions": "Simple step-by-step preparation guidelines"
    }
  ]
}
Make sure total calories and macro aggregates roughly align with the requested targets: ${dailyCalorieTarget} calories, Protein: ${macroTargets?.protein || 100}g, Carbs: ${macroTargets?.carbs || 200}g, Fat: ${macroTargets?.fat || 60}g. No external text outside the JSON object.`;

    const prompt = `Generate an Indian meal plan for a ${age} year old ${gender}, weight: ${weight}kg, height: ${height}cm, activity: ${activityLevel}, goal: ${goal}, diet preference: ${dietPreference}, regional cuisine: ${cuisinePreference}.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (error: any) {
    console.error("Gemini Meal Planner error:", error);
    res.status(500).json({ error: "Failed to generate meal plan. Using fallback diet plan." });
  }
});

// 3. AI WORKOUT PLANNER
app.post("/api/ai/workout", async (req, res) => {
  try {
    const { goal, fitnessLevel, availableEquipment, workoutLocation, daysPerWeek, durationMinutes } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      // Local fallback workout plan
      const plan = {
        name: "Home/Gym General Strength & HIIT",
        type: "HIIT",
        durationMinutes: durationMinutes || 45,
        exercises: [
          { name: "Warmup: Jumping Jacks & Arm Circles", sets: 1, durationSeconds: 300, restSeconds: 30, instructions: "Get your heart rate up and prepare joints." },
          { name: "Bodyweight Squats", sets: 3, reps: 15, restSeconds: 45, instructions: "Keep back straight, squat deep until thighs are parallel to ground." },
          { name: "Push Ups (Wall or Floor)", sets: 3, reps: 12, restSeconds: 45, instructions: "Engage core, lower chest to floor and push up with control." },
          { name: "Bent Over Row (using bags or dumbbells)", sets: 3, reps: 12, restSeconds: 45, instructions: "Squeeze shoulder blades, pull weights towards hips." },
          { name: "Plank Hold", sets: 3, durationSeconds: 45, restSeconds: 30, instructions: "Keep straight posture, squeeze glutes and abs." }
        ]
      };
      return res.json(plan);
    }

    const systemInstruction = `You are an elite Indian personal physical trainer. Generate a highly customized, safe, and effective workout plan matching the user's specific goals, location, and equipment availability. Keep Indian fitness constraints in mind (e.g., home setups, basic gyms).

Your response MUST be valid JSON conforming exactly to the following structure:
{
  "name": "Workout Name (e.g., Upper Body Strength)",
  "type": "Strength",
  "durationMinutes": 45,
  "exercises": [
    {
      "name": "Exercise Name (e.g., Push Ups)",
      "sets": 3,
      "reps": 12,
      "durationSeconds": 0,
      "restSeconds": 45,
      "instructions": "Keep hands shoulder-width apart, keep core engaged."
    }
  ]
}
If an exercise uses duration instead of repetitions (like Plank, or Running), set reps to 0 and specify durationSeconds. No conversational text outside JSON.`;

    const prompt = `Create a workout plan for: Goal: ${goal}, Fitness level: ${fitnessLevel}, Equipment: ${availableEquipment}, Location: ${workoutLocation}, Days per week: ${daysPerWeek}, Session length: ${durationMinutes} minutes.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (error: any) {
    console.error("Gemini Workout Planner error:", error);
    res.status(500).json({ error: "Failed to create workout. Using home-friendly fallback workout." });
  }
});

// 4. AI PERSONAL ASSISTANT CHAT
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, userProfile, todayLogs } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      return res.json({
        response: `Namaste! I am currently running in offline-ready mode. Based on your profile (${userProfile?.name || "Fitness Enthusiast"}, Goal: ${userProfile?.goal || "Healthy Living"}), try to drink 3 liters of water daily, consume rich sources of protein like dal, paneer, and eggs, and walk at least 8,000 steps today! How else can I assist you manually?`
      });
    }

    const systemInstruction = `You are "Coach NutriFit", a friendly, motivational personal trainer, sports nutritionist, and wellness advisor specialized in helping Indian users live healthier lives.
Always use Indian dietary terms (e.g., Paneer, Dal, Soya chunks, Chapati, Ghee, Idli, Sambar, Chicken Curry). Provide clear, supportive, and scientifically accurate advice.

IMPORTANT HEALTH SAFETY DISCLAIMER:
- Do NOT prescribe medication.
- Do NOT provide medical diagnosis.
- If the user asks about chest pain, severe medical conditions, or asks for medical prescription, kindly but firmly direct them to consult a qualified healthcare doctor immediately.

User Profile:
- Name: ${userProfile?.name || "User"}
- Goal: ${userProfile?.goal || "Healthy lifestyle"}
- Height: ${userProfile?.height}cm, Weight: ${userProfile?.weight}kg
- Calorie target: ${userProfile?.dailyCalorieTarget} kcal
- Diet: ${userProfile?.dietPreference}

Today's Logged Context:
- Calories eaten today: ${todayLogs?.caloriesEaten || 0} kcal / ${userProfile?.dailyCalorieTarget || 2000} kcal
- Protein eaten today: ${todayLogs?.proteinEaten || 0}g / ${userProfile?.macroTargets?.protein || 120}g
- Water drunk today: ${todayLogs?.waterMl || 0} ml / 3000 ml
- Steps walked: ${todayLogs?.steps || 0} / 10000

Answer the user's questions clearly, concisely, and with premium typography. Use bullet points or bold text where appropriate to make advice highly readable on a small mobile screen. Keep responses under 250 words.`;

    // Map conversation logs
    const geminiMessages = messages.map((m: any) => ({
      role: m.role,
      parts: m.parts
    }));

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents: geminiMessages,
      config: {
        systemInstruction,
        maxOutputTokens: 800
      }
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Gemini Chat assistant error:", error);
    res.status(500).json({ error: "Sorry, I had trouble processing that request. Let's try again!" });
  }
});

// 5. AI PROGRESS ANALYSIS
app.post("/api/ai/progress", async (req, res) => {
  try {
    const { userProfile, historyData } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      return res.json({
        analysis: "Awesome effort! Your logged records show stable adherence to hydration. Continue tracking daily to trigger advanced deep visual patterns analysis once your AI server connection is fully calibrated."
      });
    }

    const systemInstruction = `You are an clinical data health analyst. Analyze the user's weekly nutrition and fitness history against their targets. Identify positive trends, critical errors/problems, and provide three practical, direct suggestions for improvement.
IMPORTANT: Never provide medical diagnoses or claim absolute medical certainty. Be encouraging and realistic. Format output with beautiful, mobile-friendly markdown bullets.`;

    const prompt = `Analyze history:
Profile: ${JSON.stringify(userProfile)}
History logs last 7 days: ${JSON.stringify(historyData)}
Compare calories, protein, steps, water, sleep, and weight. Provide a structured review:
1. Adherence Summary
2. Key Problem Areas
3. Three highly specific Indian diet & lifestyle actions.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Progress Analyzer error:", error);
    res.status(500).json({ error: "Failed to analyze trends. Keep tracking daily to gather more data!" });
  }
});

// 6. VOICE COMMAND ASSISTANT (Natural Language Processing of voice transcripts)
app.post("/api/ai/voice", async (req, res) => {
  try {
    const { transcript, language } = req.body;
    const ai = getGeminiAI();

    if (!ai) {
      // Local regex/substring parsers for offline safety
      const text = transcript.toLowerCase();
      if (text.includes("water") || text.includes("pani") || text.includes("tannir")) {
        const ml = text.includes("500") ? 500 : text.includes("250") ? 250 : text.includes("750") ? 750 : 250;
        return res.json({
          intent: "ADD_WATER",
          data: { amountMl: ml },
          speechFeedback: `Added ${ml} milliliters of water to your daily hydration tracker.`
        });
      }
      return res.json({
        intent: "CHAT_ASSIST",
        data: { text: transcript },
        speechFeedback: "Recognized command. I will help answer your nutrition questions."
      });
    }

    const systemInstruction = `You are the core voice-intent processing engine of the NutriFit AI system. Convert natural-language audio transcripts (which may be in English, Hindi, or Tamil or spoken as mix-Hinglish) into structured action commands for logging in the frontend application.

Supported Intents:
1. ADD_WATER -> "Add 500 ml water" or "Paani pee liya half liter" or "tannir kudinchan"
2. LOG_FOOD -> "I ate two rotis and dal" or "breakfast me idli khayi" or "Inniku mazaiyan dosa sapten"
3. START_WORKOUT -> "Start today's workout" or "workout chaloo karo" or "exercise mudinja"
4. VIEW_DASHBOARD -> "show calories" or "dashboard dikhao" or "enna calories inniku"
5. CHAT_ASSIST -> General questions, recipes, guidelines.

Your response MUST be valid JSON conforming exactly to:
{
  "intent": "ADD_WATER" | "LOG_FOOD" | "START_WORKOUT" | "VIEW_DASHBOARD" | "CHAT_ASSIST",
  "data": {
    "amountMl": 500, // Only for ADD_WATER
    "foodQuery": "2 rotis and yellow dal", // Only for LOG_FOOD
    "text": "original transcript text"
  },
  "speechFeedback": "A concise verbal spoken feedback to read back to the user in the language of transcript (e.g. 'Sure, logged 500ml of water!' or 'Idli and Dosa have been added to your Breakfast diary!')"
}
Do not include any conversational filler outside the JSON. Be highly precise. Translate multilingual terms correctly to standard items.`;

    const prompt = `Interpret this voice command transcript: "${transcript}" (Language setting: ${language || "English"})`;

    const response = await generateContentWithRetry({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (error: any) {
    console.error("Gemini Voice Intent Parser error:", error);
    res.status(500).json({ error: "Failed to process voice command. Please speak or write clearly." });
  }
});

// START EXPRESS + VITE INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NutriFit AI] Server running at http://localhost:${PORT}`);
  });
}

startServer();
