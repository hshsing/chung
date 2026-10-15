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
    const verify = (fd.get('verify') || '').toString() === 'true';
    const imgs = fd.getAll('images').filter((x) => x && typeof x.arrayBuffer === 'function');
    if (!imgs.length && !text) return Response.json({ error: 'empty' }, { status: 400 });

    if (!context.env.AI) {
      return Response.json({ error: 'AI not bound', fallback: true }, { status: 501 });
    }

    const sysPrompt = verify
      ? '你是台灣高職經濟學資深統測閱卷召集人兼嚴格審題老師。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文。請針對學生反映可能算錯之處啟動「嚴格二次覆核驗算模式」，重新獨立驗算、嚴格挑錯與防呆。'
      : '你是台灣高職經濟學助教。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文，出現簡體字即為錯誤。';

    const verifyInstruction = verify
      ? '【重要指令：學生反映先前解答可能存在計算或觀念誤差，請啟動嚴格二次覆核驗算模式！】' +
        '請不要盲從先前推導，徹底重新從題目條件獨立驗算：' +
        '1. 逐一核對題目中每個關鍵數字、單位、公式方向與正負號（如：需求價格彈性 Ed 依台灣高職慣例取絕對值為正數；弧彈性分母務必使用兩點平均值而非單點）。' +
        '2. 嚴格排查題意陷阱（如：線上點移動之需求量變動 vs. 整條曲線位移之需求變動、名目 vs. 實質購買力、短期停業點 P=AVC vs. 損益兩平點 P=AC、邊際消費傾向 MPC+MPS=1）。' +
        '3. 詳列完整代入公式與計算算式，不可跳步。' +
        '4. 在回答最開頭，請明確以【🛡️ 覆核驗算結論】標示：指明原本是否有誤、最終確定答案（含選項代號與數值），以及關鍵核算依據。\n\n'
      : '';

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
        verifyInstruction +
        '一次只解一題。若照片中有多題，只解第一題（或最清楚的一題），並在開頭列出看到的其他題號，請學生分次上傳。' +
        '若補充文字中有【學生已核對題目】，以該文字為準解題，圖片僅供對照，不可推翻核對文字。' +
        '若有補充文字，詳解必須專門開一段「針對你的補充」回應它（例如你算到哪、錯在哪、為什麼這樣想不對），不可忽略。' +
        '直接解題，絕對不要抄題、不要重貼題目文字、不要逐字抄出題幹選項（辨識文字已在前端顯示）。' +
        '若有字看不清楚，不臆測、不編造數字選項正負號；只在開頭用一句說明缺了什麼資訊。' +
        '若關鍵數字或選項看不清，不可硬給答案，改給：解題方法、公式、代入示範、易錯點，並請學生補拍清楚處。' +
        '再解題：1)詳細步驟 2)考CH幾什麼觀念（對照CH1-19） 3)公式與易錯點。絕對不要出類似題、檢核題、練習題。' +
        '全篇只准繁體中文，禁簡體。公式一律用純文字單行，例如 GDP = C + I + G + (X - M)，Ed = |需求量變動% / 價格變動%|，Es = |(勞動供給量變動%) / (工資率變動%)|，絕對值直接用 | |。公式裡絕對不准出現 $ 和 _（例如只能寫 Es 不准寫 E_s 或 $E_s$），不要用 left right，絕對不要用 LaTeX、不要用 $ 包公式、不要用反斜線、不要用 space 指令。' +
        '補充文字：' +
        text;
      out = await context.env.AI.run(VISION, {
        messages: [
          { role: 'system', content: sysPrompt + '看得到使用者提供的圖片。' },
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
      const promptText =
        verifyInstruction +
        '請看以下經濟題目並詳細解題：1)詳細步驟 2)指出考CH幾什麼觀念（對照CH1-19） 3)給公式與易錯點。' +
        '直接解題，絕對不要抄題、不要出類似題。全篇只准繁體中文，公式一律用純文字單行，不要用 LaTeX、不要用 $ 包公式。' +
        (text ? ('\n\n題目文字與補充：' + text) : '');
      out = await context.env.AI.run(TEXT, {
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: promptText },
        ],
        max_tokens: 1024,
      });
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
      .replace(/\$\s*\$/g, '')
      .replace(/\$/g, '')
      .replace(/_/g, '');
    return Response.json({ answer, concepts: '由 AI 判斷，另請對照站內 CH1-19', verified: verify });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
