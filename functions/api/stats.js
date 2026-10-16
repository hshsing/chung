export async function onRequestGet(context) {
  // Cloudflare Pages Function: GET /api/stats?hit=1
  try {
    const url = new URL(context.request.url);
    const isHit = url.searchParams.get('hit') === '1';
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const totalKey = 'clvsc_hschung_eco_total';
    const todayKey = `clvsc_hschung_eco_today_${todayStr}`;
    const op = isHit ? 'hit' : 'get';

    const [resTotal, resToday] = await Promise.all([
      fetch(`https://countapi.mileshilliard.com/api/v1/${op}/${totalKey}`).then((r) => r.json()).catch(() => null),
      fetch(`https://countapi.mileshilliard.com/api/v1/${op}/${todayKey}`).then((r) => r.json()).catch(() => null),
    ]);

    const total = (resTotal && typeof resTotal.value === 'number') ? resTotal.value : (isHit ? 1 : 0);
    const today = (resToday && typeof resToday.value === 'number') ? resToday.value : (isHit ? 1 : 0);

    return Response.json(
      {
        success: true,
        today,
        total,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    return Response.json({ success: false, today: 0, total: 0 }, { status: 200 });
  }
}
