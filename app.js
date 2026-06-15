// ====== Minhas Finanças - App Logic ======

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MCURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Icon set: emoji-based (no external icon font needed)
const ICONS = ['💰','🪙','💼','🏦','💳','🛒','🏠','🚗','❤️','📱','🎓','🍖','✈️','👕','📈','🐷'];
const ICOL = {
  '💰':'#1D9E75','🪙':'#BA7517','💼':'#185FA5','🏦':'#185FA5','💳':'#533AB7',
  '🛒':'#D85A30','🏠':'#639922','🚗':'#888780','❤️':'#D4537E','📱':'#378ADD',
  '🎓':'#185FA5','🍖':'#D85A30','✈️':'#533AB7','👕':'#D4537E','📈':'#1D9E75','🐷':'#BA7517'
};
const IBKG = {
  '💰':'#E1F5EE','🪙':'#FAEEDA','💼':'#E6F1FB','🏦':'#E6F1FB','💳':'#EEEDFE',
  '🛒':'#FAECE7','🏠':'#EAF3DE','🚗':'#F1EFE8','❤️':'#FBEAF0','📱':'#E6F1FB',
  '🎓':'#E6F1FB','🍖':'#FAECE7','✈️':'#EEEDFE','👕':'#FBEAF0','📈':'#E1F5EE','🐷':'#FAEEDA'
};

let now = new Date();
let curYear = now.getFullYear(), curMonth = now.getMonth();
let mCtx = {tipo:'entrada', cat:'fixo', fixo:false};
let selIcon = '💰';
let cMes = null, cAnual = null, cProj = null;

let entries = [];
let fixedEntries = [];
try { entries = JSON.parse(localStorage.getItem('fin_entries')||'[]'); } catch(e){ entries = []; }
try { fixedEntries = JSON.parse(localStorage.getItem('fin_fixed')||'[]'); } catch(e){ fixedEntries = []; }

function persist(){ 
  try{ localStorage.setItem('fin_entries', JSON.stringify(entries)); }catch(e){} 
  try{ localStorage.setItem('fin_fixed', JSON.stringify(fixedEntries)); }catch(e){} 
}
function applyFixedEntries(y, m) {
  const ym = ymKey(y, m);
  fixedEntries.forEach(fe => {
    if (!entries.find(e => e.id === fe.id && e.ym === ym)) {
      entries.push({
        id: fe.id,
        nome: fe.nome,
        valor: fe.valor,
        tipo: fe.tipo,
        cat: fe.cat,
        icon: fe.icon,
        ym: ym,
        fixedId: fe.id
      });
    }
  });
  persist();
}
function fmt(v){ return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtS(v){ return 'R$ '+Math.round(v).toLocaleString('pt-BR'); }
function ymKey(y,m){ return y+'-'+(m<9?'0':'')+(m+1); }
function getMes(y,m){ 
  applyFixedEntries(y, m);
  return entries.filter(e=>e.ym===ymKey(y,m)); 
}

function activeTab(){ return [...document.querySelectorAll('.nav-item')].findIndex(t=>t.classList.contains('active')); }

function updateHeader(){
  const t = activeTab();
  const showNav = (t===0 || t===1 || t===2);
  document.getElementById('month-nav').style.display = showNav ? 'flex' : 'none';
  document.getElementById('month-label').innerHTML = MESES[curMonth]+' <span>'+curYear+'</span>';
  document.getElementById('hdr-sub').textContent = showNav ? (MESES[curMonth]+' '+curYear) : String(curYear);
}

function prevMonth(){ curMonth--; if(curMonth<0){curMonth=11;curYear--;} updateHeader(); renderAll(); }
function nextMonth(){ curMonth++; if(curMonth>11){curMonth=0;curYear++;} updateHeader(); renderAll(); }

function switchTab(i){
  document.querySelectorAll('.page').forEach((p,j)=>p.classList.toggle('active',j===i));
  document.querySelectorAll('.nav-item').forEach((t,j)=>t.classList.toggle('active',j===i));
  updateHeader();
  if(i===0) renderResumo();
  else if(i===1||i===2) renderLists();
  else if(i===3) renderAnual();
  else if(i===4) calcProj();
}

function renderAll(){
  const t = activeTab();
  if(t===0) renderResumo();
  else if(t===1||t===2) renderLists();
  else if(t===3) renderAnual();
  else if(t===4) calcProj();
}

function renderLists(){
  const mes = getMes(curYear, curMonth);
  [['entrada','fixo'],['entrada','variavel'],['saida','fixo'],['saida','variavel'],['saida','cartao'],['investimento','investimento']].forEach(([tipo,cat])=>{
    const el = document.getElementById('list-'+tipo+'-'+cat);
    if(!el) return;
    const sub = mes.filter(e=>e.tipo===tipo&&e.cat===cat);
    if(!sub.length){ el.innerHTML=`<div class="empty">Nenhum item em ${MESES[curMonth]}</div>`; return; }
    el.innerHTML = sub.map(e=>`
      <div class="entry-item" onclick="editEntry('${e.id}','${e.fixedId||''}')">
        <div class="eicon" style="background:${IBKG[e.icon]||'#F1EFE8'}">${e.icon}</div>
        <div class="einfo"><div class="ename">${escapeHtml(e.nome)}</div><div class="ecat"><span class="tag ${cat}">${catLbl(cat)}</span></div></div>
        <div class="eamt ${tipo==='entrada'?'pos':tipo==='investimento'?'neu':'neg'}">${tipo==='saida'?'− ':''}${fmt(e.valor)}</div>
      </div>`).join('');
  });
}

function renderResumo(){
  const mes = getMes(curYear, curMonth);
  const ent = mes.filter(e=>e.tipo==='entrada').reduce((a,e)=>a+Number(e.valor),0);
  const sai = mes.filter(e=>e.tipo==='saida').reduce((a,e)=>a+Number(e.valor),0);
  const sal = ent - sai;
  document.getElementById('res-ent').textContent = fmt(ent);
  document.getElementById('res-sai').textContent = fmt(sai);
  const el = document.getElementById('saldo-mes');
  el.textContent = fmt(sal);
  el.className = 'bal-value '+(sal>0?'positive':sal<0?'negative':'');

  const rl = document.getElementById('list-recent');
  const recent = [...mes].reverse().slice(0,6);
  if(!recent.length){ rl.innerHTML=`<div class="empty">Nenhum lançamento em ${MESES[curMonth]}</div>`; }
  else { rl.innerHTML = recent.map(e=>`
    <div class="entry-item">
      <div class="eicon" style="background:${IBKG[e.icon]||'#F1EFE8'}">${e.icon}</div>
      <div class="einfo"><div class="ename">${escapeHtml(e.nome)}</div><div class="ecat"><span class="tag ${e.cat}">${catLbl(e.cat)}</span></div></div>
      <div class="eamt ${e.tipo==='entrada'?'pos':e.tipo==='investimento'?'neu':'neg'}">${e.tipo==='saida'?'− ':''}${fmt(e.valor)}</div>
    </div>`).join(''); }

  drawMesChart(mes);
}

function drawMesChart(mes){
  const canvas = document.getElementById('cMes');
  if(!canvas) return;
  if(cMes){ cMes.destroy(); cMes=null; }
  const fixo = mes.filter(e=>e.tipo==='saida'&&e.cat==='fixo').reduce((a,e)=>a+Number(e.valor),0);
  const vrv  = mes.filter(e=>e.tipo==='saida'&&e.cat==='variavel').reduce((a,e)=>a+Number(e.valor),0);
  const cart = mes.filter(e=>e.tipo==='saida'&&e.cat==='cartao').reduce((a,e)=>a+Number(e.valor),0);
  const ent  = mes.filter(e=>e.tipo==='entrada').reduce((a,e)=>a+Number(e.valor),0);
  const sal  = Math.max(0, ent-(fixo+vrv+cart));

  // reset canvas (in case previous render replaced parent's HTML)
  const wrap = canvas.parentElement;
  if(!wrap.querySelector('canvas')){
    wrap.innerHTML = '<canvas id="cMes" role="img" aria-label="Gráfico de rosca com distribuição de saídas"></canvas>';
  }
  const c = document.getElementById('cMes');

  if(!fixo&&!vrv&&!cart&&!sal){
    wrap.innerHTML = '<div class="empty" style="padding:32px 0">Adicione lançamentos para ver o gráfico</div>';
    return;
  }

  cMes = new Chart(c,{
    type:'doughnut',
    data:{labels:['Saldo livre','Fixas','Variáveis','Cartão'],datasets:[{data:[sal,fixo,vrv,cart],backgroundColor:['#1D9E75','#D85A30','#BA7517','#533AB7'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}
  });
}

function renderAnual(){
  document.getElementById('ano-lbl').textContent = curYear;
  const anoE=[], anoS=[], anoSal=[];
  let tE=0, tS=0, bestMes='—', bestVal=-Infinity;
  for(let m=0;m<12;m++){
    const mes=getMes(curYear,m);
    const e=mes.filter(x=>x.tipo==='entrada').reduce((a,x)=>a+Number(x.valor),0);
    const s=mes.filter(x=>x.tipo==='saida').reduce((a,x)=>a+Number(x.valor),0);
    const sal=e-s;
    anoE.push(e); anoS.push(s); anoSal.push(sal);
    tE+=e; tS+=s;
    if((e||s) && sal>bestVal){bestVal=sal; bestMes=MCURTOS[m];}
  }
  document.getElementById('ano-ent').textContent = fmtS(tE);
  document.getElementById('ano-sai').textContent = fmtS(tS);
  const se = document.getElementById('ano-sal');
  se.textContent = fmtS(tE-tS);
  se.className = 'ym-val '+(tE-tS>=0?'pos':'neg');
  document.getElementById('ano-best').textContent = bestMes==='—' ? '—' : bestMes+' ('+fmtS(bestVal)+')';

  const canvas = document.getElementById('cAnual');
  if(cAnual){cAnual.destroy();cAnual=null;}
  cAnual = new Chart(canvas,{
    type:'bar',
    data:{labels:MCURTOS,datasets:[
      {label:'Entradas',data:anoE,backgroundColor:'rgba(29,158,117,.8)',borderRadius:4,borderSkipped:false},
      {label:'Saídas',data:anoS,backgroundColor:'rgba(216,90,48,.8)',borderRadius:4,borderSkipped:false},
      {label:'Saldo',data:anoSal,type:'line',borderColor:'#378ADD',backgroundColor:'rgba(55,138,221,.08)',fill:false,tension:.35,pointRadius:3,borderWidth:2,yAxisID:'y'}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      scales:{
        x:{ticks:{font:{size:9}},grid:{display:false}},
        y:{ticks:{callback:v=>v>=1000?Math.round(v/1000)+'k':v,font:{size:9}},grid:{color:'rgba(128,128,128,.1)'}}
      },
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt(c.raw)}}}
    }
  });

  const ml = document.getElementById('months-list');
  let html='';
  for(let m=11;m>=0;m--){
    const e=anoE[m],s=anoS[m],sal=anoSal[m];
    if(!e&&!s) continue;
    const cls=sal>0?'pos':sal<0?'neg':'zero';
    html+=`<div class="month-row" onclick="goMonth(${m})">
      <div class="month-badge ${cls}"><span style="font-size:15px;font-weight:600">${MCURTOS[m]}</span></div>
      <div class="month-info"><div class="month-name">${MESES[m]} ${curYear}</div><div class="month-sub">↑ ${fmtS(e)} &nbsp; ↓ ${fmtS(s)}</div></div>
      <div class="month-saldo ${sal>=0?'pos':'neg'}">${sal>=0?'+':''}${fmtS(sal)}</div>
    </div>`;
  }
  ml.innerHTML = html || '<div class="empty">Nenhum dado em '+curYear+'</div>';
}

function goMonth(m){ curMonth=m; updateHeader(); switchTab(0); }

function calcProj(){
  const cap=parseFloat(document.getElementById('pj-cap').value)||0;
  const taxa=parseFloat(document.getElementById('pj-taxa').value)||0;
  const dias=parseInt(document.getElementById('pj-per').value)||90;
  const tipo=document.getElementById('pj-tipo').value;
  
  // Calcular dias úteis (excluindo feriados e fins de semana)
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + dias * 24 * 60 * 60 * 1000);
  const businessDays = countBusinessDays(startDate, endDate);
  const businessDaysPerYear = 252; // Média de dias úteis por ano no Brasil
  const taxaAoAno = taxa / 100;
  const diasUteisPeriodo = businessDays;
  const diasUteisPorAno = businessDaysPerYear;
  const periodoEmAnos = diasUteisPeriodo / diasUteisPorAno;
  
  const t = taxaAoAno;
  const final = tipo==='compostos' ? cap*Math.pow(1+t, periodoEmAnos) : cap*(1+t*periodoEmAnos);
  const rend = final - cap;
  document.getElementById('pj-res').innerHTML=`
    <div class="pr-item"><div class="pr-lbl">Capital</div><div class="pr-val">${fmt(cap)}</div></div>
    <div class="pr-item"><div class="pr-lbl">Rendimento</div><div class="pr-val pos">+${fmt(rend)}</div></div>
    <div class="pr-item"><div class="pr-lbl">Total final</div><div class="pr-val">${fmt(final)}</div></div>
    <div class="pr-item" style="grid-column:1/-1;font-size:10px;color:var(--text-secondary);margin-top:4px">Dias úteis: ${diasUteisPeriodo} de ${dias}</div>`;

  const steps=Math.max(4,Math.round(periodoEmAnos<=0.25?periodoEmAnos*8:periodoEmAnos<=0.5?periodoEmAnos*4:periodoEmAnos*2));
  const lbls=[],data=[];
  for(let i=0;i<=steps;i++){
    const p=(periodoEmAnos/steps)*i;
    const v=tipo==='compostos'?cap*Math.pow(1+t,p):cap*(1+t*p);
    lbls.push(i===0?'Hoje':+(p.toFixed(2))+'a');
    data.push(parseFloat(v.toFixed(2)));
  }
  if(cProj){cProj.destroy();cProj=null;}
  cProj=new Chart(document.getElementById('cProj'),{
    type:'line',
    data:{labels:lbls,datasets:[{label:'Saldo',data,borderColor:'#1D9E75',backgroundColor:'rgba(29,158,117,.1)',fill:true,tension:.3,pointRadius:2,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{maxTicksLimit:6,font:{size:9}},grid:{display:false}},y:{ticks:{callback:v=>'R$'+Math.round(v/1000)+'k',font:{size:9}},grid:{color:'rgba(128,128,128,.1)'}}},plugins:{legend:{display:false}}}
  });

  const inv=entries.filter(e=>e.tipo==='investimento').reduce((a,e)=>a+Number(e.valor),0);
  document.getElementById('inv-total').textContent=fmt(inv);
  document.getElementById('inv-rend').textContent='+ '+fmt(inv*t);
  renderInvList();
}

function renderInvList(){
  const el=document.getElementById('list-investimento-investimento');
  const sub=entries.filter(e=>e.tipo==='investimento');
  if(!sub.length){el.innerHTML='<div class="empty">Nenhum investimento cadastrado</div>';return;}
  el.innerHTML=sub.map(e=>`
    <div class="entry-item" onclick="del('${e.id}')">
      <div class="eicon" style="background:${IBKG[e.icon]||'#E6F1FB'}">${e.icon}</div>
      <div class="einfo"><div class="ename">${escapeHtml(e.nome)}</div><div class="ecat"><span class="tag investimento">Investimento</span></div></div>
      <div class="eamt pos">${fmt(e.valor)}</div>
    </div>`).join('');
}

function defIcon(c){return{fixo:'📄',variavel:'🛒',cartao:'💳',investimento:'🏦'}[c]||'🪙';}
function catLbl(c){return{fixo:'Fixo',variavel:'Variável',cartao:'Cartão',investimento:'Investimento'}[c]||c;}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ===== MODAL =====
function openModal(tipo, cat){
  mCtx={tipo,cat,fixo:false};
  selIcon = tipo==='entrada'?'💰':tipo==='investimento'?'🏦':'📄';
  document.getElementById('modal-ttl').textContent = tipo==='entrada'?'Adicionar entrada':tipo==='investimento'?'Adicionar investimento':'Adicionar saída';
  document.getElementById('m-nome').value='';
  document.getElementById('m-valor').value='';
  document.getElementById('m-fixo').checked=false;
  buildTipo(tipo); buildCat(tipo,cat); buildIcons();
  document.getElementById('modal-overlay').classList.add('open');
}

function openModalFab(){
  const t=activeTab();
  if(t===1) openModal('entrada','fixo');
  else if(t===2) openModal('saida','fixo');
  else if(t===4) openModal('investimento','investimento');
  else openModal('entrada','fixo');
}

function buildTipo(tipo){
  const inv=tipo==='investimento';
  document.getElementById('m-tipo-f').style.display=inv?'none':'block';
  if(!inv) document.getElementById('m-tipo-g').innerHTML=[
    {v:'entrada',l:'↓ Entrada'},
    {v:'saida',l:'↑ Saída'}
  ].map(o=>`<div class="rbtn ${o.v===tipo?'sel':''} ${o.v==='saida'?'exp':''}" onclick="selTipo('${o.v}',this)">${o.l}</div>`).join('');
}

function buildCat(tipo,cat){
  const f=document.getElementById('m-cat-f');
  const ff=document.getElementById('m-fixo-f');
  if(tipo==='investimento'){f.style.display='none';ff.style.display='none';return;}
  f.style.display='block';
  ff.style.display='block';
  const opts=tipo==='saida'
    ? [{v:'fixo',l:'Fixa'},{v:'variavel',l:'Variável'},{v:'cartao',l:'Cartão'}]
    : [{v:'fixo',l:'Fixa'},{v:'variavel',l:'Variável'}];
  document.getElementById('m-cat-g').innerHTML=opts.map(o=>`<div class="rbtn ${o.v===cat?'sel':''} ${o.v==='saida'?'exp':''} " onclick="selCat('${o.v}',this)">${o.l}</div>`).join('');
}

function buildIcons(){
  document.getElementById('m-icons').innerHTML=ICONS.map(ic=>`<div class="iopt" onclick="selIco('${ic}',this)" style="background:${ic===selIcon?IBKG[ic]:'var(--bg-secondary)'};border-color:${ic===selIcon?ICOL[ic]:'transparent'};font-size:16px">${ic}</div>`).join('');
}

function selTipo(v,el){
  mCtx.tipo=v;
  document.querySelectorAll('#m-tipo-g .rbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  buildCat(v,mCtx.cat);
}

function selCat(v,el){
  mCtx.cat=v;
  document.querySelectorAll('#m-cat-g .rbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
}

function selIco(ic,el){
  selIcon=ic;
  document.querySelectorAll('#m-icons .iopt').forEach((d,i)=>{
    const iic=ICONS[i];
    d.style.background=iic===ic?IBKG[iic]:'var(--bg-secondary)';
    d.style.borderColor=iic===ic?ICOL[iic]:'transparent';
  });
}

function closeModal(){ document.getElementById('modal-overlay').classList.remove('open'); }
function closeOut(e){ if(e.target===document.getElementById('modal-overlay')) closeModal(); }

function saveEntry(){
  const nome=document.getElementById('m-nome').value.trim();
  const valor=parseFloat(document.getElementById('m-valor').value);
  const isFixo=document.getElementById('m-fixo').checked;
  if(!nome||!valor||valor<=0){ document.getElementById('m-nome').focus(); return; }
  const inv = mCtx.tipo==='investimento';
  const id = Date.now()+'';
  
  if(isFixo && !inv) {
    fixedEntries.push({
      id, nome, valor,
      tipo: mCtx.tipo,
      cat: mCtx.cat,
      icon: selIcon,
      createdYear: curYear,
      createdMonth: curMonth
    });
    applyFixedEntries(curYear, curMonth);
  } else {
    entries.push({
      id,
      nome, valor,
      tipo: mCtx.tipo,
      cat: mCtx.cat,
      icon: selIcon,
      ym: inv ? 'global' : ymKey(curYear,curMonth)
    });
  }
  persist();
  renderAll();
  closeModal();
}

function editEntry(id, fixedId){
  if(fixedId) {
    const fe = fixedEntries.find(f => f.id === fixedId);
    if(!fe) return;
    const newVal = prompt('Novo valor para ' + fe.nome + ' (R$):', fe.valor);
    if(newVal && !isNaN(parseFloat(newVal)) && parseFloat(newVal) > 0) {
      fe.valor = parseFloat(newVal);
      entries.forEach(e => {
        if(e.fixedId === fixedId && e.ym === ymKey(curYear, curMonth)) {
          e.valor = fe.valor;
        }
      });
      persist();
      renderAll();
    }
  } else {
    del(id);
  }
}

function del(id){
  if(confirm('Remover este lançamento?')){
    entries = entries.filter(e=>e.id!==id);
    persist();
    renderAll();
  }
}

// ===== INIT =====
updateHeader();
renderAll();


// ===== CALCULO DE DIAS UTEIS =====
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function isBrazilianHoliday(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const fixedHolidays = [[1,1],[4,21],[5,1],[9,7],[10,12],[11,2],[11,20],[12,25]];
  for(let h of fixedHolidays) {
    if(h[0] === m && h[1] === d) return true;
  }
  const easter = getEasterDate(y);
  const easterTime = easter.getTime();
  const currentTime = new Date(y, m - 1, d).getTime();
  const daysDiff = Math.round((currentTime - easterTime) / (1000 * 60 * 60 * 24));
  if(daysDiff === -2 || daysDiff === 60 || daysDiff === -47) return true;
  return false;
}

function countBusinessDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  while(current <= endDate) {
    const dayOfWeek = current.getDay();
    if(dayOfWeek !== 0 && dayOfWeek !== 6 && !isBrazilianHoliday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
