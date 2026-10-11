import { createClient } from '@supabase/supabase-js';
import { compareTeamRows, type BaselineTeamRow, type ParsedTeamRow } from '@/lib/team-import';

export const runtime = 'nodejs';

type BaselineDbRow = {
  member_id: string; team_id: string; team_name: string; normalized_team: string; source_key: string;
  source_row_number: number; member_name: string | null; normalized_member: string | null;
  contact: string | null; normalized_phone: string | null; category: string | null;
  company_name: string | null; normalized_company: string | null;
  commission_rate: number | null; power_usage_kw: number | null;
};

const validText = (value: unknown, max = 200) => typeof value === 'string' && value.length <= max;
const validNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));
const isParsedRow = (value: unknown): value is ParsedTeamRow => {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return Number.isInteger(row.rowNumber) && validText(row.teamName) && validText(row.category) && validText(row.memberName)
    && validText(row.contact, 50) && validText(row.companyName) && validNumber(row.commissionRate) && validNumber(row.powerUsageKw);
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1_500_000) return Response.json({ error: '비교 요청이 너무 큽니다.' }, { status: 413 });
    const body = await request.json() as { rows?: unknown };
    if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 1000 || !body.rows.every(isParsedRow)) {
      return Response.json({ error: '팀리스트 데이터 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const compareSecret = process.env.TEAM_COMPARE_SECRET;
    if (!url || !anonKey || !compareSecret) return Response.json({ error: '서버 비교 환경이 준비되지 않았습니다.' }, { status: 503 });

    const supabase = createClient(url, anonKey, { db: { schema: 'hrmm' }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc('get_team_baseline', { p_secret: compareSecret });
    if (error) return Response.json({ error: '기준 팀 데이터를 불러오지 못했습니다.' }, { status: 503 });

    const baseline = ((data || []) as BaselineDbRow[]).map<BaselineTeamRow>((row) => ({
      id: row.member_id, teamId: row.team_id, sourceKey: row.source_key, rowNumber: row.source_row_number,
      teamName: row.team_name, normalizedTeam: row.normalized_team, memberName: row.member_name || '',
      normalizedMember: row.normalized_member || '', contact: row.contact || '', normalizedPhone: row.normalized_phone || '',
      category: row.category || '', companyName: row.company_name || '', normalizedCompany: row.normalized_company || '',
      commissionRate: row.commission_rate, powerUsageKw: row.power_usage_kw,
    }));
    const compared = compareTeamRows(body.rows, baseline);
    const teamCount = new Set(baseline.map((row) => row.teamId)).size;
    return Response.json({ rows: compared, baseline: { teams: teamCount, members: baseline.length } }, {
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return Response.json({ error: '비교 요청을 처리하지 못했습니다.' }, { status: 400 });
  }
}
