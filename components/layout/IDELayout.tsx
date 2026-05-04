"use client";

import { useState } from "react";
import IDEHeader from "./IDEHeader";
import LeftPane from "./LeftPane";
import CenterPane from "./CenterPane";
import RightPane from "./RightPane";
import BottomPane from "./BottomPane";

export default function IDELayout({ isNewUser }: { isNewUser: boolean }) {
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(380);

  function startResize(
    e: React.MouseEvent,
    axis: "x" | "y",
    startVal: number,
    setter: (v: number) => void,
    min: number,
    max: number,
    invert?: boolean,
  ) {
    e.preventDefault();
    const startPos = axis === "x" ? e.clientX : e.clientY;
    function onMove(ev: MouseEvent) {
      const delta = (axis === "x" ? ev.clientX : ev.clientY) - startPos;
      setter(Math.min(max, Math.max(min, startVal + (invert ? -delta : delta))));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <IDEHeader />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left pane */}
        <div
          style={{ width: leftWidth }}
          className="shrink-0 border-r overflow-hidden flex flex-col"
        >
          <LeftPane />
        </div>

        {/* Left resize handle */}
        <div
          onMouseDown={(e) => startResize(e, "x", leftWidth, setLeftWidth, 160, 400)}
          className="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors"
        />

        {/* Center pane */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CenterPane />
        </div>

        {/* Right resize handle */}
        <div
          onMouseDown={(e) => startResize(e, "x", rightWidth, setRightWidth, 160, 400, true)}
          className="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors"
        />

        {/* Right pane */}
        <div
          style={{ width: rightWidth }}
          className="shrink-0 border-l overflow-hidden flex flex-col"
        >
          <RightPane />
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        onMouseDown={(e) => startResize(e, "y", bottomHeight, setBottomHeight, 250, 600, true)}
        className="h-1 shrink-0 cursor-row-resize hover:bg-primary/40 transition-colors border-t"
      />

      {/* Bottom pane */}
      <div
        style={{ height: bottomHeight }}
        className="shrink-0 border-t overflow-hidden flex flex-col"
      >
        <BottomPane isNewUser={isNewUser} />
      </div>
    </div>
  );
}
