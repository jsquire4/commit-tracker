import { Fragment } from 'react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: string;
}

interface ApiGroup {
  name: string;
  endpoints: ApiEndpoint[];
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'text-accent bg-accent/[0.08]',
  POST: 'text-navy bg-navy/[0.08]',
  PUT: 'text-warning bg-warning/[0.08]',
  DELETE: 'text-error bg-error/[0.08]',
};

const API_GROUPS: ApiGroup[] = [
  {
    name: 'Commitments',
    endpoints: [
      { method: 'POST', path: '/commitments', description: 'Create commitment in current DRAFT cycle', auth: 'Owner' },
      { method: 'POST', path: '/commitments/unplanned', description: 'Add unplanned work during RECONCILING', auth: 'Owner' },
      { method: 'GET', path: '/commitments', description: 'List with filters (cycle, user, RCDO, CHESS, status)', auth: 'Scoped' },
      { method: 'GET', path: '/commitments/{id}', description: 'Get single commitment', auth: 'Scoped' },
      { method: 'PUT', path: '/commitments/{id}', description: 'Update (DRAFT state only)', auth: 'Owner' },
      { method: 'PUT', path: '/commitments/reorder', description: 'Batch reorder (ordered list of IDs)', auth: 'Owner' },
      { method: 'DELETE', path: '/commitments/{id}', description: 'Delete (DRAFT only)', auth: 'Owner' },
    ],
  },
  {
    name: 'Cycles',
    endpoints: [
      { method: 'GET', path: '/cycles/current', description: 'Get or create current DRAFT cycle for user', auth: 'Owner' },
      { method: 'GET', path: '/cycles/{id}', description: 'Get specific cycle', auth: 'Scoped' },
      { method: 'POST', path: '/cycles/{id}/transition', description: 'Trigger state transition (DRAFT \u2192 LOCKED \u2192 \u2026)', auth: 'Owner+' },
    ],
  },
  {
    name: 'RCDO Hierarchy',
    endpoints: [
      { method: 'GET', path: '/rcdo/tree', description: 'Full Rally Cry \u2192 DO \u2192 Outcome tree', auth: 'All' },
      { method: 'POST', path: '/rcdo/rally-cries', description: 'Create Rally Cry', auth: 'Director+' },
      { method: 'PUT', path: '/rcdo/{type}/{id}', description: 'Update RCDO entity', auth: 'Director+' },
      { method: 'DELETE', path: '/rcdo/{type}/{id}', description: 'Archive (soft-delete)', auth: 'Director+' },
    ],
  },
  {
    name: 'Reconciliation',
    endpoints: [
      { method: 'GET', path: '/cycles/{id}/reconciliation', description: 'Get reconciliation view for a cycle', auth: 'Scoped' },
      { method: 'PUT', path: '/commitments/{id}/reconcile', description: 'Record reconciliation for one commitment', auth: 'Owner' },
      { method: 'POST', path: '/cycles/{id}/reconciliation/complete', description: 'Finalize reconciliation \u2192 RECONCILED', auth: 'Owner' },
    ],
  },
  {
    name: 'Dashboard',
    endpoints: [
      { method: 'GET', path: '/dashboard/team', description: 'Manager team roll-up', auth: 'Manager+' },
      { method: 'GET', path: '/dashboard/alignment', description: 'Alignment gap signal (CHESS distribution)', auth: 'Manager+' },
      { method: 'GET', path: '/dashboard/assignment-attribution', description: 'Assignment attribution stats', auth: 'Manager+' },
      { method: 'GET', path: '/dashboard/rcdo-coverage', description: 'RCDO coverage analysis', auth: 'Manager+' },
    ],
  },
  {
    name: 'Observatory',
    endpoints: [
      { method: 'GET', path: '/observatory/health', description: 'Executive org health overview', auth: 'Executive' },
      { method: 'GET', path: '/observatory/drift', description: 'Strategic drift signals', auth: 'Executive' },
      { method: 'GET', path: '/observatory/org-units', description: 'Org unit breakdown', auth: 'Director+' },
    ],
  },
  {
    name: 'Users',
    endpoints: [
      { method: 'GET', path: '/users/me', description: 'Current user profile', auth: 'All' },
      { method: 'GET', path: '/users/team', description: 'Direct reports', auth: 'Manager+' },
      { method: 'GET', path: '/users/tree', description: 'Full org subtree', auth: 'Director+' },
    ],
  },
  {
    name: 'Briefing',
    endpoints: [
      { method: 'GET', path: '/briefing/latest', description: 'Latest AI-generated briefing', auth: 'Manager+' },
      { method: 'POST', path: '/briefing/generate', description: 'Trigger new briefing generation', auth: 'Director+' },
      { method: 'POST', path: '/briefing/chat', description: 'Conversational analytics query', auth: 'Manager+' },
    ],
  },
];

export function ApiReferenceTable() {
  return (
    <div className="rounded bg-surface-lowest p-6 overflow-x-auto">
      <table className="w-full border-collapse text-small">
        <thead>
          <tr>
            <th className="text-left label-caps text-muted font-semibold py-2 px-3 border-b border-outline-variant w-[70px]">
              Method
            </th>
            <th className="text-left label-caps text-muted font-semibold py-2 px-3 border-b border-outline-variant w-[280px]">
              Path
            </th>
            <th className="text-left label-caps text-muted font-semibold py-2 px-3 border-b border-outline-variant">
              Description
            </th>
            <th className="text-left label-caps text-muted font-semibold py-2 px-3 border-b border-outline-variant w-[90px]">
              Auth
            </th>
          </tr>
        </thead>
        <tbody>
          {API_GROUPS.map((group) => (
            <Fragment key={group.name}>
              <tr>
                <td
                  colSpan={4}
                  className="pt-4 pb-1 px-3 font-semibold text-on-surface text-label uppercase tracking-wide"
                >
                  {group.name}
                </td>
              </tr>
              {group.endpoints.map((ep) => (
                <tr key={`${ep.method}-${ep.path}`}>
                  <td className="py-2 px-3 border-b border-outline-variant/15 align-top">
                    <span
                      className={`inline-block font-mono text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded-sm ${METHOD_STYLES[ep.method]}`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-b border-outline-variant/15 align-top font-mono text-label text-on-surface">
                    {ep.path}
                  </td>
                  <td className="py-2 px-3 border-b border-outline-variant/15 align-top text-on-surface-variant">
                    {ep.description}
                  </td>
                  <td className="py-2 px-3 border-b border-outline-variant/15 align-top">
                    <span className="inline-block text-[0.625rem] uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-surface-container text-on-surface-variant font-medium whitespace-nowrap">
                      {ep.auth}
                    </span>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
