'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Calendar,
  Layers,
  Flame,
  Droplet,
  Compass,
  Wind,
  Check,
  RotateCw,
  Share2,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Heart,
} from 'lucide-react'
import type { WeeklyMenu, WeeklyMenuMeal } from '@/lib/wtenClient'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

const PLANETARY_HOUR_RULERS = {
  0: { planet: 'Sun', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', glyph: '☀️' },
  1: { planet: 'Moon', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5', glyph: '🌙' },
  2: { planet: 'Mars', color: 'text-red-400 border-red-500/20 bg-red-500/5', glyph: '♂️' },
  3: {
    planet: 'Mercury',
    color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    glyph: '☿',
  },
  4: {
    planet: 'Jupiter',
    color: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
    glyph: '♃',
  },
  5: { planet: 'Venus', color: 'text-pink-400 border-pink-500/20 bg-pink-500/5', glyph: '♀' },
  6: { planet: 'Saturn', color: 'text-slate-400 border-slate-500/20 bg-slate-500/5', glyph: '♄' },
}

interface WeeklyMenuPlannerProps {
  agentId: string
  agentName: string
  onClose?: () => void
}

export default function WeeklyMenuPlanner({ agentId, agentName, onClose }: WeeklyMenuPlannerProps) {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedMeal, setSelectedMeal] = useState<WeeklyMenuMeal | null>(null)
  const [activeTab, setActiveTab] = useState<'planner' | 'grocery'>('planner')

  useEffect(() => {
    fetchMenu()
  }, [agentId])

  const fetchMenu = async (regenerate = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/menu-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          regenerate,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate weekly menu')
      const data = await res.json()
      if (data.success) {
        setMenu(data.menu)
        if (regenerate) {
          toast.success('Successfully regenerated cosmic menu!')
        }
      } else {
        throw new Error(data.error || 'Failed to generate weekly menu')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error occurred during menu generation')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!menu) return
    setPublishing(true)
    try {
      const res = await fetch('/api/menu-planner/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...menu,
          status: 'completed',
          shareToFeed: true,
        }),
      })
      if (!res.ok) throw new Error('Publishing failed')
      const data = await res.json()
      if (data.success) {
        setMenu(prev => (prev ? { ...prev, status: 'completed', shareToFeed: true } : null))
        toast.success(`Published & Shared ${agentName}'s Feed Event!`, {
          description: `Live on alchm.kitchen/feed`,
        })
      } else {
        throw new Error(data.error || 'Publishing failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error occurred while sharing menu')
    } finally {
      setPublishing(false)
    }
  }

  const getElementIcon = (element?: string) => {
    switch (element?.toLowerCase()) {
      case 'fire':
        return <Flame className="h-4 w-4 text-orange-400" />
      case 'water':
        return <Droplet className="h-4 w-4 text-blue-400" />
      case 'earth':
        return <Layers className="h-4 w-4 text-emerald-400" />
      case 'air':
        return <Wind className="h-4 w-4 text-sky-400" />
      default:
        return <Sparkles className="h-4 w-4 text-fuchsia-400" />
    }
  }

  if (loading) {
    return (
      <div className="dark bg-[#08080c] border border-white/5 rounded-3xl p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-white/5 rounded w-2/3 mx-auto" />
        <div className="flex gap-2 justify-center py-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 w-12 bg-white/5 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="dark bg-[#08080c] border border-white/5 rounded-3xl p-8 text-center text-white">
        <Utensils className="h-12 w-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold">No Menu Generated</h3>
        <p className="text-white/60 mt-2 mb-6">
          Attuning the agentic channels for your weekly plan...
        </p>
        <Button onClick={() => fetchMenu(true)}>Generate Weekly Menu</Button>
      </div>
    )
  }

  const dailyMeals = menu.meals.filter(meal => meal.dayOfWeek === selectedDay)
  const isPublished = menu.status === 'completed'

  return (
    <div className="dark bg-[#08080e]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 text-white space-y-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 h-48 w-48 bg-fuchsia-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-48 w-48 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300"
            >
              Agent Menu Planner
            </Badge>
            <Badge variant="outline" className="border-sky-500/20 bg-sky-500/5 text-sky-300">
              {menu.dietaryFocus}
            </Badge>
            {isPublished && (
              <Badge className="bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
                <Check className="h-3 w-3 mr-1" /> Published & Live
              </Badge>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            {menu.title}
          </h2>
          <p className="text-white/60 text-sm mt-1 max-w-xl italic">{menu.summary}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => fetchMenu(true)}
            variant="outline"
            size="sm"
            disabled={publishing}
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          >
            <RotateCw className="h-4 w-4 mr-2" /> Regenerate
          </Button>
          {!isPublished ? (
            <Button
              onClick={handlePublish}
              disabled={publishing}
              size="sm"
              className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-600 hover:to-indigo-600 font-bold border-none"
            >
              <Share2 className="h-4 w-4 mr-2" /> {publishing ? 'Publishing...' : 'Publish & Share'}
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 cursor-default"
            >
              <Check className="h-4 w-4 mr-2" /> Live on Feed
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('planner')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'planner'
              ? 'border-fuchsia-500 text-fuchsia-400'
              : 'border-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Weekly Planner
        </button>
        <button
          onClick={() => setActiveTab('grocery')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'grocery'
              ? 'border-fuchsia-500 text-fuchsia-400'
              : 'border-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Consolidated Grocery List
        </button>
      </div>

      {activeTab === 'planner' ? (
        <>
          {/* Day Selector */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {DAYS.map((day, idx) => {
              const ruler = PLANETARY_HOUR_RULERS[idx as keyof typeof PLANETARY_HOUR_RULERS]
              const isSelected = selectedDay === idx
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(idx)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white shadow-[0_0_15px_rgba(217,70,239,0.15)]'
                      : 'border-white/5 bg-white/2 hover:bg-white/5 text-white/50 hover:text-white/80'
                  }`}
                >
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                    {day.slice(0, 3)}
                  </span>
                  <span className="text-base md:text-lg my-1">{ruler.glyph}</span>
                  <span className="text-[9px] md:text-[10px] font-medium text-white/30 truncate max-w-full">
                    {ruler.planet}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Meals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MEAL_TYPES.map(mealType => {
              const slot = dailyMeals.find(m => m.mealType === mealType)
              const ruler = PLANETARY_HOUR_RULERS[selectedDay as keyof typeof PLANETARY_HOUR_RULERS]

              return (
                <Card
                  key={mealType}
                  className="bg-[#0b0b14]/60 backdrop-blur-md border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between bg-white/2">
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                      <Utensils className="h-3 w-3 text-fuchsia-400" />
                      {mealType}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-2 rounded-full ${ruler.color}`}
                    >
                      {ruler.glyph} {ruler.planet} Day
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {slot?.recipe ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm md:text-base text-white/90">
                            {slot.recipe.name}
                          </h4>
                          {slot.recipe.elementalProperties && (
                            <div className="flex gap-1">
                              {Object.entries(slot.recipe.elementalProperties)
                                .filter(([, val]) => (val as number) > 0.2)
                                .map(([el]) => (
                                  <span key={el} title={el} className="p-1 rounded bg-white/5">
                                    {getElementIcon(el)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        {slot.notes && (
                          <p className="text-white/60 text-xs md:text-sm italic leading-relaxed border-l border-fuchsia-500/30 pl-3">
                            "{slot.notes}"
                          </p>
                        )}

                        <div className="flex justify-between items-center pt-2 text-xs">
                          {slot.recipe.nutrition && (
                            <span className="text-white/40">
                              {Math.round(slot.recipe.nutrition.calories)} kcal ·{' '}
                              {Math.round(slot.recipe.nutrition.protein)}g P
                            </span>
                          )}
                          <Button
                            onClick={() => setSelectedMeal(slot)}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200 hover:bg-white/5 px-2"
                          >
                            <Info className="h-3 w-3 mr-1" /> Recipe Info
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-white/30 text-xs italic">
                        Resting and alchemically balancing slot...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        /* Grocery List Tab */
        <Card className="bg-[#0b0b14]/60 border border-white/5 rounded-2xl p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg flex items-center gap-2 text-white/90">
              <Layers className="h-5 w-5 text-fuchsia-400" />
              Required Alchemical Elements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {menu.groceryList && menu.groceryList.length > 0 ? (
                menu.groceryList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="h-5 w-5 rounded border border-fuchsia-500/20 bg-fuchsia-500/5 flex items-center justify-center text-xs text-fuchsia-300">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-sm font-medium text-white/80">{item.name}</div>
                    {item.quantity && (
                      <Badge
                        variant="secondary"
                        className="bg-white/5 border border-white/10 text-white/60"
                      >
                        {item.quantity} {item.unit || ''}
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/40 italic text-sm col-span-2">
                  No consolidated grocery items required.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Info Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <Card className="bg-[#0c0c16] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="py-4 px-6 border-b border-white/10 flex flex-row justify-between items-center bg-white/2">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5 text-fuchsia-400" />
                {selectedMeal.recipe?.name}
              </CardTitle>
              <button
                onClick={() => setSelectedMeal(null)}
                className="text-white/40 hover:text-white/80 transition-colors text-xl font-bold"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col gap-2">
                <AiGeneratedPill />
                <AiDisclaimer compact />
              </div>
              {selectedMeal.recipe?.cuisine && (
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-1">
                    Cuisine
                  </h5>
                  <p className="text-sm font-medium text-fuchsia-300">
                    {selectedMeal.recipe.cuisine}
                  </p>
                </div>
              )}

              {selectedMeal.recipe?.ingredients && (
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">
                    Ingredients
                  </h5>
                  <ul className="grid grid-cols-2 gap-2 text-sm text-white/70 pl-2">
                    {selectedMeal.recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMeal.recipe?.nutrition && (
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">
                    Nutrition Estimations
                  </h5>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/2 rounded-xl p-2 border border-white/5">
                      <div className="text-sm font-black">
                        {Math.round(selectedMeal.recipe.nutrition.calories)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">Cals</div>
                    </div>
                    <div className="bg-white/2 rounded-xl p-2 border border-white/5">
                      <div className="text-sm font-black">
                        {Math.round(selectedMeal.recipe.nutrition.protein)}g
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">Prot</div>
                    </div>
                    <div className="bg-white/2 rounded-xl p-2 border border-white/5">
                      <div className="text-sm font-black">
                        {Math.round(selectedMeal.recipe.nutrition.carbs)}g
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">Carbs</div>
                    </div>
                    <div className="bg-white/2 rounded-xl p-2 border border-white/5">
                      <div className="text-sm font-black">
                        {Math.round(selectedMeal.recipe.nutrition.fat)}g
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">Fat</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedMeal.recipe?.elementalProperties && (
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2">
                    Alchemical Elemental Composition
                  </h5>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(selectedMeal.recipe.elementalProperties).map(([el, val]) => (
                      <div
                        key={el}
                        className="bg-white/2 rounded-xl p-2 border border-white/5 flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-white/60">{el}</span>
                        <span className="text-xs font-bold text-fuchsia-400">
                          {Math.round((val as number) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedMeal(null)}
                className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
              >
                Close Info
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
