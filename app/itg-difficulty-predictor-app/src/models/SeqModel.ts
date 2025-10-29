import { weightedAvg, type MeterProba } from "./common";

const params = {
  // parms for part 1
  expBase: 2.387,
  cp: 7.309,
  recoveryFac: 0.9702,
  curveFac: 4.66,
  overallExhaustFac: 4.047e-3,
  // params for part 2
  extrapCoef: 3.967698804884678,
  extrapThreshCoef: 0.8007727638808104,
  extrapThreshIntercept: 5.430623689762928,
  logisticParams: [
    [2.979408798360835, -15.853282673031845],
    [3.1375225578914594, -18.066082882571244],
    [2.9126825626434747, -19.295059946610298],
    [3.178882764854303, -22.63283544713527],
    [3.100820448804354, -23.290696193348044],
    [3.1851451828460053, -25.640294935419853],
    [3.1394502571555485, -27.288972426404843],
    [3.358653565258261, -32.021359978560895],
    [3.3467382539312824, -35.02104192299327],
    [2.9776793815713694, -34.56742215409307],
    [3.5990962017590715, -46.89336364519771],
    [3.7786363145056066, -55.09462104260965],
    [4.459781379968166, -70.01930509640373],
    [4.44909169963442, -73.85850631205983],
    [4.490503910832687, -78.5715876444178],
    [4.715455207704302, -86.48674597849701],
    [5.764101576851158, -110.94229471776106],
    [6.084488809925339, -122.079089197442],
    [5.399050054813322, -111.82334118780845],
    [5.110684174401748, -109.15238343203517],
    [5.705647413314885, -125.20964153134271],
    [4.760271545661409, -107.30664070581983],
    [4.586435625705191, -106.26665597527987],
    [4.508959354092453, -107.46926250375081],
    [4.888928887665763, -120.28292220693095],
    [3.952575245819576, -100.36038205015019],
    [3.5045924731969764, -92.02956040414529],
    [4.240456443341175, -115.15706474645822],
    [4.1956856030274645, -116.9451516154741],
    [3.777140305203039, -108.42161186330637],
    [3.5919593040972235, -105.85762279762244],
    [4.009639912609046, -121.21936243157114],
    [3.673703266074994, -113.95837181522357],
    [3.754381457366379, -119.11466259328192],
    [4.055623955329823, -132.80416291966873],
    [3.862305962366643, -130.2192750137582],
    [3.261705917154773, -112.37197035356088],
    [3.0628590051422426, -107.97275631086819],
    [2.7499062974500466, -98.4191876290326],
    [2.5035083275516112, -91.58112827915437],
    [2.292511302491629, -85.40766546059403],
    [1.8962125084427959, -72.46558998682723],
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
        params.recoveryFac *
        (1 - ((1 - params.recoveryFac) * 0.57 * nps) / params.cp);
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
  ([coef, intercept]) => new Logistic(coef, intercept)
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
    params.extrapThreshCoef * meter + params.extrapThreshIntercept
  );
}

function predictProba(
  score: number,
  extrapolate: boolean = true
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
