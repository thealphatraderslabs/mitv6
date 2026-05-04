// ═══════════════════════════════════════════════════════════════
// CHART RENDERER
// ═══════════════════════════════════════════════════════════════
function renderChart(candles, stData, fvgs, swings, srLevels) {
  _lastChartState = { candles, stData, fvgs, swings, srLevels };
  const canvas = document.getElementById('priceCanvas');
  const wrap   = document.getElementById('canvasWrap');
  const dpr = window.devicePixelRatio || 1;
  const W0 = wrap.offsetWidth || 640, H0 = wrap.offsetHeight || 300;
  canvas.width = W0*dpr; canvas.height = H0*dpr;
  canvas.style.width = W0+'px'; canvas.style.height = H0+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W=W0, H=H0;
  ctx.clearRect(0,0,W,H);

  const CHART_H = Math.floor(H*0.60);
  const VOL_H   = Math.floor(H*0.12);
  const RSI_H   = Math.floor(H*0.18);
  const pad = {top:14,left:4,right:68};
  const chartTop = pad.top;
  const volTop   = chartTop + CHART_H + 2;
  const rsiTop   = volTop + VOL_H + 2;

  const DISPLAY_BARS = Math.min(80, candles.length);
  const display = candles.slice(-DISPLAY_BARS);
  const n = display.length;
  const allCandles = candles;
  const cw = (W - pad.left - pad.right) / n;
  const barW = Math.max(cw * 0.72, 1);

  const prices = display.flatMap(c => [c.high, c.low]);
  const rawMin = Math.min(...prices), rawMax = Math.max(...prices);
  const pPad = (rawMax-rawMin)*0.04;
  const minP = rawMin-pPad, maxP = rawMax+pPad;
  const pRange = maxP-minP || 1;

  const cx  = i => pad.left + i*cw + cw*0.14;
  const cxm = i => pad.left + i*cw + cw*0.14 + barW/2;
  const py  = (p,top,h) => top + h*(1-(p-minP)/pRange);

  const lastTrend = stData.trend[allCandles.length-1];
  ctx.fillStyle = lastTrend===1 ? 'rgba(0,230,118,0.025)' : 'rgba(255,68,68,0.025)';
  ctx.fillRect(pad.left, chartTop, W-pad.left-pad.right, CHART_H);

  ctx.font = '8px JetBrains Mono';
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;
  for (let i=0; i<=5; i++) {
    const y = chartTop + (CHART_H/5)*i;
    const price = maxP - (pRange/5)*i;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
    ctx.fillStyle = '#5a6470';
    ctx.fillText(fmtPrice(price), W-pad.right+3, y+3);
  }
  for (let i=0; i<n; i+=10) {
    const x = cx(i);
    ctx.strokeStyle='rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.moveTo(x,chartTop); ctx.lineTo(x,chartTop+CHART_H); ctx.stroke();
    if (display[i]) {
      ctx.fillStyle='#5a6470';
      const dt = new Date(display[i].time);
      const isDailyOrWeekly = (_lastTF === '1d' || _lastTF === '1w');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const timeLabel = isDailyOrWeekly
        ? dt.getUTCDate() + ' ' + months[dt.getUTCMonth()]
        : (dt.getUTCHours()+'').padStart(2,'0')+':'+(dt.getUTCMinutes()+'').padStart(2,'0');
      ctx.fillText(timeLabel, x - (isDailyOrWeekly ? 10 : 8), chartTop+CHART_H+10);
    }
  }

  // FVGs
  fvgs.filter(g=>!g.filled).forEach(g => {
    const gy1 = py(g.top,chartTop,CHART_H), gy2 = py(g.bottom,chartTop,CHART_H);
    ctx.fillStyle = g.type==='bull' ? 'rgba(0,230,118,0.07)' : 'rgba(255,68,68,0.07)';
    ctx.fillRect(pad.left, gy1, W-pad.left-pad.right, gy2-gy1);
  });

  // SR lines
  srLevels.slice(0,6).forEach(l => {
    const y = py(l.price, chartTop, CHART_H);
    ctx.strokeStyle = l.zone==='resistance' ? 'rgba(255,68,68,0.35)' : l.zone==='support' ? 'rgba(0,230,118,0.35)' : 'rgba(255,213,79,0.35)';
    ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
    ctx.setLineDash([]);
  });

  // SuperTrend line
  const stLineDisplay = stData.stLine.slice(-DISPLAY_BARS);
  const stTrendDisplay = stData.trend.slice(-DISPLAY_BARS);
  ctx.lineWidth=1.5;
  for (let i=1; i<n; i++) {
    if (!stLineDisplay[i]||!stLineDisplay[i-1]) continue;
    ctx.strokeStyle = stTrendDisplay[i]===1 ? 'rgba(0,230,118,0.7)' : 'rgba(255,68,68,0.7)';
    ctx.beginPath();
    ctx.moveTo(cxm(i-1), py(stLineDisplay[i-1],chartTop,CHART_H));
    ctx.lineTo(cxm(i),   py(stLineDisplay[i],  chartTop,CHART_H));
    ctx.stroke();
  }
  ctx.lineWidth=1;

  // Candles
  for (let i=0; i<n; i++) {
    const c = display[i];
    const x = cx(i);
    const o = py(c.open, chartTop, CHART_H), cl = py(c.close, chartTop, CHART_H);
    const h = py(c.high, chartTop, CHART_H), l = py(c.low, chartTop, CHART_H);
    const bull = c.close >= c.open;
    ctx.strokeStyle = bull ? '#00e676' : '#ff4444';
    ctx.fillStyle   = bull ? 'rgba(0,230,118,0.75)' : 'rgba(255,68,68,0.75)';
    ctx.beginPath(); ctx.moveTo(cxm(i),h); ctx.lineTo(cxm(i),l); ctx.stroke();
    const top=Math.min(o,cl), ht=Math.max(Math.abs(cl-o),1);
    ctx.fillRect(x, top, barW, ht);
  }

  // Swing highs/lows markers
  const { highs, lows } = swings;
  highs.forEach(sh => {
    const di = n - (allCandles.length - sh.idx);
    if (di < 0 || di >= n) return;
    const y = py(sh.price, chartTop, CHART_H);
    ctx.fillStyle = 'rgba(255,68,68,0.8)';
    ctx.font = '7px JetBrains Mono';
    ctx.fillText('H', cxm(di)-3, y-4);
  });
  lows.forEach(sl => {
    const di = n - (allCandles.length - sl.idx);
    if (di < 0 || di >= n) return;
    const y = py(sl.price, chartTop, CHART_H);
    ctx.fillStyle = 'rgba(0,230,118,0.8)';
    ctx.font = '7px JetBrains Mono';
    ctx.fillText('L', cxm(di)-3, y+9);
  });

  // Volume bars
  const vols = display.map(c => c.vol);
  const maxVol = Math.max(...vols) || 1;
  for (let i=0; i<n; i++) {
    const c = display[i];
    const vh = Math.max((c.vol/maxVol)*VOL_H*0.9, 1);
    ctx.fillStyle = c.close >= c.open ? 'rgba(0,230,118,0.4)' : 'rgba(255,68,68,0.4)';
    ctx.fillRect(cx(i), volTop + VOL_H - vh, barW, vh);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(pad.left,volTop); ctx.lineTo(W-pad.right,volTop); ctx.stroke();

  // RSI sub-panel
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(pad.left,rsiTop); ctx.lineTo(W-pad.right,rsiTop); ctx.stroke();
  const rsiArr = calcRSI(allCandles.map(c=>c.close), 14);
  const rsiDisplay = rsiArr.slice(-DISPLAY_BARS);
  const rsiY = v => rsiTop + RSI_H * (1 - (v-20)/80);
  ctx.fillStyle = 'rgba(255,68,68,0.06)';
  ctx.fillRect(pad.left, rsiY(70), W-pad.left-pad.right, rsiY(80)-rsiY(70));
  ctx.fillStyle = 'rgba(0,230,118,0.06)';
  ctx.fillRect(pad.left, rsiY(30), W-pad.left-pad.right, rsiY(20)-rsiY(30));
  ctx.strokeStyle = '#8892a0'; ctx.lineWidth=1;
  ctx.beginPath();
  for (let i=0; i<n; i++) {
    const v = Math.max(20, Math.min(80, rsiDisplay[i]||50));
    i===0 ? ctx.moveTo(cxm(i),rsiY(v)) : ctx.lineTo(cxm(i),rsiY(v));
  }
  ctx.stroke();
  ctx.fillStyle = '#5a6470'; ctx.font='7px JetBrains Mono';
  ctx.fillText('RSI', W-pad.right+3, rsiTop+6);
  ctx.fillText('70',  W-pad.right+3, rsiY(70)+3);
  ctx.fillText('30',  W-pad.right+3, rsiY(30)+3);
  if (rsiDisplay.length > 0) {
    const lastRsi = rsiDisplay[rsiDisplay.length-1] || 50;
    ctx.fillStyle = lastRsi > 70 ? '#ff4444' : lastRsi < 30 ? '#00e676' : '#8892a0';
    ctx.fillText(lastRsi.toFixed(0), W-pad.right+3, rsiY(Math.max(20,Math.min(80,lastRsi)))+3);
  }
}

// ═══════════════════════════════════════════════════════════════
// ORDER BLOCK DETECTION
// ═══════════════════════════════════════════════════════════════
function findOrderBlocks(candles, swings) {
  const obs = [];
  const { highs, lows } = swings;
  for (const sl of lows.slice(-3)) {
    const idx = sl.idx;
    if (idx < 3) continue;
    for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
      if (candles[i].close < candles[i].open) {
        obs.push({ type: 'bull', high: candles[i].high, low: candles[i].low, idx: i });
        break;
      }
    }
  }
  for (const sh of highs.slice(-3)) {
    const idx = sh.idx;
    if (idx < 3) continue;
    for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
      if (candles[i].close > candles[i].open) {
        obs.push({ type: 'bear', high: candles[i].high, low: candles[i].low, idx: i });
        break;
      }
    }
  }
  return obs;
}

// ═══════════════════════════════════════════════════════════════
// LIQUIDITY ENGINE — INSTITUTIONAL SWEEP DETECTION
// ═══════════════════════════════════════════════════════════════
function detectLiquidity(candles, highs, lows) {
  const n = candles.length;
  const currentPrice = candles[n-1].close;
  const tolerance = currentPrice * 0.003;

  const equalHighPairs = [];
  const equalLowPairs  = [];
  for (let i=0; i<highs.length-1; i++)
    for (let j=i+1; j<highs.length; j++)
      if (Math.abs(highs[i].price - highs[j].price) < tolerance)
        equalHighPairs.push({ price: (highs[i].price+highs[j].price)/2, idxA: highs[i].idx, idxB: highs[j].idx });
  for (let i=0; i<lows.length-1; i++)
    for (let j=i+1; j<lows.length; j++)
      if (Math.abs(lows[i].price - lows[j].price) < tolerance)
        equalLowPairs.push({ price: (lows[i].price+lows[j].price)/2, idxA: lows[i].idx, idxB: lows[j].idx });

  const liquidityPresent = equalHighPairs.length > 0 || equalLowPairs.length > 0;

  const sweeps = [];
  for (const eqH of equalHighPairs) {
    for (let i = Math.max(eqH.idxB, n-30); i < n; i++) {
      const c = candles[i];
      if (c.high > eqH.price + tolerance && c.close < eqH.price) {
        sweeps.push({ type: 'high_sweep', price: eqH.price, idx: i, candle: c });
      }
    }
  }
  for (const eqL of equalLowPairs) {
    for (let i = Math.max(eqL.idxB, n-30); i < n; i++) {
      const c = candles[i];
      if (c.low < eqL.price - tolerance && c.close > eqL.price) {
        sweeps.push({ type: 'low_sweep', price: eqL.price, idx: i, candle: c });
      }
    }
  }
  const sweepDetected = sweeps.length > 0;

  const struct = detectStructure(candles, highs, lows);
  const validSetup = sweepDetected && (struct.recentBOS_up || struct.recentBOS_down || struct.recentCHOCH_up || struct.recentCHOCH_down);

  let setupQuality = 0;
  if (liquidityPresent) setupQuality += 20;
  if (sweepDetected)    setupQuality += 40;
  if (validSetup)       setupQuality += 40;

  let reasonCode = 'NO_STRUCTURE';
  if (validSetup)                                  reasonCode = 'VALID_SETUP';
  else if (sweepDetected)                          reasonCode = 'SWEEP_NO_BOS';
  else if (liquidityPresent)                       reasonCode = 'INDUCEMENT_ONLY';
  else if (!struct.events || struct.events.length === 0) reasonCode = 'NO_STRUCTURE';
  else                                             reasonCode = 'STRUCTURE_NO_LIQUIDITY';

  return {
    equalHighPairs, equalLowPairs,
    sweeps, liquidityPresent, sweepDetected, validSetup,
    setupQuality, reasonCode,
    hasInducement: liquidityPresent,
  };
}

function renderOrderBlocks(obs, currentPrice) {
  const el = document.getElementById('ob-container');
  if (!el) return;
  if (!obs || obs.length === 0) {
    el.innerHTML = '<div class="empty-state" style="height:50px;font-size:8px">NONE DETECTED</div>';
    return;
  }
  el.innerHTML = obs.slice(-6).map(ob => {
    const dist = ((ob.high - currentPrice) / currentPrice * 100).toFixed(2);
    return `<div class="deriv-row">
      <span class="deriv-key">
        <span class="tag ${ob.type === 'bull' ? 'bull' : 'bear'}" style="margin-right:4px">${ob.type === 'bull' ? 'BULL OB' : 'BEAR OB'}</span>
        ${fmtPrice(ob.low)} – ${fmtPrice(ob.high)}
      </span>
      <span class="deriv-val ${parseFloat(dist) > 0 ? 'down' : 'up'}">${parseFloat(dist) > 0 ? '+' : ''}${dist}%</span>
    </div>`;
  }).join('');
}

function renderOISparkline(items) {
  const wrap = document.getElementById('oi-spark');
  if (!wrap || !items || items.length < 2) return;
  wrap.innerHTML = '';
  const CONTAINER_H = 36;
  const vals = items.map(x => typeof x === 'object' ? (x.val || 0) : x);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV;
  const MIN_PX = 4;
  vals.forEach((v, i) => {
    const px = range > 0
      ? MIN_PX + ((v - minV) / range) * (CONTAINER_H - MIN_PX)
      : CONTAINER_H * 0.5;
    const bar = document.createElement('div');
    const dir = i > 0 ? (vals[i] >= vals[i-1] ? 'up' : 'down') : 'up';
    bar.className = 'oi-spark-bar ' + dir;
    bar.style.height = Math.round(px) + 'px';
    bar.title = fmtCompact(v);
    wrap.appendChild(bar);
  });
}
