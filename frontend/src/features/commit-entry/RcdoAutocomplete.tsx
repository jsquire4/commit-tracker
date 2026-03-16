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
      return JSON.parse(localStorage.getItem(key) ?? '[]');
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
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
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
  const [rcDisplay, setRcDisplay] = useState('');
  const [doDisplay, setDoDisplay] = useState('');
  const [ocDisplay, setOcDisplay] = useState('');

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

  // Cast to correct types
  const rcList = rallyCries as RallyCryNode[];
  const doList = definingObjectives as DefiningObjectiveNode[];
  const ocList = outcomes as OutcomeNode[];

  const recent = getRecent();

  function handleRallyCrySelect(item: RallyCryNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ rallyCryId: null, definingObjectiveId: null, outcomeId: null });
      setRcDisplay('');
      setDoDisplay('');
      setOcDisplay('');
      return;
    }
    setRcDisplay(item.title);
    setRcQuery('');
    setDoDisplay('');
    setDoQuery('');
    setOcDisplay('');
    setOcQuery('');
    onChange({ rallyCryId: item.id, definingObjectiveId: null, outcomeId: null });
  }

  function handleDefiningObjectiveSelect(item: DefiningObjectiveNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ ...value, definingObjectiveId: null, outcomeId: null });
      setDoDisplay('');
      setOcDisplay('');
      return;
    }
    setDoDisplay(item.title);
    setDoQuery('');
    setOcDisplay('');
    setOcQuery('');
    onChange({ ...value, definingObjectiveId: item.id, outcomeId: null });
  }

  function handleOutcomeSelect(item: OutcomeNode | typeof NO_LINK_VALUE) {
    if (item === NO_LINK_VALUE) {
      onChange({ ...value, outcomeId: null });
      setOcDisplay('');
      return;
    }
    setOcDisplay(item.title);
    setOcQuery('');
    const updated: RcdoLink = { ...value, outcomeId: item.id };
    onChange(updated);
    // Save to recent
    const rc = rcList.find((r) => r.id === value.rallyCryId);
    const doItem = doList.find((d) => d.id === value.definingObjectiveId);
    addRecent({
      rallyCryId: value.rallyCryId,
      rallyCryTitle: rc?.title ?? null,
      definingObjectiveId: value.definingObjectiveId,
      definingObjectiveTitle: doItem?.title ?? null,
      outcomeId: item.id,
      outcomeTitle: item.title,
    });
  }

  const isLinked = Boolean(value.rallyCryId);

  return (
    <div className="space-y-3">
      {recent.length > 0 && !isLinked && (
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Recent</p>
          <div className="flex flex-wrap gap-1">
            {recent.slice(0, 3).map((r, i) => (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    rallyCryId: r.rallyCryId,
                    definingObjectiveId: r.definingObjectiveId,
                    outcomeId: r.outcomeId,
                  });
                  setRcDisplay(r.rallyCryTitle ?? '');
                  setDoDisplay(r.definingObjectiveTitle ?? '');
                  setOcDisplay(r.outcomeTitle ?? '');
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {r.rallyCryTitle ?? 'Unknown'}
                {r.definingObjectiveTitle ? ` › ${r.definingObjectiveTitle}` : ''}
                {r.outcomeTitle ? ` › ${r.outcomeTitle}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rally Cry */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rally Cry</label>
        <Combobox
          value={value.rallyCryId ? (rcList.find((r) => r.id === value.rallyCryId) ?? null) : null}
          onChange={(item) => {
            if (item) handleRallyCrySelect(item as RallyCryNode);
          }}
          disabled={disabled}
        >
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              displayValue={() => rcDisplay || (value.rallyCryId ? '...' : '')}
              onChange={(e) => setRcQuery(e.target.value)}
              placeholder="Search rally cries..."
            />
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Combobox.Options className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm">
                <Combobox.Option
                  value={NO_LINK_VALUE}
                  className={({ active }) =>
                    `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`
                  }
                >
                  No strategic link (operational/other)
                </Combobox.Option>
                {rcList.map((rc) => (
                  <Combobox.Option
                    key={rc.id}
                    value={rc}
                    className={({ active }) =>
                      `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`
                    }
                  >
                    {rc.title}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Transition>
          </div>
        </Combobox>
      </div>

      {/* Defining Objective */}
      {value.rallyCryId && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Defining Objective</label>
          <Combobox
            value={
              value.definingObjectiveId
                ? (doList.find((d) => d.id === value.definingObjectiveId) ?? null)
                : null
            }
            onChange={(item) => {
              if (item) handleDefiningObjectiveSelect(item as DefiningObjectiveNode);
            }}
            disabled={disabled}
          >
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                displayValue={() => doDisplay || (value.definingObjectiveId ? '...' : '')}
                onChange={(e) => setDoQuery(e.target.value)}
                placeholder="Search defining objectives..."
              />
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Combobox.Options className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm">
                  <Combobox.Option
                    value={NO_LINK_VALUE}
                    className={({ active }) =>
                      `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`
                    }
                  >
                    No defining objective
                  </Combobox.Option>
                  {doList.map((doItem) => (
                    <Combobox.Option
                      key={doItem.id}
                      value={doItem}
                      className={({ active }) =>
                        `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`
                      }
                    >
                      {doItem.title}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Transition>
            </div>
          </Combobox>
        </div>
      )}

      {/* Outcome */}
      {value.definingObjectiveId && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
          <Combobox
            value={
              value.outcomeId ? (ocList.find((o) => o.id === value.outcomeId) ?? null) : null
            }
            onChange={(item) => {
              if (item) handleOutcomeSelect(item as OutcomeNode);
            }}
            disabled={disabled}
          >
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                displayValue={() => ocDisplay || (value.outcomeId ? '...' : '')}
                onChange={(e) => setOcQuery(e.target.value)}
                placeholder="Search outcomes..."
              />
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Combobox.Options className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm">
                  <Combobox.Option
                    value={NO_LINK_VALUE}
                    className={({ active }) =>
                      `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`
                    }
                  >
                    No outcome
                  </Combobox.Option>
                  {ocList.map((oc) => (
                    <Combobox.Option
                      key={oc.id}
                      value={oc}
                      className={({ active }) =>
                        `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`
                      }
                    >
                      {oc.title}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Transition>
            </div>
          </Combobox>
        </div>
      )}
    </div>
  );
}
