import React, { useState, useMemo } from "react";
import { UserProfile, FoodLog } from "../types";
import { Sparkles, Flame, Droplet, Footprints, Clock, Moon, ChevronRight, Plus, Scan, CalendarRange } from "lucide-react";

interface DashboardViewProps {
  userId: string;
  profile: UserProfile;
  foodLogs: FoodLog[];
  waterAmount: number;
  stepsCount: number;
  workoutDuration: number;
  sleepDuration: string;
  onNavigateToTab: (tab: string) => void;
  onOpenQuickAction: (action: "scan" | "water" | "steps" | "sleep" | "fasting") => void;
  dailyInsight: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userId,
  profile,
  foodLogs,
  waterAmount,
  stepsCount,
  workoutDuration,
  sleepDuration,
  onNavigateToTab,
  onOpenQuickAction,
  dailyInsight
}) => {
  // Toggle for nutrition report scope: daily, weekly, or monthly
  const [reportInterval, setReportInterval] = useState<"daily" | "weekly" | "monthly">("daily");

  // Retrieve all historical logs from local storage for offline-first calculation
  const allLogs = useMemo(() => {
    try {
      const item = localStorage.getItem(`foodLogs_${userId}`);
      return item ? (JSON.parse(item) as FoodLog[]) : [];
    } catch (e) {
      return [];
    }
  }, [userId]);

  // Aggregate daily nutrition totals (based on active date logs passed via prop)
  const dailyNutrition = useMemo(() => {
    return foodLogs.reduce(
      (acc, log) => {
        acc.calories += log.totalCalories;
        acc.protein += log.totalProtein;
        acc.carbs += log.totalCarbs;
        acc.fat += log.totalFat;
        acc.fiber += log.totalFiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [foodLogs]);

  // Helper to filter logs within past N days
  const getLogsWithinDays = (days: number) => {
    const today = new Date();
    const result: FoodLog[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const daysLogs = allLogs.filter(l => l.date === dateStr);
      result.push(...daysLogs);
    }
    return result;
  };

  // Compute stats based on selected reportInterval
  const nutritionScope = useMemo(() => {
    if (reportInterval === "daily") {
      const calPercent = Math.min(100, Math.round((dailyNutrition.calories / profile.dailyCalorieTarget) * 100)) || 0;
      const remainingCals = Math.max(0, profile.dailyCalorieTarget - dailyNutrition.calories);
      return {
        calories: dailyNutrition.calories,
        caloriesTarget: profile.dailyCalorieTarget,
        calPercent,
        remainingCals,
        protein: dailyNutrition.protein,
        proteinTarget: profile.macroTargets.protein,
        carbs: dailyNutrition.carbs,
        carbsTarget: profile.macroTargets.carbs,
        fat: dailyNutrition.fat,
        fatTarget: profile.macroTargets.fat,
        fiber: dailyNutrition.fiber,
        fiberTarget: profile.macroTargets.fiber,
        subLabel: "Today's Intake",
        remainingLabel: "Remaining Calories"
      };
    } else if (reportInterval === "weekly") {
      const logs = getLogsWithinDays(7);
      const totalCalories = logs.reduce((sum, l) => sum + l.totalCalories, 0);
      const averageCalories = Math.round(totalCalories / 7);
      const calPercent = Math.min(100, Math.round((averageCalories / profile.dailyCalorieTarget) * 100)) || 0;
      const remainingCals = Math.max(0, profile.dailyCalorieTarget - averageCalories);

      // Average macros
      const totalP = logs.reduce((sum, l) => sum + l.totalProtein, 0);
      const totalC = logs.reduce((sum, l) => sum + l.totalCarbs, 0);
      const totalF = logs.reduce((sum, l) => sum + l.totalFat, 0);
      const totalFib = logs.reduce((sum, l) => sum + l.totalFiber, 0);

      return {
        calories: averageCalories,
        caloriesTarget: profile.dailyCalorieTarget,
        calPercent,
        remainingCals,
        protein: Math.round(totalP / 7),
        proteinTarget: profile.macroTargets.protein,
        carbs: Math.round(totalC / 7),
        carbsTarget: profile.macroTargets.carbs,
        fat: Math.round(totalF / 7),
        fatTarget: profile.macroTargets.fat,
        fiber: Math.round(totalFib / 7),
        fiberTarget: profile.macroTargets.fiber,
        subLabel: "7-Day Daily Avg",
        remainingLabel: "Avg Calories Left"
      };
    } else {
      const logs = getLogsWithinDays(30);
      const totalCalories = logs.reduce((sum, l) => sum + l.totalCalories, 0);
      const averageCalories = Math.round(totalCalories / 30);
      const calPercent = Math.min(100, Math.round((averageCalories / profile.dailyCalorieTarget) * 100)) || 0;
      const remainingCals = Math.max(0, profile.dailyCalorieTarget - averageCalories);

      // Average macros
      const totalP = logs.reduce((sum, l) => sum + l.totalProtein, 0);
      const totalC = logs.reduce((sum, l) => sum + l.totalCarbs, 0);
      const totalF = logs.reduce((sum, l) => sum + l.totalFat, 0);
      const totalFib = logs.reduce((sum, l) => sum + l.totalFiber, 0);

      return {
        calories: averageCalories,
        caloriesTarget: profile.dailyCalorieTarget,
        calPercent,
        remainingCals,
        protein: Math.round(totalP / 30),
        proteinTarget: profile.macroTargets.protein,
        carbs: Math.round(totalC / 30),
        carbsTarget: profile.macroTargets.carbs,
        fat: Math.round(totalF / 30),
        fatTarget: profile.macroTargets.fat,
        fiber: Math.round(totalFib / 30),
        fiberTarget: profile.macroTargets.fiber,
        subLabel: "30-Day Daily Avg",
        remainingLabel: "Avg Calories Left"
      };
    }
  }, [reportInterval, dailyNutrition, allLogs, profile]);

  // Math for Circular SVG progress ring
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (nutritionScope.calPercent / 100) * circumference;

  // Aggregate meal types
  const getMealSummary = (type: FoodLog['mealType']) => {
    const matchingLog = foodLogs.find(l => l.mealType === type);
    if (!matchingLog || matchingLog.items.length === 0) return "Nothing logged yet";
    return matchingLog.items.map(item => `${item.name} (${item.portionGrams}g)`).join(", ");
  };

  const getMealCalories = (type: FoodLog['mealType']) => {
    const matchingLog = foodLogs.find(l => l.mealType === type);
    return matchingLog ? `${matchingLog.totalCalories} kcal` : "";
  };

  const bmi = Number((profile.weight / ((profile.height / 100) * (profile.height / 100))).toFixed(1));
  const getBmiCategory = (v: number) => {
    if (v < 18.5) return "Underweight";
    if (v < 24.9) return "Normal";
    if (v < 29.9) return "Overweight";
    return "Obese";
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in text-white px-1">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs text-slate-400 font-bold tracking-wider uppercase">Good Morning,</h2>
          <h1 className="text-2xl font-black text-slate-100 mt-0.5">{profile.name} 👋</h1>
        </div>
        <div 
          onClick={() => onNavigateToTab("profile")}
          className="w-11 h-11 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all text-emerald-400 font-black text-sm uppercase shadow-md shadow-emerald-500/5"
        >
          {profile.name.charAt(0)}
        </div>
      </div>

      {/* 2. Daily Insight Block */}
      {dailyInsight && (
        <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-2xl flex items-start space-x-3 shadow-md">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">AI Coach Insight</span>
            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1 italic">
              "{dailyInsight}"
            </p>
          </div>
        </div>
      )}

      {/* 3. Calories Circle Ring & Macros (Daily, Weekly, Monthly interactive report) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl relative overflow-hidden space-y-4">
        {/* Interval Selector Toggles */}
        <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-2xl border border-slate-900/80">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-2 flex items-center gap-1">
            <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
            Interval
          </span>
          <div className="flex space-x-1">
            {(["daily", "weekly", "monthly"] as const).map((interval) => (
              <button
                key={interval}
                onClick={() => setReportInterval(interval)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  reportInterval === interval
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 items-center pt-1.5">
          {/* Circular Indicator */}
          <div className="col-span-2 flex flex-col items-center justify-center relative">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Back Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-emerald-500 transition-all duration-500"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute flex flex-col items-center select-none">
              <span className="text-2xl font-black text-slate-100">{nutritionScope.calPercent}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {reportInterval === "daily" ? "Eaten" : "Avg Eaten"}
              </span>
            </div>
          </div>

          {/* Calorie Stats Info */}
          <div className="col-span-3 space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{nutritionScope.subLabel}</span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-100">{nutritionScope.calories.toLocaleString()}</span>
                <span className="text-xs text-slate-400">/ {nutritionScope.caloriesTarget} kcal</span>
              </div>
            </div>
            <div className="h-[1px] bg-slate-800/80 my-2"></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{nutritionScope.remainingLabel}</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <Flame className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <span className="text-md font-extrabold text-emerald-400">{nutritionScope.remainingCals.toLocaleString()} kcal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Macro Metrics */}
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          {[
            { label: "Protein", val: nutritionScope.protein, target: nutritionScope.proteinTarget, color: "bg-emerald-500", labelColor: "text-emerald-400", unit: "g" },
            { label: "Carbs", val: nutritionScope.carbs, target: nutritionScope.carbsTarget, color: "bg-amber-500", labelColor: "text-amber-400", unit: "g" },
            { label: "Fat", val: nutritionScope.fat, target: nutritionScope.fatTarget, color: "bg-rose-500", labelColor: "text-rose-400", unit: "g" },
            { label: "Fiber", val: nutritionScope.fiber, target: nutritionScope.fiberTarget, color: "bg-cyan-500", labelColor: "text-cyan-400", unit: "g" }
          ].map((macro) => {
            const percent = Math.min(100, Math.round((macro.val / macro.target) * 100)) || 0;
            return (
              <div key={macro.label} className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-300">{macro.label}</span>
                  <span className={macro.labelColor}>{macro.val}{macro.unit}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${macro.color}`} style={{ width: `${percent}%` }}></div>
                </div>
                <div className="text-[9px] text-slate-500 font-bold text-right">Goal: {macro.target}g</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Mini Metrics Multi-widgets Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Hydration */}
        <div 
          onClick={() => onOpenQuickAction("water")}
          className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center space-x-3 shadow-md cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-105 transition-all">
            <Droplet className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">💧 Water</span>
            <span className="text-sm font-extrabold text-slate-100 mt-0.5">{waterAmount.toFixed(1)} <span className="text-xs text-slate-500 font-bold">/ 3.0 L</span></span>
          </div>
        </div>

        {/* Step Tracker */}
        <div 
          onClick={() => onOpenQuickAction("steps")}
          className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center space-x-3 shadow-md cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-all">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">👟 Steps</span>
            <span className="text-sm font-extrabold text-slate-100 mt-0.5">{stepsCount.toLocaleString()} <span className="text-xs text-slate-500 font-bold">/ 10k</span></span>
          </div>
        </div>

        {/* Workout Tracker */}
        <div 
          onClick={() => onNavigateToTab("workout")}
          className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center space-x-3 shadow-md cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-105 transition-all">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🏋 Workout</span>
            <span className="text-sm font-extrabold text-slate-100 mt-0.5">{workoutDuration} <span className="text-xs text-slate-500 font-bold">min today</span></span>
          </div>
        </div>

        {/* Sleep Tracker */}
        <div 
          onClick={() => onOpenQuickAction("sleep")}
          className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center space-x-3 shadow-md cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-105 transition-all">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">😴 Sleep</span>
            <span className="text-sm font-extrabold text-slate-100 mt-0.5">{sleepDuration} <span className="text-xs text-slate-500 font-bold">/ 8h</span></span>
          </div>
        </div>
      </div>

      {/* 5. Health Indexes BMI/BMR/TDEE Block */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4.5 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Body Health Indexes</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/95 border border-slate-800/40 p-3 rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">BMI Index</span>
            <span className="text-md font-black text-slate-200 mt-0.5 block">{bmi}</span>
            <span className="text-[8px] font-bold text-emerald-400 mt-0.5 block uppercase">{getBmiCategory(bmi)}</span>
          </div>

          <div className="bg-slate-900/95 border border-slate-800/40 p-3 rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">BMR Target</span>
            <span className="text-md font-black text-slate-200 mt-0.5 block">{(Math.round(10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5))}</span>
            <span className="text-[8px] font-bold text-slate-500 mt-0.5 block uppercase">kcal / day</span>
          </div>

          <div className="bg-slate-900/95 border border-slate-800/40 p-3 rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Active TDEE</span>
            <span className="text-md font-black text-slate-200 mt-0.5 block">{Math.round(profile.dailyCalorieTarget * 1.2)}</span>
            <span className="text-[8px] font-bold text-slate-500 mt-0.5 block uppercase">kcal / burn</span>
          </div>
        </div>
      </div>

      {/* 6. Today's Meals Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center select-none">
          <h3 className="text-sm font-extrabold tracking-wider text-slate-200">Today's Meals</h3>
          <button 
            onClick={() => onNavigateToTab("food")}
            className="text-emerald-400 text-xs font-bold flex items-center hover:underline"
          >
            Detailed Diary <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {(["Breakfast", "Lunch", "Evening Snack", "Dinner"] as const).map((meal) => (
            <div 
              key={meal}
              onClick={() => onNavigateToTab("food")}
              className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-100">{meal}</span>
                <p className="text-[11px] text-slate-400 truncate max-w-[210px]">
                  {getMealSummary(meal)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">{getMealCalories(meal)}</span>
                <Plus className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
