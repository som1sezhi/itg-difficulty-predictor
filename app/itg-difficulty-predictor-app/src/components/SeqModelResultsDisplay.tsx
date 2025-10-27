import {
  Chart as ChartJS,
  Decimation,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { ChartAnalyzer } from "../ChartAnalyzer";
import { Scatter } from "react-chartjs-2";
import { useMemo } from "react";
import { seqModelPredict } from "../models/SeqModel";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Filler,
  Decimation
);

const chartOptions = {
  //maintainAspectRatio: false,
  scales: {
    x: {
      type: "linear",
      position: "bottom",
      // min: chartData.points[0][0],
      // max: chartData.points[chartData.points.length - 1][0],
      ticks: {
        display: false,
      },
    },
    y: {
      // max: chartData.peak_nps,
      ticks: {
        display: false,
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
    legend: {
      display: false,
    },
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

export function SeqModelResultsDisplay({
  analyzer,
}: {
  analyzer: ChartAnalyzer;
}) {
  const data = {
    datasets: [
      {
        fill: "origin",
        showLine: true,
        data: analyzer.getNPSSeq().map((nps, i) => [i, nps]),
      },
    ],
  };

  const info = useMemo(() => seqModelPredict(analyzer.getNPSSeq()), [analyzer]);

  //console.log(analyzer.getNoteTimes().length);

  return (
    <div>
      <div>
        score: {info.score}, Predicted meter: {info.pred}
      </div>

      <Scatter options={chartOptions} data={data} />
    </div>
  );
}
