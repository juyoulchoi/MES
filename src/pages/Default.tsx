import { Link } from 'react-router-dom';

type LinkItem = { label: string; path: string };
type Section = { title: string; items: LinkItem[] };

const sections: Section[] = [
  {
    title: 'M04',
    items: [
      { label: 'MMSM04001S', path: '/app/MMSM04001S.ts' },
      { label: 'MMSM04002E', path: '/app/MMSM04002E.ts' },
      { label: 'MMSM04003S', path: '/app/MMSM04003S.ts' },
      { label: 'MMSM04004E', path: '/app/MMSM04004E.ts' },
      { label: 'MMSM04005E', path: '/app/MMSM04005E.ts' },
      { label: 'MMSM04006E', path: '/app/MMSM04006E.ts' },
      { label: 'MMSM04007S', path: '/app/MMSM04007S.ts' },
      { label: 'MMSM04008S', path: '/app/MMSM04008S.ts' },
      { label: 'MMSM04009E', path: '/app/MMSM04009E.ts' },
    ],
  },
  {
    title: 'M06',
    items: [
      { label: 'MMSM06001E', path: '/app/MMSM06001E.ts' },
      { label: 'MMSM06003E', path: '/app/MMSM06003E.ts' },
      { label: 'MMSM06004E', path: '/app/MMSM06004E.ts' },
      { label: 'MMSM06005E', path: '/app/MMSM06005E.ts' },
      { label: 'MMSM06007E', path: '/app/MMSM06007E.ts' },
      { label: 'MMSM06008E', path: '/app/MMSM06008E.ts' },
      { label: 'MMSM06009E', path: '/app/MMSM06009E.ts' },
      { label: 'MMSM06010E', path: '/app/MMSM06010E.ts' },
    ],
  },
  {
    title: 'M07',
    items: [
      { label: 'MMSM07001E', path: '/app/MMSM07001E.ts' },
      { label: 'MMSM07002E', path: '/app/MMSM07002E.ts' },
      { label: 'MMSM07003E', path: '/app/MMSM07003E.ts' },
      { label: 'MMSM07004E', path: '/app/MMSM07004E.ts' },
      { label: 'MMSM07005S', path: '/app/MMSM07005S.ts' },
      { label: 'MMSM07006S', path: '/app/MMSM07006S.ts' },
    ],
  },
  {
    title: 'M08',
    items: [
      { label: 'MMSM08002S (원자재 선택)', path: '/app/MMSM08002S.ts' },
      { label: 'MMSM08003S (거래처 선택)', path: '/app/MMSM08003S.ts' },
      { label: 'MMSM08004S (프로그램 선택)', path: '/app/MMSM08004S.ts' },
      { label: 'MMSM08005S (호기 선택)', path: '/app/MMSM08005S.ts' },
      { label: 'MMSM08006S (부서 선택)', path: '/app/MMSM08006S.ts' },
      { label: 'MMSM08008E (사용자 그룹)', path: '/app/MMSM08008E.ts' },
    ],
  },
];

export default function DefaultPage() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">임시 메뉴</h1>
        <p className="text-sm text-muted-foreground mt-1">
          변환된 화면으로 빠르게 이동하기 위한 임시 링크 모음입니다.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((sec) => (
          <div key={sec.title} className="border rounded-md p-3">
            <div className="font-semibold mb-2">{sec.title}</div>
            <ul className="space-y-1 text-sm">
              {sec.items.map((it) => (
                <li key={it.path}>
                  <Link
                    to={it.path}
                    className="text-primary hover:underline break-all"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
