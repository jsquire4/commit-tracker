import { useNavigate } from 'react-router-dom';
import type { OrgUnitHealth, HealthGrade } from '@/types/observatory.types';
import type { User } from '@/types/user.types';
import { HEALTH_COLORS, HEALTH_TEXT, trendArrow, gradeFromAlignment } from './health.utils';
import { ManagerCard } from './ManagerCard';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VPGroup {
  vpId: string;
  vpName: string;
  vpGrade: HealthGrade;
  vpTrend: string;
  vpAlignment: number;
  managers: OrgUnitHealth[];
}

export interface VPSectionProps {
  group: VPGroup;
  sectionIndex: number;
  sparklineMap: Map<string, { value: number }[]>;
  onSelectTeam?: ((managerId: string) => void) | undefined;
}

// ─── VP Grouping Logic ────────────────────────────────────────────────────────

export function buildVPGroups(
  units: OrgUnitHealth[],
  orgTree: User[] | undefined,
  alignmentTarget = 50,
  warningPct = 30,
): VPGroup[] {
  if (!orgTree || orgTree.length === 0) {
    const vps = units.filter((u) => u.role === 'VP');
    const nonVps = units.filter((u) => u.role !== 'VP' && u.role !== 'EXECUTIVE');

    if (vps.length === 0) {
      return [{
        vpId: '__all__',
        vpName: 'All Teams',
        vpGrade: nonVps.length > 0
          ? gradeFromAlignment(nonVps.reduce((s, u) => s + u.strategicAlignmentPct, 0) / nonVps.length, alignmentTarget, warningPct)
          : 'GREEN',
        vpTrend: 'FLAT',
        vpAlignment: nonVps.length > 0
          ? nonVps.reduce((s, u) => s + u.strategicAlignmentPct, 0) / nonVps.length
          : 0,
        managers: nonVps,
      }];
    }

    // Without an orgTree we cannot walk the reportsTo chain to assign managers to VPs.
    // Fall back to a single "All Teams" bucket for non-VP managers.
    const vpGroupMap = new Map<string, OrgUnitHealth[]>();
    for (const vp of vps) vpGroupMap.set(vp.managerId, []);

    const ungrouped: OrgUnitHealth[] = [];
    for (const mgr of nonVps) {
      // OrgUnitHealth may carry a reportsTo field in future; for now fall back to ungrouped
      ungrouped.push(mgr);
    }

    const result: VPGroup[] = vps.map((vp) => ({
      vpId: vp.managerId,
      vpName: vp.managerName,
      vpGrade: vp.grade,
      vpTrend: vp.trendDirection,
      vpAlignment: vp.strategicAlignmentPct,
      managers: vpGroupMap.get(vp.managerId) ?? [],
    }));

    if (ungrouped.length > 0) {
      const sortedUngrouped = [...ungrouped].sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct);
      const avg = sortedUngrouped.reduce((s, u) => s + u.strategicAlignmentPct, 0) / sortedUngrouped.length;
      result.push({
        vpId: '__all_teams__',
        vpName: 'All Teams',
        vpGrade: gradeFromAlignment(avg, alignmentTarget, warningPct),
        vpTrend: 'FLAT',
        vpAlignment: avg,
        managers: sortedUngrouped,
      });
    }

    // Remove VP header groups that have no managers (they appear as VP cards, not sections)
    return result.filter((g) => g.managers.length > 0);
  }

  const userMap = new Map<string, User>();
  for (const u of orgTree) {
    userMap.set(u.id, u);
  }

  const unitMap = new Map<string, OrgUnitHealth>();
  for (const u of units) {
    unitMap.set(u.managerId, u);
  }

  function findVP(userId: string): User | null {
    const visited = new Set<string>();
    let current = userMap.get(userId);
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (current.role === 'VP') return current;
      if (!current.reportsTo) break;
      current = userMap.get(current.reportsTo);
    }
    return null;
  }

  const vpGroupMap = new Map<string, { vp: User; managers: OrgUnitHealth[] }>();
  const ungrouped: OrgUnitHealth[] = [];

  for (const unit of units) {
    if (unit.role === 'VP' || unit.role === 'EXECUTIVE') continue;

    const vp = findVP(unit.managerId);
    if (vp) {
      if (!vpGroupMap.has(vp.id)) {
        vpGroupMap.set(vp.id, { vp, managers: [] });
      }
      vpGroupMap.get(vp.id)!.managers.push(unit);
    } else {
      ungrouped.push(unit);
    }
  }

  const groups: VPGroup[] = [];

  for (const [vpId, { vp, managers }] of vpGroupMap) {
    const vpUnit = unitMap.get(vpId);
    const avgAlignment = managers.length > 0
      ? managers.reduce((s, m) => s + m.strategicAlignmentPct, 0) / managers.length
      : (vpUnit?.strategicAlignmentPct ?? 0);

    groups.push({
      vpId,
      vpName: vp.displayName,
      vpGrade: vpUnit?.grade ?? gradeFromAlignment(avgAlignment, alignmentTarget, warningPct),
      vpTrend: vpUnit?.trendDirection ?? 'FLAT',
      vpAlignment: vpUnit?.strategicAlignmentPct ?? avgAlignment,
      managers: managers.sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct),
    });
  }

  if (ungrouped.length > 0) {
    const avg = ungrouped.reduce((s, u) => s + u.strategicAlignmentPct, 0) / ungrouped.length;
    groups.push({
      vpId: '__ungrouped__',
      vpName: 'Other Teams',
      vpGrade: gradeFromAlignment(avg, alignmentTarget, warningPct),
      vpTrend: 'FLAT',
      vpAlignment: avg,
      managers: ungrouped.sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct),
    });
  }

  const gradeOrder: Record<HealthGrade, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
  groups.sort((a, b) => gradeOrder[a.vpGrade] - gradeOrder[b.vpGrade]);

  return groups;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VPSection({ group, sectionIndex, sparklineMap, onSelectTeam }: VPSectionProps) {
  const navigate = useNavigate();

  return (
    <div
      className="animate-fade-slide-in"
      style={{
        animationDelay: `${sectionIndex * 120}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* VP header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: HEALTH_COLORS[group.vpGrade] }}
        />
        <h3 className="text-sm font-semibold text-on-surface-variant">
          VP: {group.vpName}
        </h3>
        <span className={`text-sm font-bold ${HEALTH_TEXT[group.vpGrade]}`}>
          ({group.vpGrade === 'GREEN' ? 'High Coverage' : group.vpGrade === 'YELLOW' ? 'Partial Coverage' : 'Low Coverage'} {trendArrow(group.vpTrend)})
        </span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      {/* Manager cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {group.managers.map((unit, i) => (
          <ManagerCard
            key={unit.managerId}
            unit={unit}
            index={sectionIndex * 10 + i}
            sparklineData={sparklineMap.get(unit.managerId) ?? []}
            onClick={() => {
              if (onSelectTeam) {
                onSelectTeam(unit.managerId);
              } else {
                void navigate(`/observatory/team/${unit.managerId}`);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
