// Plain-language explanations for every metric and term shown in the UI.
// `def`  = what it is.  `read` = how to interpret it.

export const GLOSSARY = {
  /* ---------- Top-level metrics ---------- */
  people: {
    term: "People",
    def: "Every individual record in the people file — each one becomes a node (dot) in the contact graph.",
    read: "This is the population being studied, not the number of infected people.",
  },
  contacts: {
    term: "Contact events",
    def: "A recorded interaction between two people (a row in the contacts file). Two people who met once produce one contact event.",
    read: "More contact events usually means the population mixes more, which can spread infection faster.",
  },
  visits: {
    term: "Visit events",
    def: "A recorded visit by one person to one location at a point in time (a row in the visits file).",
    read: "Visits link people to places — this is how we find hotspots.",
  },
  locations: {
    term: "Locations",
    def: "Distinct places (schools, workplaces, markets…) that people visited.",
    read: "Each location is scored for how strongly it is associated with identified cases.",
  },
  cases: {
    term: "Identified cases",
    def: "People whose infection status is a confirmed/suspected case, as recorded in the data.",
    read: "This is the source of truth for 'who is a case' — the model never invents cases.",
  },
  prevalence: {
    term: "Prevalence",
    def: "Identified cases divided by the whole population — the share of people who are known cases.",
    read: "e.g. 19% means roughly 1 in 5 people in the data is a recorded case.",
  },
  hotspotsFlagged: {
    term: "Hotspots flagged",
    def: "Locations whose share of case visitors crossed the risk thresholds (Rule 5): ≥30% = high, ≥15% = moderate association.",
    read: "Flagged locations deserve attention, but a high share is an association, not proof the place caused infection.",
  },
  auc: {
    term: "Model AUC (ROC-AUC)",
    def: "A 0–1 score for how well the risk model separates cases from non-cases. 0.5 = random guessing, 1.0 = perfect.",
    read: "0.80+ is strong, 0.70–0.80 is fair, near 0.50 is barely better than chance.",
  },
  highestRisk: {
    term: "Highest risk",
    def: "The single person with the largest model-predicted risk score, and that score (0–1).",
    read: "A high score flags someone the model thinks is more likely to be a case — it is a signal to review, not a diagnosis.",
  },

  /* ---------- Network / graph ---------- */
  degreeCentrality: {
    term: "Degree centrality",
    def: "How many direct contacts a person has, scaled to a 0–1 score (their contacts ÷ the maximum possible).",
    read: "Higher = more connected. These people are 'hubs' who could spread or receive infection widely.",
  },
  betweennessCentrality: {
    term: "Betweenness centrality",
    def: "How often a person sits on the shortest path between other people — a 0–1 'bridge' score.",
    read: "Higher = more of a connector between otherwise separate groups. Bridges are valuable points to monitor because they link clusters.",
  },
  giantComponent: {
    term: "Giant component",
    def: "The largest group of people who are all connected to each other, directly or through others.",
    read: "If this is close to 100%, almost everyone is in one connected web, so a spread can travel across the whole population.",
  },
  components: {
    term: "Connected components",
    def: "Separate islands in the contact graph. Two people in different components have no chain of contacts linking them.",
    read: "More components = a more fragmented population, which can slow a widespread outbreak.",
  },
  isolatedNodes: {
    term: "Isolated nodes",
    def: "People with no recorded contacts at all — they appear in the people file but have no edges.",
    read: "They cannot be reached through the contact network, so they are best handled by other (e.g. location-based) means.",
  },
  density: {
    term: "Density",
    def: "The share of all possible person-to-person links that actually exist (0 = nobody knows anybody, 1 = everyone is linked).",
    read: "Real contact networks are usually sparse; a small rise in density can mean much more mixing.",
  },
  hub: {
    term: "Hub",
    def: "A person with an unusually high number of direct contacts (high degree).",
    read: "Hubs are efficient places to focus testing or information because they touch many people.",
  },
  bridge: {
    term: "Bridge",
    def: "A person who connects otherwise separate groups (high betweenness).",
    read: "Removing/isolating a bridge can split the network, but it can also be a fair, targeted advisory point.",
  },
  egoNetwork: {
    term: "Ego network",
    def: "One person plus everyone they directly contacted, and the links among them.",
    read: "This is the focused view you get after picking a person in the Node inspector.",
  },
  liveTraffic: {
    term: "Live traffic",
    def: "The animated orange dots travelling along edges — a visual cue for contact flow, not real-time tracking.",
    read: "It is an illustration of connections, not live surveillance data.",
  },

  /* ---------- Infection status ---------- */
  statusConfirmed: { term: "Confirmed", def: "A person with a confirmed infection record." },
  statusSuspected: { term: "Suspected", def: "A person flagged as a suspected case but not confirmed." },
  statusRecovered: { term: "Recovered", def: "A past case who has since recovered." },
  statusNotIdentified: { term: "Not identified", def: "No case status recorded — most people in a dataset." },
  statusUnknown: { term: "Unknown", def: "Status explicitly recorded as unknown." },

  /* ---------- Data quality ---------- */
  completeness: {
    term: "Completeness",
    def: "The share of required values that are actually present (no blanks) across all records.",
    read: "Higher is better. Below ~80% means many gaps may weaken the analysis.",
  },
  missingValues: {
    term: "Missing values",
    def: "The total count of blank or absent fields across all datasets.",
  },
  duplicateRecords: {
    term: "Duplicate records",
    def: "Rows that repeat existing records and were automatically de-duplicated.",
  },
  cleanRecords: {
    term: "Duplicate-free records",
    def: "How many records remained after removing duplicates (clean out of total).",
  },
  privacyAudit: {
    term: "Privacy audit",
    def: "An automatic scan confirming no direct personal identifiers (names, phone numbers, exact addresses) appear in the data.",
    read: "100% means the pipeline found no personally identifying information.",
  },

  /* ---------- Model / ML ---------- */
  accuracy: {
    term: "Accuracy",
    def: "Overall share of predictions the model got right (both classes).",
    read: "Can be misleading when classes are imbalanced — always read it next to precision and recall.",
  },
  precision: {
    term: "Precision",
    def: "Of the people the model labelled as cases, the share that really are cases.",
    read: "High precision = few false alarms.",
  },
  recall: {
    term: "Recall",
    def: "Of all the real cases, the share the model successfully found.",
    read: "High recall = few missed cases. Precision and recall usually trade off.",
  },
  f1: {
    term: "F1 score",
    def: "The balance between precision and recall (their harmonic mean), 0–1.",
    read: "A single number for overall model quality when both false alarms and misses matter.",
  },
  cvF1: {
    term: "CV F1 ± σ",
    def: "Cross-validated F1 — the model is retrained on several data folds and scored each time. σ is the variation across folds.",
    read: "A small σ means the model performs consistently, not by luck on one split.",
  },
  confusionMatrix: {
    term: "Confusion matrix",
    def: "A 2×2 table of model outcomes: TN (correctly not-case), FP (false alarm), FN (missed case), TP (correctly case).",
    read: "This shows exactly how the model errs on held-out data.",
  },
  featureImportance: {
    term: "Feature importance",
    def: "How much each input signal (e.g. degree, contacts with cases) influenced the model's decisions.",
    read: "Longer bar = the model relies on it more. It explains the model, not causation.",
  },
  targetLeakage: {
    term: "Target leakage",
    def: "A mistake where the model is accidentally given the answer it is meant to predict, faking great scores.",
    read: "The pipeline verifies 'no leakage' so the reported performance is honest.",
  },
  randomForest: {
    term: "Random Forest",
    def: "A model that combines many decision trees and votes to make a more stable prediction.",
    read: "Chosen because it handles mixed data well and is explainable via feature importance.",
  },
  holdout: {
    term: "Holdout set",
    def: "A portion of data the model never trains on, used only to test how well it generalises.",
    read: "Scores on the holdout are the trustworthy ones.",
  },
  positivePrevalence: {
    term: "Positive prevalence",
    def: "The share of positive (case) examples in the training target. A baseline for judging the model.",
    read: "If 20% are cases, a model must clearly beat 20% to be useful.",
  },
  riskScore: {
    term: "Predicted risk",
    def: "The model's estimated probability (0–1) that a person is a case, based purely on network features.",
    read: "A ranking tool to prioritise review — never a medical diagnosis.",
  },
  riskTier: {
    term: "Risk tier",
    def: "The risk score grouped into Low / Moderate / High bands for easy reading.",
  },
  caseContacts: {
    term: "Contacts with confirmed cases",
    def: "How many of this person's direct contacts are identified cases.",
    read: "A network-based signal of exposure — it counts connections to cases, not proof of transmission.",
  },
  highAssocVisits: {
    term: "Visits to high-association locations",
    def: "How many times this person visited places flagged as high-association hotspots.",
    read: "Frequent visits to high-association sites raise the network-based risk signal.",
  },
  contactCount: {
    term: "Number of contacts",
    def: "The raw count of direct contacts a person has (degree, not scaled).",
  },
  totalDuration: {
    term: "Total contact time",
    def: "The summed duration of all of a person's recorded contacts.",
    read: "Longer cumulative contact time can mean closer or more sustained interaction.",
  },

  /* ---------- Locations ---------- */
  uniqueVisitors: {
    term: "Unique visitors",
    def: "The number of distinct people who visited a location at least once.",
  },
  uniqueCaseVisitors: {
    term: "Case visitors",
    def: "The number of distinct identified cases who visited the location.",
  },
  caseShare: {
    term: "Case share (case-visitor association)",
    def: "Case visitors divided by the identified-case cohort (Rule 6) — the share of all cases that passed through here.",
    read: "≥30% is high association, ≥15% moderate. It is an association signal, not proof the place spread infection.",
  },
  highAssociation: { term: "High association", def: "≥30% of the identified-case cohort visited here (Rule 5)." },
  moderateAssociation: { term: "Moderate association", def: "15–30% of the identified-case cohort visited here (Rule 5)." },
  lowAssociation: { term: "Low association", def: "Below 15% of the identified-case cohort visited here." },
  insufficientData: { term: "Insufficient data", def: "Too few visits recorded to score this location reliably." },
  rule5: {
    term: "Rule 5 thresholds",
    def: "The fixed cut-offs used to classify location exposure: ≥30% high, ≥15% moderate case-visitor share.",
    read: "Fixed thresholds keep classification consistent across different datasets.",
  },
  rule6: {
    term: "Rule 6 — cohort basis",
    def: "Location share is computed against the identified-case cohort, not all visitors, so it stays comparable between datasets.",
  },

  /* ---------- Validation ---------- */
  validationPass: { term: "PASS", def: "The dataset satisfies this structural or quality check." },
  validationWarning: {
    term: "WARNING",
    def: "A non-blocking issue (e.g. a few odd rows). The analysis continues but the finding is worth noting.",
  },
  validationError: {
    term: "ERROR",
    def: "A blocking problem (e.g. a missing required column); the analysis cannot trust this input.",
  },
  validationHealth: {
    term: "Validation health",
    def: "The share of all integrity checks that passed, across every validation layer.",
  },
};

export const NODE_STATUS_HELP = {
  Confirmed: "Confirmed case.",
  Suspected: "Suspected case, not yet confirmed.",
  Recovered: "Past case, now recovered.",
  Not_Identified: "No case status recorded.",
  Unknown: "Status recorded as unknown.",
};

export function defOf(id) {
  return GLOSSARY[id] || null;
}
