import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getOrgTree } from '@/api/users.api';
import { useExecutiveHealth } from '@/hooks/useObservatory';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { User } from '@/types';
import type { HealthGrade } from '@/types/observatory.types';

const MANAGER_ROLES = new Set(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);
const DEFAULT_EXPAND_DEPTH = 2;

// Map HealthGrade to a color dot class
function healthDotClass(grade: HealthGrade): string {
  switch (grade) {
    case 'GREEN':
      return 'bg-green-500';
    case 'YELLOW':
      return 'bg-yellow-400';
    case 'RED':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

interface OrgTreeNode extends User {
  children: OrgTreeNode[];
}

function buildTree(users: User[]): OrgTreeNode[] {
  const nodeMap = new Map<string, OrgTreeNode>();

  // Create all nodes first
  for (const user of users) {
    nodeMap.set(user.id, { ...user, children: [] });
  }

  const roots: OrgTreeNode[] = [];

  // Wire up parent–child relationships
  for (const node of nodeMap.values()) {
    if (node.reportsToId === null || !nodeMap.has(node.reportsToId)) {
      roots.push(node);
    } else {
      nodeMap.get(node.reportsToId)!.children.push(node);
    }
  }

  return roots;
}

function getDefaultExpanded(nodes: OrgTreeNode[], depth: number, maxDepth: number): Set<string> {
  const expanded = new Set<string>();
  if (depth >= maxDepth) return expanded;
  for (const node of nodes) {
    if (node.children.length > 0) {
      expanded.add(node.id);
      const childExpanded = getDefaultExpanded(node.children, depth + 1, maxDepth);
      childExpanded.forEach((id) => expanded.add(id));
    }
  }
  return expanded;
}

interface OrgNodeProps {
  node: OrgTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  healthMap: Map<string, HealthGrade>;
}

function OrgNode({ node, depth, expanded, onToggle, healthMap }: OrgNodeProps) {
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isManager = MANAGER_ROLES.has(node.role);
  const healthGrade = healthMap.get(node.id);

  function handleNameClick() {
    if (isManager) {
      void navigate(`/observatory/team/${node.id}`);
    }
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation();
    onToggle(node.id);
  }

  const roleVariant = (() => {
    switch (node.role) {
      case 'EXECUTIVE': return 'red';
      case 'VP': return 'strategic';
      case 'DIRECTOR': return 'operational';
      case 'MANAGER': return 'yellow';
      case 'ANALYST': return 'blue';
      default: return 'gray';
    }
  })() as 'red' | 'strategic' | 'operational' | 'yellow' | 'blue' | 'gray';

  return (
    <li>
      <div
        className={[
          'flex items-center gap-2 py-1.5 px-2 rounded-md group',
          isManager
            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            : '',
        ].join(' ')}
        style={{ paddingLeft: `${(depth * 24) + 8}px` }}
        onClick={isManager ? handleNameClick : undefined}
        role={isManager ? 'button' : undefined}
        tabIndex={isManager ? 0 : undefined}
        onKeyDown={isManager ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleNameClick(); } : undefined}
        aria-label={isManager ? `Navigate to ${node.displayName}'s team` : undefined}
      >
        {/* Expand/collapse chevron */}
        <button
          type="button"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          className={[
            'w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500',
            hasChildren ? 'hover:text-gray-700 dark:hover:text-gray-300' : 'invisible',
          ].join(' ')}
          onClick={hasChildren ? handleChevronClick : undefined}
          tabIndex={hasChildren ? 0 : -1}
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Name */}
        <span
          className={[
            'text-sm font-medium flex-1 min-w-0 truncate',
            isManager
              ? 'text-blue-700 dark:text-blue-400 group-hover:underline'
              : 'text-gray-800 dark:text-gray-200',
          ].join(' ')}
        >
          {node.displayName}
        </span>

        {/* Role badge */}
        <Badge variant={roleVariant} className="flex-shrink-0 capitalize">
          {node.role.toLowerCase()}
        </Badge>

        {/* Health grade dot — only for managers with data */}
        {isManager && (
          <span
            className={[
              'w-2.5 h-2.5 rounded-full flex-shrink-0',
              healthGrade ? healthDotClass(healthGrade) : 'bg-gray-300 dark:bg-gray-600',
            ].join(' ')}
            title={healthGrade ? `Health: ${healthGrade}` : 'No health data'}
            aria-label={healthGrade ? `Health grade: ${healthGrade}` : 'No health data'}
          />
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul role="group" aria-label={`${node.displayName}'s reports`}>
          {node.children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              healthMap={healthMap}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartView() {
  const orgTreeQuery = useQuery({
    queryKey: ['users', 'org-tree'],
    queryFn: getOrgTree,
    staleTime: 60_000,
  });

  const healthQuery = useExecutiveHealth();

  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const roots = orgTreeQuery.data ? buildTree(orgTreeQuery.data) : [];

  // Initialise expanded set once tree is available
  const effectiveExpanded: Set<string> = expanded ?? (roots.length > 0
    ? getDefaultExpanded(roots, 0, DEFAULT_EXPAND_DEPTH)
    : new Set<string>());

  // Build a managerId → HealthGrade lookup from executive health
  const healthMap = new Map<string, HealthGrade>();
  if (healthQuery.data) {
    for (const unit of healthQuery.data.units) {
      healthMap.set(unit.managerId, unit.grade);
    }
  }

  function handleToggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev ?? effectiveExpanded);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (orgTreeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" label="Loading org chart…" />
      </div>
    );
  }

  if (orgTreeQuery.isError || !orgTreeQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-sm text-red-700 dark:text-red-400">
        Failed to load org chart. Please refresh and try again.
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No users found in this organisation.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Org Chart</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click a manager to view their team&apos;s health
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true" />
          Green health
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
          Yellow health
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden="true" />
          Red health
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          No data
        </div>
      </div>

      <ul role="tree" aria-label="Organisation hierarchy">
        {roots.map((node) => (
          <OrgNode
            key={node.id}
            node={node}
            depth={0}
            expanded={effectiveExpanded}
            onToggle={handleToggle}
            healthMap={healthMap}
          />
        ))}
      </ul>
    </div>
  );
}
