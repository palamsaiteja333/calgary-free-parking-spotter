"use client";

import { useMemo, useState } from "react";
import ParkingMap from "@/components/ParkingMap";

export default function Page(): JSX.Element {
  const [freeOnly, setFreeOnly] = useState(true);

  const toggleLabel = useMemo(() => {
    return freeOnly ? "Free ($0.00) now only" : "Show all zones";
  }, [freeOnly]);

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: 16,
          borderBottom: "1px solid var(--border)",
          background: "var(--panel)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Calgary Free Parking Finder
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Filter uses Calgary `enforceable_time` vs your current local time (America/Edmonton).
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            <span>{toggleLabel}</span>
          </label>
        </div>
      </header>

      <div style={{ flex: 1, position: "relative" }}>
        <ParkingMap freeOnly={freeOnly} />
      </div>
    </main>
  );
}

