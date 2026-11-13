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

  const lvPill = (v, title) => `<span class="lv l${v}" title="${esc(title || LEVEL[v])}">${v}</span>`;
  const dot = (st) => `<span class="dot ${st}" aria-hidden="true"></span>`;
  const badge = (t) => `<span class="badge">${dot(t.status)}${esc(t.statusLabel)}</span>`;
  const streamsTip = (t, lv) => STREAMS.map(([k, n], i) => `${n}: <b>${lv[i]} ${LEVEL[lv[i]]}</b>`).join("<br>");
  const fmtDate = (iso) => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const p = iso.split("-"); return p.length === 3 ? `${+p[2]} ${m[+p[1] - 1]}` : iso; };

  /* ---------- banner + footer ---------- */
  $("#run-banner").innerHTML =
    `<span class="pill">${esc(D.meta.country)}</span><span>Latest week: ${esc(LATEST.id)} (${esc(LATEST.label)})</span><span>Protocol ${esc(D.meta.protocol)}</span><span>${D.items.length} coded items · ${D.topics.length} topics</span>` +
    (proposedWeek ? `<span class="warn">${esc(proposedWeek)} levels are proposed and await <a href="#review">review</a>.</span>` : "");
  $("#h-overview").textContent = D.meta.headline || "";
  $("#h-topics").textContent = D.meta.topicsHeadline || "";
  $("#footer").innerHTML = `<p>${esc(D.meta.note)}</p><p>Policy Window Monitor applies Kingdon's Multiple Streams Framework, adapted for Latin America, to weekly data. Data and code are open. Generated ${esc(D.meta.generated)}.</p>`;


  /* ---------- source log ---------- */
  const LOG = D.sourceLog || [];
  const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  LOG.forEach((e) => { e._re = (e.match || "").split("|").filter(Boolean).map((m) => new RegExp("(^|[^\\p{L}\\p{N}])" + reEsc(m.trim()) + "($|[^\\p{L}\\p{N}])", "iu")); });
  const itemMatches = (e, i) => e._re.some((r) => r.test(i.source) || r.test(i.actor));
  const CORE_TYPES = ["Written press and online news", "Radio and TV news", "Political interviews, talk shows and podcasts", "Opinion polls and poll aggregators"];
  const accClass = (a) => /paywall|subscription/i.test(a) ? "closed" : (/^open/i.test(a) ? "open" : "");

  /* ---------- tiles ---------- */
  function renderTiles() {
    const groups = [
      ["problem", "Problem windows"],
      ["political", "Political windows"],
      ["watch", "Watch"],
      ["closing", "Closing or closed"],
      ["none", "No window"],
    ];
    $("#tiles").innerHTML = groups.map(([st, label]) => {
      const list = D.topics.filter((t) => (st === "closing" ? t.status === "closing" || t.status === "closed" : t.status === st));
      return `<button type="button" class="tile" data-status="${st}"><div class="tile-label">${dot(st)}${label}</div><div class="tile-num">${list.length}</div><div class="tile-names">${list.map((t) => esc(t.short)).join(" · ")}</div></button>`;
    }).join("");
    $$("#tiles .tile").forEach((b) => b.addEventListener("click", () => { activeStatus = b.dataset.status; location.hash = "topics"; renderCards(); }));
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

  /* ---------- approval chart ---------- */
  function renderApproval() {
    const polls = [["Cadem", "var(--st-open)"], ["Criteria", "var(--st-opening)"]];
    $("#approval-legend").innerHTML = polls.map(([p, c]) => `<span class="legend-item"><span class="swatch" style="background:${c};height:3px;width:16px"></span>${p}</span>`).join("");
    const W = 560, H = 240, l = 36, r = 76, t = 14, b = 30;
    const x0 = dnum("2026-10-01"), x1 = dnum(D.meta.generated);
    const X = (iso) => l + (dnum(iso) - x0) / (x1 - x0) * (W - l - r);
    const yMin = 20, yMax = 40, Y = (v) => t + (yMax - v) / (yMax - yMin) * (H - t - b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Presidential approval by poll, October to November 2026" });
    [20, 25, 30, 35, 40].forEach((v) => { svgEl("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), class: "gridline" }, svg); svgText(svg, l - 6, Y(v) + 4, v + "%", { "text-anchor": "end" }); });
    ["2026-10-01", "2026-10-15", "2026-11-01"].forEach((d) => svgText(svg, X(d), H - 8, fmtDate(d), { "text-anchor": "middle" }));
    svgEl("line", { x1: l, x2: W - r, y1: H - b, y2: H - b, class: "axisline" }, svg);
    polls.forEach(([p, c]) => {
      const pts = D.approval.filter((a) => a.poll === p).sort((a, b2) => a.date.localeCompare(b2.date));
      svgEl("path", { d: pts.map((a, i) => (i ? "L" : "M") + X(a.date) + " " + Y(a.approve)).join(""), fill: "none", stroke: c, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      pts.forEach((a) => {
        svgEl("circle", { cx: X(a.date), cy: Y(a.approve), r: 4.5, fill: c, stroke: "var(--surface-1)", "stroke-width": 2 }, svg);
        const hit = svgEl("circle", { cx: X(a.date), cy: Y(a.approve), r: 12, fill: "transparent", tabindex: 0, "aria-label": `${p} ${fmtDate(a.date)}: approve ${a.approve}%, disapprove ${a.disapprove}%` }, svg);
        bindTip(hit, () => `<b>${p}</b> · ${fmtDate(a.date)}<br>Approve <b>${a.approve}%</b> · Disapprove ${a.disapprove}%`);
      });
      const last = pts[pts.length - 1];
      svgText(svg, X(last.date) + (p === "Criteria" ? -6 : 9), Y(last.approve) + (p === "Criteria" ? 18 : 4), `${p} ${last.approve}%`, { class: "t-strong", "text-anchor": p === "Criteria" ? "end" : "start" });
    });
    const host = $("#approval"); host.innerHTML = ""; host.appendChild(svg);
    $("#approval-table").innerHTML = `<table><thead><tr><th>Poll</th><th>Published</th><th>Approve</th><th>Disapprove</th></tr></thead><tbody>` +
      D.approval.slice().sort((a, b2) => a.date.localeCompare(b2.date)).map((a) => `<tr><td>${a.poll}</td><td>${fmtDate(a.date)}</td><td>${a.approve}%</td><td>${a.disapprove}%</td></tr>`).join("") +
      `</tbody></table><p class="note">${esc(D.context.approvalNote)}</p>`;
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

  let activeStatus = "all", activeMinistry = "", query = "";
  function renderFilters() {
    const opts = [["all", "All"], ["following", "Following"], ["problem", STATUS.problem], ["political", STATUS.political], ["watch", STATUS.watch], ["closing", "Closing or closed"], ["none", STATUS.none]];
    const count = (k) => k === "all" ? D.topics.length : k === "following" ? following.size : D.topics.filter((t) => (k === "closing" ? ["closing", "closed"].includes(t.status) : t.status === k)).length;
    $("#status-filter").innerHTML = opts.map(([k, l]) => `<button type="button" class="fchip ${activeStatus === k ? "is-on" : ""}" data-k="${k}" aria-pressed="${activeStatus === k}">${["all", "following"].includes(k) ? "" : dot(k)}${esc(l)} <span class="count">${count(k)}</span></button>`).join("");
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
    if (!["all", "following"].includes(activeStatus)) {
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
  const itemLi = (i) => `<li><span class="d">${esc(i.date || "n.d.")}<br>${esc(i.week || "")} · ${esc(i.stream)}</span><span>${esc(i.concept)}: ${esc(i.note)}` +
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
      ${STREAMS.map(([k, n]) => `<div class="stream-block"><div class="sname">${n}<br>${lvPill(t[k])} <span class="note">${LEVEL[t[k]]}</span></div><p>${esc(t[{ P: "problem", Po: "politics" }[k]])}</p></div>`).join("")}
      <section><h3>Week by week</h3><div class="mini-traj" style="--nweeks:${NW}">${traj}</div><p class="note">Top bar: problem. Bottom bar: politics.${proposedWeek ? " " + esc(proposedWeek) + " is proposed and awaits review." : ""}</p></section>
      <section><h3>What changed</h3><p>${esc(t.changed)}</p>
        ${t.closing ? `<p><b>Closing reason (Kingdon):</b> ${esc(t.closing)}. <b>Could reopen if:</b> ${esc(t.reopen)}.</p>` : ""}</section>
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
        ${missingCore(items)}
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
  function missingCore(items) {
    const miss = LOG.filter((e) => CORE_TYPES.includes(e.source_type) && e._re.length && !items.some((i) => itemMatches(e, i)));
    if (!miss.length) return "";
    return `<div class="src-groups missing"><h4>From the Chile source log, not consulted for this topic</h4><ul>${miss.map((e) => `<li>${esc(e.name)}</li>`).join("")}</ul></div>`;
  }

  /* ---------- sources page ---------- */
  let srcType = "";
  function renderSources() {
    const types = [...new Set(LOG.map((e) => e.source_type))];
    const counts = new Map(LOG.map((e) => [e.id, D.items.filter((i) => e._re.length && itemMatches(e, i)).length]));
    $("#source-type-filter").innerHTML = [["", "All"]].concat(types.map((t) => [t, t])).map(([k, l]) =>
      `<button type="button" class="fchip ${srcType === k ? "is-on" : ""}" data-k="${esc(k)}">${esc(l)} <span class="count">${k ? LOG.filter((e) => e.source_type === k).length : LOG.length}</span></button>`).join("");
    $$("#source-type-filter .fchip").forEach((b) => b.addEventListener("click", () => { srcType = b.dataset.k; renderSources(); }));
    const rows = LOG.filter((e) => !srcType || e.source_type === srcType);
    $("#source-log").innerHTML = `<thead><tr><th>Source</th><th>Type</th><th>Owner</th><th>Format</th><th>Access</th><th>How the monitor reads it</th><th>Added by</th><th>Items in this run</th><th>Notes</th></tr></thead><tbody>` +
      rows.map((e) => `<tr><td>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.name)}</a>` : esc(e.name)}</td><td>${esc(e.source_type)}</td><td>${esc(e.owner)}</td><td>${esc(e.format)}</td><td><span class="acc ${accClass(e.access)}">${esc(e.access)}</span></td><td>${esc(e.how_read)}</td><td>${esc(e.added_by)}</td><td class="num">${e._re.length ? counts.get(e.id) : "—"}</td><td>${esc(e.notes)}</td></tr>`).join("") + `</tbody>`;
    const core = LOG.filter((e) => CORE_TYPES.includes(e.source_type) && e._re.length);
    const zero = core.filter((e) => !counts.get(e.id));
    $("#source-gap").textContent = `${zero.length} of ${core.length} news, TV, talk-show, podcast and poll sources in the log produced no coded items in this run: ${zero.map((e) => e.name).join(", ")}. The next weekly run will read them directly.`;
  }

  /* ---------- method ---------- */
  function renderMethod() {
    const m = D.method;
    const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join("");
    $("#method").innerHTML = `
      <p class="lead">${esc(m.protocol)} applied to Chile for ${esc(m.period)}. ${esc(m.volume)}</p>
      <article class="panel"><h2>Stream levels</h2>
        <table class="rules-table"><thead><tr><th>Level</th><th>Problem stream</th><th>Politics stream</th></tr></thead><tbody>
          <tr><td>${lvPill(0)} ${esc(LEVEL[0])}</td><td>No salient change</td><td>No change in approval, government action or congressional activity on the topic</td></tr>
          <tr><td>${lvPill(1)} ${esc(LEVEL[1])}</td><td>Attention without new data, from a single source</td><td>Statements only, or public demand without government action</td></tr>
          <tr><td>${lvPill(2)} ${esc(LEVEL[2])}</td><td>Indicator change, report, feedback or focusing event, corroborated by several sources; attention above the topic's baseline</td><td>A formal step (bill, announcement, working group, budget line) with national mood and approval not opposed</td></tr>
          <tr><td>${lvPill(3)} ${esc(LEVEL[3])}</td><td>Focusing event or record indicator with sustained attention, or the topic among the top "most important problems"; frames converging</td><td>Decisive use of agenda tools (urgency, budget item, passage in one chamber) with mood supportive or neutral</td></tr>
        </tbody></table>
        <p class="panel-sub" style="margin-top:12px">A <b>potential window</b> is flagged when both streams are at level 2 or 3 in the same week. If the problem stream got there first it is a <b>problem window</b> (consequential coupling); if politics came first, a <b>political window</b> (doctrinal coupling). Topics with one stream at level 2 or 3 are on <b>watch</b>. Every open window is re-assessed weekly; closing reasons follow Kingdon. The policy stream is checked only once a window is flagged.</p>
      </article>
      <div class="method-grid">
        <article class="panel"><h2>Steps in this run</h2><ol>${li(m.steps)}</ol></article>
        <article class="panel"><h2>Rules applied</h2><ul>${li(m.rules)}</ul></article>
        <article class="panel"><h2>Limitations</h2><ul>${li(m.limitations)}</ul></article>
        <article class="panel"><h2>Validation</h2><ul>${li(m.validation)}</ul><h3 style="margin-top:14px">Next</h3><ul>${li(m.nextVersion)}</ul></article>
        ${(D.discovery || []).length ? `<article class="panel"><h2>Discovery net</h2><ul>${D.discovery.map((d) => `<li><b>${esc(d.week)}</b> ${esc(d.text)}</li>`).join("")}</ul></article>` : ""}
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
        rows.slice().reverse().map((i) => `<tr><td class="num">${esc(i.id)}</td><td class="num">${esc(i.week)}</td><td class="num">${esc(i.date || "n.d.")}</td><td>${i.topic === "Cross-cutting" ? "Cross-cutting" : `<a href="#topic-${i.topic.toLowerCase()}">${esc(byId[i.topic].short)}</a>`}</td><td>${esc(i.stream)}</td><td>${esc(i.concept)}</td><td>${esc(i.actor)}</td><td class="num">${i.strength}</td><td>${esc(i.note)}</td><td>${esc(i.context)}${i.quote ? `<br><span class="quote">“${esc(i.quote)}”</span>` : ""}</td><td><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a></td></tr>`).join("") + `</tbody>`;
    };
    topicSel.addEventListener("change", draw); $("#item-stream").addEventListener("change", draw); draw();
  }

  /* ---------- review (reviewers' back end) ---------- */
  const RKEY = "pwm-review-" + (D.meta.iso || "CL") + "-" + (REVIEW ? REVIEW.week : "");
  let decisions = {};
  try { decisions = JSON.parse(localStorage.getItem(RKEY) || "{}"); } catch (e) { /* storage unavailable */ }
  const saveDecisions = () => { try { localStorage.setItem(RKEY, JSON.stringify(decisions)); } catch (e) { /* ignore */ } };
  const sigKey = (sg) => sg.topic + ":" + sg.stream;
  function renderReview() {
    const host = $("#review");
    if (!REVIEW || !REVIEW.signals.length) { host.innerHTML = `<p class="empty">No proposed signals waiting for review.</p>`; return; }
    const sigs = REVIEW.signals;
    const tally = { approve: 0, change: 0, reject: 0 };
    sigs.forEach((sg) => { const d = decisions[sigKey(sg)]; if (d) tally[d.decision]++; });
    const pending = sigs.length - tally.approve - tally.change - tally.reject;
    const lvOpt = (sel) => [0, 1, 2, 3].map((v) => `<option value="${v}" ${v === sel ? "selected" : ""}>${v} ${esc(LEVEL[v])}</option>`).join("");
    host.innerHTML = `
      <div class="review-head"><div class="review-tally"><span>Week <b>${esc(REVIEW.week)}</b> (${esc(REVIEW.label)})</span><span><b>${sigs.length}</b> signals</span><span><b>${tally.approve}</b> approved</span><span><b>${tally.change}</b> changed</span><span><b>${tally.reject}</b> rejected</span><span><b>${pending}</b> pending</span></div>
        <div><button type="button" class="btn" id="rv-copy">Copy decisions (CSV)</button> <button type="button" class="btn" id="rv-clear">Clear</button></div></div>
      <p class="note-line">${esc(REVIEW.note)}</p>
      ${sigs.map((sg, k) => {
        const d = decisions[sigKey(sg)] || {};
        const t = byId[sg.topic];
        const cls = d.decision === "approve" ? "approved" : d.decision === "change" ? "changed" : d.decision === "reject" ? "rejected" : "";
        const prev = sg.prev == null ? "new" : `${sg.prev}`;
        return `<article class="signal ${cls}" data-k="${k}">
          <div class="signal-top"><h3>${t ? `<a href="#topic-${t.id.toLowerCase()}">${esc(t.short)}</a>` : "Cross-cutting"} · ${esc(sg.stream)}</h3>
            <span class="lvchange">${sg.proposed == null ? "No level change" : `${sg.prev == null ? "" : lvPill(sg.prev) + " →"} ${lvPill(sg.proposed)} ${esc(LEVEL[sg.proposed])}${sg.prev == null ? " (new)" : ""}`}</span></div>
          <div class="ctx">Concepts: ${sg.concepts.map(esc).join(", ")}</div>
          <p class="rationale">${esc(sg.rationale)}</p>
          <details><summary>Evidence: ${sg.items.length} coded item${sg.items.length === 1 ? "" : "s"}</summary><ul class="ev">${sg.items.map((x) => itemById[x]).filter(Boolean).map((i) =>
            `<li><b>${esc(i.concept)}</b>: ${esc(i.note)}${i.quote ? `<br><span class="quote">“${esc(i.quote)}”</span>` : ""}<br><span class="ctx">${esc(i.actor)} · <a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a> · ${esc(i.date)}${i.context ? " · " + esc(i.context) : ""}</span></li>`).join("")}</ul></details>
          <div class="decide" role="group" aria-label="Decision">
            <button type="button" class="btn ${d.decision === "approve" ? "is-on" : ""}" data-d="approve">Approve</button>
            <button type="button" class="btn ${d.decision === "change" ? "is-on" : ""}" data-d="change">Change</button>
            <button type="button" class="btn ${d.decision === "reject" ? "is-on" : ""}" data-d="reject">Reject</button>
            ${sg.proposed == null ? "" : `<label class="sr-only" for="lv-${k}">Level</label><select id="lv-${k}" data-lv ${d.decision === "change" ? "" : "disabled"}>${lvOpt(d.level != null ? d.level : sg.proposed)}</select>`}
            <label class="sr-only" for="nt-${k}">Note</label><input id="nt-${k}" data-note type="text" placeholder="Note (optional)" value="${esc(d.note || "")}">
          </div></article>`;
      }).join("")}
      <textarea class="review-out" id="rv-out" readonly hidden aria-label="Decisions as CSV"></textarea>`;
    $$(".signal", host).forEach((card) => {
      const sg = sigs[+card.dataset.k], key = sigKey(sg);
      const upd = (patch) => { decisions[key] = Object.assign({ decision: null, level: sg.proposed, note: "" }, decisions[key] || {}, patch); saveDecisions(); };
      $$("[data-d]", card).forEach((b) => b.addEventListener("click", () => { upd({ decision: b.dataset.d, at: new Date().toISOString() }); renderReview(); }));
      const sel = $("[data-lv]", card); if (sel) sel.addEventListener("change", () => upd({ level: +sel.value }));
      const nt = $("[data-note]", card); nt.addEventListener("change", () => upd({ note: nt.value }));
    });
    $("#rv-copy").addEventListener("click", () => {
      const q = (x) => `"${String(x == null ? "" : x).replace(/"/g, '""')}"`;
      const rows = [["week", "topic", "stream", "proposed", "decision", "final_level", "note", "decided_at"]].concat(sigs.map((sg) => {
        const d = decisions[sigKey(sg)] || {};
        const fin = d.decision === "reject" ? "" : d.decision === "change" ? d.level : sg.proposed;
        return [REVIEW.week, sg.topic, sg.stream, sg.proposed, d.decision || "pending", fin, d.note || "", d.at || ""];
      }));
      const csv = rows.map((r) => r.map(q).join(",")).join("\n");
      const out = $("#rv-out"); out.hidden = false; out.value = csv; out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(() => {});
    });
    $("#rv-clear").addEventListener("click", () => { decisions = {}; saveDecisions(); renderReview(); });
  }

  /* ---------- routing ---------- */
  let currentView = "overview";
  function route() {
    const h = location.hash.slice(1);
    const m = /^topic-(t\d+)$/.exec(h);
    if (m) {
      const id = m[1].toUpperCase();
      if (!byId[id]) { location.hash = "overview"; return; }
      showView(currentView || "overview"); renderDrawer(id); return;
    }
    if (!$("#drawer").hidden) closeDrawer(false);
    showView(["overview", "topics", "sources", "method", "data", "review"].includes(h) ? h : "overview");
  }
  function showView(v) {
    currentView = v;
    $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + v));
    $$(".tabs a").forEach((a) => { a.classList.toggle("is-on", a.dataset.view === v); a.setAttribute("aria-current", a.dataset.view === v ? "page" : "false"); });
    if (v === "topics") renderCards();
  }
  window.addEventListener("hashchange", route);

  /* ---------- init ---------- */
  renderTiles(); renderMap(); renderLevelLegend(); renderWeekly(); renderCalendar(); renderApproval(); renderContext();
  renderGaps(); initMinistry(); renderCards(); renderSources(); renderMethod(); renderItems(); renderReview();
  route();
})();
