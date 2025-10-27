import { useMemo, useState, type ChangeEvent } from "react";
import "./App.css";
import { Simfile } from "./simfile/Simfile";
import { SeqModelResultsDisplay } from "./components/SeqModelResultsDisplay";
import { ChartAnalyzer } from "./ChartAnalyzer";
import type { Chart } from "./simfile/Chart";

function chartDiffStr(chart: Chart): string {
  switch (chart.difficulty) {
    case 0:
      return `Novice ${chart.meter}`;
    case 1:
      return `Easy ${chart.meter}`;
    case 2:
      return `Medium ${chart.meter}`;
    case 3:
      return `Hard ${chart.meter}`;
    case 4:
      return `Expert ${chart.meter}`;
    case 5:
      return `Edit ${chart.meter}`;
  }
}

function App() {
  const [sim, setSim] = useState<Simfile | null>(null);
  const [chartIdx, setChartIdx] = useState<number>(0);

  const analyzers = useMemo(
    () => sim && sim.charts.map((chart) => new ChartAnalyzer(sim, chart)),
    [sim]
  );

  if (analyzers) console.log([...analyzers[chartIdx].noteTimesIterator()]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const ext = file.name
        .substring(file.name.lastIndexOf(".") + 1)
        .toLowerCase();
      if (ext !== "sm" && ext !== "ssc") return;
      file.text().then((text) => {
        const sim = new Simfile(text, ext);
        setSim(sim);
        setChartIdx((idx) => Math.min(idx, sim.charts.length - 1));
      });
    }
  };

  return (
    <>
      <h1>ITG Difficulty Predictor</h1>
      <input id="file" type="file" onChange={onFileChange} />
      {sim && (
        <div>
          <label>
            Select a chart:
            <select
              value={chartIdx}
              onChange={(e) => setChartIdx(Number(e.target.value))}
            >
              {sim.charts.map((chart, i) => (
                <option key={i} value={i}>
                  {chartDiffStr(chart)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {analyzers && <SeqModelResultsDisplay analyzer={analyzers[chartIdx]} />}
    </>
  );
}

export default App;
