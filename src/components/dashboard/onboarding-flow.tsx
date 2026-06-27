'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  UploadCloud, 
  TrendingUp, 
  Globe, 
  Layers, 
  User,
  Check,
  Search,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { COUNTRIES, CITIES_MAPPING } from '@/utils/countries-data';

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  userName: string;
  onComplete: (profileData: any) => void;
  onSkip: () => void;
  initialStep?: number;
}

export function OnboardingFlow({ 
  userId, 
  userEmail,
  userName, 
  onComplete, 
  onSkip,
  initialStep = 0
}: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(initialStep); // 0-4 splash, 5-11 profile wizard steps (1 to 7 review)
  const [searchHomeCountry, setSearchHomeCountry] = useState('');
  const [searchStudyCountry, setSearchStudyCountry] = useState('');
  const [searchHomeCity, setSearchHomeCity] = useState('');
  const [searchStudyCity, setSearchStudyCity] = useState('');

  // Form states
  const [fullName, setFullName] = useState(userName || '');
  const [homeCountry, setHomeCountry] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homeCurrency, setHomeCurrency] = useState<{ code: string; symbol: string; name: string } | null>(null);

  const [studyCountry, setStudyCountry] = useState('');
  const [studyCity, setStudyCity] = useState('');
  const [studyCurrency, setStudyCurrency] = useState<{ code: string; symbol: string; name: string } | null>(null);

  const [preferredCurrency, setPreferredCurrency] = useState<{ code: string; symbol: string; name: string } | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  // Auto-detect currencies from country selections
  useEffect(() => {
    if (homeCountry) {
      const match = COUNTRIES.find(c => c.name.toLowerCase() === homeCountry.toLowerCase());
      if (match) {
        setHomeCurrency({ code: match.code, symbol: match.symbol, name: match.nameCurrency });
      }
    }
  }, [homeCountry]);

  useEffect(() => {
    if (studyCountry) {
      const match = COUNTRIES.find(c => c.name.toLowerCase() === studyCountry.toLowerCase());
      if (match) {
        setStudyCurrency({ code: match.code, symbol: match.symbol, name: match.nameCurrency });
      }
    }
  }, [studyCountry]);

  // Set default preferred currency in step 6
  useEffect(() => {
    if (homeCurrency && studyCurrency) {
      if (homeCurrency.code === studyCurrency.code) {
        setPreferredCurrency(homeCurrency);
      } else {
        setPreferredCurrency(studyCurrency);
      }
    }
  }, [homeCurrency, studyCurrency]);

  const saveStepProgress = async (stepNumber: number, extraData = {}) => {
    setSavingProgress(true);
    try {
      const payload = {
        fullName,
        homeCountry,
        homeCity,
        homeCurrency,
        studyCountry,
        studyCity,
        studyCurrency,
        preferredCurrency,
        lastCompletedStep: stepNumber,
        introScreensCompleted: currentScreen >= 4,
        profileCompleted: false,
        onboardingCompleted: false,
        ...extraData
      };

      await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload })
      });
    } catch (e) {
      console.error('Failed to auto-save onboarding progress:', e);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleNext = async () => {
    if (currentScreen < 4) {
      setCurrentScreen(prev => prev + 1);
    } else if (currentScreen === 4) {
      // Finished splash screens, transition to Profile Setup Wizard Step 1 (Screen 5)
      await saveStepProgress(0, { introScreensCompleted: true });
      setCurrentScreen(5);
    } else {
      // Wizard Steps (5 is Step 1, 11 is Step 7 Review)
      const wizardStep = currentScreen - 4; // 1 to 7
      if (wizardStep === 1 && !fullName.trim()) return;
      if (wizardStep === 2 && !homeCountry) return;
      if (wizardStep === 3 && !homeCity.trim()) return;
      if (wizardStep === 4 && !studyCountry) return;
      if (wizardStep === 5 && !studyCity.trim()) return;
      if (wizardStep === 6 && !preferredCurrency) return;

      // Save state progress to DB
      await saveStepProgress(wizardStep);
      
      setCurrentScreen(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    setSavingProgress(true);
    try {
      const payload = {
        fullName,
        homeCountry,
        homeCity,
        homeCurrency,
        studyCountry,
        studyCity,
        studyCurrency,
        preferredCurrency,
        lastCompletedStep: 7,
        introScreensCompleted: true,
        profileCompleted: true,
        onboardingCompleted: true,
      };

      const res = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload })
      });

      if (res.ok) {
        onComplete(payload);
      }
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
    } finally {
      setSavingProgress(false);
    }
  };

  // Skip introduction screens
  const handleSkipIntro = async () => {
    await saveStepProgress(0, { 
      introScreensCompleted: false, 
      profileCompleted: false, 
      onboardingCompleted: false 
    });
    onSkip();
  };

  const splashScreens = [
    {
      title: "Welcome to Your AI Financial Companion",
      description: "Manage your expenses effortlessly, track your spending habits, receive AI-powered insights, and stay financially organized from one intelligent platform.",
      icon: <Sparkles className="h-16 w-16 text-primary animate-pulse" />
    },
    {
      title: "Scan Bills in Seconds",
      description: "Upload receipts or invoices and let AI automatically extract Merchant, Amount, Category, Date, and Currency. No manual data entry required.",
      icon: <UploadCloud className="h-16 w-16 text-primary" />
    },
    {
      title: "Understand Your Spending",
      description: "Receive intelligent financial insights such as spending trends, budget warnings, monthly summaries, saving suggestions, and personalized AI recommendations.",
      icon: <TrendingUp className="h-16 w-16 text-primary" />
    },
    {
      title: "Built for International Students",
      description: "Track expenses across different countries. Automatically compare your native home currency and study country currency to view expenses in the currency that matters most.",
      icon: <Globe className="h-16 w-16 text-primary animate-spin-slow" />
    },
    {
      title: "Everything Organized",
      description: "Stay organized using custom categories, budgets, AI search, reports, and smart filters to master your academic finances.",
      icon: <Layers className="h-16 w-16 text-primary" />
    }
  ];

  const filteredHomeCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchHomeCountry.toLowerCase())
  );

  const filteredStudyCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchStudyCountry.toLowerCase())
  );

  const homeCountryCities = homeCountry ? (CITIES_MAPPING[homeCountry] || []) : [];
  const studyCountryCities = studyCountry ? (CITIES_MAPPING[studyCountry] || []) : [];

  const filteredHomeCities = homeCountryCities.filter(city =>
    city.toLowerCase().includes(searchHomeCity.toLowerCase())
  );

  const filteredStudyCities = studyCountryCities.filter(city =>
    city.toLowerCase().includes(searchStudyCity.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080c] p-4 overflow-y-auto">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl flex flex-col justify-between min-h-[480px]">
        {savingProgress && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>Saving progress...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentScreen < 5 ? (
            /* Part 1: Introduction Splash Screens */
            <motion.div
              key={`intro-${currentScreen}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              {/* Header Step Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {splashScreens.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentScreen ? 'w-6 bg-primary' : 'w-2 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleSkipIntro}
                  className="text-xs text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  Skip intro
                </button>
              </div>

              {/* Graphic Icon */}
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                {splashScreens[currentScreen].icon}
              </div>

              {/* Text Context */}
              <div className="text-center space-y-3">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">{splashScreens[currentScreen].title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{splashScreens[currentScreen].description}</p>
              </div>

              {/* Controls */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                {currentScreen > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer"
                >
                  {currentScreen === 4 ? 'Continue Setup' : 'Get Started'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Part 3: Profile Setup Wizard steps */
            <motion.div
              key={`wizard-${currentScreen}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              {/* Counter / Progress Header */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                  <span className="uppercase tracking-widest text-primary">Profile Setup</span>
                  <span>Step {currentScreen - 4} of 7</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                    style={{ width: `${((currentScreen - 4) / 7) * 100}%` }}
                  />
                </div>
              </div>

              {/* Form step render switch */}
              <div className="flex-1 py-2 overflow-y-auto max-h-[300px] scrollbar-thin">
                {currentScreen === 5 && (
                  /* Step 1: Personal Info */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Personal Information</h4>
                      <p className="text-xs text-muted-foreground">Enter your name as it should appear on reports.</p>
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        placeholder="Mohammed Zeeshan"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                )}

                {currentScreen === 6 && (
                  /* Step 2: Home Country */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">What is your home country?</h4>
                      <p className="text-xs text-muted-foreground">This helps determine your native currency parameters.</p>
                    </div>
                    <div className="space-y-2 pt-2 relative">
                      <label className="text-xs font-semibold text-muted-foreground">Home Country</label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchHomeCountry}
                          onChange={e => {
                            setSearchHomeCountry(e.target.value);
                            setHomeCountry('');
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      
                      {!homeCountry && searchHomeCountry && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-[#181920] border border-white/10 rounded-xl divide-y divide-white/5 shadow-2xl">
                          {filteredHomeCountries.map(c => (
                            <button
                              key={c.name}
                              onClick={() => {
                                setHomeCountry(c.name);
                                setSearchHomeCountry(c.name);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors font-medium flex justify-between"
                            >
                              <span>{c.name}</span>
                              <span className="text-primary font-bold">{c.code} ({c.symbol})</span>
                            </button>
                          ))}
                          {filteredHomeCountries.length === 0 && (
                            <div className="p-3 text-center text-xs text-muted-foreground">No matches found</div>
                          )}
                        </div>
                      )}

                      {homeCurrency && (
                        <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs flex justify-between items-center text-primary-foreground font-semibold">
                          <span>Detected native currency:</span>
                          <span>{homeCurrency.symbol} {homeCurrency.name} ({homeCurrency.code})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentScreen === 7 && (
                  /* Step 3: Home City */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Home City</h4>
                      <p className="text-xs text-muted-foreground">Select or type your home hometown city.</p>
                    </div>
                    <div className="space-y-2 pt-2 relative">
                      <label className="text-xs font-semibold text-muted-foreground">Home City</label>
                      <input
                        type="text"
                        placeholder="Search or enter city..."
                        value={homeCity}
                        onChange={e => {
                          setHomeCity(e.target.value);
                          setSearchHomeCity(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      />

                      {searchHomeCity && homeCountryCities.length > 0 && homeCity !== searchHomeCity && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-[#181920] border border-white/10 rounded-xl divide-y divide-white/5 shadow-2xl">
                          {filteredHomeCities.map(city => (
                            <button
                              key={city}
                              onClick={() => {
                                setHomeCity(city);
                                setSearchHomeCity(city);
                              }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-colors font-semibold"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentScreen === 8 && (
                  /* Step 4: Study Country */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Where are you currently studying?</h4>
                      <p className="text-xs text-muted-foreground">This sets your local conversion and regional costs logic.</p>
                    </div>
                    <div className="space-y-2 pt-2 relative">
                      <label className="text-xs font-semibold text-muted-foreground">Study Country</label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchStudyCountry}
                          onChange={e => {
                            setSearchStudyCountry(e.target.value);
                            setStudyCountry('');
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                        />
                      </div>

                      {!studyCountry && searchStudyCountry && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-[#181920] border border-white/10 rounded-xl divide-y divide-white/5 shadow-2xl">
                          {filteredStudyCountries.map(c => (
                            <button
                              key={c.name}
                              onClick={() => {
                                setStudyCountry(c.name);
                                setSearchStudyCountry(c.name);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors font-medium flex justify-between"
                            >
                              <span>{c.name}</span>
                              <span className="text-primary font-bold">{c.code} ({c.symbol})</span>
                            </button>
                          ))}
                          {filteredStudyCountries.length === 0 && (
                            <div className="p-3 text-center text-xs text-muted-foreground">No matches found</div>
                          )}
                        </div>
                      )}

                      {studyCurrency && (
                        <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs flex justify-between items-center text-primary-foreground font-semibold">
                          <span>Detected study currency:</span>
                          <span>{studyCurrency.symbol} {studyCurrency.name} ({studyCurrency.code})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentScreen === 9 && (
                  /* Step 5: Study City */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Study City</h4>
                      <p className="text-xs text-muted-foreground">Enter the city location of your study institution.</p>
                    </div>
                    <div className="space-y-2 pt-2 relative">
                      <label className="text-xs font-semibold text-muted-foreground">Study City</label>
                      <input
                        type="text"
                        placeholder="Search or enter city..."
                        value={studyCity}
                        onChange={e => {
                          setStudyCity(e.target.value);
                          setSearchStudyCity(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      />

                      {searchStudyCity && studyCountryCities.length > 0 && studyCity !== searchStudyCity && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-[#181920] border border-white/10 rounded-xl divide-y divide-white/5 shadow-2xl">
                          {filteredStudyCities.map(city => (
                            <button
                              key={city}
                              onClick={() => {
                                setStudyCity(city);
                                setSearchStudyCity(city);
                              }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-colors font-semibold"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentScreen === 10 && (
                  /* Step 6: Preferred Currency */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Select Preferred Currency</h4>
                      <p className="text-xs text-muted-foreground">Which currency should display throughout the main application?</p>
                    </div>
                    <div className="space-y-2.5 pt-2">
                      <label className="text-xs font-semibold text-muted-foreground">Preferred Currency</label>
                      
                      <div className="grid gap-2.5">
                        {/* Auto suggestions */}
                        {homeCurrency && (
                          <button
                            type="button"
                            onClick={() => setPreferredCurrency(homeCurrency)}
                            className={`p-3.5 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-all ${
                              preferredCurrency?.code === homeCurrency.code 
                                ? 'bg-primary/10 border-primary text-primary-foreground' 
                                : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <span className="block font-bold">Home Native Currency</span>
                              <span className="text-[11px] font-normal">{homeCurrency.name}</span>
                            </div>
                            <span className="text-sm font-black">{homeCurrency.symbol} {homeCurrency.code}</span>
                          </button>
                        )}

                        {studyCurrency && studyCurrency.code !== homeCurrency?.code && (
                          <button
                            type="button"
                            onClick={() => setPreferredCurrency(studyCurrency)}
                            className={`p-3.5 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-all ${
                              preferredCurrency?.code === studyCurrency.code 
                                ? 'bg-primary/10 border-primary text-primary-foreground' 
                                : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <span className="block font-bold">(Recommended) Study Country Currency</span>
                              <span className="text-[11px] font-normal">{studyCurrency.name}</span>
                            </div>
                            <span className="text-sm font-black">{studyCurrency.symbol} {studyCurrency.code}</span>
                          </button>
                        )}

                        {/* Dropdown for other currencies */}
                        <div className="mt-1">
                          <span className="text-[10px] text-muted-foreground font-semibold block mb-1">Or select a different global currency:</span>
                          <select
                            onChange={e => {
                              const match = COUNTRIES.find(c => c.code === e.target.value);
                              if (match) {
                                setPreferredCurrency({ code: match.code, symbol: match.symbol, name: match.nameCurrency });
                              }
                            }}
                            value={preferredCurrency?.code || 'USD'}
                            className="w-full px-4 py-3 bg-[#13141b] border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none"
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.symbol}) - {c.nameCurrency}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentScreen === 11 && (
                  /* Step 7: Review Details */
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold">Review Your Profile</h4>
                      <p className="text-xs text-muted-foreground">Ensure all registered study coordinates and preferences are correct.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 divide-y divide-white/5 text-xs text-muted-foreground space-y-2">
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Full Name:</span>
                        <span className="text-white font-bold">{fullName}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Home Country:</span>
                        <span className="text-white font-bold">{homeCountry}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Home City:</span>
                        <span className="text-white font-bold">{homeCity}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Home Currency:</span>
                        <span className="text-white font-bold">{homeCurrency?.symbol} {homeCurrency?.code}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Study Country:</span>
                        <span className="text-white font-bold">{studyCountry}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Study City:</span>
                        <span className="text-white font-bold">{studyCity}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Study Currency:</span>
                        <span className="text-white font-bold">{studyCurrency?.symbol} {studyCurrency?.code}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-transparent">
                        <span className="font-semibold">Preferred App Currency:</span>
                        <span className="text-primary-foreground font-black bg-primary/20 border border-primary/20 px-2 py-0.5 rounded">{preferredCurrency?.symbol} {preferredCurrency?.code}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                
                {currentScreen === 11 ? (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    Finish Setup
                    <CheckCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
