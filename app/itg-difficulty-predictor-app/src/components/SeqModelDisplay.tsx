import {
  Chart as ChartJS,
  Decimation,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Scale,
  Title,
  Tooltip,
} from "chart.js";
import { ChartAnalyzer } from "../ChartAnalyzer";
import { Line } from "react-chartjs-2";
import { useMemo, useState } from "react";
import { seqModelPredict } from "../models/SeqModel";
import "./results.css";
import { ProbasTable } from "./ProbasTable";
import { NumberInput } from "./NumberInput";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Filler,
  Decimation,
  Title
);

function Graph({
  data,
  xLabel,
  yLabel,
}: {
  data: number[];
  xLabel: string;
  yLabel: string;
}) {
  const dataInput = {
    labels: [...data.keys()],
    datasets: [
      {
        fill: true,
        data: data,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        position: "bottom",
        min: 0,
        max: data.length - 1,
        title: {
          display: true,
          text: xLabel,
          padding: 1,
        },
      },
      y: {
        max: Math.max(...data),
        title: {
          display: true,
          text: yLabel,
          padding: 0,
        },
        afterFit(scale: Scale) {
          scale.width = 60;
        },
      },
    },
    elements: {
      point: {
        pointStyle: false,
      },
      line: {
        borderWidth: 1,
      },
    },
    animation: {
      duration: 0,
    },
    plugins: {
      tooltip: {
        animation: {
          duration: 150,
        },
      },
      decimation: {
        enabled: true,
      },
    },
  } as const;
  return (
    <div className="graph-container">
      <Line options={options} data={dataInput} />
    </div>
  );
}

export function SeqModelDisplay({ analyzer }: { analyzer: ChartAnalyzer }) {
  const [rateMod, setRateMod] = useState<number>(1);
  const [useEBPM, setUseEBPM] = useState<boolean>(false);
  const npsSeq = useMemo(
    () => analyzer.getNPSSeq(rateMod),
    [analyzer, rateMod]
  );
  const info = useMemo(() => seqModelPredict(npsSeq), [npsSeq]);

  const probas = info.probas.sort((a, b) => b.proba - a.proba).slice(0, 5);

  const roundedPred = Math.floor(info.pred);
  let predLevel: string;
  if (info.pred - roundedPred < 1 / 3) {
    predLevel = "low";
  } else if (info.pred - roundedPred < 2 / 3) {
    predLevel = "mid";
  } else {
    predLevel = "high";
  }

  return (
    <div className="results">
      <div className="left-pane">
        <div className="row flex-row">
          <label>
            <input
              type="checkbox"
              checked={useEBPM}
              onChange={(e) => setUseEBPM(e.target.checked)}
            />
            Display eBPM instead of NPS
          </label>
          <label>
            <NumberInput
              value={rateMod}
              min={0.1}
              max={10}
              onChange={(x) => setRateMod(x)}
            />
            Ratemod
          </label>
        </div>
        <Graph
          xLabel="Time (s)"
          yLabel={useEBPM ? "Effective stream BPM" : "Notes per second"}
          data={useEBPM ? npsSeq.map((nps) => nps * 15) : npsSeq}
        />
        <Graph
          xLabel="Time (s)"
          yLabel="Exhaustion factor"
          data={info.exhaustArr}
        />
        <Graph
          xLabel="Time (s)"
          yLabel="Predicted rating"
          data={info.meterArr}
        />
      </div>
      <div className="right-pane">
        Predicted rating:
        <br />
        <span className="pred-meter">{info.pred.toFixed(2)}</span>
        {` (${predLevel} ${roundedPred})`}
        <ProbasTable probas={probas} />
      </div>
    </div>
  );
}
