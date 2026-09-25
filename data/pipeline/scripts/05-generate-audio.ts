// Pre-generates pronunciation audio for every card + example sentence using
// macOS's offline `say` (no API key, no per-clip cost — the tradeoff chosen
// over a cloud neural TTS API for this project). `say` writes AIFF, so each
// clip is piped through `afconvert` to mono 22.05kHz AAC to keep ~14k+ short
// clips from ballooning into gigabytes of uncompressed audio.
//
// Idempotent/resumable by design: any existing output file is left alone, so
// re-running after a partial run (or after a new word batch lands) only
// generates what's missing. Run with `npx tsx data/pipeline/scripts/05-generate-audio.ts`.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const VOICE = 'Tingting'
const BITRATE = '40000'
const SAMPLE_RATE = '22050'
const CONCURRENCY = 12
const OUT_DIR = process.argv[2] || 'public/audio'

type Kind = 'hanzi' | 'hanzi-example' | 'words' | 'words-example'
interface Job {
  kind: Kind
  id: string
  text: string
}

function loadJsonDir(dir: string): any[] {
  const cards: any[] = []
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    cards.push(...JSON.parse(readFileSync(join(dir, f), 'utf-8')))
  }
  return cards
}

function collectJobs(): Job[] {
  const jobs: Job[] = []
  for (const c of loadJsonDir('data/cards')) {
    jobs.push({ kind: 'hanzi', id: c.id, text: c.character })
    jobs.push({ kind: 'hanzi-example', id: c.id, text: c.example.hanzi })
  }
  for (const c of loadJsonDir('data/word-cards')) {
    jobs.push({ kind: 'words', id: c.id, text: c.word })
    jobs.push({ kind: 'words-example', id: c.id, text: c.example.hanzi })
  }
  return jobs
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'ignore' })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

async function generateOne(job: Job): Promise<'generated' | 'skip' | 'failed'> {
  const outPath = join(OUT_DIR, job.kind, `${job.id}.m4a`)
  if (existsSync(outPath)) return 'skip'
  mkdirSync(join(OUT_DIR, job.kind), { recursive: true })

  const tmpAiff = join('/tmp', `hf-audio-${job.kind}-${job.id.replace(/[^A-Za-z0-9+-]/g, '_')}-${Math.random().toString(36).slice(2)}.aiff`)
  try {
    await run('say', ['-v', VOICE, '-o', tmpAiff, job.text])
    await run('afconvert', [
      '-f', 'm4af',
      '-d', 'aac',
      '-b', BITRATE,
      '-c', '1',
      '-r', SAMPLE_RATE,
      tmpAiff,
      outPath,
    ])
    return 'generated'
  } catch (e) {
    console.error(`FAILED ${job.kind}/${job.id} ("${job.text}"): ${(e as Error).message}`)
    return 'failed'
  } finally {
    if (existsSync(tmpAiff)) unlinkSync(tmpAiff)
  }
}

async function runPool(jobs: Job[], concurrency: number) {
  let nextIndex = 0
  let generated = 0
  let skipped = 0
  let failed = 0
  let done = 0

  async function worker() {
    while (nextIndex < jobs.length) {
      const job = jobs[nextIndex++]
      const result = await generateOne(job)
      if (result === 'generated') generated++
      else if (result === 'skip') skipped++
      else failed++
      done++
      if (done % 200 === 0 || done === jobs.length) {
        console.log(`Progress: ${done}/${jobs.length} (generated=${generated} skipped=${skipped} failed=${failed})`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { generated, skipped, failed }
}

async function main() {
  const jobs = collectJobs()
  console.log(`Total jobs: ${jobs.length} (voice=${VOICE}, out=${OUT_DIR})`)
  const { generated, skipped, failed } = await runPool(jobs, CONCURRENCY)
  console.log(`Done. generated=${generated} skipped=${skipped} failed=${failed} total=${jobs.length}`)
  if (failed > 0) process.exitCode = 1
}

main()
