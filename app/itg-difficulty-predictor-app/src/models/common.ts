export interface MeterProba {
  meter: number;
  proba: number;
}

export function weightedAvg(probas: MeterProba[]) {
  return probas.reduce((accum, entry) => accum + entry.meter * entry.proba, 0);
}
