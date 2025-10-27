export const NoteTypes = {
  TAP: "1",
  HOLD_HEAD: "2",
  TAIL: "3",
  ROLL_HEAD: "4",
  MINE: "M",
  LIFT: "L",
  FAKE: "F",
} as const;

export type NoteType = (typeof NoteTypes)[keyof typeof NoteTypes];

export interface Note {
  row: number;
  column: number;
  noteType: NoteType;
}

export interface NoteWithTail extends Note {
  tailRow?: number;
}
