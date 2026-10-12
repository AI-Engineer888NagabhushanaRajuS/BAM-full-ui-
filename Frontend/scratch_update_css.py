import os

path = r"f:\UI-SBAM\Frontend\src\rag\rag.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker_start = "/* ===== Jev & Laya Neural Decision Vision & Telemetry System ===== */"
marker_end = "/* Multi-batch Intake Streaming Card */"

idx_start = content.find(marker_start)
idx_end = content.find(marker_end)

if idx_start == -1 or idx_end == -1:
    print(f"Markers not found: start={idx_start}, end={idx_end}")
    exit(1)

replacement = """/* ---- Jev & Laya Enterprise Decision Sentinel -------------------------------- */
.jev-enterprise-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.jev-ent-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.jev-ent-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jev-ent-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.jev-ent-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

/* Segmented Control */
.jev-segmented-control {
  display: inline-flex;
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  flex-wrap: wrap;
}

.jev-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s ease;
  white-space: nowrap;
}

.jev-seg-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-3);
}

.jev-seg-btn.selected {
  color: var(--text);
  background: var(--surface);
  border-color: var(--border);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.jev-seg-key {
  border-left: 1px solid var(--border);
}

/* Body & Panels */
.jev-ent-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jev-ent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 900px) {
  .jev-ent-grid {
    grid-template-columns: 1fr;
  }
}

.jev-ent-panel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jev-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.jev-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.jev-sources-list,
.jev-facts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.jev-source-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}

.jev-source-row:last-child {
  border-bottom: none;
}

.jev-ext-badge {
  font-size: 10px;
  font-weight: 700;
  font-family: var(--mono);
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--muted);
  flex-shrink: 0;
}

.jev-source-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.jev-source-name {
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jev-check-icon {
  color: var(--ok);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.jev-fact-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
}

.jev-fact-bullet {
  color: var(--accent);
  font-weight: bold;
}

.jev-fact-text {
  word-break: break-word;
}

/* Metric Gauges Grid */
.jev-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 1024px) {
  .jev-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .jev-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.jev-metric-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jev-metric-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
}

.jev-metric-label {
  font-weight: 500;
  color: var(--muted);
}

.jev-metric-val {
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text);
}

.jev-metric-bar {
  height: 5px;
  background: var(--surface-3);
  border-radius: 99px;
  overflow: hidden;
  margin: 3px 0 2px;
}

.jev-metric-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .3s ease;
}

.jev-metric-fill.is-high {
  background: var(--ok);
}

.jev-metric-fill.is-med {
  background: var(--warn);
}

.jev-metric-fill.is-low {
  background: var(--err);
}

/* Footer Telemetry */
.jev-ent-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 8px;
}

.jev-telemetry-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  flex-wrap: wrap;
}

.jev-telemetry-divider {
  color: var(--border-strong);
}

"""

new_content = content[:idx_start] + replacement + content[idx_end:]
with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESS: rag.css updated with enterprise styles")
