import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

const METRICS = [
  { key: 'weight',   label: 'Weight',   unit: 'kg',    emoji: '⚖️',  type: 'number', target: null,  color: 'blue',   max: 150 },
  { key: 'steps',    label: 'Steps',    unit: 'steps', emoji: '👟',  type: 'number', target: 10000, color: 'green',  max: 20000 },
  { key: 'sleep',    label: 'Sleep',    unit: 'hrs',   emoji: '😴',  type: 'number', target: 8,     color: 'indigo', max: 12 },
  { key: 'calories', label: 'Calories', unit: 'kcal',  emoji: '🔥',  type: 'number', target: 2000,  color: 'orange', max: 3000 },
  { key: 'exercise', label: 'Exercise', unit: 'min',   emoji: '🏃',  type: 'number', target: 30,    color: 'red',    max: 120 },
  { key: 'mood',     label: 'Mood',     unit: '/5',    emoji: '😊',  type: 'rating', target: 5,     color: 'yellow', max: 5 },
]

const COLOR_MAP = {
  blue:   { bar: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  green:  { bar: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  orange: { bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  red:    { bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  yellow: { bar: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
}

async function saveToBackend(weekKey, progress, stepTarget) {
  const token = localStorage.getItem('token')
  if (!token) return
  await axios.put(
    `${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription-health`,
    { weekKey, progress, stepTarget },
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

export default function SubscriptionProgressBoard() {
  const weekKey = getWeekKey()
  const todayIdx = getTodayIndex()
  const storageKey = `progress_week_${weekKey}`

  const emptyDay = () => Object.fromEntries(METRICS.map(m => [m.key, '']))
  const emptyWeek = () => DAYS.map(() => emptyDay())

  const [week, setWeek] = useState(() => {
    if (typeof window === 'undefined') return emptyWeek()
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : emptyWeek()
    } catch { return emptyWeek() }
  })
  const [activeDay, setActiveDay] = useState(todayIdx)
  const [stepTarget, setStepTarget] = useState(() => {
    if (typeof window === 'undefined') return 10000
    return Number(localStorage.getItem('step_target') || 10000)
  })
  const [editingTarget, setEditingTarget] = useState(false)
  const [tempTarget, setTempTarget] = useState(stepTarget)
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
      const hasContent = data.some(d => Object.values(d).some(v => Number(v) > 0))
      if (hasContent) saveToBackend(weekKey, data, Number(localStorage.getItem('step_target') || 10000))
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
      saveToBackend(weekKey, week, stepTarget)
    }, 1500)
    return () => clearTimeout(debounceRef.current)
  }, [week, weekKey, stepTarget])

  const updateMetric = (key, value) => {
    setWeek(prev => {
      const next = [...prev]
      next[activeDay] = { ...next[activeDay], [key]: value }
      return next
    })
  }

  const saveDay = async () => {
    await saveToBackend(weekKey, week, stepTarget)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const day = week[activeDay]

  const weeklyAvg = (key) => {
    const vals = week.map(d => Number(d[key])).filter(v => v > 0)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }

  const pct = (val, max) => Math.min(100, Math.round((val / max) * 100))

  return (
    <div className="space-y-5">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS.map((d, i) => {
          const isToday = i === todayIdx
          const hasData = Object.values(week[i]).some(v => v !== '')
          return (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeDay === i
                  ? 'bg-purple-600 text-white shadow-md'
                  : isToday
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{d}</span>
              {hasData && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-0.5"></span>}
            </button>
          )
        })}
      </div>

      {/* Metric inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METRICS.map(metric => {
          const c = COLOR_MAP[metric.color]
          const isSteps = metric.key === 'steps'
          const target = isSteps ? stepTarget : metric.target
          const val = Number(day[metric.key]) || 0
          const progress = target ? pct(val, target) : pct(val, metric.max)

          return (
            <div key={metric.key} className={`${c.bg} border ${c.border} rounded-xl p-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  {metric.emoji} {metric.label}
                </span>
                {target && (
                  <span className={`text-xs ${c.text} font-medium`}>
                    Target: {isSteps ? stepTarget.toLocaleString() : target} {metric.unit}
                  </span>
                )}
              </div>

              {metric.type === 'rating' ? (
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => updateMetric(metric.key, n)}
                      className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                        Number(day[metric.key]) >= n
                          ? 'bg-yellow-400 text-white'
                          : 'bg-white border border-gray-200 text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  value={day[metric.key]}
                  onChange={e => updateMetric(metric.key, e.target.value)}
                  placeholder={`Enter ${metric.label.toLowerCase()}`}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              )}

              {(val > 0 || target) && (
                <div className="mt-2">
                  <div className="w-full bg-white rounded-full h-2 shadow-inner">
                    <div className={`${c.bar} h-2 rounded-full transition-all`} style={{ width: `${progress}%` }} />
                  </div>
                  {target && (
                    <p className={`text-xs ${c.text} mt-0.5`}>
                      {val} / {isSteps ? stepTarget.toLocaleString() : target} {metric.unit} ({progress}%)
                    </p>
                  )}
                </div>
              )}

              {isSteps && (
                <div className="mt-2">
                  {editingTarget ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={tempTarget}
                        onChange={e => setTempTarget(Number(e.target.value))}
                        className="w-28 px-2 py-1 border border-gray-200 rounded text-xs"
                      />
                      <button
                        onClick={() => {
                          setStepTarget(tempTarget)
                          localStorage.setItem('step_target', tempTarget)
                          setEditingTarget(false)
                        }}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                      >Save</button>
                      <button onClick={() => setEditingTarget(false)} className="text-xs text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setTempTarget(stepTarget); setEditingTarget(true) }} className="text-xs text-green-600 underline">
                      Change target
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={saveDay}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm"
      >
        {saved ? '✓ Saved!' : '💾 Save Today\'s Progress'}
      </button>

      {/* Weekly Progress Bars */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-gray-800 mb-4 text-sm">📊 Weekly Averages</h4>
        <div className="space-y-3">
          {METRICS.map(metric => {
            const avg = weeklyAvg(metric.key)
            const target = metric.key === 'steps' ? stepTarget : metric.target
            const progress = target ? pct(avg, target) : pct(avg, metric.max)
            const c = COLOR_MAP[metric.color]
            if (avg === 0) return null
            return (
              <div key={metric.key}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{metric.emoji} {metric.label}</span>
                  <span className="font-medium">{avg} {metric.unit}{target ? ` / ${metric.key === 'steps' ? stepTarget.toLocaleString() : target}` : ''}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${c.bar} h-3 rounded-full transition-all flex items-center justify-end pr-1`}
                    style={{ width: `${progress}%` }}
                  >
                    {progress >= 20 && <span className="text-white text-xs font-bold">{progress}%</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5">
          <h4 className="font-bold text-gray-800 mb-3 text-sm">📅 Daily Steps This Week</h4>
          <div className="flex items-end gap-1.5 h-24">
            {DAYS.map((d, i) => {
              const val = Number(week[i].steps) || 0
              const h = stepTarget > 0 ? Math.round((val / stepTarget) * 100) : 0
              const isToday = i === todayIdx
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-green-500' : 'bg-green-200'}`}
                      style={{ height: `${Math.max(h, val > 0 ? 5 : 0)}%` }}
                      title={`${val.toLocaleString()} steps`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{d}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>{stepTarget.toLocaleString()} steps target</span>
          </div>
        </div>
      </div>
    </div>
  )
}
