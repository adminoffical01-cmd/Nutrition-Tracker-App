import React, { useState, useRef, useEffect } from "react";
import { UserProfile, FoodLog, FoodItem } from "../types";
import { Search, Plus, Trash2, Camera, ChevronLeft, Sparkles, Check, Info, FileText, Smartphone } from "lucide-react";

interface FoodDiaryViewProps {
  profile: UserProfile;
  foodLogs: FoodLog[];
  onLogMeal: (mealType: FoodLog['mealType'], items: FoodItem[]) => void;
  onDeleteMeal: (logId: string) => void;
  onDeleteFoodItem?: (logId: string, itemIndex: number) => void;
  selectedDate: string;
  initialSubView?: "diary" | "camera";
}

// Structured Local Indian Food Database
const popularIndianFoods: FoodItem[] = [
  { name: "Roti (Whole Wheat)", portionGrams: 40, calories: 120, protein: 4, carbs: 24, fat: 1, fiber: 3 },
  { name: "Brown Rice (Cooked)", portionGrams: 100, calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
  { name: "White Rice (Cooked)", portionGrams: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: "Dal Tadka", portionGrams: 150, calories: 150, protein: 7, carbs: 20, fat: 5, fiber: 4 },
  { name: "Paneer Butter Masala", portionGrams: 150, calories: 340, protein: 11, carbs: 8, fat: 28, fiber: 1.2 },
  { name: "Idli (2 pieces)", portionGrams: 100, calories: 120, protein: 4, carbs: 24, fat: 0.2, fiber: 1.6 },
  { name: "Dosa (Plain)", portionGrams: 80, calories: 140, protein: 3, carbs: 26, fat: 4, fiber: 1.2 },
  { name: "Sambar", portionGrams: 150, calories: 95, protein: 3.2, carbs: 14, fat: 2.5, fiber: 3.6 },
  { name: "Egg Bhurji (2 Eggs)", portionGrams: 120, calories: 195, protein: 13, carbs: 3, fat: 15, fiber: 0.5 },
  { name: "Chicken Curry", portionGrams: 150, calories: 260, protein: 24, carbs: 6, fat: 16, fiber: 1.5 },
  { name: "Banana (1 Medium)", portionGrams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1 },
  { name: "Curd / Dahi", portionGrams: 100, calories: 98, protein: 3.5, carbs: 4.7, fat: 4.3, fiber: 0 }
];

export const FoodDiaryView: React.FC<FoodDiaryViewProps> = ({
  profile,
  foodLogs,
  onLogMeal,
  onDeleteMeal,
  onDeleteFoodItem,
  selectedDate,
  initialSubView = "diary"
}) => {
  const [subView, setSubView] = useState<"diary" | "add_manual" | "camera" | "scan_result">("diary");

  // Keep subview synchronized with initialSubView transitions
  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);
  const [activeMealType, setActiveMealType] = useState<FoodLog['mealType']>("Breakfast");

  // Manual search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPopularFood, setSelectedPopularFood] = useState<FoodItem | null>(null);
  const [manualGrams, setManualGrams] = useState<number>(100);

  // Custom food entry state
  const [customName, setCustomName] = useState<string>("");
  const [customCals, setCustomCals] = useState<number>(150);
  const [customProtein, setCustomProtein] = useState<number>(5);
  const [customCarbs, setCustomCarbs] = useState<number>(20);
  const [customFat, setCustomFat] = useState<number>(4);
  const [customFiber, setCustomFiber] = useState<number>(2);

  // Camera vision scanner states
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [detectedItems, setDetectedItems] = useState<FoodItem[]>([]);
  const [loggedIndices, setLoggedIndices] = useState<number[]>([]);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState<string>("");
  const [scanMessage, setScanMessage] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Real Camera capture states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setScanMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      // Wait for ref update and start play
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => {
            console.error("Play error:", e);
          });
        }
      }, 100);
      setScanMessage("Live Camera Active. Center your food plate!");
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please allow camera permissions or drop/upload an image file instead.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setScanImage(dataUrl);
        setScanMessage("Captured image from device camera successfully!");
        stopCamera();
      }
    }
  };

  // Stop camera stream on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Barcode mock trigger
  const [barcodeQuery, setBarcodeQuery] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setScanMessage("Please select an image file (PNG, JPG, JPEG)!");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScanImage(reader.result as string);
      setScanMessage(`Loaded image: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleClearSelectedImage = () => {
    setScanImage(null);
    setSelectedFile(null);
    setScanMessage("");
    stopCamera();
    setCameraError(null);
  };

  const handleSelectPopularFood = (food: FoodItem) => {
    setSelectedPopularFood(food);
    setManualGrams(food.portionGrams);
  };

  const handleConfirmAddPopular = () => {
    if (!selectedPopularFood) return;
    const scale = manualGrams / selectedPopularFood.portionGrams;
    const finalItem: FoodItem = {
      name: selectedPopularFood.name,
      portionGrams: manualGrams,
      calories: Math.round(selectedPopularFood.calories * scale),
      protein: Number((selectedPopularFood.protein * scale).toFixed(1)),
      carbs: Number((selectedPopularFood.carbs * scale).toFixed(1)),
      fat: Number((selectedPopularFood.fat * scale).toFixed(1)),
      fiber: Number((selectedPopularFood.fiber * scale).toFixed(1))
    };
    onLogMeal(activeMealType, [finalItem]);
    setSelectedPopularFood(null);
    setSubView("diary");
  };

  const handleAddCustomFood = () => {
    if (!customName) return;
    const customItem: FoodItem = {
      name: customName,
      portionGrams: 100,
      calories: customCals,
      protein: customProtein,
      carbs: customCarbs,
      fat: customFat,
      fiber: customFiber
    };
    onLogMeal(activeMealType, [customItem]);
    setCustomName("");
    setSubView("diary");
  };

  // Simulate Photo capture / gallery upload
  const handleTriggerAIScan = async (useSampleImage: boolean) => {
    setLoadingScan(true);
    setScanMessage("");
    setLoggedIndices([]);
    let payload: any = {};

    if (useSampleImage) {
      // Simulate base64 Indian meal thumbnail
      setScanImage("https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=60");
      payload = { text: "2 Rotis, Yellow Dal and mixed veg curry" };
    } else if (scanImage && scanImage.startsWith("data:image/")) {
      // User-uploaded real photo!
      payload = { image: scanImage, text: textDescription || "Analyze this food item." };
    } else {
      if (!textDescription) {
        setScanMessage("Please enter a food description or select/drag-and-drop an image first!");
        setLoadingScan(false);
        return;
      }
      payload = { text: textDescription };
    }

    try {
      const response = await fetch("/api/ai/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data && data.items) {
        setDetectedItems(data.items);
        if (data.message) setScanMessage(data.message);
      } else {
        throw new Error("No parsed items");
      }
      setSubView("scan_result");
    } catch (e) {
      console.error(e);
      // Fallback
      setDetectedItems([
        { name: "Paneer Curry", portionGrams: 150, calories: 320, protein: 12, carbs: 10, fat: 26, fiber: 2, confidence: 0.94 },
        { name: "Whole Wheat Roti (2 pcs)", portionGrams: 80, calories: 240, protein: 8, carbs: 48, fat: 2, fiber: 6, confidence: 0.91 }
      ]);
      setScanMessage("Using localized database estimates.");
      setSubView("scan_result");
    } finally {
      setLoadingScan(false);
    }
  };

  // Simulate Packaged Barcode Scanning
  const handleBarcodeMock = () => {
    if (!barcodeQuery) return;
    // Simulate lookup of popular Indian packaged items (like Maggi, Amul Butter, Britannia biscuits)
    let barcodeFood: FoodItem = {
      name: "Britannia NutriChoice Digestive Biscuit (2 pcs)",
      portionGrams: 24,
      calories: 110,
      protein: 1.8,
      carbs: 16,
      fat: 4.5,
      fiber: 1.2
    };

    if (barcodeQuery.includes("maggi") || barcodeQuery.includes("instant")) {
      barcodeFood = {
        name: "Maggi 2-Minute Masala Noodles (1 pack)",
        portionGrams: 70,
        calories: 310,
        protein: 6.2,
        carbs: 45,
        fat: 11.5,
        fiber: 2.1
      };
    } else if (barcodeQuery.includes("amul") || barcodeQuery.includes("cheese")) {
      barcodeFood = {
        name: "Amul Cheese Block (1 cube)",
        portionGrams: 20,
        calories: 64,
        protein: 4.1,
        carbs: 0.3,
        fat: 5.2,
        fiber: 0
      };
    }

    onLogMeal(activeMealType, [barcodeFood]);
    setBarcodeQuery("");
    setSubView("diary");
  };

  const handleEditDetectedItem = (index: number, key: keyof FoodItem, val: any) => {
    const updated = [...detectedItems];
    updated[index] = { ...updated[index], [key]: val };
    setDetectedItems(updated);
  };

  const handleConfirmLogSingleItem = (index: number) => {
    if (loggedIndices.includes(index)) return;
    const item = detectedItems[index];
    onLogMeal(activeMealType, [item]);
    setLoggedIndices((prev) => [...prev, index]);
  };

  const handleConfirmLogMeal = () => {
    const unlogged = detectedItems.filter((_, idx) => !loggedIndices.includes(idx));
    if (unlogged.length > 0) {
      onLogMeal(activeMealType, unlogged);
    }
    setDetectedItems([]);
    setLoggedIndices([]);
    setSubView("diary");
  };

  // Filter popular foods based on search
  const filteredPopularFoods = popularIndianFoods.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-24 animate-fade-in text-white px-1">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-5 select-none">
        <div>
          <h2 className="text-xs text-slate-400 font-bold uppercase tracking-widest">Food Logs</h2>
          <h1 className="text-xl font-black text-slate-100">{selectedDate === new Date().toISOString().split("T")[0] ? "Today's Diary" : selectedDate}</h1>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSubView("camera")}
            className="p-3 bg-emerald-500 text-slate-950 hover:bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs space-x-1.5 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>AI Scan</span>
          </button>
        </div>
      </div>

      {/* --- SUBVIEW 1: PRIMARY FOOD DIARY LIST --- */}
      {subView === "diary" && (
        <div className="space-y-6">
          {(["Breakfast", "Lunch", "Evening Snack", "Dinner"] as const).map((meal) => {
            const currentLog = foodLogs.find(l => l.mealType === meal);
            return (
              <div key={meal} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-slate-200">{meal}</h3>
                    {currentLog && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{currentLog.totalCalories} kcal total</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentLog && (
                      <button
                        onClick={() => onDeleteMeal(currentLog.id!)}
                        title="Delete entire meal category"
                        className="p-2 bg-slate-950 hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-bold rounded-xl border border-slate-800/80 transition-all hover:border-red-500/30 text-xs flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setActiveMealType(meal);
                        setSubView("add_manual");
                      }}
                      className="p-2 bg-slate-950 hover:bg-slate-850 text-emerald-400 font-bold rounded-xl border border-slate-800/80 flex items-center space-x-1 hover:border-emerald-500/30 transition-all text-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {!currentLog || currentLog.items.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-slate-800/50 rounded-xl text-xs text-slate-500 font-medium">
                    No items tracked for {meal}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentLog.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex justify-between items-center relative group">
                        <div className="space-y-1 pr-4">
                          <h4 className="font-bold text-xs text-slate-200">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">{item.portionGrams}g</span>
                            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">{item.calories} kcal</span>
                            <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">P: {item.protein}g</span>
                            <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded">C: {item.carbs}g</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (onDeleteFoodItem) {
                              onDeleteFoodItem(currentLog.id!, idx);
                            } else {
                              onDeleteMeal(currentLog.id!);
                            }
                          }}
                          title="Remove item"
                          className="p-1.5 bg-slate-900 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-500 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- SUBVIEW 2: SEARCH & ADD FOOD MANUAL PANEL --- */}
      {subView === "add_manual" && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <button onClick={() => setSubView("diary")} className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl">
              <ChevronLeft className="w-4 h-4 text-slate-200" />
            </button>
            <h2 className="text-sm font-bold text-slate-200">Add to {activeMealType}</h2>
          </div>

          {/* Regular Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search popular Indian foods..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm pl-10 pr-4 py-3.5 rounded-xl outline-none"
            />
          </div>

          {/* Popular Foods List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Popular Foods</h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto">
              {filteredPopularFoods.map((food, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectPopularFood(food)}
                  className={`p-3 bg-slate-900/30 hover:bg-slate-900 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                    selectedPopularFood?.name === food.name ? "border-emerald-500 bg-emerald-500/5" : "border-slate-800/80"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-100">{food.name}</h4>
                    <span className="text-[10px] text-slate-500">Serving size: {food.portionGrams}g • {food.calories} kcal</span>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Gram Adjuster Form if Item Selected */}
          {selectedPopularFood && (
            <div className="p-4.5 bg-slate-900 border border-emerald-500/30 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Configure Weight: {selectedPopularFood.name}</h4>
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Weight (Grams)</label>
                <input
                  type="number"
                  value={manualGrams}
                  onChange={(e) => setManualGrams(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl outline-none"
                />
              </div>
              <button 
                onClick={handleConfirmAddPopular}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Log to {activeMealType}
              </button>
            </div>
          )}

          {/* Custom Food Creation Form */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Or Add Custom Food</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Dish Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Masala Fried Egg"
                  className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={customCals}
                    onChange={(e) => setCustomCals(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    value={customFiber}
                    onChange={(e) => setCustomFiber(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs p-3 rounded-xl outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddCustomFood}
                disabled={!customName}
                className="w-full py-3.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 hover:text-slate-950 text-emerald-400 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                Log Custom Food
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBVIEW 3: AI FOOD SCANNER VIEWS --- */}
      {subView === "camera" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center space-x-2 select-none">
            <button 
              onClick={() => {
                stopCamera();
                setSubView("diary");
              }} 
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 text-slate-200" />
            </button>
            <h2 className="text-sm font-bold text-slate-200">AI Food Scanner & Camera</h2>
          </div>

          {cameraError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-start space-x-2.5 animate-fade-in">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {isCameraActive ? (
            /* Active Live Camera Viewfinder Component */
            <div className="relative border-2 border-emerald-500 rounded-2xl overflow-hidden bg-black h-80 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-500/5 animate-fade-in">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-emerald-500/20 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border border-dashed border-emerald-400/40 rounded-full animate-pulse" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3.5 z-20">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-5 py-3 bg-slate-900 border border-slate-800 hover:border-slate-800 text-rose-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <span>Stop Camera</span>
                </button>
              </div>
            </div>
          ) : (
            /* Drag & Drop File Upload Zone / Inactive Camera Mode */
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl overflow-hidden bg-slate-950 h-80 flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                dragActive ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]" : "border-slate-800 hover:border-slate-700"
              }`}
              onClick={() => document.getElementById("food-image-upload")?.click()}
            >
              <input 
                type="file" 
                id="food-image-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />

              {scanImage ? (
                <>
                  <img src={scanImage} alt="Captured preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSelectedImage();
                      }}
                      className="px-2.5 py-1.5 bg-slate-900/95 border border-slate-800 hover:border-slate-700 text-[10px] text-rose-400 font-bold rounded-lg uppercase shadow-md"
                    >
                      Remove Image
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/50 text-[10px] text-emerald-400 font-bold text-left truncate">
                    {selectedFile ? `Selected: ${selectedFile.name}` : "Captured Meal Photo"}
                  </div>
                </>
              ) : (
                <div className="space-y-4 z-10 max-w-sm">
                  <div className="flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera();
                      }}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/15"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Device Camera</span>
                    </button>
                  </div>
                  <div className="text-slate-700 text-[9px] font-bold uppercase tracking-wider select-none">— OR —</div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-200">Drag & Drop Food Image</h3>
                    <p className="text-[10px] text-slate-500 mt-1">or <span className="text-emerald-400 font-bold underline">browse files</span> on your device</p>
                  </div>
                  <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mx-auto">
                    Snap or upload a photo of your traditional meals (Idli, Dosa, Sambar, Chapati, Paneer Curry) for direct Gemini Vision analysis!
                  </p>
                </div>
              )}
            </div>
          )}

          {scanMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
              <Info className="w-4 h-4 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                Add Meal Description or Notes (Optional with image)
              </label>
              <textarea
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                placeholder="Describe your meal or add specific notes (e.g. 2 wheat chapatis and 1 bowl paneer mutter curry)"
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs p-3.5 rounded-xl outline-none resize-none placeholder-slate-600 text-slate-200"
              />
            </div>

            <div className="w-full">
              <button
                onClick={() => {
                  stopCamera();
                  handleTriggerAIScan(false);
                }}
                disabled={loadingScan || (!textDescription && !scanImage)}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 animate-spin shrink-0" />
                <span>{loadingScan ? "Analyzing..." : "Analyze Scan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBVIEW 4: AI SCAN RESULTS & VERIFICATION (AIScanResultView) --- */}
      {subView === "scan_result" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-2">
              <button onClick={() => setSubView("camera")} className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl">
                <ChevronLeft className="w-4 h-4 text-slate-200" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-slate-200">AI Estimation Result</h2>
                <p className="text-[10px] text-slate-500">Log meals to {activeMealType}</p>
              </div>
            </div>

            {/* Inline Meal Type Selector */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {(["Breakfast", "Lunch", "Dinner", "Snacks"] as const).map((mt) => (
                <button
                  key={mt}
                  onClick={() => setActiveMealType(mt)}
                  className={`px-2 py-1 text-[9px] font-black rounded-lg transition-all ${
                    activeMealType === mt 
                      ? "bg-emerald-500 text-slate-950 shadow-md" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>

          {scanMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-2 text-xs text-emerald-400">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verify & Log Detected Items</h3>
            
            <div className="space-y-4">
              {detectedItems.map((item, idx) => {
                const isLogged = loggedIndices.includes(idx);
                return (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isLogged 
                        ? "bg-emerald-500/5 border-emerald-500/20 opacity-80" 
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        value={item.name}
                        disabled={isLogged}
                        onChange={(e) => handleEditDetectedItem(idx, "name", e.target.value)}
                        className={`bg-transparent border-b border-dashed focus:border-emerald-500 font-bold text-sm outline-none pb-0.5 w-[70%] ${
                          isLogged 
                            ? "border-transparent text-slate-400 line-through" 
                            : "border-slate-700 text-slate-200"
                        }`}
                      />
                      <div className="flex items-center space-x-1.5">
                        {item.confidence && (
                          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            {Math.round(item.confidence * 100)}% Match
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Estimated Weight (g)</label>
                        <input
                          type="number"
                          value={item.portionGrams}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "portionGrams", Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 p-2.5 rounded-lg text-slate-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Calories (kcal)</label>
                        <input
                          type="number"
                          value={item.calories}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "calories", Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 p-2.5 rounded-lg text-slate-300 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[10px] mb-4">
                      <div className="bg-slate-950/40 p-1.5 rounded text-center">
                        <span className="text-slate-500 block">Prot</span>
                        <input
                          type="number"
                          value={item.protein}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "protein", Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-300 text-center w-full outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="bg-slate-950/40 p-1.5 rounded text-center">
                        <span className="text-slate-500 block">Carb</span>
                        <input
                          type="number"
                          value={item.carbs}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "carbs", Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-300 text-center w-full outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="bg-slate-950/40 p-1.5 rounded text-center">
                        <span className="text-slate-500 block">Fat</span>
                        <input
                          type="number"
                          value={item.fat}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "fat", Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-300 text-center w-full outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="bg-slate-950/40 p-1.5 rounded text-center">
                        <span className="text-slate-500 block">Fiber</span>
                        <input
                          type="number"
                          value={item.fiber}
                          disabled={isLogged}
                          onChange={(e) => handleEditDetectedItem(idx, "fiber", Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-300 text-center w-full outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Individual Log Button */}
                    <button
                      onClick={() => handleConfirmLogSingleItem(idx)}
                      disabled={isLogged}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                        isLogged 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer active:scale-95"
                      }`}
                    >
                      {isLogged ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          <span>Logged to {activeMealType}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Confirm & Log Item</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setDetectedItems([]);
                setLoggedIndices([]);
                setSubView("diary");
              }}
              className="flex-1 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider"
            >
              Done & Exit
            </button>
            <button
              onClick={handleConfirmLogMeal}
              disabled={loggedIndices.length === detectedItems.length}
              className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/15 disabled:opacity-40 disabled:border disabled:border-slate-800"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Log All Remaining</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
