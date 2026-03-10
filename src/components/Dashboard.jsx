import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Brain,
  Utensils,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar as CalendarIcon,
  User,
  Bell,
  CheckCircle2,
  Play,
  Pause,
  Dumbbell,
  Timer,
  Scale,
  X,
  FileText,
  Coffee,
  Wine,
  Cookie,
  Droplets,
  Flower2,
  Flame,
  Snowflake,
  MessageSquare,
  Send,
  PieChart,
  BarChart2,
  LineChart,
  ArrowLeft,
  Search,
  Trophy,
  Filter,
  LogOut,
  Clock,
  Target,
  Bike,
  Footprints,
  Waves,
  Gauge,
  Mountain,
  Award
} from 'lucide-react';
import { getUserProfile, getAllWorkoutHistory, enrichWorkoutsWithPerformance, enrichStrengthDetails, calculateMetrics, searchUsers, getUserGoals, getUserTargets, setUserGoal as updateUserGoalStorage, setUserTargets as updateUserTargetsStorage, AVAILABLE_GOALS, calculateWeeklyProgress, calculateWeeklyHistory, filterWorkoutsByCategory, filterWorkoutsByPeriod, calculateTimeByDiscipline, calculateTrainingLoad, calculateActiveDaysCalendar, calculateCaloriesInPeriod, calculateHRZoneBalance, calculateCardioFocus, calculateStreaks, aggregateWorkoutsForChart, aggregateAvgMetricForChart, deriveMaxHR, deriveHRZones, CARDIO_SUBDISCIPLINES, filterWorkoutsBySubDiscipline, calculateDistance, calculateAvgPaceSpeed, calculateAvgOutput, calculatePersonalRecords, estimateCriticalPace, calculateInclineStats, calculateElevationGain, estimateFTP, calculateCadenceStats, calculateResistanceStats, calculatePowerRatio, estimateRowingFTP, calculateStrokeStats, calculateAvgStrokeOutput, calculatePaceSplitByDiscipline, calculateStrengthMetrics, estimateMovement10RM } from '../services/pelotonAPI';
import { getPeloHubBioData } from '../services/fitFeedAPI';

// --- UI Primitives (Liquid Glass Style) ---

const GlassCard = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 ring-1 ring-white/5 transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-gray-800/40 hover:scale-[1.01]' : ''} ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ children, color = "bg-white/10 text-white" }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${color}`}>
    {children}
  </span>
);

const TrendIcon = ({ trend }) => {
  if (trend === 'up') return <TrendingUp size={14} className="text-green-400" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
};

// --- IQ Components ---

const IQChatModal = ({ isOpen, onClose, context }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900/90 border border-white/10 rounded-3xl w-full max-w-md h-[500px] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300">
                <Brain size={16} />
             </div>
             <span className="font-bold text-white">IQ Assistant</span>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">IQ</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none p-3 text-sm text-gray-200">
                    {context || "How can I help you optimize your training today?"}
                </div>
            </div>
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">IQ</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none p-3 text-sm text-gray-200">
                   Based on your recent data, your recovery is excellent. Keep pushing towards those output targets!
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-white/10">
            <div className="relative">
                <input type="text" placeholder="Ask IQ..." className="w-full bg-black/30 border border-white/10 rounded-full py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                <button className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 rounded-full text-white"><Send size={14} /></button>
            </div>
        </div>
      </div>
    </div>
  );
};

const IQInsight = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
        <IQChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} context={text} />
        <button
            onClick={() => setIsOpen(true)}
            className="w-full text-left bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-4 border border-indigo-500/20 mb-4 flex items-start gap-3 hover:bg-indigo-900/40 transition-colors group"
        >
            <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-300 mt-0.5 group-hover:scale-110 transition-transform">
                <Brain size={16} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-indigo-100 font-medium leading-relaxed">{text}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0 duration-300">
                    Chat with IQ <MessageSquare size={10} />
                </div>
            </div>
        </button>
    </>
  );
};

// --- Check-in Modal ---

const CheckInModal = ({ isOpen, onClose }) => {
  const [factors, setFactors] = useState([]);
  const toggleFactor = (f) => setFactors(prev => prev.includes(f) ? prev.filter(i => i !== f) : [...prev, f]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/90 border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold text-lg">Daily Check-in</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="space-y-6">
           <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Log Weight</label>
            <div className="relative">
                <input
                    type="number"
                    placeholder="189.2"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">lbs</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Lifestyle Factors</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'sugar', label: 'Sugar', icon: Cookie },
                { id: 'alcohol', label: 'Alcohol', icon: Wine },
                { id: 'caffeine', label: 'Caffeine', icon: Coffee },
                { id: 'late_meal', label: 'Late Meal', icon: Utensils },
                { id: 'hydration', label: 'Hydration', icon: Droplets },
                { id: 'meditation', label: 'Meditate', icon: Flower2 },
                { id: 'sauna', label: 'Sauna', icon: Flame },
                { id: 'cold', label: 'Plunge', icon: Snowflake },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleFactor(item.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all aspect-square ${factors.includes(item.id) ? 'bg-blue-500/20 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  <item.icon size={18} />
                  <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Notes</label>
            <textarea
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 min-h-[80px]"
              placeholder="How are you feeling today?"
            />
          </div>

          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
            Log Check-in
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Target History Modal ---
const TargetHistoryModal = ({ isOpen, onClose, weeklyHistory, weeklyTargets }) => {
  const [selectedTarget, setSelectedTarget] = useState('activeDays');
  const [viewOffset, setViewOffset] = useState(0); // 0 = most recent 12 weeks
  const weeksPerView = 12;

  if (!isOpen) return null;

  const targets = {
    activeDays: {
      name: 'Active Days',
      target: weeklyTargets?.active_days || 5,
      color: 'bg-green-500',
      unit: 'days',
      icon: CalendarIcon,
    },
    activeTime: {
      name: 'Active Time',
      target: weeklyTargets?.active_time || 150,
      color: 'bg-blue-500',
      unit: 'mins',
      icon: Timer,
    },
    totalWorkouts: {
      name: 'Workouts',
      target: weeklyTargets?.total_workouts || 5,
      color: 'bg-orange-500',
      unit: 'workouts',
      icon: Activity,
    },
  };

  const currentTarget = targets[selectedTarget];
  const TargetIcon = currentTarget.icon;

  // Get the data slice for current view
  const startIdx = Math.max(0, weeklyHistory.length - weeksPerView - viewOffset);
  const endIdx = weeklyHistory.length - viewOffset;
  const visibleWeeks = weeklyHistory.slice(startIdx, endIdx);

  // Calculate insights
  const weeksHitTarget = weeklyHistory.filter(
    week => week[selectedTarget] >= currentTarget.target
  ).length;
  const successRate = weeklyHistory.length > 0
    ? Math.round((weeksHitTarget / weeklyHistory.length) * 100)
    : 0;

  const canGoBack = viewOffset < weeklyHistory.length - weeksPerView;
  const canGoForward = viewOffset > 0;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft size={20} /> Back
        </button>
        <h3 className="text-white font-bold text-lg">Target Completion History</h3>
        <div className="w-16"></div>
      </div>

      {/* Target Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-black/40 p-1 rounded-lg backdrop-blur-md border border-white/10 flex gap-1">
          {Object.entries(targets).map(([key, target]) => (
            <button
              key={key}
              onClick={() => setSelectedTarget(key)}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                selectedTarget === key
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <target.icon size={14} />
              {target.name}
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-4 border border-indigo-500/20 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-300">
            <Brain size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-indigo-100 font-medium leading-relaxed">
              You've hit your {currentTarget.name.toLowerCase()} target in <span className="font-bold">{weeksHitTarget} of {weeklyHistory.length} weeks</span> ({successRate}%).
              {successRate >= 75 ? " Excellent consistency!" : successRate >= 50 ? " Keep building that streak!" : " Let's work on improving this!"}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="w-full h-full flex flex-col">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setViewOffset(viewOffset + weeksPerView)}
              disabled={!canGoBack}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <div className="text-sm text-gray-400">
              {visibleWeeks.length > 0 && (
                <>
                  {visibleWeeks[0].weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                  {visibleWeeks[visibleWeeks.length - 1].weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </>
              )}
            </div>
            <button
              onClick={() => setViewOffset(Math.max(0, viewOffset - weeksPerView))}
              disabled={!canGoForward}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>

          {/* Bar Chart */}
          <div className="flex-1 flex items-end justify-between gap-2 px-4">
            {visibleWeeks.map((week, i) => {
              const value = week[selectedTarget];
              const percentage = Math.min((value / currentTarget.target) * 100, 100);
              const isComplete = value >= currentTarget.target;

              return (
                <div key={i} className="flex-1 h-full flex flex-col justify-end gap-2 group">
                  <div
                    className={`w-full rounded-t-lg relative transition-all ${
                      isComplete ? currentTarget.color : 'bg-gray-700'
                    } hover:opacity-80 shadow-[0_0_15px_rgba(59,130,246,0.3)]`}
                    style={{ height: `${Math.max(percentage, 5)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-2 py-1 rounded">
                      {value} {currentTarget.unit}
                      {isComplete && ' ✓'}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-gray-500 block">
                      {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target Line */}
          <div className="relative mt-4 border-t border-white/10 pt-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Target: {currentTarget.target} {currentTarget.unit}</span>
              <span className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${currentTarget.color}`}></div>
                Hit target
                <div className="w-3 h-3 rounded bg-gray-700 ml-2"></div>
                Missed target
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Intention Components ---

const TrackingRing = ({ label, percentage, color, icon: Icon, valueText }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90">
          <circle cx="50%" cy="50%" r="45%" className="stroke-white/10" strokeWidth="4" fill="none" />
          {percentage !== null && (
          <circle
            cx="50%" cy="50%" r="45%"
            className={`drop-shadow-sm ${color}`}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray="283"
            strokeDashoffset={283 - (Math.min(percentage, 100) / 100) * 283}
            strokeLinecap="round"
          />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-white/90">
           <Icon size={18} />
        </div>
      </div>
      <div className="text-center w-full">
         {percentage !== null && <span className="text-sm font-bold text-white block">{percentage}%</span>}
         <span className="text-[9px] text-gray-400 uppercase tracking-wide font-medium block leading-tight min-h-[2.5em] flex items-center justify-center">{label}</span>
         {valueText && <span className="text-[10px] text-gray-500 block mt-0.5">{valueText}</span>}
      </div>
    </div>
);

const IntentionHero = ({ workoutData, weeklyProgress, userGoal, weeklyTargets, weeklyHistory, availableGoals, onGoalChange, onTargetsChange }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [showWeeklyTargets, setShowWeeklyTargets] = useState(true);
  const [showTargetHistory, setShowTargetHistory] = useState(false);
  const [status, setStatus] = useState('Active');
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [changingGoal, setChangingGoal] = useState(false);
  const [showTargetEditor, setShowTargetEditor] = useState(false);
  const [editDays, setEditDays] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editWorkouts, setEditWorkouts] = useState('');
  const goalPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (goalPickerRef.current && !goalPickerRef.current.contains(event.target)) {
        setShowGoalPicker(false);
      }
    };
    if (showGoalPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGoalPicker]);

  // Goal mapping - icons and colors for known goal types
  const goalMap = {
    'weight_loss': { name: 'Support Weight Goals', icon: Scale, color: 'orange' },
    'build_strength': { name: 'Build Strength', icon: Dumbbell, color: 'orange' },
    'boost_cardio': { name: 'Boost Cardio Fitness', icon: Heart, color: 'blue' },
    'promote_longevity': { name: 'Promote Longevity', icon: Activity, color: 'green' },
  };

  // Get current goal
  const currentGoal = userGoal?.current_goal || null;
  const goalInfo = currentGoal ? goalMap[currentGoal] : null;
  const goalName = goalInfo?.name || (currentGoal ? currentGoal.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Set a Goal');
  const GoalIcon = goalInfo?.icon || Activity;

  const handleGoalChange = async (goalId) => {
    if (changingGoal || !onGoalChange) return;
    setChangingGoal(true);
    try {
      await onGoalChange(goalId);
      setShowGoalPicker(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
    } finally {
      setChangingGoal(false);
    }
  };

  // Current week values
  const activeDaysCurrent = weeklyProgress?.activeDays || 0;
  const activeTimeCurrent = weeklyProgress?.activeTime || 0;
  const workoutsCurrent = weeklyProgress?.totalWorkouts || 0;

  // Targets (null if user hasn't set any)
  const hasTargets = weeklyTargets != null;
  const activeDaysTarget = weeklyTargets?.active_days;
  const activeTimeTarget = weeklyTargets?.active_time;
  const workoutsTarget = weeklyTargets?.total_workouts;

  // Calculate percentages only if targets are set
  const activeDaysPercent = hasTargets && activeDaysTarget ? Math.min((activeDaysCurrent / activeDaysTarget) * 100, 100) : null;
  const activeTimePercent = hasTargets && activeTimeTarget ? Math.min((activeTimeCurrent / activeTimeTarget) * 100, 100) : null;
  const workoutsPercent = hasTargets && workoutsTarget ? Math.min((workoutsCurrent / workoutsTarget) * 100, 100) : null;

  // Overall progress - only calculated when targets exist
  const percentages = [activeDaysPercent, activeTimePercent, workoutsPercent].filter(p => p !== null);
  const progressPercentage = percentages.length > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null;

  return (
    <>
      <CheckInModal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} />
      <TargetHistoryModal
        isOpen={showTargetHistory}
        onClose={() => setShowTargetHistory(false)}
        weeklyHistory={weeklyHistory || []}
        weeklyTargets={weeklyTargets}
      />
      <GlassCard className="relative overflow-visible group">
        <div className="absolute top-0 right-0 p-48 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">

          <div className="flex-1 w-full">
            <div className="flex gap-6 items-center">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="56" className="stroke-white/10" strokeWidth="12" fill="none" />
                        {progressPercentage !== null && (
                        <circle
                        cx="64" cy="64" r="56"
                        className="stroke-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray="351.86"
                        strokeDashoffset={351.86 - (progressPercentage / 100) * 351.86}
                        strokeLinecap="round"
                        />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {progressPercentage !== null ? (
                          <>
                            <span className="text-3xl font-bold text-white">{Math.round(progressPercentage)}%</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Complete</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-white">{workoutsCurrent}</span>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {status !== 'Active' && <Badge color="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">{status}</Badge>}
                    </div>
                    <div className="relative" ref={goalPickerRef}>
                      <button
                        onClick={() => setShowGoalPicker(!showGoalPicker)}
                        className="flex items-center gap-2 group/goal"
                      >
                        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight group-hover/goal:text-blue-300 transition-colors">
                          {goalName}
                        </h1>
                        <ChevronDown
                          size={20}
                          className={`text-gray-400 transition-transform ${showGoalPicker ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <GoalIcon size={14} />
                        {!currentGoal ? (
                          <span className="text-gray-500 italic">Tap above to set your fitness goal</span>
                        ) : (
                          <span>Keep up the great work on your journey!</span>
                        )}
                      </div>
                      {showGoalPicker && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold px-3 py-2">
                              Choose a Fitness Goal
                            </p>
                            {(availableGoals || []).map((goal) => {
                              const goalData = goalMap[goal.id] || { icon: Activity, color: 'gray' };
                              const GoalOptionIcon = goalData.icon;
                              const isSelected = currentGoal === goal.id;
                              return (
                                <button
                                  key={goal.id}
                                  onClick={() => handleGoalChange(goal.id)}
                                  disabled={changingGoal}
                                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                                    isSelected
                                      ? 'bg-blue-500/20 text-white'
                                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                  } ${changingGoal ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <GoalOptionIcon size={16} className={isSelected ? 'text-blue-400' : 'text-gray-500'} />
                                  <span className="text-sm font-medium">{goal.name || goalData.name}</span>
                                  {isSelected && (
                                    <CheckCircle2 size={14} className="text-blue-400 ml-auto" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                        onClick={() => setShowWeeklyTargets(!showWeeklyTargets)}
                        className="text-xs font-medium text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-white/5"
                    >
                        {showWeeklyTargets ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {showWeeklyTargets ? "Hide Weekly Targets" : "Show Weekly Targets"}
                    </button>
                </div>
            </div>

            {showWeeklyTargets && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{hasTargets ? 'Weekly Targets' : 'This Week'}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditDays(activeDaysTarget || '');
                              setEditTime(activeTimeTarget || '');
                              setEditWorkouts(workoutsTarget || '');
                              setShowTargetEditor(!showTargetEditor);
                            }}
                            className="text-[10px] font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-white/10"
                          >
                            {hasTargets ? 'Edit Targets' : 'Set Targets'}
                          </button>
                          {hasTargets && (
                          <button
                              onClick={() => setShowTargetHistory(true)}
                              className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors bg-blue-500/10 px-2 py-1 rounded-md"
                          >
                              View history <ChevronRight size={10} />
                          </button>
                          )}
                        </div>
                    </div>
                    {showTargetEditor && (
                      <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10 animate-in fade-in duration-200">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Days/week</label>
                            <input type="number" min="1" max="7" value={editDays} onChange={e => setEditDays(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Minutes/week</label>
                            <input type="number" min="1" value={editTime} onChange={e => setEditTime(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Workouts/week</label>
                            <input type="number" min="1" value={editWorkouts} onChange={e => setEditWorkouts(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              const d = parseInt(editDays); const t = parseInt(editTime); const w = parseInt(editWorkouts);
                              if (d > 0 && t > 0 && w > 0) {
                                onTargetsChange({ active_days: d, active_time: t, total_workouts: w });
                                setShowTargetEditor(false);
                              }
                            }}
                            className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg transition-colors"
                          >Save</button>
                          <button onClick={() => setShowTargetEditor(false)}
                            className="text-xs font-semibold text-gray-400 hover:text-white px-4 py-1.5 rounded-lg transition-colors"
                          >Cancel</button>
                          {hasTargets && (
                            <button onClick={() => { onTargetsChange(null); setShowTargetEditor(false); }}
                              className="text-xs font-semibold text-red-400 hover:text-red-300 px-4 py-1.5 rounded-lg transition-colors ml-auto"
                            >Remove Targets</button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                        <TrackingRing
                            label="Active Days"
                            valueText={hasTargets ? `${activeDaysCurrent} of ${activeDaysTarget} days` : `${activeDaysCurrent} days`}
                            percentage={activeDaysPercent !== null ? Math.round(activeDaysPercent) : null}
                            color="text-green-500"
                            icon={CalendarIcon}
                        />
                        <TrackingRing
                            label="Active Time"
                            valueText={hasTargets ? `${activeTimeCurrent} of ${activeTimeTarget} mins` : `${activeTimeCurrent} mins`}
                            percentage={activeTimePercent !== null ? Math.round(activeTimePercent) : null}
                            color="text-blue-500"
                            icon={Timer}
                        />
                        <TrackingRing
                            label="Workouts"
                            valueText={hasTargets ? `${workoutsCurrent} of ${workoutsTarget} workouts` : `${workoutsCurrent} workouts`}
                            percentage={workoutsPercent !== null ? Math.round(workoutsPercent) : null}
                            color="text-orange-500"
                            icon={Activity}
                        />
                    </div>
                </div>
            )}
          </div>

          <div className="w-full lg:w-auto flex flex-col gap-3 min-w-[280px]">
             <IQInsight text={hasTargets
               ? `This week you've completed ${workoutsCurrent} of ${workoutsTarget} workouts and ${activeDaysCurrent} of ${activeDaysTarget} active days. ${progressPercentage >= 80 ? "Excellent progress!" : progressPercentage >= 50 ? "Keep it up!" : "You've got this - stay focused on your targets!"}`
               : `This week you've completed ${workoutsCurrent} workouts across ${activeDaysCurrent} active days with ${activeTimeCurrent} minutes of activity.`
             } />
             <div className="grid grid-cols-2 gap-3">
              <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                {status === 'Active' ? <Pause size={16} /> : <Play size={16} />}
                Update Status
              </button>
              <button
                onClick={() => setIsCheckInOpen(true)}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Check-in
              </button>
            </div>
            <button className="w-full bg-white text-black hover:bg-gray-200 py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/10">
               <FileText size={16} />
               View Plan
            </button>

            {showStatusMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {['Active', 'Resting', 'Sick', 'Vacation'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setShowStatusMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </>
  );
};

// --- Detail Modal & Charts (data-driven) ---

const DrilldownChart = ({ data, color = '#3b82f6', unit = '', formatValue }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm">No data available</p>;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const fmt = formatValue || ((v) => Math.round(v));

  return (
    <div className="w-full h-64 flex items-end gap-[2px] px-2">
      {data.map((bucket, i) => {
        const pct = (bucket.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 h-full flex flex-col justify-end gap-1 group min-w-0">
            <div
              className="w-full rounded-t-sm relative transition-all hover:opacity-80"
              style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded z-10">
                {fmt(bucket.value)}{unit ? ` ${unit}` : ''}
              </div>
            </div>
            {data.length <= 12 && (
              <span className="text-[8px] text-gray-600 text-center truncate">{bucket.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- Drilldown Line Chart (for pace / speed) ---
const DrilldownLineChart = ({ data, color = '#3b82f6', unit = '', formatValue }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm">No data available</p>;
  }

  const fmt = formatValue || ((v) => Math.round(v));
  const points = data.map((d, i) => ({ ...d, index: i })).filter(d => d.value > 0);

  if (points.length === 0) {
    return <p className="text-gray-500 text-sm">No data available</p>;
  }

  const W = 600;
  const H = 256;
  const PAD_X = 30;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 28;

  const minVal = Math.min(...points.map(p => p.value));
  const maxVal = Math.max(...points.map(p => p.value));
  const range = maxVal - minVal || 1;

  const xScale = (idx) => PAD_X + (idx / Math.max(data.length - 1, 1)) * (W - PAD_X * 2);
  const yScale = (val) => PAD_TOP + (1 - (val - minVal) / range) * (H - PAD_TOP - PAD_BOTTOM);

  const linePoints = points.map(p => `${xScale(p.index)},${yScale(p.value)}`).join(' ');
  const areaPoints = [
    `${xScale(points[0].index)},${H - PAD_BOTTOM}`,
    ...points.map(p => `${xScale(p.index)},${yScale(p.value)}`),
    `${xScale(points[points.length - 1].index)},${H - PAD_BOTTOM}`,
  ].join(' ');

  const showAllLabels = data.length <= 12;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`lineGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#lineGrad-${color.replace('#', '')})`} />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={xScale(p.index)} cy={yScale(p.value)} r="4" fill={color} stroke="#111" strokeWidth="1.5" className="opacity-50 hover:opacity-100 transition-opacity" />
            <circle cx={xScale(p.index)} cy={yScale(p.value)} r="12" fill="transparent" className="cursor-pointer" />
            <g className="opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <rect x={xScale(p.index) - 30} y={yScale(p.value) - 26} width="60" height="20" rx="4" fill="rgba(0,0,0,0.85)" />
              <text x={xScale(p.index)} y={yScale(p.value) - 13} textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace">
                {fmt(p.value)}{unit ? ` ${unit}` : ''}
              </text>
            </g>
          </g>
        ))}
        {/* X-axis labels */}
        {showAllLabels
          ? data.map((d, i) => (
              <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle" fill="#6b7280" fontSize="8">{d.label}</text>
            ))
          : (
            <>
              <text x={xScale(0)} y={H - 6} textAnchor="start" fill="#6b7280" fontSize="8">{data[0].label}</text>
              <text x={xScale(data.length - 1)} y={H - 6} textAnchor="end" fill="#6b7280" fontSize="8">{data[data.length - 1].label}</text>
            </>
          )
        }
      </svg>
    </div>
  );
};

// Filter workouts by a timeframe label
const filterByTimeframe = (workouts, timeframe) => {
  if (!workouts) return [];
  const now = Date.now() / 1000;
  if (timeframe === 'Week') return workouts.filter(w => w.start_time >= now - 7 * 86400);
  if (timeframe === 'Month') return workouts.filter(w => w.start_time >= now - 30 * 86400);
  if (timeframe === 'Year') return workouts.filter(w => w.start_time >= now - 365 * 86400);
  return workouts;
};

// --- Discipline Pie Chart ---
const DISCIPLINE_COLORS = {
  cycling: '#3b82f6', running: '#ef4444', walking: '#22c55e', strength: '#f97316',
  yoga: '#a855f7', stretching: '#ec4899', cardio: '#06b6d4', rowing: '#14b8a6',
  pilates: '#f59e0b', circuit: '#8b5cf6', caesar: '#14b8a6', meditation: '#6366f1',
  bike_bootcamp: '#2563eb', tread_bootcamp: '#dc2626', outdoor: '#16a34a',
};

const DisciplinePieChart = ({ workouts }) => {
  const byDiscipline = {};
  let totalSeconds = 0;
  (workouts || []).forEach(w => {
    const d = w.fitness_discipline || 'unknown';
    const dur = (w.end_time - w.start_time) || 0;
    byDiscipline[d] = (byDiscipline[d] || 0) + dur;
    totalSeconds += dur;
  });

  if (totalSeconds === 0) return <p className="text-gray-500 text-sm">No data available</p>;

  const sorted = Object.entries(byDiscipline).sort((a, b) => b[1] - a[1]);
  const totalMinutes = Math.round(totalSeconds / 60);

  // Build SVG arcs
  let cumAngle = 0;
  const slices = sorted.map(([name, secs]) => {
    const fraction = secs / totalSeconds;
    const startAngle = cumAngle;
    cumAngle += fraction * 360;
    return { name, secs, fraction, startAngle, endAngle: cumAngle, color: DISCIPLINE_COLORS[name] || '#6b7280' };
  });

  const toRad = (deg) => (deg - 90) * Math.PI / 180;
  const cx = 100, cy = 100, r = 80, ir = 50;

  const arcPath = (start, end) => {
    if (end - start >= 359.99) {
      // Full circle — draw two half arcs
      const mid = start + 180;
      return [
        `M ${cx + r * Math.cos(toRad(start))} ${cy + r * Math.sin(toRad(start))}`,
        `A ${r} ${r} 0 0 1 ${cx + r * Math.cos(toRad(mid))} ${cy + r * Math.sin(toRad(mid))}`,
        `A ${r} ${r} 0 0 1 ${cx + r * Math.cos(toRad(start))} ${cy + r * Math.sin(toRad(start))}`,
        `L ${cx + ir * Math.cos(toRad(start))} ${cy + ir * Math.sin(toRad(start))}`,
        `A ${ir} ${ir} 0 0 0 ${cx + ir * Math.cos(toRad(mid))} ${cy + ir * Math.sin(toRad(mid))}`,
        `A ${ir} ${ir} 0 0 0 ${cx + ir * Math.cos(toRad(start))} ${cy + ir * Math.sin(toRad(start))}`,
        'Z',
      ].join(' ');
    }
    const largeArc = end - start > 180 ? 1 : 0;
    return [
      `M ${cx + r * Math.cos(toRad(start))} ${cy + r * Math.sin(toRad(start))}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(toRad(end))} ${cy + r * Math.sin(toRad(end))}`,
      `L ${cx + ir * Math.cos(toRad(end))} ${cy + ir * Math.sin(toRad(end))}`,
      `A ${ir} ${ir} 0 ${largeArc} 0 ${cx + ir * Math.cos(toRad(start))} ${cy + ir * Math.sin(toRad(start))}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((s, i) => (
            <path key={i} d={arcPath(s.startAngle, s.endAngle)} fill={s.color} className="hover:opacity-80 transition-opacity" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h` : `${totalMinutes}m`}</span>
          <span className="text-[10px] text-gray-400">total</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-sm">
        {sorted.map(([name, secs]) => {
          const m = Math.round(secs / 60);
          const pct = Math.round((secs / totalSeconds) * 100);
          return (
            <span key={name} className="flex items-center gap-1.5 text-xs text-gray-300">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: DISCIPLINE_COLORS[name] || '#6b7280' }}></span>
              <span className="capitalize">{name}</span>
              <span className="text-gray-500">{m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}m`} ({pct}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// --- Discipline Workout Count Table ---
const DisciplineCountTable = ({ workouts }) => {
  const counts = {};
  (workouts || []).forEach(w => {
    const d = w.fitness_discipline || 'unknown';
    counts[d] = (counts[d] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = (workouts || []).length;

  if (total === 0) return <p className="text-gray-500 text-sm">No workouts in this period</p>;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="space-y-1">
        {sorted.map(([name, count]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={name} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: DISCIPLINE_COLORS[name] || '#6b7280' }}></span>
              <span className="flex-1 text-sm text-gray-200 capitalize">{name}</span>
              <span className="text-sm font-bold text-white">{count}</span>
              <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
        <span className="text-sm text-gray-400 font-medium">Total</span>
        <span className="text-sm font-bold text-white">{total}</span>
      </div>
    </div>
  );
};

const DetailModal = ({ isOpen, onClose, title, description, workouts, metric, color, renderContent, showTimeframePicker = true }) => {
  const [timeframe, setTimeframe] = useState('Month');

  if (!isOpen) return null;

  const filteredWorkouts = showTimeframePicker ? filterByTimeframe(workouts, timeframe) : workouts;
  const chartData = !renderContent ? aggregateWorkoutsForChart(workouts || [], timeframe, metric || 'duration') : null;

  const unitMap = { duration: 'min', calories: 'kcal', count: '', output: 'kJ', distance: 'mi' };
  const formatMap = {
    duration: (v) => Math.round(v),
    calories: (v) => Math.round(v),
    count: (v) => v,
    output: (v) => Math.round(v / 1000),
    distance: (v) => (Math.round(v * 100) / 100).toString(),
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft size={20} /> Back
        </button>
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <div className="w-16"></div>
      </div>

      {description && (
        <p className="text-sm text-gray-400 text-center max-w-lg mx-auto mb-6 leading-relaxed">{description}</p>
      )}

      {showTimeframePicker && (
        <div className="flex justify-center mb-8">
          <div className="bg-black/40 p-1 rounded-lg backdrop-blur-md border border-white/10 flex gap-1">
            {['Week', 'Month', 'Year', 'All'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
                  timeframe === t
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
        {renderContent ? (
          <div className="flex-1 flex items-center justify-center">
            {renderContent(filteredWorkouts, timeframe)}
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-end">
              <DrilldownChart
                data={chartData}
                color={color || '#3b82f6'}
                unit={unitMap[metric] || ''}
                formatValue={formatMap[metric]}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-3 px-2">
              {chartData && chartData.length > 0 && (
                <>
                  <span>{chartData[0].label}</span>
                  <span>{chartData[chartData.length - 1].label}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- Reusable Metric Tile ---
const MetricTile = ({ label, value, unit, subtext, onClick, className = "" }) => (
    <div
        onClick={onClick}
        className={`bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group flex flex-col justify-between min-h-[6.5rem] ${className}`}
    >
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-gray-300 leading-snug">{label}</p>
        <div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white tracking-tight">{value}</span>
                <span className="text-xs text-gray-500 font-medium">{unit}</span>
            </div>
            {subtext && <p className="text-[10px] text-gray-500 mt-1 truncate">{subtext}</p>}
        </div>
    </div>
);

// --- Active Days Mini Calendar ---
const ActiveDaysMiniCalendar = ({ dayMap }) => {
  const today = new Date();
  const days = [];

  // Go back to find a Monday that's at least 28 days ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 27);
  // Align to Monday (0=Sun, 1=Mon, ...)
  const dayOfWeek = startDate.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysBack);

  // Fill from that Monday to today
  const current = new Date(startDate);
  while (current <= today) {
    const key = current.toISOString().split('T')[0];
    const hasWorkout = !!dayMap[key];
    days.push({ date: new Date(current), key, hasWorkout, count: dayMap[key]?.count || 0 });
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} className="text-[8px] text-gray-600 text-center font-medium">{d}</div>
      ))}
      {days.map((day) => (
        <div
          key={day.key}
          className={`w-full aspect-square rounded-sm flex items-center justify-center text-[8px] ${
            day.hasWorkout
              ? 'bg-green-500/40 text-green-300'
              : 'bg-white/5 text-gray-700'
          }`}
          title={`${day.date.toLocaleDateString()}: ${day.count} workouts`}
        >
          {day.date.getDate()}
        </div>
      ))}
    </div>
  );
};

// --- Month Calendar View (for Active Days detail modal) ---
const MonthCalendarView = ({ workouts, streaks }) => {
  const [monthOffset, setMonthOffset] = useState(0);

  // Build dayMap from all workouts
  const dayMap = {};
  (workouts || []).forEach(w => {
    const date = new Date(w.start_time * 1000);
    const key = date.toISOString().split('T')[0];
    if (!dayMap[key]) dayMap[key] = { count: 0, totalDuration: 0 };
    dayMap[key].count += 1;
    dayMap[key].totalDuration += ((w.end_time - w.start_time) || 0) / 60;
  });

  const now = new Date();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week for the 1st (0=Sun)
  const firstDow = new Date(year, month, 1).getDay();
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1; // Monday-based

  // Count active days this month
  let activeDaysThisMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dayMap[key]) activeDaysThisMonth++;
  }

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Streak badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current Weekly</p>
          <span className="text-xl font-bold text-green-400">{streaks.currentWeekly}</span>
          <span className="text-xs text-gray-500 ml-1">weeks</span>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Weekly</p>
          <span className="text-xl font-bold text-yellow-400">{streaks.bestWeekly}</span>
          <span className="text-xs text-gray-500 ml-1">weeks</span>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current Daily</p>
          <span className="text-xl font-bold text-green-400">{streaks.currentDaily}</span>
          <span className="text-xs text-gray-500 ml-1">days</span>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Daily</p>
          <span className="text-xl font-bold text-yellow-400">{streaks.bestDaily}</span>
          <span className="text-xs text-gray-500 ml-1">days</span>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setMonthOffset(monthOffset + 1)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">{monthLabel}</span>
          <span className="text-xs text-gray-500 ml-2">{activeDaysThisMonth} active days</span>
        </div>
        <button
          onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
          disabled={monthOffset === 0}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={i} className="text-[10px] text-gray-600 text-center font-medium pb-1">{d}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = dayMap[key];
          const isToday = monthOffset === 0 && day === now.getDate();
          const isFuture = monthOffset === 0 && day > now.getDate();

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                data
                  ? 'bg-green-500/30 text-green-300 border border-green-500/20'
                  : isFuture
                    ? 'bg-transparent text-gray-800'
                    : 'bg-white/5 text-gray-600'
              } ${isToday ? 'ring-1 ring-white/30' : ''}`}
              title={data ? `${data.count} workout${data.count > 1 ? 's' : ''}, ${Math.round(data.totalDuration)}min` : ''}
            >
              <span className="font-medium">{day}</span>
              {data && (
                <span className="text-[7px] text-green-400/80">{data.count}x</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- HR Zone Balance Bar ---
const HRZoneBar = ({ zones }) => {
  if (!zones) return <p className="text-[10px] text-gray-600">No HR data</p>;

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden">
        {zones.map((z, i) => (
          z.percentage > 0 && (
            <div
              key={i}
              style={{ width: `${z.percentage}%`, backgroundColor: z.color }}
              className="transition-all"
              title={`${z.name}: ${z.percentage}%`}
            />
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {zones.filter(z => z.percentage > 0).map((z, i) => (
          <span key={i} className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: z.color }}></span>
            <span className="text-gray-500">{z.name}</span>
            <span className="font-medium text-gray-300">{z.percentage}%</span>
            <span className="text-gray-600">({Math.round(z.minutes)}m)</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// --- Sleep Stages Bar ---
const SLEEP_STAGE_COLORS = {
  Light: '#60A5FA',
  REM:   '#A78BFA',
  Deep:  '#1D4ED8',
  Awake: '#4B5563',
};

const SleepStagesBar = ({ lightMins, remMins, deepMins, awakeMins }) => {
  const stages = [
    { name: 'Light', mins: lightMins },
    { name: 'REM',   mins: remMins   },
    { name: 'Deep',  mins: deepMins  },
    { name: 'Awake', mins: awakeMins },
  ].filter((s) => s.mins != null && s.mins > 0);

  const total = stages.reduce((sum, s) => sum + s.mins, 0);
  if (!total) return <p className="text-[10px] text-gray-600 mt-2">No stage data</p>;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex h-3 rounded-full overflow-hidden">
        {stages.map((s) => (
          <div
            key={s.name}
            style={{ width: `${(s.mins / total * 100).toFixed(1)}%`, backgroundColor: SLEEP_STAGE_COLORS[s.name] }}
            className="transition-all"
            title={`${s.name}: ${Math.floor(s.mins / 60)}h ${s.mins % 60}m`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stages.map((s) => (
          <span key={s.name} className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: SLEEP_STAGE_COLORS[s.name] }} />
            <span className="text-gray-500">{s.name}</span>
            <span className="font-medium text-gray-300">
              {Math.floor(s.mins / 60) > 0 ? `${Math.floor(s.mins / 60)}h ${s.mins % 60}m` : `${s.mins % 60}m`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

// --- Cardio Focus Chart ---
const CardioFocusChart = ({ data, enriching, enrichProgress }) => {
  if (!data) {
    if (enriching) {
      return (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-[10px] text-gray-500">Loading HR data{enrichProgress ? ` (${enrichProgress})` : ''}...</p>
        </div>
      );
    }
    return <p className="text-[10px] text-gray-500">No heart rate data available</p>;
  }

  const maxMinutes = Math.max(...data.buckets.map(b => b.minutes), 1);

  return (
    <div className="space-y-3">
      {data.buckets.map((bucket, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[10px] text-gray-400 font-medium">{bucket.name}</span>
            <span className="text-[10px] text-gray-500">{bucket.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-5 bg-white/5 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${Math.max((bucket.minutes / maxMinutes) * 100, 2)}%`,
                  backgroundColor: bucket.color,
                }}
              />
            </div>
            <div className="text-right min-w-[70px]">
              <span className="text-xs font-bold text-white">{Math.round(bucket.minutes)}m</span>
              <span className="text-[10px] text-gray-500 ml-1">{bucket.percentage}%</span>
            </div>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-500">
        {data.totalMinutes} min across {data.workoutsWithHR} workouts with HR
      </p>
    </div>
  );
};

// --- Cardio Discipline Sub-Selector ---
const CardioDisciplineSelector = ({ selected, onSelect, workouts }) => {
  const subDisciplineIcons = { tread: Footprints, bike: Bike, row: Waves };
  const entries = Object.values(CARDIO_SUBDISCIPLINES);

  return (
    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
      {entries.map(sub => {
        const Icon = subDisciplineIcons[sub.id];
        const count = filterWorkoutsBySubDiscipline(workouts, sub.id).length;
        return (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              selected === sub.id
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            {sub.name}
            {count > 0 && <span className="text-[9px] text-gray-500">({count})</span>}
          </button>
        );
      })}
    </div>
  );
};

// --- Personal Records Tile ---
const PersonalRecordsTile = ({ records, subDisciplineId, onClick }) => {
  const items = [];
  if (records.bestOutput) {
    items.push({ label: 'Best Output', value: `${Math.round(records.bestOutput.value / 1000)} kJ`, date: records.bestOutput.date });
  }
  if (records.bestDistance) {
    items.push({ label: 'Best Distance', value: `${records.bestDistance.value.toFixed(2)} mi`, date: records.bestDistance.date });
  }
  if (records.bestSpeed) {
    const pace = 60 / records.bestSpeed.value;
    const pMin = Math.floor(pace);
    const pSec = Math.round((pace - pMin) * 60);
    items.push({ label: 'Best Pace', value: `${pMin}:${String(pSec).padStart(2, '0')} /mi`, date: records.bestSpeed.date });
  }
  if (records.bestCalories) {
    items.push({ label: 'Best Calories', value: `${records.bestCalories.value} kcal`, date: records.bestCalories.date });
  }

  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Personal Records</p>
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-baseline">
              <span className="text-[10px] text-gray-400">{item.label}</span>
              <div className="text-right">
                <span className="text-xs font-bold text-white">{item.value}</span>
                {item.date && (
                  <span className="text-[9px] text-gray-600 ml-1.5">
                    {new Date(item.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-gray-500">No records yet</p>
      )}
      <p className="text-[9px] text-gray-600 mt-2">All-time bests (enriched data limited to 90-day window)</p>
    </div>
  );
};

// --- Fitness Details ---
const FitnessDetails = ({ workouts, workoutData, maxHR, hrZones, totalWorkoutCount, enriching, enrichProgress }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [activeModal, setActiveModal] = useState(null);
  const [cardioDiscipline, setCardioDiscipline] = useState(null);

  const tabs = [
    { id: 'all', name: 'All' },
    { id: 'cardio', name: 'Cardio' },
    { id: 'strength', name: 'Strength/Floor' },
  ];

  // Filter workouts by selected tab category
  const filtered = filterWorkoutsByCategory(workouts || [], activeTab);

  // Auto-select cardio sub-discipline with most workouts on tab switch
  const cardioFiltered = filterWorkoutsByCategory(workouts || [], 'cardio');
  // Adaptive display period: use last 30 days if there are workouts, otherwise fall back to last year
  const displayDays = filterWorkoutsByPeriod(filtered, 30).length > 0 ? 30 : 365;
  const displayPeriodLabel = displayDays === 30 ? 'Last 30 Days' : 'Last Year';

  const cardioRecent = filterWorkoutsByPeriod(cardioFiltered, displayDays);

  useEffect(() => {
    if (activeTab === 'cardio' && !cardioDiscipline) {
      let bestId = 'bike';
      let bestCount = 0;
      Object.entries(CARDIO_SUBDISCIPLINES).forEach(([id, sub]) => {
        const count = filterWorkoutsBySubDiscipline(cardioRecent, id).length;
        if (count > bestCount) {
          bestCount = count;
          bestId = id;
        }
      });
      setCardioDiscipline(bestId);
    }
  }, [activeTab, cardioRecent.length]);

  // Display-period slice for metrics
  const lastPeriod = filterWorkoutsByPeriod(filtered, displayDays);

  // Calculate all metrics
  const timeData = calculateTimeByDiscipline(lastPeriod);
  const trainingLoad = calculateTrainingLoad(filtered, maxHR); // needs full history for 42-day chronic
  const activeDays = calculateActiveDaysCalendar(filtered, displayDays);
  const totalCalories = calculateCaloriesInPeriod(lastPeriod);
  const hrBalance = activeTab === 'cardio' ? calculateHRZoneBalance(cardioRecent, hrZones, maxHR) : null;
  const cardioFocus = activeTab === 'cardio' ? calculateCardioFocus(cardioRecent, hrZones) : null;
  const workoutCount = lastPeriod.length;
  const streaks = calculateStreaks(filtered);

  // Sub-discipline metrics (for cardio tab)
  const subFiltered = cardioDiscipline ? filterWorkoutsBySubDiscipline(cardioFiltered, cardioDiscipline) : [];
  const subRecent = cardioDiscipline ? filterWorkoutsBySubDiscipline(cardioRecent, cardioDiscipline) : [];
  const distanceData = calculateDistance(subRecent);
  const paceSpeedData = calculateAvgPaceSpeed(subRecent);
  const paceSplit = cardioDiscipline === 'tread' ? calculatePaceSplitByDiscipline(subRecent) : null;
  const outputData = calculateAvgOutput(subRecent);
  const personalRecords = calculatePersonalRecords(subFiltered); // all-time

  // Discipline-specific metrics
  const criticalPace = cardioDiscipline === 'tread' ? estimateCriticalPace(subFiltered) : null;
  const inclineStats = cardioDiscipline === 'tread' ? calculateInclineStats(subRecent) : null;
  const elevationGain = cardioDiscipline === 'tread' ? calculateElevationGain(subRecent) : null;
  const ftpValue = cardioDiscipline === 'bike' ? estimateFTP(subFiltered) : null;
  const cadenceStats = cardioDiscipline === 'bike' ? calculateCadenceStats(subRecent) : null;
  const resistanceStats = cardioDiscipline === 'bike' ? calculateResistanceStats(subRecent) : null;
  const powerRatio = cardioDiscipline === 'bike' ? calculatePowerRatio(subRecent) : null;
  const rowFtp = cardioDiscipline === 'row' ? estimateRowingFTP(subFiltered) : null;
  const strokeStats = cardioDiscipline === 'row' ? calculateStrokeStats(subRecent) : null;
  const avgStrokeOutput = cardioDiscipline === 'row' ? calculateAvgStrokeOutput(subRecent) : null;

  // Workout counts by discipline (for "all" tab)
  const disciplineCounts = {};
  lastPeriod.forEach(w => {
    const d = w.fitness_discipline || 'unknown';
    disciplineCounts[d] = (disciplineCounts[d] || 0) + 1;
  });
  const sortedDisciplines = Object.entries(disciplineCounts).sort((a, b) => b[1] - a[1]);

  // Format time display
  const totalMinutes = Math.round(timeData.totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  // Top disciplines breakdown
  const topDisciplines = Object.entries(timeData.byDiscipline)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, secs]) => {
      const m = Math.round(secs / 60);
      return m >= 60 ? `${name} ${Math.floor(m / 60)}h${m % 60}m` : `${name} ${m}m`;
    })
    .join(', ');

  // Training load color
  const loadColorMap = {
    'Optimal': 'text-green-400',
    'Building': 'text-blue-400',
    'Detraining': 'text-yellow-400',
    'Overreaching': 'text-orange-400',
    'Overtraining': 'text-red-400',
    'No Data': 'text-gray-500',
  };

  // Strength tab discipline counts
  const strengthDisciplineCounts = {};
  if (activeTab === 'strength') {
    lastPeriod.forEach(w => {
      const d = w.fitness_discipline || 'unknown';
      strengthDisciplineCounts[d] = (strengthDisciplineCounts[d] || 0) + 1;
    });
  }
  const sortedStrengthDisciplines = Object.entries(strengthDisciplineCounts).sort((a, b) => b[1] - a[1]);

  // Strength metrics from enriched data
  const strengthWorkouts = activeTab === 'strength' ? lastPeriod.filter(w => w.fitness_discipline === 'strength') : [];
  const strengthMetrics = activeTab === 'strength' && !enriching ? calculateStrengthMetrics(strengthWorkouts) : null;
  const movement10RM = activeTab === 'strength' && !enriching ? estimateMovement10RM(strengthWorkouts) : null;
  const [expandedMovement, setExpandedMovement] = useState(null);

  return (
    <>
      <DetailModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal?.title}
        description={activeModal?.description}
        workouts={activeModal?.workouts}
        metric={activeModal?.metric}
        color={activeModal?.color}
        renderContent={activeModal?.renderContent}
        showTimeframePicker={activeModal?.showTimeframePicker !== false}
      />

      <GlassCard className="h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20"><Activity size={20} /></div>
            <h2 className="text-xl font-bold text-white">Fitness Details</h2>
          </div>
          <span className="text-[10px] text-gray-500 font-medium mt-2">{displayPeriodLabel}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white/5 p-1 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* IQ Insight */}
        <IQInsight text={
          streaks.currentWeekly > 0
            ? `You're on a ${streaks.currentWeekly}-week workout streak${streaks.currentDaily > 1 ? ` and ${streaks.currentDaily}-day daily streak` : ''}! You've been active ${activeDays.activeDays} of the last ${displayDays} days with ${timeDisplay} of total training time.${streaks.currentWeekly >= streaks.bestWeekly && streaks.bestWeekly > 2 ? ' This ties your best weekly streak!' : ''}`
            : `You've been active ${activeDays.activeDays} of the last ${displayDays} days with ${timeDisplay} of total training time. Start a new streak today!`
        } />

        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Time */}
          <div
            onClick={() => setActiveModal({ title: 'Time by Discipline', workouts: filtered, renderContent: (fw) => <DisciplinePieChart workouts={fw} /> })}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time</p>
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-white">{timeDisplay}</span>
            {topDisciplines && (
              <p className="text-[10px] text-gray-500 mt-1">{topDisciplines}</p>
            )}
          </div>

          {/* Training Load */}
          <div
            onClick={() => !enriching && setActiveModal({ title: activeTab === 'cardio' ? 'Cardio Training Load' : 'Training Load', description: 'The ratio of your recent (7-day) training stress to your long-term (42-day) baseline. A ratio of 0.8\u20131.3 means you\u2019re in the optimal zone\u2014building fitness without overtraining. Below 0.8 suggests detraining; above 1.5 risks overtraining and injury.', workouts: filtered, metric: 'output', color: '#f97316' })}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-orange-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{activeTab === 'cardio' ? 'Cardio Training Load' : 'Training Load'}</p>
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
            </div>
            {enriching ? (
              <>
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse mt-1"></div>
                <div className="h-3 w-32 bg-white/5 rounded animate-pulse mt-2"></div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {trainingLoad.ratio !== null ? trainingLoad.ratio.toFixed(2) : '\u2014'}
                  </span>
                  <span className={`text-xs font-semibold ${loadColorMap[trainingLoad.status]}`}>
                    {trainingLoad.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Acute {trainingLoad.acute} · Chronic {trainingLoad.chronic}
                </p>
              </>
            )}
          </div>

          {/* Active Days + Calories — All tab only */}
          {activeTab === 'all' && (
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveModal({
                  title: 'Active Days',
                  showTimeframePicker: false,
                  workouts: filtered,
                  renderContent: () => <MonthCalendarView workouts={filtered} streaks={streaks} />,
                })}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-green-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Days</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
                </div>
                <span className="text-2xl font-bold text-white">{activeDays.activeDays}</span>
                <span className="text-xs text-gray-500 ml-1">of {activeDays.totalDays}</span>
                <div className="flex gap-3 mt-2 text-[10px]">
                  {streaks.currentWeekly > 0 && (
                    <span className="text-green-400">{streaks.currentWeekly}w streak</span>
                  )}
                  {streaks.currentDaily > 0 && (
                    <span className="text-green-400">{streaks.currentDaily}d streak</span>
                  )}
                </div>
                <div className="mt-2">
                  <ActiveDaysMiniCalendar dayMap={activeDays.dayMap} />
                </div>
              </div>

              <div
                onClick={() => !enriching && setActiveModal({ title: 'Calories', description: 'Total active calories burned during workouts, sourced from Peloton\u2019s performance data. Tracking calorie expenditure over time helps gauge training volume and supports nutrition planning.', workouts: filtered, metric: 'calories', color: '#ef4444' })}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} className="text-red-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Calories</p>
                </div>
                {enriching ? (
                  <>
                    <div className="h-6 w-20 bg-white/10 rounded animate-pulse mt-1"></div>
                    <div className="h-3 w-24 bg-white/5 rounded animate-pulse mt-2"></div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-white">{totalCalories > 0 ? totalCalories.toLocaleString() : '0'}</span>
                    <span className="text-xs text-gray-500 ml-1">kcal</span>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {workoutCount > 0 ? `${Math.round(totalCalories / workoutCount)} avg/workout` : 'No workouts'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* HR Zone Balance — cardio tab only */}
          {activeTab === 'cardio' && (
            <div
              onClick={() => hrBalance && setActiveModal({
                title: 'Heart Rate Zones',
                description: 'Time spent in each heart rate zone, calculated from second-by-second HR data across your workouts. Zone 1\u20132 builds aerobic base and fat metabolism. Zone 3 improves lactate threshold. Zone 4\u20135 develops speed and VO2 max. A balanced distribution depends on your goals\u2014endurance athletes spend ~80% in Zone 1\u20132, while HIIT-focused training shifts more time into Zone 3+.',
                workouts: cardioRecent,
                showTimeframePicker: false,
                renderContent: () => (
                  <div className="w-full max-w-md mx-auto space-y-6">
                    <HRZoneBar zones={hrBalance.zones} />
                    <p className="text-xs text-gray-500 text-center">{hrBalance.totalMinutes} min across {hrBalance.workoutsWithHR} workouts · Max HR {maxHR} bpm</p>
                  </div>
                ),
              })}
              className={`bg-white/5 border border-white/5 rounded-2xl p-4 ${hrBalance ? 'hover:bg-white/10 cursor-pointer group' : ''} transition-colors`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-pink-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Heart Rate Zones</p>
                </div>
                {hrBalance && <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />}
              </div>
              {hrBalance ? (
                <>
                  <HRZoneBar zones={hrBalance.zones} />
                  <p className="text-[10px] text-gray-500 mt-2">
                    {hrBalance.totalMinutes} min across {hrBalance.workoutsWithHR} workouts · Max HR {maxHR} bpm
                  </p>
                </>
              ) : enriching ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin"></div>
                  <p className="text-[10px] text-gray-500">Loading heart rate data{enrichProgress ? ` (${enrichProgress})` : ''}...</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500">No heart rate data available</p>
              )}
            </div>
          )}

          {/* Cardio Focus — cardio tab only */}
          {activeTab === 'cardio' && (
            <div
              onClick={() => cardioFocus && setActiveModal({
                title: 'Cardio Focus',
                description: 'How your cardio time is distributed across intensity levels, based on second-by-second heart rate data. Low Aerobic (Zone 1\u20132) builds endurance and fat-burning capacity. High Aerobic (Zone 3) improves lactate threshold\u2014the pace you can sustain for extended efforts. Anaerobic (Zone 4\u20135) develops peak power and VO2 max. Most endurance training plans target ~80% low aerobic, ~15% high aerobic, and ~5% anaerobic.',
                workouts: cardioRecent,
                showTimeframePicker: false,
                renderContent: () => (
                  <div className="w-full max-w-md mx-auto">
                    <CardioFocusChart data={cardioFocus} />
                  </div>
                ),
              })}
              className={`bg-white/5 border border-white/5 rounded-2xl p-4 ${cardioFocus ? 'hover:bg-white/10 cursor-pointer group' : ''} transition-colors`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cardio Focus</p>
                </div>
                {cardioFocus && <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />}
              </div>
              <CardioFocusChart data={cardioFocus} enriching={enriching} enrichProgress={enrichProgress} />
            </div>
          )}

          {/* === Cardio Discipline Sub-Selector and Metrics === */}
          {activeTab === 'cardio' && (
            <>
              {/* Sub-discipline selector */}
              <div className="pt-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Discipline Metrics</p>
                <CardioDisciplineSelector
                  selected={cardioDiscipline}
                  onSelect={setCardioDiscipline}
                  workouts={cardioRecent}
                />
              </div>

              {/* Shared discipline metrics */}
              <div className={`grid ${cardioDiscipline === 'tread' ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => !enriching && setActiveModal({ title: 'Distance', description: 'Total distance per period.', workouts: subFiltered, metric: 'distance', color: '#3b82f6' })}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Distance</p>
                  {enriching ? (
                    <>
                      <div className="h-5 w-16 bg-white/10 rounded animate-pulse mt-1"></div>
                      <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2"></div>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-white">{distanceData.total > 0 ? distanceData.total : '\u2014'}</span>
                      {distanceData.total > 0 && <span className="text-[10px] text-gray-500 ml-1">mi</span>}
                      <p className="text-[9px] text-gray-500 mt-1">{distanceData.avg > 0 ? `${distanceData.avg} avg/workout` : 'No data'}</p>
                    </>
                  )}
                </div>
                {cardioDiscipline === 'tread' ? (
                  <>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => !enriching && setActiveModal({ title: 'Running Pace', description: 'Average running pace trend over time.', workouts: subFiltered, renderContent: (fw, tf) => { const d = aggregateAvgMetricForChart(fw, tf, 'pace', 'running'); return <DrilldownLineChart data={d} color="#ef4444" unit="/mi" formatValue={(v) => { if (!v) return '—'; const m = Math.floor(v); const s = Math.round((v - m) * 60); return `${m}:${String(s).padStart(2,'0')}`; }} />; } })}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Running Pace</p>
                      {enriching ? (
                        <>
                          <div className="h-5 w-14 bg-white/10 rounded animate-pulse mt-1"></div>
                          <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2"></div>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-white">{paceSplit?.running ? paceSplit.running.pace : '\u2014'}</span>
                          {paceSplit?.running && <span className="text-[10px] text-gray-500 ml-1">/mi</span>}
                          <p className="text-[9px] text-gray-500 mt-1">{paceSplit?.running ? 'Avg across runs' : 'No data'}</p>
                        </>
                      )}
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => !enriching && setActiveModal({ title: 'Walking Pace', description: 'Average walking pace trend over time.', workouts: subFiltered, renderContent: (fw, tf) => { const d = aggregateAvgMetricForChart(fw, tf, 'pace', 'walking'); return <DrilldownLineChart data={d} color="#22c55e" unit="/mi" formatValue={(v) => { if (!v) return '—'; const m = Math.floor(v); const s = Math.round((v - m) * 60); return `${m}:${String(s).padStart(2,'0')}`; }} />; } })}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Walking Pace</p>
                      {enriching ? (
                        <>
                          <div className="h-5 w-14 bg-white/10 rounded animate-pulse mt-1"></div>
                          <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2"></div>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-white">{paceSplit?.walking ? paceSplit.walking.pace : '\u2014'}</span>
                          {paceSplit?.walking && <span className="text-[10px] text-gray-500 ml-1">/mi</span>}
                          <p className="text-[9px] text-gray-500 mt-1">{paceSplit?.walking ? 'Avg across walks' : 'No data'}</p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => !enriching && setActiveModal({ title: 'Speed', description: 'Average speed trend over time.', workouts: subFiltered, renderContent: (fw, tf) => { const d = aggregateAvgMetricForChart(fw, tf, 'speed'); return <DrilldownLineChart data={d} color="#06b6d4" unit="mph" formatValue={(v) => v ? `${Math.round(v * 10) / 10}` : '—'} />; } })}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Speed</p>
                    {enriching ? (
                      <>
                        <div className="h-5 w-12 bg-white/10 rounded animate-pulse mt-1"></div>
                        <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2"></div>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-white">{paceSpeedData ? `${paceSpeedData.avgSpeed}` : '\u2014'}</span>
                        {paceSpeedData && <span className="text-[10px] text-gray-500 ml-1">mph</span>}
                        <p className="text-[9px] text-gray-500 mt-1">{paceSpeedData ? 'Avg across workouts' : 'No data'}</p>
                      </>
                    )}
                  </div>
                )}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => !enriching && setActiveModal({ title: 'Output', description: 'Total output per period.', workouts: subFiltered, metric: 'output', color: '#f97316' })}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Output</p>
                  {enriching ? (
                    <>
                      <div className="h-5 w-16 bg-white/10 rounded animate-pulse mt-1"></div>
                      <div className="h-3 w-20 bg-white/5 rounded animate-pulse mt-2"></div>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-white">{outputData.total > 0 ? outputData.total : '\u2014'}</span>
                      {outputData.total > 0 && <span className="text-[10px] text-gray-500 ml-1">kJ</span>}
                      <p className="text-[9px] text-gray-500 mt-1">{outputData.avg > 0 ? `${outputData.avg} avg/workout` : 'No data'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Personal Records */}
              <PersonalRecordsTile
                records={personalRecords}
                subDisciplineId={cardioDiscipline}
                onClick={() => setActiveModal({
                  title: `${CARDIO_SUBDISCIPLINES[cardioDiscipline]?.name || ''} Personal Records`,
                  description: 'All-time personal bests for this discipline. Records from enriched time-series data (e.g. best 20-min power) are limited to the 90-day enrichment window.',
                  showTimeframePicker: false,
                  renderContent: () => null,
                })}
              />

              {/* Tread-specific metrics */}
              {cardioDiscipline === 'tread' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gauge size={12} className="text-cyan-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Critical Pace</p>
                    </div>
                    <span className="text-lg font-bold text-white">{criticalPace ? criticalPace.pace : '\u2014'}</span>
                    {criticalPace && <span className="text-[10px] text-gray-500 ml-1">/mi</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{criticalPace ? `${criticalPace.speed} mph threshold` : 'Need 20+ min runs'}</p>
                  </div>
                  {inclineStats && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mountain size={12} className="text-emerald-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incline</p>
                      </div>
                      <span className="text-lg font-bold text-white">{inclineStats.avg}%</span>
                      <p className="text-[9px] text-gray-500 mt-1">Max {inclineStats.max}%</p>
                    </div>
                  )}
                  {elevationGain !== null && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mountain size={12} className="text-emerald-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Elevation Gain</p>
                      </div>
                      <span className="text-lg font-bold text-white">{elevationGain}</span>
                      <span className="text-[10px] text-gray-500 ml-1">ft</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bike-specific metrics */}
              {cardioDiscipline === 'bike' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap size={12} className="text-yellow-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FTP</p>
                    </div>
                    <span className="text-lg font-bold text-white">{ftpValue !== null ? ftpValue : '\u2014'}</span>
                    {ftpValue !== null && <span className="text-[10px] text-gray-500 ml-1">W</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{ftpValue !== null ? '95% of best 20-min power' : 'Need 20+ min rides'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity size={12} className="text-blue-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cadence</p>
                    </div>
                    <span className="text-lg font-bold text-white">{cadenceStats ? cadenceStats.avg : '\u2014'}</span>
                    {cadenceStats && <span className="text-[10px] text-gray-500 ml-1">rpm</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{cadenceStats ? `Max ${cadenceStats.max} rpm` : 'No data'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gauge size={12} className="text-purple-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resistance</p>
                    </div>
                    <span className="text-lg font-bold text-white">{resistanceStats ? `${resistanceStats.avg}%` : '\u2014'}</span>
                    <p className="text-[9px] text-gray-500 mt-1">{resistanceStats ? `Max ${resistanceStats.max}%` : 'No data'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BarChart2 size={12} className="text-orange-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Power Ratio</p>
                    </div>
                    <span className="text-lg font-bold text-white">{powerRatio !== null ? powerRatio.toFixed(2) : '\u2014'}</span>
                    <p className="text-[9px] text-gray-500 mt-1">{powerRatio !== null ? 'NP/AP variability index' : 'No data'}</p>
                  </div>
                </div>
              )}

              {/* Row-specific metrics */}
              {cardioDiscipline === 'row' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap size={12} className="text-yellow-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rowing FTP</p>
                    </div>
                    <span className="text-lg font-bold text-white">{rowFtp !== null ? rowFtp : '\u2014'}</span>
                    {rowFtp !== null && <span className="text-[10px] text-gray-500 ml-1">W</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{rowFtp !== null ? '95% of best 20-min power' : 'Need 20+ min rows'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Waves size={12} className="text-teal-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stroke Rate</p>
                    </div>
                    <span className="text-lg font-bold text-white">{strokeStats ? strokeStats.avgRate : '\u2014'}</span>
                    {strokeStats && <span className="text-[10px] text-gray-500 ml-1">spm</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{strokeStats ? `Max ${strokeStats.maxRate} spm` : 'No data'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap size={12} className="text-orange-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Stroke Output</p>
                    </div>
                    <span className="text-lg font-bold text-white">{avgStrokeOutput !== null ? avgStrokeOutput : '\u2014'}</span>
                    {avgStrokeOutput !== null && <span className="text-[10px] text-gray-500 ml-1">J/stroke</span>}
                    <p className="text-[9px] text-gray-500 mt-1">{avgStrokeOutput !== null ? 'Output per stroke' : 'No data'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity size={12} className="text-cyan-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Strokes</p>
                    </div>
                    <span className="text-lg font-bold text-white">{strokeStats ? strokeStats.totalStrokes.toLocaleString() : '\u2014'}</span>
                    <p className="text-[9px] text-gray-500 mt-1">{strokeStats ? displayPeriodLabel : 'No data'}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* === Strength Tab: Volume, Movement Tracking, and Strength Balance === */}
          {activeTab === 'strength' && (
            <>
              {/* Workouts count with discipline breakdown */}
              <div
                onClick={() => setActiveModal({ title: 'Workouts by Discipline', workouts: filtered, renderContent: (fw) => <DisciplineCountTable workouts={fw} /> })}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={14} className="text-orange-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workouts</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">{workoutCount}</span>
                </div>
                {sortedStrengthDisciplines.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {sortedStrengthDisciplines.map(([name, count]) => (
                      <span key={name} className="text-[10px] text-gray-400">
                        <span className="text-gray-300 font-medium">{count}</span> {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume + Reps tile */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale size={14} className="text-blue-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume</p>
                  </div>
                  {enriching ? (
                    <>
                      <div className="h-6 w-24 bg-white/10 rounded animate-pulse mt-1"></div>
                      <div className="h-3 w-16 bg-white/5 rounded animate-pulse mt-2"></div>
                    </>
                  ) : strengthMetrics && strengthMetrics.workoutsWithData > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-white">
                        {strengthMetrics.totalVolume >= 1000
                          ? `${(strengthMetrics.totalVolume / 1000).toFixed(1)}k`
                          : strengthMetrics.totalVolume.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">lb</span>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {strengthMetrics.workoutsWithData} workout{strengthMetrics.workoutsWithData !== 1 ? 's' : ''} tracked
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No data</p>
                  )}
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-green-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Reps</p>
                  </div>
                  {enriching ? (
                    <>
                      <div className="h-6 w-20 bg-white/10 rounded animate-pulse mt-1"></div>
                      <div className="h-3 w-16 bg-white/5 rounded animate-pulse mt-2"></div>
                    </>
                  ) : strengthMetrics && strengthMetrics.workoutsWithData > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-white">{strengthMetrics.totalReps.toLocaleString()}</span>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {strengthMetrics.workoutsWithData > 0 ? `${Math.round(strengthMetrics.totalReps / strengthMetrics.workoutsWithData)} avg/workout` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No data</p>
                  )}
                </div>
              </div>

              {/* Strength Balance tile */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-purple-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Strength Balance</p>
                </div>
                {enriching ? (
                  <div className="h-6 w-full bg-white/10 rounded-full animate-pulse"></div>
                ) : strengthMetrics && strengthMetrics.muscleGroupWorkouts > 0 ? (
                  <>
                    <div className="flex h-5 rounded-full overflow-hidden mb-2">
                      {strengthMetrics.balance.upper > 0 && (
                        <div
                          className="bg-blue-500 flex items-center justify-center"
                          style={{ width: `${strengthMetrics.balance.upper}%` }}
                        >
                          {strengthMetrics.balance.upper >= 15 && (
                            <span className="text-[9px] font-bold text-white">{strengthMetrics.balance.upper}%</span>
                          )}
                        </div>
                      )}
                      {strengthMetrics.balance.lower > 0 && (
                        <div
                          className="bg-green-500 flex items-center justify-center"
                          style={{ width: `${strengthMetrics.balance.lower}%` }}
                        >
                          {strengthMetrics.balance.lower >= 15 && (
                            <span className="text-[9px] font-bold text-white">{strengthMetrics.balance.lower}%</span>
                          )}
                        </div>
                      )}
                      {strengthMetrics.balance.core > 0 && (
                        <div
                          className="bg-orange-500 flex items-center justify-center"
                          style={{ width: `${strengthMetrics.balance.core}%` }}
                        >
                          {strengthMetrics.balance.core >= 15 && (
                            <span className="text-[9px] font-bold text-white">{strengthMetrics.balance.core}%</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-gray-400">Upper {strengthMetrics.balance.upper}%</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-gray-400">Lower {strengthMetrics.balance.lower}%</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-gray-400">Core {strengthMetrics.balance.core}%</span></span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No muscle group data</p>
                )}
              </div>

              {/* Muscle Group Heatmap */}
              {!enriching && strengthMetrics && strengthMetrics.muscleGroupWorkouts > 0 && Object.keys(strengthMetrics.muscleGroups).length > 0 && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={14} className="text-red-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Muscle Groups</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const maxScore = Math.max(...Object.values(strengthMetrics.muscleGroups));
                      return Object.entries(strengthMetrics.muscleGroups)
                        .sort((a, b) => b[1] - a[1])
                        .map(([group, score]) => {
                          const intensity = maxScore > 0 ? score / maxScore : 0;
                          const bg = intensity > 0.7 ? 'bg-orange-500/60' : intensity > 0.4 ? 'bg-orange-500/30' : 'bg-orange-500/10';
                          return (
                            <span key={group} className={`px-2 py-1 rounded-lg text-[10px] font-medium ${bg} text-gray-200 border border-white/5`}>
                              {group.replace(/_/g, ' ')}
                            </span>
                          );
                        });
                    })()}
                  </div>
                </div>
              )}

              {/* Movement List */}
              {!enriching && strengthMetrics && strengthMetrics.workoutsWithData > 0 && Object.keys(strengthMetrics.byMovement).length > 0 && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell size={14} className="text-cyan-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Movements</p>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {Object.entries(strengthMetrics.byMovement)
                      .sort((a, b) => b[1].totalVolume - a[1].totalVolume)
                      .map(([name, data]) => {
                        const rm = movement10RM?.[name];
                        const isExpanded = expandedMovement === name;
                        return (
                          <div key={name}>
                            <div
                              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                              onClick={() => setExpandedMovement(isExpanded ? null : name)}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <ChevronRight size={12} className={`text-gray-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                <span className="text-xs text-white font-medium truncate">{name}</span>
                              </div>
                              <div className="flex gap-3 text-[10px] text-gray-400 shrink-0 ml-2">
                                <span>{data.totalVolume >= 1000 ? `${(data.totalVolume / 1000).toFixed(1)}k` : data.totalVolume} lb</span>
                                <span>{data.totalReps} reps</span>
                                {data.maxWeight > 0 && <span className="text-gray-300">{data.maxWeight} lb max</span>}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="ml-6 mb-2 px-2 py-2 bg-white/5 rounded-lg text-[10px] text-gray-400 space-y-1">
                                <div className="flex justify-between"><span>Sessions</span><span className="text-white">{data.sessions}</span></div>
                                <div className="flex justify-between"><span>Total Volume</span><span className="text-white">{data.totalVolume.toLocaleString()} lb</span></div>
                                <div className="flex justify-between"><span>Total Reps</span><span className="text-white">{data.totalReps}</span></div>
                                {data.maxWeight > 0 && <div className="flex justify-between"><span>Max Weight</span><span className="text-white">{data.maxWeight} lb</span></div>}
                                {rm && <div className="flex justify-between"><span>Est. 1RM</span><span className="text-cyan-300">{rm.e1RM} lb</span></div>}
                                {rm && <div className="flex justify-between"><span>Est. 10RM</span><span className="text-cyan-300">{rm.est10RM} lb</span></div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Skeleton for movement list while enriching */}
              {enriching && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell size={14} className="text-cyan-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Movements</p>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex justify-between items-center py-2 px-2">
                        <div className="h-3 w-28 bg-white/10 rounded animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-3 w-12 bg-white/5 rounded animate-pulse"></div>
                          <div className="h-3 w-12 bg-white/5 rounded animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Workouts count — All tab only */}
          {activeTab === 'all' && (
            <div
              onClick={() => setActiveModal({ title: 'Workouts by Discipline', workouts: filtered, renderContent: (fw) => <DisciplineCountTable workouts={fw} /> })}
              className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-purple-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workouts</p>
                </div>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-white">{workoutCount}</span>
                <span className="text-[10px] text-gray-500">{totalWorkoutCount != null ? `${totalWorkoutCount.toLocaleString()} all-time` : ''}</span>
              </div>
              {sortedDisciplines.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {sortedDisciplines.map(([name, count]) => (
                    <span key={name} className="text-[10px] text-gray-400">
                      <span className="text-gray-300 font-medium">{count}</span> {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </>
  );
};

const BIO_TABS = ['Vitals', 'Sleep', 'Nutrition'];

const BodyMetrics = ({ userId }) => {
  const [loading, setLoading]       = useState(true);
  const [deviceName, setDeviceName] = useState(null);
  const [bio, setBio]               = useState(null);
  const [noConnection, setNoConnection] = useState(false);
  const [activeTab, setActiveTab]   = useState('Vitals');

  useEffect(() => {
    if (!userId) { setNoConnection(true); setLoading(false); return; }
    setLoading(true);
    setNoConnection(false);
    setBio(null);
    setDeviceName(null);
    getPeloHubBioData(userId).then((data) => {
      if (!data.platform) { setNoConnection(true); } else { setDeviceName(data.displayName); setBio(data); }
      setLoading(false);
    });
  }, [userId]);

  // Return display value or '—'
  const v = (field) => {
    const val = bio?.[field];
    return (val !== undefined && val !== null) ? val : '—';
  };

  const unavailable = (label, unit = '', note = 'Not available from device') => (
    <MetricTile label={label} value="—" unit={unit} subtext={note} />
  );

  const tabBtn = (tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        activeTab === tab ? 'bg-purple-600/70 text-white' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {tab}
    </button>
  );

  const noConnectionState = (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
      <p className="text-gray-400 text-sm font-medium">No connected device</p>
      <p className="text-gray-600 text-xs max-w-[220px] leading-relaxed">
        Connect Whoop or Garmin via fit-feed to sync biology data here.
      </p>
    </div>
  );

  return (
    <GlassCard className="h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Body Metrics</h2>
            {loading ? (
              <p className="text-xs text-gray-500 mt-0.5">Loading…</p>
            ) : deviceName ? (
              <p className="text-xs text-purple-300 mt-0.5 font-medium">Synced from {deviceName} · Last 7 days</p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">No connected device</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
        {BIO_TABS.map(tabBtn)}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Loading…</div>
      ) : noConnection ? noConnectionState : (
        <div className="animate-in fade-in duration-300">

          {/* ── Vitals ── */}
          {activeTab === 'Vitals' && (
            <div className="grid grid-cols-2 gap-3">
              {bio?.vo2_max != null
                ? <MetricTile label="VO2 Max"          value={v('vo2_max')}           unit="ml/kg/min" subtext="7-day avg" />
                : unavailable('VO2 Max', 'ml/kg/min')}
              <MetricTile label="Resting HR"            value={v('resting_heart_rate')} unit="bpm"       subtext="7-day avg" />
              {unavailable('HR Recovery', 'bpm', 'Post-workout only')}
              <MetricTile label="HRV"                   value={v('hrv')}               unit="ms"        subtext="7-day avg" />
              {bio?.weight != null
                ? <MetricTile label="Weight"            value={v('weight')}            unit="lbs"       subtext="" />
                : unavailable('Weight', 'lbs')}
              {bio?.muscle_mass != null
                ? <MetricTile label="Muscle Mass"       value={v('muscle_mass')}       unit="lbs"       subtext="" />
                : unavailable('Muscle Mass', 'lbs')}
              <MetricTile label="Blood Oxygen"          value={v('blood_oxygen')}      unit="%"         subtext="7-day avg" />
              <MetricTile label="Respiratory Rate"      value={v('respiratory_rate')}  unit="brpm"      subtext="7-day avg" />
              {bio?.cycle_phase != null
                ? <MetricTile label="Cycle Phase"       value={v('cycle_phase')}       unit=""          subtext="" />
                : unavailable('Cycle Phase', '', 'Whoop only')}
              {bio?.body_temperature != null
                ? <MetricTile label="Body Temp"         value={v('body_temperature')}  unit="°F"        subtext="Skin temp" />
                : unavailable('Body Temp', '°F', 'Whoop only')}
            </div>
          )}

          {/* ── Sleep ── */}
          {activeTab === 'Sleep' && (
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Sleep Score"  value={v('sleep_score')}  unit=""  subtext="7-day avg" />
              {/* Sleep Duration tile spans full width and contains the stages bar */}
              <div className="col-span-2 bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sleep Duration</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white">{v('sleep_duration')}</span>
                  <span className="text-xs text-gray-500 font-medium">7-day avg</span>
                </div>
                <SleepStagesBar
                  lightMins={bio?.sleep_light_mins}
                  remMins={bio?.sleep_rem_mins}
                  deepMins={bio?.sleep_deep_mins}
                  awakeMins={bio?.sleep_awake_mins}
                />
              </div>
              {bio?.sleep_efficiency != null
                ? <MetricTile label="Efficiency"   value={Math.round(v('sleep_efficiency'))} unit="%" subtext="7-day avg" />
                : unavailable('Efficiency', '%', 'Whoop only')}
              {bio?.sleep_consistency != null
                ? <MetricTile label="Consistency"  value={v('sleep_consistency')} unit="%" subtext="7-day avg" />
                : unavailable('Consistency', '%', 'Whoop only')}
              <MetricTile label="Disturbances" value={v('sleep_disturbances')} unit=""  subtext="7-day avg" />
              <MetricTile label="Sleep Cycles" value={v('sleep_cycles')}       unit=""  subtext="7-day avg" />
            </div>
          )}

          {/* ── Nutrition ── */}
          {activeTab === 'Nutrition' && (
            <div className="grid grid-cols-2 gap-3">
              {unavailable('Hydration', 'oz', 'Not in fit-feed')}
              {unavailable('Protein',   'g',  'Not in fit-feed')}
              {unavailable('Carbs',     'g',  'Not in fit-feed')}
              {unavailable('Fat',       'g',  'Not in fit-feed')}
              {unavailable('Calories',  'kcal','Not in fit-feed')}
              {unavailable('Fiber',     'g',  'Not in fit-feed')}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

// --- Scorecard Components ---
const ScorecardItem = ({ title, score, scoreLabel, trend, color, icon: Icon, details, relatedMetrics, source }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`group bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer ${isExpanded ? 'col-span-full md:col-span-2 lg:col-span-2 row-span-2 bg-white/10 ring-1 ring-white/20' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 ${color} shadow-inner`}>
          <Icon size={18} />
        </div>
        <div className="flex flex-col items-end">
          <TrendIcon trend={trend} />
        </div>
      </div>

      <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{title}</h3>
      {source && <p className="text-[9px] text-purple-300/80 font-medium mb-2">{source}</p>}
      {!source && <div className="mb-2 h-[14px]"></div>}

      <div className="flex items-end gap-2 mb-2">
        <span className="text-white font-bold text-lg">{scoreLabel}</span>
      </div>

      <div className="flex gap-1 h-1.5 mb-2">
        {bars.map((bar) => (
          <div
            key={bar}
            className={`flex-1 rounded-full transition-colors duration-500 ${bar <= score ? color.replace('text-', 'bg-') : 'bg-gray-800'}`}
          />
        ))}
      </div>

      {isExpanded && details && details.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-baseline">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{d.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">{d.value}</span>
                {d.unit && <span className="text-[10px] text-gray-500">{d.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isExpanded && <p className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Tap for details</p>
      )}
    </div>
  );
};

const ScorecardSection = ({ workoutData, workouts, enriching, userProfile }) => {
  const pelotonFtp = userProfile?.estimated_cycling_ftp || null;
  const estimatedFtp = enriching ? null : estimateFTP(workouts || []);
  const criticalPace = enriching ? null : estimateCriticalPace(workouts || []);
  const rowFtp = enriching ? null : estimateRowingFTP(workouts || []);

  // PeloHub bio data for Sleep / Readiness source labels + raw scores
  const [deviceName, setDeviceName] = useState(null);
  const [deviceMetrics, setDeviceMetrics] = useState(null);

  useEffect(() => {
    if (!userProfile?.id) return;
    setDeviceName(null);
    setDeviceMetrics(null);
    const fetchDevice = async () => {
      const bio = await getPeloHubBioData(userProfile.id);
      if (!bio.platform) return;
      setDeviceName(bio.displayName);
      setDeviceMetrics(bio);
    };
    fetchDevice();
  }, [userProfile?.id]);

  const cardioDetails = [];
  if (enriching) {
    cardioDetails.push({ label: 'Loading...', value: '...' });
  } else {
    // Prefer Peloton's FTP if available, fall back to our estimate
    const bikeFtp = pelotonFtp || estimatedFtp;
    if (bikeFtp) {
      cardioDetails.push({ label: 'FTP (Bike)', value: bikeFtp, unit: 'W' });
    }
    if (rowFtp) cardioDetails.push({ label: 'Est. FTP (Row)', value: rowFtp, unit: 'W' });
    if (criticalPace) {
      cardioDetails.push({ label: 'Critical Pace', value: criticalPace.pace, unit: '/mi' });
      cardioDetails.push({ label: 'Threshold Speed', value: criticalPace.speed, unit: 'mph' });
    }
    if (cardioDetails.length === 0) {
      cardioDetails.push({ label: 'FTP / Critical Pace', value: 'Need 20+ min workouts' });
    }
  }

  // Raw scores from PeloHub; fall back to null (shows — in ScorecardItem)
  const rawSleepScore = deviceMetrics?.sleep_score ?? null;
  const rawReadinessScore = deviceMetrics?.recovery_score ?? null;

  // Normalize a 0-100 raw score to a 1-5 bar count
  const normalizeTo5 = (raw) => raw !== null ? Math.max(1, Math.min(5, Math.round(raw / 20))) : 3;

  const metrics = [
    {
      title: "Cardio",
      score: 5,
      scoreLabel: "Excellent",
      trend: "up",
      color: "text-blue-400",
      icon: Heart,
      details: cardioDetails,
    },
    {
      title: "Strength",
      score: 4,
      scoreLabel: "Good",
      trend: "neutral",
      color: "text-orange-400",
      icon: Dumbbell,
      details: []
    },
    {
      title: "Sleep",
      score: normalizeTo5(rawSleepScore),
      scoreLabel: rawSleepScore !== null ? String(rawSleepScore) : '—',
      trend: "neutral",
      color: "text-indigo-400",
      icon: Moon,
      source: deviceName ? `Synced from ${deviceName}` : null,
      details: []
    },
    {
      title: "Readiness",
      score: normalizeTo5(rawReadinessScore),
      scoreLabel: rawReadinessScore !== null ? String(rawReadinessScore) : '—',
      trend: "neutral",
      color: "text-green-400",
      icon: Activity,
      source: deviceName ? `Synced from ${deviceName}` : null,
      details: []
    }
  ];

  return (
    <div>
        <IQInsight text={`Your Cardio fitness is excellent with ${workoutData?.totalWorkouts || 0} total workouts completed. Keep maintaining this consistency!`} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {metrics.map((m, i) => <ScorecardItem key={i} {...m} />)}
        </div>
    </div>
  );
};

// --- User Search Modal ---
const UserSearchModal = ({ isOpen, onClose, onSelectUser }) => {
  const [searchMode, setSearchMode] = useState('userid'); // 'username' or 'userid'
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results.data || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. You may not have permission to search for other users.');
    } finally {
      setSearching(false);
    }
  };

  const handleLoadUser = async () => {
    if (!userId.trim()) return;

    setLoading(true);
    try {
      const profile = await getUserProfile(userId);
      onSelectUser(profile);
      onClose();
    } catch (error) {
      console.error('Error loading user:', error);
      alert('Failed to load user. Check the User ID or your permissions.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900/90 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">View Member Dashboard</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>

        <div className="p-4">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchMode('userid')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${searchMode === 'userid' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              Enter User ID
            </button>
            <button
              onClick={() => setSearchMode('username')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${searchMode === 'username' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              Search Username
            </button>
          </div>

          {searchMode === 'userid' ? (
            <>
              <div className="mb-4">
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Peloton User ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLoadUser()}
                    placeholder="1efedc62d6b4493baca7b24e8737a046"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Enter the 32-character user ID</p>
              </div>
              <button
                onClick={handleLoadUser}
                disabled={loading || !userId.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Loading...' : 'Load Dashboard'}
              </button>
            </>
          ) : (
            <>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter username..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 rounded-full text-white disabled:bg-gray-700"
                >
                  <Search size={14} />
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searching ? (
                  <p className="text-center text-gray-400 py-4">Searching...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSelectUser(user);
                        onClose();
                      }}
                      className="w-full text-left p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 cursor-pointer transition-colors"
                    >
                      <p className="text-white font-medium">{user.username}</p>
                      <p className="text-xs text-gray-400">ID: {user.id}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    {searchQuery ? 'No results found' : 'Enter a username to search'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

const Dashboard = ({ currentUser, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [workoutData, setWorkoutData] = useState(null);
  const [rawWorkouts, setRawWorkouts] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState(null);
  const [userGoal, setUserGoal] = useState(null);
  const [weeklyTargets, setWeeklyTargets] = useState(null);
  const [availableGoals, setAvailableGoals] = useState([]);
  const [totalWorkoutCount, setTotalWorkoutCount] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState(currentUser);

  useEffect(() => {
    loadData();
  }, [selectedUser]);

  const loadData = async () => {
    setLoading(true);
    setEnriching(false);
    setEnrichProgress('');
    try {
      const goals = getUserGoals(selectedUser.id);
      const targets = getUserTargets(selectedUser.id);

      // Paginate through ALL workouts; render dashboard after first page arrives
      const workouts = await getAllWorkoutHistory(selectedUser.id, (firstPage) => {
        const partial = firstPage.data || [];
        setRawWorkouts(partial);
        setTotalWorkoutCount(firstPage.total);
        setWorkoutData(calculateMetrics(partial));
        setWeeklyProgress(calculateWeeklyProgress(partial));
        setWeeklyHistory(calculateWeeklyHistory(partial, 24));
        setUserGoal(goals);
        setWeeklyTargets(targets);
        setAvailableGoals(AVAILABLE_GOALS);
        setEnriching(true);
        setLoading(false);
      });

      const workoutList = workouts.data || [];
      const total = workouts.total || workoutList.length;

      // Update with full dataset (no-op if only one page)
      const metrics = calculateMetrics(workoutList);
      const progress = calculateWeeklyProgress(workoutList);
      const history = calculateWeeklyHistory(workoutList, 24);

      setRawWorkouts(workoutList);
      setTotalWorkoutCount(total);
      setWorkoutData(metrics);
      setWeeklyProgress(progress);
      setWeeklyHistory(history);
      if (!goals) setUserGoal(goals);
      if (!targets) setWeeklyTargets(targets);
      setAvailableGoals(AVAILABLE_GOALS);
      setLoading(false);

      // Phase 2: Enrich last 90 days with performance data (covers 42-day training load window + 30-day display)
      const now = Date.now() / 1000;
      const ninetyDaysAgo = now - (90 * 86400);
      const recentWorkouts = workoutList.filter(w => w.start_time >= ninetyDaysAgo);

      setEnriching(true);

      // Phase 2a: Enrich recent workouts with performance graph data (HR, output, etc.)
      if (recentWorkouts.length > 0) {
        await enrichWorkoutsWithPerformance(recentWorkouts, (done, total) => {
          setEnrichProgress(`${done}/${total} perf`);
        });
      }

      // Phase 2b: Enrich ALL strength workouts with detail data (movement tracker + muscle groups).
      // This covers strength workouts outside the 90-day performance window.
      await enrichStrengthDetails(workoutList, (done, total) => {
        setEnrichProgress(`${done}/${total} strength`);
      });

      // Debug: log strength workout enrichment results
      const strengthList = workoutList.filter(w => w.fitness_discipline === 'strength');
      console.table(strengthList.map(w => {
        const mtd = w.movement_tracker_data?.completed_movements_summary_data;
        return {
          date: new Date(w.start_time * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          title: w.ride?.title || w.name || '(no title)',
          volume: mtd?.total_volume ?? '—',
          reps: mtd?.total_repetitions ?? '—',
          movements: mtd?.num_movements ?? '—',
          has_mtd: !!w.movement_tracker_data,
          has_mgs: !!w.muscle_group_score,
        };
      }));
      // Debug: log muscle_group_score for first 3 workouts that have it
      const withMgs = strengthList.filter(w => w.muscle_group_score);
      withMgs.slice(0, 3).forEach((w, i) => {
        console.log(`[MGS #${i}] "${w.ride?.title || w.name}" —`, JSON.stringify(w.muscle_group_score));
      });
      if (withMgs.length === 0) {
        console.log('[MGS] No workouts have muscle_group_score');
      }

      // Trigger re-render with enriched data
      setRawWorkouts([...workoutList]);
      setWorkoutData(calculateMetrics(workoutList));
      setEnriching(false);
      setEnrichProgress('');
    } catch (error) {
      console.error('Error loading workout data:', error);
      setLoading(false);
      setEnriching(false);
    }
  };

  const handleGoalChange = (goalId) => {
    const updatedGoals = updateUserGoalStorage(selectedUser.id, goalId);
    setUserGoal(updatedGoals);
  };

  const handleTargetsChange = (targets) => {
    const updated = updateUserTargetsStorage(selectedUser.id, targets);
    setWeeklyTargets(updated);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-blue-500/30 relative overflow-x-hidden pb-12">
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleUserSelect}
      />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[0%] right-[-5%] w-[30vw] h-[30vw] bg-blue-900/10 rounded-full blur-[100px] opacity-50"></div>
      </div>

      <nav className="border-b border-white/5 bg-black/10 backdrop-blur-xl sticky top-0 z-40 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                <Activity className="text-white" size={18} />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Pulse<span className="text-blue-500">Sync</span></span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowUserSearch(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400 font-medium hover:bg-white/10 transition-colors"
              >
                <Search size={12} /> Search Members
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400 font-medium">
                <CalendarIcon size={12} /> Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400 font-medium">
                <User size={12} /> {selectedUser?.username || currentUser?.username || 'User'}
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut size={16} className="text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fitness Goal</h3>
          </div>
          <IntentionHero
            workoutData={workoutData}
            weeklyProgress={weeklyProgress}
            userGoal={userGoal}
            weeklyTargets={weeklyTargets}
            weeklyHistory={weeklyHistory}
            availableGoals={availableGoals}
            onGoalChange={handleGoalChange}
            onTargetsChange={handleTargetsChange}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Health Scorecard</h3>
             <span className="text-xs text-gray-600">Last 30 Days</span>
          </div>
          <ScorecardSection workoutData={workoutData} workouts={rawWorkouts} enriching={enriching} userProfile={selectedUser} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FitnessDetails
            workouts={rawWorkouts}
            workoutData={workoutData}
            maxHR={deriveMaxHR(currentUser)}
            hrZones={deriveHRZones(currentUser, deriveMaxHR(currentUser))}
            totalWorkoutCount={totalWorkoutCount}
            enriching={enriching}
            enrichProgress={enrichProgress}
          />
          <BodyMetrics userId={selectedUser?.id} />
        </section>

      </main>
    </div>
  );
};

export default Dashboard;
