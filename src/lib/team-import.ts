export type ParsedTeamRow = {
  rowNumber: number;
  teamName: string;
  category: string;
  memberName: string;
  contact: string;
  companyName: string;
  commissionRate: number | null;
  powerUsageKw: number | null;
};

export type TeamRecord = { id: string; team_name: string; normalized_name: string };
export type MemberRecord = ParsedTeamRow & {
  id: string;
  team_id: string;
  source_key: string;
  normalized_name: string | null;
  normalized_phone: string | null;
  team?: TeamRecord;
};

export type ImportStatus = 'new' | 'changed' | 'same' | 'duplicate' | 'review';
export type ComparedTeamRow = ParsedTeamRow & {
  status: ImportStatus;
  selected: boolean;
  sourceKey: string;
  existingTeamId?: string;
  existingMemberId?: string;
  existing?: Partial<ParsedTeamRow>;
  reason?: string;
  importRowId?: string;
};

export const normalizeText = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export const normalizePhone = (value: unknown) => String(value ?? '').replace(/\D/g, '');
export const makeSourceKey = (team: string, member: string, phone: string) =>
  `${normalizeText(team)}|${normalizeText(member)}|${normalizePhone(phone)}`;

const cellText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('result' in value) return cellText(value.result);
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((item: { text?: string }) => item.text || '').join('').trim();
  }
  return String(value).trim();
};

const parseNumber = (value: unknown, percent = false): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return percent && value > 1 ? value / 100 : value;
  const text = cellText(value).replace(/,/g, '').replace(/%/g, '');
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return percent ? parsed / 100 : parsed;
};

export async function parseTeamWorkbook(file: File): Promise<ParsedTeamRow[]> {
  const { readSheet } = await import('read-excel-file/browser');
  let sheet: unknown[][];
  try {
    sheet = await readSheet(await file.arrayBuffer(), '팀리스트');
  } catch {
    throw new Error('팀리스트 시트를 읽을 수 없습니다. 최신 행사관리 파일인지 확인해 주세요.');
  }

  let headerRow = 0;
  const columns = new Map<string, number>();
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.length, 20); rowNumber += 1) {
    const row = sheet[rowNumber - 1] || [];
    row.forEach((value, zeroBasedColumn) => {
      const header = cellText(value).replace(/\s/g, '');
      if (['팀명', '분류', '성명', '연락처', '업체명', '수수료율', '전기사용량(Kw)', '전기사용량'].includes(header)) columns.set(header, zeroBasedColumn + 1);
    });
    if (columns.has('팀명') && columns.has('성명') && columns.has('연락처')) { headerRow = rowNumber; break; }
    columns.clear();
  }
  if (!headerRow) throw new Error('팀리스트의 필수 헤더(팀명, 성명, 연락처)를 찾을 수 없습니다.');

  const col = (...names: string[]) => names.map((name) => columns.get(name)).find(Boolean);
  const rows: ParsedTeamRow[] = [];
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.length; rowNumber += 1) {
    const row = sheet[rowNumber - 1] || [];
    const get = (...names: string[]) => {
      const index = col(...names);
      return index ? row[index - 1] : null;
    };
    const teamName = cellText(get('팀명'));
    const memberName = cellText(get('성명'));
    const contact = cellText(get('연락처'));
    if (!teamName && !memberName && !contact) continue;
    rows.push({
      rowNumber,
      teamName,
      category: cellText(get('분류')),
      memberName,
      contact,
      companyName: cellText(get('업체명')),
      commissionRate: parseNumber(get('수수료율'), true),
      powerUsageKw: parseNumber(get('전기사용량(Kw)', '전기사용량')),
    });
  }
  if (!rows.length) throw new Error('팀리스트에서 데이터 행을 찾을 수 없습니다.');
  return rows;
}

const comparable = (row: Partial<ParsedTeamRow>) => ({
  teamName: normalizeText(row.teamName), category: normalizeText(row.category), memberName: normalizeText(row.memberName),
  contact: normalizePhone(row.contact), companyName: normalizeText(row.companyName),
  commissionRate: row.commissionRate ?? null, powerUsageKw: row.powerUsageKw ?? null,
});

export function compareTeamRows(rows: ParsedTeamRow[], teams: TeamRecord[], members: MemberRecord[]): ComparedTeamRow[] {
  const duplicateKeys = new Set<string>();
  const counts = new Map<string, number>();
  rows.forEach((row) => { const key = makeSourceKey(row.teamName, row.memberName, row.contact); counts.set(key, (counts.get(key) || 0) + 1); });
  counts.forEach((count, key) => { if (count > 1) duplicateKeys.add(key); });

  return rows.map((row) => {
    const sourceKey = makeSourceKey(row.teamName, row.memberName, row.contact);
    const normalizedTeam = normalizeText(row.teamName);
    const normalizedMember = normalizeText(row.memberName);
    const normalizedContact = normalizePhone(row.contact);
    if (!normalizedTeam || !normalizedMember || !normalizedContact) {
      return { ...row, sourceKey, status: 'review', selected: false, reason: '팀명, 성명 또는 연락처가 비어 있습니다.' };
    }
    if (duplicateKeys.has(sourceKey)) {
      return { ...row, sourceKey, status: 'duplicate', selected: false, reason: '업로드 파일 안에 같은 팀·담당자·연락처가 반복됩니다.' };
    }
    const team = teams.find((item) => item.normalized_name === normalizedTeam);
    const exact = members.find((item) => item.source_key === sourceKey);
    const sameTeamCandidate = members.find((item) => item.team_id === team?.id && (item.normalized_name === normalizedMember || item.normalized_phone === normalizedContact));
    const crossCandidate = members.find((item) => item.normalized_phone === normalizedContact || (item.normalized_name === normalizedMember && normalizedMember.length >= 2));
    const existing = exact || sameTeamCandidate;
    if (existing) {
      const oldValue: Partial<ParsedTeamRow> = {
        teamName: existing.team?.team_name || team?.team_name || row.teamName,
        category: existing.category, memberName: existing.memberName, contact: existing.contact,
        companyName: existing.companyName, commissionRate: existing.commissionRate, powerUsageKw: existing.powerUsageKw,
      };
      const changed = JSON.stringify(comparable(oldValue)) !== JSON.stringify(comparable(row));
      return { ...row, sourceKey, status: changed ? 'changed' : 'same', selected: changed, existing: oldValue, existingTeamId: existing.team_id, existingMemberId: existing.id };
    }
    if (crossCandidate) {
      return { ...row, sourceKey, status: 'duplicate', selected: false, reason: '다른 팀 또는 기존 담당자와 성명·연락처가 겹칩니다.', existingTeamId: crossCandidate.team_id, existingMemberId: crossCandidate.id };
    }
    return { ...row, sourceKey, status: 'new', selected: true, existingTeamId: team?.id };
  });
}
