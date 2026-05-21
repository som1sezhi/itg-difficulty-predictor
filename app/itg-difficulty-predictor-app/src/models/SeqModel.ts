import { weightedAvg, type MeterProba } from "./common";

const params = {
  // parms for part 1
  expBase: 2.347,
  cp: 7.481,
  recoveryFac: 0.8597,
  curveFac: 4.352,
  overallExhaustFac: 6.859e-5,
  // params for part 2
  extrapCoef: 4.012461870876413,
  extrapThreshCoef: 0.7739276193279725,
  extrapThreshIntercept: 5.450926694999225,
  logisticParams: [
    [3.0021976724730197, -15.887243773515838],
    [3.139795596807306, -17.978060383808433],
    [2.9168325249878815, -19.18849464439009],
    [3.1867092283802583, -22.52660341510839],
    [3.1245415132591265, -23.293082368317098],
    [3.3542951457773102, -26.813603221300298],
    [3.1687496381195492, -27.296271930671573],
    [3.4090110819240373, -32.18142066956098],
    [3.4136768042013563, -35.30556284597489],
    [3.0985216915606606, -35.381026398722334],
    [3.6778755279817226, -47.02861579862745],
    [3.8951938585154635, -55.66922850876312],
    [4.546151754239344, -69.93492451450177],
    [4.506641192336295, -73.27924208035904],
    [4.493253725335278, -76.9532881257546],
    [4.702262932088255, -84.36645751893069],
    [5.833666134063467, -109.80855464565315],
    [6.048235046348649, -118.6054535867811],
    [5.40569811834366, -109.37063182921443],
    [5.210393191605142, -108.65208424464093],
    [5.677480104182051, -121.53841112244204],
    [4.761494766072956, -104.71452257809307],
    [4.574478799789876, -103.38222923975502],
    [4.548466885079563, -105.71153113202244],
    [4.9453485943109206, -118.59227596290634],
    [3.969130632136659, -98.1989371791469],
    [3.9494421382597746, -101.0528623534964],
    [4.2065178613514655, -111.21413072995337],
    [4.141834877771352, -112.35935366678069],
    [3.830650058429967, -107.07652451137847],
    [3.604766025266547, -103.45228563872001],
    [4.035709109755321, -118.7571138534855],
    [3.71994962552464, -112.30402016467593],
    [3.759578668689995, -116.03841670209036],
    [3.9741529881438926, -126.52313537481496],
    [3.7310577385000108, -122.37161467255487],
    [3.2731694705662333, -109.66282225118444],
    [3.1348728634345866, -107.43024555741636],
    [2.8092848635803804, -97.74045040528728],
    [2.5877198728282313, -91.96824600394088],
    [2.3755189392450595, -85.9377967630192],
    [1.8364277589440203, -68.1884245817962],
  ],
};

// pt 1: assigning a difficulty score to an NPS sequence

function getExhaust(npsSeq: number[]): number[] {
  let exhaust = 0;
  let cumSum = 1; // start at 1 to avoid blowing up logarithm
  const ret: number[] = [];

  for (const nps of npsSeq) {
    cumSum += nps;

    ret.push(exhaust + params.overallExhaustFac * Math.log(cumSum));

    if (nps <= params.cp) {
      // recovery
      exhaust *=
        params.recoveryFac + ((1 - params.recoveryFac) * nps) / params.cp;
    } else {
      // exhaustion
      exhaust += Math.exp(-exhaust / params.curveFac) * (nps - params.cp);
    }
  }

  return ret;
}

function calcDiffScore(npsSeq: number[]): {
  score: number;
  exhaustArr: number[];
  scoreArr: number[];
} {
  let sum = 1;
  const exhaustArr = getExhaust(npsSeq);
  const scoreArr = [];

  for (let i = 0; i < npsSeq.length; i++) {
    const nps = npsSeq[i];
    const exhaust = 1 + exhaustArr[i] * 0.01;
    sum += Math.pow(params.expBase, nps * exhaust) - 1;
    scoreArr.push(Math.log(sum));
  }

  return {
    score: Math.log(sum),
    exhaustArr,
    scoreArr,
  };
}

// pt 2: calculating meter probabilities for a difficulty score ---------------

class Logistic {
  coef: number;
  intercept: number;

  constructor(coef: number, intercept: number) {
    this.coef = coef;
    this.intercept = intercept;
  }

  eval(x: number) {
    return 1 / (1 + Math.exp(-(x * this.coef + this.intercept)));
  }
}

const modelLogistics = params.logisticParams.map(
  ([coef, intercept]) => new Logistic(coef, intercept),
);

function threshLogistic(coef: number, threshold: number) {
  return new Logistic(coef, -threshold * coef);
}

function scoreToApproxMeter(score: number): number {
  return (score - params.extrapThreshIntercept) / params.extrapThreshCoef;
}

function getExtrapLogistic(meter: number): Logistic {
  return threshLogistic(
    params.extrapCoef,
    params.extrapThreshCoef * meter + params.extrapThreshIntercept,
  );
}

function predictProba(
  score: number,
  extrapolate: boolean = true,
): MeterProba[] {
  let regs: Logistic[];
  let lBound = 0;
  if (extrapolate) {
    const approxMeter = scoreToApproxMeter(score);
    if (approxMeter > 40) lBound = Math.floor(approxMeter - 5);
    regs = modelLogistics.slice(lBound, 35);
    for (let m = Math.max(35, lBound); m < approxMeter + 5; m++)
      regs.push(getExtrapLogistic(m));
  } else {
    regs = modelLogistics;
  }

  const classProbas = [];
  for (const reg of regs) classProbas.push(reg.eval(score));

  const probas = [{ meter: 1, proba: 1 - classProbas[0] }];
  let i = 0;
  for (; i < classProbas.length - 1; i++) {
    const p1 = classProbas[i];
    const p2 = classProbas[i + 1];
    probas.push({ meter: lBound + i + 2, proba: p1 - p2 });
  }
  probas.push({
    meter: lBound + i + 2,
    proba: classProbas[classProbas.length - 1],
  });
  return probas;
}

function predictMeter(score: number) {
  return weightedAvg(predictProba(score, true)) + 0.5;
}

export interface SeqModelResult {
  pred: number;
  probas: MeterProba[];
  score: number;
  exhaustArr: number[];
  meterArr: number[];
}

export function seqModelPredict(npsSeq: number[]): SeqModelResult {
  const { score, exhaustArr, scoreArr } = calcDiffScore(npsSeq);
  const probas = predictProba(score, true);
  // weighted sum
  const pred = weightedAvg(probas) + 0.5;
  return {
    pred,
    probas,
    score,
    exhaustArr,
    meterArr: scoreArr.map(predictMeter),
  };
}
