import React, { useMemo } from "react";
import { UserProfile, FoodLog } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, Flame, AlertCircle } from "lucide-react";

interface WeeklyProgressReportProps {
  profile: UserProfile;
  userId: string;
}

export const WeeklyProgressReport: React.FC<WeeklyProgressReportProps> = ({ profile, userId }) => {
  // Retrieve all historical logs from local storage for offline-first speed and reliability
  const allLogs = useMemo(() => {
    try {
      const item = localStorage.getItem(`foodLogs_${userId}`);
      return item ? (JSON.parse(item) as FoodLog[]) : [];
    } catch (e) {
      console.error("Failed to parse historical logs", e);
      return [];
    }
  }, [userId]);

  // Construct dataset for the last 7 calendar days
  const weeklyChartData = useMemo(() => {
    const dataPoints = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      
      // Calculate total calories consumed on this specific date
      const daysLogs = allLogs.filter((log) => log.date === dateString);
      const dailyCalories = daysLogs.reduce((sum, log) => sum + log.totalCalories, 0);
      
      const dayName = d.toLocaleDateString([], { weekday: "short" });
      dataPoints.push({
        dayName,
        date: dateString,
        Calories: dailyCalories,
        Target: profile.dailyCalorieTarget,
      });
    }
    return dataPoints;
  }, [allLogs, profile.dailyCalorieTarget]);

  // Calculate high-level stats for weekly progress analysis
  const stats = useMemo(() => {
    const totalWeeklyCals = weeklyChartData.reduce((sum, d) => sum + d.Calories, 0);
    const averageCals = Math.round(totalWeeklyCals / 7);
    const targetWeekly = profile.dailyCalorieTarget * 7;
    const daysWithinTarget = weeklyChartData.filter(d => d.Calories > 0 && d.Calories <= profile.dailyCalorieTarget).length;
    
    return {
      totalWeeklyCals,
      averageCals,
      targetWeekly,
      daysWithinTarget,
    };
  }, [weeklyChartData, profile.dailyCalorieTarget]);

  // Custom tooltips matching the dashboard design language
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const difference = data.Calories - data.Target;
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-2xl space-y-1.5 select-none">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{data.dayName} ({data.date})</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm font-black text-slate-100">{data.Calories.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">kcal</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[9px] text-slate-500">Target:</span>
            <span className="text-[9px] text-slate-400 font-bold">{data.Target} kcal</span>
          </div>
          {data.Calories > 0 && (
            <div className="pt-1 mt-1 border-t border-slate-800/80">
              <span className={`text-[9px] font-black uppercase tracking-wider ${difference <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {difference <= 0 ? "Within Target Budget" : `Over by ${difference} kcal`}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Chart Section Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2.5xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Weekly Progress Chart</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Interactive calorie trend vs. targets</p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
            Daily Budget: {profile.dailyCalorieTarget} kcal
          </span>
        </div>

        {/* Recharts Area Chart Container */}
        <div className="w-full h-56 bg-slate-950/60 rounded-2xl p-2 border border-slate-900 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyChartData} margin={{ top: 15, right: 10, left: -22, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="dayName" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={6}
                fontFamily="inherit"
                fontWeight="bold"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dx={-4}
                fontFamily="inherit"
                fontWeight="bold"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
              <ReferenceLine 
                y={profile.dailyCalorieTarget} 
                stroke="#e2e8f0" 
                strokeDasharray="4 4" 
                opacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="Calories" 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorCalories)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Insights Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Weekly Avg Intake</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-black text-slate-100">{stats.averageCals.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400">kcal / day</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Target Achievement</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-black text-emerald-400">{stats.daysWithinTarget} / 7</span>
              <span className="text-[10px] text-slate-400">days under budget</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Recommendation Block */}
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2.5xl flex items-start space-x-3.5 shadow-md">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
          <TrendingUp className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Weekly Analytics Overview</span>
          <p className="text-xs text-slate-300 leading-relaxed mt-1">
            Your total weekly calorie intake is <strong className="text-slate-100 font-bold">{stats.totalWeeklyCals.toLocaleString()} kcal</strong> relative to your weekly threshold target limit of <strong className="text-slate-100 font-bold">{stats.targetWeekly.toLocaleString()} kcal</strong>. Maintain your focus on high-protein sources to optimize body composition!
          </p>
        </div>
      </div>
    </div>
  );
};
