import type { Chart } from "./simfile/Chart";
import { NoteTypes, type Note } from "./simfile/Note";
import type { Simfile } from "./simfile/Simfile";
import { TimingData } from "./simfile/TimingData";
import { TimingEngine } from "./simfile/TimingEngine";
import { ROWS_PER_MEASURE } from "./simfile/utils";

const SPACING = 1;
const SUPPORT_RADIUS = 1.5 * SPACING;

function kernel(x: number) {
  x = x / SPACING + 1.5;

  let y;
  if (x <= 1) {
    y = (x * x) / 2;
  } else if (x <= 2) {
    y = (2 - x) * (x - 1) + 0.5;
  } else {
    x = x - 3;
    y = (x * x) / 2;
  }

  return y / SPACING;
}

export function* npsSeqIterator(
  noteTimes: Iterable<number, void>
): Generator<number, void> {
  const iter = noteTimes[Symbol.iterator]();
  const queue: number[] = [];

  const first = iter.next();
  if (first.done) return; // empty iterator
  let sampleLoc = Math.ceil((first.value - SUPPORT_RADIUS) / SPACING) * SPACING;
  queue.push(first.value);

  while (queue.length > 0) {
    const lBound = sampleLoc - SUPPORT_RADIUS;
    const rBound = sampleLoc + SUPPORT_RADIUS;
    // add new notes, ensuring last note in queue is beyond the
    // window, if possible
    if (queue[queue.length - 1] < rBound) {
      let next = iter.next();
      while (!next.done && next.value < rBound) {
        queue.push(next.value);
        next = iter.next();
      }
      if (!next.done) queue.push(next.value);
    }
    // clear old notes
    while (queue.length > 0 && queue[0] < lBound) queue.shift();

    let accum = 0;
    for (const time of queue)
      if (time < rBound) accum += kernel(sampleLoc - time);
    yield accum;
    sampleLoc += SPACING;
  }
}

export interface StreamRun {
  start: number;
  len: number;
}

export class ChartAnalyzer {
  sim: Simfile;
  chart: Chart;
  timingData: TimingData;
  engine: TimingEngine;

  private hittables?: Note[];
  private noteTimes?: number[];
  private npsSeq?: number[];
  private notesPerMeasure?: number[];

  constructor(sim: Simfile, chart: Chart) {
    this.sim = sim;
    this.chart = chart;
    this.timingData = new TimingData(sim, chart);
    this.engine = new TimingEngine(this.timingData);
  }

  getHittables() {
    if (this.hittables) return this.hittables;

    function* generator(notes: Iterable<Note>, engine: TimingEngine) {
      for (const note of notes) {
        const t = note.noteType;
        if (
          (t === NoteTypes.TAP ||
            t === NoteTypes.HOLD_HEAD ||
            t === NoteTypes.ROLL_HEAD) &&
          engine.hittable(note.row)
        )
          yield note;
      }
    }

    this.hittables = [...generator(this.chart.notesIterator(), this.engine)];
    return this.hittables;
  }

  getNoteTimes(): number[] {
    if (!this.noteTimes) {
      this.noteTimes = this.getHittables().map((note) =>
        this.engine.timeAt(note.row)
      );
    }
    return this.noteTimes;
  }

  getNPSSeq(): number[] {
    if (!this.npsSeq) {
      this.npsSeq = [...npsSeqIterator(this.getNoteTimes())];
    }
    return this.npsSeq;
  }

  getNotesPerMeasure(): number[] {
    if (this.notesPerMeasure !== undefined) return this.notesPerMeasure;

    this.notesPerMeasure = [];
    let curMeasureStart = 0;
    let curMeasureCount = 0;
    for (const { row } of this.getHittables()) {
      if (row >= curMeasureStart + ROWS_PER_MEASURE) {
        this.notesPerMeasure.push(curMeasureCount);
        curMeasureCount = 0;
        curMeasureStart += ROWS_PER_MEASURE;
        while (row - curMeasureStart >= ROWS_PER_MEASURE) {
          this.notesPerMeasure.push(0);
          curMeasureStart += ROWS_PER_MEASURE;
        }
      }
      curMeasureCount++;
    }
    this.notesPerMeasure.push(curMeasureCount);

    return this.notesPerMeasure;
  }

  getStreamInfo() {
    const npmSeq = this.getNotesPerMeasure();
    const numMeasures = npmSeq.length;

    const measureBpms = [];
    let startTime = this.engine.timeAt(0);
    for (let i = 0; i < numMeasures; i++) {
      const endRow = (i + 1) * ROWS_PER_MEASURE;
      const endTime = this.engine.timeAt(endRow);
      const measureLen = endTime - startTime;
      if (measureLen !== 0) {
        measureBpms.push(240 / measureLen);
      } else {
        measureBpms.push(0); // fallback to avoid division by 0
      }
      startTime = endTime;
    }

    const quants = [32, 24, 20, 16];
    const streamRuns: Record<number, StreamRun[]> = {};
    const minBpm: Record<number, number | null> = {};
    const maxBpm: Record<number, number | null> = {};
    const accumBpm: Record<number, number> = {};
    for (const q of quants) {
      streamRuns[q] = [];
      minBpm[q] = null;
      maxBpm[q] = null;
      accumBpm[q] = 0;
    }
    for (let i = 0; i < numMeasures; i++) {
      const count = npmSeq[i];
      const bpm = measureBpms[i];
      for (const q of quants) {
        if (count >= q) {
          // this is a stream measure
          const runs = streamRuns[q];
          const lastRun: StreamRun | undefined = runs[runs.length - 1];
          if (lastRun && lastRun.start + lastRun.len === i) {
            lastRun.len++;
          } else {
            runs.push({ start: i, len: 1 });
          }

          if (minBpm[q] === null) {
            minBpm[q] = maxBpm[q] = bpm;
          } else {
            minBpm[q] = Math.min(minBpm[q], bpm);
            maxBpm[q] = Math.max(maxBpm[q]!, bpm);
          }
          accumBpm[q] += bpm;
        }
      }
    }

    let q: number = 0;
    let totalStream = 0;
    for (q of quants) {
      totalStream = streamRuns[q].reduce((accum, run) => accum + run.len, 0);
      const entireChartDensity = totalStream / numMeasures;
      if (entireChartDensity >= 0.1) break;
    }

    const runs = streamRuns[q];
    let adjustedMeasureCount = 0;
    if (runs.length > 0) {
      const lastRun = runs[runs.length - 1];
      adjustedMeasureCount = lastRun.start + lastRun.len - runs[0].start;
    }
    const totalBreak = adjustedMeasureCount - totalStream;

    return {
      quant: q,
      totalStream,
      totalBreak,
      bpms: [minBpm[q], maxBpm[q]],
      avgBpm: totalStream > 0 ? accumBpm[q] / totalStream : null,
    };
  }
}
