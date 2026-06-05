# 💰 Minha Grana — App de Finanças Pessoais

PWA (Progressive Web App) de controle financeiro pessoal. Roda 100% no iPhone via Safari, sem precisar da App Store. Todos os dados ficam **localmente no seu celular** — sem servidor, sem nuvem.

---

## 📱 Como usar no iPhone

### Opção 1 — GitHub Pages (Recomendado)
1. Crie um repositório no GitHub (ex: `minha-grana`)
2. Faça upload de todos os arquivos desta pasta
3. Vá em **Settings → Pages → Source: main branch / root**
4. Seu app vai estar em `https://SEU_USUARIO.github.io/minha-grana`
5. Abra essa URL no **Safari** do iPhone
6. Toque em **Compartilhar (⬆)** → **"Adicionar à Tela Início"**
7. Pronto! O app abre como app nativo, sem barra do Safari

### Opção 2 — Rodar local (para desenvolvimento)
```bash
# Instale um servidor simples
npx serve .
# ou
python3 -m http.server 8080
```
Abra `http://localhost:8080` no navegador.

---

## 🚀 Funcionalidades

### 💵 Entradas
- Entradas fixas (salário, aluguel recebido)
- Entradas variáveis (freelance, outros)
- Filtro por tipo

### 💸 Saídas
- Contas fixas (aluguel, plano de saúde)
- Gastos variáveis (supermercado, lazer)
- Cartão de crédito — separado
- Filtro por categoria

### 📈 Investimentos
**Renda Fixa (com simulação inteligente):**
- CDI/CDB — cálculo por % do CDI
- Poupança
- Tesouro Selic
- Tesouro IPCA+

**Renda Variável:**
- Ações
- FIIs
- Criptomoedas

**Simulador de Projeção:**
- Cálculo por **dias úteis** (como os bancos)
- Considera finais de semana e **feriados nacionais brasileiros**
- Projeção para 30, 60, 90 dias, 6 meses ou 1 ano
- Gráfico de evolução
- Taxa CDI estimada: 12.65% a.a.
- Taxa Selic estimada: 13.25% a.a.
- Poupança: 7.79% a.a.

### 📅 Controle Anual
- Gráfico de entradas vs saídas por mês
- Saldo mensal de cada mês do ano
- Navegação entre anos

---

## 🗓️ Feriados considerados no cálculo
O app já tem os feriados nacionais brasileiros embutidos, calculados automaticamente para qualquer ano:
- Confraternização Universal (01/01)
- Carnaval (Segunda e Terça)
- Sexta-feira Santa
- Páscoa
- Tiradentes (21/04)
- Dia do Trabalho (01/05)
- Corpus Christi
- Independência (07/09)
- Nossa Senhora Aparecida (12/10)
- Finados (02/11)
- Proclamação da República (15/11)
- Natal (25/12)

---

## 📂 Estrutura de arquivos
```
├── index.html      # Estrutura do app
├── style.css       # Estilos (tema escuro)
├── app.js          # Toda a lógica
├── manifest.json   # Config PWA
├── sw.js           # Service Worker (offline)
├── icon-192.png    # Ícone para iPhone
└── icon-512.png    # Ícone maior
```

---

## 🔒 Privacidade
Todos os dados são salvos no `localStorage` do navegador do seu iPhone. Nada sai do dispositivo.

---

## 🛠️ Personalizar taxas
No arquivo `app.js`, procure por `CDI_RATE`, `SELIC_RATE` e `SAVINGS_RATE` e ajuste conforme as taxas atuais do Banco Central.

```js
const CDI_RATE = 12.65;   // % a.a.
const SELIC_RATE = 13.25; // % a.a.
const SAVINGS_RATE = 7.79; // % a.a.
```
