// GET /api/admin/export — download all bookings as CSV (Basic-Auth via _middleware).
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT b.ref_code, s.time_label, s.end_label, b.name, b.gender,
            b.birth_year, b.birth_month, b.email, b.phone, b.created_at,
            b.consent_service, b.consent_privacy, b.consent_health, b.consent_version, b.consent_ip
     FROM bookings b JOIN slots s ON s.id = b.slot_id
     ORDER BY s.sort_order ASC, b.created_at ASC`
  ).all();

  const yn = (v) => (v ? "是 Yes" : "否 No");
  const header = ["預約碼", "時段", "姓名", "性別", "出生年月", "電郵", "電話", "提交/同意時間",
    "同意·用户服务协议", "同意·个人信息处理规则", "同意·健康检测活动知情同意书", "同意版本", "同意IP"];
  const rows = results.map((r) => [
    r.ref_code,
    `${r.time_label}-${r.end_label}`,
    r.name,
    r.gender === "female" ? "女 Female" : "男 Male",
    `${r.birth_year}-${String(r.birth_month).padStart(2, "0")}`,
    r.email,
    r.phone,
    r.created_at,
    yn(r.consent_service),
    yn(r.consent_privacy),
    yn(r.consent_health),
    r.consent_version || "",
    r.consent_ip || "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  // UTF-8 BOM so Excel opens Chinese correctly.
  const body = "﻿" + csv;

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compound-rsvp-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
