import { useMemo, useState } from 'react';
import DateEdit from '@/components/DateEdit';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ItemCodePicker from '@/components/ItemCodePicker';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import CodeNameField from '@/components/CodeNameField';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { renderGridInputCell, renderGridReadOnlyCell, renderGridSelectCell } from '@/components/table/GridCells';
import { useCodes } from '@/lib/hooks/useCodes';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import { type DetailRow, type MasterRow, type RowItem, type SearchForm } from '@/services/m01/mmsm01003';

export default function MMSM01003E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setMaterialPickerOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const [form, setForm] = useState<SearchForm>({
    date: first.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    itemGb: '',
  });

  const [inDate] = useState('');
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);

  const { codes: emCodes } = useCodes('1100', []);

  const { loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/material/pomst/search',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form: currentForm }) => ({
      cstCd: currentForm.cstCd || '',
      itemCd: currentForm.itemCd || '',
      itemGb: currentForm.itemGb || '',
    }),
  });

  const gridClassNames = useMemo(
    () => ({
      wrapper: 'max-h-[65vh]',
    }),
    []
  );

  const emOptions = useMemo(
    () => emCodes.map((code) => ({ value: code.code, label: code.name })),
    [emCodes]
  );

  function onSave() {}

  function onExportCsv() {}

  function toggleMaster(i: number, checked: boolean) {
    setMaster((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function toggleDetail(i: number, checked: boolean) {
    setDetail((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function onDetailChange(i: number, patch: Partial<DetailRow>) {
    setDetail((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  function onAddFromMaster() {
    const selected = master.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetail((prev) => {
      const addedRows: DetailRow[] = selected.map((row) => ({
        CHECK: true,
        ITEM_CD: row.ITEM_CD ?? '',
        ITEM_NM: row.ITEM_NM ?? '',
        UNIT_CD: '',
        QTY: '',
        EM_GB: '',
        DESC: '',
        SO_SUB_SEQ: '',
        END_YN: '',
        SAL_TP: '',
      }));

      return [...addedRows, ...prev];
    });
  }

  function onDeleteDetail() {
    setDetail((prev) => prev.filter((row) => !row.CHECK));
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 입고 등록</div>

      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-6 gap-2 items-end">
        <DateEdit label="입고일자" value={inDate} />

        <CodeNameField
          label="거래처명"
          id="cust"
          code={form.cstCd}
          name={form.cstNm}
          codePlaceholder="코드"
          namePlaceholder="거래처 선택"
          onSearch={() => setCustomerOpen(true)}
        />

        <CommonCodeSelectBox
          codeGroup="ITEM_GB"
          label="자재구분"
          showAllOption={true}
          searchEnabled={false}
          onValueChange={(value) =>
            setForm({
              ...form,
              itemGb: String(value),
            })
          }
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => fetchList(0)}
            disabled={loading}
            className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            조회
          </button>
          <button onClick={() => onSave()} disabled={loading} className="h-8 px-3 border rounded">
            저장
          </button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">
            엑셀
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4">
          <DataGrid
            dataSource={master}
            showBorders={true}
            rowKey={(row, index) => row.ITEM_CD ?? index}
            classNames={gridClassNames}
            emptyText="마스터 데이터가 없습니다. 조건 선택 후 조회하세요."
          >
            <CheckColumn
              checked={(row) => !!row.CHECK}
              onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
            />
            <Column dataField="ITEM_CD" caption="자재코드" width={112} alignment="center" />
            <Column dataField="ITEM_NM" caption="자재명" />
          </DataGrid>
        </div>

        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDeleteDetail} className="h-8 px-3 border rounded">
            삭제
          </button>
          <button onClick={onAddFromMaster} className="h-8 px-3 border rounded">
            추가
          </button>
        </div>

        <div className="col-span-12 md:col-span-7">
          <DataGrid
            dataSource={detail}
            showBorders={true}
            rowKey={(row, index) => `${row.ITEM_CD ?? 'detail'}-${index}`}
            classNames={gridClassNames}
            emptyText="디테일 데이터가 없습니다. 마스터에서 선택 후 추가하세요."
          >
            <CheckColumn
              checked={(row) => !!row.CHECK}
              onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
            />
            <Column
              dataField="ITEM_CD"
              caption="자재코드"
              width={112}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.ITEM_CD, { align: 'center' })}
            />
            <Column
              dataField="ITEM_NM"
              caption="자재명"
              cellRender={(row) => renderGridReadOnlyCell(row.ITEM_NM)}
            />
            <Column
              dataField="UNIT_CD"
              caption="단위"
              width={80}
              alignment="center"
              cellRender={(row, rowIndex) =>
                renderGridInputCell({
                  value: row.UNIT_CD,
                  align: 'center',
                  onChange: (e) => onDetailChange(rowIndex, { UNIT_CD: e.target.value }),
                })
              }
            />
            <Column
              dataField="QTY"
              caption="수량"
              dataType="number"
              width={96}
              alignment="right"
              cellRender={(row, rowIndex) =>
                renderGridInputCell({
                  value: row.QTY,
                  align: 'right',
                  onChange: (e) => onDetailChange(rowIndex, { QTY: e.target.value }),
                })
              }
            />
            <Column
              dataField="EM_GB"
              caption="긴급구분"
              width={96}
              alignment="center"
              cellRender={(row, rowIndex) =>
                renderGridSelectCell({
                  value: row.EM_GB,
                  align: 'center',
                  options: emOptions,
                  onChange: (e) => onDetailChange(rowIndex, { EM_GB: e.target.value }),
                })
              }
            />
            <Column
              dataField="DESC"
              caption="비고"
              width={160}
              cellRender={(row, rowIndex) =>
                renderGridInputCell({
                  value: row.DESC,
                  onChange: (e) => onDetailChange(rowIndex, { DESC: e.target.value }),
                })
              }
            />
            <Column
              dataField="SO_SUB_SEQ"
              caption="영업상세순번"
              width={96}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.SO_SUB_SEQ, { align: 'center' })}
            />
            <Column
              dataField="END_YN"
              caption="종료여부"
              width={88}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.END_YN, { align: 'center' })}
            />
            <Column
              dataField="SAL_TP"
              caption="판매구분"
              width={88}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.SAL_TP, { align: 'center' })}
            />
          </DataGrid>
        </div>
      </div>

      {customerOpen ? (
        <CustomerCodePicker
          title="거래처 정보"
          custGb="CUSTOMER"
          cstCd={form.cstCd}
          cstNm={form.cstNm}
          onClose={() => setCustomerOpen(false)}
          onSelect={(value) => {
            setForm((prev) => ({ ...prev, cstCd: value.cstCd, cstNm: value.cstNm }));
          }}
        />
      ) : null}

      {itemPickerOpen ? (
        <ItemCodePicker
          title="원자재 정보"
          itemGb="RAW,SUB"
          itemNm={form.itemNm}
          onClose={() => setMaterialPickerOpen(false)}
          onSelect={(value) => {
            setForm((prev) => ({
              ...prev,
              itemGb: value.itemgb,
              itemCd: value.itemCd,
              itemNm: value.itemNm,
            }));
          }}
        />
      ) : null}
    </div>
  );
}

