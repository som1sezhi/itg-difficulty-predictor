import type { Chart } from "./simfile/Chart";
import { NoteTypes, type Note } from "./simfile/Note";
import type { Simfile } from "./simfile/Simfile";
import { TimingData } from "./simfile/TimingData";
import { TimingEngine } from "./simfile/TimingEngine";

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

export function* noteTimesIterator(
  notes: Iterable<Note>,
  engine: TimingEngine
): Generator<number> {
  for (const note of notes) {
    const t = note.noteType;
    if (
      (t === NoteTypes.TAP ||
        t === NoteTypes.HOLD_HEAD ||
        t === NoteTypes.ROLL_HEAD) &&
      engine.hittable(note.row)
    )
      yield engine.timeAt(note.row);
  }
}

export class ChartAnalyzer {
  sim: Simfile;
  chart: Chart;
  timingData: TimingData;
  engine: TimingEngine;

  private noteTimes?: number[];
  private npsSeq?: number[];

  constructor(sim: Simfile, chart: Chart) {
    this.sim = sim;
    this.chart = chart;
    this.timingData = new TimingData(sim, chart);
    this.engine = new TimingEngine(this.timingData);
  }

  *noteTimesIterator() {
    yield* noteTimesIterator(this.chart.notesIterator(), this.engine);
  }

  getNoteTimes(): number[] {
    if (!this.noteTimes) this.noteTimes = [...this.noteTimesIterator()];
    return this.noteTimes;
  }

  getNPSSeq(): number[] {
    if (!this.npsSeq) {
      this.npsSeq = [...npsSeqIterator(this.getNoteTimes())];
    }
    return this.npsSeq;
  }
}
