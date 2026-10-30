export interface ProjectImage {
  src: string;
  caption: string;
  tag?: string;
}

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  date: string;
  blurb: string;
  description: string;
  architectureDetails: string[];
  techStack: string[];
  image: string; // primary cover image
  images: ProjectImage[];
  url?: string;
  github: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "portfolio-3d-rag",
    title: "Samtagon 3D Portfolio & RAG AI Assistant",
    subtitle: "Interactive 3D Web Experience & Edge RAG Intelligence",
    category: "Full-Stack & 3D Web",
    date: "06/2026 – 08/2026",
    blurb:
      "Interactive 3D web portfolio deployed on Cloudflare Workers featuring a custom RAG + LLM AI Assistant.",
    description:
      "Built an interactive 3D web portfolio deployed on Cloudflare Workers featuring a custom RAG + LLM AI Assistant that answers questions about projects, technical skills, and experience. Engineered dynamic real-time lighting, physics-based animations, live telemetry from GitHub and LeetCode, and a blog engine rendering 347+ markdown notes directly from GitHub.",
    architectureDetails: [
      "Built an interactive 3D web portfolio deployed on Cloudflare Workers featuring a custom RAG + LLM AI Assistant that answers questions about projects, technical skills, and experience.",
      "Engineered dynamic real-time lighting, physics-based animations, and live telemetry from GitHub and LeetCode APIs.",
      "Engineered an Obsidian-driven blog engine rendering 347+ markdown notes directly from GitHub with bidirectional backlinks and knowledge graph routing.",
      "Leveraged React 19, Three.js (R3F & Drei), GSAP timeline physics, and sub-millisecond Cloudflare Workers edge caching.",
    ],
    techStack: [
      "React 19",
      "TypeScript",
      "Three.js (R3F)",
      "GSAP",
      "Tailwind CSS",
      "LLM",
      "RAG",
      "Cloudflare Workers",
    ],
    image: "/images/projects/portfolio-showcase.png",
    images: [
      {
        src: "/images/projects/portfolio-showcase.png",
        caption: "Hero Showcase & 3D Environment",
        tag: "Interactive 3D",
      },
      {
        src: "/images/projects/portfolio-techstack.png",
        caption: "Interactive 3D Tech Stack Physics Models",
        tag: "Three.js / Drei",
      },
      {
        src: "/images/projects/portfolio-timeline.png",
        caption: "GSAP-Driven Experience & Academic Timeline",
        tag: "Animation Engine",
      },
      {
        src: "/images/projects/portfolio-contact.png",
        caption: "Interactive Retro Computer Model & Direct Contact System",
        tag: "3D Retro Computer",
      },
    ],
    url: "/",
    github: "https://github.com/SachinyadavAug20/portfolio",
    featured: true,
  },
  {
    id: "cli-ai-agent",
    title: "CLI AI Coding Agent",
    subtitle: "Terminal-Native Autonomous Coding Agent & Workspace Context Engine",
    category: "AI & Developer Tooling",
    date: "2026",
    blurb:
      "Terminal-based autonomous coding agent executing sandboxed bash commands and modifying source via AST diffs.",
    description:
      "Developed a terminal-based autonomous coding agent that executes sandboxed bash commands, modifies source code via AST diffs, and manages persistent interactive sessions. Engineered an agentic tool-execution loop with @ context indexing across workspace directories to feed precise project context into the LLM.",
    architectureDetails: [
      "Engineered an agentic tool-execution loop with @ context indexing across workspace directories to feed precise project context into the LLM.",
      "Developed autonomous source code modification algorithms powered by AST diffs and semantic patching.",
      "Built sandboxed bash command execution pipelines with real-time process monitoring and human interrupt controls.",
      "Implemented persistent interactive sessions with resume capabilities, command logging, and low-latency OpenTUI React terminal interfaces.",
    ],
    techStack: [
      "TypeScript",
      "Bun",
      "Hono",
      "Google Gemini API",
      "OpenTUI",
      "CLI Architecture",
    ],
    image: "/images/project3.webp",
    images: [
      {
        src: "/images/project3.webp",
        caption: "Terminal Agent Overview & Interactive Command Loop",
        tag: "Overview",
      },
      {
        src: "/images/projects/meow-context.png",
        caption: "@ Context Indexing across workspace files & folders",
        tag: "Context Indexing",
      },
      {
        src: "/images/projects/meow-chat.png",
        caption: "Live AI generation with interactive cancellation and execution loops",
        tag: "Agentic Loop",
      },
      {
        src: "/images/projects/meow-session.png",
        caption: "Persistent session resumption & workspace state recovery",
        tag: "Session State",
      },
      {
        src: "/images/projects/meow-ui.png",
        caption: "Custom interactive OpenTUI theme and keybindings",
        tag: "Terminal UI",
      },
    ],
    url: "https://github.com/SachinyadavAug20/Meow",
    github: "https://github.com/SachinyadavAug20/Meow",
    featured: true,
  },
  {
    id: "horizon-banking",
    title: "Horizon Banking Platform",
    subtitle: "Full-Stack Enterprise Banking Engine with Plaid & Dwolla ACH",
    category: "Full-Stack & Fintech",
    date: "06/2026 – 07/2026",
    blurb:
      "Full-stack banking engine integrating Plaid API for account aggregation and Dwolla API for real-time ACH fund transfers.",
    description:
      "Built a full-stack banking engine integrating Plaid API for multi-account aggregation and Dwolla API for secure real-time ACH fund transfers. Implemented Appwrite serverless session management, transactional activity logging, and responsive financial dashboards with real-time balance inquiries.",
    architectureDetails: [
      "Integrated Plaid API for multi-account aggregation, bank account linking, and balance telemetry.",
      "Engineered secure, real-time ACH fund transfer workflows powered by Dwolla API with idempotency checks.",
      "Implemented Appwrite serverless session management, audit logs, and transaction state tracking.",
      "Built responsive financial dashboards with Chart.js analytics, dynamic category spending summaries, and transaction pagination.",
    ],
    techStack: [
      "Next.js 14",
      "TypeScript",
      "Plaid API",
      "Dwolla API",
      "Appwrite",
      "Tailwind CSS",
      "Chart.js",
    ],
    image: "/images/project2.webp",
    images: [
      {
        src: "/images/project2.webp",
        caption: "Horizon Banking Platform Dashboard & Balance Overview",
        tag: "Dashboard",
      },
      {
        src: "/images/projects/horizon-transfers.png",
        caption: "Linked Bank Accounts & Paginated Transaction Ledger",
        tag: "Plaid Integration",
      },
      {
        src: "/images/projects/horizon-send.png",
        caption: "ACH Fund Transfer Form & Real-Time Balance Validation",
        tag: "Dwolla Transfers",
      },
      {
        src: "/images/projects/horizon-history.png",
        caption: "Transaction Activity History & Multi-Account Filtering",
        tag: "Transaction Log",
      },
      {
        src: "/images/projects/horizon-analytics.png",
        caption: "Visual Spending Breakdown with Chart.js Telemetry",
        tag: "Financial Charts",
      },
    ],
    url: "https://banking-app-nine-jet.vercel.app/",
    github: "https://github.com/SachinyadavAug20/banking-app",
    featured: true,
  },
  {
    id: "basecase-qa",
    title: "BaseCase — College Doubts & Developer Q&A",
    subtitle: "Developer Q&A Platform with MDX, Zod Schemas & Recommendation Feeds",
    category: "Full-Stack Web Application",
    date: "04/2026 – 05/2026",
    blurb:
      "StackOverflow-style platform for technical queries featuring MDX syntax highlighting, upvoting, and reputation badges.",
    description:
      "Architected a StackOverflow-style platform for technical queries featuring full MDX syntax highlighting, upvoting/downvoting mechanics, and criteria-based user reputation badges. Engineered personalized question recommendation feeds based on user activity, secured with GitHub/Google OAuth and strict Zod runtime schema validation.",
    architectureDetails: [
      "Engineered personalized question recommendation feeds based on user activity, tag engagement, and view frequencies.",
      "Built full MDX rendering engine with syntax highlighting, allowing seamless code formatting across 20+ programming languages.",
      "Implemented gamified reputation engine with automated criteria badges (Gold/Silver/Bronze) and community trust levels.",
      "Secured with NextAuth.js (GitHub & Google OAuth) and strict Zod runtime validation, backed by an optimized relational MongoDB database.",
    ],
    techStack: [
      "Next.js",
      "TypeScript",
      "MongoDB",
      "NextAuth.js (OAuth)",
      "MDX",
      "Zod",
      "Tailwind CSS",
    ],
    image: "/images/project1.webp",
    images: [
      {
        src: "/images/project1.webp",
        caption: "BaseCase Community Questions Feed & Modern MDX Interface",
        tag: "Q&A Feed",
      },
      {
        src: "/images/projects/basecase-question.png",
        caption: "Detailed Question View with Code Highlighting & Answers",
        tag: "MDX Rendering",
      },
      {
        src: "/images/projects/basecase-badges.png",
        caption: "Reputation Badges System with Algorithmic Unlocks",
        tag: "Badges Engine",
      },
      {
        src: "/images/projects/basecase-profile.png",
        caption: "User Profile, Portfolio Link, and Activity Analytics",
        tag: "User Profile",
      },
      {
        src: "/images/projects/basecase-tags.png",
        caption: "Tag Clustering & Category Community Discovery",
        tag: "Tag System",
      },
    ],
    url: "https://base-case-nu.vercel.app/",
    github: "https://github.com/SachinyadavAug20/BaseCase",
    featured: true,
  },
  {
    id: "termdeck-cli",
    title: "TermDeck — Terminal Presentation Engine",
    subtitle: "Non-Linear DAG Presentation Engine with Live Execution in Go",
    category: "CLI & Microservices",
    date: "2026",
    blurb:
      "Terminal-native presentation engine ('PPT on Terminal') rendering Markdown slide decks, code blocks, and live terminal demos.",
    description:
      "Created a terminal-native presentation engine ('PPT on Terminal') that renders Markdown slide decks, code blocks, and live terminal demonstrations directly inside the CLI. Utilized Go microservices to handle high-concurrency slide asset streaming and low-latency HTTP request pipelines.",
    architectureDetails: [
      "Organized slide presentations as Directed Acyclic Graphs (DAGs) with non-linear branching and bounded execution cycles.",
      "Rendered full-screen Markdown presentations with live terminal demos, code blocks, and ASCII topology maps in sub-milliseconds.",
      "Built high-concurrency Go microservices for asset streaming and zero-runtime-dependency binary deployment.",
      "Supported interactive keyboard routing, slide jump navigation, and live shell command execution within presentations.",
    ],
    techStack: [
      "TypeScript",
      "Node.js",
      "Go",
      "Terminal UI (TUI)",
      "Markdown",
      "DAG Graphs",
    ],
    image: "/images/projects/termdeck-demo.gif",
    images: [
      {
        src: "/images/projects/termdeck-demo.gif",
        caption: "Live Interactive Terminal Presentation Demo with Real-Time DAG Routing",
        tag: "Live Demo",
      },
    ],
    url: "https://github.com/SachinyadavAug20/Termdeck",
    github: "https://github.com/SachinyadavAug20/Termdeck",
    featured: true,
  },
];

