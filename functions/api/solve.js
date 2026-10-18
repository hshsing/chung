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
      ? '你是台灣高職經濟學資深統測閱卷召集人兼嚴格審題老師。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文。對象為台灣高職生（未學微積分，嚴禁使用微積分 ∫、dx、dQ、微分導函數 d/dQ、極限 lim 或求導求極值）。請針對學生反映可能算錯之處啟動「嚴格二次覆核驗算模式」，重新獨立驗算、嚴格挑錯、嚴格恪守【絕對基準獨立判定原則】與【高職程度嚴禁微積分鐵則】。'
      : '你是台灣高職經濟學助教。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文。對象為台灣高職生（未學微積分，嚴禁使用微積分 ∫、dx、dQ、微分導函數 d/dQ、極限 lim 或求導求極值）。解題時嚴格遵守【絕對基準獨立判定原則】與【高職程度嚴禁微積分鐵則】。';

    const benchmarkPrinciple =
      '【通則一：絕對基準獨立判定原則 (Absolute Benchmark Principle)】\n' +
      '只要題目中出現兩個或多個決策變數（如：多種財貨 X 與 Y、多種生產要素 L 與 K、多個工廠、多個國家），嚴禁直接將這兩個變數互相比大小來決定「一增一減」。\n' +
      '你必須嚴格執行以下三個步驟：\n' +
      '1. 找出絕對基準線：確定該題型決策的「絕對及格線」或「均衡標準」是什麼？（例如：消費題是 MUm；生產題是 MR 或 P；建廠題是 MC）。\n' +
      '2. 各自獨立判定：必須將每一個變數「分別且獨立地」去跟這條基準線做比較。\n' +
      '   - 只要 A 大於擴張標準，就是「增加 A」。\n' +
      '   - 只要 B 大於擴張標準，就是「增加 B」。\n' +
      '   - 絕對不能因為「A 的效益小於 B」，就推論為「減少 A」。\n' +
      '3. 拒絕零和腦補：除非題目明確註明「預算已完全耗盡」或「總資源固定不變」，否則只要所有變數都符合擴張標準，唯一正確的推論就是「同時增加所有變數」。\n\n';

    const noCalculusPrinciple =
      '【通則二：高職程度嚴禁微積分鐵則 (No Calculus Principle)】\n' +
      '★ 鐵律：解題對象為「台灣高職商管群學生」，高職課綱完全沒有微積分！全篇嚴禁使用大學微積分概念解題：\n' +
      '1. 【符號禁令】：絕對禁止出現積分符號 ∫、\\int、dx、dQ、積分常數 C，嚴禁使用微分導函數 d/dQ、dTU/dQ、一階微分求導、極限 lim！\n' +
      '2. 【邊際定義】：高職經濟學之邊際（MU、MP、MC、MR）純粹是「每增加一單位所帶來的增量」，即 ΔTU/ΔQ、ΔTP/ΔL、ΔTC/ΔQ、ΔTR/ΔQ（離散差分除法），嚴禁寫成導函數求導！\n' +
      '3. 【總效用 TU 與邊際效用 MU 關係】：\n' +
      '   - 觀念秒殺法：嚴格運用「當 MU = 0（或需求價格 P = 0）時，總效用 TU 達到最大值（飽和點）；當 MU > 0 時，TU 隨消費量增加；當 MU < 0 時，TU 隨消費量減少」之高職經濟課本觀念直接判定大小與飽和點，切勿微積分！\n' +
      '   - 數值計算：若題目要求計算總效用 TU 數值或消費者剩餘 CS，一律使用初等幾何圖形面積解題（三角形面積 = 底 × 高 ÷ 2；梯形面積 = (上底 + 下底) × 高 ÷ 2，再乘上 MUm），嚴禁積分！\n' +
      '4. 【廠商極大化】：追求利潤最大或最適產量時，一律使用代數條件 MR = MC 與幾何圖形分析（或二次函數頂點坐標），絕對禁止對利潤函數進行一階微分令其等於 0！\n\n';

    const formatSpec =
      '【詳解輸出格式規範（依四個解題步驟關卡循序輸出）】\n' +
      '請嚴格依照以下四個步驟關卡輸出，協助學生循序漸進理解，不可省略任何一個步驟標題：\n\n' +
      '【考點核心】 (一句話點出這題在考什麼，包含對應CH1-19章節與觀念)\n\n' +
      '【步驟一：審題與已知梳理】\n' +
      '已知條件梳理：(列出題目給的重要數據、已知變數與限制前提)\n' +
      '思考引導：(一句話引導學生解題的切入角度，例如「先確認題目是問哪種彈性公式」或「先找出絕對基準線」)\n\n' +
      '【步驟二：核心公式與觀念鐵則】\n' +
      '核心公式/鐵則：(列出解題公式或依據，遇多變數決策題型務必標示【絕對基準獨立判定原則】；若涉及效用/極值援引【高職程度嚴禁微積分鐵則】)\n' +
      '觀念確認題：\n' +
      '題目：(出一題與本步驟公式/觀念最相關的簡短單選確認題，供學生確認是否理解)\n' +
      '選項：A. (選項1) | B. (選項2) | C. (選項3)\n' +
      '解答：[A/B/C] (附一句解析理由)\n\n' +
      '【步驟三：數值代入與逐步推演】\n' +
      '推演過程：(詳細、不跳步的代入計算與推導步驟，每一步計算清楚，嚴禁寫任何微積分符號)\n\n' +
      '【步驟四：最終答案與選項陷阱分析】\n' +
      '【正確答案】 (填入選項或最終數值)\n' +
      '選項/陷阱分析：(若為選擇題，說明其他選項為何錯誤；若為計算題，點出高職統測學生最容易算錯的陷阱)\n\n';

    const verifyInstruction = verify
      ? '【重要指令：學生反映先前解答可能存在計算或觀念誤差，請啟動嚴格二次覆核驗算模式！】\n' +
        '請不要盲從先前推導，徹底重新從題目條件獨立驗算：\n' +
        '1. 逐一核對題目中每個關鍵數字、單位、公式方向與正負號（如：需求價格彈性 Ed 依台灣高職慣例取絕對值為正數；弧彈性分母務必使用兩點平均值而非單點）。\n' +
        '2. 嚴格排查多變數決策零和陷阱：遇多變數決策（如 X與Y、L與K、多工廠），嚴格執行【絕對基準獨立判定原則】，嚴禁直接將兩變數互比大小決定一增一減！須先找絕對及格線各自獨立判定，除非題目明確註明預算已完全耗盡，否則絕不可腦補零和推論。\n' +
        '3. 嚴格排查題意陷阱（如：線上點移動之需求量變動 vs. 整條曲線位移之需求變動、名目 vs. 實質購買力、短期停業點 P=AVC vs. 損益兩平點 P=AC、邊際消費傾向 MPC+MPS=1）。\n' +
        '4. 嚴格排查超綱微積分：高職生不會微積分，嚴禁使用積分 ∫、dx、dQ、微分導函數 d/dQ 或極限 lim。若發現原解用了微積分，務必改以「MU=0 飽和點觀念」或「初等幾何梯形/三角形面積公式」重新推導。\n' +
        '5. 詳列完整代入公式與計算算式，不可跳步。\n' +
        '6. 請在輸出最上方加註【🛡️ 覆核驗算結論】說明原本是否有誤、最終確定答案與關鍵核算依據，接著嚴格依據【詳解輸出格式規範】依序輸出。\n\n'
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
        benchmarkPrinciple +
        noCalculusPrinciple +
        formatSpec +
        '解題要求：\n' +
        '1. 一次只解一題。若照片中有多題，只解第一題（或最清楚的一題），並在開頭列出看到的其他題號，請學生分次上傳。\n' +
        '2. 若補充文字中有【學生已核對題目】，以該文字為準解題，圖片僅供對照，不可推翻核對文字。\n' +
        '3. 若有補充文字，在【解題步驟】之推演過程或開頭專門回應學生補充（例如你算到哪、錯在哪、為什麼這樣想不對），不可忽略。\n' +
        '4. 直接解題，絕對不要抄題、不要重貼題目文字、不要逐字抄出題幹選項（辨識文字已在前端顯示）。\n' +
        '5. 若有字看不清楚，不臆測、不編造數字選項正負號；只在開頭用一句說明缺了什麼資訊。\n' +
        '6. 務必在【步驟二】中提供 1 題與本題觀念相關的簡短【觀念確認題】（含選項 A/B/C 與解答），以確認學生是否理解公式核心。\n' +
        '7. 全篇只准繁體中文，絕對禁止簡體中文。\n' +
        '8. 【公式與變數符號鐵律（嚴禁底線「_」與 LaTeX）】：\n' +
        '   - 變數與公式中【絕對禁止出現任何底線符號「_」】：所有變數一律使用台灣高職教科書標準格式，例如只能寫 MUx、Px、MUm、MUy、Py、Ed、Es、Qd、Qs、P1、Q1、PL、PK、TR、TC、MR、MC、MPL 等，絕對禁止寫成 MU_x、P_x、MU_m、MU_y、P_y、E_d、E_s、Q_d、P_1 等任何帶有底線「_」的形式！步驟二的觀念確認題與選項中也一律只能寫 MUx / Px，絕不可寫 MU_x / P_x！\n' +
        '   - 公式一律用純文字單行，例如 MUx / Px = MUy / Py = MUm，GDP = C + I + G + (X - M)，Ed = |需求量變動% / 價格變動%|，Es = |(勞動供給量變動%) / (工資率變動%)|，絕對值直接用 | |。公式裡絕對不准出現 $ 和 _。\n' +
        '   - 公式嚴禁出現任何 frac、\\frac、dfrac，分數一律用 / 或 ÷，例如 [(Q2 - Q1)/Q1] / [(P2 - P1)/P1]。絕對不要用 LaTeX、不要用 $ 包公式、不要用反斜線、不要用 space 指令。\n' +
        '9. 【高職嚴禁微積分】：全篇絕對禁止出現積分符號 ∫、\\int、dx、dQ、微分導函數 d/dQ 或極限 lim！求總效用 TU 時，一律以「當 MU=0 時 TU 最大；MU>0 時 TU 增加」之高職觀念法直接判斷，或以初等幾何梯形/三角形面積公式求解，禁止寫任何微積分式。\n\n' +
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
        benchmarkPrinciple +
        noCalculusPrinciple +
        formatSpec +
        '解題要求：\n' +
        '1. 直接解題，絕對不要抄題、不要重貼題目文字；嚴格依照四個步驟關卡輸出，並在【步驟二】提供簡短【觀念確認題】。\n' +
        '2. 全篇只准繁體中文，絕對禁止簡體中文。\n' +
        '3. 【公式與變數符號鐵律（嚴禁底線「_」與 LaTeX）】：\n' +
        '   - 變數與公式中【絕對禁止出現任何底線符號「_」】：所有變數一律使用台灣高職教科書標準格式，例如只能寫 MUx、Px、MUm、MUy、Py、Ed、Es、Qd、Qs、P1、Q1、PL、PK、TR、TC、MR、MC、MPL 等，絕對禁止寫成 MU_x、P_x、MU_m、MU_y、P_y、E_d、E_s、Q_d、P_1 等任何帶有底線「_」的形式！步驟二的觀念確認題與選項中也一律只能寫 MUx / Px，絕不可寫 MU_x / P_x！\n' +
        '   - 公式一律用純文字單行，例如 MUx / Px = MUy / Py = MUm，GDP = C + I + G + (X - M)，Ed = |需求量變動% / 價格變動%|，絕對值用 | |。公式嚴禁出現任何 frac、\\frac、dfrac，分數一律用 / 或 ÷，不要用 LaTeX、不要用 $ 包公式、不要用反斜線。\n' +
        '4. 【高職嚴禁微積分】：全篇絕對禁止出現積分符號 ∫、\\int、dx、dQ、微分導函數 d/dQ 或極限 lim！求總效用 TU 時，一律以「當 MU=0 時 TU 最大；MU>0 時 TU 增加」之高職觀念法直接判斷，或以初等幾何梯形/三角形面積公式求解，禁止寫任何微積分式。\n\n' +
        (text ? ('題目文字與補充：\n' + text) : '');
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
      .replace(/\\?(?:d|t)?frac\s*\{([^}]*)\}\s*\{([^}]*)\}/gi, '($1)/($2)')
      .replace(/\\?(?:d|t)?frac\s*\{?/gi, '(')
      .replace(/\b(?:d|t)?frac\b/gi, '')
      .replace(/\\int/gi, '')
      .replace(/∫/g, '')
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/\\/g, '')
      .replace(/\$(?:\s*space\s*)+\$?/gi, '')
      .replace(/(?:\bspace\b\s*){2,}/gi, '')
      .replace(/\bleft\b\s*\|\s*/gi, '|')
      .replace(/\s*\|\s*\bright\b/gi, '|')
      .replace(/\$\s*\$/g, '')
      .replace(/\$/g, '')
      .replace(/\b([A-Za-z]{1,4})_\{?([a-zA-Z0-9]+)\}?\b/g, '$1$2')
      .replace(/(?<!_)_(?!_)/g, '');
    return Response.json({ answer, concepts: '由 AI 判斷，另請對照站內 CH1-19', verified: verify });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
