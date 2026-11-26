// Cloudflare Pages Function: /api/feedback
// 支援處理學生/訪客留言送出，並可轉發至 Google 試算表 (Google Apps Script Webhook)

// 預設精選 Q&A 列表（自帶 5 則統測經典高頻考點師生問答）
const DEFAULT_CURATED_QA = [
  {
    id: "qa_01",
    name: "商經三乙 阿豪",
    role: "學生",
    chapter: "CH7 完全競爭市場",
    category: "💡 觀念盲區",
    date: "2026-11-20",
    likes: 48,
    question: "老師好，想請問為什麼完全競爭廠商在長期均衡時『經濟利潤＝0（正常利潤）』，廠商卻還願意繼續留在市場生產，不會想關門轉行嗎？",
    teacherReply: "這是統測每年必考的超級觀念陷阱！經濟學上的『經濟利潤＝0』是指『超額利潤＝0』，但成本中已經計入了『正常利潤（內含成本、包含老闆自己的薪水與投資機會成本）』！也就是說老闆已經拿到了合情合理的報酬，與在其他地方工作的待遇相同，因此當然會滿意並留在市場上繼續生產喔！",
    badge: "🔥 統測經典"
  },
  {
    id: "qa_02",
    name: "高三衝刺生",
    role: "學生",
    chapter: "CH8 完全獨占市場",
    category: "🎯 考點辨析",
    date: "2026-11-21",
    likes: 56,
    question: "請問老師，獨占廠商如果降價促銷，總收益 TR 就一定會增加嗎？為什麼有些題目的詳解寫不一定？",
    teacherReply: "同學問到關鍵核心了！降價是否能增加 TR，完全要看『需求價格彈性 |Ed|』：只有在 |Ed| ＞ 1（富有彈性）階段，降價薄利多銷才會使 TR 增加；若在 |Ed| ＜ 1（缺乏彈性）階段降價，TR 反而會縮水！請務必牢記統測鐵律：『獨占廠商絕不在 |Ed| ＜ 1 階段生產』！",
    badge: "⚠️ 易錯考點"
  },
  {
    id: "qa_03",
    name: "會三甲 怡君",
    role: "學生",
    chapter: "CH9 寡占與賽局",
    category: "📐 圖形解構",
    date: "2026-11-22",
    likes: 42,
    question: "史威吉拗折需求模型中，為什麼邊際收益 MR 線會在拗折點正下方出現『垂直斷裂缺口』？這跟價格僵固有什麼關係？",
    teacherReply: "因為寡占廠商『漲價時同業不跟（需求平坦彈性大，MR 較高）』，而『跌價時同業跟進（需求陡峭彈性小，MR 暴跌）』，導致斜率在拗折點瞬間變陡，MR 就斷裂開來產生垂直缺口！只要邊際成本 MC 線穿過這個缺口上下波動，最適價格與產量都完全不用變動，完美解釋了寡占市場的『價格僵固性』！",
    badge: "📐 必考圖形"
  },
  {
    id: "qa_04",
    name: "統測戰士 小晴",
    role: "學生",
    chapter: "四大廠商大對照表",
    category: "⭐ 學習心得",
    date: "2026-11-23",
    likes: 67,
    question: "老師做的 28 項四大廠商大對照表超級神！印成 A3 橫向貼在書桌前，複習完競、獨競、寡占、獨占超清楚，不用四個章節一直翻來翻去，謝謝老師！",
    teacherReply: "很高興對你有幫助！四大廠商理論佔統測專二相當大的配分比例，記得搭配表格裡的『停業點（P ＝ AVCmin）』與『超額產能』一起背誦，統測經濟學一定能衝破高分，加油！",
    badge: "🌟 暖心回饋"
  },
  {
    id: "qa_05",
    name: "高二進度生",
    role: "學生",
    chapter: "CH2 需求與供給",
    category: "💡 觀念提問",
    date: "2026-11-24",
    likes: 39,
    question: "老師，常常搞不清楚『所得彈性』和『交叉彈性』的符號到底代表什麼財，有沒有口訣可以秒殺？",
    teacherReply: "記住鍾老師的三字口訣：\n① 所得彈性看『同向或反向』：正數為正常財（大於 1 為奢侈品、小於 1 為必需品）、負數為劣等財！\n② 交叉彈性看『他牌漲價我買多還買少』：正數為替代品（如可樂與雪碧）、負數為互補品（如咖啡與奶精）、0 為獨立品！",
    badge: "💡 記憶口訣"
  }
];

export async function onRequestGet(context) {
  try {
    return Response.json(
      {
        success: true,
        list: DEFAULT_CURATED_QA,
        totalCount: DEFAULT_CURATED_QA.length
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { name, role, chapter, category, content, rating } = data;

    if (!content || !content.trim()) {
      return Response.json({ success: false, error: "留言內容不得為空" }, { status: 400 });
    }

    const newFeedback = {
      id: "fb_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: (name && name.trim()) ? name.trim().slice(0, 30) : "熱心同學",
      role: role || "學生",
      chapter: chapter || "全書綜合",
      category: category || "💡 學習提問",
      content: content.trim().slice(0, 1000),
      rating: Number(rating) || 5,
      createdAt: new Date().toISOString(),
      userAgent: context.request.headers.get("user-agent") || ""
    };

    // 若 Cloudflare Pages 環境變數有配置 GOOGLE_SHEET_WEBHOOK，即時轉發至 Google 試算表
    const webhookUrl = context.env?.GOOGLE_SHEET_WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newFeedback)
        });
      } catch (err) {
        console.error("Google Sheets forward error:", err);
      }
    }

    return Response.json(
      {
        success: true,
        message: "留言已成功送達！老師審閱回覆後將精選展示於解惑牆。",
        feedback: newFeedback
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
