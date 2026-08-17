import React, { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage, FoodLog } from "../types";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  AlertCircle,
  Smartphone,
  Info
} from "lucide-react";

interface AICoachChatViewProps {
  profile: UserProfile;
  foodLogs: FoodLog[];
  waterAmount: number;
  stepsCount: number;
  onAddWaterViaVoice: (ml: number) => void;
  onLogFoodViaVoice: (query: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const AICoachChatView: React.FC<AICoachChatViewProps> = ({
  profile,
  foodLogs,
  waterAmount,
  stepsCount,
  onAddWaterViaVoice,
  onLogFoodViaVoice,
  onNavigateToTab
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Voice Assistant states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechFeedbackEnabled, setSpeechFeedbackEnabled] = useState<boolean>(true);
  const [voiceLanguage, setVoiceLanguage] = useState<string>("English"); // English, Hindi, Tamil
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat history from local storage on mount
  useEffect(() => {
    const cachedChat = localStorage.getItem(`chatHistory_${profile.email}`);
    if (cachedChat) {
      try {
        setMessages(JSON.parse(cachedChat));
      } catch (e) {
        console.error("Failed to load cached chat history:", e);
      }
    } else {
      // Starting welcome message
      const welcome: ChatMessage = {
        role: "model",
        parts: [{ text: `Namaste ${profile.name}! I am Coach NutriFit, your AI Nutrition & Fitness Guide. 

I'm ready to help you log food, calculate recipes, plan workouts, or answer any health questions!

💡 **Try saying or typing:**
* "I drank 500 ml of water"
* "Log two rotis and dal for Lunch"
* "How do I make healthy Paneer salad?"` }],
        timestamp: Date.now()
      };
      setMessages([welcome]);
      localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify([welcome]));
    }
  }, [profile.email, profile.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Set lang code based on toggle
      rec.lang = voiceLanguage === "Hindi" ? "hi-IN" : voiceLanguage === "Tamil" ? "ta-IN" : "en-IN";

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          await handleVoiceTranscript(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setError("Microphone error. Please speak clearly or write your question.");
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [voiceLanguage]);

  // Speak feedback out loud using browser speech synthesis
  const speakText = (text: string) => {
    if (!speechFeedbackEnabled) return;
    try {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select appropriate language/voice profile if available
      if (voiceLanguage === "Hindi") {
        utterance.lang = "hi-IN";
      } else if (voiceLanguage === "Tamil") {
        utterance.lang = "ta-IN";
      } else {
        utterance.lang = "en-IN";
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  };

  // Toggle listening
  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Set the appropriate language before starting
      recognitionRef.current.lang = voiceLanguage === "Hindi" ? "hi-IN" : voiceLanguage === "Tamil" ? "ta-IN" : "en-IN";
      recognitionRef.current.start();
    }
  };

  // Handle NLP voice intent transcripts from backend /api/ai/voice
  const handleVoiceTranscript = async (transcript: string) => {
    setLoading(true);
    // Add user message to UI
    const userMsg: ChatMessage = {
      role: "user",
      parts: [{ text: `[Voice] "${transcript}"` }],
      timestamp: Date.now()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      // Call voice NLP parser endpoint
      const response = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          language: voiceLanguage
        })
      });

      if (!response.ok) {
        throw new Error("Failed to parse voice command.");
      }

      const voiceData = await response.json();
      const speechFeedback = voiceData.speechFeedback || "Recognized voice command.";

      // Speak feedback
      speakText(speechFeedback);

      // Execute dynamic state logs in frontend based on intent
      if (voiceData.intent === "ADD_WATER" && voiceData.data?.amountMl) {
        onAddWaterViaVoice(voiceData.data.amountMl);
        
        const coachMsg: ChatMessage = {
          role: "model",
          parts: [{ text: `✅ **Logged Water:** ${voiceData.data.amountMl} ml\n\n*Coach Speech Feedback:* "${speechFeedback}"` }],
          timestamp: Date.now()
        };
        const finalMsgs = [...updatedMessages, coachMsg];
        setMessages(finalMsgs);
        localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify(finalMsgs));

      } else if (voiceData.intent === "LOG_FOOD" && voiceData.data?.foodQuery) {
        onLogFoodViaVoice(voiceData.data.foodQuery);

        const coachMsg: ChatMessage = {
          role: "model",
          parts: [{ text: `🍲 **AI Food Scan Triggered:** "${voiceData.data.foodQuery}"\n\n*Coach Speech Feedback:* "${speechFeedback}"\n\nI have automatically directed you to the Diary to verify and confirm the calorie items details.` }],
          timestamp: Date.now()
        };
        const finalMsgs = [...updatedMessages, coachMsg];
        setMessages(finalMsgs);
        localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify(finalMsgs));
        setTimeout(() => onNavigateToTab("food"), 1500);

      } else if (voiceData.intent === "START_WORKOUT" || voiceData.intent === "VIEW_DASHBOARD") {
        const dest = voiceData.intent === "START_WORKOUT" ? "workout" : "dashboard";
        const coachMsg: ChatMessage = {
          role: "model",
          parts: [{ text: `🎯 **Tab Shipped:** Switching to the ${dest} screen.\n\n*Coach Speech Feedback:* "${speechFeedback}"` }],
          timestamp: Date.now()
        };
        const finalMsgs = [...updatedMessages, coachMsg];
        setMessages(finalMsgs);
        localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify(finalMsgs));
        setTimeout(() => onNavigateToTab(dest), 1500);

      } else {
        // Fallback or CHAT_ASSIST: process as standard chat message
        await fetchCoachChatResponse(transcript, updatedMessages);
      }

    } catch (e: any) {
      console.error(e);
      // Fallback: treat as normal text chat if voice endpoint fails
      await fetchCoachChatResponse(transcript, updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachChatResponse = async (text: string, currentHistory: ChatMessage[]) => {
    try {
      // Calculate today's aggregates to feed as context
      const todayCalories = foodLogs.reduce((sum, log) => sum + log.totalCalories, 0);
      const todayProtein = foodLogs.reduce((sum, log) => sum + log.totalProtein, 0);

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentHistory.map(m => ({
            role: m.role,
            parts: m.parts
          })),
          userProfile: profile,
          todayLogs: {
            caloriesEaten: todayCalories,
            proteinEaten: todayProtein,
            waterMl: waterAmount * 1000,
            steps: stepsCount
          }
        })
      });

      if (!response.ok) {
        throw new Error("Coach had trouble answering. Let's try again!");
      }

      const data = await response.json();
      if (data && data.response) {
        const coachMsg: ChatMessage = {
          role: "model",
          parts: [{ text: data.response }],
          timestamp: Date.now()
        };
        const finalMsgs = [...currentHistory, coachMsg];
        setMessages(finalMsgs);
        localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify(finalMsgs));
        
        // Speak response aloud (clean markdown text first for smoother playback)
        const speechOutput = data.response.replace(/[\*#_`\-\n]/g, " ").substring(0, 150);
        speakText(speechOutput);
      } else {
        throw new Error("Invalid response received from Coach.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Could not reach Coach. Check your network.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      role: "user",
      parts: [{ text: inputValue.trim() }],
      timestamp: Date.now()
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputValue("");

    await fetchCoachChatResponse(userMsg.parts[0].text, updatedHistory);
    setLoading(false);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your conversation history with Coach NutriFit?")) {
      localStorage.removeItem(`chatHistory_${profile.email}`);
      const welcome: ChatMessage = {
        role: "model",
        parts: [{ text: `History cleared! Welcome back. Ask me anything about Indian food, recipes, and training targets.` }],
        timestamp: Date.now()
      };
      setMessages([welcome]);
      localStorage.setItem(`chatHistory_${profile.email}`, JSON.stringify([welcome]));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] text-white animate-fade-in">
      {/* 1. Voice Controls Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md mb-4.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            🎙️
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Hands-free Voice Assistant</h3>
            <p className="text-[10px] text-slate-400 font-medium">Log water/food, or switch tabs by talking</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-3.5 self-stretch sm:self-auto justify-end">
          {/* Language selector */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-900">
            {["English", "Hindi", "Tamil"].map((lang) => (
              <button
                key={lang}
                onClick={() => setVoiceLanguage(lang)}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                  voiceLanguage === lang 
                    ? "bg-slate-800 text-emerald-400" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Text speech toggle */}
          <button
            onClick={() => setSpeechFeedbackEnabled(!speechFeedbackEnabled)}
            className={`p-2 rounded-xl border transition-all ${
              speechFeedbackEnabled 
                ? "bg-emerald-500/15 border-emerald-500/10 text-emerald-400" 
                : "bg-slate-950 border-slate-900 text-slate-500"
            }`}
            title={speechFeedbackEnabled ? "Mute Speech Synthesis Feedback" : "Unmute Speech Synthesis Feedback"}
          >
            {speechFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2 mb-3 shrink-0">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Messages Chat Box */}
      <div className="flex-1 overflow-y-auto bg-slate-900/20 border border-slate-800/80 rounded-2.5xl p-4.5 space-y-4 mb-4 shadow-inner min-h-0">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={idx}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              <div className="flex items-center space-x-1 pl-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">
                  {isUser ? profile.name : "Coach NutriFit"}
                </span>
                <span className="text-[8px] text-slate-600">
                  • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div 
                className={`p-3.5 max-w-[85%] rounded-2xl text-xs font-medium leading-relaxed ${
                  isUser 
                    ? "bg-emerald-500 text-slate-950 rounded-tr-none font-bold shadow-md shadow-emerald-500/5" 
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line"
                }`}
              >
                {msg.parts[0].text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center space-x-2.5 p-3.5 bg-slate-900/40 border border-slate-800 rounded-2xl max-w-xs text-xs font-semibold text-slate-300">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Coach is formulating reply...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Controls Area */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2.5xl flex items-center space-x-3.5 shadow-lg shrink-0">
        {/* Voice Microphone Trigger */}
        <button
          onClick={handleToggleListening}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border cursor-pointer transition-all active:scale-90 shrink-0 ${
            isListening 
              ? "bg-rose-500 border-rose-500 text-white animate-pulse" 
              : "bg-emerald-500 border-emerald-500 text-slate-950 hover:bg-emerald-600"
          }`}
          title={isListening ? "Stop listening voice command" : "Start speaking voice command"}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 stroke-[2.5px]" />}
        </button>

        {/* Text Input Form */}
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            disabled={loading}
            placeholder={isListening ? "Listening... Speak now!" : "Ask Coach or log custom meals..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
          
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="w-11 h-11 bg-slate-800 hover:bg-emerald-500 disabled:bg-slate-950 hover:text-slate-950 disabled:text-slate-700 text-emerald-400 border border-slate-850 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>

        <button 
          onClick={handleClearHistory}
          className="text-[10px] text-slate-500 hover:text-slate-400 font-bold hover:underline shrink-0 px-1"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
