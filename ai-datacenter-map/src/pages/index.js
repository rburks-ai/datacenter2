import { useState, useEffect, useRef, useCallback } from "react";
import { DATA_CENTERS, STATES, US_STATE_NAMES } from "../data/datacenters";

// ── Utility ──────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "What is the Stargate project?",
  "Which state has the most AI data centers?",
  "Compare Google vs Microsoft AI infrastructure",
  "What's the total MW capacity being built?",
  "Why is Texas a hotspot for AI data centers?",
  "What GPU clusters are being deployed?",
];

export default function Home() {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const mapInitialized = useRef(false);

  const [selectedDC, setSelectedDC] = useState(null);
  const [filterState, setFilterState] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "👋 Ask me anything about AI data centers — locations, capacity, companies, infrastructure investments, or energy usage.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ── Derived data ────────────────────────────────────────────────────────
  const filtered = DATA_CENTERS.filter((dc) => {
    const matchState = filterState === "ALL" || dc.state === filterState;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "operational" && dc.status === "operational") ||
      (filterStatus === "under_construction" && dc.status === "under_construction");
    const matchSearch =
      !search ||
      dc.name.toLowerCase().includes(search.toLowerCase()) ||
      dc.company.toLowerCase().includes(search.toLowerCase()) ||
      dc.city.toLowerCase().includes(search.toLowerCase());
    return matchState && matchStatus && matchSearch;
  });

  const opCount = DATA_CENTERS.filter((d) => d.status === "operational").length;
  const ucCount = DATA_CENTERS.filter((d) => d.status === "under_construction").length;

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInitialized.current) return;
    mapInitialized.current = true;

    import("leaflet").then((L) => {
      leafletRef.current = L;
      const map = L.map("leaflet-map", {
        center: [38.5, -96],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      renderMarkers(L, map, DATA_CENTERS);
    });
  }, []);

  // ── Re-render markers on filter change ─────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    renderMarkers(leafletRef.current, mapRef.current, filtered);
  }, [filtered]);

  const renderMarkers = (L, map, centers) => {
    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    centers.forEach((dc) => {
      const isOp = dc.status === "operational";
      const color = isOp ? "#00e5a0" : "#ffab40";
      const size = Math.max(24, Math.min(40, 24 + dc.capacity_mw / 60));

      const icon = L.divIcon({
        className: "",
        html: `<div class="dc-marker ${isOp ? "op" : "uc"}" 
                    style="width:${size}px;height:${size}px;font-size:${Math.max(8, size / 3.5)}px">
                 ${dc.capacity_mw >= 400 ? "▲" : "●"}
               </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([dc.lat, dc.lng], { icon }).addTo(map);

      const statusLabel = isOp ? "Operational" : "Under Construction";
      const statusClass = isOp ? "op" : "uc";

      marker.bindPopup(
        `<div class="popup-inner">
          <div class="popup-status ${statusClass}">
            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></span>
            ${statusLabel}
          </div>
          <div class="popup-name">${dc.name}</div>
          <div class="popup-company">${dc.company} · ${dc.city}, ${dc.state}</div>
          <div class="popup-desc">${dc.description}</div>
          <div class="popup-stats">
            <div class="popup-stat">
              <div class="popup-stat-label">Capacity</div>
              <div class="popup-stat-value">${dc.capacity_mw} MW</div>
            </div>
            <div class="popup-stat">
              <div class="popup-stat-label">Est. Year</div>
              <div class="popup-stat-value">${dc.year}</div>
            </div>
          </div>
          <div class="popup-tags">
            ${dc.tags.map((t) => `<span class="popup-tag">${t}</span>`).join("")}
          </div>
          <button class="popup-ask-btn" onclick="window.__askAboutDC('${dc.id}')">
            ⚡ Ask Claude about this facility
          </button>
        </div>`,
        { maxWidth: 280 }
      );

      marker.on("click", () => setSelectedDC(dc));
      markersRef.current.push(marker);
    });

    // Expose ask handler for popup button
    window.__askAboutDC = (id) => {
      const dc = DATA_CENTERS.find((d) => d.id === Number(id));
      if (dc) {
        sendMessage(`Tell me more about the ${dc.name} in ${dc.city}, ${dc.state} — operated by ${dc.company}.`);
        map.closePopup();
      }
    };
  };

  // Fly to selected DC
  useEffect(() => {
    if (selectedDC && mapRef.current) {
      mapRef.current.flyTo([selectedDC.lat, selectedDC.lng], 8, { duration: 1.2 });
    }
  }, [selectedDC]);

  // ── Chat ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (overrideText) => {
      const text = overrideText || input.trim();
      if (!text || loading) return;
      if (!overrideText) setInput("");

      const userMsg = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const contextMsg = {
        role: "user",
        content: `[Context: Currently showing ${filtered.length} AI data centers. Filter: State=${filterState}, Status=${filterStatus}. Selected: ${selectedDC ? selectedDC.name : "none"}]\n\n${text}`,
      };

      const history = messages
        .filter((m) => m.role !== "system")
        .concat(contextMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "⚠️ Error contacting Claude. Check your API key in pages/api/chat.js." },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Network error. Make sure the API route is running." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, filtered, filterState, filterStatus, selectedDC]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── States present in filtered data ───────────────────────────────────
  const activeStates = [...new Set(DATA_CENTERS.map((d) => d.state))].sort();

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="pulse" />
          <div className="header-title">
            AI DATACENTER <span>TRACKER</span>
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-item">
            <div className="stat-dot green" />
            <span className="stat-label">Operational:</span>
            <span className="stat-value">{opCount}</span>
          </div>
          <div className="stat-item">
            <div className="stat-dot amber" />
            <span className="stat-label">Under Construction:</span>
            <span className="stat-value">{ucCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total MW Tracked:</span>
            <span className="stat-value">
              {DATA_CENTERS.reduce((s, d) => s + d.capacity_mw, 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="header-tag">USA · {DATA_CENTERS.length} Facilities</div>
      </header>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-section-label">Search Facilities</div>
          <input
            className="search-box"
            placeholder="Search name, company, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="status-filter">
          <button
            className={`status-btn ${filterStatus === "all" ? "active-all" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All
          </button>
          <button
            className={`status-btn ${filterStatus === "operational" ? "active-op" : ""}`}
            onClick={() => setFilterStatus("operational")}
          >
            ● Operational
          </button>
          <button
            className={`status-btn ${filterStatus === "under_construction" ? "active-uc" : ""}`}
            onClick={() => setFilterStatus("under_construction")}
          >
            ◈ In Progress
          </button>
        </div>

        {/* State filter */}
        <div className="state-filter-grid">
          <button
            className={`state-pill all-pill ${filterState === "ALL" ? "active" : ""}`}
            onClick={() => setFilterState("ALL")}
          >
            ALL
          </button>
          {activeStates.map((st) => (
            <button
              key={st}
              className={`state-pill ${filterState === st ? "active" : ""}`}
              onClick={() => setFilterState(filterState === st ? "ALL" : st)}
              title={US_STATE_NAMES[st]}
            >
              {st}
            </button>
          ))}
        </div>

        {/* DC list */}
        <div className="dc-list">
          {filtered.length === 0 ? (
            <div className="empty-state">No facilities match your filters.</div>
          ) : (
            filtered.map((dc) => {
              const isOp = dc.status === "operational";
              return (
                <div
                  key={dc.id}
                  className={`dc-item ${selectedDC?.id === dc.id ? "selected" + (!isOp ? " amber" : "") : ""}`}
                  onClick={() => setSelectedDC(dc)}
                >
                  <div className="dc-item-header">
                    <div className="dc-item-name">{dc.name}</div>
                    <div className={`dc-status-badge ${isOp ? "op" : "uc"}`} />
                  </div>
                  <div className="dc-item-meta">
                    <span>{dc.city}, {dc.state}</span>
                    <span>·</span>
                    <span>{dc.capacity_mw} MW</span>
                    <span>·</span>
                    <span className="dc-item-company">{dc.company.split(" / ")[0]}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Map ── */}
      <main className="map-container">
        <div id="leaflet-map" />
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#00e5a0", boxShadow: "0 0 6px #00e5a0" }} />
            Operational
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#ffab40", boxShadow: "0 0 6px #ffab40" }} />
            Under Construction
          </div>
          <div className="legend-item" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
            Marker size = MW capacity
          </div>
        </div>
      </main>

      {/* ── Chat Panel ── */}
      <aside className="chat-panel">
        <div className="chat-header">
          <div className="chat-header-title">
            AI Infrastructure Analyst
            <span className="claude-badge">Claude</span>
          </div>
          <div className="chat-subtitle">Ask anything about AI data centers</div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-label">
                {msg.role === "user" ? "YOU" : msg.role === "assistant" ? "CLAUDE" : "SYSTEM"}
              </div>
              <div className="message-bubble" style={{ whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-label">CLAUDE</div>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="quick-prompts">
          {QUICK_PROMPTS.map((q) => (
            <button key={q} className="quick-prompt-btn" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>

        <div className="chat-input-area">
          <textarea
            className="chat-input"
            placeholder="Ask about AI infrastructure…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            ↑
          </button>
        </div>
      </aside>
    </div>
  );
}
