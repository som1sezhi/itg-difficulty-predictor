import React, { createContext } from "react";
import type { ChartAnalyzer } from "../ChartAnalyzer";

export interface SimpleModelDisplayState {
  bpm: number;
  stream: number;
  density: number;
  errNoStream: boolean;
}

export const simpleModelDisplayInitState: SimpleModelDisplayState = {
  bpm: 174,
  stream: 64,
  density: 50,
  errNoStream: false,
};

export type SimpleModelDisplayAction =
  | {
      type: "bpmChanged" | "streamChanged" | "densityChanged";
      value: number;
    }
  | {
      type: "analysisReq";
      analyzer?: ChartAnalyzer;
    };

export const SimpleModelDisplayContext = createContext<
  | [SimpleModelDisplayState, React.Dispatch<SimpleModelDisplayAction>]
  | undefined
>(undefined);

export function simpleModelDisplayReducer(
  state: SimpleModelDisplayState,
  action: SimpleModelDisplayAction
): SimpleModelDisplayState {
  switch (action.type) {
    case "bpmChanged":
      return { ...state, bpm: action.value, errNoStream: false };
    case "streamChanged":
      return { ...state, stream: action.value, errNoStream: false };
    case "densityChanged":
      return { ...state, density: action.value, errNoStream: false };
    case "analysisReq": {
      const analyzer = action.analyzer;
      if (!analyzer) {
        return state;
      }
      const info = analyzer.getStreamInfo();
      if (info.totalStream === 0) {
        return { ...state, errNoStream: true };
      }
      const mult = info.quant / 16;
      const bpm = Math.round(info.avgBpm! * 100) / 100;
      const stream = info.totalStream * mult;
      const density =
        Math.round(
          (info.totalStream / (info.totalStream + info.totalBreak)) * 10000
        ) / 100;
      return {
        ...state,
        bpm,
        stream,
        density,
        errNoStream: false,
      };
    }
  }
}
