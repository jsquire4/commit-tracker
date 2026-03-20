import { useState, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { useRcdoSearch } from '@/hooks/useRcdo';
import { useAuth } from '@/hooks/useAuth';
import type { RcdoLink, RallyCryNode, DefiningObjectiveNode, OutcomeNode } from '@/types';

const RECENT_KEY = (userId: string, orgId: string) =>
  `rcdo-recent:${orgId}:${userId}`;

const NO_LINK_VALUE = '__NO_LINK__';

interface RecentRcdo {
  rallyCryId: string | null;
  rallyCryTitle: string | null;
  definingObjectiveId: string | null;
  definingObjectiveTitle: string | null;
  outcomeId: string | null;
  outcomeTitle: string | null;
}

function useRecentRcdo(userId: string, orgId: string) {
  const key = RECENT_KEY(userId, orgId);

  function getRecent(): RecentRcdo[] {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as RecentRcdo[];
    } catch {
      return [];
    }
  }

  function addRecent(entry: RecentRcdo) {
    const existing = getRecent().filter(
      (r) =>
        r.rallyCryId !== entry.rallyCryId ||
        r.definingObjectiveId !== entry.definingObjectiveId ||
        r.outcomeId !== entry.outcomeId
    );
    const next = [entry, ...existing].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(next));
  }

  return { getRecent, addRecent };
}

function useDebounce(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(value); }, delay);
    return () => { clearTimeout(timer); };
  }, [value, delay]);
  return debounced;
}

type RcdoNode = RallyCryNode | DefiningObjectiveNode | OutcomeNode;

interface RcdoComboboxProps {
  label: string;
  query: string;
  onQueryChange: (q: string) => void;
  value: RcdoNode | null;
  onChange: (item: RcdoNode | typeof NO_LINK_VALUE) => void;
  items: RcdoNode[];
  noLinkLabel: string;
  placeholder: string;
  disabled: boolean;
}

function RcdoCombobox({
  label,
  query: _query,
  onQueryChange,
  value,
  onChange,
  items,
  noLinkLabel,
  placeholder,
  disabled,
}: RcdoComboboxProps) {
  return (
    <div>
      <label className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-1">{label}</label>
      <Combobox value={value} onChange={(item) => { if (item) onChange(item); }} disabled={disabled}>
        <div className="relative">
          <Combobox.Input
            className="w-full border-0 border-b-2 border-b-outline-variant bg-transparent px-0 py-2 text-body text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[200ms] disabled:opacity-50 disabled:cursor-not-allowed"
            displayValue={(item: RcdoNode | null) => (item)?.title ?? ''}
            onChange={(e) => { onQueryChange(e.target.value); }}
            placeholder={placeholder}
          />
          <Transition
            as={Fragment}
            leave="transition-opacity duration-100 ease-[var(--ease-exit)]"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-sm bg-surface-lowest py-1 shadow-whisper border border-outline-variant focus:outline-none text-[0.8125rem]">
              <Combobox.Option
                value={NO_LINK_VALUE}
                className={({ active }) =>
                  `cursor-pointer select-none py-2 px-3 italic transition-colors duration-[120ms] ${active ? 'bg-surface-container-low text-on-surface-variant' : 'text-muted'}`
                }
              >
                {noLinkLabel}
              </Combobox.Option>
              {items.map((item) => (
                <Combobox.Option
                  key={item.id}
                  value={item}
                  className={({ active }) =>
                    `cursor-pointer select-none py-2 px-3 transition-colors duration-[120ms] ${active ? 'bg-surface-container-low text-on-surface' : 'text-on-surface'}`
                  }
                >
                  {item.title}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}

interface RcdoAutocompleteProps {
  value: RcdoLink;
  onChange: (link: RcdoLink) => void;
  disabled?: boolean;
}

export function RcdoAutocomplete({ value, onChange, disabled = false }: RcdoAutocompleteProps) {
  const { userId, orgId } = useAuth();
  const { getRecent, addRecent } = useRecentRcdo(userId, orgId);

  const [rcQuery, setRcQuery] = useState('');
  const [doQuery, setDoQuery] = useState('');
  const [ocQuery, setOcQuery] = useState('');

  const debouncedRc = useDebounce(rcQuery);
  const debouncedDo = useDebounce(doQuery);
  const debouncedOc = useDebounce(ocQuery);

  const { data: rallyCries = [] } = useRcdoSearch('rallyCry', null, debouncedRc || ' ');
  const { data: definingObjectives = [] } = useRcdoSearch(
    'definingObjective',
    value.rallyCryId,
    debouncedDo || ' '
  );
  const { data: outcomes = [] } = useRcdoSearch(
    'outcome',
    value.definingObjectiveId,
    debouncedOc || ' '
  );

  const rcList = rallyCries as RallyCryNode[];
  const doList = definingObjectives as DefiningObjectiveNode[];
  const ocList = outcomes as OutcomeNode[];

  const recent = getRecent();

  function handleRallyCrySelect(item: RcdoNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ rallyCryId: null, rallyCryTitle: null, definingObjectiveId: null, definingObjectiveTitle: null, outcomeId: null, outcomeTitle: null });
      return;
    }
    const rc = item as RallyCryNode;
    setRcQuery('');
    setDoQuery('');
    setOcQuery('');
    onChange({ rallyCryId: rc.id, rallyCryTitle: rc.title, definingObjectiveId: null, definingObjectiveTitle: null, outcomeId: null, outcomeTitle: null });
  }

  function handleDefiningObjectiveSelect(item: RcdoNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ ...value, definingObjectiveId: null, definingObjectiveTitle: null, outcomeId: null, outcomeTitle: null });
      return;
    }
    const doItem = item as DefiningObjectiveNode;
    setDoQuery('');
    setOcQuery('');
    onChange({ ...value, definingObjectiveId: doItem.id, definingObjectiveTitle: doItem.title, outcomeId: null, outcomeTitle: null });
  }

  function handleOutcomeSelect(item: RcdoNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ ...value, outcomeId: null, outcomeTitle: null });
      return;
    }
    const oc = item as OutcomeNode;
    setOcQuery('');
    const updated: RcdoLink = { ...value, outcomeId: oc.id, outcomeTitle: oc.title };
    onChange(updated);
    const rc = rcList.find((r) => r.id === value.rallyCryId);
    const doItem = doList.find((d) => d.id === value.definingObjectiveId);
    addRecent({
      rallyCryId: value.rallyCryId,
      rallyCryTitle: rc?.title ?? null,
      definingObjectiveId: value.definingObjectiveId,
      definingObjectiveTitle: doItem?.title ?? null,
      outcomeId: oc.id,
      outcomeTitle: oc.title,
    });
  }

  const isLinked = Boolean(value.rallyCryId);

  const selectedRc = value.rallyCryId ? (rcList.find((r) => r.id === value.rallyCryId) ?? null) : null;
  const selectedDo = value.definingObjectiveId ? (doList.find((d) => d.id === value.definingObjectiveId) ?? null) : null;
  const selectedOc = value.outcomeId ? (ocList.find((o) => o.id === value.outcomeId) ?? null) : null;

  return (
    <div className="space-y-3">
      {recent.length > 0 && !isLinked && (
        <div>
          <p className="text-label text-muted mb-1 font-medium uppercase tracking-[0.05rem]">Recent</p>
          <div className="flex flex-wrap gap-1">
            {recent.slice(0, 3).map((r, i) => (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    rallyCryId: r.rallyCryId,
                    rallyCryTitle: r.rallyCryTitle,
                    definingObjectiveId: r.definingObjectiveId,
                    definingObjectiveTitle: r.definingObjectiveTitle,
                    outcomeId: r.outcomeId,
                    outcomeTitle: r.outcomeTitle,
                  });
                }}
                className="text-small bg-surface-container hover:bg-surface-container-high text-on-surface-variant px-2 py-1 rounded-pill transition-colors duration-[150ms] disabled:opacity-50"
              >
                {r.rallyCryTitle ?? 'Unknown'}
                {r.definingObjectiveTitle ? ` \u203A ${r.definingObjectiveTitle}` : ''}
                {r.outcomeTitle ? ` \u203A ${r.outcomeTitle}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <RcdoCombobox
        label="Rally Cry"
        query={rcQuery}
        onQueryChange={setRcQuery}
        value={selectedRc}
        onChange={handleRallyCrySelect}
        items={rcList}
        noLinkLabel="No strategic link (operational/other)"
        placeholder="Search rally cries..."
        disabled={disabled}
      />

      {value.rallyCryId && (
        <RcdoCombobox
          label="Defining Objective"
          query={doQuery}
          onQueryChange={setDoQuery}
          value={selectedDo}
          onChange={handleDefiningObjectiveSelect}
          items={doList}
          noLinkLabel="No defining objective"
          placeholder="Search defining objectives..."
          disabled={disabled}
        />
      )}

      {value.definingObjectiveId && (
        <RcdoCombobox
          label="Outcome"
          query={ocQuery}
          onQueryChange={setOcQuery}
          value={selectedOc}
          onChange={handleOutcomeSelect}
          items={ocList}
          noLinkLabel="No outcome"
          placeholder="Search outcomes..."
          disabled={disabled}
        />
      )}
    </div>
  );
}
