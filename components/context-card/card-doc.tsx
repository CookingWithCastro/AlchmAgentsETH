'use client'

import React, { useMemo, useState } from 'react'
import { ChartWheel } from '@/components/cosmic-agents/chart-wheel'
import type { ChartOfMoment } from '@/components/cosmic-agents/types'
import { BiWheel } from './bi-wheel'
import {
  SIGN_ELEMENTS,
  SIGN_GLYPHS,
  BODY_GLYPHS,
  ASPECT_SYMBOLS,
  ELEMENT_COLORS,
} from '@/lib/context-card/types'
import type {
  ContextCardData,
  ContextCardPlacement,
  ContextCardAspect,
  ExportOptions,
} from '@/lib/context-card/types'
import { fmtDegree } from '@/lib/context-card/serializers'
import { synergyLead, type SkySource } from '@/lib/context-card/transit-engine'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const spaced = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
const elClass = (sign: string) => 'sgn-' + (SIGN_ELEMENTS[sign] || 'Air').toLowerCase()

interface Props {
  data: ContextCardData
  opts: ExportOptions
  sky: SkySource
}

export function CardDoc({ data, opts, sky }: Props) {
  const [overlay, setOverlay] = useState(false)

  const planets = useMemo(() => data.points.filter(p => p.kind === 'planet'), [data])
  const points = useMemo(() => data.points.filter(p => p.kind === 'point'), [data])

  // Natal chart shaped for the reused ChartWheel.
  const natalForWheel = useMemo(
    () =>
      ({
        dominantSign: data.birth.bigThree.rising,
        dominantPlanet: 'Sun',
        positions: planets.map(p => ({
          planet: p.body,
          sign: p.sign,
          degree: p.deg,
          retrograde: p.retro,
          dignity: (p.dignity as ChartOfMoment['positions'][number]['dignity']) || 'peregrine',
        })),
        aspects: data.aspects
          .filter(a => a.klass === 'major')
          .map(a => ({
            a: a.a,
            b: a.b,
            type: a.type as ChartOfMoment['aspects'][number]['type'],
            orb: a.orb,
            applying: a.applying,
            intensity: Math.max(0.2, 1 - a.orb / 9),
          })),
      }) as unknown as ChartOfMoment,
    [data, planets]
  )

  return (
    <div className="card-doc">
      <Hero
        data={data}
        planets={planets}
        sky={sky}
        overlay={overlay}
        setOverlay={setOverlay}
        natalForWheel={natalForWheel}
      />
      {opts.synopsis && data.synopsis.length ? <SynopsisBlock paragraphs={data.synopsis} /> : null}
      {planets.length ? <Placements planets={planets} /> : null}
      {points.length ? <PointsBlock points={points} /> : null}
      {opts.houses && data.houses.length ? <HousesBlock data={data} /> : null}
      {opts.aspects && data.aspects.some(a => a.klass === 'major' || opts.minorAspects) ? (
        <AspectsBlock aspects={data.aspects} minor={opts.minorAspects} />
      ) : null}
      <Synthesis data={data} />
      {opts.transits && data.transits ? <TransitsBlock data={data} /> : null}
      {opts.alchm ? <AlchmBlock data={data} /> : null}
    </div>
  )
}

function Hero({
  data,
  planets,
  sky,
  overlay,
  setOverlay,
  natalForWheel,
}: {
  data: ContextCardData
  planets: ContextCardPlacement[]
  sky: SkySource
  overlay: boolean
  setOverlay: (v: boolean) => void
  natalForWheel: ChartOfMoment
}) {
  const bt = data.birth.bigThree
  return (
    <div className="cd-hero">
      <div className="cd-wheel">
        {overlay && data.transits ? (
          <BiWheel natalPlanets={planets} sky={sky} transits={data.transits} size={320} />
        ) : (
          <ChartWheel chart={natalForWheel} size={320} animate />
        )}
        <div className="wheel-toggle">
          <span className={'wt ' + (!overlay ? 'on' : '')} onClick={() => setOverlay(false)}>
            Natal
          </span>
          <span className={'wt ' + (overlay ? 'on' : '')} onClick={() => setOverlay(true)}>
            + Current sky
          </span>
        </div>
      </div>
      <div className="cd-id">
        <div className="handle">{data.birth.handle}</div>
        <div className="big3">
          <div className="b3">
            <span className="g">{BODY_GLYPHS.Sun}</span>
            <span className="nm">{bt.sun}</span>
            <span className="role">Sun</span>
          </div>
          <div className="b3">
            <span className="g">{BODY_GLYPHS.Moon}</span>
            <span className="nm">{bt.moon}</span>
            <span className="role">Moon</span>
          </div>
          <div className="b3">
            <span className="g">{BODY_GLYPHS.Ascendant}</span>
            <span className="nm">{bt.rising}</span>
            <span className="role">Rising</span>
          </div>
        </div>
        <div className="born">
          <div>
            <span className="k">born</span>&nbsp; {data.birth.date} · {data.birth.time}{' '}
            {data.birth.tz}
          </div>
          <div>
            <span className="k">place</span>&nbsp; {data.birth.place}
          </div>
          <div>
            <span className="k">coord</span>&nbsp; {data.birth.lat}, {data.birth.lon}
          </div>
          <div>
            <span className="k">system</span>&nbsp; {data.birth.zodiac} · {data.birth.houseSystem} ·{' '}
            {data.birth.ephemeris}
          </div>
        </div>
      </div>
    </div>
  )
}

function SynopsisBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="cd-section">
      <h3>Synopsis</h3>
      <div className="synopsis">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  )
}

function Placements({ planets }: { planets: ContextCardPlacement[] }) {
  return (
    <div className="cd-section">
      <h3>Planetary Placements</h3>
      <table className="ptable">
        <thead>
          <tr>
            <th></th>
            <th>Body</th>
            <th>Position</th>
            <th>House</th>
            <th>Dignity</th>
          </tr>
        </thead>
        <tbody>
          {planets.map(p => (
            <tr key={p.body}>
              <td className={'pg ' + elClass(p.sign)}>{BODY_GLYPHS[p.body]}</td>
              <td className="pn">{p.body}</td>
              <td>
                <span
                  className={elClass(p.sign)}
                  style={{ fontFamily: 'var(--ff-display)', fontSize: '15px' }}
                >
                  {SIGN_GLYPHS[p.sign]}{' '}
                </span>
                <span className="deg">
                  {p.sign} {fmtDegree(p.deg)}
                </span>
                {p.retro ? <span className="rx"> ℞</span> : null}
              </td>
              <td className="hs">H{p.house}</td>
              <td>
                <span className={'dig ' + (p.dignity || 'peregrine')}>
                  {cap(p.dignity || 'peregrine')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PointsBlock({ points }: { points: ContextCardPlacement[] }) {
  return (
    <div className="cd-section">
      <h3>Angles &amp; Points</h3>
      <div className="points-grid">
        {points.map(p => (
          <div className="pchip" key={p.body}>
            <span className="g">{BODY_GLYPHS[p.body]}</span>
            <div className="t">
              <div className="nm">{p.body}</div>
              <div className="pos">
                <span className={elClass(p.sign)}>{p.sign}</span> {fmtDegree(p.deg)} · H{p.house}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HousesBlock({ data }: { data: ContextCardData }) {
  return (
    <div className="cd-section">
      <h3>House Cusps · {data.birth.houseSystem}</h3>
      <div className="house-grid">
        {data.houses.map(h => (
          <div className="hcell" key={h.house}>
            <div className="hn">House {h.house}</div>
            <div className={'hc ' + elClass(h.sign)}>
              {SIGN_GLYPHS[h.sign]} {fmtDegree(h.deg)}
            </div>
            <div className="hr">
              {h.sign} · ruler {h.ruler}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AspectsBlock({ aspects, minor }: { aspects: ContextCardAspect[]; minor: boolean }) {
  const list = aspects.filter(a => minor || a.klass === 'major')
  const major = list.filter(a => a.klass === 'major')
  const minors = list.filter(a => a.klass === 'minor')
  const Row = (a: ContextCardAspect, i: number) => (
    <div className={'asp ' + (a.applying ? 'applying' : '')} key={a.a + a.b + a.type + i}>
      <div className="pair">
        <span className="sym">{ASPECT_SYMBOLS[a.type]}</span>
        <span className="nm">
          <b>{a.a}</b> {a.type} <b>{a.b}</b>
        </span>
      </div>
      <div className="meta">
        <span className="orb">{a.orb}°</span>
        <span
          className={'ap ' + (a.applying ? '' : 'sep')}
          title={a.applying ? 'applying' : 'separating'}
        ></span>
      </div>
    </div>
  )
  return (
    <div className="cd-section">
      <h3>Aspects</h3>
      <div className="asp-class-h">Major · {major.length}</div>
      <div className="asp-list">{major.map(Row)}</div>
      {minor && minors.length ? (
        <>
          <div className="asp-class-h">Minor · {minors.length}</div>
          <div className="asp-list">{minors.map(Row)}</div>
        </>
      ) : null}
    </div>
  )
}

function Synthesis({ data }: { data: ContextCardData }) {
  const s = data.synthesis
  const et = s.elementTally
  const mt = s.modalityTally
  return (
    <div className="cd-section">
      <h3>Chart Synthesis</h3>
      <div className="syn-grid">
        <div className="syn-cell">
          <div className="k">Dominant element</div>
          <div className="v">
            {s.dominantElement} <small>then {s.secondaryElement}</small>
          </div>
        </div>
        <div className="syn-cell">
          <div className="k">Dominant modality</div>
          <div className="v">{s.dominantModality}</div>
        </div>
        <div className="syn-cell">
          <div className="k">Chart shape</div>
          <div className="v">{s.chartShape}</div>
        </div>
        <div className="syn-cell">
          <div className="k">Hemisphere</div>
          <div className="v" style={{ fontSize: '14px' }}>
            {s.hemisphere}
          </div>
        </div>
        <div className="syn-cell">
          <div className="k">Element tally</div>
          <div className="v">
            <small>
              Fire {et.Fire} · Earth {et.Earth} · Air {et.Air} · Water {et.Water}
            </small>
          </div>
        </div>
        <div className="syn-cell">
          <div className="k">Modality tally</div>
          <div className="v">
            <small>
              Card {mt.Cardinal} · Fix {mt.Fixed} · Mut {mt.Mutable}
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}

function TransitsBlock({ data }: { data: ContextCardData }) {
  const T = data.transits
  if (!T) return null
  const m = T.meta
  return (
    <div className="cd-section">
      <h3>Current Sky · Transit Synergy</h3>
      <div className="moment-strip">
        <div className="mcell">
          <span className="k">Moment</span>
          <span className="v">{m.when}</span>
        </div>
        <div className="mcell">
          <span className="k">Planetary hour</span>
          <span className="v">{m.planetaryHour}</span>
        </div>
        <div className="mcell">
          <span className="k">Moon</span>
          <span className="v">
            {m.moonPhase} · {Math.round((m.moonIllumination || 0) * 100)}%
          </span>
        </div>
        <div className="mcell">
          <span className="k">Sky ruler</span>
          <span className="v">
            {m.dominantPlanet} in {m.dominantSign}
          </span>
        </div>
      </div>
      <p className="synergy-lead">{synergyLead(T)}</p>
      <div className="wheel-legend">
        <span className="lg">
          <span className="ring inner"></span>inner · natal
        </span>
        <span className="lg">
          <span className="ring outer"></span>outer · transiting now
        </span>
        <span className="lg muted">toggle “+ Current sky” on the wheel to overlay</span>
      </div>
      <div className="asp-list" style={{ marginTop: '10px' }}>
        {T.aspects.map((a, i) => (
          <div className={'asp ' + (a.orb <= 2 ? 'applying' : '')} key={i}>
            <div className="pair">
              <span className="sym">{ASPECT_SYMBOLS[a.type]}</span>
              <span className="nm">
                <span className="tlabel">t</span> <b>{a.t}</b>
                {a.tRetro ? ' ℞' : ''} {a.type} <span className="tlabel nat">n</span> <b>{a.n}</b>
              </span>
            </div>
            <div className="meta">
              <span className="orb">{a.orb}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlchmBlock({ data }: { data: ContextCardData }) {
  const a = data.alchm
  const e = a.elemental
  const q = a.esms
  const t = a.thermodynamics
  const elems = ['Fire', 'Water', 'Earth', 'Air']
  return (
    <div className="cd-section">
      <h3>Alchm Layer</h3>
      <div className="alchm">
        <div className="alchm-h">
          <span className="mk">✦</span>
          <span className="tt">Alchm Energetic Profile</span>
          <span className="sub">proprietary</span>
        </div>

        <div className="elem-bar">
          {elems.map(k => (
            <div key={k} style={{ width: e[k] + '%', background: ELEMENT_COLORS[k] }} />
          ))}
        </div>
        <div className="elem-legend">
          {elems.map(k => (
            <span className="lg" key={k}>
              <span className="dot" style={{ background: ELEMENT_COLORS[k] }} />
              {k}
              <span className="pct">{e[k]}%</span>
            </span>
          ))}
        </div>

        <div className="esms-quad">
          {(
            [
              ['spirit', 'Spirit'],
              ['essence', 'Essence'],
              ['matter', 'Matter'],
              ['substance', 'Substance'],
            ] as const
          ).map(([k, lab]) => (
            <div className={'q ' + k} key={k}>
              <div className="lab">{lab}</div>
              <div className="val">{q[k]}</div>
            </div>
          ))}
        </div>

        <div className="kchips">
          <span className="kchip">
            Kalchm <b>{a.kalchm}</b>
          </span>
          <span className="kchip">
            Monica <b>{a.monica}</b>
          </span>
          <span className="kchip">
            Heat <b>{t.heat}</b>
          </span>
          <span className="kchip">
            Entropy <b>{t.entropy}</b>
          </span>
          <span className="kchip">
            Reactivity <b>{t.reactivity}</b>
          </span>
          <span className="kchip">
            Energy <b>{t.energy}</b>
          </span>
          <span className="kchip">
            A# <b>{t.aNumber}</b>
          </span>
        </div>

        {Object.keys(a.sacred7).length ? (
          <div className="stat-rows">
            {Object.entries(a.sacred7).map(([k, v]) => (
              <div className="srow" key={k}>
                <span className="lab">{cap(k)}</span>
                <span className="bar">
                  <i style={{ width: v + '%' }} />
                </span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        ) : null}

        {Object.keys(a.planetary12).length ? (
          <div className="stat-rows" style={{ marginTop: '8px' }}>
            {Object.entries(a.planetary12).map(([k, v]) => (
              <div className="srow" key={k}>
                <span className="lab" title={spaced(k)}>
                  {spaced(k)}
                </span>
                <span className="bar">
                  <i style={{ width: v + '%', background: 'var(--gold)' }} />
                </span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
