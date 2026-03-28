import { useState, useEffect } from 'react'
import axios from 'axios'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEALS = [
  { key: 'morning',   label: 'Morning',   emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'medicines', label: 'Medicines', emoji: '💊' },
]
const METRICS = [
  { key: 'weight',   label: 'Weight',   unit: 'kg',    emoji: '⚖️',  color: 'blue',   max: 150 },
  { key: 'steps',    label: 'Steps',    unit: 'steps', emoji: '👟',  color: 'green',  max: 20000 },
  { key: 'sleep',    label: 'Sleep',    unit: 'hrs',   emoji: '😴',  color: 'indigo', max: 12 },
  { key: 'calories', label: 'Calories', unit: 'kcal',  emoji: '🔥',  color: 'orange', max: 3000 },
  { key: 'exercise', label: 'Exercise', unit: 'min',   emoji: '🏃',  color: 'red',    max: 120 },
  { key: 'mood',     label: 'Mood',     unit: '/5',    emoji: '😊',  color: 'yellow', max: 5 },
]
const COLOR_MAP = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  indigo: 'bg-indigo-500',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
  yellow: 'bg-yellow-400',
}

export default function PatientHealthDataView({ patientId, patientName }) {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeWeek, setActiveWeek] = useState(0)
  const [activeDay, setActiveDay] = useState(0)
  const [view, setView] = useState('diet')

  useEffect(() => {
    if (!patientId) { setLoading(false); return }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription-health/${patientId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setWeeks(res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load health data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [patientId])

  if (loading) return (
    <div className="py-6 text-center">
      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
      <p className="text-xs text-gray-400 mt-2">Loading health data...</p>
    </div>
  )

  if (error) return (
    <div className="py-4 text-center text-sm text-red-400 bg-red-50 rounded-lg">{error}</div>
  )

  if (weeks.length === 0) return (
    <div className="py-6 text-center text-sm text-gray-400">
      No health data recorded yet by {patientName}.
    </div>
  )

  const week = weeks[activeWeek]
  const diet = week?.diet || []
  const progress = week?.progress || []
  const stepTarget = week?.stepTarget || 10000
  const day = view === 'diet' ? (diet[activeDay] || {}) : (progress[activeDay] || {})

  const weeklyAvg = (key) => {
    const vals = progress.map(d => Number(d[key])).filter(v => v > 0)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }
  const pct = (val, max) => Math.min(100, Math.round((val / max) * 100))

  return (
    <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">

      {/* Week selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Week:</span>
        {weeks.map((w, i) => (
          <button
            key={w.weekKey}
            onClick={() => { setActiveWeek(i); setActiveDay(0) }}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${
              activeWeek === i
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {w.weekKey}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('diet')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            view === 'diet' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          🥗 Diet Chart
        </button>
        <button
          onClick={() => setView('progress')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            view === 'progress' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          📊 Progress
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto">
        {DAYS.map((d, i) => {
          const hasDiet = diet[i] && Object.values(diet[i]).some(v => v && v !== false && v !== 0)
          const hasProgress = progress[i] && Object.values(progress[i]).some(v => Number(v) > 0)
          const hasData = view === 'diet' ? hasDiet : hasProgress
          return (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDay === i
                  ? view === 'diet' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {d}
              {hasData && <span className="w-1 h-1 rounded-full bg-green-400 mt-0.5"></span>}
            </button>
          )
        })}
      </div>

      {/* ── Diet view ── */}
      {view === 'diet' && (
        <div className="space-y-2">
          {MEALS.map(meal => (
            <div
              key={meal.key}
              className={`rounded-lg px-3 py-2 border ${
                meal.key === 'medicines'
                  ? 'bg-purple-50 border-purple-100'
                  : 'bg-white border-gray-100'
              }`}
            >
              <span className={`text-xs font-semibold ${meal.key === 'medicines' ? 'text-purple-600' : 'text-gray-500'}`}>
                {meal.emoji} {meal.label}
              </span>
              <p className="text-sm text-gray-800 mt-0.5">
                {day[meal.key] || <span className="text-gray-300 italic">Not logged</span>}
              </p>
            </div>
          ))}

          {/* Water */}
          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">💧 Water</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-5 rounded-sm border ${
                    i < (day.water || 0) ? 'bg-blue-400 border-blue-400' : 'bg-white border-blue-200'
                  }`}
                />
              ))}
              <span className="text-xs text-blue-700 ml-1 font-medium">{day.water || 0}/8</span>
            </div>
          </div>

          {day.taken && (
            <div className="text-xs text-green-600 font-medium text-center bg-green-50 rounded-lg py-1.5">
              ✓ Patient marked this day as taken
            </div>
          )}
        </div>
      )}

      {/* ── Progress view ── */}
      {view === 'progress' && (
        <div className="space-y-3">

          {/* Day metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {METRICS.map(m => {
              const val = Number(day[m.key]) || 0
              if (!val) return null
              const target = m.key === 'steps' ? stepTarget : m.max
              const p = pct(val, target)
              return (
                <div key={m.key} className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">{m.emoji} {m.label}</span>
                    <span className="text-xs font-bold text-gray-800">{val} {m.unit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`${COLOR_MAP[m.color]} h-1.5 rounded-full`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weekly averages */}
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">� Weekly Averages</p>
            <div className="space-y-2">
              {METRICS.map(m => {
                const avg = weeklyAvg(m.key)
                if (!avg) return null
                const target = m.key === 'steps' ? stepTarget : m.max
                const p = pct(avg, target)
                return (
                  <div key={m.key}>
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{m.emoji} {m.label}</span>
                      <span className="font-medium">{avg} {m.unit}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${COLOR_MAP[m.color]} h-2 rounded-full`} style={{ width: `${p}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Steps bar chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">👟 Daily Steps</p>
            <div className="flex items-end gap-1 h-16">
              {DAYS.map((d, i) => {
                const val = Number(progress[i]?.steps) || 0
                const h = stepTarget > 0 ? Math.round((val / stepTarget) * 100) : 0
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
                      <div
                        className={`w-full rounded-t ${i === activeDay ? 'bg-green-500' : 'bg-green-200'}`}
                        style={{ height: `${Math.max(h, val > 0 ? 8 : 0)}%` }}
                        title={`${val.toLocaleString()} steps`}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{d}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>0</span>
              <span>Target: {stepTarget.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
