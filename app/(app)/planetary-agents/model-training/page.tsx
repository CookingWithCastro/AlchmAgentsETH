'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { planetaryDignities } from '@/lib/astrological-data'

const PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function getDignity(planet: string, sign: string) {
  const dignities = planetaryDignities[planet as keyof typeof planetaryDignities]
  if (dignities?.domicile.includes(sign)) return 'domicile'
  if (dignities?.exaltation.includes(sign)) return 'exaltation'
  if (dignities?.detriment.includes(sign)) return 'detriment'
  if (dignities?.fall.includes(sign)) return 'fall'
  return 'peregrine'
}

function buildPrompt(planet: string, sign: string, dignity: string) {
  return `Create a specialized astrological agent for ${planet} in ${sign}.

The agent should embody ${planet} as expressed through ${sign}.

Planetary dignity: ${dignity.toUpperCase()}

Requirements:
1. Ground interpretations in traditional astrological sources.
2. Reflect the ${dignity} condition of ${planet} in ${sign}.
3. Offer practical guidance without presenting astrology as scientific certainty.
4. Keep the voice and imagery appropriate to this planetary placement.
5. Distinguish source material from interpretive synthesis.`
}

export default function ModelTrainingPage() {
  const [planet, setPlanet] = useState('Sun')
  const [sign, setSign] = useState('Aries')
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const dignity = getDignity(planet, sign)

  useEffect(() => {
    setPrompt(buildPrompt(planet, sign, dignity))
    setCopied(false)
  }, [planet, sign, dignity])

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Planetary Agent Prompt Studio</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Build and export a placement-specific agent specification from the project’s dignity
          rules. This tool does not submit or claim to complete a model-training job.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent specification</CardTitle>
          <CardDescription>Select a placement, then refine or copy its prompt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planet">Planet</Label>
              <Select value={planet} onValueChange={setPlanet}>
                <SelectTrigger id="planet">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANETS.map(value => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign">Sign</Label>
              <Select value={sign} onValueChange={setSign}>
                <SelectTrigger id="sign">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNS.map(value => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-secondary/20 p-3 text-sm">
            <span className="font-medium">
              {planet} in {sign}:
            </span>{' '}
            <span className="capitalize">{dignity}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Prompt</Label>
            <Textarea
              id="agent-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              rows={13}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={copyPrompt}>
            {copied ? 'Copied' : 'Copy specification'}
          </Button>
          <Button asChild>
            <Link href={`/agents/${planet.toLowerCase()}/${sign.toLowerCase()}/1`}>
              Open live degree agent
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
