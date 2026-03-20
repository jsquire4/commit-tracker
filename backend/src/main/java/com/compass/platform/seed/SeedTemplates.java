package com.compass.platform.seed;

import com.compass.platform.domain.DisplacementCategory;

import java.util.Map;

/**
 * Pure static data constants for the observatory seed generator.
 * No logic — only arrays and maps.
 */
public final class SeedTemplates {

    private SeedTemplates() {}

    // ── Names ─────────────────────────────────────────────────────────────────

    public static final String[] FIRST_NAMES = {
        "James", "Maria", "David", "Sarah", "Michael", "Jennifer", "Robert", "Lisa",
        "William", "Patricia", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Susan",
        "Charles", "Jessica", "Christopher", "Karen", "Daniel", "Nancy", "Matthew", "Betty",
        "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Dorothy",
        "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kenneth", "Michelle",
        "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah",
        "Jason", "Stephanie", "Ryan", "Rebecca", "Eric", "Sharon", "Scott", "Laura",
        "Adam", "Cynthia", "John", "Kathleen", "Megan", "Amy", "Jack", "Angela",
        "Sean", "Catherine", "Tyler", "Christine", "Aaron", "Samantha", "Zachary", "Heather",
        "Nathan", "Diane", "Samuel", "Rachel", "Patrick", "Anna", "Alex", "Maria",
        "Lucas", "Hannah", "Dylan", "Emma", "Ethan", "Olivia", "Noah", "Ava",
        "Liam", "Isabella", "Logan", "Sophia", "Mason", "Mia", "Hunter", "Charlotte",
        "Jordan", "Grace", "Devon", "Claire", "Blake", "Maya", "Avery", "Nora"
    };

    public static final String[] LAST_NAMES = {
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
        "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
        "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
        "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
        "Carter", "Roberts", "Phillips", "Evans", "Turner", "Torres", "Parker", "Collins",
        "Edwards", "Stewart", "Flores", "Morris", "Nguyen", "Murphy", "Rivera", "Cook",
        "Rogers", "Morgan", "Peterson", "Cooper", "Reed", "Bailey", "Bell", "Gomez",
        "Kelly", "Howard", "Ward", "Cox", "Diaz", "Richardson", "Wood", "Watson",
        "Brooks", "Bennett", "Gray", "James", "Reyes", "Cruz", "Hughes", "Price",
        "Myers", "Long", "Foster", "Sanders", "Ross", "Morales", "Powell", "Sullivan",
        "Russell", "Ortiz", "Jenkins", "Gutierrez", "Perry", "Butler", "Barnes", "Fisher"
    };

    // ── Commitment title templates by chess category ───────────────────────────

    public static final Map<String, String[]> COMMITMENT_TITLE_TEMPLATES = Map.of(
        "Strategic", new String[]{
            "Define Q%d strategic priorities and communicate to team",
            "Draft 3-year capability roadmap for %s function",
            "Evaluate build-vs-buy decision for %s platform",
            "Present competitive landscape analysis to leadership",
            "Develop partnership framework with key external stakeholders",
            "Align cross-functional teams on annual objectives",
            "Conduct strategic review of %s initiative progress",
            "Identify top 3 growth opportunities for H%d planning",
            "Build business case for %s investment",
            "Facilitate leadership offsite agenda and outcomes",
            "Review and update org strategy map with current data",
            "Benchmark our %s performance against industry peers"
        },
        "Operational", new String[]{
            "Complete weekly %s status report for leadership",
            "Resolve open items from last %s review",
            "Update %s process documentation with latest changes",
            "Run %s team standup and capture action items",
            "Coordinate cross-team handoff for %s deliverable",
            "Review and approve pending %s requests",
            "Execute %s audit checklist for Q%d",
            "Close out %s backlog items before end of cycle",
            "Prepare %s metrics dashboard for weekly review",
            "Follow up on outstanding approvals for %s project",
            "Triage and prioritize %s team inbox",
            "Finalize %s schedule and distribute to stakeholders"
        },
        "Defensive", new String[]{
            "Complete compliance review for %s requirements",
            "Update risk register with %s findings",
            "Conduct security assessment of %s system",
            "Address audit findings for %s process",
            "Review and renew %s vendor contracts",
            "Ensure data retention policy compliance for %s",
            "Document incident response plan for %s failure scenario",
            "Complete mandatory %s training certification",
            "Validate disaster recovery runbook for %s environment",
            "Review access controls for %s system",
            "Submit regulatory filing for %s compliance period",
            "Test and validate backup procedures for %s"
        },
        "Capability Building", new String[]{
            "Complete training on %s methodology and certify",
            "Build internal knowledge base for %s domain",
            "Run lunch-and-learn on %s best practices",
            "Prototype %s tooling improvement for team efficiency",
            "Document and share lessons learned from %s project",
            "Develop onboarding guide for %s function",
            "Create reusable template library for %s deliverables",
            "Evaluate and pilot new %s tooling for the team",
            "Establish %s community of practice within the org",
            "Mentor junior team member on %s skills",
            "Implement automated testing for %s workflow",
            "Consolidate scattered %s knowledge into central resource"
        }
    );

    // Topic fillers used in title templates
    public static final String[] TOPIC_FILLERS = {
        "production", "quality", "logistics", "finance", "procurement",
        "operations", "engineering", "data", "customer", "supply chain",
        "vendor", "reporting", "safety", "IT", "HR"
    };

    // ── Reconciliation note templates ─────────────────────────────────────────

    public static final String[] RECONCILIATION_NOTE_TEMPLATES = {
        "Completed as planned. All deliverables submitted on time.",
        "Finished ahead of schedule. Shared output with stakeholders.",
        "Done. Encountered minor delays but resolved before deadline.",
        "Completed. Final review took longer than expected but approved.",
        "Partial completion — core work done, follow-up items tracked separately.",
        "Mostly done. One dependency blocked final step; carrying remainder forward.",
        "Significant progress made. Blocked by third-party response; carrying forward.",
        "About 50% complete. Scope was larger than anticipated — adjusting plan.",
        "Unable to start due to priority conflict. Rescheduled for next cycle.",
        "Not started — resource constraint prevented any progress this week.",
        "Deprioritized by leadership request. Will revisit pending bandwidth.",
        "Carried forward due to production emergency consuming team capacity.",
        "Scope clarified mid-week; restarting with updated requirements next cycle.",
        "Waiting on input from cross-functional partner. Blocking completion.",
        "Completed core deliverable; documentation and sign-off remain outstanding.",
        "Delivered draft; feedback incorporated and resubmitted for final approval.",
        "Task completed but revealed follow-on work — logged as new commitment.",
        "All action items closed. No issues to report.",
        "Good progress. Remaining items are minor and will clear early next week."
    };

    // ── Displacement detail templates ─────────────────────────────────────────

    public static final Map<DisplacementCategory, String[]> DISPLACEMENT_TEMPLATES = Map.of(
        DisplacementCategory.MANAGER_REASSIGNED, new String[]{
            "Reassigned to urgent customer escalation by manager",
            "Manager redirected to production line audit",
            "Pulled onto compliance review preparation",
            "Redirected to support onboarding of new team member",
            "Manager assigned to cover colleague absence",
            "Shifted to support executive presentation preparation",
            "Redirected to handle vendor dispute resolution",
            "Manager pulled into emergency budget review",
            "Reassigned to crisis communication response",
            "Directed to lead critical supplier negotiation"
        },
        DisplacementCategory.PRODUCTION_EMERGENCY, new String[]{
            "Line 3 shutdown due to equipment failure",
            "Quality hold on incoming raw materials required full attention",
            "Safety incident investigation consumed full shift",
            "Unplanned downtime on primary assembly line",
            "Critical defect escape required immediate containment response",
            "Supplier shipment delay triggered emergency procurement process",
            "Environmental alert required immediate facility response",
            "Equipment calibration failure halted production run",
            "Customer return event triggered quality containment procedure",
            "Unscheduled maintenance window extended into work hours"
        },
        DisplacementCategory.RESOURCE_BLOCKED, new String[]{
            "Waiting for access provisioning to required system",
            "Dependency on third-party data feed not yet delivered",
            "Blocked on legal review of vendor agreement",
            "Awaiting engineering sign-off that was delayed",
            "Cross-functional partner team at capacity; could not engage",
            "Required tooling license not yet procured",
            "Infrastructure environment not ready for planned work",
            "Blocked on approval from external stakeholder",
            "Data not yet available from upstream team",
            "Could not schedule required review meeting this cycle"
        },
        DisplacementCategory.SCOPE_CHANGE, new String[]{
            "Requirements changed mid-cycle after stakeholder review",
            "Leadership decision changed the target deliverable",
            "Scope expanded significantly after discovery session",
            "Original approach invalidated by new technical constraint",
            "Business priority shifted; work redesigned for new direction",
            "Customer feedback required significant rework",
            "Architecture review introduced new constraints",
            "Regulatory update changed compliance requirements",
            "Merger activity altered organizational priorities",
            "New data invalidated the original work plan"
        },
        DisplacementCategory.DEPRIORITIZED, new String[]{
            "Deprioritized in favor of higher-urgency initiative",
            "Leadership requested reallocation of bandwidth",
            "Other commitments took longer than planned",
            "Project paused pending strategic decision",
            "Bandwidth consumed by unexpected high-priority request",
            "Pushed back due to competing deadline on parallel workstream",
            "Resource reallocation decision by director",
            "Voluntarily deferred to focus on critical path item",
            "Backlog reprioritization moved this item down",
            "Meeting schedule prevented focused work time"
        },
        DisplacementCategory.EXTERNAL_DEPENDENCY, new String[]{
            "Vendor did not deliver required component on schedule",
            "Partner org response delayed beyond expected timeline",
            "Regulatory approval taking longer than anticipated",
            "Third-party integration not yet available",
            "External audit created competing demands on subject matter expert",
            "Customer review cycle extended beyond plan",
            "Contract execution delayed by counterparty",
            "Industry event created competing priority for stakeholders",
            "External consultant unavailable during required window",
            "Upstream system outage blocked dependent work"
        },
        DisplacementCategory.OTHER, new String[]{
            "Unplanned personal circumstance required time away",
            "Training requirement consumed planned work time",
            "Administrative workload higher than typical this cycle",
            "IT issue prevented access to required tools",
            "Unexpected travel requirement altered available capacity",
            "Cross-org request consumed significant bandwidth",
            "Illness reduced available hours this cycle",
            "Weather event impacted facility access",
            "Unexpected internal audit preparation required",
            "System migration created unplanned IT support burden"
        }
    );

    // ── Org narrative strategic % arcs (12 weeks each) ───────────────────────

    /**
     * Strategic % arcs for the 3 orgs across 12 weeks.
     * Index 0 = Meridian (drifting), 1 = Pinnacle (steady), 2 = Atlas (struggling)
     */
    public static final double[][] ORG_NARRATIVES = {
        {78, 75, 72, 68, 62, 55, 50, 48, 45, 47, 52, 58},  // Meridian — drifting
        {68, 70, 67, 72, 69, 71, 68, 70, 73, 71, 69, 72},  // Pinnacle — steady
        {42, 40, 38, 35, 38, 36, 40, 42, 39, 37, 41, 43}   // Atlas — struggling
    };

    // ── RCDO template data per org theme ─────────────────────────────────────

    /** Rally cry titles per org (index 0=Meridian, 1=Pinnacle, 2=Atlas) */
    public static final String[][] RALLY_CRY_TITLES = {
        {"Operational Excellence", "Digital Transformation"},
        {"Logistics Network Optimization", "Customer Experience Leadership"},
        {"Stabilize Core Operations", "Cost Reduction & Efficiency"}
    };

    public static final String[][] RALLY_CRY_DESCRIPTIONS = {
        {
            "Drive manufacturing quality and process efficiency across all production lines.",
            "Modernize core systems and embed intelligent automation into operations."
        },
        {
            "Build the most reliable and cost-effective logistics network in the region.",
            "Deliver industry-leading customer experience at every touchpoint."
        },
        {
            "Establish reliable, predictable baseline operations before scaling further.",
            "Reduce operating costs by 15% through systematic efficiency improvements."
        }
    };

    /** Defining objective titles per org per rally cry */
    public static final String[][][] DO_TITLES = {
        // Meridian
        {
            {"Reduce Scrap Rate", "Streamline QA Process", "Improve OEE to 85%"},
            {"ERP Migration", "AI Quality Inspection", "IoT Shop Floor Connectivity"}
        },
        // Pinnacle
        {
            {"Last-Mile Delivery Optimization", "Warehouse Automation", "Carrier Network Expansion"},
            {"Self-Service Customer Portal", "NPS Improvement Program", "Proactive Exception Management"}
        },
        // Atlas
        {
            {"Stabilize Production Schedule", "Reduce Unplanned Downtime", "Standardize Work Instructions"},
            {"Headcount Cost Optimization", "Energy Cost Reduction", "Procurement Rationalization"}
        }
    };

    /** Outcome titles per org per rally cry per defining objective */
    public static final String[][][][] OUTCOME_TITLES = {
        // Meridian
        {
            {
                {"Line 3 scrap audit complete", "New material spec approved"},
                {"Automated test station live", "QA cycle time reduced by 30%"},
                {"OEE baseline measured", "Top 3 loss categories identified"}
            },
            {
                {"Vendor shortlist finalized", "Data migration plan approved"},
                {"CV model trained on defect dataset", "Pilot line validated"},
                {"Sensor network deployed", "Real-time dashboard live"}
            }
        },
        // Pinnacle
        {
            {
                {"Route optimization algorithm deployed", "Average delivery time reduced"},
                {"Sortation system upgraded", "Pick accuracy above 99.5%"},
                {"3 new carrier contracts signed", "Coverage gap analysis complete"}
            },
            {
                {"Portal beta launched to 20% of customers", "Self-service rate above 40%"},
                {"NPS survey cadence established", "Top 3 detractor themes addressed"},
                {"Exception alert system live", "Proactive contact rate above 80%"}
            }
        },
        // Atlas
        {
            {
                {"Weekly production schedule met for 4 consecutive weeks", "Scheduling process documented"},
                {"Downtime root causes identified", "Preventive maintenance calendar live"},
                {"Work instruction library updated", "Operator certification completed"}
            },
            {
                {"Headcount plan approved by finance", "Org restructure complete"},
                {"Energy audit complete", "3 reduction initiatives underway"},
                {"Supplier consolidation from 180 to 120 vendors", "Contract terms standardized"}
            }
        }
    };
}
