import { useReducer, useState, type ChangeEvent, type ReactNode } from "react";
import { Simfile } from "./simfile/Simfile";
import { SeqModelDisplay } from "./components/SeqModelDisplay";
import { ChartAnalyzer, type JumpsHandlingMode } from "./ChartAnalyzer";
import "./App.css";
import Markdown from "react-markdown";
import simpleModelDesc from "./descriptions/simple-model-desc.md?raw";
import seqModelDesc from "./descriptions/seq-model-desc.md?raw";
import { SimpleModelDisplay } from "./components/SimpleModelDisplay";
import {
  SimpleModelDisplayContext,
  simpleModelDisplayInitState,
  simpleModelDisplayReducer,
} from "./components/SimpleModelDisplayContext";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function App() {
  const [model, setModel] = useState<"simple" | "seq">("seq");
  const [sim, setSim] = useState<Simfile | null>(null);
  const [analyzers, setAnalyzers] = useState<ChartAnalyzer[]>([]);
  const [chartIdx, setChartIdx] = useState<number>(-1);
  const [jumpsMode, setJumpsMode] = useState<JumpsHandlingMode>("individual");

  const [simpleModelState, simpleModelDispatch] = useReducer(
    simpleModelDisplayReducer,
    simpleModelDisplayInitState
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
        const analyzers = sim.charts
          .filter((chart) => chart.stepsType === "dance-single")
          .map((chart) => new ChartAnalyzer(sim, chart, jumpsMode));
        setAnalyzers(analyzers);
        // NOTE: chartIdx might have a stale value here, but at least the
        // new value should never be invalid
        const newChartIdx = Math.min(
          Math.max(0, chartIdx),
          analyzers.length - 1
        );
        setChartIdx(newChartIdx);
        // NOTE: newChartIdx can be -1 if analyzers is empty. This is ok since
        // the analysisReq action can take in an undefined analyzer.
        simpleModelDispatch({
          type: "analysisReq",
          analyzer: analyzers[newChartIdx],
        });
      });
    }
  };

  const onChartChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newChartIdx = Number(e.target.value);
    setChartIdx(newChartIdx);
    analyzers[newChartIdx]?.setJumpsMode(jumpsMode);
    simpleModelDispatch({
      type: "analysisReq",
      analyzer: analyzers[newChartIdx],
    });
  };

  const onJumpsModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newJumpsMode = e.target.value as JumpsHandlingMode;
    setJumpsMode(newJumpsMode);
    analyzers[chartIdx]?.setJumpsMode(newJumpsMode);
    simpleModelDispatch({
      type: "analysisReq",
      analyzer: analyzers[chartIdx],
    });
  };

  let modelDisplay: ReactNode;
  if (model === "simple") {
    modelDisplay = (
      <SimpleModelDisplay
        analyzer={analyzers.length > 0 ? analyzers[chartIdx] : undefined}
      />
    );
  } else {
    // model === "seq"
    if (!sim) {
      modelDisplay = "Please upload a simfile to use this model.";
    } else if (analyzers.length === 0) {
      modelDisplay =
        "The uploaded simfile does not contain any singles charts.";
    } else {
      modelDisplay = (
        <SeqModelDisplay analyzer={analyzers[chartIdx]} jumpsMode={jumpsMode} />
      );
    }
  }

  return (
    <>
      <h1>ITG Difficulty Predictor</h1>
      <div className="row">
        Upload a simfile:
        <input id="file" type="file" onChange={onFileChange} />
      </div>
      <div className="row">
        <label>
          Select a prediction model:
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as typeof model)}
          >
            <option value="simple">Simple (3-feature) model</option>
            <option value="seq">Density sequence model</option>
          </select>
        </label>
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
              <select value={chartIdx} onChange={onChartChange}>
                {analyzers.map((analyzer, i) => (
                  <option key={i} value={i}>
                    {analyzer.getDiffStr()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Jump/bracket handling behavior:
              <select value={jumpsMode} onChange={onJumpsModeChange}>
                <option value="individual">
                  Treat as individual notes (jumps count as 2, bracket jumps
                  count as 3+)
                </option>
                <option value="jumps">
                  Treat as jumps (jumps & bracket jumps count as 2)
                </option>
                <option value="brackets">
                  Treat as brackets (jumps count as 1, bracket jumps count as 2)
                </option>
              </select>
            </label>
          </div>
        </>
      )}
      <hr />

      <SimpleModelDisplayContext
        value={[simpleModelState, simpleModelDispatch]}
      >
        {modelDisplay}
      </SimpleModelDisplayContext>

      <hr />
      <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {model === "simple" ? simpleModelDesc : seqModelDesc}
      </Markdown>
    </>
  );
}

export default App;
