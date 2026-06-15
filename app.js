// app.js - VERSÃO ATUALIZADA com sistema de recorrentes

// ---- STATE ----
const STATE = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  projDays: 30,
  projChartInstance: null,
  dashPieInstance: null,
  investPieInstance: null,
  annualBarInstance: null,
  confirmCallback: null,
  editingIncome: null,
  editingExpense: null,
  editingInvestment: null,
  editingRecurring: null,
};

// ---- STORAGE ----
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  getAll() {
    return {
      incomes: DB.get('mgrana_incomes'),
      expenses: DB.get('mgrana_expenses'),
      investments: DB.get('mgrana_investments'),
      recurring: DB.get('mgrana_recurring'),
      overrides: DB.get('mgrana_overrides'), // sobrescritas mensais
    };
  }
};

// ---- UTILS ----
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmt(val) {
  return 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function monthKey(y, m) { return `${y}-${String(m+1).padStart(2,'0')}`; }

function isCurrentMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CAT_ICONS = {
  salary: '💰', freelance: '💻', rent: '🏠', investment: '📈', other: '📦',
  housing: '🏠', food: '🍽️', transport: '🚗', health: '🏥', education: '📚',
  leisure: '🎮', utilities: '⚡', clothing: '👕',
  cdi: '🏦', savings: '🐷', selic: '📊', ipca: '📉', stocks: '📈', fiis: '🏢', crypto: '₿', fixed: '💵',
};

// ============================================================
// SISTEMA DE TRANSAÇÕES RECORRENTES
// ============================================================

// Gerar transações para um mês específico baseado nas regras recorrentes
function generateRecurringTransactions(year, month) {
  const recurring = DB.get('mgrana_recurring');
  const overrides = DB.get('mgrana_overrides');
  const monthStr = monthKey(year, month);
  
  const generated = {
    incomes: [],
    expenses: []
  };
  
  recurring.forEach(rule => {
    if (!rule.active) return;
    
    // Verificar se a regra já expirou
    if (rule.endDate) {
      const end = new Date(rule.endDate + 'T00:00:00');
      const current = new Date(year, month, 1);
      if (current > end) return;
    }
    
    // Verificar se começou
    if (rule.startDate) {
      const start = new Date(rule.startDate + 'T00:00:00');
      const current = new Date(year, month, 1);
      if (current < start) return;
    }
    
    // Verificar se há sobrescrita para este mês
    const overrideKey = `${rule.id}_${monthStr}`;
    const override = overrides.find(o => o.key === overrideKey);
    const amount = override ? override.amount : rule.amount;
    const active = override ? override.active !== false : true;
    
    if (!active) return;
    
    const transaction = {
      id: `recurring_${rule.id}_${monthStr}`,
      description: rule.description,
      amount: amount,
      date: `${year}-${String(month+1).padStart(2,'0')}-${String(rule.day).padStart(2,'0')}`,
      category: rule.category,
      recurringId: rule.id,
      isRecurring: true,
      overridden: !!override
    };
    
    if (rule.type === 'income') {
      transaction.incomeType = rule.incomeType || 'fixed';
      generated.incomes.push(transaction);
    } else {
      transaction.expType = rule.expenseType || 'fixed';
      generated.expenses.push(transaction);
    }
  });
  
  return generated;
}

// Mesclar transações manuais com as recorrentes
function getMergedTransactions(year, month) {
  const manualIncomes = DB.get('mgrana_incomes');
  const manualExpenses = DB.get('mgrana_expenses');
  const recurring = generateRecurringTransactions(year, month);
  
  // Filtrar manuais que não são do mês atual (já que recorrentes são geradas)
  const monthManualIncomes = manualIncomes.filter(i => isCurrentMonth(i.date, year, month) && !i.recurringId);
  const monthManualExpenses = manualExpenses.filter(e => isCurrentMonth(e.date, year, month) && !e.recurringId);
  
  return {
    incomes: [...recurring.incomes, ...monthManualIncomes],
    expenses: [...recurring.expenses, ...monthManualExpenses]
  };
}

// Aplicar sobrescrita a uma regra recorrente
function overrideRecurring(ruleId, year, month, newAmount, active = true) {
  const overrides = DB.get('mgrana_overrides');
  const monthStr = monthKey(year, month);
  const key = `${ruleId}_${monthStr}`;
  
  const existingIndex = overrides.findIndex(o => o.key === key);
  const override = { key, ruleId, year, month, amount: newAmount, active, updatedAt: new Date().toISOString() };
  
  if (existingIndex >= 0) {
    overrides[existingIndex] = override;
  } else {
    overrides.push(override);
  }
  
  DB.set('mgrana_overrides', overrides);
}

// Remover sobrescrita
function removeOverride(ruleId, year, month) {
  const overrides = DB.get('mgrana_overrides');
  const monthStr = monthKey(year, month);
  const key = `${ruleId}_${monthStr}`;
  DB.set('mgrana_overrides', overrides.filter(o => o.key !== key));
}

// ============================================================
// HOLIDAYS E INVESTIMENTOS (mantido igual)
// ============================================================

function getBrHolidays(year) {
  const fixed = [
    `${year}-01-01`, `${year}-04-21`, `${year}-05-01`,
    `${year}-09-07`, `${year}-10-12`, `${year}-11-02`,
    `${year}-11-15`, `${year}-12-25`
  ];
  const easter = getEaster(year);
  const e = easter;
  const carnavalSeg = addDays(e, -48);
  const carnavalTer = addDays(e, -47);
  const sextaSanta = addDays(e, -2);
  const corpusChristi = addDays(e, 60);
  return new Set([...fixed,
    fmtDate(carnavalSeg), fmtDate(carnavalTer),
    fmtDate(sextaSanta), fmtDate(e), fmtDate(corpusChristi)
  ]);
}

function fmtDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function getEaster(Y) {
  const a = Y % 19, b = Math.floor(Y/100), c = Y % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4, l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31) - 1;
  const day = ((h+l-7*m+114) % 31) + 1;
  return new Date(Y, month, day);
}

function isBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const holidays = getBrHolidays(d.getFullYear());
  return !holidays.has(dateStr);
}

function getBusinessDaysInRange(startDateStr, endDateStr) {
  let count = 0;
  let cur = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const s = cur.toISOString().split('T')[0];
    if (isBusinessDay(s)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function calcYieldToday(inv) {
  if (inv.type === 'stocks' || inv.type === 'fiis' || inv.type === 'crypto') return 0;
  const rate = getAnnualRate(inv);
  const todayStr = today();
  const bdays = getBusinessDaysInRange(inv.date, todayStr);
  if (bdays <= 0) return 0;
  const dailyRate = Math.pow(1 + rate / 100, 1 / 252) - 1;
  return inv.amount * (Math.pow(1 + dailyRate, bdays) - 1);
}

function calcCurrentValue(inv) { return inv.amount + calcYieldToday(inv); }

function getAnnualRate(inv) {
  const CDI_RATE = 12.65;
  const SELIC_RATE = 13.25;
  const SAVINGS_RATE = 7.79;
  switch (inv.type) {
    case 'cdi': return (inv.cdiPct || 100) / 100 * CDI_RATE;
    case 'savings': return SAVINGS_RATE;
    case 'selic': return SELIC_RATE;
    case 'ipca': return 6.0 + (inv.rate || 6.0);
    default: return inv.rate || 12.65;
  }
}

function projectInvestment(amount, annualRate, calDays) {
  if (!amount || !annualRate || !calDays) return { bdays: 0, yield: 0, total: amount || 0, points: [] };
  const startStr = today();
  let bdays = 0;
  let cur = new Date(startStr + 'T00:00:00');
  const points = [{ day: 0, val: amount }];
  for (let i = 1; i <= calDays; i++) {
    cur.setDate(cur.getDate() + 1);
    const s = cur.toISOString().split('T')[0];
    if (isBusinessDay(s)) bdays++;
    if (i % Math.max(1, Math.floor(calDays / 20)) === 0 || i === calDays) {
      const dailyRate = Math.pow(1 + annualRate / 100, 1 / 252) - 1;
      const val = amount * Math.pow(1 + dailyRate, bdays);
      points.push({ day: i, val });
    }
  }
  const dailyRate = Math.pow(1 + annualRate / 100, 1 / 252) - 1;
  const total = amount * Math.pow(1 + dailyRate, bdays);
  const yld = total - amount;
  return { bdays, yield: yld, total, points };
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderDashboard() {
  const { incomes, expenses } = getMergedTransactions(STATE.currentYear, STATE.currentMonth);
  const totalIn = incomes.reduce((s, i) => s + i.amount, 0);
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIn - totalOut;

  document.getElementById('dashBalance').textContent = fmt(balance);
  document.getElementById('dashBalance').style.color = balance >= 0 ? '#4ade80' : '#f87171';
  document.getElementById('dashBalanceSub').textContent = `+${fmt(totalIn)} entradas · -${fmt(totalOut)} saídas`;
  document.getElementById('dashIncome').textContent = fmt(totalIn);
  document.getElementById('dashExpenses').textContent = fmt(totalOut);

  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const COLORS = ['#6366f1','#38bdf8','#f87171','#4ade80','#fbbf24','#a78bfa','#fb923c','#f472b6','#34d399'];
  const catLabels = Object.keys(catTotals);
  const catValues = catLabels.map(k => catTotals[k]);
  const catNames = {
    housing: 'Moradia', food: 'Alimentação', transport: 'Transporte',
    health: 'Saúde', education: 'Educação', leisure: 'Lazer',
    utilities: 'Contas', clothing: 'Vestuário', other: 'Outros'
  };
  renderPie('dashPieChart', 'dashPieLegend', 'dashPieInstance',
    catLabels.map(k => catNames[k] || k), catValues, COLORS);

  const recent = [
    ...incomes.map(i => ({ ...i, _type: 'income' })),
    ...expenses.map(e => ({ ...e, _type: 'expense' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const el = document.getElementById('recentTransactions');
  if (!recent.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Sem transações este mês</div></div>';
    return;
  }
  el.innerHTML = recent.map(t => {
    const isIn = t._type === 'income';
    const recurringBadge = t.isRecurring ? '<span class="tag tag-fixed" style="margin-left:6px">🔁</span>' : '';
    return `<div class="transaction-item">
      <div class="t-icon">${CAT_ICONS[t.category] || '💰'}</div>
      <div class="t-info">
        <div class="t-name">${t.description}${recurringBadge}</div>
        <div class="t-meta">${formatDatePT(t.date)}</div>
      </div>
      <div class="t-right">
        <div class="t-amount ${isIn ? 'income' : 'expense'}">${isIn ? '+' : '-'}${fmt(t.amount)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderPie(canvasId, legendId, stateKey, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (STATE[stateKey]) { STATE[stateKey].destroy(); STATE[stateKey] = null; }
  if (!values.length || values.every(v => v === 0)) {
    canvas.parentElement.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon">📊</div><div class="empty-text">Sem dados ainda</div></div>';
    return;
  }
  STATE[stateKey] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, values.length), borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)} (${((ctx.raw / values.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } } } }
  });
  const total = values.reduce((a, b) => a + b, 0);
  document.getElementById(legendId).innerHTML = labels.map((l, i) => `<div class="pie-legend-item"><div class="pie-dot" style="background:${colors[i % colors.length]}"></div><span>${l} · ${((values[i]/total)*100).toFixed(0)}%</span></div>`).join('');
}

function renderIncomes(filter = 'all') {
  const { incomes } = getMergedTransactions(STATE.currentYear, STATE.currentMonth);
  const fixed = incomes.filter(i => i.incomeType === 'fixed');
  const variable = incomes.filter(i => i.incomeType === 'variable');
  document.getElementById('fixedIncomeTotal').textContent = fmt(fixed.reduce((s,i)=>s+i.amount,0));
  document.getElementById('varIncomeTotal').textContent = fmt(variable.reduce((s,i)=>s+i.amount,0));
  let list = incomes;
  if (filter === 'fixed') list = fixed;
  else if (filter === 'variable') list = variable;
  const el = document.getElementById('incomeList');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-text">Sem entradas nesse período</div></div>';
    return;
  }
  el.innerHTML = list.sort((a,b) => new Date(b.date)-new Date(a.date)).map(i => {
    const recurringBadge = i.isRecurring ? '<span class="tag tag-fixed" style="margin-left:6px">🔁</span>' : '';
    const overrideBadge = i.overridden ? '<span class="tag tag-variable" style="margin-left:4px">✎</span>' : '';
    return `<div class="transaction-item">
      <div class="t-icon">${CAT_ICONS[i.category] || '💰'}</div>
      <div class="t-info">
        <div class="t-name">${i.description}${recurringBadge}${overrideBadge}</div>
        <div class="t-meta">${formatDatePT(i.date)} · <span class="tag tag-${i.incomeType === 'fixed' ? 'fixed' : 'variable'}">${i.incomeType === 'fixed' ? 'Fixo' : 'Variável'}</span></div>
      </div>
      <div class="t-right">
        <div class="t-amount income">+${fmt(i.amount)}</div>
        <div class="t-actions">
          ${i.isRecurring ? `<button class="t-action-btn" onclick="overrideRecurringMonth('${i.recurringId}')">📝</button>` : `<button class="t-action-btn" onclick="editIncome('${i.id}')">✏️</button>`}
          <button class="t-action-btn" onclick="deleteTransaction('${i.isRecurring ? 'recurring_instance' : 'income'}','${i.id}','${i.recurringId || ''}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderExpenses(filter = 'all') {
  const { expenses } = getMergedTransactions(STATE.currentYear, STATE.currentMonth);
  const fixed = expenses.filter(e => e.expType === 'fixed');
  const variable = expenses.filter(e => e.expType === 'variable');
  const credit = expenses.filter(e => e.expType === 'credit');
  document.getElementById('fixedExpTotal').textContent = fmt(fixed.reduce((s,e)=>s+e.amount,0));
  document.getElementById('varExpTotal').textContent = fmt(variable.reduce((s,e)=>s+e.amount,0));
  document.getElementById('creditExpTotal').textContent = fmt(credit.reduce((s,e)=>s+e.amount,0));
  let list = expenses;
  if (filter === 'fixed') list = fixed;
  else if (filter === 'variable') list = variable;
  else if (filter === 'credit') list = credit;
  const el = document.getElementById('expenseList');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-text">Sem saídas nesse período</div></div>';
    return;
  }
  el.innerHTML = list.sort((a,b) => new Date(b.date)-new Date(a.date)).map(e => {
    const tagClass = e.expType === 'fixed' ? 'tag-fixed' : e.expType === 'credit' ? 'tag-credit' : 'tag-variable';
    const tagLabel = e.expType === 'fixed' ? 'Fixo' : e.expType === 'credit' ? 'Cartão' : 'Variável';
    const recurringBadge = e.isRecurring ? '<span class="tag tag-fixed" style="margin-left:6px">🔁</span>' : '';
    const overrideBadge = e.overridden ? '<span class="tag tag-variable" style="margin-left:4px">✎</span>' : '';
    return `<div class="transaction-item">
      <div class="t-icon">${CAT_ICONS[e.category] || '📦'}</div>
      <div class="t-info">
        <div class="t-name">${e.description}${recurringBadge}${overrideBadge}</div>
        <div class="t-meta">${formatDatePT(e.date)} · <span class="tag ${tagClass}">${tagLabel}</span></div>
      </div>
      <div class="t-right">
        <div class="t-amount expense">-${fmt(e.amount)}</div>
        <div class="t-actions">
          ${e.isRecurring ? `<button class="t-action-btn" onclick="overrideRecurringMonth('${e.recurringId}')">📝</button>` : `<button class="t-action-btn" onclick="editExpense('${e.id}')">✏️</button>`}
          <button class="t-action-btn" onclick="deleteTransaction('${e.isRecurring ? 'recurring_instance' : 'expense'}','${e.id}','${e.recurringId || ''}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderRecurring() {
  const recurring = DB.get('mgrana_recurring');
  const el = document.getElementById('recurringList');
  if (!recurring.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔄</div><div class="empty-text">Nenhuma transação recorrente</div></div>';
    return;
  }
  el.innerHTML = recurring.sort((a,b) => a.day - b.day).map(rule => `
    <div class="invest-item" style="margin-bottom:8px">
      <div class="invest-item-header">
        <div class="invest-name">${CAT_ICONS[rule.category] || '🔄'} ${rule.description}</div>
        <div class="invest-type-badge" style="background:${rule.active ? 'rgba(74,222,128,0.2)' : 'rgba(100,116,139,0.2)'};color:${rule.active ? '#4ade80' : '#94a3b8'}">${rule.active ? 'Ativo' : 'Inativo'}</div>
      </div>
      <div class="invest-details">
        <div class="invest-detail">Valor<strong>${fmt(rule.amount)}</strong></div>
        <div class="invest-detail">Dia<strong>${rule.day}</strong></div>
        <div class="invest-detail">Tipo<strong>${rule.type === 'income' ? '💰 Entrada' : '💸 Saída'}</strong></div>
        <div class="invest-detail">Categoria<strong>${rule.category}</strong></div>
      </div>
      ${rule.startDate ? `<div class="invest-detail">Início<strong>${formatDatePT(rule.startDate)}</strong></div>` : ''}
      ${rule.endDate ? `<div class="invest-detail">Término<strong>${formatDatePT(rule.endDate)}</strong></div>` : ''}
      <div class="invest-actions">
        <button class="t-action-btn" onclick="editRecurring('${rule.id}')">✏️</button>
        <button class="t-action-btn" onclick="toggleRecurringActive('${rule.id}')">${rule.active ? '⏸️' : '▶️'}</button>
        <button class="t-action-btn" onclick="deleteItem('recurring','${rule.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function renderInvestments() {
  const investments = DB.get('mgrana_investments');
  let totalPrincipal = 0, totalYield = 0;
  investments.forEach(inv => { totalPrincipal += inv.amount; totalYield += calcYieldToday(inv); });
  document.getElementById('investTotal').textContent = fmt(totalPrincipal + totalYield);
  document.getElementById('investYield').textContent = '+' + fmt(totalYield);
  const el = document.getElementById('investmentList');
  if (!investments.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">Adicione seu primeiro investimento</div></div>';
    renderPie('investPieChart','investPieLegend','investPieInstance',[],[],[]);
    return;
  }
  el.innerHTML = investments.map(inv => {
    const tc = TYPE_COLORS[inv.type] || TYPE_COLORS.other;
    const currentVal = calcCurrentValue(inv);
    const yld = currentVal - inv.amount;
    const yldPct = inv.amount > 0 ? (yld / inv.amount * 100) : 0;
    const isVarIncome = inv.type === 'stocks' || inv.type === 'fiis' || inv.type === 'crypto';
    const bdays = isVarIncome ? null : getBusinessDaysInRange(inv.date, today());
    return `<div class="invest-item" style="margin-bottom:8px">
      <div class="invest-item-header"><div class="invest-name">${CAT_ICONS[inv.type] || '📦'} ${inv.name}</div><div class="invest-type-badge" style="background:${tc.bg};color:${tc.color}">${tc.label}</div></div>
      <div class="invest-details"><div class="invest-detail">Investido<strong>${fmt(inv.amount)}</strong></div><div class="invest-detail">Valor atual<strong style="color:${yld>=0?'#4ade80':'#f87171'}">${fmt(currentVal)}</strong></div><div class="invest-detail">Rendimento<strong style="color:${yld>=0?'#4ade80':'#f87171'}">${yld>=0?'+':''}${fmt(yld)} (${yldPct.toFixed(2)}%)</strong></div><div class="invest-detail">${isVarIncome ? 'Taxa manual' : 'Dias úteis'}<strong>${isVarIncome ? 'Manual' : (bdays + 'd.u.')}</strong></div></div>
      <div class="invest-actions"><button class="t-action-btn" onclick="editInvestment('${inv.id}')">✏️</button><button class="t-action-btn" onclick="deleteItem('investment','${inv.id}')">🗑️</button></div>
    </div>`;
  }).join('');
  const byType = {};
  investments.forEach(inv => { byType[inv.type] = (byType[inv.type] || 0) + calcCurrentValue(inv); });
  const types = Object.keys(byType);
  const cols = types.map(t => TYPE_COLORS[t]?.color || '#94a3b8');
  const labels = types.map(t => TYPE_COLORS[t]?.label || t);
  renderPie('investPieChart','investPieLegend','investPieInstance', labels, types.map(t => byType[t]), cols);
}

function renderProjection() {
  const amount = parseBRL(document.getElementById('projAmount').value) || (() => { const invs = DB.get('mgrana_investments').filter(i => i.type === 'cdi' || i.type === 'savings' || i.type === 'selic'); return invs.reduce((s, i) => s + calcCurrentValue(i), 0); })();
  const rate = parseFloat(document.getElementById('projRate').value) || 12.65;
  const days = STATE.projDays;
  const { bdays, yield: yld, total, points } = projectInvestment(amount, rate, days);
  document.getElementById('projWorkdays').textContent = bdays + ' dias úteis';
  document.getElementById('projYield').textContent = '+' + fmt(yld);
  document.getElementById('projTotal').textContent = fmt(total);
  if (STATE.projChartInstance) { STATE.projChartInstance.destroy(); STATE.projChartInstance = null; }
  const canvas = document.getElementById('projChart');
  if (canvas && points.length > 1) {
    STATE.projChartInstance = new Chart(canvas, {
      type: 'line', data: { labels: points.map(p => p.day + 'd'), datasets: [{ data: points.map(p => p.val), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }, scales: { x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(100,116,139,0.1)' } }, y: { ticks: { color: '#64748b', font: { size: 11 }, callback: v => 'R$' + (v/1000).toFixed(1) + 'k' }, grid: { color: 'rgba(100,116,139,0.1)' } } } }
    });
  }
}

function renderAnnual() {
  const year = STATE.currentYear;
  const monthlyIn = Array(12).fill(0);
  const monthlyOut = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    const { incomes, expenses } = getMergedTransactions(year, m);
    monthlyIn[m] = incomes.reduce((s,i)=>s+i.amount,0);
    monthlyOut[m] = expenses.reduce((s,e)=>s+e.amount,0);
  }
  const totalIn = monthlyIn.reduce((a,b)=>a+b,0);
  const totalOut = monthlyOut.reduce((a,b)=>a+b,0);
  document.getElementById('annualIncome').textContent = fmt(totalIn);
  document.getElementById('annualExpenses').textContent = fmt(totalOut);
  if (STATE.annualBarInstance) { STATE.annualBarInstance.destroy(); STATE.annualBarInstance = null; }
  const canvas = document.getElementById('annualBarChart');
  STATE.annualBarInstance = new Chart(canvas, {
    type: 'bar', data: { labels: MONTHS_PT, datasets: [{ label: 'Entradas', data: monthlyIn, backgroundColor: 'rgba(74,222,128,0.7)', borderRadius: 5 }, { label: 'Saídas', data: monthlyOut, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } }, scales: { x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } }, y: { ticks: { color: '#64748b', font: { size: 11 }, callback: v => 'R$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(100,116,139,0.1)' } } } }
  });
  const el = document.getElementById('monthlyBalanceList');
  const html = MONTHS_FULL.map((name, i) => { const bal = monthlyIn[i] - monthlyOut[i]; const hasData = monthlyIn[i] > 0 || monthlyOut[i] > 0; return hasData ? `<div class="month-balance-row" style="margin-bottom:8px"><div class="month-name">${name}</div><div class="month-balance" style="color:${bal>=0?'#4ade80':'#f87171'}">${bal>=0?'+':''}${fmt(bal)}</div></div>` : ''; }).join('');
  el.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">Sem dados para ${year}</div></div>';
}

function updateMonthLabel() {
  const label = `${MONTHS_FULL[STATE.currentMonth]} ${STATE.currentYear}`;
  const badge = document.getElementById('currentMonthLabel');
  if (badge) badge.textContent = label;
  const nameEl = document.querySelector('.header-month-name');
  const yearEl = document.querySelector('.header-month-year');
  if (nameEl) nameEl.textContent = MONTHS_FULL[STATE.currentMonth];
  if (yearEl) yearEl.textContent = STATE.currentYear;
}

function formatDatePT(dateStr) { if (!dateStr) return ''; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; }

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.editIncome = function(id) {
  const incomes = DB.get('mgrana_incomes');
  const item = incomes.find(i => i.id === id);
  if (!item) return;
  document.getElementById('incomeModalTitle').textContent = 'Editar Entrada';
  document.getElementById('incomeEditId').value = id;
  document.getElementById('incomeDesc').value = item.description;
  document.getElementById('incomeValue').value = item.amount.toFixed(2).replace('.',',');
  document.getElementById('incomeType').value = item.incomeType;
  document.getElementById('incomeDate').value = item.date;
  document.getElementById('incomeCategory').value = item.category;
  openModal('incomeModal');
};

window.editExpense = function(id) {
  const expenses = DB.get('mgrana_expenses');
  const item = expenses.find(e => e.id === id);
  if (!item) return;
  document.getElementById('expenseModalTitle').textContent = 'Editar Saída';
  document.getElementById('expenseEditId').value = id;
  document.getElementById('expenseDesc').value = item.description;
  document.getElementById('expenseValue').value = item.amount.toFixed(2).replace('.',',');
  document.getElementById('expenseType').value = item.expType;
  document.getElementById('expenseDate').value = item.date;
  document.getElementById('expenseCategory').value = item.category;
  openModal('expenseModal');
};

window.editInvestment = function(id) {
  const investments = DB.get('mgrana_investments');
  const item = investments.find(i => i.id === id);
  if (!item) return;
  document.getElementById('investmentModalTitle').textContent = 'Editar Investimento';
  document.getElementById('investEditId').value = id;
  document.getElementById('investName').value = item.name;
  document.getElementById('investType').value = item.type;
  document.getElementById('investAmount').value = item.amount.toFixed(2).replace('.',',');
  document.getElementById('investDate').value = item.date;
  document.getElementById('investRate').value = item.rate || 12.65;
  document.getElementById('investCdiPct').value = item.cdiPct || 100;
  toggleInvestRateFields(item.type);
  openModal('investmentModal');
};

window.editRecurring = function(id) {
  const recurring = DB.get('mgrana_recurring');
  const item = recurring.find(r => r.id === id);
  if (!item) return;
  document.getElementById('recurringModalTitle').textContent = 'Editar Recorrente';
  document.getElementById('recurringEditId').value = id;
  document.getElementById('recurringDesc').value = item.description;
  document.getElementById('recurringAmount').value = item.amount.toFixed(2).replace('.',',');
  document.getElementById('recurringType').value = item.type;
  document.getElementById('recurringDay').value = item.day;
  document.getElementById('recurringCategory').value = item.category;
  document.getElementById('recurringIncomeType').value = item.incomeType || 'fixed';
  document.getElementById('recurringExpenseType').value = item.expenseType || 'fixed';
  document.getElementById('recurringStartDate').value = item.startDate || '';
  document.getElementById('recurringEndDate').value = item.endDate || '';
  document.getElementById('recurringActive').checked = item.active !== false;
  toggleRecurringTypeFields(item.type);
  openModal('recurringModal');
};

window.overrideRecurringMonth = function(ruleId) {
  STATE.currentOverrideRuleId = ruleId;
  const rule = DB.get('mgrana_recurring').find(r => r.id === ruleId);
  if (!rule) return;
  const monthStr = monthKey(STATE.currentYear, STATE.currentMonth);
  const overrides = DB.get('mgrana_overrides');
  const existing = overrides.find(o => o.key === `${ruleId}_${monthStr}`);
  document.getElementById('overrideAmount').value = existing ? existing.amount.toFixed(2).replace('.',',') : rule.amount.toFixed(2).replace('.',',');
  document.getElementById('overrideActive').checked = existing ? existing.active !== false : true;
  document.getElementById('overrideRuleDesc').textContent = rule.description;
  document.getElementById('overrideMonthDisplay').textContent = `${MONTHS_FULL[STATE.currentMonth]} ${STATE.currentYear}`;
  openModal('overrideModal');
};

window.saveOverride = function() {
  const ruleId = STATE.currentOverrideRuleId;
  const amount = parseBRL(document.getElementById('overrideAmount').value);
  const active = document.getElementById('overrideActive').checked;
  if (ruleId) {
    overrideRecurring(ruleId, STATE.currentYear, STATE.currentMonth, amount, active);
    closeModal('overrideModal');
    renderAll();
  }
};

window.removeOverride = function() {
  const ruleId = STATE.currentOverrideRuleId;
  if (ruleId) {
    removeOverride(ruleId, STATE.currentYear, STATE.currentMonth);
    closeModal('overrideModal');
    renderAll();
  }
};

window.toggleRecurringActive = function(id) {
  const recurring = DB.get('mgrana_recurring');
  const item = recurring.find(r => r.id === id);
  if (item) {
    item.active = !item.active;
    DB.set('mgrana_recurring', recurring);
    renderRecurring();
    renderAll();
  }
};

window.deleteTransaction = function(type, id, recurringId) {
  if (type === 'recurring_instance') {
    STATE.confirmCallback = () => {
      overrideRecurring(recurringId, STATE.currentYear, STATE.currentMonth, 0, false);
      closeModal('confirmModal');
      renderAll();
    };
  } else {
    STATE.confirmCallback = () => {
      const key = type === 'income' ? 'mgrana_incomes' : 'mgrana_expenses';
      const items = DB.get(key);
      DB.set(key, items.filter(i => i.id !== id));
      closeModal('confirmModal');
      renderAll();
    };
  }
  openModal('confirmModal');
};

window.deleteItem = function(type, id) {
  STATE.confirmCallback = () => {
    const key = type === 'income' ? 'mgrana_incomes' :
                type === 'expense' ? 'mgrana_expenses' :
                type === 'investment' ? 'mgrana_investments' : 'mgrana_recurring';
    const items = DB.get(key);
    DB.set(key, items.filter(i => i.id !== id));
    if (type === 'recurring') {
      const overrides = DB.get('mgrana_overrides');
      DB.set('mgrana_overrides', overrides.filter(o => o.ruleId !== id));
    }
    closeModal('confirmModal');
    renderAll();
  };
  openModal('confirmModal');
};

function toggleRecurringTypeFields(type) {
  const incomeGroup = document.getElementById('recurringIncomeGroup');
  const expenseGroup = document.getElementById('recurringExpenseGroup');
  if (type === 'income') {
    if (incomeGroup) incomeGroup.style.display = 'flex';
    if (expenseGroup) expenseGroup.style.display = 'none';
  } else {
    if (incomeGroup) incomeGroup.style.display = 'none';
    if (expenseGroup) expenseGroup.style.display = 'flex';
  }
}

function toggleInvestRateFields(type) {
  const rateGroup = document.getElementById('investRateGroup');
  const cdiGroup = document.getElementById('investCdiGroup');
  if (type === 'cdi') {
    if (rateGroup) rateGroup.style.display = 'none';
    if (cdiGroup) cdiGroup.style.display = 'flex';
  } else if (type === 'stocks' || type === 'fiis' || type === 'crypto') {
    if (rateGroup) rateGroup.style.display = 'none';
    if (cdiGroup) cdiGroup.style.display = 'none';
  } else {
    if (rateGroup) rateGroup.style.display = 'flex';
    if (cdiGroup) cdiGroup.style.display = 'none';
  }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }

function navigateMonth(dir) {
  let m = STATE.currentMonth + dir, y = STATE.currentYear;
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  STATE.currentMonth = m; STATE.currentYear = y;
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderIncomes(document.querySelector('#tab-income .pill.active')?.dataset.filter || 'all');
  renderExpenses(document.querySelector('#tab-expenses .pill.active')?.dataset.filter || 'all');
  renderRecurring();
  renderInvestments();
  renderProjection();
  renderAnnual();
  updateMonthLabel();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'recurring') renderRecurring();
    });
  });

  // Filter pills
  document.querySelectorAll('#tab-income .filter-pills').forEach(container => {
    container.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderIncomes(pill.dataset.filter);
      });
    });
  });
  document.querySelectorAll('#tab-expenses .filter-pills').forEach(container => {
    container.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderExpenses(pill.dataset.filter);
      });
    });
  });

  // Add buttons
  document.getElementById('addIncomeBtn').addEventListener('click', () => {
    document.getElementById('incomeModalTitle').textContent = 'Nova Entrada';
    document.getElementById('incomeEditId').value = '';
    document.getElementById('incomeForm').reset();
    document.getElementById('incomeDate').value = today();
    openModal('incomeModal');
  });
  document.getElementById('addExpenseBtn').addEventListener('click', () => {
    document.getElementById('expenseModalTitle').textContent = 'Nova Saída';
    document.getElementById('expenseEditId').value = '';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = today();
    openModal('expenseModal');
  });
  document.getElementById('addInvestmentBtn').addEventListener('click', () => {
    document.getElementById('investmentModalTitle').textContent = 'Novo Investimento';
    document.getElementById('investEditId').value = '';
    document.getElementById('investmentForm').reset();
    document.getElementById('investDate').value = today();
    toggleInvestRateFields('cdi');
    openModal('investmentModal');
  });
  document.getElementById('addRecurringBtn').addEventListener('click', () => {
    document.getElementById('recurringModalTitle').textContent = 'Nova Recorrência';
    document.getElementById('recurringEditId').value = '';
    document.getElementById('recurringForm').reset();
    document.getElementById('recurringDay').value = '1';
    document.getElementById('recurringStartDate').value = today();
    openModal('recurringModal');
  });

  // Close modals
  ['income', 'expense', 'investment', 'recurring', 'override'].forEach(t => {
    const closeBtn = document.getElementById(`close${t.charAt(0).toUpperCase()}${t.slice(1)}`);
    const backdrop = document.getElementById(`${t}Backdrop`);
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(`${t}Modal`));
    if (backdrop) backdrop.addEventListener('click', () => closeModal(`${t}Modal`));
  });
  document.getElementById('confirmCancel').addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('confirmBackdrop').addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('confirmDelete').addEventListener('click', () => { if (STATE.confirmCallback) STATE.confirmCallback(); });

  // Navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => navigateMonth(1));

  // Forms
  document.getElementById('incomeForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('incomeEditId').value;
    const incomes = DB.get('mgrana_incomes');
    const item = { id: editId || uid(), description: document.getElementById('incomeDesc').value, amount: parseBRL(document.getElementById('incomeValue').value), incomeType: document.getElementById('incomeType').value, date: document.getElementById('incomeDate').value, category: document.getElementById('incomeCategory').value };
    if (editId) { const idx = incomes.findIndex(i => i.id === editId); if (idx !== -1) incomes[idx] = item; } else incomes.push(item);
    DB.set('mgrana_incomes', incomes);
    closeModal('incomeModal');
    renderAll();
  });
  document.getElementById('expenseForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('expenseEditId').value;
    const expenses = DB.get('mgrana_expenses');
    const item = { id: editId || uid(), description: document.getElementById('expenseDesc').value, amount: parseBRL(document.getElementById('expenseValue').value), expType: document.getElementById('expenseType').value, date: document.getElementById('expenseDate').value, category: document.getElementById('expenseCategory').value };
    if (editId) { const idx = expenses.findIndex(i => i.id === editId); if (idx !== -1) expenses[idx] = item; } else expenses.push(item);
    DB.set('mgrana_expenses', expenses);
    closeModal('expenseModal');
    renderAll();
  });
  document.getElementById('investmentForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('investEditId').value;
    const investments = DB.get('mgrana_investments');
    const type = document.getElementById('investType').value;
    const item = { id: editId || uid(), name: document.getElementById('investName').value, type, amount: parseBRL(document.getElementById('investAmount').value), date: document.getElementById('investDate').value, rate: parseFloat(document.getElementById('investRate').value) || 12.65, cdiPct: parseFloat(document.getElementById('investCdiPct').value) || 100 };
    if (editId) { const idx = investments.findIndex(i => i.id === editId); if (idx !== -1) investments[idx] = item; } else investments.push(item);
    DB.set('mgrana_investments', investments);
    closeModal('investmentModal');
    renderAll();
  });
  document.getElementById('recurringForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('recurringEditId').value;
    const recurring = DB.get('mgrana_recurring');
    const type = document.getElementById('recurringType').value;
    const item = {
      id: editId || uid(),
      description: document.getElementById('recurringDesc').value,
      amount: parseBRL(document.getElementById('recurringAmount').value),
      type: type,
      day: parseInt(document.getElementById('recurringDay').value),
      category: document.getElementById('recurringCategory').value,
      startDate: document.getElementById('recurringStartDate').value || null,
      endDate: document.getElementById('recurringEndDate').value || null,
      active: document.getElementById('recurringActive').checked !== false,
      incomeType: type === 'income' ? document.getElementById('recurringIncomeType').value : null,
      expenseType: type === 'expense' ? document.getElementById('recurringExpenseType').value : null
    };
    if (editId) { const idx = recurring.findIndex(r => r.id === editId); if (idx !== -1) recurring[idx] = item; } else recurring.push(item);
    DB.set('mgrana_recurring', recurring);
    closeModal('recurringModal');
    renderAll();
  });
  document.getElementById('recurringType').addEventListener('change', e => toggleRecurringTypeFields(e.target.value));
  document.getElementById('investType').addEventListener('change', e => toggleInvestRateFields(e.target.value));

  // Projection
  document.getElementById('projAmount').addEventListener('input', renderProjection);
  document.getElementById('projRate').addEventListener('input', renderProjection);
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.projDays = parseInt(btn.dataset.days);
      renderProjection();
    });
  });

  // Currency masking
  ['incomeValue', 'expenseValue', 'investAmount', 'projAmount', 'recurringAmount', 'overrideAmount'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      let v = this.value.replace(/\D/g,'');
      if (!v) { this.value = ''; return; }
      v = (parseInt(v) / 100).toFixed(2);
      this.value = v.replace('.', ',');
    });
  });

  renderAll();
  setInterval(() => { if (document.querySelector('#tab-investments.active')) renderInvestments(); }, 60 * 60 * 1000);
});

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
