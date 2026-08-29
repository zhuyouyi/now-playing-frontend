// Widget.tsx 歌曲组件（OBS 浏览器源 /widgetDesktop）
import React, { useEffect, useState } from "react";

interface Track {
  title?: string;
  author?: string;
  cover?: string;
  durationHuman?: string;
}

interface Query {
  track?: Track;
}

export default function WidgetPage() {
  const [track, setTrack] = useState<Track | null>(null);

  // 组件强制背景透明
  useEffect(() => {
    document.documentElement.classList.add("widget-transparent");
    return () => document.documentElement.classList.remove("widget-transparent");
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetch("/api/query", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Query | null) => {
          if (alive) setTrack(data?.track ?? null);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const title = track?.title?.trim();
  const author = track?.author?.trim();
  const playing = !!(title && author);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        pointerEvents: "none",
        padding: 24,
        fontFamily:
          '"Microsoft YaHei", "PingFang SC", "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 22px",
          background: "rgba(8,12,18,.9)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 14,
          boxShadow: "0 12px 34px rgba(0,0,0,.5)",
          opacity: playing ? 1 : 0,
          transform: playing ? "none" : "translateY(10px)",
          transition: "opacity .45s ease, transform .45s ease",
        }}
      >
        {track?.cover ? (
          <img
            src={track.cover}
            alt=""
            style={{ width: 56, height: 36, borderRadius: 6, objectFit: "cover" }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#4aa3ff", letterSpacing: ".12em" }}>
            NOW PLAYING
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>
            {title ?? "—"}
          </span>
          <span style={{ fontSize: 12, color: "#8290a5" }}>{author ?? ""}</span>
        </div>
      </div>
    </div>
  );
}
