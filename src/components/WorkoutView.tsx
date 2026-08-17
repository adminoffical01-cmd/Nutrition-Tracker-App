import React, { useState, useEffect } from "react";
import { UserProfile, WorkoutPlan, Exercise } from "../types";
import { 
  Sparkles, 
  Dumbbell, 
  Play, 
  Check, 
  Clock, 
  RefreshCw, 
  Plus, 
  Timer,
  AlertCircle,
  HelpCircle,
  Award
} from "lucide-react";

interface WorkoutViewProps {
  profile: UserProfile;
  onSaveWorkout: (workout: WorkoutPlan) => void;
  workoutPlans: WorkoutPlan[];
  selectedDate: string;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  profile,
  onSaveWorkout,
  workoutPlans,
  selectedDate
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);

  // Configuration for AI Workout Generation
  const [goal, setGoal] = useState<string>("Strength");
  const [fitnessLevel, setFitnessLevel] = useState<string>("Intermediate");
  const [equipment, setEquipment] = useState<string>("None / Bodyweight");
  const [location, setLocation] = useState<string>("Home");
  const [duration, setDuration] = useState<number>(45);

  // Live workout timer state
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(45); // Rest period timer defaults to 45s
  const [completedExercises, setCompletedExercises] = useState<Record<number, boolean>>({});

  // Active overall session stopwatch timer state
  const [workoutTimerActive, setWorkoutTimerActive] = useState<boolean>(false);
  const [workoutTimeElapsed, setWorkoutTimeElapsed] = useState<number>(0);
  const [restAlert, setRestAlert] = useState<boolean>(false);

  // Rest Timer hook
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      setTimeLeft(45);
      // Trigger a beautiful in-app transient notice instead of blocking window.alert
      setRestAlert(true);
      setTimeout(() => {
        setRestAlert(false);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Session stopwatch hook
  useEffect(() => {
    let interval: any = null;
    if (workoutTimerActive) {
      interval = setInterval(() => {
        setWorkoutTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workoutTimerActive]);

  // Load existing workout plan for the day, or load default template
  useEffect(() => {
    const todayPlan = workoutPlans.find(p => p.date === selectedDate);
    if (todayPlan) {
      setActivePlan(todayPlan);
      // Initialize exercise completion states
      const comps: Record<number, boolean> = {};
      todayPlan.exercises.forEach((_, idx) => {
        comps[idx] = false;
      });
      setCompletedExercises(comps);
    } else {
      generateDefaultWorkout();
    }
  }, [workoutPlans, selectedDate]);

  const generateDefaultWorkout = () => {
    const isStrength = goal === "Strength";
    const defaults: WorkoutPlan = {
      id: `workout_${Date.now()}`,
      userId: profile.email,
      date: selectedDate,
      name: isStrength ? "Full Body Bodyweight Strength" : "Indian Cardio & Core Burn",
      type: isStrength ? "Strength" : "HIIT",
      durationMinutes: duration,
      completed: false,
      timestamp: Date.now(),
      exercises: [
        { 
          name: "Jumping Jacks & Shoulder Rotations", 
          sets: 2, 
          durationSeconds: 120, 
          restSeconds: 30, 
          instructions: "Perform warm-up jump movements to elevate heart rate and prepare joints." 
        },
        { 
          name: "Deep Hindu Squats (Uthak Baithak)", 
          sets: 3, 
          reps: 15, 
          restSeconds: 45, 
          instructions: "Keep arms extended in front of you. Sit deep into the squat, pushing weight into heels." 
        },
        { 
          name: "Classic Push-ups (Dand)", 
          sets: 3, 
          reps: 12, 
          restSeconds: 45, 
          instructions: "Squeeze shoulder blades, lower chest with control, push up firmly engaging chest." 
        },
        { 
          name: "Reverse Lunges (Baithaks)", 
          sets: 3, 
          reps: 12, 
          restSeconds: 45, 
          instructions: "Step back keeping torso upright. Lower rear knee to 1 inch above floor." 
        },
        { 
          name: "Plank Hold with Core Squeeze", 
          sets: 3, 
          durationSeconds: 45, 
          restSeconds: 30, 
          instructions: "Rest on forearms, contract abs, glutes, and quadriceps. Keep body straight as a board." 
        }
      ]
    };
    setActivePlan(defaults);
  };

  const handleGenerateAIWorkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          fitnessLevel,
          availableEquipment: equipment,
          workoutLocation: location,
          daysPerWeek: 4,
          durationMinutes: duration
        })
      });

      if (!response.ok) {
        throw new Error("Failed to consult physical trainer server.");
      }

      const data = await response.json();
      if (data && data.exercises && data.exercises.length > 0) {
        const fullPlan: WorkoutPlan = {
          id: `workout_${Date.now()}`,
          userId: profile.email,
          date: selectedDate,
          name: data.name || `${goal} ${location} Workout`,
          type: data.type || "Strength",
          durationMinutes: data.durationMinutes || duration,
          completed: false,
          timestamp: Date.now(),
          exercises: data.exercises
        };
        setActivePlan(fullPlan);
        onSaveWorkout(fullPlan);
      } else {
        throw new Error("AI returned incorrect workout structures.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to contact AI Coach. Loading home-friendly fallback workout.");
      generateDefaultWorkout();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExercise = (index: number) => {
    setCompletedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startRestTimer = (seconds: number) => {
    setTimeLeft(seconds || 45);
    setTimerActive(true);
  };

  const handleCompleteWorkout = () => {
    if (!activePlan) return;
    const completedPlan: WorkoutPlan = {
      ...activePlan,
      completed: true,
      timestamp: Date.now()
    };
    setActivePlan(completedPlan);
    onSaveWorkout(completedPlan);
    alert("🏆 Outstanding effort! Workout completed. Logged to your fitness record.");
  };

  return (
    <div className="space-y-6 pb-24 text-white animate-fade-in px-1">
      {/* 1. Header */}
      <div>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Workout Scheduler</span>
        <h1 className="text-2xl font-black text-slate-100 mt-0.5 flex items-center gap-1.5">
          <Dumbbell className="w-6 h-6 text-emerald-400" />
          AI Workout Coach
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Setup Configurator panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2.5xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">Configure Session</span>
          <span className="text-xs text-slate-400 font-bold">{duration} min target</span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Training Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {["Strength", "Cardio", "HIIT", "Yoga", "Mobility"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Fitness Level</label>
            <select
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {["Beginner", "Intermediate", "Advanced"].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Equipment</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {["None / Bodyweight", "Basic Dumbbells", "Full Gym", "Kettlebells / Bands"].map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {["Home", "Gym", "Outdoor Parks"].map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateAIWorkout}
          disabled={loading}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-black rounded-xl text-xs active:scale-95 transition-all shadow-md uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>Generating Core Regimen...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Generate Custom AI Workout</span>
            </>
          )}
        </button>
      </div>

      {restAlert && (
        <div className="p-3.5 bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-2 shadow-lg shadow-emerald-500/20 animate-fade-in fixed top-4 left-4 right-4 z-50 border border-emerald-300">
          <Award className="w-5 h-5 shrink-0 animate-bounce text-slate-950" />
          <span>Rest interval over! Grab your equipment for the next sets! 🔥</span>
        </div>
      )}

      {/* 3. ACTIVE WORKOUT SESSION BLOCK */}
      {activePlan && (
        <div className="space-y-5 animate-fade-in">
          {/* Active Workout Info header card */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Today's Protocol</span>
              <h3 className="text-sm font-black text-slate-200">{activePlan.name}</h3>
              <span className="text-[10px] text-slate-500 font-medium">{activePlan.type} • {activePlan.durationMinutes} minutes</span>
            </div>
            {activePlan.completed ? (
              <div className="bg-emerald-500/15 border border-emerald-500/10 p-2 text-emerald-400 font-black text-[10px] rounded-lg flex items-center gap-1.5 uppercase">
                <Award className="w-3.5 h-3.5" /> Checked Complete
              </div>
            ) : (
              <button 
                onClick={handleCompleteWorkout}
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl active:scale-95 transition-all"
              >
                Complete Workout
              </button>
            )}
          </div>

          {/* Real-time Session Stopwatch Tracker */}
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2.5xl space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">⏱ Live Workout Duration Timer</span>
              {workoutTimeElapsed > 0 && (
                <button
                  onClick={() => {
                    setWorkoutTimerActive(false);
                    setWorkoutTimeElapsed(0);
                  }}
                  className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-widest"
                >
                  Reset Time
                </button>
              )}
            </div>

            <div className={`flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border transition-all duration-1000 ${
              workoutTimerActive 
                ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.01]" 
                : "border-slate-900 shadow-none"
            }`}>
              <div className="flex flex-col">
                <span className={`text-3xl font-black tracking-tight font-mono transition-colors duration-500 ${
                  workoutTimerActive ? "text-emerald-400" : "text-slate-100"
                }`}>
                  {(() => {
                    const h = Math.floor(workoutTimeElapsed / 3600);
                    const m = Math.floor((workoutTimeElapsed % 3600) / 60);
                    const s = workoutTimeElapsed % 60;
                    return [
                      h > 0 ? String(h).padStart(2, "0") : null,
                      String(m).padStart(2, "0"),
                      String(s).padStart(2, "0")
                    ].filter(Boolean).join(":");
                  })()}
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 min-h-[14px]">
                  {workoutTimerActive ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-400 font-extrabold animate-pulse">Session Active</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                      <span>Session Paused / Idle</span>
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={() => setWorkoutTimerActive(!workoutTimerActive)}
                className={`py-3 px-5 text-xs font-black rounded-xl active:scale-95 transition-all flex items-center space-x-1.5 uppercase tracking-wider ${
                  workoutTimerActive 
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-950" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                }`}
              >
                {workoutTimerActive ? (
                  <>
                    <Clock className="w-3.5 h-3.5 stroke-[2.5] animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Pause Workout</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Workout Timer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rest Timer Widget */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-slate-800/60 rounded-2.5xl flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl animate-pulse">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Inter-Set Rest Timer</span>
                <span className="text-md font-extrabold text-slate-100">{timeLeft} <span className="text-xs text-slate-500 font-bold">seconds left</span></span>
              </div>
            </div>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`py-2 px-3 text-xs font-bold rounded-xl active:scale-95 transition-all ${
                timerActive 
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-500" 
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-600"
              }`}
            >
              {timerActive ? "Pause Rest" : "Start Rest (45s)"}
            </button>
          </div>

          {/* Exercise Timeline Checklist */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider pl-1 select-none">Exercise List</h3>
            {activePlan.exercises.map((ex, exIdx) => {
              const isComp = completedExercises[exIdx];
              return (
                <div 
                  key={exIdx}
                  className={`p-4 bg-slate-900/40 border transition-all rounded-2xl space-y-2.5 ${
                    isComp 
                      ? "border-emerald-500/20 bg-slate-950/30 opacity-60" 
                      : "border-slate-800/80 hover:border-slate-850"
                  }`}
                >
                  {/* Top exercise title row */}
                  <div className="flex items-start justify-between">
                    <div 
                      onClick={() => handleToggleExercise(exIdx)}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        isComp 
                          ? "bg-emerald-500 border-emerald-500 text-slate-950" 
                          : "border-slate-500 text-transparent"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                      <span className={`text-xs font-extrabold text-slate-100 ${isComp ? "line-through text-slate-500 font-bold" : ""}`}>
                        {ex.name}
                      </span>
                    </div>

                    <div className="flex space-x-2 shrink-0">
                      {ex.reps && ex.reps > 0 ? (
                        <span className="text-[10px] bg-slate-950 text-slate-400 font-black px-2.5 py-1 rounded-md uppercase border border-slate-800">
                          {ex.sets} Sets x {ex.reps} Reps
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-950 text-slate-400 font-black px-2.5 py-1 rounded-md uppercase border border-slate-800">
                          {ex.sets} Sets x {ex.durationSeconds ? Math.round(ex.durationSeconds / 60) : 1} Min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub instructions */}
                  <p className="text-xs text-slate-400 leading-relaxed font-medium pl-8">
                    {ex.instructions}
                  </p>

                  {/* Rest trigger tag */}
                  <div className="pl-8 pt-1 flex items-center space-x-2">
                    <span className="text-[10px] text-slate-500 font-bold">Rest time: {ex.restSeconds} seconds</span>
                    <button
                      onClick={() => startRestTimer(ex.restSeconds)}
                      className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Clock className="w-3 h-3" /> Start rest timer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
