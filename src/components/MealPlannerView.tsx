import React, { useState, useEffect } from "react";
import { UserProfile, FoodLog, FoodItem, ShoppingItem } from "../types";
import { 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Utensils, 
  ChefHat, 
  ShoppingCart, 
  FileText, 
  RefreshCw, 
  CheckSquare, 
  Square,
  AlertCircle
} from "lucide-react";

interface MealPlannerViewProps {
  profile: UserProfile;
  onLogMeal: (mealType: FoodLog['mealType'], items: FoodItem[]) => void;
  selectedDate: string;
  onNavigateToTab?: (tab: string) => void;
}

interface AIPlanMeal {
  mealType: "Breakfast" | "Mid-Morning Snack" | "Lunch" | "Evening Snack" | "Dinner";
  time: string;
  name: string;
  items: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  instructions: string;
}

interface AIMealPlanResponse {
  meals: AIPlanMeal[];
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  profile,
  onLogMeal,
  selectedDate,
  onNavigateToTab
}) => {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly" | "shopping">("daily");
  const [loading, setLoading] = useState<boolean>(false);
  const [mealPlan, setMealPlan] = useState<AIPlanMeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Collapse state for preparation directions
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [newShopName, setNewShopName] = useState<string>("");
  const [newShopCategory, setNewShopCategory] = useState<ShoppingItem['category']>("Vegetables");
  const [newShopQty, setNewShopQty] = useState<string>("");

  // Load plan and shopping list on mount or profile change
  useEffect(() => {
    const cachedPlan = localStorage.getItem(`mealPlan_${profile.email}`);
    if (cachedPlan) {
      try {
        setMealPlan(JSON.parse(cachedPlan));
      } catch (e) {
        console.error("Failed to parse cached meal plan:", e);
      }
    } else {
      // If no cached plan, load a high-quality default tailored to profile
      generateDefaultPlan();
    }

    const cachedShopping = localStorage.getItem(`shopping_${profile.email}`);
    if (cachedShopping) {
      try {
        setShoppingList(JSON.parse(cachedShopping));
      } catch (e) {
        console.error("Failed to parse cached shopping list:", e);
      }
    } else {
      // Default Indian smart shopping items
      const defaultItems: ShoppingItem[] = [
        { id: "s1", name: "Paneer (High Protein)", category: "Dairy", quantity: "400g", completed: false },
        { id: "s2", name: "Brown Rice", category: "Grains", quantity: "1 kg", completed: false },
        { id: "s3", name: "Moong Dal / Yellow Dal", category: "Protein", quantity: "500g", completed: true },
        { id: "s4", name: "Spinach (Palak)", category: "Vegetables", quantity: "1 bunch", completed: false },
        { id: "s5", name: "Spiced Masala Oats", category: "Grains", quantity: "500g", completed: false }
      ];
      setShoppingList(defaultItems);
      localStorage.setItem(`shopping_${profile.email}`, JSON.stringify(defaultItems));
    }
  }, [profile.email]);

  const generateDefaultPlan = () => {
    const isVeg = profile.dietPreference === "Vegetarian" || profile.dietPreference === "Jain" || profile.dietPreference === "Vegan";
    const defaults: AIPlanMeal[] = [
      {
        mealType: "Breakfast",
        time: "08:00 AM",
        name: isVeg ? "Moong Dal Cheela with Mint Chutney" : "Egg White Bhurji & Multigrain Roti",
        items: isVeg 
          ? "2 savory split-green-gram pancakes (Cheelas) with grated paneer filling, 2 tbsp homemade mint-coriander chutney"
          : "3 scrambled egg whites cooked with onions, tomatoes, green chillies, served with 2 toasted multigrain rotis",
        calories: 280,
        protein: 16,
        carbs: 34,
        fat: 8,
        fiber: 5,
        instructions: "Soak moong dal overnight and grind into a smooth batter with ginger and green chillies. Spread thinly on a non-stick tawa, top with crumbled spiced paneer, and grill until golden."
      },
      {
        mealType: "Mid-Morning Snack",
        time: "11:00 AM",
        name: "Roasted Chana & Fresh Apple",
        items: "1 small handful (30g) of unsalted roasted chickpeas, 1 crisp green apple or local pear",
        calories: 140,
        protein: 5,
        carbs: 26,
        fat: 1.5,
        fiber: 6,
        instructions: "Eat raw as a light high-fiber metabolism booster."
      },
      {
        mealType: "Lunch",
        time: "01:30 PM",
        name: isVeg ? "High-Protein Paneer Bhurji with Roti" : "Tandoori Grilled Chicken Breast with Brown Rice",
        items: isVeg 
          ? "150g spiced scrambled low-fat cottage cheese (Paneer), 2 hot whole wheat chapatis/rotis, 1 small bowl green salad"
          : "150g dry-roasted tandoori chicken breast, 1 cup cooked brown rice, 1 cup steamed broccoli and bell peppers",
        calories: 450,
        protein: 24,
        carbs: 52,
        fat: 12,
        fiber: 7,
        instructions: isVeg
          ? "Sauté onions, tomatoes, ginger-garlic paste in 1 tsp olive oil. Add crumbled paneer, turmeric, coriander powder, and fresh coriander. Serve hot."
          : "Marinate chicken in thick curd, lemon juice, tandoori masala, and ginger-garlic paste. Grill or bake with 1 tsp oil until fully cooked."
      },
      {
        mealType: "Evening Snack",
        time: "05:30 PM",
        name: "Masala Green Tea with Almonds",
        items: "1 cup hot herbal spices green tea, 6-8 soaked raw almonds (badam)",
        calories: 90,
        protein: 3,
        carbs: 4,
        fat: 7,
        fiber: 2,
        instructions: "Soak almonds overnight to remove skin. Serve with freshly brewed ginger cardamom green tea."
      },
      {
        mealType: "Dinner",
        time: "08:30 PM",
        name: "Mixed Vegetable Sambar & Steamed Brown Rice Idli",
        items: "3 small steamed brown rice and urad dal idlis, 1 generous bowl vegetable loaded thick sambar dal, 1 tbsp tomato chutney",
        calories: 320,
        protein: 11,
        carbs: 58,
        fat: 3,
        fiber: 8,
        instructions: "Steam pre-fermented brown rice batter. Boil yellow split dal with pumpkins, drumsticks, carrots, and sambar powder. Temper with mustard seeds and curry leaves."
      }
    ];
    setMealPlan(defaults);
    localStorage.setItem(`mealPlan_${profile.email}`, JSON.stringify(defaults));
  };

  // Call the server endpoint /api/ai/meal-plan to generate an AI plan
  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          goal: profile.goal,
          activityLevel: profile.activityLevel,
          dietPreference: profile.dietPreference,
          cuisinePreference: profile.cuisinePreference,
          dailyCalorieTarget: profile.dailyCalorieTarget,
          macroTargets: profile.macroTargets
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate custom meal plan from server.");
      }

      const data: AIMealPlanResponse = await response.json();
      if (data && data.meals && data.meals.length > 0) {
        setMealPlan(data.meals);
        localStorage.setItem(`mealPlan_${profile.email}`, JSON.stringify(data.meals));
      } else {
        throw new Error("Invalid response format received from AI.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Could not connect to the AI model. Loaded default plan.");
      generateDefaultPlan();
    } finally {
      setLoading(false);
    }
  };

  // Toggle meal prep collapse
  const toggleMealExpand = (index: number) => {
    setExpandedMeals(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Add items from meal plan to the actual food diary
  const handleAddMealToDiary = (meal: AIPlanMeal) => {
    const foodItem: FoodItem = {
      name: meal.name,
      portionGrams: 150, // Standard estimated portion
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber
    };
    onLogMeal(meal.mealType, [foodItem]);
    if (onNavigateToTab) {
      onNavigateToTab("food");
    }
  };

  // Shopping List logic
  const handleAddShopItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    const newItem: ShoppingItem = {
      id: `shop_${Date.now()}`,
      name: newShopName.trim(),
      category: newShopCategory,
      quantity: newShopQty.trim() || "1 unit",
      completed: false
    };

    const updated = [...shoppingList, newItem];
    setShoppingList(updated);
    localStorage.setItem(`shopping_${profile.email}`, JSON.stringify(updated));
    setNewShopName("");
    setNewShopQty("");
  };

  const handleToggleShopItem = (id: string) => {
    const updated = shoppingList.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setShoppingList(updated);
    localStorage.setItem(`shopping_${profile.email}`, JSON.stringify(updated));
  };

  const handleDeleteShopItem = (id: string) => {
    const updated = shoppingList.filter(item => item.id !== id);
    setShoppingList(updated);
    localStorage.setItem(`shopping_${profile.email}`, JSON.stringify(updated));
  };

  // Generate shopping list automatically from the current meal plan's names and items
  const handleAutoGenerateShopping = () => {
    if (mealPlan.length === 0) return;

    // Simple dictionary matching ingredients
    const getCategory = (itemName: string): ShoppingItem['category'] => {
      const name = itemName.toLowerCase();
      if (name.includes("paneer") || name.includes("curd") || name.includes("dahi") || name.includes("milk")) return "Dairy";
      if (name.includes("roti") || name.includes("rice") || name.includes("oats") || name.includes("bread") || name.includes("wheat") || name.includes("atta")) return "Grains";
      if (name.includes("chana") || name.includes("dal") || name.includes("egg") || name.includes("chicken") || name.includes("fish") || name.includes("mutton") || name.includes("soya") || name.includes("chickpeas")) return "Protein";
      if (name.includes("apple") || name.includes("banana") || name.includes("pear") || name.includes("orange") || name.includes("fruits")) return "Fruits";
      if (name.includes("spinach") || name.includes("onion") || name.includes("tomato") || name.includes("chilli") || name.includes("peas") || name.includes("cauliflower") || name.includes("veg") || name.includes("mint") || name.includes("ginger") || name.includes("garlic")) return "Vegetables";
      if (name.includes("tea") || name.includes("cardamom") || name.includes("cinnamon") || name.includes("turmeric") || name.includes("masala")) return "Spices";
      return "Other";
    };

    const itemsToAdd: ShoppingItem[] = [];
    mealPlan.forEach((meal, idx) => {
      // Split some items roughly by comma
      const itemsList = meal.items.split(",");
      itemsList.forEach((itemText, sIdx) => {
        const cleanText = itemText.replace(/\d+\s*(g|ml|tbsp|cup|pieces|tbsp|bowl|small|crisp)\s*(of)?/i, "").trim();
        if (cleanText.length > 3) {
          itemsToAdd.push({
            id: `auto_${idx}_${sIdx}_${Date.now()}`,
            name: cleanText.charAt(0).toUpperCase() + cleanText.slice(1),
            category: getCategory(cleanText),
            quantity: itemText.match(/\d+\s*(g|ml|tbsp|cup|pieces|bowl)/i)?.[0] || "1 item",
            completed: false
          });
        }
      });
    });

    // Remove duplicates from new list
    const uniqueItems: ShoppingItem[] = [];
    const seen = new Set<string>();
    itemsToAdd.forEach(item => {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    setShoppingList(uniqueItems);
    localStorage.setItem(`shopping_${profile.email}`, JSON.stringify(uniqueItems));
    alert("Smart Shopping List generated with fresh ingredients from your AI Meal Plan!");
  };

  // Calculate plan nutrition total
  const planTotals = mealPlan.reduce(
    (acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fat += meal.fat || 0;
      acc.fiber += meal.fiber || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return (
    <div className="space-y-6 pb-24 text-white animate-fade-in px-1">
      {/* 1. Header Navigation Tabs */}
      <div className="flex flex-col space-y-4">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Indian Diet Planner</span>
          <h1 className="text-2xl font-black text-slate-100 mt-0.5 flex items-center gap-1.5">
            <Utensils className="w-6 h-6 text-emerald-400" />
            AI Meal Planner
          </h1>
        </div>

        {/* View switching bar */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-900 overflow-x-auto whitespace-nowrap">
          {[
            { id: "daily", label: "Daily Plan", icon: FileText },
            { id: "weekly", label: "Weekly View", icon: Calendar },
            { id: "monthly", label: "Monthly", icon: Calendar },
            { id: "shopping", label: "Shopping List", icon: ShoppingCart }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  isSelected 
                    ? "bg-slate-900 text-emerald-400 shadow-inner border border-slate-800" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. TAB COMPONENT VIEWS */}
      {activeTab === "daily" && (
        <div className="space-y-5">
          {/* AI Generation Settings card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2.5xl p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Target Calories: {profile.dailyCalorieTarget} kcal</span>
                <h3 className="text-md font-extrabold text-slate-100">Tailored Indian Menu</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Menu filtered for <strong className="text-slate-300 font-semibold">{profile.dietPreference}</strong> preferences with <strong className="text-slate-300 font-semibold">{profile.cuisinePreference}</strong> style.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={handleGeneratePlan}
                className="p-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-md group shrink-0"
              >
                <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin" : "group-hover:rotate-45 transition-all"}`} />
              </button>
            </div>

            {/* Generated Plan Nutrition Summary Gauge */}
            {mealPlan.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Plan Total Macros</span>
                  <span className="text-xs font-extrabold text-emerald-400">{planTotals.calories} / {profile.dailyCalorieTarget} kcal</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Prot", val: planTotals.protein, target: profile.macroTargets.protein, color: "bg-emerald-500", labelColor: "text-emerald-400" },
                    { label: "Carbs", val: planTotals.carbs, target: profile.macroTargets.carbs, color: "bg-amber-400", labelColor: "text-amber-400" },
                    { label: "Fat", val: planTotals.fat, target: profile.macroTargets.fat, color: "bg-rose-500", labelColor: "text-rose-400" },
                    { label: "Fiber", val: planTotals.fiber, target: profile.macroTargets.fiber, color: "bg-cyan-500", labelColor: "text-cyan-400" }
                  ].map((macro) => {
                    const pct = Math.min(100, Math.round((macro.val / macro.target) * 100)) || 0;
                    return (
                      <div key={macro.label} className="bg-slate-950/40 p-2 rounded-xl text-center border border-slate-900/60">
                        <span className="text-[10px] text-slate-400 font-bold block">{macro.label}</span>
                        <span className={`text-xs font-black block mt-0.5 ${macro.labelColor}`}>{macro.val}g</span>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
                          <div className={`h-full ${macro.color}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MEALS TIMELINE */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3.5">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-center">
                <p className="text-xs font-black text-slate-200">Consulting Coach NutriFit...</p>
                <p className="text-[11px] text-slate-500 mt-1">Formulating customized Indian diet chart...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider pl-1 select-none">Meal Timeline</h3>
              {mealPlan.map((meal, idx) => {
                const isExpanded = !!expandedMeals[idx];
                return (
                  <div 
                    key={idx}
                    className="bg-slate-900/40 border border-slate-800 hover:border-slate-800/80 rounded-2xl p-4.5 space-y-3 transition-all relative overflow-hidden"
                  >
                    {/* Top Meal Type Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-slate-100">{meal.mealType}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">• {meal.time}</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-200 mt-0.5">{meal.name}</h4>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-300 shrink-0">{meal.calories} kcal</span>
                    </div>

                    {/* Meal items details */}
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Menu Items</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium mt-0.5">
                        {meal.items}
                      </p>
                    </div>

                    {/* Macros detail tags */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[10px] bg-emerald-500/5 text-emerald-400 px-2 py-1 rounded-md font-bold">Protein: {meal.protein}g</span>
                      <span className="text-[10px] bg-amber-400/5 text-amber-400 px-2 py-1 rounded-md font-bold">Carbs: {meal.carbs}g</span>
                      <span className="text-[10px] bg-rose-500/5 text-rose-400 px-2 py-1 rounded-md font-bold">Fat: {meal.fat}g</span>
                      <span className="text-[10px] bg-cyan-500/5 text-cyan-400 px-2 py-1 rounded-md font-bold">Fiber: {meal.fiber}g</span>
                    </div>

                    {/* Directions Collapse control */}
                    {meal.instructions && (
                      <div className="pt-2">
                        {isExpanded && (
                          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/5 rounded-xl space-y-1 mb-2.5 animate-fade-in">
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5" /> Preparation Directions
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium pt-0.5">
                              {meal.instructions}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 w-full">
                          <button
                            onClick={() => toggleMealExpand(idx)}
                            className="flex-1 py-2 text-center text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 rounded-xl hover:bg-slate-800/40 active:scale-95 transition-all"
                          >
                            {isExpanded ? "Hide Recipe Directions" : "View Preparation Directions"}
                          </button>
                          
                          <button
                            onClick={() => handleAddMealToDiary(meal)}
                            className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 transition-all shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Log to Diary
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "weekly" && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2.5xl p-6 shadow-xl space-y-5">
          <div className="text-center space-y-1.5">
            <Calendar className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-md font-black text-slate-200">7-Day Indian Meal Planner</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              A balanced, rotating weekly schedule designed to keep your metabolism elevated and meet protein thresholds.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { day: "Monday", focus: "Moong Dal & Paneer Bhurji", cals: "1,550 kcal", protein: "88g" },
              { day: "Tuesday", focus: "Idli Sambar & Grilled Chicken/Soya", cals: "1,620 kcal", protein: "92g" },
              { day: "Wednesday", focus: "Wheat Roti & Dal Makhani (Low Fat)", cals: "1,490 kcal", protein: "75g" },
              { day: "Thursday", focus: "Quinoa Oats Khichdi & Sprouts Salad", cals: "1,420 kcal", protein: "70g" },
              { day: "Friday", focus: "Palak Paneer & Brown Rice", cals: "1,580 kcal", protein: "84g" },
              { day: "Saturday", focus: "Masala Egg White Scramble & Fruit Curd", cals: "1,510 kcal", protein: "95g" },
              { day: "Sunday", focus: "Low-Fat Vegetable Biryani & Cucumber Raita", cals: "1,650 kcal", protein: "72g" }
            ].map((dayItem, dIdx) => (
              <div key={dIdx} className="p-3.5 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-100">{dayItem.day}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Focus: {dayItem.focus}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-200 block">{dayItem.cals}</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">{dayItem.protein} Protein</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setActiveTab("daily");
              handleGeneratePlan();
            }}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs active:scale-95 transition-all shadow-md uppercase tracking-wider flex items-center justify-center space-x-1"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Generate Today's Custom Menu</span>
          </button>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2.5xl p-6 shadow-xl text-center space-y-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-md font-black text-slate-200">Monthly Periodization</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Your monthly coaching plan divides food intake into progressive nutritional cycles:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-black block uppercase tracking-wider">Week 1-2</span>
              <span className="text-xs font-bold text-slate-200 block">Metabolic Re-set</span>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">High-fiber whole foods to optimize gut digestion and establish routine logging.</p>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-black block uppercase tracking-wider">Week 3-4</span>
              <span className="text-xs font-bold text-slate-200 block">Thermogenic Shredding</span>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">Strict protein threshold compliance and calorie deficits to support fat loss.</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic mt-2 block">
            AI Coach dynamically adapts each subsequent week based on your logged daily progress logs.
          </p>
        </div>
      )}

      {activeTab === "shopping" && (
        <div className="space-y-5 animate-fade-in">
          {/* Add custom item form */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2.5xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Add Shopping Items</h3>
              <button
                onClick={handleAutoGenerateShopping}
                className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract from AI Plan</span>
              </button>
            </div>

            <form onSubmit={handleAddShopItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Soya Chunks"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Qty / Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 200g"
                    value={newShopQty}
                    onChange={(e) => setNewShopQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-end space-x-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Category</label>
                  <select
                    value={newShopCategory}
                    onChange={(e) => setNewShopCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {["Vegetables", "Fruits", "Grains", "Dairy", "Protein", "Spices", "Other"].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="p-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          </div>

          {/* Checklist display */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider pl-1 select-none">Smart Checklist</h3>
            {shoppingList.length === 0 ? (
              <div className="p-8 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-black text-slate-400">Shopping list is completely clear!</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  Click "Extract from AI Plan" above to instantly load ingredients, or add some manually.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Group by category */}
                {(["Protein", "Dairy", "Grains", "Vegetables", "Fruits", "Spices", "Other"] as const).map((cat) => {
                  const filtered = shoppingList.filter(item => item.category === cat);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2">
                      <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider pl-1.5 select-none">{cat}</span>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40">
                        {filtered.map((item) => (
                          <div 
                            key={item.id}
                            className={`p-3.5 flex items-center justify-between transition-all ${item.completed ? "bg-slate-950/20 opacity-60" : "hover:bg-slate-900/30"}`}
                          >
                            <div 
                              onClick={() => handleToggleShopItem(item.id)}
                              className="flex items-center space-x-3 cursor-pointer flex-1"
                            >
                              {item.completed ? (
                                <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                              )}
                              <span className={`text-xs font-bold text-slate-200 ${item.completed ? "line-through text-slate-500" : ""}`}>
                                {item.name} <span className="text-[10px] text-slate-500 font-medium ml-1">({item.quantity})</span>
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteShopItem(item.id)}
                              className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
