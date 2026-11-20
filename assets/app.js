/* Policy Window Monitor — front end. Reads window.PWM_DATA (data/chile-2026-11.js). */
(function () {
  "use strict";
  const D = window.PWM_DATA;
  if (!D) { document.body.insertAdjacentHTML("afterbegin", "<p style='padding:20px'>Data file not found.</p>"); return; }

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = Object.fromEntries(D.topics.map((t) => [t.id, t]));
  const LEVEL = D.levels || ["No signal", "Weak signal", "Signal", "Strong signal"];
  const STREAMS = [["P", "Problem"], ["Po", "Politics"]];
  const STATUS_ORDER = ["problem", "political", "watch", "closing", "closed", "none"];
  const NW = D.weeks.length, LATEST = D.weeks[NW - 1];
  const REVIEW = (D.reviews || []).find((r) => r.week === LATEST.id);
  const proposedWeek = REVIEW && REVIEW.status === "proposed" ? LATEST.id : null;
  const itemById = Object.fromEntries(D.items.map((i) => [i.id, i]));
  const STATUS = D.statusLabels;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- storage (follow list) ---------- */
  let following = new Set();
  try { following = new Set(JSON.parse(localStorage.getItem("pwm-follow") || "[]")); } catch (e) { /* storage unavailable */ }
  function saveFollow() { try { localStorage.setItem("pwm-follow", JSON.stringify([...following])); } catch (e) { /* ignore */ } }

  /* ---------- tooltip ---------- */
  const tip = $("#tooltip");
  function showTip(html, ev) {
    tip.innerHTML = html; tip.hidden = false;
    const pad = 14, r = tip.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - pad;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }
  function bindTip(el, htmlFn) {
    el.addEventListener("mousemove", (e) => showTip(htmlFn(), e));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); showTip(htmlFn(), { clientX: r.right, clientY: r.top }); });
    el.addEventListener("blur", hideTip);
  }

  /* ---------- concepts: codebook hover help ---------- */
  const CONCEPTS = D.concepts || {}, CALIAS = D.conceptAliases || {}, COLD = D.conceptOld || {};
  function conceptInfo(name) {
    const k = CONCEPTS[name] ? name : CALIAS[name];
    if (k && CONCEPTS[k]) return { key: k, stream: CONCEPTS[k].stream, def: CONCEPTS[k].definition };
    if (COLD[name]) return { key: name, stream: "", def: COLD[name] };
    return null;
  }
  const cTag = (name) => {
    const c = conceptInfo(name);
    return `<span class="concept${c && c.stream ? " c-" + c.stream.toLowerCase() : ""}" tabindex="0" data-concept="${esc(name)}">${esc(name)}</span>`;
  };
  /* concept checks of the latest week: one per topic, stream and concept */
  const CHECKS = (REVIEW && REVIEW.conceptSignals) || [];
  const STRENGTH = ["", "Mention or single source", "Substantive, corroborated", "Decisive"];
  const strengthDots = (n) => `<span class="sdots" title="Strength ${n}: ${STRENGTH[n] || ""}" aria-label="Strength ${n} of 3">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
  const checksFor = (topic, stream) => CHECKS.filter((c) => c.topic === topic && c.stream === stream);
  const checkList = (topic, stream) => {
    const cs = checksFor(topic, stream);
    if (!cs.length) return "";
    return `<ul class="checks">${cs.map((c) => `<li><div class="check-head">${cTag(c.concept)} ${strengthDots(c.strength)} <span class="note">${c.items.length} item${c.items.length === 1 ? "" : "s"}</span></div><p>${esc(c.rationale)}</p></li>`).join("")}</ul>`;
  };
  const conceptTip = (name) => {
    const c = conceptInfo(name);
    if (!c) return `<b>${esc(name)}</b>`;
    return `<b>${esc(c.key)}</b>${c.stream ? ` · ${esc(c.stream)} stream` : ""}${c.key !== name ? `<br><i>Earlier label: ${esc(name)}</i>` : ""}<br>${esc(c.def)}`;
  };
  document.addEventListener("mousemove", (e) => { const el = e.target.closest && e.target.closest("[data-concept]"); if (el) showTip(conceptTip(el.dataset.concept), e); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest("[data-concept]")) hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest("[data-concept]"); if (el) { const r = el.getBoundingClientRect(); showTip(conceptTip(el.dataset.concept), { clientX: r.right, clientY: r.top }); } });
  document.addEventListener("focusout", (e) => { if (e.target.closest && e.target.closest("[data-concept]")) hideTip(); });

  const lvPill = (v, title) => `<span class="lv l${v}" title="${esc(title || LEVEL[v])}">${v}</span>`;
  const dot = (st) => `<span class="dot ${st}" aria-hidden="true"></span>`;
  const badge = (t) => `<span class="badge">${dot(t.status)}${esc(t.statusLabel)}</span>`;
  const streamsTip = (t, lv) => STREAMS.map(([k, n], i) => `${n}: <b>${lv[i]} ${LEVEL[lv[i]]}</b>`).join("<br>");
  const fmtDate = (iso) => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const p = iso.split("-"); return p.length === 3 ? `${+p[2]} ${m[+p[1] - 1]}` : iso; };

  /* ---------- banner + footer ---------- */
  $("#run-banner").innerHTML =
    `<span class="pill">${esc(D.meta.country)}</span><span>Latest week: ${esc(LATEST.id)} (${esc(LATEST.label)})</span><span>Protocol ${esc(D.meta.protocol)}</span><span>${D.items.length} coded items · ${D.topics.length} topics</span>` +
    (proposedWeek ? `<span class="warn">${esc(proposedWeek)} levels are proposed and still under review.</span>` : "");
  $$("[data-country]").forEach((el) => { el.textContent = D.meta.country; });
  const PREV = NW > 1 ? NW - 2 : null;
  const prevLv = (t) => (PREV != null && t.traj[PREV]) ? t.traj[PREV] : null;
  const isWindow = (t) => t.status === "problem" || t.status === "political";
  const onAgenda = (t) => ["problem", "political", "watch", "closing"].includes(t.status);
  const arrow = (a, b) => a == null ? `<span class="chg new">new</span>` : b > a ? `<span class="chg up" aria-label="up from ${a}">▲ from ${a}</span>` : b < a ? `<span class="chg down" aria-label="down from ${a}">▼ from ${a}</span>` : `<span class="chg same">=</span>`;
  $("#footer").innerHTML = `<p>${esc(D.meta.note)}</p><p>Policy Window Monitor applies Kingdon's Multiple Streams Framework, adapted for Latin America, to weekly data. Data and code are open. Generated ${esc(D.meta.generated)}.</p>`;



  /* ---------- this week at a glance ---------- */
  function renderHeroNow() {
    const wins = D.topics.filter(isWindow).sort((a, b) => (b.P + b.Po) - (a.P + a.Po));
    const watch = D.topics.filter((t) => t.status === "watch");
    const closed = D.topics.filter((t) => (t.status === "closing" || t.status === "closed") && t.closeWeek === NW);
    $("#hero-now").innerHTML = `<div class="now-week">${esc(LATEST.id)} · ${esc(LATEST.label)}</div>
      <a class="now-big" href="#h-windows" data-jump="h-windows"><span class="now-num">${wins.length}</span><span class="now-lab">potential window${wins.length === 1 ? "" : "s"} this week</span></a>
      <ul class="now-list">${wins.map((t) => `<li><button type="button" data-topic="${t.id}">${dot(t.status)}${esc(t.short)}</button></li>`).join("")}</ul>
      <div class="now-row"><span><b>${watch.length}</b> on watch</span>${closed.length ? `<span><b>${closed.length}</b> closed or closing this week</span>` : ""}</div>
      <a class="now-link" href="#report">What changed since last week →</a>`;
    $$("#hero-now [data-topic]").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    $$("[data-jump]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  }

  /* ---------- window map ---------- */
  function renderMap() {
    const legend = $("#map-legend");
    legend.innerHTML = STATUS_ORDER.map((s) => `<span class="legend-item">${dot(s)}${esc(STATUS[s])}</span>`).join("") +
      `<span class="legend-item"><span class="swatch zone-both"></span>Potential window: both streams at level 2 or 3</span>` +
      `<span class="legend-item"><span class="swatch zone-one"></span>Watch: one stream at level 2 or 3</span>`;
    const map = $("#window-map");
    let html = "";
    for (let po = 3; po >= 0; po--) {
      html += `<div class="map-rowlab"><span><b>${po}</b>${LEVEL[po]}</span></div>`;
      for (let p = 0; p <= 3; p++) {
        const zone = p >= 2 && po >= 2 ? "zone-both" : (p >= 2 || po >= 2 ? "zone-one" : "");
        const items = D.topics.filter((t) => t.P === p && t.Po === po)
          .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        const tag = p === 3 && po === 3 ? `<span class="zone-tag">Potential window</span>` : "";
        html += `<div class="cell ${zone}${tag ? " has-tag" : ""}" aria-label="Problem ${p}, politics ${po}${zone === "zone-both" ? ": potential window" : ""}">${tag}` +
          items.map((t) => `<button type="button" class="chip ${t.status}" data-topic="${t.id}"><span class="chip-name">${esc(t.short)}</span></button>`).join("") +
          `</div>`;
      }
    }
    html += `<div></div>` + [0, 1, 2, 3].map((p) => `<div class="map-collab"><b>${p}</b>${LEVEL[p]}</div>`).join("");
    map.innerHTML = html;
    requestAnimationFrame(() => { const w = map.closest(".map-wrap"); if (w && w.scrollWidth > w.clientWidth) w.scrollLeft = w.scrollWidth; });
    $$(".chip", map).forEach((c) => {
      const t = byId[c.dataset.topic];
      c.addEventListener("click", () => openTopic(t.id));
      bindTip(c, () => `<b>${esc(t.name)}</b><br>${esc(t.statusLabel)}<br>${streamsTip(t, [t.P, t.Po])}`);
    });
  }

  /* ---------- weekly grid ---------- */
  let weeklySort = "status";
  function renderLevelLegend() {
    $("#level-legend").innerHTML = [0, 1, 2, 3].map((v) => `<span class="legend-item"><span class="swatch l${v}"></span>${v} ${LEVEL[v]}</span>`).join("") +
      `<span class="legend-item"><span class="swatch" style="background:repeating-linear-gradient(135deg,var(--grid) 0 3px,transparent 3px 7px);border:1px solid var(--grid)"></span>Not observed</span>` +
      `<span class="legend-item"><span class="swatch" style="border:1.5px solid var(--text-primary)"></span>Window flagged</span>` +
      (proposedWeek ? `<span class="legend-item"><span class="swatch" style="outline:1.5px dashed var(--st-opening);outline-offset:1px"></span>Proposed, awaiting review</span>` : "") +
      `<span class="legend-item"><b>×</b>&nbsp;Window closed or closing</span>`;
  }
  function renderWeekly() {
    const rows = D.topics.slice().sort((a, b) => weeklySort === "status"
      ? STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.id.localeCompare(b.id)
      : a.ministry.localeCompare(b.ministry) || a.id.localeCompare(b.id));
    let h = `<thead><tr><th class="topic-h">Topic</th><th>Now<small>P · Po</small></th>` +
      D.weeks.map((w) => `<th class="${w.id === proposedWeek ? "proposed" : ""}">${w.id}<small>${esc(w.label)}</small></th>`).join("") + `</tr></thead><tbody>`;
    rows.forEach((t) => {
      h += `<tr><td class="tname"><button type="button" class="tlink" data-topic="${t.id}">${dot(t.status)}<span class="n">${esc(t.short)}</span></button><span class="tmin">${esc(t.ministry)}</span></td>`;
      h += `<td><span class="cur">${lvPill(t.P, "Problem")}${lvPill(t.Po, "Politics")}</span></td>`;
      t.traj.forEach((lv, i) => {
        const wk = i + 1;
        const openM = (t.openWeek === wk ? " open-mark" : "") + (D.weeks[i].id === proposedWeek ? " proposed" : "");
        const mk = t.closeWeek === wk ? `<span class="mk" aria-label="closed">×</span>` : "";
        if (!lv) h += `<td><div class="wk na${openM}" data-t="${t.id}" data-w="${i}" tabindex="0" aria-label="${esc(t.short)} ${D.weeks[i].id}: not observed">${mk}</div></td>`;
        else h += `<td><div class="wk${openM}" data-t="${t.id}" data-w="${i}" tabindex="0" aria-label="${esc(t.short)} ${D.weeks[i].id}: problem ${lv[0]}, politics ${lv[1]}">${lv.map((v) => `<span class="l${v}"></span>`).join("")}${mk}</div></td>`;
      });
      h += `</tr>`;
    });
    $("#weekly").innerHTML = h + "</tbody>";
    $$("#weekly .tlink").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    $$("#weekly .wk").forEach((c) => {
      const t = byId[c.dataset.t], i = +c.dataset.w, w = D.weeks[i], lv = t.traj[i];
      bindTip(c, () => `<b>${esc(t.short)}</b> · ${w.id} (${esc(w.label)})<br>` +
        (lv ? streamsTip(t, lv) : "Not observed") +
        (D.weeks[i].id === proposedWeek ? "<br><i>Proposed, awaiting review</i>" : "") + (t.openWeek === i + 1 ? "<br><b>Window flagged</b>" : "") + (t.closeWeek === i + 1 ? "<br><b>Window closed / closing</b>" : ""));
    });
  }
  $$(".seg-btn").forEach((b) => b.addEventListener("click", () => {
    $$(".seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
    weeklySort = b.dataset.sort; renderWeekly();
  }));

  /* ---------- svg helpers ---------- */
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgText(parent, x, y, txt, attrs) { const t = svgEl("text", Object.assign({ x, y }, attrs || {}), parent); t.textContent = txt; return t; }
  const dnum = (iso) => Date.parse(iso + "T12:00:00Z") / 864e5;

  /* ---------- calendar ---------- */
  function renderCalendar() {
    const W = 1100, left = 150, right = 24, laneH = 48, top = 40;
    const lanes = [];
    D.calendar.forEach((e) => { if (!lanes.includes(e.lane)) lanes.push(e.lane); });
    const H = top + lanes.length * laneH + 10;
    const x0 = dnum("2026-11-01"), x1 = dnum("2027-02-15");
    const X = (iso) => left + (dnum(iso) - x0) / (x1 - x0) * (W - left - right);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Timeline of decision points, November 2026 to February 2027" });
    const months = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"];
    const mname = { "2026-11-01": "Nov 2026", "2026-12-01": "Dec", "2027-01-01": "Jan 2027", "2027-02-01": "Feb" };
    months.forEach((m) => { svgEl("line", { x1: X(m), x2: X(m), y1: top - 6, y2: H - 6, class: "gridline" }, svg); svgText(svg, X(m) + 4, 16, mname[m]); });
    lanes.forEach((lane, li) => {
      const y = top + li * laneH;
      const evs = D.calendar.filter((e) => e.lane === lane);
      const topic = evs.find((e) => e.topic) ? byId[evs.find((e) => e.topic).topic] : null;
      const g = svgEl("g", { class: "lane", tabindex: topic ? 0 : -1, role: topic ? "button" : "presentation", "aria-label": lane }, svg);
      svgEl("rect", { x: 0, y: y + 2, width: W, height: laneH - 6, rx: 8, class: "lane-bg" }, g);
      svgText(g, 10, y + laneH / 2 + 3, lane, { class: "t-strong" });
      evs.forEach((e, ei) => {
        const cy = y + 14;
        const stVar = { problem: "opening", political: "open", watch: "waiting", closing: "closed", closed: "closed", none: "none" };
        const col = topic ? `var(--st-${stVar[topic.status] || "none"})` : "var(--text-secondary)";
        let mark;
        if (e.end) {
          mark = svgEl("rect", { x: X(e.date), y: cy - 5, width: Math.max(6, X(e.end) - X(e.date)), height: 10, rx: 5, fill: col, "fill-opacity": 0.85 }, g);
        } else {
          const cx = X(e.date), s = e.key ? 8 : 6;
          mark = svgEl("path", { d: `M${cx} ${cy - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}z`, fill: col, stroke: "var(--surface-1)", "stroke-width": 1.5 }, g);
        }
        const multi = evs.length > 1 && evs.some((x) => x.end) && evs.some((x) => !x.end);
        let lx, ly, anchor;
        const mid = e.end ? (X(e.date) + X(e.end)) / 2 : X(e.date);
        if (multi) { lx = mid; ly = ei % 2 === 1 ? cy - 11 : cy + 21; anchor = "middle"; }
        else if (e.end) { lx = X(e.date); ly = cy + 20; anchor = "start"; }
        else { lx = X(e.date) + 11; ly = cy + 4; anchor = "start"; }
        svgText(g, lx, ly, e.short || e.label, { "text-anchor": anchor, class: e.key ? "t-strong" : "" });
        const hit = svgEl("rect", { x: (e.end ? X(e.date) : X(e.date) - 9), y: cy - 10, width: e.end ? Math.max(18, X(e.end) - X(e.date)) : 18, height: 20, fill: "transparent" }, g);
        bindTip(hit, () => `<b>${esc(e.label)}</b><br>${fmtDate(e.date)}${e.end ? " – " + fmtDate(e.end) : ""}${topic ? "<br>Topic: " + esc(topic.short) + " (" + esc(topic.statusLabel) + ")" : ""}`);
        if (mark) mark.setAttribute("aria-hidden", "true");
      });
      if (topic) {
        g.style.cursor = "pointer";
        g.addEventListener("click", () => openTopic(topic.id));
        g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openTopic(topic.id); } });
      }
    });
    const tx = X(D.meta.generated);
    svgEl("line", { x1: tx, x2: tx, y1: top - 6, y2: H - 6, class: "today" }, svg);
    svgText(svg, tx - 4, 30, "Today", { class: "t-strong", "text-anchor": "end" });
    const host = $("#calendar"); host.innerHTML = ""; host.appendChild(svg);
  }

  function renderNext() {
    const today = D.meta.generated, end = new Date(Date.parse(today + "T12:00:00Z") + 28 * 864e5).toISOString().slice(0, 10);
    const evs = D.calendar.filter((e) => (e.end || e.date) >= today && e.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    $("#next-list").innerHTML = evs.length ? evs.map((e) => {
      const t = e.topic && byId[e.topic];
      return `<li><span class="nd">${fmtDate(e.date)}${e.end ? "–" + fmtDate(e.end) : ""}</span><span class="nl">${esc(e.label)}</span>${t ? `<button type="button" class="nt" data-topic="${t.id}">${dot(t.status)}${esc(t.short)} <span class="note">${esc(t.statusLabel)}</span></button>` : ""}</li>`;
    }).join("") : `<li class="note">No scheduled decision points in the next four weeks.</li>`;
    $$("#next-list [data-topic]").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
  }

  /* ---------- approval chart ---------- */
  function renderApproval() {
    const polls = [["Cadem", "var(--st-open)"], ["Criteria", "var(--st-opening)"]];
    $("#approval-legend").innerHTML = polls.map(([p, c]) => `<span class="legend-item"><span class="swatch" style="background:${c};height:3px;width:16px"></span>${p}</span>`).join("") +
      `<span class="legend-item"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="var(--text-secondary)" stroke-width="2"/></svg>Approve</span>` +
      `<span class="legend-item"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="var(--text-secondary)" stroke-width="2" stroke-dasharray="4 3"/></svg>Disapprove</span>`;
    const W = 560, H = 300, l = 36, r = 104, t = 14, b = 30;
    const x0 = dnum("2026-10-01"), x1 = Math.max(dnum(D.meta.generated), ...D.approval.map((a) => dnum(a.date)));
    const X = (iso) => l + (dnum(iso) - x0) / (x1 - x0) * (W - l - r);
    const lo = Math.min(...D.approval.map((a) => a.approve)), yMin = Math.min(20, Math.floor((lo - 2) / 5) * 5), yMax = 75, Y = (v) => t + (yMax - v) / (yMax - yMin) * (H - t - b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Presidential approval and disapproval by poll, October to November 2026" });
    [10, 20, 30, 40, 50, 60, 70].filter((v) => v >= yMin).forEach((v) => { svgEl("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), class: "gridline" }, svg); svgText(svg, l - 6, Y(v) + 4, v + "%", { "text-anchor": "end" }); });
    ["2026-10-01", "2026-10-15", "2026-11-01"].forEach((d) => svgText(svg, X(d), H - 8, fmtDate(d), { "text-anchor": "middle" }));
    svgEl("line", { x1: l, x2: W - r, y1: H - b, y2: H - b, class: "axisline" }, svg);
    const ends = [];
    polls.forEach(([p, c]) => {
      const pts = D.approval.filter((a) => a.poll === p).sort((a, b2) => a.date.localeCompare(b2.date));
      [["approve", null], ["disapprove", "5 4"]].forEach(([k, dash]) => {
        const at = { d: pts.map((a, i) => (i ? "L" : "M") + X(a.date) + " " + Y(a[k])).join(""), fill: "none", stroke: c, "stroke-width": 2, "stroke-linejoin": "round" };
        if (dash) at["stroke-dasharray"] = dash;
        svgEl("path", at, svg);
        pts.forEach((a) => {
          svgEl("circle", { cx: X(a.date), cy: Y(a[k]), r: dash ? 3 : 4.5, fill: dash ? "var(--surface-1)" : c, stroke: dash ? c : "var(--surface-1)", "stroke-width": 2 }, svg);
          const hit = svgEl("circle", { cx: X(a.date), cy: Y(a[k]), r: 11, fill: "transparent", tabindex: 0, "aria-label": `${p} ${fmtDate(a.date)}: approve ${a.approve}%, disapprove ${a.disapprove}%` }, svg);
          bindTip(hit, () => `<b>${p}</b> · ${fmtDate(a.date)}<br>Approve <b>${a.approve}%</b> · Disapprove <b>${a.disapprove}%</b><br>Net ${a.approve - a.disapprove}`);
        });
        const last = pts[pts.length - 1];
        ends.push({ y: Y(last[k]), x: X(last.date), text: `${p} ${last[k]}%`, k });
      });
    });
    // end labels, nudged apart so they never overlap
    ends.sort((a, b2) => a.y - b2.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach((e) => svgText(svg, W - r + 8, e.y + 4, e.text, { class: e.k === "approve" ? "t-strong" : "" }));
    const host = $("#approval"); host.innerHTML = ""; host.appendChild(svg);
    $("#approval-table").innerHTML = `<table><thead><tr><th>Poll</th><th>Published</th><th>Approve</th><th>Disapprove</th><th>Net</th></tr></thead><tbody>` +
      D.approval.slice().sort((a, b2) => a.date.localeCompare(b2.date)).map((a) => `<tr><td>${a.poll}</td><td>${fmtDate(a.date)}</td><td>${a.approve}%</td><td>${a.disapprove}%</td><td>${a.approve - a.disapprove}</td></tr>`).join("") +
      `</tbody></table><p class="note">${esc(D.context.approvalNote)}</p>`;
  }

  /* ---------- potential windows: one box per topic ---------- */
  const REPORT = D.report || {};
  function renderWindowCards() {
    const wins = D.topics.filter(isWindow).sort((a, b) => (b.P + b.Po) - (a.P + a.Po) || a.id.localeCompare(b.id));
    const closing = D.topics.filter((t) => t.status === "closing");
    $("#windows-sub").textContent = wins.length
      ? `Topics with both streams at level 2 or 3 in ${LATEST.id}.` + (closing.length ? ` ${closing.map((t) => t.short).join(", ")} ${closing.length === 1 ? "is" : "are"} closing.` : "")
      : `No topic has both streams at level 2 or 3 in ${LATEST.id}.`;
    $("#window-cards").innerHTML = wins.map((t) => {
      const pv = prevLv(t);
      return `<article class="wcard ${t.status}">
        <div class="wcard-top">${badge(t)}<span class="meta">${esc(t.ministry)}</span></div>
        <h3>${esc(t.name)}</h3>
        <div class="wstreams"><span>Problem ${lvPill(t.P)} ${arrow(pv ? pv[0] : null, t.P)}</span><span>Politics ${lvPill(t.Po)} ${arrow(pv ? pv[1] : null, t.Po)}</span></div>
        <p class="wtiming"><b>Next:</b> ${esc(t.timing)}</p>
        <div class="wactions">
          <a class="btn" href="#report" data-report="${t.id}">What changed since last week</a>
          <button type="button" class="btn primary" data-topic="${t.id}">Explore the topic</button>
        </div>
      </article>`;
    }).join("") || `<p class="empty">No potential windows this week. See the topics on watch.</p>`;
    $$("#window-cards [data-topic]").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    $$("[data-report]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); goReport(a.dataset.report); }));
  }

  /* ---------- weekly report: what changed since last week ---------- */
  let reportTarget = null;
  function goReport(id) { reportTarget = id; if (location.hash !== "#report") location.hash = "report"; else scrollReport(); }
  function scrollReport() { if (!reportTarget) { window.scrollTo(0, 0); return; } const el = document.getElementById("rep-" + reportTarget); reportTarget = null; if (el) el.scrollIntoView({ block: "start" }); }
  function renderReport() {
    const prevW = PREV != null ? D.weeks[PREV] : null;
    const changed = D.topics.filter((t) => { const pv = prevLv(t), cur = t.traj[NW - 1]; return REPORT.topics && REPORT.topics[t.id] || !pv || (cur && (pv[0] !== cur[0] || pv[1] !== cur[1])) || t.openWeek === NW || t.closeWeek === NW; })
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.id.localeCompare(b.id));
    const sig = (t, st) => (REVIEW ? REVIEW.signals : []).find((x) => x.topic === t.id && x.stream === st);
    const stream = (t, st, k, i) => {
      const pv = prevLv(t), s = sig(t, st);
      return `<div class="rep-stream"><div class="rep-sh">${st} ${lvPill(t[k])} ${arrow(pv ? pv[i] : null, t[k])}</div>
        ${checksFor(t.id, st).length ? checkList(t.id, st) : ""}
        ${s ? `<p class="rationale"><b>Level:</b> ${esc(s.rationale)}</p>` : `<p class="note">No new evidence this week; the level carries forward.</p>`}</div>`;
    };
    $("#report-body").innerHTML = `
      <p class="lead">${esc(LATEST.id)} (${esc(LATEST.label)})${prevW ? ` compared with ${esc(prevW.id)} (${esc(prevW.label)})` : ""}. This is the technical version: each topic's levels, the concept checks behind them, and what to watch next. ${proposedWeek ? "Levels are proposed and under review." : "Levels were reviewed by a person."}</p>
      ${REPORT.intro ? `<article class="panel rep-intro"><h2>The week in brief</h2><p>${esc(REPORT.intro)}</p></article>` : ""}
      <nav class="rep-toc" aria-label="Topics in this report">${changed.map((t) => `<a href="#report" data-goto="${t.id}">${dot(t.status)}${esc(t.short)}</a>`).join("")}</nav>
      ${changed.map((t) => `<article class="panel rep-topic" id="rep-${t.id}">
        <div class="rep-head"><div><div class="meta">${esc(t.id)} · ${esc(t.ministry)}</div><h2>${esc(t.name)}</h2></div>${badge(t)}</div>
        ${REPORT.topics && REPORT.topics[t.id] ? `<p class="rep-sum">${esc(REPORT.topics[t.id])}</p>` : `<p class="rep-sum">${esc(t.changed)}</p>`}
        <details class="check-details"><summary>Evidence: concept checks and level rationales</summary>
          ${stream(t, "Problem", "P", 0)}${stream(t, "Politics", "Po", 1)}</details>
        <div class="wactions"><button type="button" class="btn primary" data-topic="${t.id}">Explore the topic</button></div>
      </article>`).join("")}`;
    $$("#report-body [data-topic]").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    $$("#report-body [data-goto]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); reportTarget = a.dataset.goto; scrollReport(); }));
  }

  /* ---------- context ---------- */
  function renderContext() {
    const c = D.context;
    $("#context").innerHTML =
      `<div><h3>Executive</h3><p>${esc(c.executive)}</p><h3>Cabinet</h3><p>${esc(c.cabinet)}</p></div>` +
      `<div><h3>Most important problems</h3><ul>${c.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` +
      `<div style="grid-column:1/-1"><h3>Budget Law 2027</h3><p>${esc(c.budget)}</p></div>`;
  }

  /* ---------- topics view ---------- */
  const GAPS = [
    { title: "Windows without an evidence-based alternative", text: "Strong problem streams, but no mature solution in circulation. Evidence produced now could shape the response.",
      items: [["T21", "Alternatives to capping fuel prices, such as targeted support"], ["T04", "Rules and safeguards for sentence-reduction eligibility"], ["T06", "An employment package beyond Sala Cuna"]] },
    { title: "On watch: one stream signalling", text: "Decisions can still be taken here through politics alone, without public attention.",
      items: [["T02", "Budget replaces Calles sin Violencia with Plan FOCO"], ["T11", "Primary-care mental health budget line"], ["T05", "Closing as Fund E recovers; compensation bill pending"]] },
    { title: "Evidence that could still move decisions before the budget deadline", text: "Open windows where specific evidence could inform the Senate votes (17–19 Nov) or the fuel bill.",
      items: [["T09", "Primary-care financing and immunisation"], ["T14", "Digital education programmes"], ["T21", "Price-smoothing funds and fuel subsidies"]] },
  ];
  function renderGaps() {
    $("#gaps").innerHTML = GAPS.map((g) => `<div class="gap"><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p><ul>` +
      g.items.map(([id, d]) => `<li><button type="button" data-topic="${id}"><span class="gt">${dot(byId[id].status)}${esc(byId[id].short)}</span><span class="gd">${esc(d)}</span></button></li>`).join("") + `</ul></div>`).join("");
    $$("#gaps button").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
  }

  let activeStatus = "agenda", activeMinistry = "", query = "";
  function renderFilters() {
    const opts = [["agenda", "On the agenda now"], ["all", "All"], ["following", "Following"], ["problem", STATUS.problem], ["political", STATUS.political], ["watch", STATUS.watch], ["closing", "Closing or closed"], ["none", STATUS.none]];
    const count = (k) => k === "all" ? D.topics.length : k === "following" ? following.size : k === "agenda" ? D.topics.filter(onAgenda).length : D.topics.filter((t) => (k === "closing" ? ["closing", "closed"].includes(t.status) : t.status === k)).length;
    $("#status-filter").innerHTML = opts.map(([k, l]) => `<button type="button" class="fchip ${activeStatus === k ? "is-on" : ""}" data-k="${k}" aria-pressed="${activeStatus === k}">${["all", "following", "agenda"].includes(k) ? "" : dot(k)}${esc(l)} <span class="count">${count(k)}</span></button>`).join("");
    $$("#status-filter .fchip").forEach((b) => b.addEventListener("click", () => { activeStatus = b.dataset.k; renderCards(); }));
  }
  function initMinistry() {
    const ms = [...new Set(D.topics.map((t) => t.ministry))].sort();
    $("#ministry-filter").innerHTML = `<option value="">All ministries</option>` + ms.map((m) => `<option>${esc(m)}</option>`).join("");
    $("#ministry-filter").addEventListener("change", (e) => { activeMinistry = e.target.value; renderCards(); });
    $("#topic-search").addEventListener("input", (e) => { query = e.target.value.toLowerCase(); renderCards(); });
  }
  function matches(t) {
    if (activeStatus === "following" && !following.has(t.id)) return false;
    if (activeStatus === "agenda" && !onAgenda(t)) return false;
    if (!["all", "following", "agenda"].includes(activeStatus)) {
      if (activeStatus === "closing" ? !["closing", "closed"].includes(t.status) : t.status !== activeStatus) return false;
    }
    if (activeMinistry && t.ministry !== activeMinistry) return false;
    if (query) {
      const pc = D.policyChecks[t.id];
      const hay = [t.name, t.ministry, t.problem, t.politics, t.policy, t.frames, t.changed, ...(t.brokers || []), ...(t.entrepreneurs || []), ...(pc ? pc.ideas : [])].join(" ").toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }
  function renderCards() {
    renderFilters();
    $$("#topic-mode .seg-btn").forEach((b) => b.classList.toggle("is-on", b.dataset.mode === activeStatus));
    $("#topics-lead").textContent = activeStatus === "agenda"
      ? "Topics with a potential window or one strong stream this week, the ones decision-makers and evidence producers can act on now. Follow a topic to keep it at the top in your browser."
      : "Every topic the monitor follows, including closed windows and topics with no signal, so you can see how close each one is to the agenda. Follow a topic to keep it at the top in your browser.";
    const list = D.topics.filter(matches).sort((a, b) =>
      (following.has(b.id) - following.has(a.id)) || STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.id.localeCompare(b.id));
    $("#cards").innerHTML = list.length ? list.map((t) => `
      <article class="card ${t.status}">
        <div class="card-top"><div><div class="meta">${esc(t.id)} · ${esc(t.ministry)}</div><h3>${esc(t.name)}</h3></div></div>
        <div>${badge(t)}</div>
        <div class="streams"><span>Problem ${lvPill(t.P)}</span><span>Politics ${lvPill(t.Po)}</span></div>
        ${["problem", "political", "closing"].includes(t.status) && t.type !== "—" ? `<div class="meta">${esc(t.coupling)} coupling · ${esc(t.timing)}</div>` : `<div class="meta">${esc(t.timing)}</div>`}
        <p class="changed">${esc(t.changed)}</p>
        <div class="card-actions">
          <button type="button" class="follow" data-follow="${t.id}" aria-pressed="${following.has(t.id)}">${following.has(t.id) ? "★ Following" : "☆ Follow"}</button>
          <button type="button" class="btn primary" data-topic="${t.id}">Open topic</button>
        </div>
      </article>`).join("") : `<p class="empty">No topics match these filters.</p>`;
    $$("#cards [data-topic]").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    $$("#cards [data-follow]").forEach((b) => b.addEventListener("click", () => toggleFollow(b.dataset.follow)));
  }
  function toggleFollow(id) {
    following.has(id) ? following.delete(id) : following.add(id);
    saveFollow(); renderCards();
    const fb = $("#drawer [data-follow]"); if (fb) { fb.setAttribute("aria-pressed", following.has(id)); fb.textContent = following.has(id) ? "★ Following" : "☆ Follow this topic"; }
  }

  /* ---------- topic drawer ---------- */
  let lastFocus = null;
  function openTopic(id) {
    const name = "topic-" + id.toLowerCase();
    if (location.hash.slice(1) !== name) { location.hash = name; return; }
    renderDrawer(id);
  }
  const itemLi = (i) => `<li><span class="d">${esc(i.date || "n.d.")}<br>${esc(i.week || "")} · ${esc(i.stream)}</span><span>${cTag(i.concept)} ${esc(i.note)}` +
    (i.quote ? `<br><span class="quote">“${esc(i.quote)}”</span>` : "") +
    `<br><span class="src">${esc(i.actor)} · <a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a>${i.context ? " · " + esc(i.context) : ""} · strength ${i.strength}</span></span></li>`;
  function renderDrawer(id) {
    const t = byId[id]; if (!t) return;
    const pc = t.policyCheck ? D.policyChecks[id] : null;
    const items = D.items.filter((i) => i.topic === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const traj = t.traj.map((lv, i) => `<div><div class="wk ${lv ? "" : "na"}${t.openWeek === i + 1 ? " open-mark" : ""}${D.weeks[i].id === proposedWeek ? " proposed" : ""}">${lv ? lv.map((v) => `<span class="l${v}"></span>`).join("") : ""}${t.closeWeek === i + 1 ? '<span class="mk">×</span>' : ""}</div><div class="wl">${D.weeks[i].id}</div></div>`).join("");
    const isWin = ["problem", "political", "closing"].includes(t.status) && t.type !== "—";
    $("#drawer-body").innerHTML = `
      <div class="eyebrow">${esc(t.id)} · ${esc(t.ministry)} · CAP ${esc(t.cap)}</div>
      <h2 id="drawer-title">${esc(t.name)}</h2>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${badge(t)}<button type="button" class="follow" data-follow="${t.id}" aria-pressed="${following.has(t.id)}">${following.has(t.id) ? "★ Following" : "☆ Follow this topic"}</button></div>
      <dl class="facts">
        <div><dt>Window type</dt><dd>${esc(isWin ? t.type : "—")}</dd></div>
        <div><dt>Coupling</dt><dd>${esc(isWin ? t.coupling : "—")}</dd></div>
        <div><dt>Opened by</dt><dd>${esc(isWin ? t.opened : "—")}</dd></div>
        <div><dt>Timing</dt><dd>${esc(t.timing)}</dd></div>
      </dl>
      ${STREAMS.map(([k, n]) => `<div class="stream-block"><div class="sname">${n}<br>${lvPill(t[k])} <span class="note">${LEVEL[t[k]]}</span></div><div><p>${esc(t[{ P: "problem", Po: "politics" }[k]])}</p>${checksFor(t.id, n).length ? `<details class="check-details" open><summary>How the ${n.toLowerCase()} stream is framed in ${esc(LATEST.id)} (${checksFor(t.id, n).length} concept check${checksFor(t.id, n).length === 1 ? "" : "s"})</summary>${checkList(t.id, n)}</details>` : ""}</div></div>`).join("")}
      <section><h3>Week by week</h3><div class="mini-traj" style="--nweeks:${NW}">${traj}</div><p class="note">Top bar: problem. Bottom bar: politics.${proposedWeek ? " " + esc(proposedWeek) + " is proposed and awaits review." : ""}</p></section>
      <section><h3>What changed</h3><p>${esc(t.changed)}</p>
        ${t.closing ? `<p><b>Closing reason (Kingdon):</b> ${esc(t.closing)}. <b>Could reopen if:</b> ${esc(t.reopen)}.</p>` : ""}</section>
      ${(t.precedents || []).length ? `<section><h3>Precedents</h3><ul class="precedents">${t.precedents.map((p) => `<li>${esc(p.text)}<br><span class="src"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a> · ${esc(p.date)}</span></li>`).join("")}</ul></section>` : ""}
      <section><h3>Frames and actors</h3>
        <p><b>Frames:</b> ${esc(t.frames)}</p>
        <div class="check-grid">
          <div><h4>Problem brokers</h4>${t.brokers.length ? `<ul>${t.brokers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : `<p class="note">None identified</p>`}</div>
          <div><h4>Policy entrepreneurs</h4>${t.entrepreneurs.length ? `<ul>${t.entrepreneurs.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : `<p class="note">None qualify</p>`}</div>
        </div></section>
      ${pc ? `<section><h3>Policy stream check</h3>
        <p class="note">Run because a window was flagged for this topic. ${esc(t.policy || "")}</p>
        <div class="check-grid">
          <div><h4>Ideas in circulation</h4><ul>${pc.ideas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div><h4>Entrepreneurs</h4><ul>${pc.entrepreneurs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h4>Bills</h4><ul>${pc.bills.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </div>
        <div class="evidence-box"><div><span class="ev-state">Evidence: ${esc(pc.evidence)}</span> · Applicability to Chile: ${esc(pc.applicability)}</div><div>${esc(pc.evidenceNote)}</div><div class="note">Evidence state from analyst knowledge; to verify in Epistemonikos, Cochrane, Campbell or 3ie.</div></div>
      </section>` : `<section><h3>Policy stream</h3><p class="note">The policy stream is checked only once a window is flagged for a topic.${t.policy ? " Noted so far: " + esc(t.policy) : ""}</p></section>`}
      <section><h3>Sources consulted (${new Set(items.map((i) => i.source)).size})</h3>
        <div class="src-groups">${srcGroups(items)}</div>
      </section>
      <section><h3>Coded items (${items.length})</h3>
        ${items.length ? `<ul class="item-list">${items.map(itemLi).join("")}</ul>` : `<p class="note">No items coded for this topic.</p>`}
      </section>`;
    $("#drawer [data-follow]").addEventListener("click", (e) => toggleFollow(e.currentTarget.dataset.follow));
    lastFocus = lastFocus || document.activeElement;
    $("#drawer").hidden = false; $("#drawer-backdrop").hidden = false;
    $("#drawer").scrollTop = 0; $("#drawer-close").focus();
    document.body.style.overflow = "hidden";
  }
  function closeDrawer(updateHash) {
    $("#drawer").hidden = true; $("#drawer-backdrop").hidden = true; document.body.style.overflow = "";
    hideTip();
    if (updateHash) location.hash = currentView;
    if (lastFocus && lastFocus.focus) lastFocus.focus(); lastFocus = null;
  }
  $("#drawer-close").addEventListener("click", () => closeDrawer(true));
  $("#drawer-backdrop").addEventListener("click", () => closeDrawer(true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(true); });


  function srcGroups(items) {
    if (!items.length) return `<p class="note">No sources coded for this topic in the period.</p>`;
    const byType = {};
    items.forEach((i) => { (byType[i.type] = byType[i.type] || {}); byType[i.type][i.source] = (byType[i.type][i.source] || 0) + 1; });
    return Object.keys(byType).sort().map((ty) => `<h4>${esc(ty)}</h4><ul>${Object.entries(byType[ty]).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<li>${esc(n)}<b>×${c}</b></li>`).join("")}</ul>`).join("");
  }




  /* ---------- method ---------- */
  function renderMethod() {
    const m = D.method;
    const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join("");
    const STC = D.sourceTypeCounts || {};
    const nType = (t) => Object.entries(STC).filter(([k]) => k.toLowerCase().startsWith(t.toLowerCase().slice(0, 14))).reduce((a, [, v]) => a + v, 0);
    $("#method").innerHTML = `
      <p class="lead">${esc(m.framework)}</p>
      <article class="panel"><h2>Stream levels</h2>
        <p class="panel-sub">Each stream is rated separately each week on the same four-level scale.</p>
        <ul class="level-list">
          <li>${lvPill(0)} <b>${esc(LEVEL[0])}:</b> no relevant change.</li>
          <li>${lvPill(1)} <b>${esc(LEVEL[1])}:</b> attention or statements without new evidence or action, from a single source.</li>
          <li>${lvPill(2)} <b>${esc(LEVEL[2])}:</b> a corroborated change: new evidence, an event or a formal step.</li>
          <li>${lvPill(3)} <b>${esc(LEVEL[3])}:</b> a decisive change with sustained attention, such as a focusing event, a record indicator or a decisive use of the executive's agenda powers.</li>
        </ul>
        <p class="panel-sub" style="margin-top:12px">A <b>potential window</b> is flagged when both streams are at level 2 or 3 in the same week. If the problem stream got there first it is a <b>problem window</b> (consequential coupling); if politics came first, a <b>political window</b> (doctrinal coupling). Topics with one stream at level 2 or 3 are on <b>watch</b>. Open windows are re-assessed every week; closing reasons follow Kingdon.</p>
      </article>
      <div class="method-grid">
        <article class="panel"><h2>How a week is analysed</h2><ol>${li(m.process)}</ol></article>
        <article class="panel"><h2>Rules</h2><ul>${li(m.rules)}</ul></article>
        <article class="panel concept-panel"><h2>Concepts: how each stream is framed</h2>
          <p class="panel-sub">Every coded item is tagged with one concept. Hover over a concept anywhere on the site to see its definition.</p>
          ${["Problem", "Politics"].map((st) => `<h3>${st} stream</h3><dl class="concept-list">${Object.entries(CONCEPTS).filter(([, v]) => v.stream === st).map(([k, v]) => `<dt>${cTag(k)}</dt><dd>${esc(v.definition)}</dd>`).join("")}</dl>`).join("")}
        </article>
        <article class="panel"><h2>What the monitor reads</h2>
          <p class="panel-sub">Each country has its own source list, curated by people who know its media and politics.</p>
          <table class="rules-table type-table"><thead><tr><th>Source type</th><th>${esc(D.meta.country)}</th><th>What it shows</th></tr></thead><tbody>
          ${m.sourceTypes.map(([t, w]) => `<tr><td>${esc(t)}</td><td class="num">${nType(t) || "—"}</td><td>${esc(w)}</td></tr>`).join("")}</tbody></table></article>
        <article class="panel"><h2>Limitations</h2><ul>${li(m.publicLimitations)}</ul></article>
      </div>`;
  }


  /* ---------- data table ---------- */
  function renderItems() {
    const topicSel = $("#item-topic");
    topicSel.innerHTML = `<option value="">All topics</option><option value="Cross-cutting">Cross-cutting</option>` + D.topics.map((t) => `<option value="${t.id}">${esc(t.id)} ${esc(t.short)}</option>`).join("");
    const draw = () => {
      const tv = topicSel.value, sv = $("#item-stream").value;
      const rows = D.items.filter((i) => (!tv || i.topic === tv) && (!sv || i.stream === sv));
      $("#items").innerHTML = `<thead><tr><th>ID</th><th>Week</th><th>Date</th><th>Topic</th><th>Stream</th><th>Concept</th><th>Actor</th><th>Str.</th><th>Note</th><th>Context and quote</th><th>Source</th></tr></thead><tbody>` +
        rows.slice().reverse().map((i) => `<tr><td class="num">${esc(i.id)}</td><td class="num">${esc(i.week)}</td><td class="num">${esc(i.date || "n.d.")}</td><td>${i.topic === "Cross-cutting" ? "Cross-cutting" : `<a href="#topic-${i.topic.toLowerCase()}">${esc(byId[i.topic].short)}</a>`}</td><td>${esc(i.stream)}</td><td>${cTag(i.concept)}</td><td>${esc(i.actor)}</td><td class="num">${i.strength}</td><td>${esc(i.note)}</td><td>${esc(i.context)}${i.quote ? `<br><span class="quote">“${esc(i.quote)}”</span>` : ""}</td><td><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a></td></tr>`).join("") + `</tbody>`;
    };
    topicSel.addEventListener("change", draw); $("#item-stream").addEventListener("change", draw); draw();
  }

  /* ---------- routing ---------- */
  let currentView = "overview";
  const VIEWS = ["overview", "report", "topics", "method", "data", "colombia"];
  function route() {
    const h = location.hash.slice(1);
    const m = /^topic-(t\d+)$/.exec(h);
    if (m) {
      const id = m[1].toUpperCase();
      if (!byId[id]) { location.hash = "overview"; return; }
      showView(currentView || "overview"); renderDrawer(id); return;
    }
    if (!$("#drawer").hidden) closeDrawer(false);
    showView(VIEWS.includes(h) ? h : "overview");
  }
  function showView(v) {
    const was = currentView;
    currentView = v;
    $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + v));
    $$(".tabs a").forEach((a) => { a.classList.toggle("is-on", a.dataset.view === v); a.setAttribute("aria-current", a.dataset.view === v ? "page" : "false"); });
    $("#country-select").value = v === "colombia" ? "CO" : "CL";
    const rb = $("#run-banner"); if (rb) rb.style.display = v === "colombia" ? "none" : "";
    if (v === "topics") renderCards();
    if (v === "report") scrollReport();
    else if (v !== was) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("#country-select").addEventListener("change", (e) => { location.hash = e.target.value === "CO" ? "colombia" : "overview"; });
  $$(".explore-card[data-mode], #topic-mode .seg-btn").forEach((b) => b.addEventListener("click", () => { activeStatus = b.dataset.mode; renderCards(); }));

  /* ---------- init ---------- */
  renderHeroNow(); renderMap(); renderWindowCards(); renderLevelLegend(); renderWeekly(); renderNext(); renderCalendar(); renderApproval(); renderContext();
  $("#n-agenda").textContent = D.topics.filter(onAgenda).length + " topics"; $("#n-all").textContent = D.topics.length + " topics"; $("#n-week").textContent = LATEST.id;
  renderReport(); renderGaps(); initMinistry(); renderCards(); renderMethod(); renderItems();
  route();
})();
