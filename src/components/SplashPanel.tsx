import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { Sparkles, Trophy, Target, Heart, Check } from "lucide-react";

interface SplashPanelProps {
  onCompleteOnboarding: (profile: UserProfile) => void;
  initialEmail: string;
}

export const SplashPanel: React.FC<SplashPanelProps> = ({ onCompleteOnboarding, initialEmail }) => {
  const [phase, setPhase] = useState<"splash" | "welcome" | "onboarding">("splash");
  const [step, setStep] = useState<number>(1);

  // Form states for profile setup
  const [name, setName] = useState<string>("Gopinath");
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [targetWeight, setTargetWeight] = useState<number>(68);
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>('Moderately Active');
  const [goal, setGoal] = useState<UserProfile['goal']>('Weight Loss');
  const [dietPreference, setDietPreference] = useState<UserProfile['dietPreference']>('Vegetarian');
  const [cuisinePreference, setCuisinePreference] = useState<UserProfile['cuisinePreference']>('Tamil');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("welcome");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const calculateTargets = () => {
    // 1. BMI
    const heightInMeters = height / 100;
    const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

    // 2. BMR (Mifflin-St Jeor)
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (gender === "Male") {
      bmr += 5;
    } else if (gender === "Female") {
      bmr -= 161;
    } else {
      bmr -= 80;
    }
    bmr = Math.round(bmr);

    // 3. TDEE
    const activityMultipliers = {
      'Sedentary': 1.2,
      'Lightly Active': 1.375,
      'Moderately Active': 1.55,
      'Very Active': 1.725,
      'Athlete': 1.9
    };
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);

    // 4. Goal Adjustment
    let dailyCalorieTarget = tdee;
    if (goal === "Weight Loss") dailyCalorieTarget -= 500;
    else if (goal === "Weight Gain") dailyCalorieTarget += 400;
    else if (goal === "Muscle Gain") dailyCalorieTarget += 300;
    else if (goal === "Fat Loss") dailyCalorieTarget -= 400;
    else if (goal === "Six-Pack") dailyCalorieTarget -= 550;

    dailyCalorieTarget = Math.max(1200, dailyCalorieTarget);

    // 5. Macros
    let proteinGrams = 1.6 * weight; // default
    if (goal === "Muscle Gain" || goal === "Six-Pack") {
      proteinGrams = 2.0 * weight;
    }
    proteinGrams = Math.round(proteinGrams);

    const fatCalories = dailyCalorieTarget * 0.25;
    const fatGrams = Math.round(fatCalories / 9);

    const proteinCalories = proteinGrams * 4;
    const carbCalories = dailyCalorieTarget - proteinCalories - fatCalories;
    const carbGrams = Math.round(Math.max(50, carbCalories / 4));

    const fiberGrams = Math.round(dailyCalorieTarget / 100 * 1.5); // ~15g per 1000 calories

    return {
      dailyCalorieTarget,
      macroTargets: {
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams,
        fiber: fiberGrams
      }
    };
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      const targets = calculateTargets();
      const profile: UserProfile = {
        name: name || "User",
        email: initialEmail,
        age,
        gender,
        height,
        weight,
        targetWeight,
        activityLevel,
        goal,
        dietPreference,
        cuisinePreference,
        dailyCalorieTarget: targets.dailyCalorieTarget,
        macroTargets: targets.macroTargets,
        streakDays: 1
      };
      onCompleteOnboarding(profile);
    }
  };

  // --- SPLASH RENDER ---
  if (phase === "splash") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-6 select-none relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Animated Circle Container */}
        <div className="relative mb-6 animate-pulse">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 flex items-center justify-center animate-spin duration-1000"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-emerald-400 animate-bounce" />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          NutriFit <span className="text-white">AI</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 text-center font-medium max-w-xs">
          Your AI Coach for a Healthier You
        </p>
        
        <div className="absolute bottom-12 w-32 bg-slate-800 h-1 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[loading_2.5s_ease-out_forwards]"></div>
        </div>
      </div>
    );
  }

  // --- WELCOME RENDER ---
  if (phase === "welcome") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-white px-6 py-12 select-none relative">
        <div className="absolute top-10 right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col items-center text-center mt-12">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black text-white leading-tight">
            Welcome to <br />
            <span className="text-emerald-400 font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">NutriFit AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-4 px-4 leading-relaxed">
            Revolutionizing physical health, personalized Indian diet composition, and fitness coaching with real-time AI.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-3 my-8">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">AI Food Recognition</h3>
              <p className="text-xs text-slate-400 mt-1">Snap breakfast, lunch or dinner. Get instant calorie and macro estimates.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-0.5">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Indian Food Optimization</h3>
              <p className="text-xs text-slate-400 mt-1">Dosa, Roti, Sambar, Paneer or Biryani. Tailored calculations for our meals.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setPhase("onboarding")}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-center text-sm tracking-wider"
        >
          GET STARTED
        </button>
      </div>
    );
  }

  // --- ONBOARDING FORM STEPS (1-4) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between px-6 py-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">Step {step} of 4</span>
          <span className="text-slate-500 text-xs font-bold">{Math.round((step / 4) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300" 
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Step Body */}
      <div className="my-auto py-6">
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full mx-auto flex items-center justify-center mb-3">
                <Heart className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold">Complete Your Profile</h2>
              <p className="text-xs text-slate-400 mt-1">Help us know your body metrics</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
                  placeholder="Enter your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">What is Your Goal?</h2>
              <p className="text-xs text-slate-400 mt-1">Select your primary fitness target</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['Weight Loss', 'Weight Gain', 'Muscle Gain', 'Fat Loss', 'Six-Pack', 'Maintain Weight'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`p-4 rounded-xl text-xs font-bold border transition-all text-center ${
                    goal === g 
                      ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10" 
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Target Weight (kg)</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm p-3.5 rounded-xl outline-none"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Your Activity Level</h2>
              <p className="text-xs text-slate-400 mt-1">Select how active you are daily</p>
            </div>

            <div className="space-y-3">
              {[
                { name: "Sedentary", desc: "Little or no exercise (Desk job)" },
                { name: "Lightly Active", desc: "Light exercise 1-3 days/week" },
                { name: "Moderately Active", desc: "Moderate exercise 3-5 days/week" },
                { name: "Very Active", desc: "Hard exercise 6-7 days/week" },
                { name: "Athlete", desc: "Professional physical training daily" }
              ].map((act) => (
                <button
                  key={act.name}
                  onClick={() => setActivityLevel(act.name as any)}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${
                    activityLevel === act.name 
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow" 
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm">{act.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{act.desc}</p>
                  </div>
                  {activityLevel === act.name && <Check className="w-5 h-5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Indian Food Preferences</h2>
              <p className="text-xs text-slate-400 mt-1">Personalize your AI planner suggestions</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Diet preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggitarian', 'Jain'] as const).map((diet) => (
                    <button
                      key={diet}
                      onClick={() => setDietPreference(diet)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center ${
                        dietPreference === diet
                          ? "bg-emerald-500 text-slate-950 border-emerald-500"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Regional Cuisine</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['South Indian', 'North Indian', 'Tamil', 'Kerala', 'Andhra', 'Bengali', 'Gujarati', 'Maharashtrian'] as const).map((cuis) => (
                    <button
                      key={cuis}
                      onClick={() => setCuisinePreference(cuis)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center ${
                        cuisinePreference === cuis
                          ? "bg-emerald-500 text-slate-950 border-emerald-500"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      {cuis}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="flex space-x-3 mt-4">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-800 transition-all text-sm uppercase tracking-wider"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 active:scale-95 text-center"
        >
          {step === 4 ? "Complete" : "Next"}
        </button>
      </div>
    </div>
  );
};
