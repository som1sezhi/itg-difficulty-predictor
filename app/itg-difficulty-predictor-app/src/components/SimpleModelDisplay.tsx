import { ChartAnalyzer } from "../ChartAnalyzer";
import { useCallback, useContext } from "react";
import "./results.css";
import { NumberInput } from "./NumberInput";
import { ProbasTable } from "./ProbasTable";
import { simpleModelPredict } from "../models/SimpleModel";
import { SimpleModelDisplayContext } from "./SimpleModelDisplayContext";

export function SimpleModelDisplay({ analyzer }: { analyzer?: ChartAnalyzer }) {
  const [state, dispatch] = useContext(SimpleModelDisplayContext)!;

  const analyze = useCallback(() => {
    dispatch({ type: "analysisReq", analyzer });
  }, [analyzer, dispatch]);

  const info = simpleModelPredict(state.bpm, state.stream, state.density);

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
        <div className="row">
          <label>
            <NumberInput
              value={state.bpm}
              min={0}
              onChange={(x) => dispatch({ type: "bpmChanged", value: x })}
              className="no-margin-left"
            />
            BPM
          </label>
        </div>
        <div className="row">
          <label>
            <NumberInput
              value={state.stream}
              min={0}
              onChange={(x) => dispatch({ type: "streamChanged", value: x })}
              className="no-margin-left"
            />
            total stream measures
          </label>
        </div>
        <div className="row">
          <label>
            <NumberInput
              value={state.density}
              min={0}
              max={100}
              onChange={(x) => dispatch({ type: "densityChanged", value: x })}
              className="no-margin-left"
            />
            % stream density (exclude measures before first stream and after
            last stream)
          </label>
        </div>
        {state.errNoStream && (
          <div className="row error">
            Note: no streams detected in this current chart (
            {analyzer?.getDiffStr()}), values have not been filled in.
          </div>
        )}
        <div className="row">
          {analyzer && (
            <button onClick={analyze}>
              Reset to values for currently selected chart
            </button>
          )}
        </div>
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
