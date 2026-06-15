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
let mCtx = {tipo:'entrada', cat:'fixo'};
let selIcon = '💰';
let cMes = null, cAnual = null, cProj = null;

let entries = [];
try { entries = JSON.parse(localStorage.getItem('fin_entries')||'[]'); } catch(e){ entries = []; }

function persist(){ try{ localStorage.setItem('fin_entries', JSON.stringify(entries)); }catch(e){} }
function fmt(v){ return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtS(v){ return 'R$ '+Math.round(v).toLocaleString('pt-BR'); }
function ymKey(y,m){ return y+'-'+(m<9?'0':'')+(m+1); }
function getMes(y,m){ return entries.filter(e=>e.ym===ymKey(y,m)); }

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
      <div class="entry-item" onclick="del('${e.id}')">
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
  const meses=dias/30, t=taxa/100;
  const final=tipo==='compostos'?cap*Math.pow(1+t,meses):cap*(1+t*meses);
  const rend=final-cap;
  document.getElementById('pj-res').innerHTML=`
    <div class="pr-item"><div class="pr-lbl">Capital</div><div class="pr-val">${fmt(cap)}</div></div>
    <div class="pr-item"><div class="pr-lbl">Rendimento</div><div class="pr-val pos">+${fmt(rend)}</div></div>
    <div class="pr-item"><div class="pr-lbl">Total final</div><div class="pr-val">${fmt(final)}</div></div>`;

  const steps=Math.max(4,Math.round(meses<=3?meses*8:meses<=6?meses*4:meses*2));
  const lbls=[],data=[];
  for(let i=0;i<=steps;i++){
    const m=(meses/steps)*i;
    const v=tipo==='compostos'?cap*Math.pow(1+t,m):cap*(1+t*m);
    lbls.push(i===0?'Hoje':+(m.toFixed(1))+'m');
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
  mCtx={tipo,cat};
  selIcon = tipo==='entrada'?'💰':tipo==='investimento'?'🏦':'📄';
  document.getElementById('modal-ttl').textContent = tipo==='entrada'?'Adicionar entrada':tipo==='investimento'?'Adicionar investimento':'Adicionar saída';
  document.getElementById('m-nome').value='';
  document.getElementById('m-valor').value='';
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
  if(tipo==='investimento'){f.style.display='none';return;}
  f.style.display='block';
  const opts=tipo==='saida'
    ? [{v:'fixo',l:'Fixa'},{v:'variavel',l:'Variável'},{v:'cartao',l:'Cartão'}]
    : [{v:'fixo',l:'Fixa'},{v:'variavel',l:'Variável'}];
  document.getElementById('m-cat-g').innerHTML=opts.map(o=>`<div class="rbtn ${o.v===cat?'sel':''}" onclick="selCat('${o.v}',this)">${o.l}</div>`).join('');
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
  if(!nome||!valor||valor<=0){ document.getElementById('m-nome').focus(); return; }
  const inv = mCtx.tipo==='investimento';
  entries.push({
    id: Date.now()+'',
    nome, valor,
    tipo: mCtx.tipo,
    cat: mCtx.cat,
    icon: selIcon,
    ym: inv ? 'global' : ymKey(curYear,curMonth)
  });
  persist();
  renderAll();
  closeModal();
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
