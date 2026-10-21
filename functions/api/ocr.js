async function callBackupOcr(dataUrl) {
  const engines = ['2', '1'];
  for (const eng of engines) {
    try {
      const fd = new FormData();
      fd.append('apikey', 'helloworld');
      fd.append('language', 'cht');
      fd.append('isOverlayRequired', 'false');
      fd.append('OCREngine', eng);
      fd.append('base64Image', dataUrl);
      const r = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: fd,
      });
      if (r.ok) {
        const j = await r.json();
        const parsed = j?.ParsedResults?.[0]?.ParsedText || '';
        if (parsed && parsed.trim().length > 5) {
          return parsed.trim();
        }
      }
    } catch (e) {}
  }
  return '';
}

function parseTableRowsToMarkdown(body) {
  if (!body) return '';
  body = body.replace(/\\?hline/gi, '\n');
  const rawRows = body.split(/\\\\|\n+/);
  
  const rows = [];
  for (let r of rawRows) {
    let trimmed = r.trim();
    if (!trimmed) continue;
    trimmed = trimmed.replace(/\bhline\b/gi, '').trim();
    if (!trimmed) continue;

    let cells = trimmed.split('&').map(c => {
      return c
        .replace(/\\?(?:rm|mathrm|text|mathbf|mathit)\s*\{([^}]*)\}/gi, '$1')
        .replace(/\\?small/gi, '')
        .replace(/\\?(?:rm|mathrm|text|mathbf|mathit)/gi, '')
        .replace(/[\${}]/g, '')
        .trim();
    });

    if (cells.length > 1 && cells[0] === '') {
      cells.shift();
    }
    if (cells.length > 0 && cells.some(c => c !== '')) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';
  const maxCols = Math.max(...rows.map(r => r.length));
  if (maxCols < 2) return '';

  const normalizedRows = rows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  let md = '\n\n';
  md += '| ' + normalizedRows[0].join(' | ') + ' |\n';
  md += '| ' + new Array(maxCols).fill('---').join(' | ') + ' |\n';
  for (let i = 1; i < normalizedRows.length; i++) {
    md += '| ' + normalizedRows[i].join(' | ') + ' |\n';
  }
  md += '\n';
  return md;
}

function cleanLatexNoise(s) {
  if (!s) return '';
  let out = s.toString();

  out = out.replace(/\$?(\\?begin\{(?:array|tabular)\}(?:\{[^}]*\})?[\s\S]*?\\?end\{(?:array|tabular)\})\$?/gi, (match, tableBody) => {
    let body = tableBody
      .replace(/\\?begin\{(?:array|tabular)\}(?:\{[^}]*\})?/gi, '')
      .replace(/\\?end\{(?:array|tabular)\}/gi, '')
      .trim();

    return parseTableRowsToMarkdown(body);
  });

  out = out.replace(/(?:^|\n)([ \t]*(?:\\?hline[ \t]*)?\n?(?:[ \t]*&[^\n]+&[^\n]*(?:\\\\|\\?hline)?\n?){2,})/gi, (match, tableBody) => {
    return '\n' + parseTableRowsToMarkdown(tableBody) + '\n';
  });

  out = out.replace(/\\?(?:rm|mathrm|text|mathbf|mathit)\s*\{([^}]*)\}/gi, '$1');
  out = out.replace(/\\?(?:small|large|normalsize|tiny)\b/gi, '');
  out = out.replace(/\\?(?:rm|mathrm|text|mathbf|mathit)\b/gi, '');
  out = out.replace(/\\?displaystyle\b/gi, '');
  out = out.replace(/\\?hline\b/gi, '');
  out = out.replace(/\\?cline\{[^}]*\}\s*/gi, '');

  out = out.replace(/\$(?:\s*space\s*)+\$?/gi, '');
  out = out.replace(/(?:\bspace\b\s*){2,}/gi, '');
  out = out.replace(/\$\s*([A-Za-z0-9_=\s,，+*\/()\-]+?)\s*\$/g, '$1');
  out = out.replace(/\$\s*\$/g, '');
  out = out.replace(/\\space/gi, '');
  out = out.replace(/\\left/gi, '');
  out = out.replace(/\\right/gi, '');
  out = out.replace(/\\\(/g, '');
  out = out.replace(/\\\)/g, '');
  out = out.replace(/\\\[/g, '');
  out = out.replace(/\\\]/g, '');
  out = out.replace(/\\/g, '');
  out = out.replace(/[ \t]{2,}/g, ' ');

  return out.trim();
}

function normalizeOcrText(s) {
  if (!s) return '';
  let out = s.toString();
  for (let i = 0; i < 3; i++) {
    out = out.replace(/([\u4e00-\u9fff，。！？；：「」（）、《》【】％])\s+([\u4e00-\u9fff，。！？；：「」（）、《》【】％])/g, '$1$2');
  }
  return out.replace(/(\d)\s*,\s*(\d{3})\b/g, '$1,$2');
}

export async function onRequestPost(context) {
  // POST /api/ocr：只做逐字辨識，不解題。看不清用□，不猜。
  try {
    const ct = context.request.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return Response.json({ error: 'need multipart' }, { status: 400 });
    }
    const fd = await context.request.formData();
    const imgs = fd.getAll('images').filter((x) => x && typeof x.arrayBuffer === 'function');
    if (!imgs.length) return Response.json({ error: 'empty' }, { status: 400 });
    const ab = await imgs[0].arrayBuffer();
    const bytes = new Uint8Array(ab);
    if (bytes.length > 4 * 1024 * 1024) {
      return Response.json({ error: 'image too large', fallback: true }, { status: 413 });
    }
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const dataUrl = 'data:image/jpeg;base64,' + btoa(bin);

    let raw = '';
    if (context.env.AI) {
      try {
        const out = await context.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
          messages: [
            { role: 'system', content: '你是高職經濟學繁體中文逐字抄寫員。只准繁體中文，禁簡體。全篇絕對禁止輸出任何 LaTeX 英文排版指令（嚴禁輸出 \\begin{array}、\\hline、\\small、\\rm、\\mathrm 等奇怪英文！）。若題目有表格，請直接排成簡明易讀的表格文字（使用直條線 | 分隔各欄）。若照片有多題，只抄最上面第 1 題。' },
            {
              role: 'user',
              content: [
                { type: 'text', text: '把這張題目照片中「由上往下看到的第一道題目（最上面第 1 題）」逐字抄出來（含題號、題幹、選項 A/B/C/D、數字、表格內容）。若題目包含表格，請直接用直條線 | 排成容易閱讀的純文字表格（例如：| Q | TVC | TC | ...），嚴禁輸出 \\begin{array}、\\small、\\rm 等任何 LaTeX 排版標籤！看不清的字用□，嚴禁猜。不要解題，只要抄出第一題的文字。' },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 1024,
        });
        raw = out?.response || out?.result?.response || '';
      } catch (e) {
        raw = '';
      }
    }

    // 當 Cloudflare 免費每日額度（10,000 neurons）耗盡時，自動切換至雲端備援 OCR 引擎
    if (!raw || !raw.trim()) {
      raw = await callBackupOcr(dataUrl);
    }
    if (!raw || !raw.trim()) {
      return Response.json({ error: 'ocr empty', fallback: true }, { status: 503 });
    }

    let text = normalizeOcrText(cleanLatexNoise(raw));

    // 1) 若照片頂端切到上一題殘留的半截選項（如開頭不到 300 字內無完整 (A)...(B)，緊接著出現新題號如「( A ) 12.」或換行題號），先移除頂端殘留文字
    const topOrphanRegex = /(?:(?:\d{1,3}\s*[（(\[【]\s*[A-Da-d]\s*[）)\]】])|(?:[（(\[【]\s*[A-Da-d]\s*[）)\]】]\s*\d{1,3}\s*[.、．)）])|(?:^|\n)\s*(?:(?:[（(\[【]\s*[）)\]】]\s*\d{1,3}\s*[.、．)）]?)|(?:第\s*[0-9一二三四五六七八九十]+\s*題)|(?:\d{1,3}\s*[.、．)）]\s*(?=[^\d\s]))))/;
    const firstHeader = text.match(topOrphanRegex);
    if (firstHeader && firstHeader.index > 0 && firstHeader.index < 300) {
      const prefix = text.slice(0, firstHeader.index);
      if (!/[（(\[【]\s*[Aa]\s*[）)\]】][\s\S]*?[（(\[【]\s*[Bb]\s*[）)\]】]/.test(prefix)) {
        text = text.slice(firstHeader.index).trim();
      }
    }

    // 2) 必須完整出現 (A)...(B)...(C)...(D) 四個選項後，若下方還有第 2 題題號，才截斷只保留由上往下第 1 題
    const fullOptsMatch = text.match(/(?:[（(\[【]\s*[Aa]\s*[）)\]】]|[Aa]\s*[.、．])[\s\S]*?(?:[（(\[【]\s*[Bb]\s*[）)\]】]|[Bb]\s*[.、．])[\s\S]*?(?:[（(\[【]\s*[Cc]\s*[）)\]】]|[Cc]\s*[.、．])[\s\S]*?(?:[（(\[【]\s*[Dd]\s*[）)\]】]|[Dd]\s*[.、．])\s*\S/);
    if (fullOptsMatch) {
      const afterDIdx = fullOptsMatch.index + fullOptsMatch[0].length;
      const beforeAndD = text.slice(0, afterDIdx);
      const tail = text.slice(afterDIdx);
      const nextQRegex = /(?:[。！？!?\n]\s*|\n\s*)(?:(?:\d{1,3}\s*[（(\[【][A-Da-d\s][）)\]】])|(?:[（(\[【][A-Da-d\s]*[）)\]】]\s*\d{1,3}\s*[.、．)）]?)|(?:第\s*[0-9一二三四五六七八九十]+\s*題)|(?:\d{1,3}\s*[.、．)）]\s*(?=[^\d\s])))/;
      const m = tail.match(nextQRegex);
      if (m) {
        const leadingPunct = m[0].match(/^[。！？!?]/);
        const cutOffset = m.index + (leadingPunct ? 1 : 0);
        text = (beforeAndD + tail.slice(0, cutOffset)).trim();
      }
    }
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
