import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Simfile } from "./simfile/Simfile";
import { SeqModelDisplay } from "./components/SeqModelDisplay";
import { ChartAnalyzer } from "./ChartAnalyzer";
import type { Chart } from "./simfile/Chart";
import "./App.css";
import Markdown from "react-markdown";
import seqModelDesc from "./descriptions/seq-model-desc.md?raw";
import { SimpleModelDisplay } from "./components/SimpleModelDisplay";

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
  const [model, setModel] = useState<"simple" | "seq">("seq");
  const [sim, setSim] = useState<Simfile | null>(null);
  const [chartIdx, setChartIdx] = useState<number>(-1);

  const analyzers = useMemo(
    () =>
      sim &&
      sim.charts
        .filter((chart) => chart.stepsType === "dance-single")
        .map((chart) => new ChartAnalyzer(sim, chart)),
    [sim]
  );

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
        const singlesCharts = sim.charts.filter(
          (chart) => chart.stepsType === "dance-single"
        );
        setChartIdx((idx) =>
          Math.min(Math.max(0, idx), singlesCharts.length - 1)
        );
      });
    }
  };

  let modelDisplay: ReactNode;
  if (model === "simple") {
    modelDisplay = (
      <SimpleModelDisplay
        analyzer={analyzers ? analyzers[chartIdx] : undefined}
      />
    );
  } else {
    // model === "seq"
    if (!sim) {
      modelDisplay = "Please upload a simfile to use this model.";
    } else if (!analyzers) {
      modelDisplay =
        "The uploaded simfile does not contain any singles charts.";
    } else {
      modelDisplay = <SeqModelDisplay analyzer={analyzers[chartIdx]} />;
    }
  }

  return (
    <>
      <h1>ITG Difficulty Predictor</h1>
      <div className="row">
        <label>
          Select a model:
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as typeof model)}
          >
            <option value="simple">Simple (3-feature) model</option>
            <option value="seq">Density sequence model</option>
          </select>
        </label>
      </div>
      <div className="row">
        Upload a simfile:
        <input id="file" type="file" onChange={onFileChange} />
      </div>
      {sim && (
        <>
          <hr />
          <div className="row title-row">
            <span className="artist">{sim.artist} - </span>
            <span className="title">{sim.title}</span>
            {sim.subtitle && <span className="subtitle"> {sim.subtitle}</span>}
          </div>
          <div className="row">
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
        </>
      )}
      {modelDisplay}
      <hr />
      <Markdown>{seqModelDesc}</Markdown>
    </>
  );
}

export default App;
