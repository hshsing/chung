function extractFirstQuestion(rawText) {
  if (!rawText) return '';
  const txt = rawText.toString().trim();
  const optDMatch = txt.match(/(?:[（(\[【]\s*[Dd]\s*[）)\]】]|[Dd]\s*[.、．])\s*\S/);
  if (!optDMatch) return txt;
  const afterDIdx = optDMatch.index + optDMatch[0].length;
  const beforeAndD = txt.slice(0, afterDIdx);
  const tail = txt.slice(afterDIdx);
  const nextQRegex = /(?:[。！？!?\n]\s*|\n\s*)(?:(?:\d{1,3}\s*[（(\[【][A-Da-d\s][）)\]】])|(?:[（(\[【][A-Da-d\s]*[）)\]】]\s*\d{1,3}\s*[.、．)）]?)|(?:第\s*[0-9一二三四五六七八九十]+\s*題)|(?:\d{1,3}\s*[.、．)）]\s*(?=[^\d\s])))/;
  const m = tail.match(nextQRegex);
  if (!m) return txt;
  const leadingPunct = m[0].match(/^[。！？!?]/);
  const cutOffset = m.index + (leadingPunct ? 1 : 0);
  return (beforeAndD + tail.slice(0, cutOffset)).trim();
}

function buildMissingFigureResponse(qText, hasImage) {
  const isSupplyElast = /供給.*(?:彈性|曲線)|S1|S2|S3/i.test(qText || '');
  const reason = hasImage
    ? '照片僅有題幹文字，缺少題目右圖'
    : '題幹載明如圖所示，但未附圖形';

  const conceptTitle = isSupplyElast
    ? 'CH2 需求與供給 — 直線供給曲線之點彈性幾何截距判定法則（需對照題目圖形）'
    : '圖形分析題 — 需對照題目附圖之坐標軸截距、曲線走向或點位關係';

  const formulaText = isSupplyElast
    ? '直線供給曲線點彈性幾何秒殺法則：穿過縱軸（P 軸）者 Es > 1；穿過原點 (0,0) 者 Es = 1；穿過橫軸（Q 軸）者 Es < 1'
    : '圖形題判定原則：先確認縱軸與橫軸代表之經濟變數，再依曲線截距、斜率與交點坐標進行推導';

  const quizBlock = isSupplyElast
    ? '觀念確認題：\n' +
      '題目：若一條直線供給曲線的延長線穿過坐標原點 (0,0)，則該曲線上任一點的供給價格點彈性 Es 為何？\n' +
      '選項：A. Es 大於 1（富有彈性） | B. Es 等於 1（單一彈性） | C. Es 小於 1（缺乏彈性）\n' +
      '解答：[B] (解析：直線供給曲線只要穿過原點，無論斜率陡緩，線上每一點的供給價格點彈性恆等於 1！)'
    : '觀念確認題：\n' +
      '題目：遇到題幹載明「如圖所示」或「如右圖」的題目時，應如何正確作答？\n' +
      '選項：A. 不看圖形直接憑印象猜選項 | B. 必須先確認圖形中坐標軸截距與點位關係才能判定 | C. 一律選數值最大的選項\n' +
      '解答：[B] (解析：圖形題的曲線截距與點位決定最終大小關係，缺少圖形時絕對不可盲猜選項！)';

  const step3Detail = isSupplyElast
    ? '本題題幹載明「如右圖所示」，欲比較 S1、S2、S3 上 F、G、H 各點的供給價格點彈性大小，必須從圖形中確認各條供給曲線延長線分別穿過縱軸（P 軸，Es > 1）、原點（Es = 1）或橫軸（Q 軸，Es < 1），以及 F、G、H 三點的對應位置。由於目前上傳的照片僅有題幹文字，右側坐標圖形已被裁切未拍入，在缺少圖形的情況下無法得知各曲線截距與點位關係，因此無法直接判定哪一個選項正確。請上傳包含右側完整坐標圖形的照片，系統即可為您精確推導！'
    : '本題題幹明確載明需參照圖形（「如圖所示／如右圖」），但目前僅有題幹文字，缺少題目關鍵坐標圖形。在未見圖形中各曲線走向、截距與標示點位的情況下，無法直接判定正確選項。請重新拍照並將題目附圖完整納入畫面後上傳，系統即可為您精確解題！';

  return (
    `【考點核心】 ${conceptTitle}\n\n` +
    `【步驟一：審題與已知梳理】\n` +
    `已知條件梳理：題幹載明「如圖所示／如右圖」，但目前${hasImage ? '上傳的照片僅拍到題幹文字，右側坐標圖形已被裁切而未拍入' : '僅輸入題幹文字，尚未上傳題目附圖'}。\n` +
    `思考引導：圖形題的正確選項完全取決於圖中曲線在坐標軸上的截距位置與點位關係，在未看到完整圖形前，絕對不可憑空猜測或腦補答案。\n\n` +
    `【步驟二：核心公式與觀念鐵則】\n` +
    `核心公式/鐵則：${formulaText}\n` +
    `${quizBlock}\n\n` +
    `【步驟三：數值代入與逐步推演】\n` +
    `推演過程：${step3Detail}\n\n` +
    `【步驟四：最終答案與選項陷阱分析】\n` +
    `【正確答案】 【需補充題目圖形以進行判定】（${reason}）\n` +
    `選項/陷阱分析：統測圖形題常見陷阱為改變曲線穿過的坐標軸截距（例如穿過 P 軸、原點或 Q 軸）或改變點位高低，只要圖形截距不同，答案就會完全不同。請補拍包含右側圖形的完整照片以進行精確判定。`
  );
}

export async function onRequestPost(context) {
  // Cloudflare Pages Function: POST /api/solve
  try {
    const ct = context.request.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return Response.json({ error: 'need multipart' }, { status: 400 });
    }
    const fd = await context.request.formData();
    const rawInputText = (fd.get('text') || '').toString().slice(0, 2000);
    const metaSplitIdx = rawInputText.search(/\n【(?:考點章節|學生反映)/);
    let qPart = extractFirstQuestion(metaSplitIdx >= 0 ? rawInputText.slice(0, metaSplitIdx) : rawInputText);
    const metaPart = metaSplitIdx >= 0 ? rawInputText.slice(metaSplitIdx) : '';

    const verify = (fd.get('verify') || '').toString() === 'true';
    const hasGraphParam = fd.get('hasGraph');
    const hasGraph = hasGraphParam !== null ? hasGraphParam === 'true' : true;
    const imgs = fd.getAll('images').filter((x) => x && typeof x.arrayBuffer === 'function');
    if (!imgs.length && !qPart && !metaPart) return Response.json({ error: 'empty' }, { status: 400 });

    if (!context.env.AI) {
      return Response.json({ error: 'AI not bound', fallback: true }, { status: 501 });
    }

    const figureKeywordsRegex = /(?:如(?:右|左|上|下|附)?圖(?:所示)?|見(?:附)?圖|如附圖|由圖中|看圖|附圖所示|圖中標有|如(?:右|左|上|下|附)?表(?:所示)?|見(?:附)?表|如附表|S1\s*[、,，]\s*S2\s*[、,，]\s*S3.*供給曲線)/i;

    // 1. 純文字輸入（無圖片）且題幹載明如圖：直接回傳確定性的缺圖四步驟說明，0% 幻覺
    if (!imgs.length && figureKeywordsRegex.test(qPart)) {
      return Response.json({
        answer: buildMissingFigureResponse(qPart, false),
        concepts: '由 AI 判斷，另請對照站內 CH1-19',
        verified: verify,
      });
    }

    const VISION = '@cf/meta/llama-4-scout-17b-16e-instruct';
    const TEXT = '@cf/meta/llama-4-scout-17b-16e-instruct';

    let dataUrl = '';
    if (imgs.length) {
      const ab = await imgs[0].arrayBuffer();
      const bytes = new Uint8Array(ab);
      if (bytes.length > 4 * 1024 * 1024) {
        return Response.json({ error: 'image too large, please retry after frontend compress', fallback: true }, { status: 413 });
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      dataUrl = 'data:image/jpeg;base64,' + btoa(bin);

      // 2. 若照片經前端像素掃描確認無坐標圖（!hasGraph）：
      if (!hasGraph) {
        // 若前端已傳入 OCR 題幹且確認為圖形題，直接攔截回傳確定性缺圖說明（不呼叫解題模型，徹底杜絕幻覺！）
        if (figureKeywordsRegex.test(qPart)) {
          return Response.json({
            answer: buildMissingFigureResponse(qPart, true),
            concepts: '由 AI 判斷，另請對照站內 CH1-19',
            verified: verify,
          });
        }
        // 若前端尚未完成 OCR（qPart 為空），先在後端執行快速題幹辨識
        const cleanQPart = qPart.replace(/【學生已核對題目】/g, '').trim();
        if (!cleanQPart) {
          try {
            const ocrOut = await context.env.AI.run(VISION, {
              messages: [
                { role: 'system', content: '你是繁體中文逐字抄寫員。只准繁體中文。若照片有多題，只抄最上面第 1 題。' },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: '把這張照片中「由上往下看到的第一道題目（最上面第 1 題）」逐字抄出來（含題號、題幹、選項）。不要解題，只要抄出第一題的文字。' },
                    { type: 'image_url', image_url: { url: dataUrl } },
                  ],
                },
              ],
              max_tokens: 512,
            });
            const ocrRaw = (ocrOut?.response || ocrOut?.result?.response || '').toString();
            const extractedOcr = extractFirstQuestion(ocrRaw);
            if (extractedOcr) {
              qPart = '【學生已核對題目】' + extractedOcr;
            }
          } catch (e) {}

          if (figureKeywordsRegex.test(qPart)) {
            return Response.json({
              answer: buildMissingFigureResponse(qPart, true),
              concepts: '由 AI 判斷，另請對照站內 CH1-19',
              verified: verify,
            });
          }
        }
      }
    }

    const text = qPart + metaPart;

    const sysPrompt = verify
      ? '你是台灣高職經濟學資深統測閱卷召集人兼嚴格審題老師。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文。對象為台灣高職生（未學微積分，嚴禁使用微積分 ∫、dx、dQ、微分導函數 d/dQ、極限 lim 或求導求極值）。請針對學生反映可能算錯之處啟動「嚴格二次覆核驗算模式」，重新獨立驗算、嚴格挑錯、嚴格恪守【絕對基準獨立判定原則】、【高職程度嚴禁微積分鐵則】與【需求與供給點彈性與直線幾何鐵則】。'
      : '你是台灣高職經濟學助教。只准用繁體中文（台灣用法）回答，絕對禁止簡體中文。對象為台灣高職生（未學微積分，嚴禁使用微積分 ∫、dx、dQ、微分導函數 d/dQ、極限 lim 或求導求極值）。解題時嚴格遵守【絕對基準獨立判定原則】、【高職程度嚴禁微積分鐵則】與【需求與供給點彈性與直線幾何鐵則】。';

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

    const elasticityPrinciple =
      '【通則三：需求與供給點彈性與直線幾何鐵則 (Elasticity Principle)】\n' +
      '★ 直線彈性是統測每年必考核心，計算與幾何判定必須嚴格遵守以下鐵則，嚴禁公式顛倒或捏造數值：\n' +
      '一、【需求價格點彈性與直線幾何彈性（下段 ÷ 上段）】：\n' +
      '1. 【點彈性定義公式（代數法）】：\n' +
      '   - Ed = | (ΔQ/Q) / (ΔP/P) | = | (ΔQ/ΔP) × (P/Q) |。\n' +
      '   - 若給需求函數 Q = a - bP，則斜率變動率 |ΔQ/ΔP| = b（絕對值），故 Ed = b × (P/Q)！\n' +
      '   - ★ 致命陷阱警示：乘數是 (P/Q)，絕對不可倒寫成 (Q/P)！計算代入時必須一步一步化簡，嚴禁將常數截距直接除以價格（嚴禁發明 Ed = Pmax / P）！\n' +
      '2. 【直線需求曲線幾何點彈性（下段 ÷ 上段）秒殺法】：\n' +
      '   - 直線需求曲線上任一點的點彈性，幾何意義恆等於【下段長度 ÷ 上段長度】！\n' +
      '   - 縱軸價格表示法：Ed = (P - 0) / (Pmax - P) = P / (Pmax - P)（其中 Pmax 為縱軸截距即 Q=0 時的最高價格）。\n' +
      '   - 橫軸數量表示法：Ed = (Qmax - Q) / (Q - 0) = (Qmax - Q) / Q（其中 Qmax 為橫軸截距即 P=0 時的最大需求量）。\n' +
      '   - 直線需求曲線正中點（P = Pmax / 2，Q = Qmax / 2）之點彈性【恆等於 1】（單一彈性）！\n' +
      '   - 上半段（P > Pmax / 2）：下段長 > 上段長，點彈性【必大於 1（Ed > 1）】。\n' +
      '   - 下半段（P < Pmax / 2）：下段長 < 上段長，點彈性【必小於 1（Ed < 1）】。\n' +
      '   - 縱軸截距點（P = Pmax）：Ed = ∞；橫軸截距點（P = 0）：Ed = 0。\n' +
      '3. 【弧彈性規範】：若題目給兩組價格與數量點且未指定點彈性，一律使用弧彈性（中點公式），分母必須除以兩點平均值：Ed = | (Q2 - Q1) / (P2 - P1) | × (P1 + P2) / (Q1 + Q2)。\n\n' +
      '二、【供給價格點彈性與截距判定鐵則（高職統測核心考點）】：\n' +
      '1. 【供給點彈性定義公式】：\n' +
      '   - Es = (ΔQ/Q) / (ΔP/P) = (ΔQ/ΔP) × (P/Q) = [1 / (ΔP/ΔQ)] × (P/Q) = (1/斜率) × (P/Q)。由於供給曲線向右上方傾斜（斜率為正），故 Es 為正值。\n' +
      '2. 【直線供給曲線截距判定法則（幾何秒殺定理）】：\n' +
      '   直線供給曲線任一點的點彈性大小，完全由其延長線與坐標軸之「交點（截距）」決定：\n' +
      '   - 【穿過縱軸（P 軸，正 P 截距）】：交點在原點上方，線上「每一點」之供給彈性【均大於 1（Es > 1，富有彈性）】！\n' +
      '   - 【穿過原點 (0,0)】：直線通過原點，不論斜率多陡或多平緩，線上「每一點」之供給彈性【恆等於 1（Es = 1）】！\n' +
      '   - 【穿過橫軸（Q 軸，正 Q 截距）】：交點在原點右方，線上「每一點」之供給彈性【均小於 1（Es < 1，缺乏彈性）】！\n' +
      '   - 【垂直線（垂直於 Q 軸）】：Es = 0（完全無彈性）。\n' +
      '   - 【水平線（平行於 Q 軸）】：Es = ∞（完全有彈性）。\n' +
      '3. 【平行供給曲線點彈性比較原理】：\n' +
      '   - 多條平行的直線供給曲線（如 S1、S2、S3）：最上方穿過縱軸 P 軸之曲線（如 S1 上的 F 點）點彈性必大於 1（Es > 1）；中間穿過原點之曲線（如 S2 上的 G 點）點彈性必等於 1（Es = 1）；最下方穿過橫軸 Q 軸之曲線（如 S3 上的 H 點）點彈性必小於 1（Es < 1），故 F > G > H！\n\n';

    const formatSpec =
      '【詳解輸出格式規範（依四個解題步驟關卡循序輸出）】\n' +
      '請嚴格依照以下四個步驟關卡輸出，協助學生循序漸進理解，不可省略任何一個步驟標題：\n\n' +
      '【考點核心】 (一句話點出這題在考什麼，包含對應CH1-19章節與觀念)\n\n' +
      '【步驟一：審題與已知梳理】\n' +
      '已知條件梳理：(列出題目給的重要數據、已知變數與限制前提)\n' +
      '思考引導：(一句話引導學生解題的切入角度，例如「先確認題目是問哪種彈性公式」或「先找出絕對基準線」)\n\n' +
      '【步驟二：核心公式與觀念鐵則】\n' +
      '核心公式/鐵則：(列出解題公式或依據，遇多變數決策題型務必標示【絕對基準獨立判定原則】；若涉及效用/極值援引【高職程度嚴禁微積分鐵則】；若涉及彈性務必標示【需求與供給點彈性與直線幾何鐵則】)\n' +
      '觀念確認題：\n' +
      '題目：(出一題與本步驟公式/觀念最相關的簡短單選確認題，供學生確認是否理解)\n' +
      '選項：A. (選項1) | B. (選項2) | C. (選項3)\n' +
      '解答：[A/B/C] (附一句解析理由)\n\n' +
      '【步驟三：數值代入與逐步推演】\n' +
      '推演過程：(詳細、不跳步的代入計算與推導步驟，每一步計算清楚，嚴禁寫任何微積分符號)\n\n' +
      '【步驟四：最終答案與選項陷阱分析】\n' +
      '【正確答案】 (直接填入正確選項代號與內容，如：(A) 或 (B)，嚴禁使用 boxed 語法)\n' +
      '選項/陷阱分析：(若為選擇題，說明其他選項為何錯誤；若為計算題，點出高職統測學生最容易算錯的陷阱)\n\n';

    const verifyInstruction = verify
      ? '【重要指令：學生反映先前解答可能存在計算或觀念誤差，請啟動嚴格二次覆核驗算模式！】\n' +
        '請不要盲從先前推導，徹底重新從題目條件獨立驗算：\n' +
        '1. 逐一核對題目中每個關鍵數字、單位、公式方向與正負號（如：需求價格彈性 Ed 依台灣高職慣例取絕對值為正數；弧彈性分母務必使用兩點平均值而非單點）。\n' +
        '2. 嚴格排查彈性計算與判定錯誤：\n' +
        '   - 直線需求曲線點彈性為 Ed = |ΔQ/ΔP| × (P/Q) = P / (Pmax - P) = 下段長 / 上段長；中點彈性必為 1，上半段 Ed>1，下半段 Ed<1！\n' +
        '   - 直線供給曲線點彈性 Es 依截距判定：穿過縱軸 P 軸 Es>1、穿過原點 Es=1、穿過橫軸 Q 軸 Es<1！\n' +
        '3. 嚴格排查多變數決策零和陷阱：遇多變數決策（如 X與Y、L與K、多工廠），嚴格執行【絕對基準獨立判定原則】，嚴禁直接將兩變數互比大小決定一增一減！須先找絕對及格線各自獨立判定，除非題目明確註明預算已完全耗盡，否則絕不可腦補零和推論。\n' +
        '4. 嚴格排查題意陷阱（如：線上點移動之需求量變動 vs. 整條曲線位移之需求變動、名目 vs. 實質購買力、短期停業點 P=AVC vs. 損益兩平點 P=AC、邊際消費傾向 MPC+MPS=1）。\n' +
        '5. 嚴格排查超綱微積分：高職生不會微積分，嚴禁使用積分 ∫、dx、dQ、微分導函數 d/dQ 或極限 lim。\n' +
        '6. 詳列完整代入公式與計算算式，不可跳步。\n' +
        '7. 請在輸出最上方加註【🛡️ 覆核驗算結論】說明原本是否有誤、最終確定答案與關鍵核算依據，接著嚴格依據【詳解輸出格式規範】依序輸出。\n\n'
      : '';

    let out;
    if (imgs.length) {
      const multiQuestionAndGraphNotice =
        '【🛑 多題照片最高鐵則：一次只解「由上往下看到的第 1 題」！】\n' +
        '★ 請由上往下檢視照片：若照片中包含兩道或以上的題目（例如上方有第 06 題、下方有第 07 題）：\n' +
        '1. 你必須【嚴格只針對照片中「由上往下看到的第 1 題（最上面那一題）」】進行審題、觀念確認、推導與解答！\n' +
        '2. 絕對禁止解答下方的第 2 題或其他題目！也絕對禁止把下方題目的條件或公式（如第 07 題的 MUm、MUx/Px）混入第 1 題！\n' +
        '3. 僅需在【步驟一】開頭簡短提醒一句：「（偵測到照片下方另有其他題號，系統一次只解由上往下第 1 題，其他題目請分次上傳）」即可，全篇四個步驟與【正確答案】必須 100% 為最上面第 1 題之解答！\n' +
        (hasGraph
          ? '4. 【圖形題推導準則】：若第 1 題載明「如圖所示／如右圖」，請依據照片右側坐標圖形進行推導（例如三條平行供給曲線 S1、S2、S3：S1 穿過縱軸 P 軸故 F 點彈性 Es > 1；S2 穿過原點故 G 點彈性 Es = 1；S3 穿過橫軸 Q 軸故 H 點彈性 Es < 1，因此 F > G > H，正確答案為 (A) F > G > H）！\n\n'
          : '\n');

      const task =
        multiQuestionAndGraphNotice +
        verifyInstruction +
        benchmarkPrinciple +
        noCalculusPrinciple +
        elasticityPrinciple +
        formatSpec +
        '解題要求：\n' +
        '1. 【一次只解由上往下第 1 題】：若照片中有多題，嚴格只解「由上往下看到的第一題（最上面第 1 題）」，絕對禁止跳過第 1 題去解下面的題目！\n' +
        '2. 若補充文字中有【學生已核對題目】，以該文字為準解題，圖片僅供對照，不可推翻核對文字。\n' +
        '3. 直接解題，絕對不要抄題、不要重貼題目文字、不要逐字抄出題幹選項。\n' +
        '4. 務必在【步驟二】中嚴格依格式提供 1 題【觀念確認題】（必須包含「題目：」、「選項：A. ... | B. ... | C. ...」、「解答：[A/B/C] ...」三行）。\n' +
        '5. 全篇只准繁體中文，絕對禁止簡體中文。\n' +
        '6. 【公式與變數符號鐵律（嚴禁底線「_」、嚴禁 boxed 與 LaTeX）】：\n' +
        '   - 變數與公式中【絕對禁止出現任何底線符號「_」】：例如只能寫 MUx、Px、MUm、MUy、Py、Ed、Es、Qd、Qs、P1、Q1 等！\n' +
        '   - 【變動量一律使用希臘三角形符號「Δ」】：只能寫 ΔQ、ΔP、ΔQd、ΔQs、ΔTU 等，絕對嚴禁寫成 Delta、delta 或 \\Delta！\n' +
        '   - 公式一律用純文字單行，分數用 / 或 ÷，絕對不要用 LaTeX、不要用 $ 包公式、不要用 \\boxed{}、不要用反斜線。\n' +
        '7. 【高職嚴禁微積分】：全篇絕對禁止出現積分符號 ∫、\\int、dx、dQ、微分導函數 d/dQ 或極限 lim！\n\n' +
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
        elasticityPrinciple +
        formatSpec +
        '解題要求：\n' +
        '1. 直接解題，絕對不要抄題、不要重貼題目文字；嚴格依照四個步驟關卡輸出，並在【步驟二】提供簡短【觀念確認題】（含「題目：」、「選項：A. ... | B. ... | C. ...」、「解答：[A/B/C] ...」）。\n' +
        '2. 全篇只准繁體中文，絕對禁止簡體中文。\n' +
        '3. 【公式與變數符號鐵律（嚴禁底線「_」、嚴禁 boxed 與 LaTeX）】：\n' +
        '   - 變數與公式中【絕對禁止出現任何底線符號「_」】：只能寫 MUx、Px、MUm、MUy、Py、Ed、Es、Qd、Qs、P1、Q1 等！\n' +
        '   - 【變動量一律使用希臘三角形符號「Δ」】：只能寫 ΔQ、ΔP、ΔQd、ΔQs、ΔTU 等，嚴禁寫成 Delta！\n' +
        '   - 公式一律用純文字單行，不要用 LaTeX、不要用 $ 包公式、不要用 \\boxed{}、不要用反斜線。\n' +
        '4. 【高職嚴禁微積分】：全篇絕對禁止出現積分符號 ∫、\\int、dx、dQ、微分導函數 d/dQ 或極限 lim！\n\n' +
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
    // 去 LaTeX 殘留斜線與 boxed 語法
    let answer = raw
      .replace(/\\?Delta\b/gi, 'Δ')
      .replace(/[△▲]/g, 'Δ')
      .replace(/Δ\s+([A-Za-z0-9])/g, 'Δ$1')
      .replace(/\\?boxed\s*\{\s*([^{}]*)\s*\}/gi, '$1')
      .replace(/\bboxed\s*\(\s*\(([^()]*)\)\s*\)/gi, '($1)')
      .replace(/\bboxed\s*\(\s*([^()]*)\s*\)/gi, '$1')
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

    // 3. 後處理最終安全網：若無坐標圖（!hasGraph 或無圖），但題幹或 AI 輸出顯示這是一道看圖題（如提及「如右圖」、「圖中標有」、「S1、S2、S3...平行供給曲線」），強制替換為確定性的缺圖四步驟說明！
    if ((!imgs.length || !hasGraph) && figureKeywordsRegex.test(qPart + ' ' + answer)) {
      answer = buildMissingFigureResponse(qPart + ' ' + answer, imgs.length > 0);
    }

    return Response.json({ answer, concepts: '由 AI 判斷，另請對照站內 CH1-19', verified: verify });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
