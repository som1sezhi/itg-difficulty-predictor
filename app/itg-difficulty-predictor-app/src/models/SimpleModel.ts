import { weightedAvg, type MeterProba } from "./common";

const model = {
  minMeter: 11,
  maxMeter: 43,
  coeffs: [
    4.956208775849059722e-1, 6.391087097536332529, 1.888972206039320767e1,
  ],
  thresholds: [
    -Infinity,
    1.166369672991519195e2,
    1.284300306889031162e2,
    1.37218793581806267e2,
    1.435960635151080567e2,
    1.498578751806585387e2,
    1.569850980789606467e2,
    1.631337352975976671e2,
    1.691920593470339327e2,
    1.738052939279759528e2,
    1.780860131628443526e2,
    1.82431670478101978e2,
    1.869509347121977214e2,
    1.910660292905648134e2,
    1.958589660187825814e2,
    2.015526617442343991e2,
    2.069788615004526378e2,
    2.130978821102749521e2,
    2.192200208179967547e2,
    2.243952957384992999e2,
    2.294691584881319102e2,
    2.357782037138378541e2,
    2.407364187244349694e2,
    2.455801080397074543e2,
    2.518716818697278654e2,
    2.572265762951275292e2,
    2.633440796791809362e2,
    2.693546794245938827e2,
    2.741354141454854698e2,
    2.79277869343616544e2,
    2.833896728826312028e2,
    2.88584856781591327e2,
    2.937393549162416662e2,
    Infinity,
  ],
};

function logistic(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export interface SimpleModelResult {
  pred: number;
  probas: MeterProba[];
}

export function simpleModelPredict(
  bpm: number,
  stream: number,
  density: number
): SimpleModelResult {
  stream = Math.log2(stream);
  density *= 0.01;

  const latent =
    model.coeffs[0] * bpm +
    model.coeffs[1] * stream +
    model.coeffs[2] * density;

  const cumProbas = model.thresholds.map((threshold) =>
    logistic(threshold - latent)
  );

  const probas: MeterProba[] = [];
  for (let i = 0; i < cumProbas.length - 1; i++) {
    probas.push({
      meter: i + model.minMeter,
      proba: cumProbas[i + 1] - cumProbas[i],
    });
  }

  const pred = weightedAvg(probas) + 0.5;

  return { pred, probas };
}
