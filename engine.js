/* Emperico Partner Diagnostics - shared engine
 Consumes a DATA object (defined per tool page) and drives the whole flow:
 intro -> capability areas -> working style -> reflections -> report. */

function initTool(DATA){

 const STORAGE_KEY = "emperico:" + DATA.toolId;
 const app = document.getElementById("app");

 let state = loadState() || {
 edition: DATA.defaultEdition || "A",
 screen: "gate",
 email: "",
 resultsSent: false,
 areaIndex: 0,
 answers: {},
 disc: {},
 reflections: {}
 };

 function saveState(){
 try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
 }
 function loadState(){
 try{
 const raw = localStorage.getItem(STORAGE_KEY);
 return raw ? JSON.parse(raw) : null;
 }catch(e){ return null; }
 }
 function resetState(){
 state = { edition: DATA.defaultEdition || "A", screen:"gate", email:"", resultsSent:false, areaIndex:0, answers:{}, disc:{}, reflections:{} };
 saveState();
 render();
 }

 const TOTAL_STEPS = DATA.areas.length + 2; // + working style + reflections

 function stepIndexFor(screen, areaIndex){
 if(screen === "intro") return 0;
 if(screen === "area") return areaIndex + 1;
 if(screen === "disc") return DATA.areas.length + 1;
 if(screen === "reflect") return DATA.areas.length + 2;
 return TOTAL_STEPS;
 }

 // ---------- helpers ----------
 function h(tag, attrs, children){
 const node = document.createElement(tag);
 if(attrs) for(const k in attrs){
 if(k === "class") node.className = attrs[k];
 else if(k === "html") node.innerHTML = attrs[k];
 else if(k.startsWith("on")) node.addEventListener(k.slice(2), attrs[k]);
 else node.setAttribute(k, attrs[k]);
 }
 (children||[]).forEach(c => { if(c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
 return node;
 }
 function mean(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
 function bandFor(score, bands){
 for(const b of bands){ if(score >= b.min) return b.label; }
 return bands[bands.length-1].label;
 }
 function itemText(item){
 if(item.editionText && item.editionText[state.edition]) return item.editionText[state.edition];
 return item.text;
 }
 function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

 // ---------- topbar ----------
 function renderTopbar(){
 const bar = h("div", {class:"top"});
 const wrap = h("div", {class:"wrap"});
 const brand = h("a", {class:"brand", href:"#", onclick:(e)=>e.preventDefault()}, [
 DATA.logoSvg ? svgFromString(DATA.logoSvg) : document.createTextNode(""),
 h("span", {class:"name"}, [DATA.title + " ", h("b",{},[""])])
 ]);
 brand.querySelector(".name b").textContent = "";
 wrap.appendChild(brand);
 if(DATA.editions){
 const pill = h("button", {class:"edition-pill", type:"button", onclick: toggleEdition},
 [DATA.editions[state.edition].pillLabel || ("Edition " + state.edition)]);
 wrap.appendChild(pill);
 }
 bar.appendChild(wrap);
 return bar;
 }
 function svgFromString(str){
 const wrapper = document.createElement("div");
 wrapper.innerHTML = str;
 return wrapper.firstElementChild;
 }
 function toggleEdition(){
 const keys = Object.keys(DATA.editions);
 const idx = keys.indexOf(state.edition);
 state.edition = keys[(idx+1) % keys.length];
 saveState();
 render();
 }

 // ---------- email gate ----------
 function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
 function renderGate(main){
 const wrap = h("div", {class:"wrap"});
 wrap.appendChild(h("h1", {}, [DATA.title]));
 wrap.appendChild(h("p", {class:"lede"}, [DATA.subtitle]));
 wrap.appendChild(h("hr", {class:"rule"}));
 const panel = h("div", {class:"panel"});
 panel.appendChild(h("h2", {}, ["Enter your email to begin"]));
 panel.appendChild(h("p", {class:"area-desc"}, [
 "We'll send your results here once you finish. Nothing else is sent, and your answers aren't shared beyond your own report."
 ]));
 const input = h("input", {type:"email", id:"gate-email", placeholder:"you@company.com",
 style:"width:100%;font-size:16px;padding:12px 14px;border:1px solid var(--border);border-radius:3px;background:transparent;color:var(--text);font-family:var(--sans);"});
 const err = h("p", {class:"small", id:"gate-error", style:"color:#b3432b;min-height:18px;margin:10px 0 0;"}, [""]);
 const submit = ()=>{
 const val = input.value.trim();
 if(!isValidEmail(val)){ err.textContent = "Enter a valid email address."; return; }
 state.email = val;
 state.screen = "intro";
 saveState();
 render();
 };
 input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") submit(); });
 panel.appendChild(input);
 panel.appendChild(err);
 panel.appendChild(h("button", {class:"btn", style:"margin-top:6px;", onclick:submit}, ["Continue"]));
 wrap.appendChild(panel);
 main.appendChild(wrap);
 }

 // ---------- intro ----------
 function renderIntro(main){
 const wrap = h("div", {class:"wrap"});
 const ed = DATA.editions ? DATA.editions[state.edition] : null;
 wrap.appendChild(h("h1", {}, [DATA.title]));
 wrap.appendChild(h("p", {class:"lede"}, [DATA.subtitle]));
 wrap.appendChild(h("p", {class:"muted small", style:"font-style:italic;margin-top:22px;max-width:52ch;"}, [DATA.epigraph]));
 wrap.appendChild(h("hr", {class:"rule"}));
 if(ed && ed.intro){
 wrap.appendChild(h("p", {}, [ed.intro]));
 }
 if(DATA.copy.introBody){
 DATA.copy.introBody.forEach(p => wrap.appendChild(h("p", {class:"muted"}, [p])));
 }
 wrap.appendChild(h("p", {class:"small muted"}, [
 DATA.areas.length + " capability areas | " + totalItemCount() + " statements | a working-style module | " + (DATA.copy.timeEstimate || "20-25 minutes")
 ]));
 const hasProgress = Object.keys(state.answers).length > 0;
 const row = h("div", {class:"btn-row"});
 row.appendChild(h("button", {class:"btn", onclick:()=>{ state.screen="area"; state.areaIndex=0; saveState(); render(); }},
 [hasProgress ? (DATA.copy.resumeButton || "Resume") : (DATA.copy.startButton || "Begin the assessment")]));
 if(hasProgress){
 row.appendChild(h("button", {class:"btn btn-ghost", onclick: resetState}, ["Start over"]));
 }
 wrap.appendChild(row);
 main.appendChild(wrap);
 }
 function totalItemCount(){ return DATA.areas.reduce((n,a)=>n+a.items.length,0); }

 // ---------- capability area screen ----------
 function renderAreaScreen(main){
 const area = DATA.areas[state.areaIndex];
 const wrap = h("div", {class:"wrap"});
 wrap.appendChild(progressBlock(stepIndexFor("area", state.areaIndex)));
 const panel = h("div", {class:"panel"});
 panel.appendChild(h("div", {class:"area-heading"}, [
 h("h2", {}, [area.name]),
 h("div", {class:"area-count"}, ["Area " + (state.areaIndex+1) + " of " + DATA.areas.length])
 ]));
 panel.appendChild(h("p", {class:"area-desc"}, [area.desc]));
 area.items.forEach((item, i) => panel.appendChild(renderItem(area.id + "-" + item.id, itemText(item))));
 wrap.appendChild(panel);

 const row = h("div", {class:"btn-row"});
 if(state.areaIndex > 0){
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>{ state.areaIndex--; saveState(); render(); }}, ["Back"]));
 } else {
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>{ state.screen="intro"; saveState(); render(); }}, ["Back"]));
 }
 const nextLabel = state.areaIndex === DATA.areas.length - 1 ? "Continue to working style" : "Next area";
 row.appendChild(h("button", {class:"btn", onclick:()=>{
 if(state.areaIndex === DATA.areas.length - 1){ state.screen = "disc"; }
 else { state.areaIndex++; }
 saveState(); render();
 window.scrollTo({top:0});
 }}, [nextLabel]));
 wrap.appendChild(row);
 main.appendChild(wrap);
 }

 function renderItem(id, text){
 const item = h("div", {class:"item"});
 item.appendChild(h("p", {class:"item-text"}, [text]));
 const scale = h("div", {class:"scale"});
 const labels = ["Not yet true", "Occasionally true", "True some of the time", "Consistently true", "A role model"];
 labels.forEach((lab, i)=>{
 const val = i+1;
 const inputId = "q-" + id + "-" + val;
 const input = h("input", {type:"radio", name:"q-"+id, id:inputId, value:val,
 onchange:()=>{ state.answers[id] = val; saveState(); markSelected(id); }});
 if(state.answers[id] === val) input.checked = true;
 const label = h("label", {for:inputId, class: state.answers[id]===val ? "checked":""}, [
 h("span", {class:"num"}, [String(val)]),
 h("span", {}, [lab])
 ]);
 scale.appendChild(input);
 scale.appendChild(label);
 });
 item.appendChild(scale);
 item.dataset.itemId = id;
 return item;
 }
 function markSelected(id){
 document.querySelectorAll('[data-item-id="'+id+'"] label').forEach(l=>l.classList.remove("checked"));
 const checkedInput = document.querySelector('input[name="q-'+id+'"]:checked');
 if(checkedInput) checkedInput.nextElementSibling.classList.add("checked");
 }

 // ---------- working style (DISC) ----------
 function renderDisc(main){
 const wrap = h("div", {class:"wrap"});
 wrap.appendChild(progressBlock(stepIndexFor("disc")));
 const panel = h("div", {class:"panel"});
 panel.appendChild(h("h2", {}, ["Your Working Style"]));
 panel.appendChild(h("p", {class:"area-desc"}, [
 DATA.copy.discIntro || "For each pair of situations below, mark the statement that's most like you and the one that's least like you. There are no right answers - this measures preference, not capability."
 ]));
 DISC_BLOCKS.forEach(block => panel.appendChild(renderDiscBlock(block)));
 wrap.appendChild(panel);

 const row = h("div", {class:"btn-row"});
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>{ state.screen="area"; state.areaIndex = DATA.areas.length-1; saveState(); render(); }}, ["Back"]));
 row.appendChild(h("button", {class:"btn", onclick:()=>{ state.screen="reflect"; saveState(); render(); window.scrollTo({top:0}); }}, ["Continue to reflections"]));
 wrap.appendChild(row);
 main.appendChild(wrap);
 }
 function renderDiscBlock(block){
 const wrapEl = h("div", {class:"disc-block"});
 wrapEl.appendChild(h("p", {class:"prompt"}, [block.prompt]));
 const table = h("table", {class:"disc-table"});
 const thead = h("tr", {}, [h("th",{},[""]), h("th",{},["Most"]), h("th",{},["Least"])]);
 table.appendChild(thead);
 const opts = discRotatedOptions(block);
 opts.forEach(opt => {
 const cur = state.disc[block.id] || {};
 const mostBtn = h("button", {class:"disc-radio most" + (cur.most===opt.style?" selected":""), type:"button",
 onclick: ()=> setDisc(block.id, "most", opt.style)}, []);
 const leastBtn = h("button", {class:"disc-radio least" + (cur.least===opt.style?" selected":""), type:"button",
 onclick: ()=> setDisc(block.id, "least", opt.style)}, []);
 const tr = h("tr", {}, [
 h("td", {class:"disc-option-text"}, [opt.text]),
 h("td", {}, [mostBtn]),
 h("td", {}, [leastBtn])
 ]);
 table.appendChild(tr);
 });
 wrapEl.appendChild(table);
 return wrapEl;
 }
 function setDisc(blockId, kind, style){
 const cur = state.disc[blockId] || {};
 if(kind === "most"){
 cur.most = style;
 if(cur.least === style) delete cur.least; // auto-clear conflicting choice
 } else {
 cur.least = style;
 if(cur.most === style) delete cur.most;
 }
 state.disc[blockId] = cur;
 saveState();
 render();
 }

 // ---------- reflections ----------
 function renderReflections(main){
 const wrap = h("div", {class:"wrap"});
 wrap.appendChild(progressBlock(stepIndexFor("reflect")));
 const panel = h("div", {class:"panel"});
 panel.appendChild(h("h2", {}, ["A few reflections"]));
 panel.appendChild(h("p", {class:"area-desc"}, ["Optional, but these travel into your report and summary."]));
 DATA.copy.reflections.forEach(r => {
 const block = h("div", {class:"reflection"});
 block.appendChild(h("label", {for:"refl-"+r.id}, [r.label]));
 const ta = h("textarea", {id:"refl-"+r.id, oninput:(e)=>{ state.reflections[r.id]=e.target.value; saveState(); }});
 ta.value = state.reflections[r.id] || "";
 block.appendChild(ta);
 panel.appendChild(block);
 });
 wrap.appendChild(panel);

 const row = h("div", {class:"btn-row"});
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>{ state.screen="disc"; saveState(); render(); }}, ["Back"]));
 row.appendChild(h("button", {class:"btn", onclick:()=>{ state.screen="report"; saveState(); render(); window.scrollTo({top:0}); }}, ["See my report"]));
 wrap.appendChild(row);
 main.appendChild(wrap);
 }

 // ---------- scoring ----------
 function computeAreaScores(){
 return DATA.areas.map(area => {
 const vals = area.items.map(it => state.answers[area.id+"-"+it.id]).filter(v => typeof v === "number");
 return { id:area.id, name:area.name, score: mean(vals), answered: vals.length, total: area.items.length };
 });
 }
 function computeDisc(){
 const net = {D:0,I:0,S:0,C:0};
 Object.values(state.disc).forEach(pick => {
 if(pick.most) net[pick.most]++;
 if(pick.least) net[pick.least]--;
 });
 const ordered = Object.keys(net).sort((a,b)=>net[b]-net[a]);
 const primary = ordered[0];
 const tiedPrimary = ordered.filter(k => net[k] === net[primary]);
 let secondary = null;
 if(tiedPrimary.length === 1){
 const candidate = ordered[1];
 if(net[candidate] > 0 && (net[primary]-net[candidate]) <= 6) secondary = candidate;
 }
 return { net, primary, tiedPrimary, secondary };
 }

 // ---------- report ----------
 function renderReport(main){
 const areaScores = computeAreaScores();
 const overall = mean(areaScores.map(a=>a.score));
 const overallBand = bandFor(overall, DATA.overallBands);
 const disc = computeDisc();

 const wrap = h("div", {class:"wrap"});
 wrap.appendChild(h("h1", {}, ["Your report"]));
 wrap.appendChild(h("p", {class:"lede"}, [DATA.copy.reportIntro || "Here's where things stand today."]));

 // hero
 const hero = h("div", {class:"panel"});
 hero.appendChild(h("div", {class:"hero-score"}, [
 h("div", {class:"num"}, [overall.toFixed(1)]),
 h("div", {class:"band"}, [overallBand])
 ]));
 hero.appendChild(h("p", {class:"muted small"}, ["Mean across all " + DATA.areas.length + " capability areas, each scored 1-5."]));
 const bars = h("div", {class:"bars"});
 areaScores.slice().sort((a,b)=>b.score-a.score).forEach(a=>{
 const pct = clamp((a.score/5)*100, 0, 100);
 bars.appendChild(h("div", {class:"bar-row"}, [
 h("div", {class:"label"}, [a.name]),
 h("div", {class:"bar-track"}, [h("div", {class:"bar-fill", style:"width:"+pct+"%"})]),
 h("div", {class:"score"}, [a.answered ? a.score.toFixed(1) : "-"])
 ]));
 });
 hero.appendChild(bars);
 wrap.appendChild(hero);
 const note = h("p", {id:"resend-note", class:"small muted", style:"margin-top:14px;"}, ["Sending your results to " + state.email + "..."]);
 wrap.appendChild(note);
 wrap.appendChild(h("hr",{class:"rule"}));

 // priority areas (3 lowest)
 const lowest = areaScores.slice().sort((a,b)=>a.score-b.score).slice(0,3);
 wrap.appendChild(h("h2", {}, [DATA.copy.agendaTitle || "Your priority areas"]));
 wrap.appendChild(h("p", {class:"muted"}, [DATA.copy.agendaIntro || "The three areas with most room to grow right now."]));
 lowest.forEach(a => {
 const areaDef = DATA.areas.find(x=>x.id===a.id);
 const itemScores = areaDef.items.map(it => ({ text: itemText(it), val: state.answers[a.id+"-"+it.id] || 0 }))
 .sort((x,y)=>x.val-y.val).slice(0,2);
 const block = h("div", {class:"priority-area"});
 block.appendChild(h("h3", {}, [a.name]));
 block.appendChild(h("div", {class:"band-note"}, [bandFor(a.score, DATA.areaBands) + " | " + a.score.toFixed(1) + " / 5"]));
 const ul = h("ul", {class:"low-items"});
 itemScores.forEach(is => ul.appendChild(h("li", {}, [is.text])));
 block.appendChild(ul);
 const actions = (DATA.actionsByArea && DATA.actionsByArea[a.id]) || [];
 if(actions.length){
 const ol = h("ol", {class:"actions-list"});
 actions.forEach(act => ol.appendChild(h("li", {}, [act])));
 block.appendChild(ol);
 }
 wrap.appendChild(block);
 });
 wrap.appendChild(h("hr",{class:"rule"}));

 // strengths
 const strengths = areaScores.filter(a=>a.score>=3.4).sort((a,b)=>b.score-a.score);
 wrap.appendChild(h("h2", {}, [DATA.copy.strengthsTitle || "Strengths"]));
 if(strengths.length){
 const grid = h("div", {class:"strength-grid"});
 strengths.forEach(a => grid.appendChild(h("div", {class:"strength-row"}, [
 h("span", {class:"name"}, [a.name]),
 h("span", {class:"val"}, [a.score.toFixed(1)])
 ])));
 wrap.appendChild(grid);
 } else {
 wrap.appendChild(h("p", {class:"muted"}, ["No area is yet at 3.4 or above - the priority areas above are where to start."]));
 }
 wrap.appendChild(h("hr",{class:"rule"}));

 // working style
 wrap.appendChild(h("h2", {}, ["Your working style"]));
 const stylePanel = h("div", {class:"style-panel"});
 const primaryDef = DISC_STYLES[disc.primary];
 const label = disc.tiedPrimary.length > 1
 ? disc.tiedPrimary.map(k=>DISC_STYLES[k].name).join("-") + " blend"
 : primaryDef.name + (disc.secondary ? " - " + DISC_STYLES[disc.secondary].name + " blend" : "");
 stylePanel.appendChild(h("div", {class:"style-label"}, [label]));
 stylePanel.appendChild(h("p", {class:"style-blurb"}, [primaryDef.gives]));
 const discBars = h("div", {class:"disc-bars"});
 ["D","I","S","C"].forEach(k=>{
 const net = disc.net[k];
 const pct = clamp(((net+20)/40)*100, 0, 100);
 discBars.appendChild(h("div", {class:"disc-bar-row"}, [
 h("div", {class:"letter"}, [DISC_STYLES[k].name + " (" + k + ")"]),
 h("div", {class:"disc-axis"}, [h("div",{class:"mid"}), h("div", {class:"fill", style:"left:0%;width:"+pct+"%"})])
 ]));
 });
 stylePanel.appendChild(discBars);
 const cols = h("div", {class:"disc-cols"});
 const giveCol = h("div", {class:"disc-col"}, [h("h4",{},["What this gives the role"])]);
 const watchCol = h("div", {class:"disc-col"}, [h("h4",{},["What to watch"])]);
 const giveUl = h("ul", {}); giveUl.appendChild(h("li",{},[primaryDef.gives])); giveCol.appendChild(giveUl);
 const watchUl = h("ul", {}); watchUl.appendChild(h("li",{},[primaryDef.watch])); watchCol.appendChild(watchUl);
 cols.appendChild(giveCol); cols.appendChild(watchCol);
 stylePanel.appendChild(cols);
 stylePanel.appendChild(h("p", {class:"coaching-note"}, [
 "Style is a preference, not a capability - there's no right style for this role. For a " + primaryDef.name.toLowerCase() + " style, " + primaryDef.coach
 ]));
 stylePanel.appendChild(h("p", {class:"small muted", style:"margin-top:14px;"}, [
 "Net scores (-20 to +20, around a neutral midline): D " + fmtNet(disc.net.D) + " | I " + fmtNet(disc.net.I) + " | S " + fmtNet(disc.net.S) + " | C " + fmtNet(disc.net.C)
 ]));
 wrap.appendChild(stylePanel);
 wrap.appendChild(h("hr",{class:"rule"}));

 // full table
 wrap.appendChild(h("h2", {}, ["Full results"]));
 const table = h("table", {class:"full-table"});
 table.appendChild(h("tr", {}, [h("th",{},["Capability area"]), h("th",{},[""]), h("th",{},["Score"])]));
 areaScores.forEach(a => table.appendChild(h("tr", {}, [
 h("td", {}, [a.name]),
 h("td", {class:"muted small"}, [bandFor(a.score, DATA.areaBands)]),
 h("td", {class:"num"}, [a.answered ? a.score.toFixed(1) : "-"])
 ])));
 wrap.appendChild(table);
 wrap.appendChild(h("hr",{class:"rule"}));

 // reflections
 const reflectionsWithText = DATA.copy.reflections.filter(r => (state.reflections[r.id]||"").trim().length);
 if(reflectionsWithText.length){
 wrap.appendChild(h("h2", {}, ["Reflections"]));
 reflectionsWithText.forEach(r => {
 wrap.appendChild(h("div", {class:"reflect-out"}, [
 h("h4", {}, [r.label]),
 h("p", {}, [state.reflections[r.id]])
 ]));
 });
 wrap.appendChild(h("hr",{class:"rule"}));
 }

 // actions
 const row = h("div", {class:"btn-row"});
 row.appendChild(h("button", {class:"btn", onclick:()=>window.print()}, ["Print / save as PDF"]));
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>sendResults(areaScores, overall, overallBand, disc)}, ["Resend by email"]));
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:()=>copySummary(areaScores, overall, overallBand, disc)}, [DATA.copy.copySummaryLabel || "Copy summary"]));
 row.appendChild(h("button", {class:"btn btn-ghost", onclick:resetState}, ["Start over"]));
 wrap.appendChild(row);

 main.appendChild(wrap);

 if(!state.resultsSent){
 state.resultsSent = true;
 saveState();
 sendResults(areaScores, overall, overallBand, disc);
 }
 }
 function fmtNet(n){ return (n>0?"+":"") + n; }

 function buildSummaryText(areaScores, overall, overallBand, disc){
 const lines = [];
 lines.push(DATA.title + " - results");
 lines.push("Edition: " + (DATA.editions ? DATA.editions[state.edition].label : " - "));
 lines.push("Overall: " + overall.toFixed(1) + "/5 - " + overallBand);
 lines.push("");
 areaScores.forEach(a => lines.push(a.name + ": " + (a.answered?a.score.toFixed(1):"-") + "/5 - " + bandFor(a.score, DATA.areaBands)));
 lines.push("");
 const label = disc.tiedPrimary.length>1 ? disc.tiedPrimary.map(k=>DISC_STYLES[k].name).join("-")+" blend" : DISC_STYLES[disc.primary].name;
 lines.push("Working style: " + label + " (net: D " + fmtNet(disc.net.D) + " | I " + fmtNet(disc.net.I) + " | S " + fmtNet(disc.net.S) + " | C " + fmtNet(disc.net.C) + ")");
 const reflectionsWithText = DATA.copy.reflections.filter(r => (state.reflections[r.id]||"").trim().length);
 if(reflectionsWithText.length){
 lines.push("");
 reflectionsWithText.forEach(r => { lines.push(r.label + ":"); lines.push(state.reflections[r.id]); lines.push(""); });
 }
 return lines.join("\n");
 }
 function sendResults(areaScores, overall, overallBand, disc){
 const summary = buildSummaryText(areaScores, overall, overallBand, disc);
 const subject = DATA.title + " - your results";
 const note = document.getElementById("resend-note");
 if(note) note.textContent = "Sending your results to " + state.email + "...";
 fetch(DATA.resultsEndpoint || "/api/send-results", {
 method: "POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ email: state.email, tool: DATA.title, subject, summary })
 }).then(r => r.json().catch(()=>({})).then(data => ({ok: r.ok && data.ok, data})))
 .then(({ok, data})=>{
 if(!note) return;
 note.textContent = ok
 ? "Your results have been emailed to " + state.email + "."
 : "Couldn't send the email automatically" + (data && data.error ? " (" + data.error + ")" : "") + " - try again, or use Print / Copy below.";
 })
 .catch(()=>{
 if(note) note.textContent = "Couldn't reach the email service - try again, or use Print / Copy below.";
 });
 }
 function copySummary(areaScores, overall, overallBand, disc){
 const text = buildSummaryText(areaScores, overall, overallBand, disc);
 const note = document.getElementById("resend-note");
 navigator.clipboard.writeText(text).then(()=>{
 if(note) note.textContent = "Summary copied to clipboard.";
 }).catch(()=>{
 if(note) note.textContent = "Couldn't copy automatically - select and copy the text from your email draft instead.";
 });
 }

 // ---------- progress ----------
 function progressBlock(step){
 const wrapEl = h("div", {});
 const pct = clamp((step/TOTAL_STEPS)*100, 0, 100);
 wrapEl.appendChild(h("div", {class:"progress-track"}, [h("div", {class:"progress-fill", style:"width:"+pct+"%"})]));
 wrapEl.appendChild(h("div", {class:"progress-label"}, ["Step " + step + " of " + TOTAL_STEPS]));
 return wrapEl;
 }

 // ---------- main render ----------
 function render(){
 if(!state.email && state.screen !== "gate"){ state.screen = "gate"; }
 app.innerHTML = "";
 app.appendChild(renderTopbar());
 const main = h("main", {});
 if(state.screen === "gate") renderGate(main);
 else if(state.screen === "intro") renderIntro(main);
 else if(state.screen === "area") renderAreaScreen(main);
 else if(state.screen === "disc") renderDisc(main);
 else if(state.screen === "reflect") renderReflections(main);
 else if(state.screen === "report") renderReport(main);
 app.appendChild(main);
 const footer = h("div", {class:"footer-mark wrap"}, [
 "Emperico Partner Diagnostics" + (DATA.editions ? " | " + DATA.editions[state.edition].footerMark : "")
 ]);
 app.appendChild(footer);
 }

 render();
}
