// GET /api/admin/export-v2 — download Day 0 vol.2 registrations as CSV (Basic-Auth via _middleware).
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT ref_code, name, wechat_id, phone, company_title, referral_code, inviter_name,
            tier, ticket_choice, wants_testing, testing_slot, workout_pref,
            companion_count, companion_name, companion1_wechat, companion2_name, companion2_wechat,
            topic_interest, health_challenge, notes, amount_due, currency, payment_status,
            consent_service, consent_privacy, consent_health, consent_version, consent_ip, created_at
     FROM registrations_v2 ORDER BY created_at ASC`
  ).all();

  const yn = (v) => (v ? "是 Yes" : "否 No");
  const ticketLabel = (v) => (v === "member" ? "會員席" : v === "salon" ? "沙龍席" : v === "decide_onsite" ? "到現場再決定" : v || "");
  const header = ["報名碼", "姓名", "微信號", "手機/郵箱", "公司/職位", "推薦碼", "邀請人",
    "價格分層", "票種", "含檢測", "檢測時段", "運動偏好",
    "同行人數", "同行者1姓名", "同行者1微信", "同行者2姓名", "同行者2微信",
    "當天最想探討", "健康管理現狀/問題", "備註",
    "應付金額", "貨幣", "付款狀態",
    "同意·服務協議", "同意·隱私政策", "同意·健康知情同意書", "同意版本", "同意IP", "提交時間"];
  const rows = results.map((r) => [
    r.ref_code, r.name, r.wechat_id, r.phone || "", r.company_title || "", r.referral_code || "", r.inviter_name || "",
    r.tier, ticketLabel(r.ticket_choice), yn(r.wants_testing), r.testing_slot || "", r.workout_pref || "",
    r.companion_count || 0, r.companion_name || "", r.companion1_wechat || "", r.companion2_name || "", r.companion2_wechat || "",
    r.topic_interest || "", r.health_challenge || "", r.notes || "",
    r.amount_due, r.currency, r.payment_status,
    yn(r.consent_service), yn(r.consent_privacy), yn(r.consent_health), r.consent_version || "", r.consent_ip || "",
    r.created_at,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const body = "﻿" + csv; // UTF-8 BOM so Excel opens Chinese correctly.

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compound-rsvp-v2-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
