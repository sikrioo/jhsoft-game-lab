function initUI(){
  // Decade buttons
  const dg = document.getElementById('decade-grid');
  Object.keys(DECADES).forEach(d => {
    const b = document.createElement('button');
    b.className='dchip'+(d===decade?' on':'');
    b.textContent=d.slice(2)+'년대';
    b.onclick=()=>setDecade(d,b);
    dg.appendChild(b);
  });
  renderEraInfo();

  // Gender buttons
  const gg = document.getElementById('gender-grid');
  [['male','남성'],['female','여성'],['any','무관']].forEach(([g,l])=>{
    const b=document.createElement('button');
    b.className='dchip'+(g===gender?' on':'');
    b.textContent=l;
    b.onclick=()=>setGender(g,b);
    gg.appendChild(b);
  });

  // Preset buttons
  const pg = document.getElementById('preset-grid');
  Object.keys(PRESETS).forEach(p=>{
    const b=document.createElement('button');
    b.className='pchip';
    b.textContent=p;
    b.title=p;
    b.onclick=()=>loadPreset(p);
    pg.appendChild(b);
  });

  // Sliders
  renderSliders('start','sliders-start');
  renderSliders('talent','sliders-talent');
  renderSliders('ability','sliders-ability');
  renderSliders('social','sliders-social');
  renderSliders('trait','sliders-trait');
  renderSliders('charm','sliders-charm');
  renderSliders('env','sliders-env');
  renderTagControls();
}

function renderAllSliders(){
  ['start','talent','ability','social','trait','charm','env'].forEach((g,i)=>{
    renderSliders(g,['sliders-start','sliders-talent','sliders-ability','sliders-social','sliders-trait','sliders-charm','sliders-env'][i]);
  });
}

function renderSliders(groupKey, containerId){
  const g = SCHEMA[groupKey];
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = `
    <div class="vgroup">
      <div class="vgroup-label">
        <span class="dot" style="background:${g.color}"></span>
        <span style="color:${g.color}">${g.label}</span>
        ${g.fixed?'<span class="fixed-tag">고정값</span>':''}
      </div>
      ${g.vars.map(v=>`
        <div class="vrow" title="${v.tip}">
          <label class="vlabel">${v.l}</label>
          <input type="range" min="0" max="100" step="1" value="${vals[v.k]??50}"
            oninput="vals['${v.k}']=+this.value;this.nextElementSibling.textContent=this.value">
          <span class="vval">${vals[v.k]??50}</span>
        </div>`).join('')}
    </div>`;
}

function showTab(id, btn){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function setDecade(d, btn){
  decade=d;
  document.querySelectorAll('#decade-grid .dchip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderEraInfo();
}
function renderEraInfo(){
  const dc=DECADES[decade];
  document.getElementById('era-note').textContent=dc.note;
  document.getElementById('era-events').innerHTML=dc.ev.map(e=>`<span class="ev-tag ev${e.t}">${e.l}</span>`).join('');
}
function setGender(g,btn){
  gender=g;
  btn.parentElement.querySelectorAll('.dchip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
function loadPreset(p){
  if(!PRESETS[p]){
    const allKeys=Object.values(SCHEMA).flatMap(g=>g.vars.map(v=>v.k));
    allKeys.forEach(k=>{vals[k]=Math.round(Math.random()*80+10);});
  } else {
    vals={...PRESETS[p]};
  }
  renderAllSliders();
  renderTagControls();
}

function renderTagControls(){
  const el = document.getElementById('tag-controls');
  if(!el) return;

  const active = getTagEffects().active;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Growth Tags <span class="badge" style="background:rgba(78,184,122,0.12);color:var(--grn2)">HABIT + EXPERIENCE</span></div>
      <div class="tag-preview">
        ${active.length
          ? active.map(tag=>`<span class="tag-preview-item" style="border-color:${tag.color}55;color:${tag.color}">${tag.label} · ${tag.level}</span>`).join('')
          : '<div class="tag-empty">활성 태그 없음 · 순수 기본 스탯만으로 시뮬레이션</div>'}
      </div>
      ${Object.entries(TAGS).map(([key, tag])=>`
        <div class="tag-group">
          <div class="tag-head">
            <div>
              <div class="tag-title" style="color:${tag.color}">${tag.label}</div>
              <div class="tag-desc">${tag.description}</div>
            </div>
          </div>
          <div class="tag-options">
            ${tag.levels.map(level=>`
              <button class="tag-chip ${tagSelections[key]===level.value?'on':''}"
                style="${tagSelections[key]===level.value?`border-color:${tag.color};color:${tag.color};background:${tag.color}14`:''}"
                onclick="setTag('${key}','${level.value}')">${level.label}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function setTag(tagKey, levelValue){
  tagSelections[tagKey] = levelValue;
  renderTagControls();
}

// ══════════════════════════════════════════════════════
// 6. ADJUSTED VALUES (era bonus applied)
// ══════════════════════════════════════════════════════

function runSim(){
  const v = getAdj();
  const d = parseInt(decade);

  // Generate luck
  const qNoise = (Math.random()-0.5)*20;
  const luck = {
    birth:  v.birth_luck,
    env:    Math.round(Math.random()*40+30),
    timing: Math.round(Math.random()*40+30),
    event:  Math.round(Math.random()*50+25),
    quantum: qNoise,
  };
  v._luckEnv = luck.env;

  const comp    = calcComposites(v);
  const combos  = calcCombos(v, comp);
  const charm   = calcCharm(v);
  const human   = classifyHuman(v, comp, combos);
  const success = calcSuccess(v, comp, combos, luck);
  const risks   = calcRisks(v, comp);
  const phases  = calcPhases(v, comp, luck);
  const events  = generateEvents(v, comp, phases, luck, combos);
  const careers = buildCareers(v, comp, charm, decade, gender);
  const verdict = getVerdict(human, success, comp, v, careers);
  const tagProfile = v._tagProfile || [];

  renderReport({v, comp, combos, charm, human, success, risks, phases, events, careers, verdict, luck, d, tagProfile});
}

// ══════════════════════════════════════════════════════
// 18. RENDER REPORT
// ══════════════════════════════════════════════════════
function renderReport({v,comp,combos,charm,human,success,risks,phases,events,careers,verdict,luck,d,tagProfile}){
  const main = document.getElementById('main-panel');
  const hasWarn = careers.slice(0,10).some(c=>c.warn);

  const CATS=['전체','외모기반','영업비즈니스','IT공학','연구의료법','예술창작','스포츠','미디어','교육사회','공공군사','기능노동','물류서비스','농수산','신종직종','회색지대'];

  main.innerHTML = `
  <div class="report-grid">

  <!-- 1. 인간 유형 -->
  <div class="section fu">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(124,106,240,0.15);color:var(--ac2)">◈</div>
      <div class="sec-title">인간 유형 판정</div>
    </div>
    <div class="sec-body">
      <div class="type-chips">
        ${human.labels.map(l=>`<span class="type-chip" style="color:${l.c};border-color:${l.c};background:${l.c}18">${l.l}</span>`).join('')}
      </div>
      <div class="type-summary">${human.details.join('<br>')}</div>
    </div>
  </div>

  <!-- 2. 상위 지표 -->
  <div class="section fu fu1">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(90,158,240,0.15);color:var(--blu2)">◐</div>
      <div class="sec-title">핵심 능력 지표 (12축)</div>
    </div>
    <div class="sec-body">
      <div class="stat-grid">
        ${[
          {n:'인지력',    v:comp.cognition,   c:'#5a9ef0'},
          {n:'창조력',    v:comp.creativity,  c:'#a594ff'},
          {n:'설계력',    v:comp.design,      c:'#3db8a8'},
          {n:'실행력 총합', v:comp.exec_total, c:'#4eb87a'},
          {n:'생존력',    v:comp.survival,    c:'#c9a84c'},
          {n:'관계력',    v:comp.relation,    c:'#e87ab0'},
          {n:'영향력',    v:comp.influence,   c:'#e05a5a'},
          {n:'안정유지력', v:comp.stability,  c:'#5a9ef0'},
          {n:'위험추진력', v:comp.drive,      c:'#c9a84c'},
          {n:'예술력',    v:comp.art_power,   c:'#a594ff'},
          {n:'타락위험도', v:comp.decay_risk,  c:'#e05a5a'},
          {n:'운보정치',  v:comp.luck_total,  c:'#3db8a8'},
        ].map(s=>`
          <div class="stat-item">
            <div class="stat-name">${s.n}</div>
            <div class="stat-val" style="color:${s.c}">${s.v}</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${s.v}%;background:${s.c}"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 3. 조합 시너지/패널티 -->
  <div class="section fu fu2">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(78,184,122,0.15);color:var(--grn2)">⊕</div>
      <div class="sec-title">변수 조합 시너지 · 패널티 분석</div>
    </div>
    <div class="sec-body">
      ${combos.length===0?'<div style="font-size:12px;color:var(--t3)">특별한 조합 효과 없음 — 평균적인 변수 분포</div>':''}
      <div class="combo-list">
        ${combos.map(c=>`
          <div class="combo-item ${c.type}">
            <span class="combo-tag ${c.type==='syn'?'s':'p'}">${c.type==='syn'?'시너지':'패널티'} ${c.delta>0?'+':''}${c.delta}%</span>
            <div><strong style="font-size:11.5px">${c.label}</strong><br><span style="color:var(--t2)">${c.desc}</span></div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 4. 매력 프로파일 -->
  <div class="section fu fu2">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(232,122,176,0.15);color:var(--pnk)">✦</div>
      <div class="sec-title">매력 아키타입 프로파일</div>
    </div>
    <div class="sec-body">
      <div style="margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px">
        <span style="font-size:12px;color:var(--t2)">주 매력:</span>
        <span class="charm-main-badge" style="background:${charm.main.color}22;color:${charm.main.color};border:1px solid ${charm.main.color}44">${charm.main.name} ${charm.main.score}</span>
        <span style="font-size:12px;color:var(--t2)">보조:</span>
        <span class="charm-main-badge" style="background:${charm.sub.color}22;color:${charm.sub.color};border:1px solid ${charm.sub.color}44">${charm.sub.name} ${charm.sub.score}</span>
      </div>
      <div class="charm-grid">
        ${charm.archetypes.map(a=>`
          <div class="charm-card">
            <div class="charm-name" style="color:${a.color}">${a.name}</div>
            <div class="charm-score" style="color:${a.color}">${a.score}</div>
            <div class="charm-bar"><div class="charm-fill" style="width:${a.score}%;background:${a.color}"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="section fu fu3">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(78,184,122,0.15);color:var(--grn2)">✚</div>
      <div class="sec-title">습관 · 경험 태그 보정</div>
    </div>
    <div class="sec-body">
      ${tagProfile.length===0
        ? '<div class="tag-empty">활성 태그 없음 · 현재 결과는 기본 스탯과 시대 보정만으로 계산됨</div>'
        : `<div class="tag-effect-list">
            ${tagProfile.map(tag=>`
              <div class="tag-effect-item">
                <div class="combo-tag s" style="background:${tag.color}22;color:${tag.color}">${tag.label} · ${tag.level}</div>
                <div>
                  <div class="tag-effect-name">${tag.effects.join(', ')}</div>
                  <div class="tag-effect-desc">${tag.description}</div>
                </div>
              </div>`).join('')}
          </div>`}
    </div>
  </div>

  <!-- 5. 운의 3레이어 -->
  <div class="section fu fu3">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(61,184,168,0.15);color:var(--tel)">◉</div>
      <div class="sec-title">운의 5레이어</div>
    </div>
    <div class="sec-body">
      <div class="luck-row">
        <div class="luck-item"><div class="luck-label">출생운</div><div class="luck-val" style="color:var(--gold)">${luck.birth}</div><div style="font-size:8px;color:var(--t3);margin-top:1px">고정·불변</div></div>
        <div class="luck-item"><div class="luck-label">환경운</div><div class="luck-val" style="color:var(--tel)">${luck.env}</div><div style="font-size:8px;color:var(--t3);margin-top:1px">매회 랜덤</div></div>
        <div class="luck-item"><div class="luck-label">타이밍운</div><div class="luck-val" style="color:var(--blu2)">${luck.timing}</div><div style="font-size:8px;color:var(--t3);margin-top:1px">매회 랜덤</div></div>
        <div class="luck-item"><div class="luck-label">사건운</div><div class="luck-val" style="color:var(--ora)">${luck.event}</div><div style="font-size:8px;color:var(--t3);margin-top:1px">매회 랜덤</div></div>
      </div>
      <div style="margin-top:8px;padding:9px 11px;background:rgba(61,184,168,0.04);border:0.5px solid rgba(61,184,168,0.16);border-radius:7px;font-size:10.5px;color:var(--t3);line-height:1.6;font-style:italic">
        <strong style="color:var(--tel);font-style:normal">양자운 ${luck.quantum>=0?'+':''}${Math.round(luck.quantum)}</strong> — 동일 변수로 재실행해도 이 값은 달라집니다. 설명되지 않는 우연의 연쇄를 모델링합니다. 세계 압력: <strong style="color:${DECADES[decade].wp<-15?'var(--red)':'var(--gold)'};font-style:normal">${DECADES[decade].wp}</strong> (${DECADES[decade].wp<=-20?'압박 심화':DECADES[decade].wp<=-10?'경쟁 심화':'완만'})
      </div>
    </div>
  </div>

  <!-- 6. 성공 가능성 -->
  <div class="section fu fu3">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(201,168,76,0.15);color:var(--gold2)">◆</div>
      <div class="sec-title">성공 가능성 3축</div>
    </div>
    <div class="sec-body">
      <div class="success-3">
        ${[
          {l:'경제적 성공',  v:success.economic, c:'#4eb87a',  d:'돈·자산·생존 안정'},
          {l:'사회적 성공',  v:success.social,   c:'#5a9ef0',  d:'명성·지위·영향력'},
          {l:'내적 성공',    v:success.inner,    c:'#a594ff',  d:'만족·자아실현·후회 없음'},
        ].map(s=>`
          <div class="suc-card">
            <div class="suc-label">${s.l}</div>
            <div class="suc-val" style="color:${s.c}">${s.v}</div>
            <div style="font-size:9px;color:var(--t3);margin-top:2px">${s.d}</div>
            <div class="suc-bar"><div class="suc-fill" style="width:${s.v}%;background:${s.c}"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 7. 리스크 분석 -->
  <div class="section fu fu4">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(224,90,90,0.15);color:var(--red2)">⚠</div>
      <div class="sec-title">리스크 분석</div>
    </div>
    <div class="sec-body">
      ${risks.length===0?'<div style="font-size:12px;color:var(--grn)">주요 리스크 없음 — 균형적인 변수 분포</div>':''}
      <div class="risk-list">
        ${risks.map(r=>`
          <div class="risk-item" style="border-left-color:${r.color}">
            <div>${r.icon}</div>
            <div>
              <div class="risk-title">${r.title}</div>
              <div class="risk-desc">${r.desc}</div>
              <div class="risk-severity" style="color:${r.color}">위험도 ${'▮'.repeat(r.sev)}${'▯'.repeat(3-r.sev)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 8. 직업 적합도 -->
  <div class="section fu fu4">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(78,184,122,0.15);color:var(--grn2)">⊞</div>
      <div class="sec-title">직업 적합도 TOP 10 · 200개 분석 · ${decade}년대 필터${hasWarn?' <span style="font-size:9px;padding:1px 5px;background:rgba(224,90,90,0.12);color:var(--red);border-radius:3px;font-family:monospace">⚠ 회색지대 포함</span>':''}</div>
    </div>
    <div class="sec-body">
      <div class="career-filter" id="career-filter">
        ${CATS.map(cat=>`<button class="cf-btn ${cat==='전체'?'on':''}" onclick="filterCareers('${cat}',this)">${cat}</button>`).join('')}
      </div>
      <div class="career-grid" id="career-grid">
        ${renderCareerCards(careers,'전체')}
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:8px;font-family:monospace">분석된 직업 수: ${careers.length}개 | ${decade}년대 시대 필터 적용</div>
    </div>
  </div>

  <!-- 9. 인생 궤적 -->
  <div class="section fu fu5">
    <div class="sec-header">
      <div class="sec-icon" style="background:rgba(155,125,232,0.15);color:var(--pur)">◎</div>
      <div class="sec-title">인생 궤적 시뮬레이션</div>
    </div>
    <div class="sec-body">
      <div class="timeline">
        ${phases.map(p=>{
          const phaseKey = p.name.replace('기성인기','기성인기');
          const phaseEvents = events[p.name]||events[p.name.replace('초기 ','초기')||p.name]||[];
          const evKey = p.name==='초기 성인기'?'초기성인기':p.name;
          const evList = events[evKey]||[];
          return `
          <div class="tl-phase">
            <div class="tl-dot" style="background:${p.color}"></div>
            <div class="tl-phase-name" style="color:${p.color}">${p.name} <span style="color:var(--t3);font-size:10px">${p.age}</span></div>
            <div class="tl-phase-score" style="color:${p.color}">성취도 ${p.score} · ${p.keys}</div>
            <div class="tl-events">
              ${evList.map(e=>`<div class="tl-ev ${e.t}">${e.text}</div>`).join('')||'<div class="tl-ev neu">특별한 이벤트 없음 — 평범한 구간</div>'}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- 10. 최종 판정 -->
  <div class="verdict fu fu6">
    <div class="verdict-type">${verdict.type}</div>
    <div class="verdict-desc">${verdict.desc}</div>
  </div>

  </div><!-- .report-grid -->
  `;

  // store careers for filter
  window._allCareers = careers;

  // scroll to top of main
  main.scrollTop = 0;
}

function renderCareerCards(careers, filter){
  const filtered = filter==='전체' ? careers : careers.filter(c=>c.cat===filter);
  return filtered.slice(0,10).map((c,i)=>`
    <div class="cc ${i===0&&filter==='전체'?'top1':''} ${c.warn?'warn':''}">
      <div class="cc-rank">#${i+1} · ${c.fit} · ${c.cat}${c.warn?' <span style="color:var(--red)">⚠ 회색지대</span>':''}</div>
      <div class="cc-name">${c.n}</div>
      <div class="cc-signals">
        ${(c.signals||[]).map(signal=>`<span class="cc-signal">${signal.label} ${signal.value}</span>`).join('')}
      </div>
      <div class="cc-bar"><div class="cc-fill" style="width:${c.fit}%;background:${c.c}"></div></div>
      <div class="cc-why">${c.w}</div>
    </div>`).join('');
}

function filterCareers(cat, btn){
  document.querySelectorAll('.cf-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('career-grid').innerHTML = renderCareerCards(window._allCareers||[], cat);
}

// ── INIT ──
