import { describe, it, expect } from 'vitest';
import { buildVPGroups } from '../VPSection';
import type { OrgUnitHealth } from '@/types';
import type { User } from '@/types/user.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeUnit(overrides: Partial<OrgUnitHealth> & { managerId: string }): OrgUnitHealth {
  return {
    managerId: overrides.managerId,
    managerName: overrides.managerName ?? `Manager ${overrides.managerId}`,
    role: overrides.role ?? 'MANAGER',
    headcount: overrides.headcount ?? 5,
    costBandWeightedHeadcount: overrides.costBandWeightedHeadcount ?? 5,
    grade: overrides.grade ?? 'GREEN',
    strategicAlignmentPct: overrides.strategicAlignmentPct ?? 60,
    operationalPct: overrides.operationalPct ?? 25,
    defensivePct: overrides.defensivePct ?? 10,
    capabilityBuildingPct: overrides.capabilityBuildingPct ?? 5,
    rallyCoveragePct: overrides.rallyCoveragePct ?? 70,
    completionRate: overrides.completionRate ?? 80,
    trendDirection: overrides.trendDirection ?? 'FLAT',
    weeksTrending: overrides.weeksTrending ?? 1,
  };
}

function makeUser(id: string, role: User['role'], reportsTo: string | null = null, displayName?: string): User {
  return {
    id,
    email: `${id}@example.com`,
    displayName: displayName ?? `User ${id}`,
    role,
    reportsTo,
    reportsToDisplayName: null,
    isActive: true,
    costBandId: null,
    costBandName: null,
    costBandTier: null,
    weeklyCapacityHours: null,
  };
}

// ─── Tests: empty / null inputs ───────────────────────────────────────────────

describe('buildVPGroups — empty inputs', () => {
  it('returns a single All Teams group with empty managers when units is empty and orgTree is undefined', () => {
    // No VP units → __all__ fallback group, but nonVps is empty so managers = []
    const result = buildVPGroups([], undefined);
    expect(result).toHaveLength(1);
    expect(result[0]!.vpId).toBe('__all__');
    expect(result[0]!.managers).toHaveLength(0);
  });

  it('returns an empty array when units is empty and orgTree is non-empty', () => {
    // orgTree branch: no units → no groups built
    const orgTree: User[] = [makeUser('vp1', 'VP', null, 'VP Alice')];
    const result = buildVPGroups([], orgTree);
    expect(result).toEqual([]);
  });

  it('returns a single All-Teams group when there are managers but no VP units and no orgTree', () => {
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 60 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 40 }),
    ];
    const result = buildVPGroups(units, undefined);
    expect(result).toHaveLength(1);
    expect(result[0]!.vpId).toBe('__all__');
    expect(result[0]!.vpName).toBe('All Teams');
    expect(result[0]!.managers).toHaveLength(2);
  });
});

// ─── Tests: no orgTree, VP units present ──────────────────────────────────────

describe('buildVPGroups — no orgTree, VP units present', () => {
  it('creates one VP header group per VP unit (with empty managers) and one All Teams bucket for non-VPs', () => {
    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 70, grade: 'GREEN', trendDirection: 'IMPROVING', managerName: 'VP Alice' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 55 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 30 }),
    ];
    // Without orgTree, VP header groups get no managers. All non-VPs go to __all_teams__.
    const result = buildVPGroups(units, undefined);
    // VP group with 0 managers is filtered out, so only the All Teams bucket remains
    const allTeams = result.find((g) => g.vpId === '__all_teams__');
    expect(allTeams).toBeDefined();
    expect(allTeams!.managers).toHaveLength(2);
  });

  it('excludes EXECUTIVE units from all groups', () => {
    const units = [
      makeUnit({ managerId: 'exec1', role: 'EXECUTIVE', strategicAlignmentPct: 80 }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 50 }),
    ];
    const result = buildVPGroups(units, undefined);
    const allManagers = result.flatMap((g) => g.managers);
    const execUnit = allManagers.find((u) => u.managerId === 'exec1');
    expect(execUnit).toBeUndefined();
  });

  it('grades the All Teams group using gradeFromAlignment with defaults (target=50, warning=30)', () => {
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 55 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 57 }),
    ];
    // avg = 56 >= 50 → GREEN
    const result = buildVPGroups(units, undefined, 50, 30);
    expect(result[0]!.vpGrade).toBe('GREEN');
  });

  it('grades YELLOW when avg is between warningPct and alignmentTarget', () => {
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 35 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 37 }),
    ];
    // avg = 36 — between 30 (warning) and 50 (target) → YELLOW
    const result = buildVPGroups(units, undefined, 50, 30);
    expect(result[0]!.vpGrade).toBe('YELLOW');
  });

  it('grades RED when avg is below warningPct', () => {
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 10 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 20 }),
    ];
    // avg = 15 < 30 → RED
    const result = buildVPGroups(units, undefined, 50, 30);
    expect(result[0]!.vpGrade).toBe('RED');
  });
});

// ─── Tests: with orgTree ──────────────────────────────────────────────────────

describe('buildVPGroups — with orgTree', () => {
  it('groups managers under their VP by walking reportsTo chain', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'Alice VP'),
      makeUser('dir1', 'DIRECTOR', 'vp1', 'Bob Director'),
      makeUser('m1', 'MANAGER', 'dir1', 'Carol Manager'),
    ];

    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 70, grade: 'GREEN', trendDirection: 'FLAT', managerName: 'Alice VP' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 55, managerName: 'Carol Manager' }),
    ];

    const result = buildVPGroups(units, orgTree);
    const vpGroup = result.find((g) => g.vpId === 'vp1');
    expect(vpGroup).toBeDefined();
    expect(vpGroup!.vpName).toBe('Alice VP');
    expect(vpGroup!.managers).toHaveLength(1);
    expect(vpGroup!.managers[0]!.managerId).toBe('m1');
  });

  it('assigns ungrouped managers to an Other Teams bucket when no VP ancestor is found', () => {
    const orgTree: User[] = [
      makeUser('m1', 'MANAGER', null), // no VP ancestor
    ];

    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 45 }),
    ];

    const result = buildVPGroups(units, orgTree);
    const ungrouped = result.find((g) => g.vpId === '__ungrouped__');
    expect(ungrouped).toBeDefined();
    expect(ungrouped!.vpName).toBe('Other Teams');
    expect(ungrouped!.managers).toHaveLength(1);
  });

  it('sorts groups RED first, then YELLOW, then GREEN', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Red'),
      makeUser('vp2', 'VP', null, 'VP Green'),
      makeUser('vp3', 'VP', null, 'VP Yellow'),
      makeUser('m1', 'MANAGER', 'vp1'),
      makeUser('m2', 'MANAGER', 'vp2'),
      makeUser('m3', 'MANAGER', 'vp3'),
    ];

    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 15, grade: 'RED', trendDirection: 'FLAT', managerName: 'VP Red' }),
      makeUnit({ managerId: 'vp2', role: 'VP', strategicAlignmentPct: 70, grade: 'GREEN', trendDirection: 'FLAT', managerName: 'VP Green' }),
      makeUnit({ managerId: 'vp3', role: 'VP', strategicAlignmentPct: 38, grade: 'YELLOW', trendDirection: 'FLAT', managerName: 'VP Yellow' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 15 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 70 }),
      makeUnit({ managerId: 'm3', strategicAlignmentPct: 38 }),
    ];

    const result = buildVPGroups(units, orgTree, 50, 30);
    expect(result[0]!.vpGrade).toBe('RED');
    expect(result[1]!.vpGrade).toBe('YELLOW');
    expect(result[2]!.vpGrade).toBe('GREEN');
  });

  it('sorts managers within each VP group by ascending strategicAlignmentPct', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Alice'),
      makeUser('m1', 'MANAGER', 'vp1'),
      makeUser('m2', 'MANAGER', 'vp1'),
      makeUser('m3', 'MANAGER', 'vp1'),
    ];

    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 70, grade: 'GREEN', trendDirection: 'FLAT', managerName: 'VP Alice' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 70 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 30 }),
      makeUnit({ managerId: 'm3', strategicAlignmentPct: 50 }),
    ];

    const result = buildVPGroups(units, orgTree);
    const vpGroup = result.find((g) => g.vpId === 'vp1')!;
    const alignments = vpGroup.managers.map((m) => m.strategicAlignmentPct);
    expect(alignments).toEqual([30, 50, 70]);
  });

  it('uses VP unit grade and trendDirection when the VP also has an OrgUnitHealth entry', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Alice'),
      makeUser('m1', 'MANAGER', 'vp1'),
    ];

    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 20, grade: 'RED', trendDirection: 'DECLINING', managerName: 'VP Alice' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 55 }),
    ];

    const result = buildVPGroups(units, orgTree, 50, 30);
    const vpGroup = result.find((g) => g.vpId === 'vp1')!;
    expect(vpGroup.vpGrade).toBe('RED');
    expect(vpGroup.vpTrend).toBe('DECLINING');
    expect(vpGroup.vpAlignment).toBe(20);
  });

  it('falls back to computed grade when VP has no OrgUnitHealth entry', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Bob'),
      makeUser('m1', 'MANAGER', 'vp1'),
    ];

    // VP not in units list → no OrgUnitHealth entry
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 60 }),
    ];

    const result = buildVPGroups(units, orgTree, 50, 30);
    const vpGroup = result.find((g) => g.vpId === 'vp1')!;
    // avg of managers = 60 >= 50 → GREEN
    expect(vpGroup.vpGrade).toBe('GREEN');
    expect(vpGroup.vpTrend).toBe('FLAT');
  });

  it('handles a director-level intermediary correctly (manager reports to director who reports to VP)', () => {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Carol'),
      makeUser('dir1', 'DIRECTOR', 'vp1', 'Dir Dave'),
      makeUser('m1', 'MANAGER', 'dir1'),
      makeUser('m2', 'MANAGER', 'dir1'),
    ];

    const units = [
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 65, grade: 'GREEN', trendDirection: 'FLAT', managerName: 'VP Carol' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 60 }),
      makeUnit({ managerId: 'm2', strategicAlignmentPct: 50 }),
    ];

    const result = buildVPGroups(units, orgTree);
    const vpGroup = result.find((g) => g.vpId === 'vp1')!;
    expect(vpGroup.managers).toHaveLength(2);
    expect(vpGroup.managers.map((m) => m.managerId).sort()).toEqual(['m1', 'm2'].sort());
  });

  it('does not include VP or EXECUTIVE units as managers in any group', () => {
    const orgTree: User[] = [
      makeUser('exec1', 'EXECUTIVE', null),
      makeUser('vp1', 'VP', 'exec1', 'VP Eve'),
      makeUser('m1', 'MANAGER', 'vp1'),
    ];

    const units = [
      makeUnit({ managerId: 'exec1', role: 'EXECUTIVE', strategicAlignmentPct: 80 }),
      makeUnit({ managerId: 'vp1', role: 'VP', strategicAlignmentPct: 70, grade: 'GREEN', trendDirection: 'FLAT', managerName: 'VP Eve' }),
      makeUnit({ managerId: 'm1', strategicAlignmentPct: 60 }),
    ];

    const result = buildVPGroups(units, orgTree);
    const allManagers = result.flatMap((g) => g.managers);
    expect(allManagers.every((m) => m.role !== 'VP' && m.role !== 'EXECUTIVE')).toBe(true);
  });
});

// ─── Tests: alignment coloring thresholds ────────────────────────────────────

describe('buildVPGroups — alignment thresholds with orgTree', () => {
  function singleVPSetup(strategicAlignmentPct: number) {
    const orgTree: User[] = [
      makeUser('vp1', 'VP', null, 'VP Alice'),
      makeUser('m1', 'MANAGER', 'vp1'),
    ];
    const units = [
      makeUnit({ managerId: 'm1', strategicAlignmentPct }),
    ];
    return buildVPGroups(units, orgTree, 50, 30);
  }

  it('computed VP grade is GREEN at alignmentTarget boundary (=50)', () => {
    const result = singleVPSetup(50);
    expect(result[0]!.vpGrade).toBe('GREEN');
  });

  it('computed VP grade is YELLOW just below target (49)', () => {
    const result = singleVPSetup(49);
    expect(result[0]!.vpGrade).toBe('YELLOW');
  });

  it('computed VP grade is YELLOW at warningPct boundary (=30)', () => {
    const result = singleVPSetup(30);
    expect(result[0]!.vpGrade).toBe('YELLOW');
  });

  it('computed VP grade is RED just below warningPct (29)', () => {
    const result = singleVPSetup(29);
    expect(result[0]!.vpGrade).toBe('RED');
  });

  it('computed VP grade is RED at zero alignment', () => {
    const result = singleVPSetup(0);
    expect(result[0]!.vpGrade).toBe('RED');
  });
});
