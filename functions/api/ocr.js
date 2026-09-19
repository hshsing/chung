export async function onRequestPost(context) {
  // POST /api/ocr：只做逐字辨識，不解題。看不清用□，不猜。
  try {
    const ct = context.request.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return Response.json({ error: 'need multipart' }, { status: 400 });
    }
    if (!context.env.AI) return Response.json({ error: 'AI not bound', fallback: true }, { status: 501 });
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
    const out = await context.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [
        { role: 'system', content: '你是繁體中文逐字抄寫員。只准繁體中文，禁簡體。' },
        {
          role: 'user',
          content: [
            { type: 'text', text: '把這張題目照片的文字逐字抄出來（含題幹、選項、數字、表格數字）。看不清的字用□，嚴禁猜。不要解題，不要加任何解說，只要抄出的文字。' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1024,
    });
    let raw = out?.response || out?.result?.response || '';
    const text = raw
      .replace(/\\space/gi, '')
      .replace(/\\left/gi, '')
      .replace(/\\right/gi, '')
      .replace(/\\\(/g, '')
      .replace(/\\\)/g, '')
      .replace(/\\\[/g, '')
      .replace(/\\\]/g, '')
      .replace(/\\/g, '')
      .replace(/\$(?:\s*space\s*)+\$?/gi, '')
      .replace(/(?:\bspace\b\s*){2,}/gi, '')
      .replace(/\$\s*\$/g, '');
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300), fallback: true }, { status: 500 });
  }
}
