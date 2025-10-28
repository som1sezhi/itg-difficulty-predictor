import { ChartAnalyzer } from "../ChartAnalyzer";
import { useCallback, useState } from "react";
import "./results.css";
import { NumberInput } from "./NumberInput";
import { ProbasTable } from "./ProbasTable";
import { simpleModelPredict } from "../models/SimpleModel";

export function SimpleModelDisplay({ analyzer }: { analyzer?: ChartAnalyzer }) {
  const [bpm, setBpm] = useState<number>(174);
  const [stream, setStream] = useState<number>(64);
  const [density, setDensity] = useState<number>(50);
  const [errNoStream, setErrNoStream] = useState<boolean>(false);

  const info = simpleModelPredict(bpm, stream, density);

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

  const onAnalyze = useCallback(() => {
    if (!analyzer) return;
    const info = analyzer.getStreamInfo();
    if (info.totalStream === 0) {
      setErrNoStream(true);
    } else {
      const mult = info.quant / 16;
      setBpm(Math.round(info.avgBpm! * 100) / 100);
      setStream(info.totalStream * mult);
      setDensity(
        Math.round(
          (info.totalStream / (info.totalStream + info.totalBreak)) * 10000
        ) / 100
      );
      setErrNoStream(false);
    }
  }, [analyzer]);

  return (
    <div className="results">
      <div className="left-pane">
        <div className="row">
          <label>
            <NumberInput
              value={bpm}
              min={0}
              onChange={(x) => setBpm(x)}
              className="no-margin-left"
            />
            BPM
          </label>
        </div>
        <div className="row">
          <label>
            <NumberInput
              value={stream}
              min={0}
              onChange={(x) => setStream(x)}
              className="no-margin-left"
            />
            total stream measures
          </label>
        </div>
        <div className="row">
          <label>
            <NumberInput
              value={density}
              min={0}
              max={100}
              onChange={(x) => setDensity(x)}
              className="no-margin-left"
            />
            % stream density (exclude measures before first stream and after
            last stream)
          </label>
        </div>
        <div className="row">
          {analyzer && (
            <button onClick={onAnalyze}>
              Analyze currently selected chart
            </button>
          )}
          {errNoStream && "Error: no stream detected"}
        </div>
      </div>
      <div className="right-pane">
        Predicted meter:
        <br />
        <span className="pred-meter">{info.pred.toFixed(2)}</span>
        {` (${predLevel} ${roundedPred})`}
        <ProbasTable probas={probas} />
      </div>
    </div>
  );
}
