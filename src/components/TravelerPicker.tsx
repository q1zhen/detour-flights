import { Button, Flex, IconButton, Popover, Text } from '@radix-ui/themes';
import { ChevronDownIcon, MinusIcon, PersonIcon, PlusIcon } from '@radix-ui/react-icons';
import type { Passengers } from '../lib/types';

const groups: { key: keyof Passengers; label: string; note: string }[] = [
  { key: 'adults', label: 'Adults', note: 'Age 12 and above' },
  { key: 'children', label: 'Children', note: 'Age 2–11' },
  { key: 'infants_in_seat', label: 'Infants in a seat', note: 'Under age 2' },
  { key: 'infants_on_lap', label: 'Infants on a lap', note: 'One per adult' },
];
export function TravelerPicker({
  value,
  onChange,
}: {
  value: Passengers;
  onChange: (value: Passengers) => void;
}) {
  const total = Object.values(value).reduce((a, b) => a + b, 0);
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button type="button" variant="ghost" color="gray">
          <PersonIcon />
          {total} {total === 1 ? 'traveler' : 'travelers'}
          <ChevronDownIcon />
        </Button>
      </Popover.Trigger>
      <Popover.Content width="330px" maxWidth="calc(100vw - 32px)" aria-label="Travelers">
        <Text as="p" weight="bold" mb="3">
          Travelers
        </Text>
        {groups.map(({ key, label, note }) => (
          <Flex key={key} align="center" justify="between" gap="3" mb="3">
            <div>
              <Text as="p" size="2" weight="medium">
                {label}
              </Text>
              <Text as="p" size="1" color="gray">
                {note}
              </Text>
            </div>
            <Flex gap="3" align="center">
              <IconButton
                type="button"
                variant="soft"
                color="blue"
                size="2"
                aria-label={`Fewer ${label.toLowerCase()}`}
                disabled={value[key] === 0}
                onClick={() => onChange({ ...value, [key]: value[key] - 1 })}
              >
                <MinusIcon />
              </IconButton>
              <Text className="passenger-count" aria-live="polite">
                {value[key]}
              </Text>
              <IconButton
                type="button"
                variant="soft"
                color="blue"
                size="2"
                aria-label={`More ${label.toLowerCase()}`}
                disabled={total >= 9}
                onClick={() => onChange({ ...value, [key]: value[key] + 1 })}
              >
                <PlusIcon />
              </IconButton>
            </Flex>
          </Flex>
        ))}
        <Text
          as="p"
          size="1"
          color={total < 1 || value.infants_on_lap > value.adults ? 'red' : 'gray'}
        >
          Max 9 travelers · One lap infant per adult.
        </Text>
        <Flex justify="end" mt="3">
          <Popover.Close>
            <Button type="button" size="2">
              Done
            </Button>
          </Popover.Close>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
