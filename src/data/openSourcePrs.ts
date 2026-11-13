export interface OpenSourcePR {
  number: number;
  title: string;
  repo: string;
  url: string;
  state: "open" | "merged" | "closed";
  date: string;
  isExternal?: boolean;
}

export const GITHUB_PR_SEARCH_URLS = {
  all: "https://github.com/search?q=author%3ASachinyadavAug20+type%3Apr",
  open: "https://github.com/search?q=author%3ASachinyadavAug20+type%3Apr+is%3Aopen",
  merged: "https://github.com/search?q=author%3ASachinyadavAug20+type%3Apr+is%3Amerged",
};

export const OPEN_SOURCE_PRS: OpenSourcePR[] = [
  { number: 1163, title: "[Registry] Propagate Relationships CSV read errors", repo: "meshery/meshkit", url: "https://github.com/meshery/meshkit/pull/1163", state: "merged", date: "2026-11-12", isExternal: true },
  { number: 5579, title: "fix(driver): suppress unknown optimize warning when omitted", repo: "WasmEdge/WasmEdge", url: "https://github.com/WasmEdge/WasmEdge/pull/5579", state: "open", date: "2026-11-12", isExternal: true },
  { number: 17787, title: "Reset canceled state in GenerateCitationKeyAction on execute", repo: "JabRef/jabref", url: "https://github.com/JabRef/jabref/pull/17787", state: "open", date: "2026-11-11", isExternal: true },
  { number: 226, title: "feat(vue): add Vue 3 integration package (@tryabby/vue) (#68)", repo: "tryabby/abby", url: "https://github.com/tryabby/abby/pull/226", state: "open", date: "2026-11-08", isExternal: true },
  { number: 582, title: "fix(vault): normalize Windows subfolder path separators for reference resolution (#274)", repo: "Feel-ix-343/markdown-oxide", url: "https://github.com/Feel-ix-343/markdown-oxide/pull/582", state: "open", date: "2026-11-08", isExternal: true },
  { number: 818, title: "feat(ai): LiteLLM-style Smart Router for OpenAI, Google PaLM, and Cohere (closes #286)", repo: "arakoodev/EdgeChains", url: "https://github.com/arakoodev/EdgeChains/pull/818", state: "open", date: "2026-11-07", isExternal: true },
  { number: 30516, title: "chore(i18n): remove unused Cal.ai voice agent and phone strings", repo: "calcom/cal.diy", url: "https://github.com/calcom/cal.diy/pull/30516", state: "open", date: "2026-11-05", isExternal: true },
  { number: 5422, title: "Add Stalwart Enterprise License 2.0 (SELv2) and fix SELv1 homepage_url", repo: "aboutcode-org/scancode-toolkit", url: "https://github.com/aboutcode-org/scancode-toolkit/pull/5422", state: "open", date: "2026-11-05", isExternal: true },
  { number: 201, title: "docs: clarify EU and API key limitations for VS Code one-click install", repo: "postmanlabs/postman-mcp-server", url: "https://github.com/postmanlabs/postman-mcp-server/pull/201", state: "open", date: "2026-11-05", isExternal: true },
  { number: 17717, title: "Refresh Citations tab when entry DOI changes", repo: "JabRef/jabref", url: "https://github.com/JabRef/jabref/pull/17717", state: "open", date: "2026-11-05", isExternal: true },
  { number: 17039, title: "feat(connectors): add Jira Service Management connector (#2281)", repo: "onyx-dot-app/onyx", url: "https://github.com/onyx-dot-app/onyx/pull/17039", state: "open", date: "2026-11-01", isExternal: true },
  { number: 5400, title: "Add Nordstjernen Source License v1.0 (fixes #5344)", repo: "aboutcode-org/scancode-toolkit", url: "https://github.com/aboutcode-org/scancode-toolkit/pull/5400", state: "open", date: "2026-10-30", isExternal: true },
  { number: 5399, title: "Add rule for proprietary-license detection (fixes #5290)", repo: "aboutcode-org/scancode-toolkit", url: "https://github.com/aboutcode-org/scancode-toolkit/pull/5399", state: "open", date: "2026-10-30", isExternal: true },
  { number: 30434, title: "fix(bookings): send notification emails when calendar integrations fail", repo: "calcom/cal.diy", url: "https://github.com/calcom/cal.diy/pull/30434", state: "merged", date: "2026-10-27", isExternal: true },
  { number: 30408, title: "fix: prevent re-selection of default calendars when unchecking last calendar with existing selections", repo: "calcom/cal.diy", url: "https://github.com/calcom/cal.diy/pull/30408", state: "open", date: "2026-10-25", isExternal: true },
  { number: 29, title: "feat: add institution admin screen for colleges and departments (#9)", repo: "GDGltce/ClubHub", url: "https://github.com/GDGltce/ClubHub/pull/29", state: "open", date: "2026-10-11", isExternal: true },
  { number: 26, title: "feat: add print stylesheet for one-page event briefs (#16)", repo: "GDGltce/ClubHub", url: "https://github.com/GDGltce/ClubHub/pull/26", state: "open", date: "2026-10-10", isExternal: true },
  { number: 21, title: "feat: add club, stage, and date filters to public event list (#13)", repo: "GDGltce/ClubHub", url: "https://github.com/GDGltce/ClubHub/pull/21", state: "open", date: "2026-10-10", isExternal: true },
  { number: 2, title: "Feature/admin panel", repo: "omkarkakkad/3D-quick-crave", url: "https://github.com/omkarkakkad/3D-quick-crave/pull/2", state: "merged", date: "2026-09-27", isExternal: true },
  { number: 1, title: "Feat minimal sachinyadavaug20", repo: "omkarkakkad/3D-quick-crave", url: "https://github.com/omkarkakkad/3D-quick-crave/pull/1", state: "merged", date: "2026-09-19", isExternal: true },
  { number: 4473, title: "Added myself as contributor", repo: "bootdotdev/megacorp", url: "https://github.com/bootdotdev/megacorp/pull/4473", state: "open", date: "2025-12-30", isExternal: true },
  { number: 439, title: "sachin added people names to readme.md", repo: "CommClassroomOP/Community-Classroom-OP", url: "https://github.com/CommClassroomOP/Community-Classroom-OP/pull/439", state: "open", date: "2025-07-31", isExternal: true },
  { number: 6, title: "Mobile", repo: "SachinyadavAug20/ccltce-site", url: "https://github.com/SachinyadavAug20/ccltce-site/pull/6", state: "merged", date: "2026-10-28", isExternal: false },
  { number: 5, title: "Fun", repo: "SachinyadavAug20/ccltce-site", url: "https://github.com/SachinyadavAug20/ccltce-site/pull/5", state: "merged", date: "2026-10-27", isExternal: false },
  { number: 4, title: "Login", repo: "SachinyadavAug20/ccltce-site", url: "https://github.com/SachinyadavAug20/ccltce-site/pull/4", state: "merged", date: "2026-10-27", isExternal: false },
  { number: 3, title: "Feat/roster slowscroll seo", repo: "SachinyadavAug20/ccltce-site", url: "https://github.com/SachinyadavAug20/ccltce-site/pull/3", state: "merged", date: "2026-10-24", isExternal: false },
  { number: 2, title: "Feat/narrative scroll", repo: "SachinyadavAug20/ccltce-site", url: "https://github.com/SachinyadavAug20/ccltce-site/pull/2", state: "merged", date: "2026-10-24", isExternal: false },
  { number: 1, title: "feat: semantic fuzzy search using vector embeddings (Atlas Vector Search)", repo: "SachinyadavAug20/BaseCase", url: "https://github.com/SachinyadavAug20/BaseCase/pull/1", state: "merged", date: "2026-10-18", isExternal: false },
  { number: 2, title: "Update oct 26", repo: "SachinyadavAug20/portfolio", url: "https://github.com/SachinyadavAug20/portfolio/pull/2", state: "merged", date: "2026-10-30", isExternal: false },
  { number: 1, title: "Basic graph features", repo: "SachinyadavAug20/portfolio", url: "https://github.com/SachinyadavAug20/portfolio/pull/1", state: "merged", date: "2026-09-28", isExternal: false },
  { number: 1, title: "feat: responsive aspect-ratio viewport centering and 5-page interaction", repo: "SachinyadavAug20/Termdeck", url: "https://github.com/SachinyadavAug20/Termdeck/pull/1", state: "merged", date: "2026-09-27", isExternal: false },
  { number: 1, title: "Add classics", repo: "SachinyadavAug20/Webflyx", url: "https://github.com/SachinyadavAug20/Webflyx/pull/1", state: "open", date: "2025-12-30", isExternal: false },
];
