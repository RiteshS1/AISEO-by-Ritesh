import type { AuditInputs } from '@/lib/schemas/auditInputs'
import type { AuditResult } from '@/types'
import { Circle, Document, Font, Line, Link, Page, Polygon, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Vector PDF template for the AIEO audit report. It is built from the report data (not from
 * a screenshot of the web UI), so text is selectable, links are clickable and pagination is
 * handled by the layout engine. Runs entirely in the browser; fonts are served from /fonts.
 */

const COLORS = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  rule: '#e2e8f0',
  card: '#f8fafc',
  dark: '#020617',
  darkSoft: '#0f172a',
  lime: '#d9ff00',
  limeText: '#4d7c0f',
  pass: '#059669',
  warn: '#d97706',
  fail: '#dc2626',
}

let fontsRegistered = false

/** `baseUrl` is where Inter-*.woff files live, e.g. `${window.location.origin}/fonts`. */
export function registerReportPdfFonts(baseUrl: string) {
  if (fontsRegistered) return
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${baseUrl}/Inter-400.woff`, fontWeight: 400 },
      { src: `${baseUrl}/Inter-400-italic.woff`, fontWeight: 400, fontStyle: 'italic' },
      { src: `${baseUrl}/Inter-500.woff`, fontWeight: 500 },
      { src: `${baseUrl}/Inter-700.woff`, fontWeight: 700 },
      { src: `${baseUrl}/Inter-800.woff`, fontWeight: 800 },
    ],
  })
  // Never hyphenate: keeps words intact and avoids odd breaks in names and URLs.
  Font.registerHyphenationCallback((word) => [word])
  fontsRegistered = true
}

// Glyphs available in the bundled Inter (latin) subset. Anything else would render as a blank box.
const SUPPORTED_CHARS = /[^ -~ -ÿıŒœˆ˜‐-‧‰-⁞€™−\n]/g
const CHAR_REPLACEMENTS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '✓': '',
  '✔': '',
  '✗': 'x',
  '•': '•',
  ' ': ' ',
  '​': '',
  '️': '',
}

function clean(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return text
    .replace(/[→←✓✔✗ ​️]/g, (c) => CHAR_REPLACEMENTS[c] ?? '')
    .replace(SUPPORTED_CHARS, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function pct(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function scoreColor(value: number) {
  if (value >= 70) return COLORS.pass
  if (value >= 50) return COLORS.warn
  return COLORS.fail
}

function statusColor(status: string) {
  if (status === 'Pass' || status === 'Optimal' || status === 'High') return COLORS.pass
  if (status === 'Warning' || status === 'Average' || status === 'Medium') return COLORS.warn
  return COLORS.fail
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.body,
    backgroundColor: '#ffffff',
    paddingTop: 44,
    paddingBottom: 62,
    paddingHorizontal: 44,
  },
  footer: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 26,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.rule,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: COLORS.faint, letterSpacing: 0.4 },

  // Cover
  cover: { backgroundColor: COLORS.dark, color: '#ffffff', fontFamily: 'Inter', padding: 56 },
  coverTop: { flexDirection: 'row', alignItems: 'center' },
  coverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lime, marginRight: 8 },
  coverBrand: { fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: '#ffffff' },
  coverEyebrow: { fontSize: 9, fontWeight: 700, letterSpacing: 4, color: COLORS.lime, marginTop: 150 },
  coverRule: { width: 56, height: 2.5, backgroundColor: COLORS.lime, marginTop: 18, marginBottom: 28 },
  coverTitle: { fontSize: 54, fontWeight: 800, lineHeight: 1, color: '#ffffff', letterSpacing: -1.5 },
  coverTitleMuted: { fontSize: 54, fontWeight: 800, lineHeight: 1, color: '#334155', letterSpacing: -1.5 },
  coverSub: { fontSize: 10, fontWeight: 700, letterSpacing: 3.5, color: '#94a3b8', marginTop: 24 },
  coverMeta: { marginTop: 'auto', borderTopWidth: 0.75, borderTopColor: '#1e293b', paddingTop: 22, flexDirection: 'row' },
  coverMetaCol: { flex: 1, paddingRight: 16 },
  coverMetaLabel: { fontSize: 7.5, fontWeight: 700, letterSpacing: 2, color: '#64748b', marginBottom: 6 },
  coverMetaValue: { fontSize: 15, fontWeight: 800, color: '#ffffff' },
  coverMetaSub: { fontSize: 8.5, color: '#94a3b8', marginTop: 4 },

  // Section header
  eyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 3, color: COLORS.limeText, marginBottom: 6 },
  h1: { fontSize: 26, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.5, lineHeight: 1.1 },
  h1Rule: { width: 40, height: 3, backgroundColor: COLORS.lime, marginTop: 12, marginBottom: 22 },
  h2: { fontSize: 8, fontWeight: 700, letterSpacing: 2.2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 10 },
  lead: { fontSize: 10.5, lineHeight: 1.65, color: COLORS.body },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 0.75,
    borderColor: COLORS.rule,
    borderRadius: 6,
    padding: 14,
  },
  row: { flexDirection: 'row' },
  barTrack: { height: 5, backgroundColor: COLORS.rule, borderRadius: 3, overflow: 'hidden' },
  pill: { fontSize: 7.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 1, paddingTop: 4, paddingBottom: 4, paddingHorizontal: 7, borderRadius: 3 },
  small: { fontSize: 8.5, color: COLORS.muted },
  label: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color: COLORS.muted, textTransform: 'uppercase' },
})

function PageShell({ brand, children }: { brand: string; children: React.ReactNode }) {
  return (
    <Page size='A4' style={s.page}>
      {children}
      <View fixed style={s.footer}>
        <Text style={s.footerText}>{`AISEO by Ritesh  ·  AIEO Audit  ·  ${truncate(brand, 48)}`}</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  )
}

function SectionHeader({ no, title }: { no: string; title: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={s.eyebrow}>{`SECTION ${no}`}</Text>
      <Text style={s.h1}>{title}</Text>
      <View style={s.h1Rule} />
    </View>
  )
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={s.barTrack}>
      <View style={{ width: `${pct(value)}%`, height: 5, backgroundColor: color }} />
    </View>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <View style={[s.card, { borderStyle: 'dashed' }]}>
      <Text style={{ color: COLORS.muted, fontStyle: 'italic' }}>{text}</Text>
    </View>
  )
}

/** Radar chart drawn with SVG primitives (vector). */
function Radar({ items }: { items: { label: string; value: number }[] }) {
  const width = 222
  const height = 200
  const cx = width / 2
  const cy = height / 2
  const r = 58
  const n = items.length
  const point = (i: number, ratio: number) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180)
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio] as const
  }
  const poly = (ratio: number) => items.map((_, i) => point(i, ratio).join(',')).join(' ')
  const data = items.map((it, i) => point(i, pct(it.value) / 100).join(',')).join(' ')

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <Polygon key={ratio} points={poly(ratio)} stroke={COLORS.rule} strokeWidth={0.8} fill='none' />
      ))}
      {items.map((_, i) => {
        const [x, y] = point(i, 1)
        return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={COLORS.rule} strokeWidth={0.8} />
      })}
      <Polygon points={data} stroke={COLORS.limeText} strokeWidth={1.8} fill={COLORS.lime} fillOpacity={0.35} />
      {items.map((it, i) => {
        const [x, y] = point(i, pct(it.value) / 100)
        return <Circle key={i} cx={x} cy={y} r={2.4} fill={COLORS.limeText} />
      })}
      {items.map((it, i) => {
        const [x, y] = point(i, 1.22)
        const anchor = x < cx - 6 ? 'end' : x > cx + 6 ? 'start' : 'middle'
        return (
          <Text key={i} x={x} y={y + 2.5} textAnchor={anchor} style={{ fontSize: 7, fontWeight: 700, fill: COLORS.muted }}>
            {truncate(clean(it.label).split(' ')[0].toUpperCase(), 12)}
          </Text>
        )
      })}
    </Svg>
  )
}

interface ReportPdfDocumentProps {
  result: AuditResult
  inputs: AuditInputs
  generatedAt: Date
}

export default function ReportPdfDocument({ result, inputs, generatedAt }: ReportPdfDocumentProps) {
  const brand = clean(inputs.brandName) || 'Brand'
  const dateLabel = generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const overall = pct(result.overallScore)

  const stats = [
    { label: 'Overall Visibility', note: 'Weighted aggregate', value: overall, color: overall < 50 ? COLORS.fail : COLORS.pass },
    { label: 'Data Integrity', note: 'Trust consistency', value: pct(result.foundation?.entityConfidence), color: COLORS.ink },
    { label: 'Alignment', note: 'Category match', value: pct(result.logicIntegrity), color: COLORS.pass },
    { label: 'Search Index', note: 'Traditional SEO', value: pct(result.searchVisibilityIndex), color: COLORS.muted },
  ]

  const coreScores = [
    { label: 'Foundation', data: result.foundation },
    { label: 'Technical', data: result.technical },
    { label: 'Authority', data: result.authority },
  ].filter((x) => x.data)

  const intelligence = [
    { label: 'Hallucination Risk', value: pct(result.hallucinationRisk), color: COLORS.warn },
    { label: 'Logic Integrity', value: pct(result.logicIntegrity), color: COLORS.pass },
    { label: 'Model Alignment', value: pct(result.foundation?.score), color: COLORS.ink },
    { label: 'Extraction Speed', value: pct(result.aiVisibilityIndex), color: COLORS.limeText },
  ]

  const pillars = result.pillarAnalysis ?? []
  const engines = result.aiBreakdown ?? []
  const checklist = result.technicalChecklist ?? []
  const social = result.socialFootprint ?? []
  const recommendations = result.globalRecommendations ?? []
  const sources = result.sources ?? []

  return (
    <Document title={`AIEO Audit - ${brand}`} author='AISEO by Ritesh' subject='AI Engine Optimization visibility audit' creator='AISEO'>
      {/* Cover */}
      <Page size='A4' style={s.cover}>
        <View style={s.coverTop}>
          <View style={s.coverDot} />
          <Text style={s.coverBrand}>AISEO</Text>
        </View>
        <Text style={s.coverEyebrow}>CONFIDENTIAL REPORT</Text>
        <View style={s.coverRule} />
        <Text style={s.coverTitle}>AIEO</Text>
        <Text style={s.coverTitleMuted}>AUDIT</Text>
        <Text style={s.coverSub}>VISIBILITY INTELLIGENCE REPORT</Text>

        <View style={s.coverMeta}>
          <View style={s.coverMetaCol}>
            <Text style={s.coverMetaLabel}>CLIENT PROFILE</Text>
            <Text style={s.coverMetaValue}>{truncate(brand, 40)}</Text>
            {!!clean(inputs.industry) && <Text style={s.coverMetaSub}>{truncate(clean(inputs.industry), 60)}</Text>}
            {!!clean(inputs.websiteUrl) && <Text style={s.coverMetaSub}>{truncate(clean(inputs.websiteUrl), 60)}</Text>}
          </View>
          <View style={s.coverMetaCol}>
            <Text style={s.coverMetaLabel}>GENERATION DATE</Text>
            <Text style={s.coverMetaValue}>{dateLabel}</Text>
            <Text style={[s.coverMetaSub, { color: COLORS.lime }]}>AISEO by Ritesh</Text>
          </View>
        </View>
      </Page>

      {/* 01 Summary */}
      <PageShell brand={brand}>
        <SectionHeader no='01' title='Analysis Findings' />

        <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: COLORS.lime, marginBottom: 16 }]} wrap={false}>
          <Text style={s.h2}>Executive Context</Text>
          <Text style={s.lead}>{clean(result.foundation?.summary) || 'Summary generation in progress...'}</Text>
        </View>

        <View style={[s.row, { marginBottom: 20 }]} wrap={false}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[s.card, { flex: 1, alignItems: 'center', marginRight: i < stats.length - 1 ? 8 : 0 }]}>
              <Text style={[s.label, { marginBottom: 8, textAlign: 'center', lineHeight: 1.3 }]}>{stat.label}</Text>
              <Text style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: stat.color }}>{`${stat.value}%`}</Text>
              <Text style={{ fontSize: 7.5, color: COLORS.faint, marginTop: 6 }}>{stat.note}</Text>
            </View>
          ))}
        </View>

        {coreScores.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.h2}>Core Scores</Text>
            {coreScores.map(({ label, data }) => (
              <View key={label} style={[s.card, { marginBottom: 8 }]} wrap={false}>
                <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
                  <Text style={{ fontSize: 11, fontWeight: 800, color: COLORS.ink }}>{label}</Text>
                  <View style={[s.row, { alignItems: 'center' }]}>
                    <Text style={[s.pill, { color: statusColor(data.status), borderWidth: 0.75, borderColor: statusColor(data.status), marginRight: 8 }]}>
                      {data.status}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: 800, color: scoreColor(pct(data.score)) }}>{`${pct(data.score)}%`}</Text>
                  </View>
                </View>
                <Bar value={data.score} color={scoreColor(pct(data.score))} />
                {!!clean(data.summary) && !(label === 'Foundation' && clean(data.summary) === clean(result.foundation?.summary)) && (
                  <Text style={{ marginTop: 8 }}>{clean(data.summary)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View>
          <Text style={s.h2}>Entity Verification Sources</Text>
          {sources.length === 0 ? (
            <Empty text='No external citations extracted for this specific entity footprint.' />
          ) : (
            sources.map((source, i) => (
              <View key={i} style={[s.row, { marginBottom: 7 }]} wrap={false}>
                <Text style={{ width: 18, fontWeight: 700, color: COLORS.limeText }}>{`${i + 1}.`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 700, color: COLORS.ink }}>{truncate(clean(source.title) || 'Source', 110)}</Text>
                  <Link src={source.uri} style={{ fontSize: 8, color: COLORS.limeText, textDecoration: 'none' }}>
                    {truncate(clean(source.uri), 90)}
                  </Link>
                </View>
              </View>
            ))
          )}
        </View>
      </PageShell>

      {/* 02 Analytics */}
      <PageShell brand={brand}>
        <SectionHeader no='02' title='Engine Analytics' />

        <View style={[s.row, { marginBottom: 22 }]} wrap={false}>
          <View style={[s.card, { width: 250, alignItems: 'center', marginRight: 12 }]}>
            <Text style={[s.h2, { alignSelf: 'flex-start' }]}>System Pillars</Text>
            {pillars.length >= 3 ? <Radar items={pillars.map((p) => ({ label: p.title, value: p.score }))} /> : <Empty text='Not enough pillar data to chart.' />}
            <Text style={{ fontSize: 7.5, color: COLORS.faint, textAlign: 'center', marginTop: 4 }}>
              Balance between technical crawlability and semantic authority.
            </Text>
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.h2}>Intelligence Context</Text>
            {intelligence.map((m) => (
              <View key={m.label} style={{ marginBottom: 14 }}>
                <View style={[s.row, { justifyContent: 'space-between', marginBottom: 5 }]}>
                  <Text style={s.label}>{m.label}</Text>
                  <Text style={{ fontWeight: 800, color: m.color }}>{`${m.value}%`}</Text>
                </View>
                <Bar value={m.value} color={m.color} />
              </View>
            ))}
          </View>
        </View>

        <Text style={s.h2}>Platform Citations</Text>
        {engines.length === 0 ? (
          <Empty text='No AI engine breakdown available.' />
        ) : (
          engines.map((engine, i) => (
            <View key={i} style={[s.card, { marginBottom: 9, borderLeftWidth: 3, borderLeftColor: COLORS.lime }]} wrap={false}>
              <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
                <Text style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.ink }}>{clean(engine.name)}</Text>
                <Text style={{ fontSize: 14, fontWeight: 800, color: scoreColor(pct(engine.visibilityScore)) }}>
                  {`${pct(engine.visibilityScore)}% `}
                  <Text style={{ fontSize: 7.5, fontWeight: 700, color: COLORS.muted }}>VISIBILITY</Text>
                </Text>
              </View>
              <View style={[s.row, { marginBottom: 6 }]}>
                {[
                  ['Recommendation', `${pct(engine.recommendationLikelihood)}%`],
                  ['Brand authority', `${pct(engine.brandAuthority)}%`],
                  ['Citations', String(Number(engine.citationCount) || 0)],
                  ['Sentiment', truncate(clean(engine.sentiment), 18) || '-'],
                ].map(([k, v]) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, color: COLORS.faint, letterSpacing: 0.6 }}>{k.toUpperCase()}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 700, color: COLORS.ink }}>{v}</Text>
                  </View>
                ))}
              </View>
              {!!clean(engine.keyTakeaway) && <Text style={{ fontStyle: 'italic' }}>{`"${clean(engine.keyTakeaway)}"`}</Text>}
            </View>
          ))
        )}
      </PageShell>

      {/* 03 Diagnostic */}
      <PageShell brand={brand}>
        <SectionHeader no='03' title={`${checklist.length || 22}-Point Verification`} />
        {checklist.length === 0 ? (
          <Empty text='No checklist data available.' />
        ) : (
          checklist.map((item, i) => (
            <View
              key={i}
              wrap={false}
              style={[s.card, { marginBottom: 7, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: statusColor(item.status) }]}
            >
              <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: COLORS.faint, letterSpacing: 1.5 }}>{`P.${String(i + 1).padStart(2, '0')}`}</Text>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: COLORS.ink }}>{clean(item.point)}</Text>
                </View>
                <Text style={[s.pill, { color: statusColor(item.status), borderWidth: 0.75, borderColor: statusColor(item.status) }]}>{item.status}</Text>
              </View>
              {!!clean(item.observation) && <Text style={{ marginTop: 4, color: COLORS.muted }}>{clean(item.observation)}</Text>}
            </View>
          ))
        )}
      </PageShell>

      {/* 04 Social */}
      <PageShell brand={brand}>
        <SectionHeader no='04' title='Social Citations' />
        {social.length === 0 ? (
          <Empty text='No social footprint data available.' />
        ) : (
          social.map((platform, i) => (
            <View key={i} style={[s.card, { marginBottom: 8, padding: 12 }]} wrap={false}>
              <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
                <Text style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.ink }}>{clean(platform.platform)}</Text>
                <Text style={[s.pill, { color: statusColor(platform.presence), borderWidth: 0.75, borderColor: statusColor(platform.presence) }]}>
                  {`${platform.presence} signal`}
                </Text>
              </View>
              <View style={[s.row, { paddingVertical: 5, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: COLORS.rule, marginBottom: 6 }]}>
                <Text style={[s.label, { marginRight: 8 }]}>Analysis</Text>
                <Text style={{ fontWeight: 700, color: COLORS.ink, flex: 1 }}>{clean(platform.sentiment) || '-'}</Text>
              </View>
              <Text>{clean(platform.observation)}</Text>
            </View>
          ))
        )}
      </PageShell>

      {/* 05 Pillars */}
      <PageShell brand={brand}>
        <SectionHeader no='05' title='Optimization Layers' />
        {pillars.length === 0 ? (
          <Empty text='No pillar analysis available.' />
        ) : (
          pillars.map((pillar, i) => (
            <View key={i} style={[s.card, { marginBottom: 10 }]} wrap={false}>
              <View style={[s.row, { alignItems: 'center', marginBottom: 8 }]}>
                <View style={{ width: 30, height: 30, borderRadius: 5, backgroundColor: COLORS.darkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ color: COLORS.lime, fontWeight: 800, fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: 800, color: COLORS.ink }}>{clean(pillar.title)}</Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: 800, color: scoreColor(pct(pillar.score)) }}>{`${pct(pillar.score)}% efficiency`}</Text>
              </View>
              <Bar value={pillar.score} color={scoreColor(pct(pillar.score))} />
              <Text style={{ marginTop: 9 }}>{clean(pillar.evaluation)}</Text>
            </View>
          ))
        )}
      </PageShell>

      {/* 06 Roadmap */}
      <PageShell brand={brand}>
        <SectionHeader no='06' title='Strategic Roadmap' />
        {recommendations.length === 0 ? (
          <Empty text='No recommendations available.' />
        ) : (
          recommendations.map((rec, i) => {
            const high = rec.priority === 'High'
            return (
              <View key={i} style={[s.card, { marginBottom: 11 }]} wrap={false}>
                <View style={[s.row, { alignItems: 'center', marginBottom: 8 }]}>
                  <Text
                    style={[
                      s.pill,
                      { marginRight: 10, color: high ? '#ffffff' : COLORS.ink, backgroundColor: high ? COLORS.fail : COLORS.lime },
                    ]}
                  >
                    {`${rec.priority} priority`}
                  </Text>
                  <Text style={s.small}>{`Target implementation: ${clean(rec.timeline) || 'TBD'}`}</Text>
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.ink, marginBottom: 5 }}>{`${i + 1}. ${clean(rec.title)}`}</Text>
                <Text>{clean(rec.action)}</Text>
              </View>
            )
          })
        )}
      </PageShell>
    </Document>
  )
}
