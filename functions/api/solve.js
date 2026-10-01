export async function onRequestPost(context) {
  // Cloudflare Pages Function: POST /api/solve
  // 若有綁定 Workers AI (env.AI)，則做 vision 解題；否則回 501讓前端用本機 OCR。
  try {
    const ct = context.request.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return Response.json({ error: 'need multipart' }, { status: 400 });
    }
    const fd = await context.request.formData();
    const text = (fd.get('text') || '').toString().slice(0, 2000);
    const imgs = fd.getAll('images').filter((x) => x && typeof x.arrayBuffer === 'function');
    if (!imgs.length && !text) return Response.json({ error: 'empty' }, { status: 400 });

    if (!context.env.AI) {
      return Response.json({ error: 'AI not bound', fallback: true }, { status: 501 });
    }
    // 取首張圖轉 base64 給 vision 模型（官方格式：messages + image）
    const messages = [
      { role: 'system', content: '你是台灣高職經濟學助教，只能用繁體中文回答。' },
      {
        role: 'user',
        content:
          '請看這張經濟題目照片並詳細解題：1)詳細步驟 2)指出考CH幾什麼觀念（對照CH1-19） 3)給公式與易錯點 4)再出1題類似檢核。補充文字：' +
          text,
      },
    ];
    let out;
    // vision 用 Llama 4 Scout（原生多模態）：圖片放進 messages content blocks
    const VISION = '@cf/meta/llama-4-scout-17b-16e-instruct';
    const TEXT = '@cf/meta/llama-4-scout-17b-16e-instruct';
    if (imgs.length) {
      const ab = await imgs[0].arrayBuffer();
      const bytes = new Uint8Array(ab);
      if (bytes.length > 4 * 1024 * 1024) {
        return Response.json({ error: 'image too large, please retry after frontend compress', fallback: true }, { status: 413 });
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const dataUrl = 'data:image/jpeg;base64,' + btoa(bin);
      const task =
        '一次只解一題。若照片中有多題，只解第一題（或最清楚的一題），並在開頭列出看到的其他題號，請學生分次上傳。' +
        '若補充文字中有【學生已核對題目】，以該文字為準解題，圖片僅供對照，不可推翻核對文字。' +
        '若有補充文字，詳解必須專門開一段「針對你的補充」回應它（例如你算到哪、錯在哪、為什麼這樣想不對），不可忽略。' +
        '直接解題，絕對不要抄題、不要重貼題目文字、不要逐字抄出題幹選項（辨識文字已在前端顯示）。' +
        '若有字看不清楚，不臆測、不編造數字選項正負號；只在開頭用一句說明缺了什麼資訊。' +
        '若關鍵數字或選項看不清，不可硬給答案，改給：解題方法、公式、代入示範、易錯點，並請學生補拍清楚處。' +
        '再解題：1)詳細步驟 2)考CH幾什麼觀念（對照CH1-19） 3)公式與易錯點。絕對不要出類似題、檢核題、練習題。' +
        '全篇只准繁體中文，禁簡體。公式一律用純文字單行，例如 GDP = C + I + G + (X - M)，Ed = |需求量變動% / 價格變動%|，絕對值直接用 | |，不要用 left right，絕對不要用 LaTeX、不要用 $ 包公式、不要用反斜線、不要用 space 指令。' +
        '補充文字：' +
        text;
      out = await context.env.AI.run(VISION, {
        messages: [
          { role: 'system', content: '你是台灣高職經濟學助教。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文，出現簡體字即為錯誤。看得到使用者提供的圖片。' },
          {
            role: 'user',
            content: [
              { type: 'text', text: task },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1024,
      });
    } else {
      out = await context.env.AI.run(TEXT, { prompt: messages[1].content });
    }
    let raw = out?.response || out?.result?.response || JSON.stringify(out).slice(0, 4000);
    // 去 LaTeX 殘留斜線：\( \) \[ \] \times \div \cdot \frac 等轉純文字
    const answer = raw
      .replace(/\\\(/g, '')
      .replace(/\\\)/g, '')
      .replace(/\\\[/g, '')
      .replace(/\\\]/g, '')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·')
      .replace(/\\to/g, '→')
      .replace(/\\space/gi, '')
      .replace(/\\left/gi, '')
      .replace(/\\right/gi, '')
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/\\/g, '')
      .replace(/\$(?:\s*space\s*)+\$?/gi, '')
      .replace(/(?:\bspace\b\s*){2,}/gi, '')
      .replace(/\bleft\b\s*\|\s*/gi, '|')
      .replace(/\s*\|\s*\bright\b/gi, '|')
      .replace(/\$\s*\$/g, '');
    return Response.json({ answer, concepts: '由 AI 判斷，另請對照站內 CH1-19' });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
