import type { MeterProba } from "../models/common";

export function ProbasTable({ probas }: { probas: MeterProba[] }) {
  return (
    <table className="probas">
      <thead>
        <tr>
          <th>Rating</th>
          <th>Probability</th>
        </tr>
      </thead>
      <tbody>
        {probas.map((proba, i) => {
          const percent = proba.proba * 100;
          const bg = `linear-gradient(-90deg, #04f4 ${percent}%, #0000 ${percent}%)`;
          return (
            <tr key={i}>
              <td>{proba.meter}</td>
              <td style={{ background: bg }}>
                {(proba.proba * 100).toFixed(3) + "%"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
