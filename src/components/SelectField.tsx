import { Select } from '@radix-ui/themes';

interface Props<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  id?: string;
}
export function SelectField<T extends string>({ label, value, onChange, options, id }: Props<T>) {
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(next as T)} size="2">
      <Select.Trigger id={id} aria-label={label} />
      <Select.Content position="popper">
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
