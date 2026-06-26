const PROXIES = [
  { name: 'AllOrigins',     url: u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { name: 'corsproxy.io',   url: u => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  { name: 'ThingProxy',     url: u => `https://thingproxy.freeboard.io/fetch/${u}` },
  { name: 'htmldriven',     url: u => `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(u)}` },
  { name: 'crossorigin.me', url: u => `https://crossorigin.me/${u}` },
  { name: '无代理 (同源)',   url: u => u },
];

let tables = [];

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `show ${type}`;
}

function clearStatus() {
  document.getElementById('status').className = '';
}

function setProxy(state, label) {
  const dot = document.getElementById('proxy-dot');
  dot.className = 'dot ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : 'spin');
  document.getElementById('proxy-label').textContent = label;
}

async function tryProxy(proxy, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(proxy.url(url), { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchUrl() {
  const url = document.getElementById('url').value.trim();
  if (!url) { setStatus('请输入网址', 'err'); return; }

  setProxy('spin', '正在测试可用代理…');
  setStatus('并发测试所有代理，选取最快响应…');

  const race = PROXIES.map(proxy =>
    tryProxy(proxy, url).then(html => ({ html, name: proxy.name }))
  );

  try {
    const result = await Promise.any(race);
    setProxy('ok', `使用代理：${result.name}`);
    parseHtml(result.html);
  } catch {
    setProxy('err', '所有代理均失败');
    setStatus('所有代理均无法访问该页面，请手动粘贴 HTML 源码', 'err');
  }
}

function parseHtml(html) {
  if (!html?.trim()) { setStatus('内容为空', 'err'); return; }
  setStatus('解析中…');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const els = doc.querySelectorAll('table');

  tables = [...els].map((t, i) => {
    const rows = [...t.querySelectorAll('tr')]
      .map(r => [...r.querySelectorAll('th,td')].map(c => c.innerText.trim()))
      .filter(r => r.length);
    const caption = t.querySelector('caption')?.innerText.trim() || `表格 ${i + 1}`;
    return { caption, rows };
  }).filter(t => t.rows.length > 0);

  if (!tables.length) {
    clearStatus();
    document.getElementById('results').innerHTML =
      '<div class="empty-state">未在该页面找到任何 &lt;table&gt; 元素</div>';
    document.getElementById('export-all').className = '';
    return;
  }

  setStatus(`找到 ${tables.length} 个表格`, 'ok');
  document.getElementById('export-all').className = tables.length > 1 ? 'primary show' : '';
  renderAll();
}

function renderAll() {
  document.getElementById('results').innerHTML = tables.map((t, i) => `
    <div class="table-section card">
      <div class="table-header">
        <div class="table-label">
          ${esc(t.caption)}
          <span class="badge">${t.rows.length} 行</span>
        </div>
        <div class="table-actions">
          <button class="sm" onclick="exportOne(${i})">导出 xlsx</button>
          <button class="sm" onclick="copyCsv(${i})">复制 CSV</button>
        </div>
      </div>
      <div class="table-scroll">${buildTable(t.rows)}</div>
    </div>
  `).join('');
}

function buildTable(rows) {
  if (!rows.length) return '';
  const head = rows[0];
  const body = rows.slice(1);
  const ths = head.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = body.map(r =>
    '<tr>' + head.map((_, i) => `<td title="${esc(r[i] ?? '')}">${esc(r[i] ?? '')}</td>`).join('') + '</tr>'
  ).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function exportOne(i) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(tables[i].rows);
  XLSX.utils.book_append_sheet(wb, ws, tables[i].caption.slice(0, 31));
  XLSX.writeFile(wb, `${tables[i].caption}.xlsx`);
}

function exportAll() {
  const wb = XLSX.utils.book_new();
  tables.forEach(t => {
    const ws = XLSX.utils.aoa_to_sheet(t.rows);
    XLSX.utils.book_append_sheet(wb, ws, t.caption.slice(0, 31));
  });
  XLSX.writeFile(wb, 'tables.xlsx');
}

function copyCsv(i) {
  const csv = tables[i].rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  navigator.clipboard.writeText(csv).then(() => setStatus('CSV 已复制到剪贴板', 'ok'));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
