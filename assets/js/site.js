/* Nimbu site — motion + interactions. Vanilla, no dependencies. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const inr = (n) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");
  const shortInr = (n) => (n >= 100000 ? "₹" + (n / 100000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, "") + "L" : n >= 1000 ? "₹" + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : "₹" + n);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const icon = (name) => `<svg class="icon"><use href="#i-${name}"/></svg>`;

  /* ── Theme ─────────────────────────────────────────────────────────── */
  const root = document.documentElement;
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme = () => root.dataset.theme || (sysDark.matches ? "dark" : "light");
  const syncThemeColor = () => {
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", effectiveTheme() === "dark" ? "#070708" : "#f6f7f1"));
  };
  $("#themeToggle")?.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("nimbu-theme", next); } catch (e) { /* storage unavailable */ }
    syncThemeColor();
  });
  if (root.dataset.theme) syncThemeColor();

  /* ── Nav ───────────────────────────────────────────────────────────── */
  const nav = $("#nav");
  const onScrollNav = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  const menuBtn = $("#menuBtn"), menu = $("#mobileMenu");
  const setMenu = (open) => {
    menu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.innerHTML = icon(open ? "x" : "menu");
    if (open) nav.classList.add("scrolled"); else onScrollNav();
  };
  menuBtn?.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("resize", () => { if (window.innerWidth > 920) setMenu(false); });

  const year = $("#year"); if (year) year.textContent = new Date().getFullYear();

  /* ── Reveal on scroll ──────────────────────────────────────────────── */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.dispatchEvent(new CustomEvent("revealed"));
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  /* ── Card spotlight + hero parallax (fine pointers only) ───────────── */
  if (finePointer && !reduce) {
    document.addEventListener("pointermove", (ev) => {
      const card = ev.target.closest?.(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ev.clientX - r.left + "px");
      card.style.setProperty("--my", ev.clientY - r.top + "px");
    }, { passive: true });

    const stage = $("#stage"), phone = $("#heroPhone"), floats = $$(".float", stage);
    let raf = 0, tx = 0, ty = 0;
    stage?.addEventListener("pointermove", (ev) => {
      const r = stage.getBoundingClientRect();
      tx = (ev.clientX - r.left) / r.width - 0.5;
      ty = (ev.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    stage?.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(applyTilt); });
    function applyTilt() {
      raf = 0;
      phone.style.transform = `rotateY(${tx * 10}deg) rotateX(${-ty * 8}deg)`;
      floats.forEach((f) => { const d = +f.dataset.depth; f.style.translate = `${tx * d}px ${ty * d}px`; });
    }
    if (phone) phone.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
  }

  /* ── Bank marquee ──────────────────────────────────────────────────── */
  $$(".marquee").forEach((m) => {
    const names = m.dataset.banks.split("|");
    const track = $(".marquee-track", m);
    const chips = names.map((n) => `<span class="bank-chip">${n}</span>`).join("");
    track.innerHTML = `<div style="display:flex;gap:12px">${chips}</div><div style="display:flex;gap:12px" aria-hidden="true">${chips}</div>`;
  });

  /* ── Hero phone: SMS → transaction demo ────────────────────────────── */
  const hero = (() => {
    const list = $("#aList"), notif = $("#notif");
    if (!list || !notif) return;
    const nSender = $("#nSender"), nBody = $("#nBody");
    const elSpent = $("#aSpent"), elIncome = $("#aIncome"), elBal = $("#aBalance");

    const START = { spent: 16029, income: 85000, balance: 241771 };
    const baseRows = [
      { name: "Blue Tokai Coffee", sub: "Food & Dining · HDFC ••4521", icon: "food", tint: "#f5b33c", amt: -280, time: "8:40 AM", auto: true },
      { name: "BESCOM", sub: "Bills · ICICI Card ••9012", icon: "bolt", tint: "#a78bfa", amt: -1640, time: "Yesterday", auto: true },
      { name: "Acme Corp", sub: "Salary · HDFC ••4521", icon: "salary", tint: "#8ce01e", amt: 85000, time: "1 Sep", auto: true },
    ];
    const incoming = [
      { sender: "AX-HDFCBK", body: `<span class="tok t-amt">Rs.349.00</span> debited from <span class="tok t-acc">A/c XX4521</span> to <span class="tok t-who">SWIGGY</span> on 28-09-26 via UPI. Ref 426512093311.`,
        row: { name: "Swiggy", sub: "Food & Dining · HDFC ••4521", icon: "food", tint: "#f5b33c", amt: -349, time: "9:41 AM", auto: true } },
      { sender: "VM-KOTAKB", body: `Sent <span class="tok t-amt">Rs.1,250.00</span> from Kotak Bank <span class="tok t-acc">AC X4470</span> to <span class="tok t-who">ZEPTO</span> on 28-09-26. UPI Ref 426598114420.`,
        row: { name: "Zepto", sub: "Groceries · Kotak ••4470", icon: "cart", tint: "#8ce01e", amt: -1250, time: "9:41 AM", auto: true } },
      { sender: "JD-ICICIT", body: `<span class="tok t-amt">INR 612.00</span> spent on ICICI Bank <span class="tok t-acc">Card XX9012</span> on 28-Sep-26 at <span class="tok t-who">UBER INDIA</span>.`,
        row: { name: "Uber", sub: "Transport · ICICI Card ••9012", icon: "car", tint: "#3b82f6", amt: -612, time: "9:41 AM", auto: true } },
      { sender: "AX-HDFCBK", body: `<span class="tok t-amt">Rs.2,000.00</span> credited to <span class="tok t-acc">A/c XX4521</span> by NEFT from <span class="tok t-who">ACME CORP</span> - travel reimbursement.`,
        row: { name: "Acme Corp", sub: "Refund · HDFC ••4521", icon: "salary", tint: "#8ce01e", amt: 2000, time: "9:41 AM", auto: true } },
    ];

    const rowHTML = (r) => `
      <div class="app-row">
        <span class="tile sm" style="--t:${r.tint}">${icon(r.icon)}</span>
        <div class="meta"><b>${r.name}</b><small>${r.sub.split(" · ")[1]}${r.auto ? ` <span class="auto-badge">${icon("sms")}SMS</span>` : ""}</small></div>
        <div class="amt ${r.amt > 0 ? "inc" : "exp"} num">${r.amt > 0 ? "+" : "−"}${inr(r.amt)}<small>${r.time}</small></div>
      </div>`;
    const makeRow = (r) => { const w = document.createElement("div"); w.className = "row-wrap"; w.innerHTML = rowHTML(r); return w; };

    const state = { ...START };
    const paint = () => { elSpent.textContent = inr(state.spent); elIncome.textContent = inr(state.income); elBal.textContent = inr(state.balance); };
    const tweenTo = (target, dur = 900) => {
      const from = { ...state }, t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur), k = easeOut(t);
        for (const key in target) state[key] = from[key] + (target[key] - from[key]) * k;
        paint();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const reset = () => {
      list.innerHTML = "";
      baseRows.forEach((r) => list.appendChild(makeRow(r)));
      Object.assign(state, START); paint();
    };
    reset();
    if (reduce) {
      nSender.textContent = incoming[0].sender; nBody.innerHTML = incoming[0].body;
      notif.style.opacity = "1"; notif.style.transform = "none";
      return;
    }

    // Run only while the hero is on screen and the tab is visible.
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 }).observe($("#heroPhone"));
    const ready = async () => { while (!visible || document.hidden) await sleep(400); };

    (async function loop() {
      await sleep(1600);
      for (;;) {
        for (const item of incoming) {
          await ready();
          nSender.textContent = item.sender; nBody.innerHTML = item.body;
          notif.className = "notif show";
          await sleep(1100);
          notif.classList.add("scanning");
          await sleep(1500);
          const y = list.getBoundingClientRect().top - notif.getBoundingClientRect().top;
          const scale = notif.closest(".phone").getBoundingClientRect().width / notif.closest(".phone").offsetWidth || 1;
          notif.style.setProperty("--absorb-y", y / scale + "px");
          notif.className = "notif absorb";
          await sleep(420);

          const w = makeRow(item.row);
          w.classList.add("entering", "fresh");
          list.prepend(w);
          requestAnimationFrame(() => requestAnimationFrame(() => w.classList.remove("entering")));
          const rows = $$(".row-wrap:not(.leaving)", list);
          if (rows.length > 4) {
            const last = rows[rows.length - 1];
            last.classList.add("leaving");
            setTimeout(() => last.remove(), 650);
          }
          const a = item.row.amt;
          tweenTo(a < 0 ? { spent: state.spent - a, balance: state.balance + a } : { income: state.income + a, balance: state.balance + a });
          await sleep(500);
          notif.className = "notif";
          await sleep(2000);
        }
        await sleep(1800);
        await ready();
        const app = $(".app"); app.style.transition = "opacity .5s"; app.style.opacity = "0";
        await sleep(520); reset(); app.style.opacity = "1";
        await sleep(1200);
      }
    })();
  })();

  /* ── How it works: progress line + sequential lighting ─────────────── */
  const steps = $("#steps");
  if (steps) {
    const cards = $$(".step", steps);
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lit"); stepIO.unobserve(e.target); } });
    }, { threshold: 0.55 });
    cards.forEach((c) => stepIO.observe(c));
    const line = $(".steps-line", steps);
    const onScroll = () => {
      const r = steps.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.9)));
      line.style.setProperty("--p", reduce ? 1 : p.toFixed(3));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── Review notification demo ──────────────────────────────────────── */
  const rv = $("#review");
  if (rv) {
    const sec = $("#rvSec"), chips = $$("[data-k]", rv);
    let s = 59, k = 0;
    const bar = $(".countdown .bar", rv);
    bar.style.animationDuration = "60s";
    setInterval(() => { s = s <= 0 ? 59 : s - 1; sec.textContent = "0:" + String(s).padStart(2, "0"); }, 1000);
    if (!reduce) setInterval(() => {
      chips.forEach((c) => c.classList.remove("pick"));
      chips[k % chips.length].classList.add("pick");
      setTimeout(() => chips.forEach((c) => c.classList.remove("pick")), 1600);
      k++;
    }, 3200);
  }

  /* ── Voice typing demo ─────────────────────────────────────────────── */
  const vt = $("#voiceText"), vo = $("#voiceOut");
  if (vt && vo && !reduce) {
    const phrases = [
      { say: "spent 500 on groceries, paid via GPay", out: [["Amount", "₹500"], ["Category", "Groceries"], ["Account", "GPay wallet"]] },
      { say: "paid 1,200 for petrol by card", out: [["Amount", "₹1,200"], ["Category", "Fuel"], ["Account", "ICICI Card"]] },
      { say: "got 3,000 cash for freelance work", out: [["Amount", "₹3,000"], ["Type", "Income"], ["Account", "Cash"]] },
    ];
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.3 }).observe(vt);
    (async () => {
      let i = 0;
      for (;;) {
        while (!visible || document.hidden) await sleep(400);
        const p = phrases[i++ % phrases.length];
        vo.innerHTML = p.out.map(([a, b]) => `<span><em>${a}</em>${b}</span>`).join("");
        for (let n = 0; n <= p.say.length; n++) {
          vt.innerHTML = `“${p.say.slice(0, n)}${n === p.say.length ? "”" : ""}<span class="caret"></span>`;
          await sleep(38 + Math.random() * 40);
        }
        await sleep(300);
        for (const s of $$("span", vo)) { s.classList.add("on"); await sleep(220); }
        await sleep(2800);
      }
    })();
  }

  /* ── Insights charts ───────────────────────────────────────────────── */
  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const income = [82000, 85000, 85000, 91500, 85000, 87000];
  const spend = [23800, 21450, 26900, 22300, 20700, 18240];
  const worth = [158200, 179900, 195400, 208700, 226300, 241560];
  const cats = [
    ["Food & Dining", 5760, "#f5b33c", "▲ 8%", true],
    ["Fuel", 3640, "#fb923c", "▲ 3%", true],
    ["Shopping", 2700, "#f472b6", "▼ 29%", false],
    ["Groceries", 2480, "#8ce01e", "▼ 6%", false],
    ["Bills", 1640, "#a78bfa", "—", null],
    ["Transport", 1071, "#3b82f6", "▼ 18%", false],
    ["Entertainment", 649, "#ff6b57", "—", null],
    ["Health", 300, "#2dd4bf", "New", true],
  ];
  const catTotal = cats.reduce((a, c) => a + c[1], 0);

  const style = document.createElement("style");
  style.textContent = `
    .cbar{transform:scaleY(0);transform-box:fill-box;transform-origin:50% 100%;transition:transform .9s cubic-bezier(.22,1,.36,1)}
    .drawn .cbar{transform:none}
    .clabel{opacity:0;transition:opacity .5s}
    .drawn .clabel{opacity:1}
    .cslice{transition:stroke-dasharray 1.1s cubic-bezier(.65,0,.35,1)}
    .cline{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.6s cubic-bezier(.65,0,.35,1)}
    .drawn .cline{stroke-dashoffset:0}
    .carea{opacity:0;transition:opacity 1s .6s}
    .drawn .carea{opacity:1}
    .cdot{opacity:0;transform:scale(0);transform-box:fill-box;transform-origin:center;transition:opacity .4s,transform .5s cubic-bezier(.22,1,.36,1)}
    .drawn .cdot{opacity:1;transform:none}`;
  document.head.appendChild(style);

  function drawBars() {
    const svg = $("#barsSvg"); if (!svg) return;
    svg.innerHTML = "";
    const W = 520, top = 30, base = 212, left = 34, right = 510, max = 100000;
    const y = (v) => base - (v / max) * (base - top);
    [0, 25000, 50000, 75000, 100000].forEach((v) => {
      svg.appendChild(svgEl("line", { x1: left, x2: right, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-dasharray": v ? "3 5" : "", "stroke-width": 1 }));
      const t = svgEl("text", { x: left - 6, y: y(v) + 3, "text-anchor": "end" }); t.textContent = v ? shortInr(v) : "₹0"; svg.appendChild(t);
    });
    const gw = (right - left) / months.length, bw = 22;
    months.forEach((m, i) => {
      const cx = left + gw * i + gw / 2;
      const d = i * 0.08;
      [[income[i], css("--income"), -bw - 2], [spend[i], css("--expense"), 2]].forEach(([v, c, dx], j) => {
        const r = svgEl("rect", { x: cx + dx, y: y(v), width: bw, height: base - y(v), rx: 6, fill: c, class: "cbar", opacity: i === 5 ? 1 : 0.82 });
        r.style.transitionDelay = d + j * 0.06 + "s";
        svg.appendChild(r);
        const t = svgEl("text", { x: cx + dx + bw / 2, y: y(v) - 7, "text-anchor": "middle", class: "clabel", fill: c });
        t.style.fill = c; t.style.transitionDelay = d + 0.6 + "s"; t.textContent = shortInr(v);
        svg.appendChild(t);
      });
      const t = svgEl("text", { x: cx, y: 234, "text-anchor": "middle" }); t.textContent = m;
      if (i === 5) { t.style.fill = css("--text"); }
      svg.appendChild(t);
    });
  }

  function drawDonut() {
    const svg = $("#donutSvg"), listEl = $("#catList"); if (!svg) return;
    svg.innerHTML = "";
    const r = 72, C = 2 * Math.PI * r, gap = 1.2;
    svg.appendChild(svgEl("circle", { cx: 100, cy: 100, r, fill: "none", stroke: css("--surface-2"), "stroke-width": 26 }));
    let acc = 0;
    const slices = [];
    cats.forEach(([name, v, c]) => {
      const pct = v / catTotal;
      const seg = Math.max(0.6, pct * 100 - gap);
      const ci = svgEl("circle", { cx: 100, cy: 100, r, fill: "none", stroke: c, "stroke-width": 26, pathLength: 100, "stroke-dasharray": "0 100", "stroke-dashoffset": -acc, transform: "rotate(-90 100 100)", class: "cslice" });
      ci.style.transitionDelay = (acc / 100) * 0.9 + "s";
      svg.appendChild(ci);
      slices.push([ci, seg]);
      acc += pct * 100;
    });
    const t1 = svgEl("text", { x: 100, y: 96, "text-anchor": "middle" }); t1.textContent = "SPENT"; t1.style.letterSpacing = ".12em";
    const t2 = svgEl("text", { x: 100, y: 116, "text-anchor": "middle" }); t2.textContent = inr(catTotal);
    t2.style.cssText = `font-family:Unbounded,sans-serif;font-size:17px;font-weight:600;fill:${css("--text")}`;
    svg.append(t1, t2);
    requestAnimationFrame(() => requestAnimationFrame(() => slices.forEach(([ci, seg]) => ci.setAttribute("stroke-dasharray", `${seg} ${100 - seg}`))));

    listEl.innerHTML = cats.slice(0, 6).map(([name, v, c, d, bad], i) => `
      <div class="cat-row">
        <div class="top"><i style="--c:${c}"></i>${name}<em style="color:${bad === null ? "var(--muted)" : bad ? "var(--expense)" : "var(--income)"}">${d}</em><span class="num">${inr(v)}</span></div>
        <div class="track"><i style="--w:${(v / cats[0][1]) * 100}%;--c:${c};--delay:${0.3 + i * 0.08}s"></i></div>
      </div>`).join("");
    listEl.classList.remove("in");
    requestAnimationFrame(() => requestAnimationFrame(() => listEl.classList.add("in")));
  }

  function drawLine() {
    const svg = $("#lineSvg"); if (!svg) return;
    svg.innerHTML = "";
    const top = 34, base = 212, left = 40, right = 500, min = 140000, max = 260000;
    const x = (i) => left + ((right - left) / (worth.length - 1)) * i;
    const y = (v) => base - ((v - min) / (max - min)) * (base - top);
    [140000, 170000, 200000, 230000, 260000].forEach((v) => {
      svg.appendChild(svgEl("line", { x1: left, x2: right, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-dasharray": "3 5" }));
      const t = svgEl("text", { x: left - 8, y: y(v) + 3, "text-anchor": "end" }); t.textContent = shortInr(v); svg.appendChild(t);
    });
    const pts = worth.map((v, i) => [x(i), y(v)]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
      d += ` C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    const defs = svgEl("defs");
    defs.innerHTML = `<linearGradient id="lgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbf24a" stop-opacity=".32"/><stop offset="1" stop-color="#cbf24a" stop-opacity="0"/></linearGradient>`;
    svg.appendChild(defs);
    svg.appendChild(svgEl("path", { d: `${d} L${right} ${base} L${left} ${base} Z`, fill: "url(#lgA)", class: "carea" }));
    svg.appendChild(svgEl("path", { d, fill: "none", stroke: css("--lime"), "stroke-width": 3, "stroke-linecap": "round", pathLength: 1, class: "cline" }));
    pts.forEach(([px, py], i) => {
      const dot = svgEl("circle", { cx: px, cy: py, r: i === pts.length - 1 ? 6 : 4, fill: css("--bg"), stroke: css("--lime"), "stroke-width": 2.5, class: "cdot" });
      dot.style.transitionDelay = 0.25 * i + 0.2 + "s";
      svg.appendChild(dot);
      const t = svgEl("text", { x: px, y: py - 14, "text-anchor": "middle", class: "clabel" });
      t.textContent = shortInr(worth[i]); t.style.transitionDelay = 0.25 * i + 0.4 + "s";
      if (i === pts.length - 1) t.style.fill = css("--lime-text");
      svg.appendChild(t);
      const m = svgEl("text", { x: px, y: 234, "text-anchor": "middle" }); m.textContent = months[i]; svg.appendChild(m);
    });
  }

  const panes = {
    trend: { draw: drawBars, label: "Spent · September", value: "₹18,240", delta: "▼ 12% vs last month", bad: false,
      note: "At this pace you'll finish about <b>₹2,400 under budget</b> this month." },
    cats: { draw: drawDonut, label: "Top category · Food & Dining", value: "₹5,760", delta: "▲ 8% vs August", bad: true,
      note: "You spent <b>₹1,120 less on Shopping</b> than this time last month." },
    flow: { draw: drawLine, label: "Net worth · end of September", value: "₹2,41,560", delta: "▲ ₹15,260 this month", bad: false,
      note: "Your balance has <b>grown every month</b> since April." },
  };
  const tabs = $$("#tabs .tab");
  let current = "trend", auto = !reduce, autoTimer = 0, chartVisible = false;
  const AUTO_MS = 6500;

  function show(name, fromUser) {
    current = name;
    const p = panes[name];
    tabs.forEach((t) => {
      const on = t.dataset.pane === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const prog = $(".prog", t);
      prog.classList.remove("run"); void prog.offsetWidth;
      if (on && auto) { prog.style.setProperty("--dur", AUTO_MS + "ms"); prog.classList.add("run"); }
    });
    $$(".chart-pane").forEach((el) => { el.classList.toggle("on", el.id === "pane-" + name); el.classList.remove("drawn"); });
    $("#cLabel").textContent = p.label;
    $("#cValue").textContent = p.value;
    const dl = $("#cDelta"); dl.textContent = p.delta; dl.classList.toggle("bad", p.bad);
    $("#cNote").innerHTML = p.note;
    p.draw();
    const pane = $("#pane-" + name);
    requestAnimationFrame(() => requestAnimationFrame(() => pane.classList.add("drawn")));
    clearTimeout(autoTimer);
    if (fromUser) { auto = false; tabs.forEach((t) => $(".prog", t).classList.remove("run")); }
    if (auto) autoTimer = setTimeout(next, AUTO_MS);
  }
  function next() {
    if (!chartVisible || document.hidden) { autoTimer = setTimeout(next, 800); return; }
    const keys = Object.keys(panes);
    show(keys[(keys.indexOf(current) + 1) % keys.length]);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t.dataset.pane, true));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
      const n = tabs[(i + dir + tabs.length) % tabs.length];
      n.focus(); show(n.dataset.pane, true);
    });
  });
  const chartCard = $(".chart-card");
  if (chartCard) {
    let first = true;
    new IntersectionObserver(([e]) => {
      chartVisible = e.isIntersecting;
      if (chartVisible && first) { first = false; show("trend"); }
    }, { threshold: 0.35 }).observe(chartCard);
    drawBars();
  }
  // Redraw with the right colours when the theme flips.
  new MutationObserver(() => { if (chartCard) { panes[current].draw(); $("#pane-" + current).classList.add("drawn"); } })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ── Count-up stats ────────────────────────────────────────────────── */
  $$("[data-count]").forEach((el) => {
    const target = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    el.textContent = pre + (reduce ? target : 0) + suf;
    const card = el.closest(".reveal");
    const run = () => {
      if (reduce) return;
      const t0 = performance.now(), dur = 1400;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = pre + Math.round(target * easeOut(t)) + suf;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    card ? card.addEventListener("revealed", run, { once: true }) : run();
  });

  /* ── Screens gallery ───────────────────────────────────────────────── */
  const gallery = $("#gallery");
  if (gallery) {
    // Drop any screenshot that isn't there yet, rather than show a broken frame.
    $$("img", gallery).forEach((img) => {
      const drop = () => img.closest(".shot")?.remove();
      if (img.complete && img.naturalWidth === 0) drop(); else img.addEventListener("error", drop);
    });
    const stepBy = (dir) => {
      const shot = $(".shot", gallery); if (!shot) return;
      const gapPx = parseFloat(getComputedStyle(gallery).columnGap) || 24;
      gallery.scrollBy({ left: dir * (shot.getBoundingClientRect().width + gapPx), behavior: reduce ? "auto" : "smooth" });
    };
    $("#gPrev")?.addEventListener("click", () => stepBy(-1));
    $("#gNext")?.addEventListener("click", () => stepBy(1));
    gallery.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); stepBy(1); } if (e.key === "ArrowLeft") { e.preventDefault(); stepBy(-1); } });

    if (!reduce) {
      let raf = 0;
      const focusFx = () => {
        raf = 0;
        const mid = window.innerWidth / 2;
        $$(".shot", gallery).forEach((s) => {
          const r = s.getBoundingClientRect();
          const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / (window.innerWidth * 0.6));
          const ph = $(".phone", s);
          ph.style.transform = `scale(${1 - d * 0.1}) translateY(${d * 16}px)`;
          ph.style.opacity = String(1 - d * 0.35);
        });
      };
      const req = () => { if (!raf) raf = requestAnimationFrame(focusFx); };
      gallery.addEventListener("scroll", req, { passive: true });
      window.addEventListener("resize", req);
      req();

      // Drag to scroll with a mouse.
      let down = false, sx = 0, sl = 0, moved = false;
      gallery.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = gallery.scrollLeft; gallery.style.scrollSnapType = "none"; gallery.style.scrollBehavior = "auto"; });
      window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; gallery.scrollLeft = sl - dx; });
      window.addEventListener("pointerup", () => { if (!down) return; down = false; gallery.style.scrollBehavior = ""; gallery.style.scrollSnapType = ""; });
      gallery.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
      gallery.addEventListener("dragstart", (e) => e.preventDefault());
    }
  }

  /* ── FAQ: smooth open/close ────────────────────────────────────────── */
  $$(".qa").forEach((d) => {
    const sum = $("summary", d), ans = $(".ans", d);
    sum.addEventListener("click", (e) => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        d.classList.add("closing");
        const done = () => { d.open = false; d.classList.remove("closing"); };
        ans.addEventListener("transitionend", done, { once: true });
        setTimeout(() => { if (d.classList.contains("closing")) done(); }, 600);
      } else {
        d.classList.add("pre");
        d.open = true;
        void ans.offsetHeight;
        requestAnimationFrame(() => d.classList.remove("pre"));
      }
    });
  });
})();
