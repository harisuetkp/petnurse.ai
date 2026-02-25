/**
 * Pool of rotating daily pet health tips with translation keys.
 * One tip is shown per day based on the day-of-year index.
 */
export interface DailyTip {
  emoji: string;
  titleKey: string;
  contentKey: string;
}

export const dailyTips: DailyTip[] = [
  { emoji: "🦷", titleKey: "tip.dentalHealth", contentKey: "tip.dentalContent" },
  { emoji: "💧", titleKey: "tip.hydrationCheck", contentKey: "tip.hydrationContent" },
  { emoji: "🏃", titleKey: "tip.dailyExercise", contentKey: "tip.exerciseContent" },
  { emoji: "🐾", titleKey: "tip.pawInspection", contentKey: "tip.pawContent" },
  { emoji: "👂", titleKey: "tip.earCare", contentKey: "tip.earContent" },
  { emoji: "⚖️", titleKey: "tip.weightMonitoring", contentKey: "tip.weightContent" },
  { emoji: "🥦", titleKey: "tip.healthyTreats", contentKey: "tip.treatsContent" },
  { emoji: "😴", titleKey: "tip.sleepQuality", contentKey: "tip.sleepContent" },
  { emoji: "🧴", titleKey: "tip.groomingRoutine", contentKey: "tip.groomingContent" },
  { emoji: "🌡️", titleKey: "tip.temperatureSafety", contentKey: "tip.temperatureContent" },
  { emoji: "💊", titleKey: "tip.medicationTiming", contentKey: "tip.medicationContent" },
  { emoji: "🧠", titleKey: "tip.mentalStimulation", contentKey: "tip.mentalContent" },
  { emoji: "🌿", titleKey: "tip.toxicPlants", contentKey: "tip.toxicContent" },
  { emoji: "🔍", titleKey: "tip.bodyCheck", contentKey: "tip.bodyContent" },
  { emoji: "🎾", titleKey: "tip.socialization", contentKey: "tip.socializationContent" },
  { emoji: "🚿", titleKey: "tip.bathTime", contentKey: "tip.bathContent" },
  { emoji: "🦴", titleKey: "tip.jointHealth", contentKey: "tip.jointContent" },
  { emoji: "👀", titleKey: "tip.eyeCare", contentKey: "tip.eyeContent" },
  { emoji: "🍽️", titleKey: "tip.feedingSchedule", contentKey: "tip.feedingContent" },
  { emoji: "🐛", titleKey: "tip.parasitePrevention", contentKey: "tip.parasiteContent" },
  { emoji: "🏥", titleKey: "tip.annualCheckups", contentKey: "tip.annualContent" },
  { emoji: "😰", titleKey: "tip.stressSigns", contentKey: "tip.stressContent" },
  { emoji: "🧊", titleKey: "tip.summerSafety", contentKey: "tip.summerContent" },
  { emoji: "❄️", titleKey: "tip.winterCare", contentKey: "tip.winterContent" },
  { emoji: "🎵", titleKey: "tip.calmingMusic", contentKey: "tip.calmingContent" },
  { emoji: "📦", titleKey: "tip.safeSpace", contentKey: "tip.safeSpaceContent" },
  { emoji: "🥗", titleKey: "tip.portionControl", contentKey: "tip.portionContent" },
  { emoji: "🩺", titleKey: "tip.knowVitals", contentKey: "tip.vitalsContent" },
  { emoji: "💉", titleKey: "tip.vaccineSchedule", contentKey: "tip.vaccineContent" },
  { emoji: "🐱", titleKey: "tip.litterBox", contentKey: "tip.litterContent" },
  { emoji: "🌤️", titleKey: "tip.sunscreen", contentKey: "tip.sunscreenContent" },
];

/**
 * Returns today's tip based on day-of-year, cycling through the pool.
 */
export function getTodaysTip(): DailyTip {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return dailyTips[dayOfYear % dailyTips.length];
}
