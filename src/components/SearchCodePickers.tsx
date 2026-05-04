import CustomerCodePicker, { type CustomerCodePickerItem } from '@/components/CustomerCodePicker';
import ItemCodePicker, { type ItemCodePickerItem } from '@/components/ItemCodePicker';

type ItemGb = 'FG' | 'SFG' | 'RAW' | 'SUB' | 'FG,SFG' | 'RAW,SUB';

interface CustomerPickerConfig {
  open: boolean;
  title?: string;
  custGb?: string;
  cstCd?: string;
  cstNm?: string;
  onClose: () => void;
  onSelect: (value: CustomerCodePickerItem) => void;
}

interface ItemPickerConfig {
  open: boolean;
  title?: string;
  itemGb?: ItemGb;
  itemNm?: string;
  onClose: () => void;
  onSelect: (value: ItemCodePickerItem) => void;
}

interface SearchCodePickersProps {
  customer?: CustomerPickerConfig;
  item?: ItemPickerConfig;
}

export default function SearchCodePickers({ customer, item }: SearchCodePickersProps) {
  return (
    <>
      {customer?.open ? (
        <CustomerCodePicker
          title={customer.title ?? '거래처 정보'}
          custGb={customer.custGb}
          cstCd={customer.cstCd}
          cstNm={customer.cstNm}
          onClose={customer.onClose}
          onSelect={customer.onSelect}
        />
      ) : null}

      {item?.open ? (
        <ItemCodePicker
          title={item.title ?? '원자재 정보'}
          itemGb={item.itemGb}
          itemNm={item.itemNm}
          onClose={item.onClose}
          onSelect={item.onSelect}
        />
      ) : null}
    </>
  );
}
