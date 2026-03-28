import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEALS = [
  { key: 'morning',   label: 'Morning',   emoji: '🌅', placeholder: 'e.g. Oats, banana, green tea' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️', placeholder: 'e.g. Rice, dal, sabzi, salad' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎', placeholder: 'e.g. Fruits, nuts, yogurt' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙', placeholder: 'e.g. Roti, vegetables, soup' },
  { key: 'medicines', label: 'Medicines', emoji: '💊', placeholder: 'e.g. Metformin 500mg after lunch, Vitamin D at night' },
]
const WATER_GLASSES = 8

function getWeekKey() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  return monday.toISOString().split('T')[0]
}

function getTodayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

async function saveToBackend(weekKey, diet) {
  const token = localStorage.getItem('token')
  if (!token) return
  await axios.put(
    `${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription-health`,
    { weekKey, diet },
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

export default function WeeklyDietChart() {
  const weekKey = getWeekKey()
  const todayIdx = getTodayIndex()
  const storageKey = `diet_week_${weekKey}`

  const emptyDay = () => ({ morning: '', lunch: '', snack: '', dinner: '', medicines: '', water: 0, taken: false })
  const emptyWeek = () => DAYS.map(() => emptyDay())

  const [week, setWeek] = useState(() => {
    if (typeof window === 'undefined') return emptyWeek()
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : emptyWeek()
    } catch { return emptyWeek() }
  })
  const [activeDay, setActiveDay] = useState(todayIdx)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef(null)

  // On mount: push any existing localStorage data to backend immediately
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const hasContent = data.some(d => d.morning || d.lunch || d.snack || d.dinner || d.water > 0)
      if (hasContent) saveToBackend(weekKey, data)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep localStorage in sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(week))
    }
  }, [week, storageKey])

  // Auto-save to backend with debounce on every change
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveToBackend(weekKey, week)
    }, 1500)
    return () => clearTimeout(debounceRef.current)
  }, [week, weekKey])

  const updateMeal = (mealKey, value) => {
    setWeek(prev => {
      const next = [...prev]
      next[activeDay] = { ...next[activeDay], [mealKey]: value }
      return next
    })
  }

  const toggleWater = (glassIdx) => {
    setWeek(prev => {
      const next = [...prev]
      const current = next[activeDay].water
      const newWater = glassIdx < current ? glassIdx : glassIdx + 1
      next[activeDay] = { ...next[activeDay], water: newWater }
      return next
    })
  }

  const markTaken = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const updatedWeek = week.map((d, i) => i === activeDay ? { ...d, taken: true } : d)
      setWeek(updatedWeek)

      // Save immediately (not debounced) on explicit action
      await saveToBackend(weekKey, updatedWeek)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const day = week[activeDay]

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS.map((d, i) => {
          const isToday = i === todayIdx
          const isTaken = week[i].taken
          return (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeDay === i
                  ? 'bg-blue-600 text-white shadow-md'
                  : isToday
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{d}</span>
              {isTaken && <span className="text-green-400 text-xs">✓</span>}
              {isToday && !isTaken && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5"></span>}
            </button>
          )
        })}
      </div>

      {/* Meal inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MEALS.filter(m => m.key !== 'medicines').map(meal => (
          <div key={meal.key} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
              <span>{meal.emoji}</span>{meal.label}
            </label>
            <textarea
              rows={2}
              value={day[meal.key]}
              onChange={e => updateMeal(meal.key, e.target.value)}
              placeholder={meal.placeholder}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
        ))}
      </div>

      {/* Medicines */}
      <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-purple-700 mb-2">
          💊 Medicines
        </label>
        <textarea
          rows={2}
          value={day.medicines}
          onChange={e => updateMeal('medicines', e.target.value)}
          placeholder="e.g. Metformin 500mg after lunch, Vitamin D at night"
          className="w-full text-sm px-3 py-2 border border-purple-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
        />
      </div>

      {/* Water intake */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-blue-800">💧 Daily Water Intake</span>
          <span className="text-sm font-bold text-blue-700">{day.water} / {WATER_GLASSES} glasses</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: WATER_GLASSES }).map((_, i) => {
            const filled = i < day.water
            return (
              <button
                key={i}
                onClick={() => toggleWater(i)}
                title={filled ? 'Click to unfill' : 'Click to fill'}
                className={`w-10 h-12 rounded-lg border-2 transition-all flex flex-col items-center justify-end pb-1 ${
                  filled ? 'border-blue-400 bg-blue-400' : 'border-blue-200 bg-white hover:border-blue-400'
                }`}
              >
                {filled
                  ? <span className="text-white text-xs">💧</span>
                  : <span className="text-blue-200 text-xs">○</span>
                }
              </button>
            )
          })}
        </div>
        <div className="mt-2 w-full bg-blue-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(day.water / WATER_GLASSES) * 100}%` }}
          />
        </div>
      </div>

      {/* Mark as taken */}
      <button
        onClick={markTaken}
        disabled={saving || day.taken}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          day.taken
            ? 'bg-green-100 text-green-700 cursor-default'
            : saving
            ? 'bg-gray-200 text-gray-400 cursor-wait'
            : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
        }`}
      >
        {day.taken ? '✓ Marked as Taken' : saving ? 'Saving...' : saved ? '✓ Saved!' : '✅ Mark as Taken'}
      </button>
    </div>
  )
}
